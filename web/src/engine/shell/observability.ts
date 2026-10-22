// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { pad } from './util';

export function promq(W,line,err,r){if(!W.prom)return err('query: Prometheus в этом уроке не подключён');const e=line.trim().slice(5).trim().replace(/^['"]|['"]$/g,''),x=e.replace(/\s+/g,'');const row=(l,v)=>pad(l,46)+v;
  if(!x)return err('Пример: query up');
  if(/^up(==0)?$/.test(x)){W.f.qup=true;r.out=[['api-0','shop',1],['api-1','shop',1],['api-2','shop',0],['db-0','postgres',1]].filter(t=>!x.includes('==0')||t[2]===0).map(t=>row(`up{instance="${t[0]}", job="${t[1]}"}`,t[2])).join('\n');return r}
  if(x.includes('histogram_quantile')){r.out=[row('{instance="api-0"}','0.084'),row('{instance="api-1"}','2.410')].join('\n');return r}
  if(x.includes('http_requests_total')){if(!x.includes('rate(')){r.out='http_requests_total — счётчик, он только растёт с момента старта.\nОберни его в rate(...[5m]), чтобы получить запросы в секунду.';r.cls='d';return r}
    const five=/status=~?["']5/.test(x);if(five)W.f.q5xx=true;if(x.includes('/')&&five){r.out=row('{}','0.0610');return r}
    const D=five?[['api-0','500',.02],['api-1','502',4.71],['api-1','500',1.08]]:[['api-0','200',47.6],['api-0','500',.02],['api-1','200',41.9],['api-1','502',4.71],['api-1','500',1.08]];
    if(/^sum/.test(x)){const by=x.match(/by\((\w+)\)/),k=by?by[1]:null,agg={};for(const d of D){const kk=k==='instance'?d[0]:k==='status'?d[1]:'';agg[kk]=(agg[kk]||0)+d[2]}r.out=Object.entries(agg).map(([kk,v])=>row(kk?`{${k}="${kk}"}`:'{}',v.toFixed(2))).join('\n');return r}
    r.out=D.map(d=>row(`{instance="${d[0]}", status="${d[1]}"}`,d[2])).join('\n');return r}
  return err('Нет такой метрики. Есть: up, http_requests_total{instance,status}, http_request_duration_seconds_bucket')}
