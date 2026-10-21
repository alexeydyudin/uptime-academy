// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { kPod, CI_PATH } from './curriculum';
import { line } from './ui';
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
  const parts=splitTop(line,'&&').filter(Boolean);if(!parts.length)return{out:'',cls:''};
  const outs=[];let cls='',clear=false;
  for(const part of parts){
    const stages=splitTop(part,'|').filter(Boolean);let res=sh1(W,stages[0]);
    if(res.clear){clear=true;outs.length=0;continue}
    for(const st of stages.slice(1)){if(res.cls==='e')break;const f=pipeFilter(W,res.out||'',st);res=f.err?{out:f.err,cls:'e'}:{out:f.out,cls:res.cls==='e'?'e':''}}
    if(/(kubectl|k)\s+get\s+po/.test(part)&&W.f.kdelAt!=null)W.f.kdelGetSameLine=true;
    if(res.out)outs.push(res.out);if(res.cls)cls=res.cls;
    if(res.cls==='e')break;
  }
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
  switch(cmd){
  case 'help':r.out='Доступно: pwd ls cd cat tail head grep ps kill df rm systemctl curl whoami hostname echo clear\n          docker ps|run|logs|stop|rm|images\n          kubectl get|describe|logs|delete|scale|top|rollout\n          git status|add|commit|push|log|diff   gh run list|view   query <promql>\nМожно: трубы | (grep, wc -l, head, tail, sort, uniq), цепочки &&, sudo.\nTab дополняет, ↑ повторяет команду.';r.cls='d';return r;
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
  case 'sudo':return a[1]?sh1(W,line.trim().replace(/^sudo\s+/,'')):err('usage: sudo <команда>');
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

export function complete(W,val){const parts=val.split(' '),last=parts.pop();const words=['kubectl','get','pods','deploy','top','logs','describe','delete','pod','scale','rollout','undo','status','--replicas=','docker','ps','run','images','stop','rm','systemctl','restart','nginx','grep','tail','cat','curl','localhost','git','add','commit','push','diff','gh','list','view','--log-failed','query','events','nodes','svc','history','--previous','-l','app=','journalctl','du','wc'];
  if(W.k8s)words.push(...W.k8s.pods.map(p=>p.name),...Object.keys(W.k8s.deploys).map(n=>'deployment/'+n));W.containers.forEach(c=>words.push(c.name));
  if(/^(cat|cd|ls|tail|head|rm|grep)$/.test(parts[0]||'')||last.includes('/')){const base=last.includes('/')?last.slice(0,last.lastIndexOf('/')+1):'';const d=rp(W,base||'.');children(W,d).forEach(c=>words.push(base+c.n+(c.dir?'/':'')))}
  const m=[...new Set(words)].filter(w=>w.startsWith(last)&&w!==last);if(m.length===1){parts.push(m[0]);return{val:parts.join(' ')+(m[0].endsWith('/')||m[0].endsWith('=')?'':' ')}}
  if(m.length>1){let p=m[0];for(const w of m)while(!w.startsWith(p))p=p.slice(0,-1);if(p.length>last.length){parts.push(p);return{val:parts.join(' ')}}return{list:m.slice(0,12).join('  ')}}return{}}
