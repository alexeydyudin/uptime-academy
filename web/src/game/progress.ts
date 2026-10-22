// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { S, HOOKS } from './state';
import { UNITS } from '../content/units';

export const ORDER=UNITS.flatMap(u=>u.lessons);
export const unitOf=id=>UNITS.find(u=>u.lessons.includes(id));
export const unlocked=id=>{if(HOOKS.unlockAll||S.done[id])return true;const i=ORDER.indexOf(id);return i===0||S.done[ORDER[i-1]]};
export const nextLesson=()=>ORDER.find(id=>!S.done[id]);
