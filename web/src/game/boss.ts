// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { S, save, ensureDaily, $, esc } from './state';
import { duckSVG } from './duck';
import { rid } from '../engine/world';
import { pad } from '../engine/shell/util';
import { show, renderHome, finishBoss, line } from './ui';
import { makeWorker } from './worker';

export const CFG={api:{cap:120,ratio:1,leak:.22,desc:'HTTP API'},auth:{cap:200,ratio:.4,leak:.12,desc:'OAuth'},db:{cap:90,ratio:.6,leak:.06,desc:'PostgreSQL'},worker:{cap:60,ratio:.3,leak:1.5,desc:'очередь задач'}};
export const CURVE=[.35,.27,.2,.16,.15,.18,.25,.35,.45,.53,.6,.66,.7,.68,.65,.67,.7,.78,.85,.94,1,.9,.7,.5];
export const curve=h=>{const i=Math.floor(h)%24,f=h-Math.floor(h);return CURVE[i]*(1-f)+CURVE[(i+1)%24]*f};
export const START=17*60,DUR=300;
export let G=null,bTimer=null,bWorker=null,bWait=false;
export const mkPod=(n,st)=>({name:`${n}-${rid()}`,svc:n,status:st,timer:st==='Creating'?3:0,mem:8+Math.random()*15,restarts:0,age:0,fault:false,oom:false});
export const bClockStr=()=>{const a=START+G.t;return String(Math.floor(a/60)%24).padStart(2,'0')+':'+String(a%60).padStart(2,'0')};
export function startBoss(){
  G={t:0,credits:150,budget:100,rps:0,success:1,lat:0,spike:0,over:false,svc:{},paging:false,minSucc:1,t0:Date.now()};
  for(const[n,r]of Object.entries({api:2,auth:2,db:2,worker:1})){G.svc[n]={name:n,replicas:r,pods:[],util:0,queue:0,load:0};for(let i=0;i<r;i++)G.svc[n].pods.push(mkPod(n,'Running'))}
  $('#bSvcs').innerHTML='';$('#bEvents').innerHTML='';$('#bOut').innerHTML='';$('#bSout').innerHTML='';
  $('#bCode').value=S.code||'// Твой код из уроков появится здесь.\nfor (const s of cluster.services) {\n  \n}\n';
  bOut('Ночная смена, кластер prod. Сейчас 17:00, пик трафика около 20:00.\nДержи успешность выше 99%, иначе тает error budget. Поды стоят денег.\nКоманды: kubectl get pods | get deploy | top pods | logs | describe | delete pod | scale\nВо вкладке «Скрипт» лежит твой код из уроков. Запусти его.','d');
  bEvent('info','Смена началась. Удачи. Утка рядом.');stopScript();show('boss');bSpeed(1);bRender();
}
export function bEvent(k,m){const d=document.createElement('div');d.className='ev '+k;d.innerHTML=`<time>${bClockStr()}</time><span></span>`;d.lastChild.textContent=m;const b=$('#bEvents');b.prepend(d);while(b.children.length>60)b.lastChild.remove()}
export function bOut(t,c){line($('#bOut'),t,c)}
export function sLog(t,c){const o=$('#bSout');const d=document.createElement('div');if(c)d.style.color='#ff7b7f';d.textContent=`[${bClockStr()}] ${t}`;o.append(d);while(o.children.length>150)o.firstChild.remove();o.scrollTop=o.scrollHeight}
export function bRecon(s){const act=s.pods.filter(p=>p.status!=='Terminating');while(act.length<s.replicas){const p=mkPod(s.name,'Creating');s.pods.push(p);act.push(p)}
  if(act.length>s.replicas){const rk={CrashLoopBackOff:0,Creating:1,Running:2};act.sort((a,b)=>rk[a.status]-rk[b.status]);act.slice(0,act.length-s.replicas).forEach(p=>{p.status='Terminating';p.timer=1})}}
export function bFault(n){const run=G.svc[n].pods.filter(p=>p.status==='Running');if(!run.length)return;const p=run[Math.floor(Math.random()*run.length)];p.status='CrashLoopBackOff';p.fault=true;p.timer=3;p.restarts++;bEvent('bad',`${p.name}: CrashLoopBackOff после деплоя`)}
export function bScale(n,r,src){const s=G.svc[n];if(!s)return`сервис "${n}" не найден`;r=Math.round(+r);if(!(r>=1&&r<=12))return'replicas от 1 до 12';if(r===s.replicas)return null;bEvent('info',`deployment/${n}: ${s.replicas} → ${r}${src==='s'?' (скрипт)':''}`);s.replicas=r;bRecon(s);bRender();return null}
export function bFind(n){for(const s of Object.values(G.svc)){const p=s.pods.find(p=>p.name===n);if(p)return[s,p]}return[]}
export function bDel(n,src){const[s,p]=bFind(n);if(!p)return`pod "${n}" не найден`;if(p.status==='Terminating')return null;p.status='Terminating';p.timer=1;bRecon(s);bEvent('info',`pod ${n} deleted${src==='s'?' (скрипт)':''}`);bRender();return null}
export function bTick(){
  if(G.over)return;G.t++;const h=(START+G.t)/60;
  if(G.t===10)bFault('auth');else if(Math.random()<.008)bFault(Math.random()<.5?'api':'auth');
  if(G.t>60&&Math.random()<.003){const all=Object.values(G.svc).flatMap(s=>s.pods.filter(p=>p.status==='Running'));const n=Math.min(2,all.length);for(let i=0;i<n;i++){const p=all.splice(Math.floor(Math.random()*all.length),1)[0];p.status='Terminating';p.timer=1}bEvent('bad',`Нода node-${2+Math.floor(Math.random()*3)} NotReady: потеряно подов: ${n}`)}
  if(G.spike<=0&&G.t>40&&Math.random()<.005){G.spike=25;bEvent('warn','Маркетинг запустил рассылку: трафик +60% на ~25 мин')}
  const sm=G.spike>0?1.6:1;if(G.spike>0)G.spike--;G.rps=Math.round(320*curve(h)*sm*(.95+Math.random()*.1));
  for(const s of Object.values(G.svc)){for(const p of s.pods){p.age++;
      if(p.status==='Creating'){if(--p.timer<=0)p.status='Running'}else if(p.status==='Terminating')p.timer--;
      else if(p.status==='CrashLoopBackOff'){if(--p.timer<=0){if(p.fault){p.restarts++;p.timer=Math.min(10,3+p.restarts)}else{p.status='Running';p.mem=8}}}
      else if(p.status==='Running'){p.mem+=CFG[s.name].leak*(.5+Math.random())*(.6+Math.min(s.util,1.5));if(p.mem>=100){p.status='CrashLoopBackOff';p.timer=3;p.restarts++;p.mem=0;p.oom=true;bEvent('bad',`${p.name}: OOMKilled`)}}}
    s.pods=s.pods.filter(p=>!(p.status==='Terminating'&&p.timer<=0));bRecon(s)}
  let succ=1;for(const s of Object.values(G.svc)){const c=CFG[s.name];s.load=G.rps*c.ratio;const cap=s.pods.filter(p=>p.status==='Running').length*c.cap;s.util=cap?s.load/cap:(s.load?9.99:0);
    if(s.name==='worker'){s.queue=Math.max(0,s.queue+s.load-cap);if(s.queue>600)succ*=.97}else succ*=s.load?Math.min(1,cap/s.load):1}
  G.lat=Math.round(25/(1-Math.min(G.svc.api.util,.97))+20/(1-Math.min(G.svc.db.util,.97)));G.success=succ;G.minSucc=Math.min(G.minSucc,succ);
  const pods=Object.values(G.svc).reduce((a,s)=>a+s.pods.length,0);G.credits+=G.rps*succ*.008-pods*.12;
  if(succ<.99)G.budget-=(.99-succ)*10;else G.budget=Math.min(100,G.budget+.03);
  if(succ<.99&&!G.paging){G.paging=true;bEvent('bad',`PAGER: успешность ${(succ*100).toFixed(1)}% ниже SLO`)}if(succ>=.99&&G.paging){G.paging=false;bEvent('ok','Успешность вернулась выше SLO')}
  if(bWorker&&!bWait){bWait=true;const snap={time:bClockStr(),minute:G.t,rps:G.rps,success:G.success,credits:+G.credits.toFixed(1),budget:+G.budget.toFixed(1),
      services:Object.values(G.svc).map(s=>({name:s.name,replicas:s.replicas,running:s.pods.filter(p=>p.status==='Running').length,util:+s.util.toFixed(2),queue:Math.round(s.queue),pods:s.pods.map(p=>({name:p.name,status:p.status,mem:Math.round(p.mem),restarts:p.restarts,age:p.age}))}))};
    bWorker.postMessage({type:'tick',snap});bWorker.to=setTimeout(()=>{sLog('Скрипт не ответил за 1 с (бесконечный цикл?). Остановлен.',1);stopScript()},1000)}
  if(G.budget<=0)return bEnd(false,'Error budget исчерпан. Пользователи слишком долго видели ошибки.');
  if(G.credits<0)return bEnd(false,'Счёт за облако съел весь бюджет. Слишком много подов.');
  if(G.t>=DUR)return bEnd(true);bRender();
}
export function startScript(){stopScript();bWorker=makeWorker();bWait=false;
  bWorker.onmessage=e=>{const m=e.data;if(m.type==='loaded'){if(m.err){sLog(m.err,1);stopScript()}else{sLog('Скрипт запущен, срабатывает каждую минуту.');$('#bScriptState').textContent='работает';$('#bScriptState').style.color='var(--ok)'}return}
    if(m.type==='tick'){clearTimeout(bWorker.to);bWait=false;m.logs.forEach(l=>sLog(l));if(m.err)sLog('ERROR: '+m.err,1);
      for(const c of m.calls){const er=c.t==='scale'?bScale(c.n,c.r,'s'):bDel(c.p,'s');if(er)sLog('ERROR: '+er,1)}}};
  bWorker.postMessage({type:'load',code:$('#bCode').value});S.code=$('#bCode').value;save()}
export function stopScript(){if(bWorker){clearTimeout(bWorker.to);bWorker.terminate();bWorker=null}bWait=false;$('#bScriptState').textContent='не запущен';$('#bScriptState').style.color=''}
export function bSpeed(sp){clearInterval(bTimer);bTimer=null;if(sp>0)bTimer=setInterval(bTick,1000/sp);document.querySelectorAll('#boss .speed button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.sp===sp))}
document.querySelectorAll('#boss .speed button').forEach(b=>b.onclick=()=>{if(G&&!G.over)bSpeed(+b.dataset.sp)});
export function bEnd(win,why){G.over=true;bSpeed(0);stopScript();
  if(win){finishBoss({secs:Math.round((Date.now()-G.t0)/1000)});const t=document.createElement('p');t.style.margin='0';t.textContent=`Худшая минута смены: ${(G.minSucc*100).toFixed(1)}% успешных. Error budget на финише: ${Math.max(0,G.budget).toFixed(0)}%.`;$('#resBody h1').after(t);return}
  show('result');const B=$('#resBody');B.className='result fail';
  B.innerHTML=`${duckSVG('angry')}<h1>Прод упал</h1><p style="margin:0">${esc(why)}</p><p style="margin:0;color:var(--muted)">Продержался до ${bClockStr()}. Жизни за дежурство не снимаются. Совет утки: запусти автоскейлер с cooldown и автохил, а db подними заранее.</p><div style="display:flex;gap:10px"><button class="btn ghost" id="resHome">На карту</button><button class="btn" id="resRetry">Ещё смену</button></div>`;
  B.querySelector('.duck').style.width='140px';$('#resHome').onclick=()=>{renderHome();show('home')};$('#resRetry').onclick=startBoss}
$('#bClose').onclick=()=>{G.over=true;bSpeed(0);stopScript();renderHome();show('home')};
$('#bRun').onclick=startScript;
$('#bStop').onclick=()=>{stopScript();sLog('Скрипт остановлен')};
$('#bCode').onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();e.target.setRangeText('  ',e.target.selectionStart,e.target.selectionEnd,'end')}};
document.querySelectorAll('[data-bt]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-bt]').forEach(x=>x.setAttribute('aria-selected',x===b));document.querySelectorAll('[data-bp]').forEach(p=>p.hidden=p.dataset.bp!==b.dataset.bt);if(b.dataset.bt==='script')document.querySelector('[data-bp="script"]').style.display='flex'});
export const bHist=[];
export let bHi=0;
$('#bIn').onkeydown=e=>{const I=e.target;
  if(e.key==='Enter'){const v=I.value.trim();I.value='';if(!v)return;bOut('$ '+v,'c');bHist.push(v);bHi=bHist.length;ensureDaily();S.daily.cmds++;save();const r=bCmd(v);if(r)bOut(r[0],r[1]);bRender()}
  else if(e.key==='ArrowUp'){if(bHi>0){bHi--;I.value=bHist[bHi]}e.preventDefault()}
  else if(e.key==='Tab'){e.preventDefault();const parts=I.value.split(' '),last=parts.pop();const w=['kubectl','get','pods','deploy','top','logs','describe','delete','pod','scale','--replicas=',...Object.values(G.svc).flatMap(s=>s.pods.map(p=>p.name)),...Object.keys(G.svc).map(n=>'deployment/'+n)];const m=w.filter(x=>x.startsWith(last));if(m.length===1){parts.push(m[0]);I.value=parts.join(' ')+(m[0].endsWith('=')?'':' ')}else if(m.length>1)bOut(m.slice(0,10).join('  '),'d')}};
export function bCmd(line){const a=line.split(/\s+/);if(a[0]==='k')a[0]='kubectl';if(a[0]==='clear'){$('#bOut').innerHTML='';return null}if(a[0]!=='kubectl')return['Здесь работает только kubectl (и clear).','e'];
  const v=a[1],res=(a[2]||'').toLowerCase();
  if(v==='get'&&/^po/.test(res))return[[pad('NAME',14)+pad('READY',7)+pad('STATUS',19)+pad('RESTARTS',10)+'AGE'].concat(Object.values(G.svc).flatMap(s=>s.pods.map(p=>pad(p.name,14)+pad(p.status==='Running'?'1/1':'0/1',7)+pad(p.status==='Creating'?'ContainerCreating':p.status,19)+pad(p.restarts,10)+p.age+'m'))).join('\n')];
  if(v==='get'&&/^deploy/.test(res))return[[pad('NAME',8)+pad('READY',8)+'UTIL'].concat(Object.values(G.svc).map(s=>pad(s.name,8)+pad(s.pods.filter(p=>p.status==='Running').length+'/'+s.replicas,8)+Math.round(s.util*100)+'%')).join('\n')];
  if(v==='top')return[[pad('NAME',14)+pad('CPU',7)+'MEM'].concat(Object.values(G.svc).flatMap(s=>s.pods.filter(p=>p.status==='Running').map(p=>pad(p.name,14)+pad(Math.min(100,Math.round(s.util*100))+'%',7)+Math.round(p.mem)+'%'))).join('\n')];
  const pn=/^po/.test(res)?a[3]:a[2];
  if(v==='logs'){const[s,p]=bFind(pn);if(!p)return[`pods "${pn||''}" not found`,'e'];if(p.fault)return[`panic: env ${s.name==='auth'?'JWT_SIGNING_KEY':'DATABASE_URL'} is empty`,'e'];if(p.oom&&p.age<15)return['WARN heap 97%\n(previous container: OOMKilled, exit 137)','e'];return[`GET /healthz 200 2ms\nheap usage ${Math.round(p.mem)}%`]}
  if(v==='describe'){const[s,p]=bFind(pn);if(!p)return[`pods "${pn||''}" not found`,'e'];return[`Name: ${p.name}\nStatus: ${p.status}\nRestarts: ${p.restarts}\nMemory: ${Math.round(p.mem)}% of limit\nEvents: ${p.fault?'BackOff restarting failed container':p.oom?'OOMKilling':'Started'}`]}
  if(v==='delete'){const e=bDel(pn,'t');return e?[e,'e']:[`pod "${pn}" deleted`,'g']}
  if(v==='scale'){let t=a[2]||'';if(t.includes('/'))t=t.split('/')[1];else if(/^deploy/.test(t))t=a[3]||'';const m=line.match(/--replicas[=\s]+(\d+)/);if(!m)return['укажи --replicas=N','e'];const e=bScale(t,+m[1],'t');return e?[e,'e']:[`deployment.apps/${t} scaled`,'g']}
  return['Доступно: get pods, get deploy, top pods, logs, describe, delete pod, scale','e']}
export function bRender(){
  $('#bClock').textContent=bClockStr();const pct=Math.min(100,G.t/DUR*100);$('#bGoal').style.width=pct+'%';$('#bGoalTxt').textContent=Math.round(pct)+'%';
  $('#bRps').textContent=G.rps+' rps';const sp=G.success*100;$('#bSucc').textContent=(sp>=99.95?'100':sp.toFixed(1))+'%';$('#bSucc').style.color=G.success<.99?'var(--bad)':'';
  $('#bLat').textContent=G.lat+' ms';$('#bBud').textContent=Math.max(0,G.budget).toFixed(0)+'%';$('#bBud').style.color=G.budget<40?'var(--bad)':'';$('#bCred').textContent=G.credits.toFixed(0);$('#bCred').style.color=G.credits<30?'var(--bad)':'';
  $('#bPager').hidden=!G.paging;if(G.paging){const w=Object.values(G.svc).sort((a,b)=>b.util-a.util)[0];$('#bPagerTxt').textContent=`PAGER · успешность ${sp.toFixed(1)}% · горячее всего: ${w.name} (util ${Math.round(Math.min(w.util,9.99)*100)}%)`}
  const box=$('#bSvcs');for(const s of Object.values(G.svc)){let el=box.querySelector(`[data-s="${s.name}"]`);
    if(!el){el=document.createElement('div');el.className='svc';el.dataset.s=s.name;el.innerHTML=`<header><h4>${s.name}</h4><small>${CFG[s.name].desc}</small><span></span></header><div class="util">util<div class="ub"><div></div></div><b></b></div><div class="pods"></div>`;box.append(el)}
    const run=s.pods.filter(p=>p.status==='Running').length;el.querySelector('header span').textContent=`${run}/${s.replicas}`+(s.name==='worker'?` · очередь ${Math.round(s.queue)}`:'');
    el.classList.toggle('hot',s.util>1||!run);const ub=el.querySelector('.ub div');ub.style.width=Math.min(100,s.util*100)+'%';ub.style.background=s.util>1?'var(--bad)':s.util>.8?'var(--flame)':'var(--ok)';
    el.querySelector('.util b').textContent=(s.util>=9.9?'∞':Math.round(s.util*100))+'%';
    const pb=el.querySelector('.pods');pb.innerHTML='';for(const p of s.pods){const b=document.createElement('button');b.className='pod '+p.status;b.title=`${p.name} · ${p.status} · mem ${Math.round(p.mem)}%`;b.setAttribute('aria-label',b.title);b.innerHTML=`<span style="height:${Math.min(100,p.mem)}%"></span>`;
      b.onclick=()=>{document.querySelector('[data-bt="term"]').click();$('#bIn').value=`kubectl logs ${p.name}`;$('#bIn').focus()};pb.append(b)}}
}
