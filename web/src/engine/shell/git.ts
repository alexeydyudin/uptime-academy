// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { pad, rp } from './util';

export const CI_PATH='/home/dev/app/.github/workflows/ci.yml';
export const ciOk=W=>/node-version:\s*['"]?(2\d|[3-9]\d)\b/.test(W.files[CI_PATH]||'');
export function git(W,a,err,r,line){const G=W.git;if(!G||!W.cwd.startsWith('/home/dev/app'))return err('fatal: not a git repository (or any of the parent directories): .git');
  const v=a[0];
  if(v==='status'){const L=['On branch main'];if(G.ahead)L.push(`Your branch is ahead of 'origin/main' by ${G.ahead} commit(s).\n  (use "git push" to publish your local commits)`);
    if(G.staged.length)L.push('Changes to be committed:\n'+G.staged.map(f=>'\tmodified:   '+f).join('\n'));
    if(G.modified.length)L.push('Changes not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n'+G.modified.map(f=>'\tmodified:   '+f).join('\n'));
    if(!G.staged.length&&!G.modified.length)L.push('nothing to commit, working tree clean');r.out=L.join('\n\n');return r}
  if(v==='add'){const t=a[1];if(!t)return err('Nothing specified, nothing added.');const all=t==='.'||t==='-A'||t==='--all';
    const fs=G.modified.filter(f=>all||f===t.replace(/^\.\//,'')||('/home/dev/app/'+f)===rp(W,t));if(!fs.length)return err(G.modified.length?`fatal: pathspec '${t}' did not match any files`:'Нечего добавлять: изменений нет');
    G.staged.push(...fs.filter(f=>!G.staged.includes(f)));G.modified=G.modified.filter(f=>!fs.includes(f));return r}
  if(v==='commit'){const m=line.match(/-m\s+"([^"]+)"/)||line.match(/-m\s+'([^']+)'/)||line.match(/-m\s+(\S+)/);if(!m)return err('Укажи сообщение: git commit -m "ci: node 20"');
    if(!G.staged.length)return err('nothing added to commit (сначала git add)');const h=Math.random().toString(16).slice(2,9);G.log.unshift({h,msg:m[1]});G.ahead++;const n=G.staged.length;G.staged=[];
    r.out=`[main ${h}] ${m[1]}\n ${n} file changed, 1 insertion(+), 1 deletion(-)`;return r}
  if(v==='push'){if(!G.ahead){r.out='Everything up-to-date';return r}G.ahead=0;const id=W.ci.runs[0].id+1;W.ci.runs.unshift({id,status:'in_progress',final:ciOk(W)?'success':'failure',title:G.log[0].msg,age:0});
    r.out=`To github.com:uptime/shop.git\n   ${G.log[1].h}..${G.log[0].h}  main -> main\nremote: GitHub Actions: запущен run ${id}`;return r}
  if(v==='log'){r.out=G.log.slice(0,6).map(c=>`${c.h} ${c.msg}`).join('\n');return r}
  if(v==='diff'){const o=(W.orig[CI_PATH]||'').split('\n'),n=(W.files[CI_PATH]||'').split('\n');const L=[];for(let i=0;i<Math.max(o.length,n.length);i++)if(o[i]!==n[i]){if(o[i]!=null)L.push('-'+o[i]);if(n[i]!=null)L.push('+'+n[i])}
    r.out=L.length?['--- a/.github/workflows/ci.yml','+++ b/.github/workflows/ci.yml',...L].join('\n'):'';return r}
  return err('git: в игре есть status, add, commit, push, log, diff')}
export function gh(W,a,err,r){const C=W.ci;if(!C)return err('gh: в этом уроке нет репозитория');if(a[0]!=='run')return err('gh: доступно gh run list и gh run view <id>');
  if(a[1]==='list')for(const x of C.runs)if(x.status==='in_progress'){if(x.age>=1)x.status=x.final;else x.age++}
  const mark={success:'✓',failure:'X',in_progress:'*'};
  if(a[1]==='list'){r.out=[pad('STATUS',14)+pad('ID',7)+pad('TITLE',34)+'BRANCH'].concat(C.runs.map(x=>pad(mark[x.status]+' '+x.status,14)+pad(x.id,7)+pad(x.title.slice(0,32),34)+'main')).join('\n');return r}
  if(a[1]==='view'){const x=C.runs.find(y=>String(y.id)===a[2]);if(!x)return err(`could not find any workflow run with ID ${a[2]||''}`);const logs=a.some(z=>/^--log/.test(z));
    if(x.status==='in_progress'){r.out=`* run ${x.id} ещё идёт. Проверь через gh run list.`;return r}
    if(x.status==='success'){r.out=`✓ ci · ${x.id}\nJOBS\n✓ test in 48s\n  ✓ npm ci\n  ✓ npm test (42 passed)`;r.cls='g';return r}
    if(!logs){r.out=`X ci · ${x.id} · failure\nJOBS\nX test in 21s\n\nЛоги упавшего шага: gh run view ${x.id} --log-failed`;r.cls='e';return r}
    W.f.ghlog=true;r.out='test\tRun npm ci\nnpm ERR! code EBADENGINE\nnpm ERR! engine Unsupported engine for uptime-shop@1.4.0\nnpm ERR! notsup Required: {"node":">=20"}\nnpm ERR! notsup Actual:   {"npm":"8.19.4","node":"v16.20.2"}\ntest\tProcess completed with exit code 1.';r.cls='e';return r}
  return err('gh run: доступно list и view')}
export function git2(W,a,err,r,line){const G=W.g;if(!W.cwd.startsWith(G.root))return err('fatal: not a git repository (or any of the parent directories): .git');
  const v=a[0],hash=()=>Math.random().toString(16).slice(2,9),hasMarkers=t=>/^(<<<<<<<|=======|>>>>>>>)/m.test(t||'');
  if(v==='status'){W.f.gstatus=true;const L=[`On branch ${G.branch}`];
    if(G.merging&&G.conflicts.length){W.f.statusConflict=true;L.push('You have unmerged paths.\n  (fix conflicts and run "git commit")\n\nUnmerged paths:\n  (use "git add <file>..." to mark resolution)\n'+G.conflicts.map(f=>'\tboth modified:   '+f).join('\n'))}
    else if(G.merging)L.push('All conflicts fixed but you are still merging.\n  (use "git commit" to conclude merge)');
    if(G.staged.length)L.push('Changes to be committed:\n'+G.staged.map(f=>'\tmodified:   '+f).join('\n'));
    if(G.modified.length)L.push('Changes not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n'+G.modified.map(f=>'\tmodified:   '+f).join('\n'));
    if(!G.merging&&!G.staged.length&&!G.modified.length)L.push('nothing to commit, working tree clean');r.out=L.join('\n\n');return r}
  if(v==='branch'){if(a[1]&&!a[1].startsWith('-')){if(G.branches[a[1]])return err(`fatal: a branch named '${a[1]}' already exists`);G.branches[a[1]]=[...G.branches[G.branch]];return r}
    r.out=Object.keys(G.branches).map(n=>(n===G.branch?'* ':'  ')+n).join('\n')+(a.includes('-a')?'\n'+G.remote.map(n=>'  remotes/origin/'+n).join('\n'):'');return r}
  if(v==='switch'||v==='checkout'){const create=a.some(x=>/^(-c|-b|--create)$/.test(x)),name=a.slice(1).filter(x=>!x.startsWith('-'))[0];
    if(!name)return err(`usage: git ${v} ${v==='switch'?'-c':'-b'} <ветка>`);if(G.merging)return err('error: you need to resolve your current index first');
    if(create){if(G.branches[name])return err(`fatal: a branch named '${name}' already exists`);G.branches[name]=[...G.branches[G.branch]];G.branch=name;r.out=`Switched to a new branch '${name}'`;return r}
    if(!G.branches[name])return err(`fatal: invalid reference: ${name}\nhint: чтобы создать ветку: git switch -c ${name}`);G.branch=name;r.out=`Switched to branch '${name}'`;return r}
  if(v==='add'){const t=a[1];if(!t)return err('Nothing specified, nothing added.');const all=t==='.'||t==='-A'||t==='--all';
    const pool=[...G.modified,...(G.merging?G.conflicts:[])],fs=pool.filter(f=>all||f===t.replace(/^\.\//,'')||G.root+'/'+f===rp(W,t));
    if(!fs.length)return err(pool.length?`fatal: pathspec '${t}' did not match any files`:'Нечего добавлять: изменений нет');
    for(const f of fs)if(!G.staged.includes(f))G.staged.push(f);G.modified=G.modified.filter(f=>!fs.includes(f));if(G.merging)G.conflicts=G.conflicts.filter(f=>!fs.includes(f));return r}
  if(v==='commit'){const m=line.match(/-m\s+"([^"]+)"/)||line.match(/-m\s+'([^']+)'/)||line.match(/-m\s+(\S+)/);
    if(G.merging){if(G.conflicts.length)return err('error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use git add <file>');
      if(hasMarkers(W.files[G.root+'/config.yaml']))return err('В config.yaml остались маркеры конфликта <<<<<<< ======= >>>>>>>. git бы такое закоммитил, а прод — не переварит. Сначала почисти файл.');
      const msg=m?m[1]:`Merge branch '${G.mergeFrom}' into ${G.branch}`,h=hash();G.branches[G.branch].push({h,msg});G.merging=false;G.staged=[];G.ahead++;W.f.merged=true;r.out=`[${G.branch} ${h}] ${msg}`;return r}
    if(!m)return err('Укажи сообщение: git commit -m "что изменилось"');if(!G.staged.length)return err('nothing added to commit but untracked files present (сначала git add)');
    const h=hash(),n=G.staged.length;G.branches[G.branch].push({h,msg:m[1]});G.staged=[];G.ahead++;r.out=`[${G.branch} ${h}] ${m[1]}\n ${n} file changed, 1 insertion(+), 1 deletion(-)`;return r}
  if(v==='push'){const up=a.some(x=>x==='-u'||x==='--set-upstream'),pos=a.slice(1).filter(x=>!x.startsWith('-')),target=pos[1]||G.branch;
    if(target==='main')return err('remote: error: GH006: Protected branch update failed for refs/heads/main.\nremote: Changes must be made through a pull request.\n ! [remote rejected] main -> main (protected branch hook declined)');
    if(!G.upstream[G.branch]&&!up)return err(`fatal: The current branch ${G.branch} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream origin ${G.branch}`);
    if(!G.ahead&&G.remote.includes(G.branch)){r.out='Everything up-to-date';return r}
    const isNew=!G.remote.includes(G.branch);G.upstream[G.branch]=true;if(isNew)G.remote.push(G.branch);G.pushed[G.branch]=G.branches[G.branch].length;G.ahead=0;W.f.pushed=G.branch;
    r.out=isNew?`remote:\nremote: Create a pull request for '${G.branch}' on GitHub by visiting:\nremote:      https://github.com/uptime/shop/pull/new/${G.branch}\nremote:\nTo github.com:uptime/shop.git\n * [new branch]      ${G.branch} -> ${G.branch}\nbranch '${G.branch}' set up to track 'origin/${G.branch}'.`:`To github.com:uptime/shop.git\n   ${G.branch} -> ${G.branch}`;return r}
  if(v==='merge'||v==='pull'||v==='rebase'){const from=v==='pull'?(a[2]||'main'):a.slice(1).filter(x=>!x.startsWith('-'))[0];if(!from)return err('укажи ветку: git merge main');
    if(v==='rebase')return err('rebase в тренажёре пока нет. Здесь используй git merge main: в общей ветке это безопасный вариант.');
    const src=from.replace(/^origin\//,'');if(!G.branches[src])return err(`merge: ${from} - not something we can merge`);
    if(G.conflictOn&&src==='main'&&!G.mergedMain){G.merging=true;G.mergeFrom=src;G.conflicts=['config.yaml'];G.mergedMain=true;W.files[G.root+'/config.yaml']=G.conflictText;W.f.conflict=true;
      r.out=(v==='pull'?'From github.com:uptime/shop\n * branch            main       -> FETCH_HEAD\n':'')+'Auto-merging config.yaml\nCONFLICT (content): Merge conflict in config.yaml\nAutomatic merge failed; fix conflicts and then commit the result.';r.cls='e';return r}
    r.out='Already up to date.';return r}
  if(v==='log'){const L=G.branches[G.branch].slice().reverse();r.out=L.map((c,i)=>`${a.includes('--graph')?'* ':''}${c.h} ${i===0?`(HEAD -> ${G.branch}) `:''}${c.msg}`).join('\n');return r}
  if(v==='diff'){r.out=G.modified.map(f=>`diff --git a/${f} b/${f}\n--- a/${f}\n+++ b/${f}\n(изменён ${f})`).join('\n');return r}
  if(['restore','reset','stash','cherry-pick','tag','fetch','clone','remote'].includes(v))return err(`git ${v} в тренажёре пока нет. В настоящем git команда работает.`);
  return err('git: в тренажёре есть status, branch, switch, checkout, add, commit, push, merge, pull, log, diff')}
