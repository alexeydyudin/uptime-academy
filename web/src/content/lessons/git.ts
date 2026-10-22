import { gitWorld, conflictWorld } from '../worlds';
import type { World, Lesson } from '../../engine/types';

export const gitLessons: Record<string, Lesson> = {
 l22:{title:'Ветки и Pull Request',xp:25,setup:gitWorld,steps:[
  {t:'lecture',pages:[
   {h:'Git хранит историю',p:'Коммит — снимок проекта с сообщением и автором. Ветка — подвижный указатель на цепочку коммитов. main — то, что едет в прод.',code:'main:        A ── B ─────────── M   (слияние после ревью)\n                   \\            /\nfeature/x:          C ── D ───┘\n\ngit switch -c feature/x\ngit add . && git commit -m "feat: ..."\ngit push -u origin feature/x   # и открыть Pull Request'},
   {h:'GitHub Flow',p:'Короткая ветка на каждую задачу → Pull Request → ревью и зелёный CI → слияние в main. Прямой push в main обычно запрещён правилом защиты ветки.',terms:[['commit','снимок изменений с сообщением'],['branch','отдельная линия работы'],['push','отправить коммиты на сервер'],['Pull Request','просьба влить ветку: место для ревью и CI'],['conventional commits','сообщения вида feat:, fix:, ci: — понятная история']]}]},
  {t:'task',h:'Осмотрись',p:'Ты в репозитории shop. Узнай, в какой ты ветке и есть ли незакоммиченные изменения.',hints:['Состояние репозитория показывает одна команда git.','git status','git status'],sol:['git status'],
   done:'Ветка main, всё чисто. Работать прямо в main не будем.',check:W=>W.f.gstatus},
  {t:'task',h:'Новая ветка',p:'Тебе нужно увеличить таймаут API. Создай ветку feature/api-timeout и переключись на неё.',hints:['Современная команда — git switch, у неё есть флаг создания.','git switch -c <ветка> или git checkout -b <ветка>','git switch -c feature/api-timeout'],sol:['git switch -c feature/api-timeout'],
   done:'Ветка создана от текущего main. Префикс feature/ или fix/ сразу говорит, что внутри.',check:W=>W.g.branch==='feature/api-timeout'},
  {t:'edit',h:'Внеси правку',p:'В config.yaml увеличь api.timeout с 5s до 30s.',file:'config.yaml',path:'/home/dev/shop/config.yaml',hint:'Строка `timeout: 5s` → `timeout: 30s`.',
   checks:[{name:'timeout: 30s',test:t=>/^\s+timeout:\s*30s\s*$/m.test(t)},{name:'Остальной конфиг на месте',test:t=>/port:\s*8080/.test(t)&&/^api:/m.test(t)}],
   onSave:W=>{if(!W.g.modified.includes('config.yaml'))W.g.modified.push('config.yaml')},sample:'server:\n  port: 8080\napi:\n  timeout: 30s\n',done:'Файл изменён, git status его увидит.'},
  {t:'task',h:'Отправь на ревью',p:'Закоммить изменение с понятным сообщением и отправь ветку на GitHub.',hints:['add → commit -m → push. Новую ветку при первом push нужно связать с сервером.','git push -u origin <ветка>','git add . && git commit -m "feat: api timeout 30s" && git push -u origin feature/api-timeout'],sol:['git add . && git commit -m "feat: api timeout 30s" && git push -u origin feature/api-timeout'],
   done:'GitHub сразу предлагает ссылку на Pull Request. Дальше — ревью коллег и зелёный CI.',check:W=>W.g.remote.includes('feature/api-timeout')&&(W.g.pushed['feature/api-timeout']||0)>2},
  {t:'quiz',h:'Ты пушишь прямо в main и получаешь «protected branch». Зачем так настроено?',o:['Изменения в main должны пройти ревью и CI через Pull Request','GitHub никому не разрешает push в main','Нужно сначала сделать git pull','Ветка main удалена'],a:0,ex:'Защита ветки — правило репозитория: в main попадает только то, что прошло проверки.'},
  {t:'quiz',h:'`git pull` — это...',o:['git fetch + git merge','git push наоборот, только для main','Скачать репозиторий заново','Откатить последний коммит'],a:0,ex:'fetch скачивает новые коммиты, merge вливает их в текущую ветку. С --rebase вместо merge будет rebase.'},
 ]},
 l23:{title:'Конфликт слияния',xp:25,setup:conflictWorld,steps:[
  {t:'lecture',pages:[
   {h:'Откуда берутся конфликты',p:'Пока ты работал в ветке, в main влили чужие изменения в те же строки. Git не знает, чья версия правильная, и просит решить человека.',code:'<<<<<<< HEAD\n  timeout: 30s     ← твоя ветка\n=======\n  timeout: 10s     ← то, что пришло из main\n  retries: 3\n>>>>>>> main'},
   {h:'Как разрешить',p:'1. Открой файл, оставь правильный итог, удали маркеры.\n2. `git add файл` — пометить конфликт решённым.\n3. `git commit` — завершить слияние.\nЧасто правильный итог — объединение обеих правок, а не выбор одной.',terms:[['merge','влить ветку; история сохраняется с merge-коммитом'],['rebase','переписать свои коммиты поверх свежей ветки; не для общих веток'],['--force','перезаписать историю на сервере; в общей ветке опасно']]}]},
  {t:'task',h:'Подтяни main',p:'Пока шло ревью, в main влили правку Олега: ретраи для API. CI требует свежую ветку. Влей main в свою ветку feature/api-timeout.',hints:['Слияние другой ветки в текущую — git merge.','git merge <ветка>','git merge main'],sol:['git merge main'],
   done:'CONFLICT: вы с Олегом меняли один и тот же блок api.',check:W=>W.f.conflict},
  {t:'task',h:'Где конфликт?',p:'Посмотри, какие файлы нужно разрешить.',hints:['Та же команда, что показывает состояние репозитория.','git status','git status'],sol:['git status'],
   done:'both modified: config.yaml. Git ждёт, пока ты почистишь файл и сделаешь git add.',check:W=>W.f.statusConflict},
  {t:'edit',h:'Разреши конфликт',p:'Сохрани обе правки: твой timeout 30s и retries: 3 от Олега. Удали маркеры конфликта.',file:'config.yaml',path:'/home/dev/shop/config.yaml',hint:'Итог блока api: две строки — `  timeout: 30s` и `  retries: 3`.',
   checks:[{name:'Маркеров <<<<<<< ======= >>>>>>> не осталось',test:t=>!/^(<<<<<<<|=======|>>>>>>>)/m.test(t)},{name:'timeout: 30s (твоя правка)',test:t=>/^\s+timeout:\s*30s\s*$/m.test(t)&&!/timeout:\s*10s/.test(t)},{name:'retries: 3 (правка Олега)',test:t=>/^\s+retries:\s*3\s*$/m.test(t)}],
   sample:'server:\n  port: 8080\napi:\n  timeout: 30s\n  retries: 3\n',done:'Файл чистый. Осталось сказать git, что конфликт решён.'},
  {t:'task',h:'Заверши слияние',p:'Пометь конфликт решённым, закоммить слияние и отправь ветку.',hints:['git add, затем git commit. Для merge-коммита сообщение уже заготовлено: подойдёт --no-edit.','git add config.yaml && git commit --no-edit && git push','git add config.yaml && git commit --no-edit && git push'],sol:['git add config.yaml && git commit --no-edit && git push'],
   done:'Ветка свежая, CI перезапустится, и PR можно вливать.',check:W=>W.f.merged&&W.g.pushed['feature/api-timeout']===W.g.branches['feature/api-timeout'].length},
  {t:'quiz',h:'Коллега после rebase делает `git push --force` в общую ветку develop. Чем это опасно?',o:['Перезапишет историю на сервере и сотрёт чужие коммиты','Ничем, это обычная практика','Удалит репозиторий','Отключит CI'],a:0,ex:'Если очень нужно, есть `--force-with-lease`: он откажется, если на сервере появились чужие коммиты. В общие ветки лучше не форсить вообще.'},
 ]}
};
