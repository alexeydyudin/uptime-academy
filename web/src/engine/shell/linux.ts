// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
export function scriptOut(W,p){
  if(/healthcheck/.test(p)){const ok=W.svc.nginx&&W.svc.nginx.active;W.lastExit=ok?0:1;if(!ok)W.f.healthDown=true;return ok?{out:'OK: http://localhost/healthz отвечает',exit:0}:{out:'ERROR: http://localhost/healthz не отвечает',cls:'e',exit:1}}
  const L=[];for(const l of (W.files[p]||'').split('\n')){const m=l.match(/^\s*echo\s+["']?(.*?)["']?\s*$/);if(m)L.push(m[1])}return{out:L.join('\n'),exit:0}}
