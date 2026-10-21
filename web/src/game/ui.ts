// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { HEART_MS, MAXH, TODAY, shift, daysBetween, S, HOOKS, save, ensureDaily, heartsTick, streakNow, addXP, QUESTS, RANKS, rankOf, TIERS, weekFrac, standings, ensureWeek, addReview, toast, $, esc, md, pick } from './state';
import { duckSVG, LINES } from './duck';
import { UNITS, LESSONS, unlocked, nextLesson } from './curriculum';
import { sh, complete } from './shell';
import { startBoss } from './boss';
import { runTests } from './worker';
/* screens */
export function show(id){['home','lesson','result','boss'].forEach(s=>document.getElementById(s).hidden=s!==id);window.scrollTo(0,0)}

export function renderHome(){
  heartsTick();ensureDaily();const st=streakNow();
  const cs=$('#cStreak');cs.querySelector('span').textContent=st;cs.classList.toggle('dim',st===0||S.daily.xp===0);
  $('#cXp span').textContent=S.xp;$('#cHearts span').textContent=S.hearts;
  const ri=rankOf(S.xp),cur=RANKS[ri],nx=RANKS[ri+1];$('#rankName').textContent=cur[1];
  $('#rankNext').textContent=nx?`до «${nx[1]}» ${nx[0]-S.xp} XP`:'максимум';$('#rankBar').style.width=nx?((S.xp-cur[0])/(nx[0]-cur[0])*100)+'%':'100%';
  $('#goalTxt').textContent=`${Math.min(S.daily.xp,S.goal)} / ${S.goal} XP`;$('#goalBar').style.width=Math.min(100,S.daily.xp/S.goal*100)+'%';
  const wk=$('#week');wk.innerHTML='';const names=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];for(let i=-6;i<=0;i++){const k=shift(TODAY(),i);const d=new Date(k+'T12:00:00');const el=document.createElement('div');el.innerHTML=`${names[d.getDay()]}<i class="${S.days.includes(k)?'on':''} ${i===0?'today':''}"></i>`;wk.append(el)}
  const q=$('#quests');q.innerHTML='';for(const x of QUESTS){const[a,b]=x.prog();const done=a>=b;const el=document.createElement('div');el.className='q'+(done?' done':'');el.innerHTML=`<div class="qh"><span style="color:inherit;font-weight:600"></span><span>${a}/${b}${done?' ✓':''}</span></div><div class="bar ok"><div style="width:${a/b*100}%"></div></div>`;el.querySelector('.qh span').textContent=x.text();q.append(el)}
  const rc=$('#reviewCard');rc.hidden=!S.review.length;
  if(S.review.length){rc.innerHTML=`<h3>Работа над ошибками</h3><p style="margin:0 0 12px;font-size:13.5px;color:var(--muted)">Вопросов, где ты ошибся: ${S.review.length}. Жизни здесь не тратятся.</p><button class="btn ok" id="revGo" style="width:100%">Повторить</button>`;$('#revGo').onclick=startReview}
  ensureWeek();const tier=S.league.tier,rows=(HOOKS.leagueRows&&HOOKS.leagueRows())||standings(S.league.week,tier,S.league.xp,weekFrac());const left=Math.max(1,7-Math.floor(weekFrac()*7));
  const z=(HOOKS.leagueZones&&HOOKS.leagueZones())||{up:tier<TIERS.length-1?3:0,down:tier>0?3:0};
  const ranked=rows.map((x,i)=>Object.assign({rank:i+1},x)),vis=ranked.slice(0,10);if(!vis.some(x=>x.me)){const mine=ranked.find(x=>x.me);if(mine)vis.push(mine)}
  $('#leagueCard').innerHTML=`<h3>Лига «${TIERS[tier]}»</h3><div class="lgsub">${z.up?`Топ-${z.up} поднимаются`:tier>=TIERS.length-1?'Высшая лига':'Пока в группе мало игроков'}${z.down?`, последние ${z.down} вылетают`:''} · ${left} ${plural(left,'день','дня','дней')} до конца</div><ol class="lg">${vis.map(x=>`<li class="${x.me?'me':''} ${x.rank<=z.up?'up':''} ${x.rank>ranked.length-z.down?'down':''}"><b>${x.rank}</b><span>${esc(x.name)}</span><em>${x.xp} XP</em></li>`).join('')}</ol>`;
  // duck mood
  let mood='ok',say;const nl=nextLesson();const gap=S.lastDay?daysBetween(S.lastDay,TODAY()):0;
  if(S.hearts===0){mood='worry';const m=Math.ceil((HEART_MS-(Date.now()-S.heartsAt))/60000);say=`Жизни кончились, как error budget в Чёрную пятницу. Новая через ${m} мин. Можно пока повторить пройденный урок.`}
  else if(S.lastDay&&gap>1){mood='angry';say=`Тебя не было ${gap} дн. Я пинговал тебя через liveness probe. Не ответил. Серия обнулилась. Начнём заново?`}
  else if(st>0&&S.daily.xp===0){mood='worry';say=`Серия ${st} дн. сгорит в полночь. Один урок, пять минут. Прод сам себя не поднимет.`}
  else if(S.league.lastResult&&!S.league.lastResult.seen){const lr=S.league.lastResult;lr.seen=true;save();const tn=TIERS[S.league.tier];mood=lr.d>0?'happy':lr.d<0?'angry':'ok';
    say=lr.d>0?`Неделя закрыта: ${lr.rank}-е место. Ты в лиге «${tn}». Утка гордится, но виду не подаёт.`:lr.d<0?`Неделя закрыта: ${lr.rank}-е место. Вылет в лигу «${tn}». Пока ты отдыхал, yaml_yana деплоила.`:`Неделя закрыта: ${lr.rank}-е место. Остаёшься в лиге «${tn}». Можно лучше.`}
  else if(S.review.length>=3){mood='worry';say=`У тебя ${S.review.length} вопросов в работе над ошибками. Это как техдолг, только твой личный. Разберём?`}
  else if(S.daily.xp>=S.goal){mood='happy';say=nl?`Дневная цель есть. Можешь идти спать. Но пейджер я не выключу. Следующий урок: «${LESSONS[nl].title}».`:'Ты прошёл всё, что есть. Новые юниты скоро. Я слежу.'}
  else if(!S.xp){say='Привет. Прод стоит. Пока что. Давай научу тебя его держать. Жми на первый урок.'}
  else say=nl?`Сегодня по плану: «${LESSONS[nl].title}». До цели ${Math.max(0,S.goal-S.daily.xp)} XP.`:'Всё пройдено. Повтори любой урок, чтобы сохранить серию.';
  $('#homeDuck').innerHTML=duckSVG(mood);$('#duckSay').textContent=say;
  // path
  const P=$('#path');P.innerHTML='';const offs=[0,56,84,56,0,-56,-84,-56];let k=0;
  for(const u of UNITS){
    const doneN=u.lessons.filter(l=>S.done[l]).length;const uLocked=u.soon||!unlocked(u.lessons[0]);
    const sec=document.createElement('section');sec.className='unit'+(uLocked?' locked':'');sec.style.setProperty('--uc',u.c);
    sec.innerHTML=`<div class="uhead" style="background:${u.c}"><div><small>Юнит ${u.n}</small><h2></h2><p></p></div><span class="cnt">${u.soon?'скоро':doneN+'/'+u.lessons.length}</span></div><div class="nodes"></div>`;
    sec.querySelector('h2').textContent=u.title;sec.querySelector('p').textContent=u.sub;
    const nodes=sec.querySelector('.nodes');
    if(u.soon){const n=document.createElement('div');n.className='node locked';n.innerHTML=`<button class="nbtn" disabled aria-label="Скоро"><svg><use href="#i-lock"/></svg></button><span class="nlabel">Утка уже пишет уроки</span>`;nodes.append(n)}
    for(const id of u.lessons){const L=LESSONS[id];const done=!!S.done[id],open=unlocked(id),cur=id===nl;
      const n=document.createElement('div');n.className='node'+(done?' done':'')+(open?'':' locked')+(cur?' cur':'')+(L.boss?' boss':'');n.style.transform=`translateX(${offs[k++%8]}px)`;
      n.innerHTML=`${cur?'<span class="start">Начать</span>':''}<button class="nbtn" ${open?'':'disabled'} aria-label="${esc(L.title)}"><svg><use href="#${L.boss?'i-pager':done?'i-check':open?(id==='l1'?'i-play':'i-term'):'i-lock'}"/></svg></button><span class="nlabel"></span>`;
      n.querySelector('.nlabel').textContent=L.title+(done?'':` · ${L.xp} XP`);
      if(open)n.querySelector('.nbtn').onclick=()=>startLesson(id);nodes.append(n)}
    P.append(sec)}
}

/* lesson runner */
export let R=null;
export function startLesson(id){
  heartsTick();const L=LESSONS[id];
  if(S.hearts===0&&!S.done[id]&&!HOOKS.unlockAll){toast('Жизни кончились. Повтори пройденный урок или подожди.');return}
  if(L.boss){startBoss();return}
  R={id,L,steps:L.steps.map((s,i)=>Object.assign({},s,{__i:i})),i:0,mistakes:0,combo:0,bestCombo:0,t0:Date.now(),W:L.setup?L.setup():null,replay:!!S.done[id],stepStart:0,cmds:[],hist:[],hi:0,checked:false,firstTry:true,total:L.steps.length};
  show('lesson');renderStep();
}
export function startReview(){const items=S.review.slice(0,8);if(!items.length)return;
  const steps=items.map(x=>Object.assign({},LESSONS[x.l].steps[x.i],{__rv:x.l+':'+x.i,order:null}));
  R={id:'review',L:{title:'Работа над ошибками',xp:10},steps,i:0,mistakes:0,combo:0,bestCombo:0,t0:Date.now(),W:null,review:true,replay:false,cmds:[],hist:[],hi:0,checked:false,firstTry:true,total:steps.length};
  show('lesson');renderStep()}
export function setFoot(state,html,btnText,btnCls,hint){
  const f=$('#lFoot');f.className='lfoot'+(state?' '+state:'');$('#lMsg').innerHTML=html||'';
  const b=$('#lMain');b.textContent=btnText;b.className='btn'+(btnCls?' '+btnCls:'');b.disabled=false;$('#lHint').hidden=!hint;
}
export function renderStep(){
  const s=R.steps[R.i],B=$('#lBody');R.checked=false;R.cmds=[];R.keyH=null;
  $('#lProg').style.width=(Math.min(R.i,R.total)/R.total*100)+'%';$('#lHearts span').textContent=S.hearts;$('#lCombo').textContent=R.combo>=3?`×${R.combo} подряд`:'';
  const kinds={learn:'Теория',quiz:'Вопрос',task:'Практика в терминале',script:'Код',edit:'Конфиг'};
  B.innerHTML=`<span class="kind">${kinds[s.t]}${s.retry?' · повтор':''}</span>`;
  if(s.t==='learn'){const d=document.createElement('div');d.className='learn';d.innerHTML=`${duckSVG('ok')}<div style="display:flex;flex-direction:column;gap:10px"><h2>${md(s.h)}</h2><p>${md(s.p)}</p></div>`;B.append(d);setFoot('','','Дальше');$('#lMain').onclick=next;return}
  const h=document.createElement('h2');h.innerHTML=md(s.h);B.append(h);
  if(s.p){const p=document.createElement('p');p.innerHTML=md(s.p).replace(/\n/g,'<br>');B.append(p)}
  if(s.t==='quiz'){
    const order=s.order||(s.order=s.o.map((_,i)=>i).sort(()=>Math.random()-.5));let sel=null;
    const box=document.createElement('div');box.className='opts';
    order.forEach((oi,n)=>{const b=document.createElement('button');b.className='opt';b.setAttribute('aria-pressed','false');b.innerHTML=`<kbd>${n+1}</kbd><span>${md(s.o[oi])}</span>`;b.dataset.oi=oi;
      b.onclick=()=>{if(R.checked)return;sel=oi;box.querySelectorAll('.opt').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#lMain').disabled=false};box.append(b)});
    B.append(box);setFoot('','','Проверить');$('#lMain').disabled=true;
    $('#lMain').onclick=()=>{if(sel===null)return;R.checked=true;const ok=sel===s.a;
      box.querySelectorAll('.opt').forEach(x=>{if(+x.dataset.oi===s.a)x.classList.add('right');else if(+x.dataset.oi===sel)x.classList.add('wrong')});
      if(ok)good(s.ex);else bad(`Правильно: ${s.o[s.a]}. ${s.ex}`,s)};
    R.keyH=e=>{if(R.checked||!/^[1-4]$/.test(e.key)||/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName))return;box.children[+e.key-1]?.click()};
  }
  if(s.t==='task'){
    const t=document.createElement('div');t.className='term';t.innerHTML=`<div class="tout" id="tOut"></div><label class="tin" for="tIn"><b></b><input id="tIn" autocomplete="off" spellcheck="false" autocapitalize="off"></label>`;B.append(t);
    const O=t.querySelector('#tOut'),I=t.querySelector('#tIn'),pr=t.querySelector('b');const prompt=()=>pr.textContent=`dev@prod-web-01:${R.W.cwd.replace('/home/dev','~')}$`;prompt();
    for(const x of R.hist.slice(-30))line(O,x.text,x.cls);
    if(!R.hist.length)line(O,'Введи команду и нажми Enter. help — список команд.','d');
    I.onkeydown=e=>{
      if(e.key==='Enter'){const v=I.value.trim();I.value='';if(!v)return;const ps=pr.textContent+' '+v;line(O,ps,'c');R.hist.push({text:ps,cls:'c'});
        const res=sh(R.W,v);R.W.hist.push(v);R.cmds.push(v);R.hi=R.W.hist.length;ensureDaily();S.daily.cmds++;save();
        if(res.clear){O.innerHTML='';R.hist=[]}else if(res.out){line(O,res.out,res.cls);R.hist.push({text:res.out,cls:res.cls})}prompt();
        if(!R.checked&&s.check(R.W,R.cmds)){R.checked=true;good(s.done||'Готово. Так и делают на реальных серверах.')}}
      else if(e.key==='ArrowUp'){if(R.hi>0){R.hi--;I.value=R.W.hist[R.hi]}e.preventDefault()}
      else if(e.key==='ArrowDown'){if(R.hi<R.W.hist.length-1){R.hi++;I.value=R.W.hist[R.hi]}else{R.hi=R.W.hist.length;I.value=''}e.preventDefault()}
      else if(e.key==='Tab'){e.preventDefault();const c=complete(R.W,I.value);if(c.val!=null)I.value=c.val;else if(c.list)line(O,c.list,'d')}};
    setFoot('','<span style="color:var(--muted)">Выполни задание в терминале, проверка автоматическая.</span>','Пропустить','ghost',true);
    $('#lMain').onclick=()=>{R.checked=true;R.mistakes++;R.combo=0;setFoot('bad',`${duckSVG('worry','duckmini')}<div><b>Пропущено</b><span>Решение: <code>${esc(s.hint)}</code></span></div>`,'Дальше','bad');$('#lMain').onclick=next};
    $('#lHint').onclick=()=>{line(O,'Подсказка утки: '+s.hint,'d');R.hist.push({text:'Подсказка утки: '+s.hint,cls:'d'});R.firstTry=false};
    setTimeout(()=>I.focus({preventScroll:true}),50);
  }
  if(s.t==='edit'){
    const fn=document.createElement('div');fn.className='fname';fn.textContent=s.file;
    const ta=document.createElement('textarea');ta.className='code';ta.spellcheck=false;ta.value=s.code!=null?s.code:(s.path&&R.W?R.W.files[s.path]:s.starter);
    ta.onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();ta.setRangeText('  ',ta.selectionStart,ta.selectionEnd,'end')}};ta.oninput=()=>s.code=ta.value;
    const ts=document.createElement('div');ts.className='tests';ts.innerHTML=s.checks.map(c=>`<div><span>○</span><small>${esc(c.name)}</small></div>`).join('');B.append(fn,ta,ts);
    setFoot('','<span style="color:var(--muted)">Отредактируй файл и нажми «Проверить».</span>','Проверить','',!!s.hint);
    $('#lHint').onclick=()=>{if(B.querySelector('.hintp'))return;const h=document.createElement('div');h.className='hintp';h.innerHTML='Подсказка утки: '+md(s.hint).replace(/\n/g,'<br>');B.insertBefore(h,fn);R.firstTry=false};
    $('#lMain').onclick=()=>{const txt=ta.value;let all=true;ts.innerHTML='';
      for(const c of s.checks){let ok=false;try{ok=c.test(txt)}catch(_){}all=all&&ok;const d=document.createElement('div');d.innerHTML=`<span class="${ok?'p':'f'}">${ok?'✓':'✕'}</span><small></small>`;d.querySelector('small').textContent=c.name;ts.append(d)}
      if(all){if(s.path&&R.W){R.W.files[s.path]=txt;if(s.onSave)s.onSave(R.W)}R.checked=true;good(s.done||'Конфиг в порядке.')}
      else{R.firstTry=false;$('#lFoot').className='lfoot bad';$('#lMsg').innerHTML=`${duckSVG('worry','duckmini')}<div><b>Пока не всё</b><span>Смотри на красные пункты. Жизни здесь не тратятся.</span></div>`}};
  }
  if(s.t==='script'){
    const ta=document.createElement('textarea');ta.className='code';ta.spellcheck=false;ta.value=s.code||s.starter;ta.id='scriptIn';
    ta.onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();ta.setRangeText('  ',ta.selectionStart,ta.selectionEnd,'end')}};ta.oninput=()=>s.code=ta.value;
    const ts=document.createElement('div');ts.className='tests';ts.innerHTML=s.cases.map(c=>`<div><span>○</span><small>${esc(c.name)}</small></div>`).join('');B.append(ta,ts);
    setFoot('','<span style="color:var(--muted)">Код запускается на тестовых ситуациях кластера.</span>','Проверить');
    $('#lMain').onclick=async()=>{const b=$('#lMain');b.disabled=true;b.textContent='Проверяю…';const res=await runTests(ta.value,s.cases);b.disabled=false;b.textContent='Проверить';
      if(res.err){ts.innerHTML=`<div><span class="f">✕</span><small>${esc(res.err)}</small></div>`;R.firstTry=false;return}
      let all=true;ts.innerHTML='';res.res.forEach((r,i)=>{const ok=!r.err&&s.cases[i].expect(r.calls);all=all&&ok;const d=document.createElement('div');
        d.innerHTML=`<span class="${ok?'p':'f'}">${ok?'✓':'✕'}</span><small></small>`;d.querySelector('small').textContent=s.cases[i].name+(ok?'':r.err?` — ошибка: ${r.err}`:` — вызовы: ${r.calls.map(c=>c.t==='scale'?`scale('${c.n}', ${c.r})`:`restart('${c.p}')`).join(', ')||'нет'}`);ts.append(d)});
      if(all){S.code=(S.code&&!S.code.includes(ta.value)?S.code+'\n\n':'')+`// ${R.L.title}\n`+ta.value;save();R.checked=true;good('Все тесты зелёные. Этот код пригодится на боевом дежурстве, он уже там.')}else{R.firstTry=false;$('#lFoot').className='lfoot bad';$('#lMsg').innerHTML=`${duckSVG('worry','duckmini')}<div><b>Тесты не прошли</b><span>Поправь код и проверь снова. Жизни за это не снимаются.</span></div>`}};
  }
}
export function line(O,text,cls){const d=document.createElement('div');if(cls)d.className=cls;d.textContent=text;O.append(d);O.scrollTop=O.scrollHeight}
export function good(ex){const cs=R.steps[R.i];if(R.review&&cs&&cs.__rv){S.review=S.review.filter(x=>x.l+':'+x.i!==cs.__rv);save()}R.combo++;R.bestCombo=Math.max(R.bestCombo,R.combo);$('#lCombo').textContent=R.combo>=3?`×${R.combo} подряд`:'';
  setFoot('ok',`${duckSVG('happy','duckmini')}<div><b>${pick(LINES.ok)}</b><span>${md(ex||'')}</span></div>`,'Дальше','ok');$('#lMain').onclick=next;setTimeout(()=>$('#lMain').focus({preventScroll:true}),0)}
export function bad(ex,s){R.mistakes++;R.combo=0;if(!R.review&&s.__i!=null)addReview(R.id,s.__i);if(!R.replay&&!R.review&&!HOOKS.unlockAll){S.hearts=Math.max(0,S.hearts-1);if(S.hearts===MAXH-1)S.heartsAt=Date.now();save()}$('#lHearts span').textContent=S.hearts;
  R.steps.push(Object.assign({},s,{retry:true,order:null}));
  setFoot('bad',`${duckSVG('angry','duckmini')}<div><b>${pick(LINES.bad)}</b><span>${md(ex)}</span></div>`,'Понятно','bad');
  $('#lMain').onclick=()=>{if(S.hearts===0&&!R.replay&&!R.review){outOfHearts();return}next()}}
export function next(){R.i++;if(R.i>=R.steps.length)finishLesson();else renderStep()}
document.addEventListener('keydown',e=>{if($('#lesson').hidden)return;if(R&&R.keyH)R.keyH(e);if(e.key==='Enter'&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='TEXTAREA'&&!$('#lMain').disabled&&document.activeElement!==$('#lMain')){e.preventDefault();$('#lMain').click()}});
$('#lClose').onclick=()=>{R=null;renderHome();show('home')};

export function outOfHearts(){show('result');const m=Math.ceil((HEART_MS-(Date.now()-S.heartsAt))/60000);
  $('#resBody').parentElement.className='';$('#resBody').className='result fail';
  $('#resBody').innerHTML=`${duckSVG('worry')}<h1>Жизни кончились</h1><p>Как error budget в Чёрную пятницу. Новая жизнь через ${m} мин. Пройденные уроки можно повторять без жизней, и это тоже продлевает серию.</p><button class="btn" id="resGo">На карту</button>`;
  $('#resBody .duck').style.width='140px';$('#resGo').onclick=()=>{renderHome();show('home')}}

export function finishLesson(extra){
  const L=R?R.L:LESSONS.l13;const id=R?R.id:'l13';const replay=R?R.replay:!!S.done.l13;const isReview=!!(R&&R.review);
  const perfect=R?R.mistakes===0&&R.firstTry:true;const before=rankOf(S.xp);ensureDaily();const goalBefore=S.daily.xp>=S.goal;const streakBefore=streakNow();const wasToday=S.lastDay===TODAY();
  let xp=isReview?L.xp:replay?Math.ceil(L.xp/2):L.xp;if(perfect)xp+=5;if(R&&R.bestCombo>=5)xp+=5;
  if(!isReview)S.done[id]=true;if(perfect){S.daily.perfect=true}addXP(xp);
  const acc=R?Math.round((R.total/(R.total+R.mistakes))*100):100;const secs=R?Math.round((Date.now()-R.t0)/1000):extra.secs;
  show('result');const B=$('#resBody');B.className='result';
  const tiles=`<div class="tiles"><div class="tile"><small>Опыт</small><b>+${xp}</b></div><div class="tile" style="--tc:var(--ok)"><small>Точность</small><b>${acc}%</b></div><div class="tile" style="--tc:var(--u3)"><small>Время</small><b>${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}</b></div></div>`;
  let banners='';
  if(!wasToday)banners+=`<div class="banner"><svg><use href="#i-flame"/></svg><div><b>Серия: ${streakNow()} ${plural(streakNow(),'день','дня','дней')}</b>${streakBefore>0?'Не дай ей погаснуть завтра.':'Начало положено. Приходи завтра, утка проверит.'}</div></div>`;
  if(!goalBefore&&S.daily.xp>=S.goal)banners+=`<div class="banner"><svg><use href="#i-chest"/></svg><div><b>Дневная цель выполнена</b>${S.daily.xp} из ${S.goal} XP. Можно и больше.</div></div>`;
  if(rankOf(S.xp)>before)banners+=`<div class="banner"><svg><use href="#i-bolt"/></svg><div><b>Новый ранг: ${RANKS[rankOf(S.xp)][1]}</b>Можно смело менять строчку в резюме. Почти.</div></div>`;
  const title=isReview?'Ошибки разобраны':L.boss?'Смена закрыта':perfect?'Без единой ошибки':'Урок пройден';
  B.innerHTML=`${duckSVG('happy')}<h1>${title}</h1><p style="margin:0;color:var(--muted)">${esc(L.title)}${replay?' · повтор, половина опыта':''}${perfect?' · +5 XP за чистое прохождение':''}</p>${tiles}${banners}<button class="btn" id="resGo">Продолжить</button>`;
  B.querySelector('.duck').style.width='140px';$('#resGo').onclick=()=>{R=null;renderHome();show('home')};$('#resGo').focus();
}
export function finishBoss(x){R=null;finishLesson(x)}
export const plural=(n,a,b,c)=>{const m=n%10,h=n%100;return m===1&&h!==11?a:m>=2&&m<=4&&(h<12||h>14)?b:c};
