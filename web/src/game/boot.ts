// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { S, save, ensureDaily, heartsTick, $ } from './state';
import { duckSVG } from './duck';
import { show, renderHome } from './ui';

export let obGoal=30;
document.querySelectorAll('#goals button').forEach(b=>b.onclick=()=>{obGoal=+b.dataset.g;document.querySelectorAll('#goals button').forEach(x=>x.setAttribute('aria-pressed',x===b))});
$('#obGo').onclick=()=>{S.goal=obGoal;S.goalAt=0;S.onboarded=true;save();$('#onboard').hidden=true;renderHome()};
$('#obDuck').innerHTML=duckSVG('happy');
if(!S.rv2){S.review=(S.review||[]).map(x=>x.l==='l5'?{l:x.l,i:x.i+1}:x);S.rv2=true;save()}
ensureDaily();
heartsTick();
renderHome();
show('home');
if(!S.onboarded)$('#onboard').hidden=false;
setInterval(()=>{if(!$('#home').hidden){const h=S.hearts;heartsTick();if(S.hearts!==h)renderHome()}},30000);
