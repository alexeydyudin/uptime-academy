// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { pad } from './util';

export const VULNS=[['zlib1g','CVE-2022-37434','CRITICAL','1:1.2.11.dfsg-2','1:1.2.11.dfsg-2+deb11u2'],['libc6','CVE-2023-4911','HIGH','2.31-13+deb11u5','2.31-13+deb11u7'],['libssl1.1','CVE-2023-0286','HIGH','1.1.1n-0+deb11u3','1.1.1n-0+deb11u4'],['node','CVE-2023-44487','HIGH','16.20.2','нет: Node 16 вне поддержки (EOL)']];
export function trivy(W,a,err,r){if(a[1]!=='image'&&a[1]!=='i')return err('В тренажёре trivy сканирует образы: trivy image <образ>');
  const args=a.slice(2),flags={};const pos=[];for(let i=0;i<args.length;i++){if(args[i]==='--severity'||args[i]==='-s')flags.sev=args[++i];else if(args[i]==='--exit-code')flags.exit=+args[++i];else if(args[i].startsWith('--severity='))flags.sev=args[i].split('=')[1];else if(args[i].startsWith('--exit-code='))flags.exit=+args[i].split('=')[1];else if(!args[i].startsWith('-'))pos.push(args[i])}
  const img=pos[0];if(!img)return err('usage: trivy image <образ>');const info=W.imgInfo&&W.imgInfo[img];if(!info&&!W.images.includes(img))return err(`FATAL: unable to find the specified image "${img}"`);
  const base=info?info.base:img,old=/node:(1\d|[0-9])\b|:latest\b/.test(base)||!/node:(2\d|[3-9]\d)/.test(base),small=/alpine|slim|distroless/.test(base);
  let rows=old?VULNS:(small?[['busybox','CVE-2023-42366','LOW','1.36.1-r29','1.36.1-r30']]:[['perl-base','CVE-2023-31484','HIGH','5.36.0-7+deb12u1','']]);
  const sev=(flags.sev||'').toUpperCase().split(',').filter(Boolean);if(sev.length)rows=rows.filter(x=>sev.includes(x[2]));
  const n=s=>rows.filter(x=>x[2]===s).length;W.f.trivy=W.f.trivy||{};W.f.trivy[img]={crit:n('CRITICAL'),high:n('HIGH')};
  const os=small?'alpine 3.20':'debian '+(old?'11.8':'12.7');
  r.out=`${img} (${os})\n${'='.repeat(img.length+os.length+3)}\nTotal: ${rows.length} (${['CRITICAL','HIGH','MEDIUM','LOW'].filter(s=>!sev.length||sev.includes(s)).map(s=>s+': '+n(s)).join(', ')})\n`+(rows.length?'\n'+pad('Library',11)+pad('Vulnerability',16)+pad('Severity',10)+pad('Installed',20)+'Fixed\n'+rows.map(x=>pad(x[0],11)+pad(x[1],16)+pad(x[2],10)+pad(x[3],20)+(x[4]||'—')).join('\n'):'');
  if(flags.exit&&rows.length){r.cls='e';r.exit=flags.exit}else if(n('CRITICAL')||n('HIGH'))r.cls='e';return r}
export function gitleaks(W,a,err,r){const v=a[1];
  if(v==='detect'||v==='git'){W.f.leakScan=true;r.out='Finding:     const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";\nSecret:      AKIAIOSFODNN7EXAMPLE\nRuleID:      aws-access-token\nEntropy:     3.65\nFile:        config/aws.js\nLine:        3\nCommit:      a1b2c3d\nAuthor:      vasya\nDate:        2026-10-14T18:22:41Z\n\nINF 37 commits scanned.\nWRN leaks found: 1';r.cls='e';r.exit=1;return r}
  if(v==='dir'||v==='protect'){const leak=/AKIA[0-9A-Z]{16}/.test(W.files[W.leak.file]||'');if(!leak)W.f.leakDir=true;
    r.out=leak?'Finding:     const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";\nRuleID:      aws-access-token\nFile:        config/aws.js\nLine:        3\n\nWRN leaks found: 1':'INF scanned ~2.1 KB in 38ms\nINF no leaks found';r.cls=leak?'e':'g';if(leak)r.exit=1;return r}
  return err('gitleaks: в тренажёре есть detect (вся история git) и dir . (текущие файлы)')}
