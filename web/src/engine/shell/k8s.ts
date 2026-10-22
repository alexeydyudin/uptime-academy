// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { pad, rp, kSync, kRecon, kFind, kIp } from './util';

export const DEPLOY_CHECKS=[
 {name:'Пароль не лежит в манифесте открытым текстом',test:t=>!/S3cr3t-prod-pass/.test(t)},
 {name:'DB_PASSWORD берётся из Secret db, ключ password',test:t=>/name:\s*DB_PASSWORD\s*\n\s+valueFrom:\s*\n\s+secretKeyRef:/.test(t)&&/secretKeyRef:\s*\n(?:\s+\w+:.*\n?){0,1}\s+name:\s*db\b/.test(t)&&/secretKeyRef:[\s\S]{0,120}key:\s*password\b/.test(t)},
 {name:'readinessProbe по HTTP на /healthz',test:t=>/readinessProbe:\s*\n\s+httpGet:\s*\n[\s\S]{0,80}path:\s*\/healthz/.test(t)},
 {name:'livenessProbe',test:t=>/livenessProbe:\s*\n\s+\w+/.test(t)},
 {name:'Заданы requests и limits ресурсов',test:t=>/resources:\s*\n\s+requests:/.test(t)&&/limits:\s*\n\s+(memory|cpu):/.test(t)&&/memory:/.test(t)},
];
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
