// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { S } from './state';
import { kPod, CI_PATH, COMPOSE_CHECKS, DEPLOY_CHECKS } from './curriculum';
import { R, line } from './ui';
import { G } from './boss';
/* fake shell */
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

/* --- обёртка: && и трубы | поверх одиночных команд --- */
export function splitTop(line,sep){const out=[];let cur='',q=null;for(let i=0;i<line.length;i++){const ch=line[i];
  if(q){cur+=ch;if(ch===q)q=null;continue}if(ch==='"'||ch==="'"){q=ch;cur+=ch;continue}
  if(line.startsWith(sep,i)&&!(sep==='|'&&(line[i+1]==='|'||line[i-1]==='|'))){out.push(cur);cur='';i+=sep.length-1;continue}cur+=ch}
  out.push(cur);return out.map(s=>s.trim())}
export function sh(W,line){
  W.f.grep=null;W.f.lastFile=null;
  const outs=[];let cls='',clear=false;
  for(const seg of splitTop(line,';').filter(Boolean)){
  for(const part of splitTop(seg,'&&').filter(Boolean)){
    const stages=splitTop(part,'|').filter(Boolean);let res=sh1(W,stages[0]);
    if(res.clear){clear=true;outs.length=0;continue}
    for(const st of stages.slice(1)){if(res.cls==='e')break;const f=pipeFilter(W,res.out||'',st);res=f.err?{out:f.err,cls:'e'}:{out:f.out,cls:res.cls==='e'?'e':''}}
    if(/(kubectl|k)\s+get\s+po/.test(part)&&W.f.kdelAt!=null)W.f.kdelGetSameLine=true;
    if(!/^\s*echo\s.*\$\?/.test(part))W.lastExit=res.exit!=null?res.exit:(res.cls==='e'?1:0);
    if(res.out)outs.push(res.out);if(res.cls)cls=res.cls;
    if(res.cls==='e'||res.exit)break;
  }}
  return{out:outs.join('\n'),cls,clear:clear&&!outs.length}}
export function pipeFilter(W,text,cmdline){
  const a=cmdline.trim().split(/\s+/).map(x=>x.replace(/^["']|["']$/g,''));const c=a[0];let L=text===''?[]:text.split('\n');
  if(c==='grep'){const{fl,ar}=flagsArgs(a.slice(1));const pat=ar[0];if(!pat)return{err:'grep: укажи шаблон'};
    const ci=fl.some(f=>/i/.test(f)),inv=fl.some(f=>/v/.test(f)),cnt=fl.some(f=>/c/.test(f));let re;try{re=new RegExp(pat,ci?'i':'')}catch(_){re=new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),ci?'i':'')}
    L=L.filter(l=>re.test(l)!==inv);if(W.f.lastFile)W.f.grep={pat,file:W.f.lastFile,count:cnt};return{out:cnt?String(L.length):L.join('\n')}}
  if(c==='wc'){if(!a.includes('-l'))return{err:'В тренажёре wc умеет только -l (число строк).'};if(W.f.grep)W.f.grep.count=true;return{out:String(L.length)}}
  if(c==='head'||c==='tail'){let n=10;const m=cmdline.match(/-n\s*(\d+)|\s-(\d+)/);if(m)n=+(m[1]||m[2]);return{out:(c==='head'?L.slice(0,n):L.slice(-n)).join('\n')}}
  if(c==='sort'){const k=cmdline.match(/-k\s*(\d+)/);const num=/-\w*n/.test(cmdline)||!!k;const col=k?+k[1]-1:-1;
    L=L.slice().sort((x,y)=>{const vx=col<0?x:(x.split(/\s+/)[col]||''),vy=col<0?y:(y.split(/\s+/)[col]||'');return num&&!isNaN(parseFloat(vx))&&!isNaN(parseFloat(vy))?parseFloat(vx)-parseFloat(vy):vx.localeCompare(vy)});
    if(/-\w*r/.test(cmdline))L.reverse();return{out:L.join('\n')}}
  if(c==='uniq'){const cnt=a.includes('-c');const o=[];for(const l of L){const last=o[o.length-1];if(last&&last.l===l)last.n++;else o.push({l,n:1})}return{out:o.map(x=>cnt?String(x.n).padStart(7)+' '+x.l:x.l).join('\n')}}
  if(c==='less'||c==='more'||c==='cat')return{out:text};
  if(['awk','cut','sed','xargs','tr','jq','tee'].includes(c))return{err:`${c} в тренажёре пока не поддерживается. В настоящем терминале эта труба сработает.`};
  return{err:`${c}: не умею передавать вывод в эту команду. В трубе работают grep, wc -l, head, tail, sort, uniq, less.`}}
export const REAL_CMDS=['vim','vi','nano','top','htop','apt','apt-get','yum','ping','ssh','scp','wget','find','chmod','chown','mkdir','touch','cp','mv','ip','ifconfig','netstat','traceroute','dig','nslookup','helm','terraform','ansible','make','python3','node','npm','free','uptime','lsof','crontab'];

export function sh1(W,line){
  const r={out:'',cls:''};const a=line.trim().split(/\s+/).map(x=>x.replace(/^["']|["']$/g,''));let cmd=a[0];
  const err=m=>{r.out=m;r.cls='e';return r};
  if(cmd==='k')cmd='kubectl';
  {const x=shExt(W,line,a,cmd,err,r);if(x)return x}
  switch(cmd){
  case 'help':r.out='Доступно: pwd ls cd cat tail head grep ps kill df rm systemctl curl whoami hostname echo clear\n          docker ps|run|logs|stop|rm|images\n          kubectl get|describe|logs|delete|scale|top|rollout\n          git status|add|commit|push|log|diff   gh run list|view   query <promql>\nМожно: трубы | (grep, wc -l, head, tail, sort, uniq), цепочки && и ;, sudo.\nВ уроках есть ещё: chmod chown dig git-ветки docker build/compose terraform ansible helm trivy gitleaks.\nTab дополняет, ↑ повторяет команду.';r.cls='d';return r;
  case 'pwd':r.out=W.cwd;return r;
  case 'whoami':r.out='dev';return r;
  case 'hostname':r.out='prod-web-01';return r;
  case 'echo':r.out=a.slice(1).join(' ');return r;
  case 'ls':{const{fl,ar}=flagsArgs(a.slice(1));const d=rp(W,ar[0]);if(W.files[d]!=null){r.out=ar[0];return r}if(!W.dirs.has(d))return err(`ls: cannot access '${ar[0]}': No such file or directory`);
    const ch=children(W,d);const long=fl.some(f=>/l/.test(f));
    r.out=long?['total '+ch.length].concat(ch.map(c=>`${c.dir?'drwxr-xr-x':'-rw-r--r--'} 1 dev dev ${pad(c.dir?'4.0K':(W.sizes[c.p]||Math.max(1,Math.round((W.files[c.p]||'').length/100)/10+'K')),6)} Oct 21 03:00 ${c.n}`)).join('\n'):ch.map(c=>c.n+(c.dir?'/':'')).join('  ');return r}
  case 'cd':{const d=rp(W,a[1]||'~');if(!W.dirs.has(d))return err(`cd: ${a[1]}: No such file or directory`);W.cwd=d;return r}
  case 'cat':{if(!a[1])return err('cat: укажи файл');const p=rp(W,a[1]);if(W.dirs.has(p))return err(`cat: ${a[1]}: Is a directory`);if(W.files[p]==null)return err(`cat: ${a[1]}: No such file or directory`);
    if(W.sizes[p])return err(`cat: ${a[1]}: файл весит ${W.sizes[p]}, терминал такое не переживёт`);W.f.read[p]=true;W.f.lastFile=p;r.out=W.files[p];return r}
  case 'tail':case 'head':{let n=10;const rest=[];for(let i=1;i<a.length;i++){if(a[i]==='-n'){n=+a[++i]}else if(/^-\d+$/.test(a[i]))n=+a[i].slice(1);else rest.push(a[i])}
    const p=rp(W,rest[0]);if(W.files[p]==null)return err(`${cmd}: cannot open '${rest[0]||''}'`);const L=W.files[p].split('\n');r.out=(cmd==='tail'?L.slice(-n):L.slice(0,n)).join('\n');if(cmd==='tail')W.f.tail=p;W.f.read[p]=true;W.f.lastFile=p;return r}
  case 'grep':{const{fl,ar}=flagsArgs(a.slice(1));if(ar.length<2)return err('usage: grep [-i] [-c] ШАБЛОН ФАЙЛ');const p=rp(W,ar[1]);if(W.files[p]==null)return err(`grep: ${ar[1]}: No such file or directory`);
    const ci=fl.some(f=>/i/.test(f)),cnt=fl.some(f=>/c/.test(f));let re;try{re=new RegExp(ar[0],ci?'i':'')}catch(_){re=new RegExp(ar[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),ci?'i':'')}
    const m=W.files[p].split('\n').filter(l=>re.test(l));W.f.grep={pat:ar[0],file:p,count:cnt};W.f.lastFile=p;r.out=cnt?String(m.length):m.join('\n');return r}
  case 'ps':r.out=[pad('USER',10)+pad('PID',7)+pad('%CPU',7)+pad('%MEM',7)+'COMMAND'].concat(W.procs.map(p=>pad(p.user,10)+pad(p.pid,7)+pad(p.cpu.toFixed(1),7)+pad(p.mem.toFixed(1),7)+p.cmd)).join('\n');return r;
  case 'kill':{const nine=a.some(x=>/^-(9|KILL|SIGKILL)$/.test(x));const pid=+a.filter(x=>!x.startsWith('-'))[1];const p=W.procs.find(x=>x.pid===pid);if(!pid||!p)return err(`kill: (${a[a.length-1]}) - No such process`);
    if(p.ignoreTerm&&!nine){p.termTries=(p.termTries||0)+1;r.out=p.termTries>1?'Утка: снова SIGTERM, и снова мимо. Процесс его перехватывает. Нужен сигнал, который поймать нельзя.':'(процесс получил SIGTERM… но, похоже, проигнорировал его. Проверь ps aux)';r.cls='d';return r}W.procs=W.procs.filter(x=>x!==p);return r}
  case 'df':r.out=`Filesystem      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p1   50G  ${String(Math.round(W.disk/2)).padStart(3)}G ${String(50-Math.round(W.disk/2)).padStart(4)}G ${String(W.disk).padStart(3)}% /\ntmpfs           2.0G     0  2.0G   0% /run`;return r;
  case 'rm':{const{fl,ar}=flagsArgs(a.slice(1));if(!ar[0])return err('rm: missing operand');const p=rp(W,ar[0]);if(['/','/etc','/var','/home','/home/dev','/var/log'].includes(p))return err('rm: утка заблокировала это. Не надо так с продом.');
    if(W.dirs.has(p)&&!fl.some(f=>/r/.test(f)))return err(`rm: cannot remove '${ar[0]}': Is a directory`);if(W.files[p]==null&&!W.dirs.has(p))return err(`rm: cannot remove '${ar[0]}': No such file or directory`);
    if(W.sizes[p]==='38G'||(W.dirs.has(p)&&p==='/var/log/old'))W.disk=41;delete W.files[p];W.dirs.delete(p);return r}
  case 'systemctl':{const act=a[1],s=a[2];if(s!=='nginx'&&s!=='nginx.service')return err(`Unit ${s||''}.service could not be found.`);const sv=W.svc.nginx;
    if(act==='status'){r.out=sv.active?'● nginx.service - A high performance web server\n     Active: active (running) since Wed 2026-10-21 03:20:11\n   Main PID: 901 (nginx)':'● nginx.service - A high performance web server\n     Active: failed (Result: exit-code) since Wed 2026-10-21 03:12:01\n    Process: 901 ExecStart=/usr/sbin/nginx (code=exited, status=1/FAILURE)';r.cls=sv.active?'g':'e';return r}
    if(act==='restart'||act==='start'){if(W.disk>=100){sv.active=false;return err('Job for nginx.service failed because the control process exited with error code.\nSee "systemctl status nginx" for details.')}sv.active=true;if(!W.procs.find(p=>p.pid===901))W.procs.push({pid:901,user:'root',cpu:0,mem:.3,cmd:'nginx: master process'});return r}
    if(act==='stop'){sv.active=false;return r}return err('systemctl: неизвестное действие')}
  case 'curl':{const u=a.slice(1).find(x=>!x.startsWith('-'))||'';const m=u.replace(/^https?:\/\//,'').match(/^(localhost|127\.0\.0\.1)(?::(\d+))?/);if(!m)return err(`curl: (6) Could not resolve host: ${u}`);const port=+(m[2]||80);
    let ok=false;if(port===80)ok=W.svc.nginx.active;else ok=W.containers.some(c=>c.up&&c.hp===String(port));W.f.curl={port,ok};
    if(!ok)return err(`curl: (7) Failed to connect to localhost port ${port}: Connection refused`);r.out='<!DOCTYPE html>\n<html><head><title>Welcome to nginx!</title></head>\n<body><h1>Welcome to nginx!</h1></body></html>';r.cls='g';return r}
  case 'git':return git(W,a.slice(1),err,r,line);
  case 'gh':return gh(W,a.slice(1),err,r);
  case 'query':return promq(W,line,err,r);
  case 'du':{const{ar}=flagsArgs(a.slice(1));const targets=[];for(const t of (ar.length?ar:['.'])){if(t.endsWith('/*')){const d=rp(W,t.slice(0,-2));if(!W.dirs.has(d))return err(`du: cannot access '${t}': No such file or directory`);children(W,d).forEach(c=>targets.push(c.p))}else{const pp=rp(W,t);if(!W.dirs.has(pp)&&W.files[pp]==null)return err(`du: cannot access '${t}': No such file or directory`);targets.push(pp)}}
    const size=x=>{if(W.sizes[x])return W.sizes[x];if(W.dirs.has(x)){const big=Object.keys(W.sizes).find(k=>k.startsWith(x+'/'));return big?W.sizes[big]:(x.split('/').length>3?'16K':'48K')}return Math.max(4,Math.round((W.files[x]||'').length/256))+'K'};
    r.out=targets.map(x=>pad(size(x),8)+x).join('\n');W.f.du=true;return r}
  case 'journalctl':{const u=line.match(/-u\s+(\S+)/);if(!u)return err('journalctl: в тренажёре укажи сервис, например journalctl -u nginx');if(u[1].replace('.service','')!=='nginx')return err(`-- No entries for ${u[1]} --`);
    W.f.read['/var/log/nginx/error.log']=true;r.out=W.svc.nginx.active?'Oct 21 03:20:11 prod-web-01 systemd[1]: Started nginx.service - A high performance web server.':'Oct 21 03:12:01 prod-web-01 nginx[901]: nginx: [emerg] open() "/run/nginx.pid" failed (28: No space left on device)\nOct 21 03:12:01 prod-web-01 systemd[1]: nginx.service: Control process exited, code=exited, status=1/FAILURE\nOct 21 03:12:01 prod-web-01 systemd[1]: nginx.service: Failed with result \'exit-code\'.';if(!W.svc.nginx.active)r.cls='e';return r}
  case 'ss':case 'netstat':{const L=['State   Local Address:Port   Process','LISTEN  0.0.0.0:22           users:(("sshd",pid=612))'];if(W.svc.nginx.active)L.push('LISTEN  0.0.0.0:80           users:(("nginx",pid=901))');W.containers.filter(c=>c.up&&c.hp).forEach(c=>L.push(`LISTEN  0.0.0.0:${c.hp}         users:(("docker-proxy",pid=7${c.hp.slice(-3)}))`));r.out=L.join('\n');return r}
  case 'wc':{if(!a.includes('-l'))return err('В тренажёре wc умеет только -l');const f=a.filter(x=>!x.startsWith('-'))[1];const pp=rp(W,f);if(W.files[pp]==null)return err(`wc: ${f||''}: No such file or directory`);r.out=W.files[pp].split('\n').length+' '+f;return r}
  case 'less':case 'more':return sh1(W,'cat '+a.slice(1).join(' '));
  case 'clear':r.clear=true;return r;
  case 'docker':return docker(W,a.slice(1),err,r);
  case 'kubectl':return kubectl(W,a.slice(1),err,r,line);
  case 'sudo':{if(!a[1])return err('usage: sudo <команда>');W.sudo=true;try{return sh1(W,line.trim().replace(/^sudo\s+/,''))}finally{W.sudo=false}}
  default:return err(REAL_CMDS.includes(cmd)?`${cmd}: в тренажёре этой команды нет. В настоящем Linux она есть, но в уроках не понадобится.`:`${cmd}: command not found. Введи help`);
  }
}
export function docker(W,a,err,r){
  if(a[0]==='container'&&/^(ls|ps|list)$/.test(a[1]||''))a=['ps',...a.slice(2)];
  const v=a[0];
  if(v==='ps'){const all=a.includes('-a')||a.includes('--all');const L=W.containers.filter(c=>all||c.up);r.out=[pad('CONTAINER ID',14)+pad('IMAGE',14)+pad('STATUS',22)+pad('PORTS',22)+'NAMES'].concat(L.map(c=>pad(c.id,14)+pad(c.image,14)+pad(c.up?'Up 1 minute':`Exited (${c.code}) 2 min ago`,22)+pad(c.up&&c.hp?`0.0.0.0:${c.hp}->${c.cp}/tcp`:'',22)+c.name)).join('\n');return r}
  if(v==='images'){r.out=[pad('REPOSITORY',14)+pad('TAG',8)+'SIZE'].concat(W.images.map(i=>{const[n,t]=i.split(':');return pad(n,14)+pad(t,8)+(n==='nginx'?'192MB':n==='api'?'88MB':'438MB')})).join('\n');return r}
  if(v==='run'){let name=null,hp='',cp='',env={},img=null;for(let i=1;i<a.length;i++){const x=a[i];
      if(x==='--name')name=a[++i];else if(x==='-p'){[hp,cp]=(a[++i]||'').split(':')}else if(x==='-e'||x==='--env'){const[k,...vv]=(a[++i]||'').split('=');env[k]=vv.join('=')}else if(x.startsWith('-'))continue;else{img=x;break}}
    if(!img)return err('docker: укажи образ, например nginx');const full=W.images.find(i=>i===img||i.split(':')[0]===img);if(!full)return err(`Unable to find image '${img}' locally\nError: pull access denied for ${img}`);
    name=name||('eager_'+Math.random().toString(36).slice(2,6));if(W.containers.find(c=>c.name===name))return err(`docker: Error response from daemon: Conflict. The container name "/${name}" is already in use. Удали старый контейнер.`);
    if(hp&&W.containers.some(c=>c.up&&c.hp===hp))return err(`docker: Bind for 0.0.0.0:${hp} failed: port is already allocated.`);
    const isApi=full.startsWith('api');const up=!isApi||!!env.DATABASE_URL;const id=Array.from({length:12},()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
    W.containers.push({id,name,image:full,up,code:up?0:1,hp,cp,env,logs:isApi?(up?'api v1.0 starting...\nconnected to postgres://db:5432/app\nlistening on :8080':'api v1.0 starting...\nFATAL: environment variable DATABASE_URL is required'):'/docker-entrypoint.sh: Configuration complete; ready for start up'});
    r.out=id+'f3a9c0d1b2e4';return r}
  const c=W.containers.find(x=>x.name===a[a.length-1]||x.id.startsWith(a[a.length-1]||'@'));
  if(v==='logs'){if(!c)return err(`Error: No such container: ${a[1]||''}`);W.f.dlogs=c.name;r.out=c.logs;if(!c.up)r.cls='e';return r}
  if(v==='stop'){if(!c)return err(`Error: No such container: ${a[1]||''}`);c.up=false;c.code=0;r.out=c.name;return r}
  if(v==='rm'){if(!c)return err(`Error: No such container: ${a[a.length-1]||''}`);if(c.up&&!a.includes('-f'))return err(`Error: You cannot remove a running container ${c.id}. Stop the container before attempting removal or force remove`);W.containers=W.containers.filter(x=>x!==c);r.out=c.name;return r}
  if(['exec','build','pull','push','inspect','compose','network','volume','start','restart','stats','top'].includes(v))return err(`docker ${v} в тренажёре пока нет. В настоящем Docker команда работает.`);
  return err('docker: доступно ps, run, logs, stop, rm, images');
}
export const ciOk=W=>/node-version:\s*['"]?(2\d|[3-9]\d)\b/.test(W.files[CI_PATH]||'');
export function git(W,a,err,r,line){const G=W.git;if(!G||!W.cwd.startsWith('/home/dev/app'))return err('fatal: not a git repository (or any of the parent directories): .git');
  const v=a[0];
  if(v==='status'){const L=['On branch main'];if(G.ahead)L.push(`Your branch is ahead of 'origin/main' by ${G.ahead} commit(s).\n  (use "git push" to publish your local commits)`);
    if(G.staged.length)L.push('Changes to be committed:\n'+G.staged.map(f=>'\tmodified:   '+f).join('\n'));
    if(G.modified.length)L.push('Changes not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n'+G.modified.map(f=>'\tmodified:   '+f).join('\n'));
    if(!G.staged.length&&!G.modified.length)L.push('nothing to commit, working tree clean');r.out=L.join('\n\n');return r}
  if(v==='add'){const t=a[1];if(!t)return err('Nothing specified, nothing added.');const all=t==='.'||t==='-A'||t==='--all';
    const fs=G.modified.filter(f=>all||f===t.replace(/^\.\//,'')||('/home/dev/app/'+f)===rp(W,t));if(!fs.length)return err(G.modified.length?`fatal: pathspec '${t}' did not match any files`:'Нечего добавлять: изменений нет');
    G.staged.push(...fs.filter(f=>!G.staged.includes(f)));G.modified=G.modified.filter(f=>!fs.includes(f));return r}
  if(v==='commit'){const m=line.match(/-m\s+"([^"]+)"/)||line.match(/-m\s+'([^']+)'/)||line.match(/-m\s+(\S+)/);if(!m)return err('Укажи сообщение: git commit -m "ci: node 20"');
    if(!G.staged.length)return err('nothing added to commit (сначала git add)');const h=Math.random().toString(16).slice(2,9);G.log.unshift({h,msg:m[1]});G.ahead++;const n=G.staged.length;G.staged=[];
    r.out=`[main ${h}] ${m[1]}\n ${n} file changed, 1 insertion(+), 1 deletion(-)`;return r}
  if(v==='push'){if(!G.ahead){r.out='Everything up-to-date';return r}G.ahead=0;const id=W.ci.runs[0].id+1;W.ci.runs.unshift({id,status:'in_progress',final:ciOk(W)?'success':'failure',title:G.log[0].msg,age:0});
    r.out=`To github.com:uptime/shop.git\n   ${G.log[1].h}..${G.log[0].h}  main -> main\nremote: GitHub Actions: запущен run ${id}`;return r}
  if(v==='log'){r.out=G.log.slice(0,6).map(c=>`${c.h} ${c.msg}`).join('\n');return r}
  if(v==='diff'){const o=(W.orig[CI_PATH]||'').split('\n'),n=(W.files[CI_PATH]||'').split('\n');const L=[];for(let i=0;i<Math.max(o.length,n.length);i++)if(o[i]!==n[i]){if(o[i]!=null)L.push('-'+o[i]);if(n[i]!=null)L.push('+'+n[i])}
    r.out=L.length?['--- a/.github/workflows/ci.yml','+++ b/.github/workflows/ci.yml',...L].join('\n'):'';return r}
  return err('git: в игре есть status, add, commit, push, log, diff')}
export function gh(W,a,err,r){const C=W.ci;if(!C)return err('gh: в этом уроке нет репозитория');if(a[0]!=='run')return err('gh: доступно gh run list и gh run view <id>');
  if(a[1]==='list')for(const x of C.runs)if(x.status==='in_progress'){if(x.age>=1)x.status=x.final;else x.age++}
  const mark={success:'✓',failure:'X',in_progress:'*'};
  if(a[1]==='list'){r.out=[pad('STATUS',14)+pad('ID',7)+pad('TITLE',34)+'BRANCH'].concat(C.runs.map(x=>pad(mark[x.status]+' '+x.status,14)+pad(x.id,7)+pad(x.title.slice(0,32),34)+'main')).join('\n');return r}
  if(a[1]==='view'){const x=C.runs.find(y=>String(y.id)===a[2]);if(!x)return err(`could not find any workflow run with ID ${a[2]||''}`);const logs=a.some(z=>/^--log/.test(z));
    if(x.status==='in_progress'){r.out=`* run ${x.id} ещё идёт. Проверь через gh run list.`;return r}
    if(x.status==='success'){r.out=`✓ ci · ${x.id}\nJOBS\n✓ test in 48s\n  ✓ npm ci\n  ✓ npm test (42 passed)`;r.cls='g';return r}
    if(!logs){r.out=`X ci · ${x.id} · failure\nJOBS\nX test in 21s\n\nЛоги упавшего шага: gh run view ${x.id} --log-failed`;r.cls='e';return r}
    W.f.ghlog=true;r.out='test\tRun npm ci\nnpm ERR! code EBADENGINE\nnpm ERR! engine Unsupported engine for uptime-shop@1.4.0\nnpm ERR! notsup Required: {"node":">=20"}\nnpm ERR! notsup Actual:   {"npm":"8.19.4","node":"v16.20.2"}\ntest\tProcess completed with exit code 1.';r.cls='e';return r}
  return err('gh run: доступно list и view')}
export function promq(W,line,err,r){if(!W.prom)return err('query: Prometheus в этом уроке не подключён');const e=line.trim().slice(5).trim().replace(/^['"]|['"]$/g,''),x=e.replace(/\s+/g,'');const row=(l,v)=>pad(l,46)+v;
  if(!x)return err('Пример: query up');
  if(/^up(==0)?$/.test(x)){W.f.qup=true;r.out=[['api-0','shop',1],['api-1','shop',1],['api-2','shop',0],['db-0','postgres',1]].filter(t=>!x.includes('==0')||t[2]===0).map(t=>row(`up{instance="${t[0]}", job="${t[1]}"}`,t[2])).join('\n');return r}
  if(x.includes('histogram_quantile')){r.out=[row('{instance="api-0"}','0.084'),row('{instance="api-1"}','2.410')].join('\n');return r}
  if(x.includes('http_requests_total')){if(!x.includes('rate(')){r.out='http_requests_total — счётчик, он только растёт с момента старта.\nОберни его в rate(...[5m]), чтобы получить запросы в секунду.';r.cls='d';return r}
    const five=/status=~?["']5/.test(x);if(five)W.f.q5xx=true;if(x.includes('/')&&five){r.out=row('{}','0.0610');return r}
    const D=five?[['api-0','500',.02],['api-1','502',4.71],['api-1','500',1.08]]:[['api-0','200',47.6],['api-0','500',.02],['api-1','200',41.9],['api-1','502',4.71],['api-1','500',1.08]];
    if(/^sum/.test(x)){const by=x.match(/by\((\w+)\)/),k=by?by[1]:null,agg={};for(const d of D){const kk=k==='instance'?d[0]:k==='status'?d[1]:'';agg[kk]=(agg[kk]||0)+d[2]}r.out=Object.entries(agg).map(([kk,v])=>row(kk?`{${k}="${kk}"}`:'{}',v.toFixed(2))).join('\n');return r}
    r.out=D.map(d=>row(`{instance="${d[0]}", status="${d[1]}"}`,d[2])).join('\n');return r}
  return err('Нет такой метрики. Есть: up, http_requests_total{instance,status}, http_request_duration_seconds_bucket')}
/* --- kubectl с реальными флагами --- */
export function kubectl(W,a,err,r,line){
  if(!W.k8s)return err('The connection to the server localhost:8080 was refused - кластера в этом уроке нет');
  kSync(W);const K=W.k8s;
  const args=[];let label=null,wide=false,prev=false;
  for(let i=0;i<a.length;i++){const x=a[i];
    if(x==='-n'||x==='--namespace'){i++;continue}if(/^--namespace=/.test(x)||x==='-A'||x==='--all-namespaces'||x==='-f'||x==='--follow'||x==='-w'||x==='--watch')continue;
    if(x==='-l'||x==='--selector'){label=a[++i]||'';continue}if(/^-l./.test(x)){label=x.slice(2);continue}if(/^--selector=/.test(x)){label=x.slice(11);continue}
    if(x==='-o'||x==='--output'){wide=(a[++i]||'')==='wide';continue}if(/^-o(=)?wide$|^--output=wide$/.test(x)){wide=true;continue}if(/^-o/.test(x))continue;
    if(x==='--previous'||x==='-p'){prev=true;continue}if(/^--tail(=|$)/.test(x)){if(x==='--tail')i++;continue}if(/^--replicas/.test(x)){if(x==='--replicas')i++;continue}
    args.push(x)}
  const appSel=label?((label.match(/app=([\w-]+)/)||[])[1]||'__none__'):null;
  const v=args[0];let res=(args[1]||'').toLowerCase(),name=args[2];
  if(v!=='rollout'&&res.includes('/')){[res,name]=res.split('/')}
  const isPod=/^(po|pod|pods)$/.test(res),isDep=/^(deploy|deployment|deployments)(\.apps)?$/.test(res);
  const node=p=>'node-'+(p.name.charCodeAt(p.name.length-1)%3+1);
  const ip=p=>'10.42.'+(p.name.charCodeAt(p.name.length-3)%9)+'.'+(p.name.charCodeAt(p.name.length-2)%240+10);
  const pods=()=>K.pods.filter(p=>!appSel||p.app===appSel);
  const done=x=>{kRecon(W);r.out=x;return r};
  const notFound=(kind,n)=>err(`Error from server (NotFound): ${kind} "${n||''}" not found`);
  if(v==='get'){
    kRecon(W);
    if(isPod){const L=pods();if(!L.length){r.out='No resources found in prod namespace.';return r}
      r.out=[pad('NAME',20)+pad('READY',7)+pad('STATUS',19)+pad('RESTARTS',10)+pad('AGE',6)+(wide?pad('IP',14)+'NODE':'')].concat(L.map(p=>pad(p.name,20)+pad(p.status==='Running'?'1/1':'0/1',7)+pad(p.status,19)+pad(p.restarts,10)+pad(p.age+'m',6)+(wide?pad(p.status==='ContainerCreating'?'<none>':ip(p),14)+node(p):''))).join('\n');return r}
    if(isDep){const L=Object.entries(K.deploys).filter(([n])=>!appSel||n===appSel);r.out=[pad('NAME',8)+pad('READY',8)+pad('UP-TO-DATE',12)+pad('AVAILABLE',11)+(wide?'IMAGES':'')].concat(L.map(([n,d])=>{const rd=K.pods.filter(p=>p.app===n&&p.status==='Running').length;return pad(n,8)+pad(rd+'/'+d.replicas,8)+pad(d.replicas,12)+pad(rd,11)+(wide?d.image:'')})).join('\n');return r}
    if(/^(events?|ev)$/.test(res)){W.f.kevents=true;const L=[pad('LAST SEEN',11)+pad('TYPE',9)+pad('REASON',18)+pad('OBJECT',26)+'MESSAGE'];
      for(const p of K.pods){if(p.status==='CrashLoopBackOff')L.push(pad('20s',11)+pad('Warning',9)+pad('BackOff',18)+pad('pod/'+p.name,26)+'Back-off restarting failed container');
        else if(p.status==='ContainerCreating')L.push(pad('3s',11)+pad('Normal',9)+pad('Scheduled',18)+pad('pod/'+p.name,26)+'Successfully assigned prod/'+p.name+' to '+node(p));
        else if(p.age<5)L.push(pad('1m',11)+pad('Normal',9)+pad('Started',18)+pad('pod/'+p.name,26)+'Started container '+p.app)}
      if(L.length===1)L.push('(событий за последний час нет: всё стабильно)');r.out=L.join('\n');return r}
    if(/^(nodes?|no)$/.test(res)){r.out=[pad('NAME',9)+pad('STATUS',8)+pad('ROLES',15)+pad('AGE',6)+'VERSION'].concat([1,2,3].map(i=>pad('node-'+i,9)+pad('Ready',8)+pad(i===1?'control-plane':'<none>',15)+pad('91d',6)+'v1.31.2')).join('\n');return r}
    if(/^(svc|services?)$/.test(res)){r.out=[pad('NAME',12)+pad('TYPE',11)+pad('CLUSTER-IP',14)+'PORT(S)',pad('kubernetes',12)+pad('ClusterIP',11)+pad('10.43.0.1',14)+'443/TCP'].concat(Object.keys(K.deploys).map((n,i)=>pad(n,12)+pad('ClusterIP',11)+pad('10.43.'+(17+i)+'.'+(40+i*7),14)+'80/TCP')).join('\n');return r}
    if(!res)return err('error: укажи ресурс, например kubectl get pods');
    return err(`В тренажёре ресурса «${res}» пока нет. В настоящем кластере kubectl get ${res} сработает.`)}
  if(v==='logs'){let p;
    if(isDep){p=K.pods.find(x=>x.app===name);if(!p)return notFound('deployments.apps',name)}
    else if(isPod){p=kFind(W,name);if(!p)return notFound('pods',name)}
    else if(appSel){p=K.pods.find(x=>x.app===appSel);if(!p){r.out='No resources found in prod namespace.';return r}}
    else{p=kFind(W,args[1]);if(!p)return notFound('pods',args[1])}
    const d=K.deploys[p.app];const many=isDep&&K.pods.filter(x=>x.app===p.app).length>1?`Found ${K.pods.filter(x=>x.app===p.app).length} pods, using pod/${p.name}\n`:'';
    if(p.status==='ContainerCreating')return err(`Error from server (BadRequest): container "${p.app}" in pod "${p.name}" is waiting to start: ContainerCreating`);
    if(!d.ok&&p.app==='api'){W.f.klogsBad=true;r.cls='e';return done(`${many}api ${d.image} starting\nloading config /etc/api/config.yaml\npanic: unknown config key "db.pool_size_max"\n\ngoroutine 1 [running]:\nmain.loadConfig()\n\t/src/config.go:48 +0x1c4`)}
    if(prev)return err(`Error from server (BadRequest): previous terminated container "${p.app}" in pod "${p.name}" not found`);
    return done(`${many}${p.app} started\nGET /healthz 200 2ms\nGET /v1/items 200 34ms`)}
  if(v==='describe'){
    if(isDep){const d=K.deploys[name];if(!d)return notFound('deployments.apps',name);const rd=K.pods.filter(p=>p.app===name&&p.status==='Running').length;
      return done(`Name:        ${name}\nNamespace:   prod\nReplicas:    ${d.replicas} desired | ${d.replicas} updated | ${rd} available | ${d.replicas-rd} unavailable\nImage:       ${d.image}\nEvents:\n  Normal  ScalingReplicaSet  deployment-controller  Scaled up replica set ${name}-7d9f to ${d.replicas}`)}
    const pn=isPod?name:args[1];const p=kFind(W,pn);if(!p)return notFound('pods',pn);const d=K.deploys[p.app];
    return done(`Name:       ${p.name}\nNamespace:  prod\nNode:       ${node(p)}\nIP:         ${ip(p)}\nImage:      ${d.image}\nStatus:     ${p.status}\nRestarts:   ${p.restarts}\nLast State: ${p.status==='CrashLoopBackOff'?'Terminated (Reason: Error, Exit Code: 2)':'-'}\nEvents:\n  ${p.status==='CrashLoopBackOff'?'Warning  BackOff  Back-off restarting failed container':'Normal   Started  Started container '+p.app}`)}
  if(v==='delete'){if(isDep)return err('Удалять деплоймент целиком не надо: пропадут все его поды. Удали один под: kubectl delete pod <имя>');
    const pn=isPod?name:args[1];const p=kFind(W,pn);if(!p)return notFound('pods',pn);p.status='Terminating';W.f.kdelAt=W.hist.length;r.cls='g';return done(`pod "${p.name}" deleted`)}
  if(v==='scale'){const t=isDep?name:(args[1]||'');const d=K.deploys[t];if(!d)return notFound('deployments.apps',t);const m=line.match(/--replicas[=\s]+(\d+)/);if(!m)return err('error: укажи --replicas=N');
    const n=+m[1];if(n<0||n>20)return err('error: давай от 0 до 20');d.replicas=n;r.cls='g';return done(`deployment.apps/${t} scaled`)}
  if(v==='rollout'){const act=args[1];let t=args[2]||'';if(t.includes('/'))t=t.split('/')[1];else if(/^deploy/.test(t))t=args[3]||'';
    const d=K.deploys[t];if(!d)return notFound('deployments.apps',t);
    if(act==='undo'){if(!d.prev)return err('error: нет предыдущей ревизии, откатываться некуда');d.image=d.prev;d.prev=null;d.ok=true;K.pods.filter(p=>p.app===t).forEach(p=>p.status='Terminating');r.cls='g';return done(`deployment.apps/${t} rolled back`)}
    if(act==='history')return done(`deployment.apps/${t}\nREVISION  CHANGE-CAUSE\n${d.prev?`1         image ${d.prev}\n2         image ${d.image}`:`1         image ${d.image}`}`);
    if(act==='status'){const rd=K.pods.filter(p=>p.app===t&&p.status==='Running').length;return done(rd>=d.replicas?`deployment "${t}" successfully rolled out`:`Waiting for deployment "${t}" rollout to finish: ${rd} of ${d.replicas} updated replicas are available...`)}
    if(act==='restart'){K.pods.filter(p=>p.app===t).forEach(p=>p.status='Terminating');r.cls='g';return done(`deployment.apps/${t} restarted`)}
    return err('kubectl rollout: в тренажёре есть undo, history, status, restart')}
  if(v==='top'){if(/^(nodes?|no)$/.test(res))return done([pad('NAME',9)+pad('CPU(%)',8)+'MEMORY(%)'].concat([1,2,3].map(i=>pad('node-'+i,9)+pad((30+i*9)+'%',8)+(40+i*6)+'%')).join('\n'));
    const L=[pad('NAME',20)+pad('CPU',8)+'MEMORY'];for(const p of pods().filter(p=>p.status==='Running')){const d=K.deploys[p.app];L.push(pad(p.name,20)+pad(Math.min(99,Math.round(d.load/d.replicas))+'%',8)+(120+(p.name.charCodeAt(5)%80))+'Mi')}return done(L.join('\n'))}
  if(['apply','edit','exec','port-forward','create','patch','set','cp','run','expose'].includes(v))return err(`kubectl ${v} в тренажёре пока нет. В настоящем кластере эта команда работает, в уроках она не понадобится.`);
  return err(`error: неизвестная команда kubectl ${v||''}. Есть: get, describe, logs, delete, scale, rollout, top`);
}

/* ---- расширения симулятора: права, systemd, DNS, git-ветки, docker build/compose, terraform, ansible, k8s, helm, trivy, gitleaks ---- */
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
export function scriptOut(W,p){
  if(/healthcheck/.test(p)){const ok=W.svc.nginx&&W.svc.nginx.active;W.lastExit=ok?0:1;if(!ok)W.f.healthDown=true;return ok?{out:'OK: http://localhost/healthz отвечает',exit:0}:{out:'ERROR: http://localhost/healthz не отвечает',cls:'e',exit:1}}
  const L=[];for(const l of (W.files[p]||'').split('\n')){const m=l.match(/^\s*echo\s+["']?(.*?)["']?\s*$/);if(m)L.push(m[1])}return{out:L.join('\n'),exit:0}}
export function resolveHost(W,host){for(const l of (W.files['/etc/hosts']||'').split('\n')){const t=l.replace(/#.*/,'').trim().split(/\s+/);if(t.length>1&&t.slice(1).includes(host))return t[0]}return (W.dns&&W.dns[host])||null}
export const kIp=p=>'10.42.'+(p.name.charCodeAt(p.name.length-3)%9)+'.'+(p.name.charCodeAt(p.name.length-2)%240+10);

export function shExt(W,line,a,cmd,err,r){
  if(W.tf&&W.tf.await){W.tf.await=false;if(cmd==='yes')return tfApply(W,r);return err('Error: Apply cancelled.\n(Terraform ждал ответа yes. Запусти terraform apply ещё раз.)')}
  if(cmd==='echo'&&/\$\?/.test(line)){const code=W.lastExit==null?0:W.lastExit;if(code===1&&W.f.healthDown)W.f.sawExit1=true;r.out=line.replace(/^\s*echo\s+/,'').replace(/["']/g,'').replace(/\$\?/g,String(code));return r}
  /* права и пользователи */
  if(W.modes){
    if(cmd==='id'){r.out='uid=1000(dev) gid=1000(dev) groups=1000(dev),27(sudo)';return r}
    if(cmd==='ls'&&a.slice(1).some(x=>/^-\w*l/.test(x))){const{ar}=flagsArgs(a.slice(1));const t=rp(W,ar[0]);let list;
      if(W.files[t]!=null)list=[{n:ar[0],p:t,dir:false}];else if(W.dirs.has(t))list=children(W,t);else return err(`ls: cannot access '${ar[0]}': No such file or directory`);
      W.f.lsl=W.f.lsl||{};const rows=list.map(c=>{W.f.lsl[c.p]=true;const[u,g]=ownerOf(W,c.p).split(':');const sz=W.sizes[c.p]||(c.dir?'4096':String((W.files[c.p]||'').length));return `${c.dir?'d':'-'}${MODE_STR(permOf(W,c.p))} 1 ${pad(u,5)} ${pad(g,5)} ${String(sz).padStart(5)} Oct 21 03:00 ${c.n}`});
      r.out=(W.files[t]!=null?'':'total '+list.length+'\n')+rows.join('\n');return r}
    if(cmd==='chmod'){const{ar}=flagsArgs(a.slice(1));if(ar.length<2)return err('usage: chmod РЕЖИМ ФАЙЛ, например chmod +x deploy.sh или chmod 600 secret.env');
      const p=rp(W,ar[1]);if(W.files[p]==null&&!W.dirs.has(p))return err(`chmod: cannot access '${ar[1]}': No such file or directory`);
      if(!W.sudo&&ownerOf(W,p).split(':')[0]!=='dev')return err(`chmod: changing permissions of '${ar[1]}': Operation not permitted`);
      const nm=chmodApply(permOf(W,p),ar[0]);if(!nm)return err(`chmod: invalid mode: '${ar[0]}'`);W.modes[p]=nm;return r}
    if(cmd==='chown'){const{ar}=flagsArgs(a.slice(1));if(ar.length<2)return err('usage: chown ВЛАДЕЛЕЦ[:ГРУППА] ФАЙЛ');const p=rp(W,ar[1]);
      if(W.files[p]==null&&!W.dirs.has(p))return err(`chown: cannot access '${ar[1]}': No such file or directory`);
      if(!W.sudo)return err(`chown: changing ownership of '${ar[1]}': Operation not permitted`);
      const[u,g]=ar[0].split(':');if(!['root','dev','shop','www-data','nginx'].includes(u))return err(`chown: invalid user: '${ar[0]}'`);W.owners[p]=u+':'+(g||ownerOf(W,p).split(':')[1]);return r}
    if(['cat','less','tail','head','grep'].includes(cmd)){for(const f of a.slice(1).filter(x=>!x.startsWith('-'))){const p=rp(W,f);if(W.files[p]!=null&&!can(W,p,4))return err(`${cmd}: ${f}: Permission denied`)}}
  }
  /* запуск скриптов */
  if(/^\.{0,2}\//.test(cmd)||((cmd==='bash'||cmd==='sh')&&a[1])){
    const viaBash=cmd==='bash'||cmd==='sh',f=viaBash?a[1]:cmd,p=rp(W,f);
    if(W.files[p]==null)return err(`-bash: ${f}: No such file or directory`);
    if(viaBash?!can(W,p,4):!can(W,p,1)){W.f.execTried=p;return err(`-bash: ${f}: Permission denied`)}
    W.f.execOk=p;const o=scriptOut(W,p);r.out=o.out;r.cls=o.cls||'';r.exit=o.exit;return r}
  /* systemd: любые сервисы, кроме nginx (им занимается базовый терминал) */
  if(cmd==='systemctl'&&a[2]&&!/^nginx/.test(a[a.length-1])){
    const act=a[1],name=a[a.length-1].replace(/\.service$/,''),s=W.svc[name];if(!s)return err(`Unit ${name}.service could not be found.`);
    const now=a.includes('--now'),started=()=>{if(!s.active){s.active=true;s.journal=(s.journal?s.journal+'\n':'')+`Oct 21 09:31:07 prod-web-01 systemd[1]: Started ${name}.service - ${s.desc||name}.`}};
    if(act==='status'){W.f.svcStatus=name;r.out=`● ${name}.service - ${s.desc||name}\n     Loaded: loaded (/etc/systemd/system/${name}.service; ${s.enabled?'enabled':'disabled'}; preset: enabled)\n     Active: ${s.active?'active (running) since Wed 2026-10-21 09:31:07':'inactive (dead)'}`;if(!s.active)r.exit=3;return r}
    if(act==='is-enabled'){W.f.isEnabled=name;r.out=s.enabled?'enabled':'disabled';if(!s.enabled)r.exit=1;return r}
    if(act==='is-active'){r.out=s.active?'active':'inactive';if(!s.active)r.exit=3;return r}
    if(act==='enable'){s.enabled=true;if(now)started();r.out=`Created symlink /etc/systemd/system/multi-user.target.wants/${name}.service → /etc/systemd/system/${name}.service.`;return r}
    if(act==='disable'){s.enabled=false;if(now)s.active=false;r.out=`Removed "/etc/systemd/system/multi-user.target.wants/${name}.service".`;return r}
    if(act==='start'||act==='restart'){started();return r}
    if(act==='stop'){s.active=false;return r}
    return err('systemctl: в тренажёре есть status, start, stop, restart, enable, disable, is-enabled, is-active')}
  if(cmd==='journalctl'){const u=line.match(/-u\s+(\S+)/),name=u&&u[1].replace('.service','');if(name&&name!=='nginx'&&W.svc[name]){W.f.journal=name;r.out=W.svc[name].journal||'-- No entries --';return r}}
  if(cmd==='crontab'){if(a[1]==='-l'){r.out=(W.files['/var/spool/cron/dev']||'').trim()||'no crontab for dev';return r}
    if(a[1]==='-e')return err('crontab -e открывает редактор. В тренажёре расписание правится во вкладке редактора урока.');return err('usage: crontab -l')}
  /* DNS и сеть */
  if(W.dns){
    if(cmd==='dig'||cmd==='nslookup'||cmd==='host'){const host=a.slice(1).filter(x=>!/^[+-]/.test(x))[0];if(!host)return err(`usage: ${cmd} <имя>`);W.f.dig=host;const ip=W.dns[host];
      if(cmd==='dig'){if(a.includes('+short')){r.out=ip||'';return r}r.out=`; <<>> DiG 9.18.28 <<>> ${host}\n;; ->>HEADER<<- opcode: QUERY, status: ${ip?'NOERROR':'NXDOMAIN'}\n`+(ip?`\n;; ANSWER SECTION:\n${host}.\t\t300\tIN\tA\t${ip}\n`:'')+`\n;; Query time: 4 msec\n;; SERVER: 10.0.0.2#53(10.0.0.2) (UDP)`;return r}
      if(cmd==='nslookup'){r.out=ip?`Server:\t\t10.0.0.2\nAddress:\t10.0.0.2#53\n\nName:\t${host}\nAddress: ${ip}`:`** server can't find ${host}: NXDOMAIN`;if(!ip)r.cls='e';return r}
      r.out=ip?`${host} has address ${ip}`:`Host ${host} not found: 3(NXDOMAIN)`;return r}
    if(cmd==='getent'&&a[1]==='hosts'){const ip=resolveHost(W,a[2]);W.f.getent=true;r.out=ip?`${ip}       ${a[2]}`:'';if(!ip)r.exit=2;return r}
    if(cmd==='curl'){const v=a.some(x=>/^-\w*v/.test(x)||x==='--verbose'),u=a.slice(1).find(x=>!x.startsWith('-'))||'',m=u.replace(/^https?:\/\//,'').match(/^([\w.-]+)(?::(\d+))?/);if(!m)return err('curl: укажи адрес');
      const host=m[1],port=+(m[2]||(u.startsWith('https')?443:80));if(host==='localhost'||host==='127.0.0.1')return null;
      const ip=resolveHost(W,host);W.f.curlHost=host;if(v)W.f.curlV=true;
      if(!ip)return err(`curl: (6) Could not resolve host: ${host}`);
      const head=v?`* Host ${host}:${port} was resolved.\n* IPv4: ${ip}\n*   Trying ${ip}:${port}...\n`:'';
      if(!(W.alive||[]).includes(ip)){r.out=head+`curl: (28) Failed to connect to ${host} port ${port} after 5002 ms: Timeout was reached`;r.cls='e';return r}
      W.f.curlOk=host;r.out=head+(v?`* Connected to ${host} (${ip}) port ${port}\n> GET / HTTP/1.1\n> Host: ${host}\n>\n< HTTP/1.1 200 OK\n< Server: nginx/1.27.2\n<\n`:'')+'<!DOCTYPE html><html><head><title>Uptime Shop</title></head>…</html>';r.cls='g';return r}
  }
  if(cmd==='git'&&W.g)return git2(W,a.slice(1),err,r,line);
  if(cmd==='docker'&&a[1]==='build'){W.imgInfo=W.imgInfo||{};return dockerBuild(W,a,err,r)}
  if(cmd==='docker'&&W.imgInfo&&(a[1]==='images'||(a[1]==='image'&&a[2]==='ls'))){W.f.images=true;const def={'nginx:1.27':'192MB','api:1.0':'88MB','postgres:16':'438MB'};
    r.out=[pad('REPOSITORY',14)+pad('TAG',8)+'SIZE'].concat(W.images.slice().reverse().map(i=>{const[n,t]=i.split(':');return pad(n,14)+pad(t,8)+((W.imgInfo[i]&&W.imgInfo[i].size)||def[i]||'210MB')})).join('\n');return r}
  if((cmd==='docker'&&a[1]==='compose')||cmd==='docker-compose')return compose(W,cmd==='docker'?a.slice(2):a.slice(1),err,r);
  if(cmd==='terraform'&&W.tf)return terraform(W,a,err,r);
  if((cmd==='ansible'||cmd==='ansible-playbook')&&W.ans)return ansible(W,a,line,err,r);
  if(cmd==='kubectl'&&W.k8s){const x=kExt(W,a.slice(1),line,err,r);if(x)return x}
  if(cmd==='helm'&&W.helm)return helm(W,a.slice(1),line,err,r);
  if(cmd==='trivy')return trivy(W,a,err,r);
  if(cmd==='gitleaks'&&W.leak)return gitleaks(W,a,err,r);
  return null}

/* git с ветками, слиянием и защитой main */
export function git2(W,a,err,r,line){const G=W.g;if(!W.cwd.startsWith(G.root))return err('fatal: not a git repository (or any of the parent directories): .git');
  const v=a[0],hash=()=>Math.random().toString(16).slice(2,9),hasMarkers=t=>/^(<<<<<<<|=======|>>>>>>>)/m.test(t||'');
  if(v==='status'){W.f.gstatus=true;const L=[`On branch ${G.branch}`];
    if(G.merging&&G.conflicts.length){W.f.statusConflict=true;L.push('You have unmerged paths.\n  (fix conflicts and run "git commit")\n\nUnmerged paths:\n  (use "git add <file>..." to mark resolution)\n'+G.conflicts.map(f=>'\tboth modified:   '+f).join('\n'))}
    else if(G.merging)L.push('All conflicts fixed but you are still merging.\n  (use "git commit" to conclude merge)');
    if(G.staged.length)L.push('Changes to be committed:\n'+G.staged.map(f=>'\tmodified:   '+f).join('\n'));
    if(G.modified.length)L.push('Changes not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n'+G.modified.map(f=>'\tmodified:   '+f).join('\n'));
    if(!G.merging&&!G.staged.length&&!G.modified.length)L.push('nothing to commit, working tree clean');r.out=L.join('\n\n');return r}
  if(v==='branch'){if(a[1]&&!a[1].startsWith('-')){if(G.branches[a[1]])return err(`fatal: a branch named '${a[1]}' already exists`);G.branches[a[1]]=[...G.branches[G.branch]];return r}
    r.out=Object.keys(G.branches).map(n=>(n===G.branch?'* ':'  ')+n).join('\n')+(a.includes('-a')?'\n'+G.remote.map(n=>'  remotes/origin/'+n).join('\n'):'');return r}
  if(v==='switch'||v==='checkout'){const create=a.some(x=>/^(-c|-b|--create)$/.test(x)),name=a.slice(1).filter(x=>!x.startsWith('-'))[0];
    if(!name)return err(`usage: git ${v} ${v==='switch'?'-c':'-b'} <ветка>`);if(G.merging)return err('error: you need to resolve your current index first');
    if(create){if(G.branches[name])return err(`fatal: a branch named '${name}' already exists`);G.branches[name]=[...G.branches[G.branch]];G.branch=name;r.out=`Switched to a new branch '${name}'`;return r}
    if(!G.branches[name])return err(`fatal: invalid reference: ${name}\nhint: чтобы создать ветку: git switch -c ${name}`);G.branch=name;r.out=`Switched to branch '${name}'`;return r}
  if(v==='add'){const t=a[1];if(!t)return err('Nothing specified, nothing added.');const all=t==='.'||t==='-A'||t==='--all';
    const pool=[...G.modified,...(G.merging?G.conflicts:[])],fs=pool.filter(f=>all||f===t.replace(/^\.\//,'')||G.root+'/'+f===rp(W,t));
    if(!fs.length)return err(pool.length?`fatal: pathspec '${t}' did not match any files`:'Нечего добавлять: изменений нет');
    for(const f of fs)if(!G.staged.includes(f))G.staged.push(f);G.modified=G.modified.filter(f=>!fs.includes(f));if(G.merging)G.conflicts=G.conflicts.filter(f=>!fs.includes(f));return r}
  if(v==='commit'){const m=line.match(/-m\s+"([^"]+)"/)||line.match(/-m\s+'([^']+)'/)||line.match(/-m\s+(\S+)/);
    if(G.merging){if(G.conflicts.length)return err('error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use git add <file>');
      if(hasMarkers(W.files[G.root+'/config.yaml']))return err('В config.yaml остались маркеры конфликта <<<<<<< ======= >>>>>>>. git бы такое закоммитил, а прод — не переварит. Сначала почисти файл.');
      const msg=m?m[1]:`Merge branch '${G.mergeFrom}' into ${G.branch}`,h=hash();G.branches[G.branch].push({h,msg});G.merging=false;G.staged=[];G.ahead++;W.f.merged=true;r.out=`[${G.branch} ${h}] ${msg}`;return r}
    if(!m)return err('Укажи сообщение: git commit -m "что изменилось"');if(!G.staged.length)return err('nothing added to commit but untracked files present (сначала git add)');
    const h=hash(),n=G.staged.length;G.branches[G.branch].push({h,msg:m[1]});G.staged=[];G.ahead++;r.out=`[${G.branch} ${h}] ${m[1]}\n ${n} file changed, 1 insertion(+), 1 deletion(-)`;return r}
  if(v==='push'){const up=a.some(x=>x==='-u'||x==='--set-upstream'),pos=a.slice(1).filter(x=>!x.startsWith('-')),target=pos[1]||G.branch;
    if(target==='main')return err('remote: error: GH006: Protected branch update failed for refs/heads/main.\nremote: Changes must be made through a pull request.\n ! [remote rejected] main -> main (protected branch hook declined)');
    if(!G.upstream[G.branch]&&!up)return err(`fatal: The current branch ${G.branch} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream origin ${G.branch}`);
    if(!G.ahead&&G.remote.includes(G.branch)){r.out='Everything up-to-date';return r}
    const isNew=!G.remote.includes(G.branch);G.upstream[G.branch]=true;if(isNew)G.remote.push(G.branch);G.pushed[G.branch]=G.branches[G.branch].length;G.ahead=0;W.f.pushed=G.branch;
    r.out=isNew?`remote:\nremote: Create a pull request for '${G.branch}' on GitHub by visiting:\nremote:      https://github.com/uptime/shop/pull/new/${G.branch}\nremote:\nTo github.com:uptime/shop.git\n * [new branch]      ${G.branch} -> ${G.branch}\nbranch '${G.branch}' set up to track 'origin/${G.branch}'.`:`To github.com:uptime/shop.git\n   ${G.branch} -> ${G.branch}`;return r}
  if(v==='merge'||v==='pull'||v==='rebase'){const from=v==='pull'?(a[2]||'main'):a.slice(1).filter(x=>!x.startsWith('-'))[0];if(!from)return err('укажи ветку: git merge main');
    if(v==='rebase')return err('rebase в тренажёре пока нет. Здесь используй git merge main: в общей ветке это безопасный вариант.');
    const src=from.replace(/^origin\//,'');if(!G.branches[src])return err(`merge: ${from} - not something we can merge`);
    if(G.conflictOn&&src==='main'&&!G.mergedMain){G.merging=true;G.mergeFrom=src;G.conflicts=['config.yaml'];G.mergedMain=true;W.files[G.root+'/config.yaml']=G.conflictText;W.f.conflict=true;
      r.out=(v==='pull'?'From github.com:uptime/shop\n * branch            main       -> FETCH_HEAD\n':'')+'Auto-merging config.yaml\nCONFLICT (content): Merge conflict in config.yaml\nAutomatic merge failed; fix conflicts and then commit the result.';r.cls='e';return r}
    r.out='Already up to date.';return r}
  if(v==='log'){const L=G.branches[G.branch].slice().reverse();r.out=L.map((c,i)=>`${a.includes('--graph')?'* ':''}${c.h} ${i===0?`(HEAD -> ${G.branch}) `:''}${c.msg}`).join('\n');return r}
  if(v==='diff'){r.out=G.modified.map(f=>`diff --git a/${f} b/${f}\n--- a/${f}\n+++ b/${f}\n(изменён ${f})`).join('\n');return r}
  if(['restore','reset','stash','cherry-pick','tag','fetch','clone','remote'].includes(v))return err(`git ${v} в тренажёре пока нет. В настоящем git команда работает.`);
  return err('git: в тренажёре есть status, branch, switch, checkout, add, commit, push, merge, pull, log, diff')}

/* docker build по настоящему Dockerfile из папки */
export function dockerBuild(W,a,err,r){let tag=null,file='Dockerfile',ctx=null;for(let i=2;i<a.length;i++){if(a[i]==='-t'||a[i]==='--tag')tag=a[++i];else if(a[i]==='-f'||a[i]==='--file')file=a[++i];else if(!a[i].startsWith('-'))ctx=a[i]}
  if(!ctx)return err('ERROR: "docker buildx build" requires exactly 1 argument.\nУкажи контекст сборки, обычно это точка: docker build -t shop:1.0 .');
  const p=rp(W,(ctx==='.'?'':ctx.replace(/\/$/,'')+'/')+file),src=W.files[p];if(src==null)return err('ERROR: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory');
  tag=tag||'<none>:<none>';const froms=[...src.matchAll(/^\s*FROM\s+(\S+)/gim)].map(m=>m[1]),final=froms[froms.length-1]||'',multi=froms.length>1,small=/alpine|slim|distroless/.test(final);
  const size=multi?(small?'168MB':'412MB'):(small?'240MB':'1.12GB');
  const steps=src.split('\n').filter(l=>/^\s*(FROM|RUN|COPY|ADD|WORKDIR|USER|CMD|ENTRYPOINT|ENV|EXPOSE|ARG)\b/i.test(l)).map(l=>l.trim());
  W.images=W.images.filter(i=>i!==tag);W.images.push(tag);W.imgInfo[tag]={size,froms,base:final};W.f.built=W.f.built||{};W.f.built[tag]=W.imgInfo[tag];
  r.out=`[+] Building ${(18+steps.length*2.7).toFixed(1)}s (${steps.length+3}/${steps.length+3}) FINISHED\n => [internal] load build definition from ${file}\n => [internal] load .dockerignore\n${steps.map((l,i)=>` => [${i+1}/${steps.length}] ${l}`).join('\n')}\n => exporting to image\n => => naming to docker.io/library/${tag}`;return r}

/* docker compose */
export function compose(W,a,err,r){const src=W.files[rp(W,'compose.yaml')]??W.files[rp(W,'docker-compose.yml')];if(src==null)return err('no configuration file provided: not found');const v=a[0];
  if(v==='up'){const ok=COMPOSE_CHECKS.every(c=>c.test(src));W.compose={up:true,ok};W.f.composeUp=true;
    r.out=` ✔ Network shop_default    Created\n${/volumes:/.test(src)?' ✔ Volume "shop_db-data"   Created\n':''} ✔ Container shop-db-1     Started\n ✔ Container shop-api-1    Started`+(a.includes('-d')?'':'\n(без -d стек занял бы терминал; с -d работает в фоне)');return r}
  if(v==='ps'){if(!W.compose)return err('no containers found: сначала docker compose up -d');W.f.composePs=true;
    r.out=`NAME          IMAGE         SERVICE   STATUS\nshop-api-1    shop:1.1      api       ${W.compose.ok?'Up 12 seconds':'Restarting (1) 2 seconds ago'}\nshop-db-1     postgres:16   db        Up 13 seconds`;return r}
  if(v==='logs'){const s=a.slice(1).filter(x=>!x.startsWith('-'))[0];if(!W.compose)return err('no containers found');
    r.out=s==='db'?'db-1  | LOG:  database system is ready to accept connections':(W.compose.ok?'api-1  | connected to postgres://shop:***@db:5432/shop\napi-1  | listening on :8080':'api-1  | Error: connect ECONNREFUSED 127.0.0.1:5432');return r}
  if(v==='down'){W.compose=null;r.out=' ✔ Container shop-api-1    Removed\n ✔ Container shop-db-1     Removed\n ✔ Network shop_default    Removed';return r}
  return err('docker compose: в тренажёре есть up, ps, logs, down')}

/* terraform */
export function tfDesired(W){const t=W.files[W.tf.dir+'/main.tf']||'';return{web:(t.match(/instance_type\s*=\s*"([\w.]+)"/)||[])[1]||'?',bucket:/resource\s+"aws_s3_bucket"\s+"assets"/.test(t)}}
export function tfPlan(W){const d=tfDesired(W),s=W.tf.state,L=[];let add=0,chg=0;
  if(d.web!==s.web){chg++;L.push(`  # aws_instance.web will be updated in-place\n  ~ resource "aws_instance" "web" {\n        id            = "i-0a1b2c3d4e5f60789"\n      ~ instance_type = "${s.web}" -> "${d.web}"\n        tags          = { "Name" = "shop-web" }\n    }`)}
  if(d.bucket&&!s.bucket){add++;L.push(`  # aws_s3_bucket.assets will be created\n  + resource "aws_s3_bucket" "assets" {\n      + bucket = "uptime-shop-assets"\n      + id     = (known after apply)\n    }`)}
  return{add,chg,text:L.length?`Terraform will perform the following actions:\n\n${L.join('\n\n')}\n\nPlan: ${add} to add, ${chg} to change, 0 to destroy.`:'No changes. Your infrastructure matches the configuration.'}}
export function terraform(W,a,err,r){const T=W.tf,v=a[1];
  if(W.cwd!==T.dir)return err('Error: No configuration files\n\nВ этой папке нет .tf файлов. Перейди к коду инфраструктуры: cd ~/infra');
  if(v==='init'){T.inited=true;r.out='Initializing the backend...\nInitializing provider plugins...\n- Finding hashicorp/aws versions matching "~> 5.0"...\n- Installing hashicorp/aws v5.72.1...\n\nTerraform has been successfully initialized!';r.cls='g';return r}
  if(!T.inited)return err('Error: Required plugins are not installed\n│ Сначала выполни terraform init.');
  if(v==='fmt')return r;if(v==='validate'){r.out='Success! The configuration is valid.';r.cls='g';return r}
  if(v==='plan'){const p=tfPlan(W);W.f.tfPlan=(W.f.tfPlan||0)+1;r.out='aws_instance.web: Refreshing state... [id=i-0a1b2c3d4e5f60789]\n\n'+p.text;return r}
  if(v==='apply'){const p=tfPlan(W);if(!p.add&&!p.chg){r.out='No changes. Your infrastructure matches the configuration.\n\nApply complete! Resources: 0 added, 0 changed, 0 destroyed.';return r}
    if(a.includes('-auto-approve'))return tfApply(W,r);T.await=true;r.out=p.text+"\n\nDo you want to perform these actions?\n  Terraform will perform the actions described above.\n  Only 'yes' will be accepted to approve.\n\n  Enter a value: (введи yes)";return r}
  if(v==='state'&&a[2]==='list'){r.out='aws_instance.web'+(T.state.bucket?'\naws_s3_bucket.assets':'');return r}
  if(v==='destroy')return err('Утка заблокировала destroy на проде. И правильно сделала.');
  return err('terraform: в тренажёре есть init, plan, apply, validate, fmt, state list')}
export function tfApply(W,r){const p=tfPlan(W),d=tfDesired(W);W.tf.state={web:d.web,bucket:d.bucket||W.tf.state.bucket};W.f.tfApplied=true;
  r.out=(p.chg?'aws_instance.web: Modifying... [id=i-0a1b2c3d4e5f60789]\naws_instance.web: Modifications complete after 42s\n':'')+(p.add?'aws_s3_bucket.assets: Creating...\naws_s3_bucket.assets: Creation complete after 2s [id=uptime-shop-assets]\n':'')+`\nApply complete! Resources: ${p.add} added, ${p.chg} changed, 0 destroyed.`;r.cls='g';return r}

/* ansible */
export function ansible(W,a,line,err,r){const inv=line.match(/-i\s+(\S+)/);
  if(!inv)return err('[WARNING]: No inventory was parsed, only implicit localhost is available\nУкажи инвентарь: -i inventory.ini');
  if(rp(W,inv[1])!==W.ans.dir+'/inventory.ini')return err(`[WARNING]: Unable to parse ${inv[1]} as an inventory source`);
  if(a[0]==='ansible'){if(!a.includes('-m'))return err('укажи модуль: ansible web -i inventory.ini -m ping');W.f.ansPing=true;r.out=['web-1','web-2'].map(h=>`${h} | SUCCESS => {\n    "changed": false,\n    "ping": "pong"\n}`).join('\n');r.cls='g';return r}
  const pb=a.slice(1).find(x=>/\.ya?ml$/.test(x));if(!pb)return err('ansible-playbook: укажи плейбук, например site.yml');const src=W.files[rp(W,pb)];if(src==null)return err(`ERROR! the playbook: ${pb} could not be found`);
  if(!/hosts:\s*web\s*$/m.test(src))return err('[WARNING]: Could not match supplied host pattern\nskipping: no hosts matched (в инвентаре есть группа web)');
  const check=a.includes('--check')||a.includes('-C');
  if(!/become:\s*(true|yes)\b/.test(src)){r.out='PLAY [web] *****\n\nTASK [Gathering Facts] *****\nok: [web-1]\nok: [web-2]\n\nTASK [Установить nginx] *****\nfatal: [web-1]: FAILED! => {"msg": "Failed to lock apt for exclusive operation"}\nfatal: [web-2]: FAILED! => {"msg": "Failed to lock apt for exclusive operation"}\n\nPLAY RECAP *****\nweb-1 : ok=1 changed=0 failed=1\nweb-2 : ok=1 changed=0 failed=1\n\n(ставить пакеты можно только от root: нужен become: true)';r.cls='e';return r}
  const chg=check||!W.ans.applied?2:0,st=chg?'changed':'ok';
  r.out=`PLAY [web] ${check?'(--check: ничего не меняем) ':''}*****\n\nTASK [Gathering Facts] *****\nok: [web-1]\nok: [web-2]\n\nTASK [Установить nginx] *****\n${st}: [web-1]\n${st}: [web-2]\n\nTASK [Запустить nginx и включить автозапуск] *****\n${st}: [web-1]\n${st}: [web-2]\n\nPLAY RECAP *****\nweb-1 : ok=3 changed=${chg} unreachable=0 failed=0\nweb-2 : ok=3 changed=${chg} unreachable=0 failed=0`;
  if(check)W.f.ansCheck=true;else{if(W.ans.applied)W.f.ansIdem=true;W.ans.applied=true}return r}

/* kubectl: Service, endpoints, apply, Secret, логи упавших релизов */
export function kExt(W,a,line,err,r){const K=W.k8s,v=a[0],what=(a[1]||'').toLowerCase();
  if(K.svc){
    const eps=n=>{const S=K.svc[n];return K.pods.filter(p=>p.app===S.selector&&p.status==='Running').map(p=>kIp(p)+':'+S.targetPort)};
    if(v==='get'&&/^(endpoints|ep)$/.test(what)){const n=a[2]||'web';if(!K.svc[n])return err(`Error from server (NotFound): endpoints "${n}" not found`);W.f.ep=(W.f.ep||0)+1;const e=eps(n);if(e.length)W.f.epOk=true;
      r.out=`NAME   ENDPOINTS                                       AGE\n${pad(n,7)}${pad(e.length?e.join(','):'<none>',48)}12d`;return r}
    if(v==='get'&&/^(svc|services?)$/.test(what)){r.out='NAME   TYPE        CLUSTER-IP    PORT(S)   AGE\n'+Object.entries(K.svc).map(([n,S])=>`${pad(n,7)}ClusterIP   10.43.17.40   ${S.port}/TCP    12d`).join('\n');return r}
    if(v==='describe'&&/^(svc|services?)$/.test(what)){const n=a[2],S=K.svc[n];if(!S)return err(`Error from server (NotFound): services "${n||''}" not found`);W.f.svcDesc=true;const e=eps(n);
      r.out=`Name:              ${n}\nNamespace:         prod\nSelector:          app=${S.selector}\nType:              ClusterIP\nIP:                10.43.17.40\nPort:              http  ${S.port}/TCP\nTargetPort:        ${S.targetPort}/TCP\nEndpoints:         ${e.length?e.join(','):'<none>'}`;return r}
    if(v==='get'&&/^(ingress|ing)$/.test(what)){r.out='NAME   CLASS   HOSTS        ADDRESS        PORTS   AGE\nshop   nginx   shop.local   203.0.113.10   80      12d';return r}
  }
  if(v==='get'&&/^po/.test(what)&&a.includes('--show-labels')){kRecon(W);W.f.showLabels=true;r.out=[pad('NAME',20)+pad('READY',7)+pad('STATUS',10)+'LABELS'].concat(K.pods.map(p=>pad(p.name,20)+pad(p.status==='Running'?'1/1':'0/1',7)+pad(p.status,10)+`app=${p.app},pod-template-hash=7d9f`)).join('\n');return r}
  if(v==='apply'){const f=line.match(/-f\s+(\S+)/);if(!f)return err('error: must specify one of -f and -k');const p=rp(W,f[1]),src=W.files[p];if(src==null)return err(`error: the path "${f[1]}" does not exist`);
    if(/kind:\s*Service/.test(src)&&K.svc){const sel=(src.match(/selector:\s*\n\s+app:\s*([\w-]+)/)||[])[1]||'?',tp=(src.match(/targetPort:\s*(\d+)/)||[])[1];const S=K.svc.web;const same=S.selector===sel;S.selector=sel;if(tp)S.targetPort=+tp;W.f.applied=true;r.out=`service/web ${same?'unchanged':'configured'}`;return r}
    if(/kind:\s*Deployment/.test(src)&&K.secrets){const d=K.deploys.shop;const needSecret=/secretKeyRef:[\s\S]*?name:\s*db\b/.test(src);W.f.deployApplied=true;W.f.deployGood=DEPLOY_CHECKS.every(c=>c.test(src));
      K.pods.filter(p=>p.app==='shop').forEach(p=>p.status='Terminating');kRecon(W);
      if(needSecret&&!K.secrets.db){d.waitSecret=true;K.pods.filter(p=>p.app==='shop'&&p.status==='ContainerCreating').forEach(p=>p.status='CreateContainerConfigError')}
      r.out='deployment.apps/shop configured';return r}
    return err('error: в этом файле нет ресурса, который знает тренажёр')}
  if(v==='create'&&what==='secret'&&K.secrets){const name=a.slice(2).filter(x=>!x.startsWith('-'))[1];if(a[2]!=='generic'||!name)return err('usage: kubectl create secret generic <имя> --from-literal=ключ=значение');
    if(!/--from-literal=\w+=\S+/.test(line))return err('error: укажи данные: --from-literal=password=...');if(K.secrets[name])return err(`error: failed to create secret secrets "${name}" already exists`);
    K.secrets[name]=true;const d=K.deploys.shop;if(d&&d.waitSecret){d.waitSecret=false;K.pods.filter(p=>p.status==='CreateContainerConfigError').forEach(p=>{p.status='ContainerCreating';p.age=0})}r.out=`secret/${name} created`;r.cls='g';return r}
  if(v==='get'&&/^secrets?$/.test(what)&&K.secrets){const L=Object.keys(K.secrets);r.out=L.length?'NAME   TYPE     DATA   AGE\n'+L.map(n=>`${pad(n,7)}Opaque   1      5s`).join('\n'):'No resources found in prod namespace.';return r}
  if(v==='logs'||(v==='describe'&&/^po/.test(what))){const target=v==='logs'?a.slice(1).filter(x=>!x.startsWith('-'))[0]:a[2];if(!target)return null;
    const p=target.includes('/')?K.pods.find(x=>x.app===target.split('/')[1]):kFind(W,target);if(!p)return null;
    if(p.status==='CreateContainerConfigError')return v==='logs'?err(`Error from server (BadRequest): container "shop" in pod "${p.name}" is waiting to start: CreateContainerConfigError`):(r.out=`Name:       ${p.name}\nStatus:     Pending\nReason:     CreateContainerConfigError\nEvents:\n  Warning  Failed  kubelet  Error: secret "db" not found`,r);
    if(v==='logs'&&p.app==='shop'&&K.deploys.shop&&!K.deploys.shop.ok){r.out=`> shop@${K.deploys.shop.image.split(':')[1]} start\n> node dist/server.js\n\nError: Cannot find module '/app/dist/server.js'\n    at Module._resolveFilename (node:internal/modules/cjs/loader:1145:15)`;r.cls='e';return r}
  }
  return null}

/* helm */
export function helm(W,a,line,err,r){const H=W.helm,v=a[0],K=W.k8s;
  if(v==='repo'&&a[1]==='add'){if(!a[2]||!a[3])return err('usage: helm repo add <имя> <url>');H.repos[a[2]]=a[3];W.f.helmRepo=true;r.out=`"${a[2]}" has been added to your repositories`;return r}
  if(v==='repo'&&(a[1]==='update'||a[1]==='list')){r.out=a[1]==='update'?'Hang tight while we grab the latest from your chart repositories...\nUpdate Complete. ⎈Happy Helming!⎈':'NAME\tURL\n'+Object.entries(H.repos).map(([n,u])=>n+'\t'+u).join('\n');return r}
  if(v==='search'){if(!H.repos.shop)return err('Error: no repositories configured');r.out='NAME       CHART VERSION  APP VERSION  DESCRIPTION\nshop/shop  1.8.0          2.4          Интернет-магазин Uptime Shop';return r}
  const sets={};for(const m of line.matchAll(/--set\s+([\w.]+)=(\S+)/g))sets[m[1]]=m[2];
  const roll=tag=>{K.deploys.shop={replicas:2,image:'shop:'+tag,ok:tag!=='2.5',load:50};K.pods.filter(p=>p.app==='shop').forEach(p=>p.status='Terminating');kRecon(W)};
  if(v==='install'||v==='upgrade'){const rel=a[1],chart=a[2];if(!rel||!chart||rel.startsWith('-'))return err(`usage: helm ${v} <релиз> <чарт>`);
    const repo=chart.split('/')[0];if(!chart.includes('/')||!H.repos[repo])return err(`Error: ${v==='install'?'INSTALLATION':'UPGRADE'} FAILED: repo ${repo} not found. Сначала helm repo add`);
    if(v==='install'&&H.rel[rel])return err('Error: INSTALLATION FAILED: cannot re-use a name that is still in use');
    if(v==='upgrade'&&!H.rel[rel]&&!a.includes('--install'))return err(`Error: UPGRADE FAILED: "${rel}" has no deployed releases`);
    const R=H.rel[rel]||(H.rel[rel]={hist:[]}),prev=R.hist[R.hist.length-1],tag=sets['image.tag']||(prev?prev.tag:'2.4');
    R.hist.forEach(h=>h.status='superseded');R.hist.push({rev:R.hist.length+1,tag,status:'deployed',desc:prev?'Upgrade complete':'Install complete'});roll(tag);W.f['helm_'+v]=tag;
    r.out=`${v==='upgrade'?`Release "${rel}" has been upgraded. Happy Helming!\n`:''}NAME: ${rel}\nLAST DEPLOYED: Thu Oct 22 10:14:02 2026\nNAMESPACE: prod\nSTATUS: deployed\nREVISION: ${R.hist.length}`;r.cls='g';return r}
  if(v==='list'||v==='ls'){r.out=['NAME  NAMESPACE  REVISION  STATUS    CHART       APP VERSION'].concat(Object.entries(H.rel).map(([n,R])=>{const h=R.hist[R.hist.length-1];return `${pad(n,6)}prod       ${pad(R.hist.length,10)}${pad(h.status,10)}shop-1.8.0  ${h.tag}`})).join('\n');return r}
  if(v==='history'){const R=H.rel[a[1]];if(!R)return err('Error: release: not found');W.f.helmHist=true;r.out=['REVISION  STATUS      CHART       APP VERSION  DESCRIPTION'].concat(R.hist.map(h=>`${pad(h.rev,10)}${pad(h.status,12)}shop-1.8.0  ${pad(h.tag,13)}${h.desc}`)).join('\n');return r}
  if(v==='rollback'){const R=H.rel[a[1]];if(!R)return err('Error: release: not found');const to=+(a[2]||R.hist.length-1),tgt=R.hist.find(h=>h.rev===to);if(!tgt)return err(`Error: release has no ${to} version`);
    R.hist.forEach(h=>h.status='superseded');R.hist.push({rev:R.hist.length+1,tag:tgt.tag,status:'deployed',desc:`Rollback to ${to}`});roll(tgt.tag);W.f.helmRollback=tgt.tag;r.out='Rollback was a success! Happy Helming!';r.cls='g';return r}
  if(v==='uninstall')return err('Не надо удалять релиз в проде. Утка против.');
  return err('helm: в тренажёре есть repo add/update/list, search, install, upgrade, list, history, rollback')}

/* trivy */
export const VULNS=[['zlib1g','CVE-2022-37434','CRITICAL','1:1.2.11.dfsg-2','1:1.2.11.dfsg-2+deb11u2'],['libc6','CVE-2023-4911','HIGH','2.31-13+deb11u5','2.31-13+deb11u7'],['libssl1.1','CVE-2023-0286','HIGH','1.1.1n-0+deb11u3','1.1.1n-0+deb11u4'],['node','CVE-2023-44487','HIGH','16.20.2','нет: Node 16 вне поддержки (EOL)']];
export function trivy(W,a,err,r){if(a[1]!=='image'&&a[1]!=='i')return err('В тренажёре trivy сканирует образы: trivy image <образ>');
  const args=a.slice(2),flags={};const pos=[];for(let i=0;i<args.length;i++){if(args[i]==='--severity'||args[i]==='-s')flags.sev=args[++i];else if(args[i]==='--exit-code')flags.exit=+args[++i];else if(args[i].startsWith('--severity='))flags.sev=args[i].split('=')[1];else if(args[i].startsWith('--exit-code='))flags.exit=+args[i].split('=')[1];else if(!args[i].startsWith('-'))pos.push(args[i])}
  const img=pos[0];if(!img)return err('usage: trivy image <образ>');const info=W.imgInfo&&W.imgInfo[img];if(!info&&!W.images.includes(img))return err(`FATAL: unable to find the specified image "${img}"`);
  const base=info?info.base:img,old=/node:(1\d|[0-9])\b|:latest\b/.test(base)||!/node:(2\d|[3-9]\d)/.test(base),small=/alpine|slim|distroless/.test(base);
  let rows=old?VULNS:(small?[['busybox','CVE-2023-42366','LOW','1.36.1-r29','1.36.1-r30']]:[['perl-base','CVE-2023-31484','HIGH','5.36.0-7+deb12u1','']]);
  const sev=(flags.sev||'').toUpperCase().split(',').filter(Boolean);if(sev.length)rows=rows.filter(x=>sev.includes(x[2]));
  const n=s=>rows.filter(x=>x[2]===s).length;W.f.trivy=W.f.trivy||{};W.f.trivy[img]={crit:n('CRITICAL'),high:n('HIGH')};
  const os=small?'alpine 3.20':'debian '+(old?'11.8':'12.7');
  r.out=`${img} (${os})\n${'='.repeat(img.length+os.length+3)}\nTotal: ${rows.length} (${['CRITICAL','HIGH','MEDIUM','LOW'].filter(s=>!sev.length||sev.includes(s)).map(s=>s+': '+n(s)).join(', ')})\n`+(rows.length?'\n'+pad('Library',11)+pad('Vulnerability',16)+pad('Severity',10)+pad('Installed',20)+'Fixed\n'+rows.map(x=>pad(x[0],11)+pad(x[1],16)+pad(x[2],10)+pad(x[3],20)+(x[4]||'—')).join('\n'):'');
  if(flags.exit&&rows.length){r.cls='e';r.exit=flags.exit}else if(n('CRITICAL')||n('HIGH'))r.cls='e';return r}

/* gitleaks */
export function gitleaks(W,a,err,r){const v=a[1];
  if(v==='detect'||v==='git'){W.f.leakScan=true;r.out='Finding:     const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";\nSecret:      AKIAIOSFODNN7EXAMPLE\nRuleID:      aws-access-token\nEntropy:     3.65\nFile:        config/aws.js\nLine:        3\nCommit:      a1b2c3d\nAuthor:      vasya\nDate:        2026-10-14T18:22:41Z\n\nINF 37 commits scanned.\nWRN leaks found: 1';r.cls='e';r.exit=1;return r}
  if(v==='dir'||v==='protect'){const leak=/AKIA[0-9A-Z]{16}/.test(W.files[W.leak.file]||'');if(!leak)W.f.leakDir=true;
    r.out=leak?'Finding:     const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";\nRuleID:      aws-access-token\nFile:        config/aws.js\nLine:        3\n\nWRN leaks found: 1':'INF scanned ~2.1 KB in 38ms\nINF no leaks found';r.cls=leak?'e':'g';if(leak)r.exit=1;return r}
  return err('gitleaks: в тренажёре есть detect (вся история git) и dir . (текущие файлы)')}
export function complete(W,val){const parts=val.split(' '),last=parts.pop();const words=['kubectl','get','pods','deploy','top','logs','describe','delete','pod','scale','rollout','undo','status','--replicas=','docker','ps','run','images','stop','rm','systemctl','restart','nginx','grep','tail','cat','curl','localhost','git','add','commit','push','diff','gh','list','view','--log-failed','query','events','nodes','svc','history','--previous','-l','app=','journalctl','du','wc','chmod','chown','+x','enable','--now','is-enabled','dig','switch','-c','merge','main','build','compose','up','-d','terraform','init','plan','apply','yes','ansible','ansible-playbook','inventory.ini','site.yml','--check','endpoints','--show-labels','create','secret','generic','helm','repo','install','upgrade','rollback','trivy','image','gitleaks','detect','dir'];
  if(W.k8s)words.push(...W.k8s.pods.map(p=>p.name),...Object.keys(W.k8s.deploys).map(n=>'deployment/'+n));W.containers.forEach(c=>words.push(c.name));
  if(/^(cat|cd|ls|tail|head|rm|grep|chmod|chown|bash|less|wc|sudo)$/.test(parts[0]||'')||parts.includes('-f')||last.startsWith('./')||last.includes('/')){const base=last.includes('/')?last.slice(0,last.lastIndexOf('/')+1):'';const d=rp(W,base||'.');children(W,d).forEach(c=>words.push(base+c.n+(c.dir?'/':'')))}
  const m=[...new Set(words)].filter(w=>w.startsWith(last)&&w!==last);if(m.length===1){parts.push(m[0]);return{val:parts.join(' ')+(m[0].endsWith('/')||m[0].endsWith('=')?'':' ')}}
  if(m.length>1){let p=m[0];for(const w of m)while(!w.startsWith(p))p=p.slice(0,-1);if(p.length>last.length){parts.push(p);return{val:parts.join(' ')}}return{list:m.slice(0,12).join('  ')}}return{}}
