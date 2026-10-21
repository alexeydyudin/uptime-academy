// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { S, save, ensureDaily, heartsTick, $ } from './state';
import { duckSVG } from './duck';
import { show, renderHome } from './ui';
/* onboarding & boot */
export let obGoal=30;
document.querySelectorAll('#goals button').forEach(b=>b.onclick=()=>{obGoal=+b.dataset.g;document.querySelectorAll('#goals button').forEach(x=>x.setAttribute('aria-pressed',x===b))});
$('#obGo').onclick=()=>{S.goal=obGoal;S.goalAt=0;S.onboarded=true;save();$('#onboard').hidden=true;renderHome()};
$('#obDuck').innerHTML=duckSVG('happy');
ensureDaily();heartsTick();renderHome();show('home');
if(!S.onboarded)$('#onboard').hidden=false;
setInterval(()=>{if(!$('#home').hidden){const h=S.hearts;heartsTick();if(S.hearts!==h)renderHome()}},30000);
