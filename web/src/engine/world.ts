// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
export const rid=()=>Math.random().toString(36).slice(2,7);
export const kPod=(app,status,restarts=0)=>({name:`${app}-7d9f-${rid()}`,app,status,restarts,age:status==='ContainerCreating'?0:42});
