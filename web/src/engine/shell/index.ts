// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { git, gh, git2 } from './git';
import { docker, dockerBuild, compose } from './docker';
import { kubectl, kExt, helm } from './k8s';
import { pad, rp, children, flagsArgs, MODE_STR, permOf, ownerOf, can, chmodApply, resolveHost } from './util';
import { promq } from './observability';
import { scriptOut } from './linux';
import { terraform, tfApply, ansible } from './iac';
import { trivy, gitleaks } from './security';

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
export function complete(W,val){const parts=val.split(' '),last=parts.pop();const words=['kubectl','get','pods','deploy','top','logs','describe','delete','pod','scale','rollout','undo','status','--replicas=','docker','ps','run','images','stop','rm','systemctl','restart','nginx','grep','tail','cat','curl','localhost','git','add','commit','push','diff','gh','list','view','--log-failed','query','events','nodes','svc','history','--previous','-l','app=','journalctl','du','wc','chmod','chown','+x','enable','--now','is-enabled','dig','switch','-c','merge','main','build','compose','up','-d','terraform','init','plan','apply','yes','ansible','ansible-playbook','inventory.ini','site.yml','--check','endpoints','--show-labels','create','secret','generic','helm','repo','install','upgrade','rollback','trivy','image','gitleaks','detect','dir'];
  if(W.k8s)words.push(...W.k8s.pods.map(p=>p.name),...Object.keys(W.k8s.deploys).map(n=>'deployment/'+n));W.containers.forEach(c=>words.push(c.name));
  if(/^(cat|cd|ls|tail|head|rm|grep|chmod|chown|bash|less|wc|sudo)$/.test(parts[0]||'')||parts.includes('-f')||last.startsWith('./')||last.includes('/')){const base=last.includes('/')?last.slice(0,last.lastIndexOf('/')+1):'';const d=rp(W,base||'.');children(W,d).forEach(c=>words.push(base+c.n+(c.dir?'/':'')))}
  const m=[...new Set(words)].filter(w=>w.startsWith(last)&&w!==last);if(m.length===1){parts.push(m[0]);return{val:parts.join(' ')+(m[0].endsWith('/')||m[0].endsWith('=')?'':' ')}}
  if(m.length>1){let p=m[0];for(const w of m)while(!w.startsWith(p))p=p.slice(0,-1);if(p.length>last.length){parts.push(p);return{val:parts.join(' ')}}return{list:m.slice(0,12).join('  ')}}return{}}
