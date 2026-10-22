// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { kPod } from '../world';

export const pad=(s,n)=>String(s).padEnd(n);
export function rp(W,p){if(!p)return W.cwd;if(p==='~'||p.startsWith('~/'))p='/home/dev'+p.slice(1);const parts=(p.startsWith('/')?p:W.cwd+'/'+p).split('/'),st=[];for(const x of parts){if(!x||x==='.')continue;if(x==='..')st.pop();else st.push(x)}return'/'+st.join('/')}
export const parent=p=>p.slice(0,p.lastIndexOf('/'))||'/';
export function children(W,d){const out=[];for(const x of W.dirs)if(x!=='/'&&parent(x)===d)out.push({n:x.split('/').pop(),dir:true,p:x});for(const f in W.files)if(parent(f)===d)out.push({n:f.split('/').pop(),dir:false,p:f});return out.sort((a,b)=>a.n.localeCompare(b.n))}
export function flagsArgs(a){const fl=[],ar=[];for(const x of a)(x.startsWith('-')&&x.length>1?fl:ar).push(x);return{fl,ar}}
export function kSync(W){const K=W.k8s;if(!K)return;
  K.pods=K.pods.filter(p=>p.status!=='Terminating');
  for(const p of K.pods)if(p.status==='ContainerCreating'){if(p.age>=1){p.status=K.deploys[p.app].ok?'Running':'CrashLoopBackOff';p.age=1}else p.age++}else{p.age++;if(p.status==='CrashLoopBackOff')p.restarts++}}
export function kRecon(W){const K=W.k8s;for(const[n,d]of Object.entries(K.deploys)){const act=K.pods.filter(p=>p.app===n&&p.status!=='Terminating');for(let i=act.length;i<d.replicas;i++)K.pods.push(kPod(n,'ContainerCreating'));if(act.length>d.replicas)act.slice(d.replicas).forEach(p=>p.status='Terminating')}}
export const kFind=(W,n)=>W.k8s&&W.k8s.pods.find(p=>p.name===n);
export const MODE_STR=m=>[...String(m).padStart(3,'0')].map(c=>{const n=+c;return(n&4?'r':'-')+(n&2?'w':'-')+(n&1?'x':'-')}).join('');
export function permOf(W,p){return W.modes&&W.modes[p]!=null?String(W.modes[p]):(W.dirs.has(p)?'755':'644')}
export function ownerOf(W,p){return (W.owners&&W.owners[p])||'dev:dev'}
export function can(W,p,bit){if(W.sudo)return true;const m=permOf(W,p).padStart(3,'0');const[u,g]=ownerOf(W,p).split(':');const d=u==='dev'?+m[0]:(g==='dev'?+m[1]:+m[2]);return (d&bit)!==0}
export function chmodApply(cur,spec){
  if(/^[0-7]{3,4}$/.test(spec))return spec.slice(-3);
  const m=spec.match(/^([ugoa]*)([+\-=])([rwx]+)$/);if(!m)return null;
  const who=m[1]||'a',d=[...cur.padStart(3,'0')].map(Number),bits=[...m[3]].reduce((s,c)=>s|({r:4,w:2,x:1}[c]),0);
  const idx=[];if(/[ua]/.test(who))idx.push(0);if(/[ga]/.test(who))idx.push(1);if(/[oa]/.test(who))idx.push(2);
  for(const i of idx)d[i]=m[2]==='+'?d[i]|bits:m[2]==='-'?d[i]&~bits:bits;return d.join('')}
export function resolveHost(W,host){for(const l of (W.files['/etc/hosts']||'').split('\n')){const t=l.replace(/#.*/,'').trim().split(/\s+/);if(t.length>1&&t.slice(1).includes(host))return t[0]}return (W.dns&&W.dns[host])||null}
export const kIp=p=>'10.42.'+(p.name.charCodeAt(p.name.length-3)%9)+'.'+(p.name.charCodeAt(p.name.length-2)%240+10);
