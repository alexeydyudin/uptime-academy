// @ts-nocheck — код игрока выполняется здесь, изолированно от страницы
let fn=null,state={};
function mk(d,calls,logs){const sv=d.services;return{time:d.time||'20:00',minute:d.minute||0,rps:d.rps||300,success:d.success==null?1:d.success,credits:d.credits||100,budget:d.budget||100,services:sv,service:n=>sv.find(s=>s.name===n)||null,scale:(n,r)=>{calls.push({t:'scale',n,r:Math.round(+r)})},restart:p=>{calls.push({t:'restart',p:String(p)})}}}
onmessage=e=>{const m=e.data;
 if(m.type==='test'){let f;try{f=new Function('cluster','log','state','"use strict";\n'+m.code)}catch(err){postMessage({type:'test',err:'SyntaxError: '+err.message});return}
  postMessage({type:'test',res:m.cases.map(d=>{const calls=[],logs=[];try{f(mk(d,calls,logs),x=>logs.push(String(x)),{});return{calls,logs}}catch(err){return{calls,logs,err:err.message}}})});return}
 if(m.type==='load'){try{fn=new Function('cluster','log','state','"use strict";\n'+m.code);state={};postMessage({type:'loaded'})}catch(err){postMessage({type:'loaded',err:'SyntaxError: '+err.message})}return}
 if(m.type==='tick'&&fn){const calls=[],logs=[];try{fn(mk(m.snap,calls,logs),x=>logs.push(typeof x==='string'?x:JSON.stringify(x)),state);postMessage({type:'tick',calls,logs})}catch(err){postMessage({type:'tick',calls,logs,err:err.message})}}};
