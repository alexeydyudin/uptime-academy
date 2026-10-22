// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { pad, rp } from './util';

export const COMPOSE_CHECKS=[
 {name:'Сервис db на образе postgres с версией',test:t=>/^\s{2}db:\s*$/m.test(t)&&/image:\s*["']?postgres:\d+/.test(t)},
 {name:'Пароль базы задан (POSTGRES_PASSWORD)',test:t=>/POSTGRES_PASSWORD/.test(t)},
 {name:'Данные базы в volume (/var/lib/postgresql/data), volume объявлен',test:t=>{const m=t.match(/-\s*["']?([\w.\/-]+):\/var\/lib\/postgresql\/data/);if(!m)return false;if(/^[.\/]/.test(m[1]))return true;return new RegExp('^volumes:\\s*\\n\\s+'+m[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+':','m').test(t)}},
 {name:'api ходит в базу по имени сервиса db',test:t=>/DATABASE_URL\s*[=:]\s*["']?postgres(ql)?:\/\/[^@\s]+@db:5432\//.test(t)},
 {name:'api зависит от db (depends_on)',test:t=>/depends_on:\s*\n\s+-\s*db\b|depends_on:\s*\[\s*db\s*\]|depends_on:\s*\n\s+db:/.test(t)},
];
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
export function dockerBuild(W,a,err,r){let tag=null,file='Dockerfile',ctx=null;for(let i=2;i<a.length;i++){if(a[i]==='-t'||a[i]==='--tag')tag=a[++i];else if(a[i]==='-f'||a[i]==='--file')file=a[++i];else if(!a[i].startsWith('-'))ctx=a[i]}
  if(!ctx)return err('ERROR: "docker buildx build" requires exactly 1 argument.\nУкажи контекст сборки, обычно это точка: docker build -t shop:1.0 .');
  const p=rp(W,(ctx==='.'?'':ctx.replace(/\/$/,'')+'/')+file),src=W.files[p];if(src==null)return err('ERROR: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory');
  tag=tag||'<none>:<none>';const froms=[...src.matchAll(/^\s*FROM\s+(\S+)/gim)].map(m=>m[1]),final=froms[froms.length-1]||'',multi=froms.length>1,small=/alpine|slim|distroless/.test(final);
  const size=multi?(small?'168MB':'412MB'):(small?'240MB':'1.12GB');
  const steps=src.split('\n').filter(l=>/^\s*(FROM|RUN|COPY|ADD|WORKDIR|USER|CMD|ENTRYPOINT|ENV|EXPOSE|ARG)\b/i.test(l)).map(l=>l.trim());
  W.images=W.images.filter(i=>i!==tag);W.images.push(tag);W.imgInfo[tag]={size,froms,base:final};W.f.built=W.f.built||{};W.f.built[tag]=W.imgInfo[tag];
  r.out=`[+] Building ${(18+steps.length*2.7).toFixed(1)}s (${steps.length+3}/${steps.length+3}) FINISHED\n => [internal] load build definition from ${file}\n => [internal] load .dockerignore\n${steps.map((l,i)=>` => [${i+1}/${steps.length}] ${l}`).join('\n')}\n => exporting to image\n => => naming to docker.io/library/${tag}`;return r}
export function compose(W,a,err,r){const src=W.files[rp(W,'compose.yaml')]??W.files[rp(W,'docker-compose.yml')];if(src==null)return err('no configuration file provided: not found');const v=a[0];
  if(v==='up'){const ok=COMPOSE_CHECKS.every(c=>c.test(src));W.compose={up:true,ok};W.f.composeUp=true;
    r.out=` ✔ Network shop_default    Created\n${/volumes:/.test(src)?' ✔ Volume "shop_db-data"   Created\n':''} ✔ Container shop-db-1     Started\n ✔ Container shop-api-1    Started`+(a.includes('-d')?'':'\n(без -d стек занял бы терминал; с -d работает в фоне)');return r}
  if(v==='ps'){if(!W.compose)return err('no containers found: сначала docker compose up -d');W.f.composePs=true;
    r.out=`NAME          IMAGE         SERVICE   STATUS\nshop-api-1    shop:1.1      api       ${W.compose.ok?'Up 12 seconds':'Restarting (1) 2 seconds ago'}\nshop-db-1     postgres:16   db        Up 13 seconds`;return r}
  if(v==='logs'){const s=a.slice(1).filter(x=>!x.startsWith('-'))[0];if(!W.compose)return err('no containers found');
    r.out=s==='db'?'db-1  | LOG:  database system is ready to accept connections':(W.compose.ok?'api-1  | connected to postgres://shop:***@db:5432/shop\napi-1  | listening on :8080':'api-1  | Error: connect ECONNREFUSED 127.0.0.1:5432');return r}
  if(v==='down'){W.compose=null;r.out=' ✔ Container shop-api-1    Removed\n ✔ Container shop-db-1     Removed\n ✔ Network shop_default    Removed';return r}
  return err('docker compose: в тренажёре есть up, ps, logs, down')}
