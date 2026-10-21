// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга

/* duck */
export function duckSVG(mood='ok',cls='duck'){
  const brow={ok:'',worry:'<path d="M30 24 l14 -4" stroke="#3a2a00" stroke-width="3" stroke-linecap="round"/>',angry:'<path d="M30 20 l15 7" stroke="#3a2a00" stroke-width="3.4" stroke-linecap="round"/>',happy:''}[mood];
  const eye=mood==='happy'?'<path d="M33 32 q5 -6 10 0" fill="none" stroke="#1b1b1b" stroke-width="3" stroke-linecap="round"/>':'<circle cx="38" cy="32" r="4.6" fill="#1b1b1b"/><circle cx="39.6" cy="30.4" r="1.5" fill="#fff"/>';
  return `<svg class="${cls}" viewBox="0 0 120 104" aria-hidden="true">
  <ellipse cx="64" cy="98" rx="40" ry="4" fill="rgba(0,0,0,.12)"/>
  <path d="M100 62 q18 -10 14 -26 q-6 14 -20 16z" fill="#e8ab14"/>
  <ellipse cx="64" cy="72" rx="44" ry="25" fill="#f7c234"/>
  <path d="M46 70 q16 18 40 6" fill="none" stroke="#e8ab14" stroke-width="4" stroke-linecap="round"/>
  <circle cx="42" cy="36" r="24" fill="#f7c234"/>
  <path d="M19 40 q-16 0 -17 7 q13 7 25 0z" fill="#f2851f"/><path d="M2 47 q12 3 25 -1" fill="none" stroke="#c9640e" stroke-width="2"/>
  ${eye}${brow}
  <path d="M20 26 a24 24 0 0 1 44 -2" fill="none" stroke="#2f3a4f" stroke-width="4"/>
  <rect x="58" y="22" width="9" height="14" rx="4" fill="#2f3a4f"/>
  <path d="M63 36 q2 10 -12 12" fill="none" stroke="#2f3a4f" stroke-width="2.5"/><circle cx="50" cy="48" r="3" fill="#2f3a4f"/>
  </svg>`;
}
export const LINES={
  ok:['Красиво. Как зелёный пайплайн в пятницу.','Принято. Даже ревьюер не придрался бы.','Вот это uptime мышления.','Работает. Не трогай.','Senior бы одобрил. Молча, но одобрил.'],
  bad:['Мимо. В проде так не делай.','Бывает. Главное, что не в 3 ночи.','Почти. Как деплой без тестов: почти работает.','Неверно. Утка разочарована, но верит в тебя.'],
};
