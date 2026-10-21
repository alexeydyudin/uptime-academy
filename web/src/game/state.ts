// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга

/* storage & meta */
export const KEY='uptime-academy-v1', HEART_MS=20*60*1000, MAXH=5;
export const dkey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
export const TODAY=()=>dkey(new Date());
export const shift=(k,n)=>{const d=new Date(k+'T12:00:00');d.setDate(d.getDate()+n);return dkey(d)};
export const daysBetween=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);
export function fresh(){return{onboarded:false,goal:30,xp:0,streak:0,best:0,lastDay:null,days:[],hearts:MAXH,heartsAt:Date.now(),done:{},code:null,review:[],league:{tier:0,week:null,xp:0,lastResult:null},daily:{date:TODAY(),xp:0,cmds:0,perfect:false,claimed:{}}}}
export let S;try{S=Object.assign(fresh(),JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(_){S=fresh()}
/** Точки подключения сетевого слоя (src/net). Без аккаунта игра работает полностью локально. */
export interface GameHooks {
  save: ((s: unknown) => void)[];
  xp: ((amount: number) => void)[];
  leagueRows: null | (() => { name: string; xp: number; me?: boolean }[] | null);
  leagueZones: null | (() => { up: number; down: number } | null);
}
export const HOOKS: GameHooks = { save: [], xp: [], leagueRows: null, leagueZones: null };
export const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(_){}HOOKS.save.forEach(f=>{try{f(S)}catch(_){}})};
export function ensureDaily(){if(S.daily.date!==TODAY())S.daily={date:TODAY(),xp:0,cmds:0,perfect:false,claimed:{}}}
export function heartsTick(){if(S.hearts<MAXH){const n=Math.floor((Date.now()-S.heartsAt)/HEART_MS);if(n>0){S.hearts=Math.min(MAXH,S.hearts+n);S.heartsAt+=n*HEART_MS;save()}}}
export function streakNow(){if(!S.lastDay)return 0;const g=daysBetween(S.lastDay,TODAY());return g<=1?S.streak:0}
export function addXP(n,silent){
  ensureDaily();ensureWeek();S.xp+=n;S.daily.xp+=n;S.league.xp+=n;HOOKS.xp.forEach(f=>{try{f(n)}catch(_){}});
  const t=TODAY();
  if(S.lastDay!==t){S.streak=(S.lastDay&&daysBetween(S.lastDay,t)===1)?S.streak+1:1;S.lastDay=t;if(!S.days.includes(t))S.days.push(t);S.days=S.days.slice(-60);S.best=Math.max(S.best,S.streak)}
  save();if(!silent)checkQuests();
}
export const QUESTS=[
  {id:'goal',text:()=>`Набери ${S.goal} XP`,prog:()=>[Math.min(S.daily.xp,S.goal),S.goal]},
  {id:'perfect',text:()=>'Пройди урок без ошибок',prog:()=>[S.daily.perfect?1:0,1]},
  {id:'cmds',text:()=>'Выполни 15 команд в терминале',prog:()=>[Math.min(S.daily.cmds,15),15]},
];
export function checkQuests(){ensureDaily();for(const q of QUESTS){const[a,b]=q.prog();if(a>=b&&!S.daily.claimed[q.id]){S.daily.claimed[q.id]=true;addXP(10,true);toast(`Квест «${q.text()}» выполнен · +10 XP`)}}save()}
export const RANKS=[[0,'Стажёр'],[50,'Junior DevOps'],[130,'Middle DevOps'],[230,'Senior DevOps'],[340,'SRE'],[480,'Principal SRE']];
export const rankOf=xp=>{let i=0;RANKS.forEach((r,j)=>{if(xp>=r[0])i=j});return i};
/* leagues: локально — боты, с сервером — HOOKS.leagueRows */
export const TIERS=['Бронза','Серебро','Золото','Сапфир','Рубин','Алмаз'];
export const BOTS=['k8s_kirill','yaml_yana','pod_petrov','helm_hanna','grep_gosha','sudo_sasha','oncall_olya','cron_kostya','nginx_nina','terraform_tim','docker_dana','ansible_artur','prom_polina','git_gleb','vault_vera','redis_roma','kafka_katya','ci_ilya'];
export const weekKey=()=>{const d=new Date();return shift(TODAY(),-((d.getDay()+6)%7))};
export const weekFrac=()=>Math.min(1,Math.max(0,(Date.now()-new Date(weekKey()+'T00:00:00'))/(7*864e5)));
export function seeded(seed){let h=1779033703^seed.length;for(let i=0;i<seed.length;i++){h=Math.imul(h^seed.charCodeAt(i),3432918353);h=h<<13|h>>>19}return()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return((h^=h>>>16)>>>0)/4294967296}}
export function standings(wk,tier,myXp,f){const r=seeded(wk+':'+tier),names=BOTS.slice();for(let i=names.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[names[i],names[j]]=[names[j],names[i]]}
  const base=[60,100,150,220,300,400][tier];const rows=names.slice(0,9).map(n=>{const tgt=base*(.4+r()*1.4),pace=.7+r()*.6;return{name:n,xp:Math.round(tgt*Math.min(1,f*pace))}});
  rows.push({name:'ты',xp:myXp,me:true});return rows.sort((a,b)=>b.xp-a.xp||(a.me?-1:b.me?1:0))}
export function ensureWeek(){const wk=weekKey();if(S.league.week===wk)return;if(HOOKS.leagueRows){S.league.week=wk;S.league.xp=0;save();return}
  if(S.league.week){const rows=standings(S.league.week,S.league.tier,S.league.xp,1);const me=rows.findIndex(x=>x.me)+1;let d=0;
    if(S.league.xp>0&&me<=3&&S.league.tier<TIERS.length-1)d=1;else if(me>=8&&S.league.tier>0)d=-1;S.league.tier+=d;S.league.lastResult={rank:me,d,seen:false}}
  S.league.week=wk;S.league.xp=0;save()}
/* работа над ошибками */
export function addReview(lid,i){if(!S.review.some(x=>x.l===lid&&x.i===i)){S.review.push({l:lid,i});S.review=S.review.slice(-30);save()}}
export let toastT;export function toast(m){const t=document.getElementById('toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2600)}
export const $=s=>document.querySelector(s);
export const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const md=s=>esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
export const pick=a=>a[Math.floor(Math.random()*a.length)];
