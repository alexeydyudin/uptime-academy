// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { rp } from './util';

export function tfDesired(W){const t=W.files[W.tf.dir+'/main.tf']||'';return{web:(t.match(/instance_type\s*=\s*"([\w.]+)"/)||[])[1]||'?',bucket:/resource\s+"aws_s3_bucket"\s+"assets"/.test(t)}}
export function tfPlan(W){const d=tfDesired(W),s=W.tf.state,L=[];let add=0,chg=0;
  if(d.web!==s.web){chg++;L.push(`  # aws_instance.web will be updated in-place\n  ~ resource "aws_instance" "web" {\n        id            = "i-0a1b2c3d4e5f60789"\n      ~ instance_type = "${s.web}" -> "${d.web}"\n        tags          = { "Name" = "shop-web" }\n    }`)}
  if(d.bucket&&!s.bucket){add++;L.push(`  # aws_s3_bucket.assets will be created\n  + resource "aws_s3_bucket" "assets" {\n      + bucket = "uptime-shop-assets"\n      + id     = (known after apply)\n    }`)}
  return{add,chg,text:L.length?`Terraform will perform the following actions:\n\n${L.join('\n\n')}\n\nPlan: ${add} to add, ${chg} to change, 0 to destroy.`:'No changes. Your infrastructure matches the configuration.'}}
export function terraform(W,a,err,r){const T=W.tf,v=a[1];
  if(W.cwd!==T.dir)return err('Error: No configuration files\n\nВ этой папке нет .tf файлов. Перейди к коду инфраструктуры: cd ~/infra');
  if(v==='init'){T.inited=true;r.out='Initializing the backend...\nInitializing provider plugins...\n- Finding hashicorp/aws versions matching "~> 5.0"...\n- Installing hashicorp/aws v5.72.1...\n\nTerraform has been successfully initialized!';r.cls='g';return r}
  if(!T.inited)return err('Error: Required plugins are not installed\n│ Сначала выполни terraform init.');
  if(v==='fmt')return r;if(v==='validate'){r.out='Success! The configuration is valid.';r.cls='g';return r}
  if(v==='plan'){const p=tfPlan(W);W.f.tfPlan=(W.f.tfPlan||0)+1;r.out='aws_instance.web: Refreshing state... [id=i-0a1b2c3d4e5f60789]\n\n'+p.text;return r}
  if(v==='apply'){const p=tfPlan(W);if(!p.add&&!p.chg){r.out='No changes. Your infrastructure matches the configuration.\n\nApply complete! Resources: 0 added, 0 changed, 0 destroyed.';return r}
    if(a.includes('-auto-approve'))return tfApply(W,r);T.await=true;r.out=p.text+"\n\nDo you want to perform these actions?\n  Terraform will perform the actions described above.\n  Only 'yes' will be accepted to approve.\n\n  Enter a value: (введи yes)";return r}
  if(v==='state'&&a[2]==='list'){r.out='aws_instance.web'+(T.state.bucket?'\naws_s3_bucket.assets':'');return r}
  if(v==='destroy')return err('Утка заблокировала destroy на проде. И правильно сделала.');
  return err('terraform: в тренажёре есть init, plan, apply, validate, fmt, state list')}
export function tfApply(W,r){const p=tfPlan(W),d=tfDesired(W);W.tf.state={web:d.web,bucket:d.bucket||W.tf.state.bucket};W.f.tfApplied=true;
  r.out=(p.chg?'aws_instance.web: Modifying... [id=i-0a1b2c3d4e5f60789]\naws_instance.web: Modifications complete after 42s\n':'')+(p.add?'aws_s3_bucket.assets: Creating...\naws_s3_bucket.assets: Creation complete after 2s [id=uptime-shop-assets]\n':'')+`\nApply complete! Resources: ${p.add} added, ${p.chg} changed, 0 destroyed.`;r.cls='g';return r}
export function ansible(W,a,line,err,r){const inv=line.match(/-i\s+(\S+)/);
  if(!inv)return err('[WARNING]: No inventory was parsed, only implicit localhost is available\nУкажи инвентарь: -i inventory.ini');
  if(rp(W,inv[1])!==W.ans.dir+'/inventory.ini')return err(`[WARNING]: Unable to parse ${inv[1]} as an inventory source`);
  if(a[0]==='ansible'){if(!a.includes('-m'))return err('укажи модуль: ansible web -i inventory.ini -m ping');W.f.ansPing=true;r.out=['web-1','web-2'].map(h=>`${h} | SUCCESS => {\n    "changed": false,\n    "ping": "pong"\n}`).join('\n');r.cls='g';return r}
  const pb=a.slice(1).find(x=>/\.ya?ml$/.test(x));if(!pb)return err('ansible-playbook: укажи плейбук, например site.yml');const src=W.files[rp(W,pb)];if(src==null)return err(`ERROR! the playbook: ${pb} could not be found`);
  if(!/hosts:\s*web\s*$/m.test(src))return err('[WARNING]: Could not match supplied host pattern\nskipping: no hosts matched (в инвентаре есть группа web)');
  const check=a.includes('--check')||a.includes('-C');
  if(!/become:\s*(true|yes)\b/.test(src)){r.out='PLAY [web] *****\n\nTASK [Gathering Facts] *****\nok: [web-1]\nok: [web-2]\n\nTASK [Установить nginx] *****\nfatal: [web-1]: FAILED! => {"msg": "Failed to lock apt for exclusive operation"}\nfatal: [web-2]: FAILED! => {"msg": "Failed to lock apt for exclusive operation"}\n\nPLAY RECAP *****\nweb-1 : ok=1 changed=0 failed=1\nweb-2 : ok=1 changed=0 failed=1\n\n(ставить пакеты можно только от root: нужен become: true)';r.cls='e';return r}
  const chg=check||!W.ans.applied?2:0,st=chg?'changed':'ok';
  r.out=`PLAY [web] ${check?'(--check: ничего не меняем) ':''}*****\n\nTASK [Gathering Facts] *****\nok: [web-1]\nok: [web-2]\n\nTASK [Установить nginx] *****\n${st}: [web-1]\n${st}: [web-2]\n\nTASK [Запустить nginx и включить автозапуск] *****\n${st}: [web-1]\n${st}: [web-2]\n\nPLAY RECAP *****\nweb-1 : ok=3 changed=${chg} unreachable=0 failed=0\nweb-2 : ok=3 changed=${chg} unreachable=0 failed=0`;
  if(check)W.f.ansCheck=true;else{if(W.ans.applied)W.f.ansIdem=true;W.ans.applied=true}return r}
