// @ts-nocheck — перенесено из однофайловой версии; типизация по мере рефакторинга
import { S } from './state';
/* curriculum */
export const UNITS=[
 {id:'linux',n:1,c:'var(--u1)',title:'Терминал',sub:'pwd, ls, cd, cat, grep, ps, kill',lessons:['l1','l2','l3']},
 {id:'svc',n:2,c:'var(--u2)',title:'Сервисы и сеть',sub:'systemctl, логи, диск, HTTP-коды',lessons:['l4','l5']},
 {id:'docker',n:3,c:'var(--u3)',title:'Контейнеры',sub:'docker run, ps, logs, переменные окружения',lessons:['l6','l7']},
 {id:'k8s',n:4,c:'var(--u4)',title:'Kubernetes',sub:'поды, деплойменты, откат, масштабирование',lessons:['l8','l9','l10']},
 {id:'auto',n:5,c:'var(--u5)',title:'Автоматизация',sub:'пишем свой автоскейлер и автохил',lessons:['l11','l12']},
 {id:'cicd',n:6,c:'var(--u3)',title:'CI/CD пайплайны',sub:'git, GitHub Actions, секреты, безопасный деплой',lessons:['l14','l15']},
 {id:'obs',n:7,c:'var(--u2)',title:'Мониторинг и алерты',sub:'Prometheus, PromQL, правила алертов',lessons:['l16','l17']},
 {id:'boss',n:8,c:'var(--u6)',title:'Боевое дежурство',sub:'всё вместе, в реальном времени',lessons:['l13']},
 {id:'iac',n:9,c:'var(--u1)',title:'Terraform',sub:'скоро',lessons:[],soon:true},
];
export const APP_LOG=['08:00:01 INFO  api started on :8080','08:00:02 INFO  connected to db','08:14:22 INFO  GET /orders 200 31ms','08:14:25 WARN  slow query 1200ms','08:15:02 ERROR db connection timeout after 30s','08:15:03 INFO  retry 1/3','08:15:09 INFO  GET /orders 200 54ms','08:31:44 ERROR db connection timeout after 30s','08:31:45 INFO  retry 1/3','08:40:10 INFO  GET /cart 200 22ms','08:52:13 WARN  pool exhausted, waiting','08:52:43 ERROR db connection timeout after 30s','08:53:00 INFO  GET /profile 200 18ms'].join('\n');
export function baseWorld(){
  const files={
    '/home/dev/notes.txt':'TODO: разобраться, почему ночью падает nginx\nпароль от прода не здесь, не ищи',
    '/home/dev/deploy.sh':'#!/bin/bash\necho "deploying..."\nkubectl apply -f k8s/',
    '/var/log/app.log':APP_LOG,
    '/var/log/syslog':'Oct 21 03:10:01 prod-web-01 CRON[811]: (root) CMD (logrotate)',
    '/var/log/nginx/access.log':'10.0.0.5 - - "GET / HTTP/1.1" 200 612',
    '/var/log/nginx/error.log':'2026/10/21 02:58:11 [notice] start worker processes',
    '/etc/hostname':'prod-web-01',
    '/etc/nginx/nginx.conf':'worker_processes auto;\nhttp {\n  server { listen 80; root /var/www/html; }\n}',
  };
  const dirs=new Set(['/','/home','/home/dev','/var','/var/log','/var/log/nginx','/var/log/old','/etc','/etc/nginx','/tmp']);
  return{cwd:'/home/dev',files,dirs,sizes:{},procs:[
    {pid:1,user:'root',cpu:0.0,mem:0.4,cmd:'/sbin/init'},{pid:612,user:'root',cpu:0.1,mem:0.3,cmd:'/usr/sbin/sshd -D'},
    {pid:901,user:'root',cpu:0.0,mem:0.2,cmd:'nginx: master process'},{pid:902,user:'www-data',cpu:1.2,mem:0.9,cmd:'nginx: worker process'}],
    svc:{nginx:{active:true}},disk:41,containers:[],images:['nginx:1.27','api:1.0','postgres:16'],k8s:null,hist:[],f:{read:{}}};
}
export function k8sWorld(W,deploys){W.k8s={deploys,pods:[]};for(const[n,d]of Object.entries(deploys)){for(let i=0;i<d.replicas;i++)W.k8s.pods.push(kPod(n,d.ok?'Running':'CrashLoopBackOff',d.ok?0:4+i))}return W}
export const rid=()=>Math.random().toString(36).slice(2,7);
export const kPod=(app,status,restarts=0)=>({name:`${app}-7d9f-${rid()}`,app,status,restarts,age:status==='ContainerCreating'?0:42});

export const CI_PATH='/home/dev/app/.github/workflows/ci.yml';
export function repoWorld(){const W=baseWorld();['/home/dev/app','/home/dev/app/.github','/home/dev/app/.github/workflows','/home/dev/app/src'].forEach(d=>W.dirs.add(d));
  W.files[CI_PATH]="name: ci\non:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 16\n      - run: npm ci\n      - run: npm test\n";
  W.files['/home/dev/app/package.json']='{\n  "name": "uptime-shop",\n  "version": "1.4.0",\n  "engines": { "node": ">=20" },\n  "scripts": { "test": "vitest run" }\n}';
  W.files['/home/dev/app/src/cart.js']='export const discount = (sum) => sum > 10000 ? sum * 0.9 : sum;';
  W.orig={[CI_PATH]:W.files[CI_PATH]};W.cwd='/home/dev/app';
  W.git={modified:[],staged:[],ahead:0,log:[{h:'9c41e02',msg:'feat: add cart discounts'},{h:'1b7d3aa',msg:'chore: bump engines to node 20'},{h:'f02e9c1',msg:'fix: cart total rounding'}]};
  W.ci={runs:[{id:4821,status:'failure',title:'feat: add cart discounts'},{id:4820,status:'failure',title:'chore: bump engines to node 20'},{id:4819,status:'success',title:'fix: cart total rounding'}]};
  return W}
export const LESSONS={
 l1:{title:'Где я?',xp:15,setup:baseWorld,steps:[
  {t:'learn',h:'Терминал — главный инструмент девопса',p:'Ты вводишь команду, сервер отвечает текстом. Никаких кнопок. Начнём с ориентации: где ты находишься в файловой системе.'},
  {t:'task',h:'Узнай текущую папку',p:'Команда `pwd` (print working directory) печатает, где ты сейчас.',hint:'Просто введи pwd и нажми Enter.',check:(W,c)=>c.includes('pwd')},
  {t:'task',h:'Что здесь лежит?',p:'Команда `ls` показывает содержимое папки.',hint:'ls',check:(W,c)=>c.some(x=>/^ls\b/.test(x))},
  {t:'quiz',h:'Что сделает `cd ..`?',o:['Перейдёт в родительскую папку','Удалит текущую папку','Покажет скрытые файлы','Выйдет из сервера'],a:0,ex:'Две точки означают папку уровнем выше.'},
  {t:'task',h:'Прочитай заметку',p:'Команда `cat файл` выводит содержимое файла. Прочитай `notes.txt`.',hint:'cat notes.txt',check:W=>W.f.read['/home/dev/notes.txt']},
  {t:'task',h:'Иди к логам',p:'Логи в Linux обычно лежат в `/var/log`. Перейди туда через `cd` и посмотри содержимое через `ls`.',hint:'cd /var/log, затем ls',check:(W,c)=>W.cwd==='/var/log'&&/^ls\b/.test(c[c.length-1]||'')},
 ]},
 l2:{title:'Читаем логи',xp:15,setup:()=>{const W=baseWorld();W.cwd='/var/log';return W},steps:[
  {t:'learn',h:'Логи — первое место, куда смотрят при инциденте',p:'Приложение пишет в лог всё, что с ним происходит: запросы, предупреждения, ошибки. Читать их целиком долго, поэтому есть инструменты.'},
  {t:'task',h:'Хвост лога',p:'Свежие записи в конце файла. Выведи последние 5 строк: `tail -n 5 app.log`.',hint:'tail -n 5 app.log',check:W=>W.f.tail==='/var/log/app.log'},
  {t:'quiz',h:'В логе 2 миллиона строк. Как быстрее всего найти ошибки?',o:['grep ERROR app.log','cat app.log и листать','Скачать и открыть в блокноте','rm app.log, чтобы не мешал'],a:0,ex:'grep фильтрует строки по шаблону и выводит только совпадения.'},
  {t:'task',h:'Найди ошибки',p:'Выведи только строки с ошибками: `grep ERROR app.log`.',hint:'grep ERROR app.log',check:W=>W.f.grep&&W.f.grep.file==='/var/log/app.log'&&/error/i.test(W.f.grep.pat)&&!W.f.grep.count},
  {t:'quiz',h:'Судя по ошибкам, что ломается?',o:['Подключение к базе данных','Закончился диск','Сломался DNS','Истёк SSL-сертификат'],a:0,ex:'Все ERROR — это «db connection timeout». Следующий шаг дежурного: смотреть на базу.'},
  {t:'task',h:'Сколько их?',p:'Флаг `-c` считает совпадения вместо вывода: `grep -c ERROR app.log`.',hint:'grep -c ERROR app.log',check:W=>W.f.grep&&W.f.grep.count&&W.f.grep.file==='/var/log/app.log'},
 ]},
 l3:{title:'Кто съел CPU',xp:20,setup:()=>{const W=baseWorld();W.procs.push({pid:4242,user:'www-data',cpu:98.7,mem:12.1,cmd:'python3 /tmp/.cache/miner.py',ignoreTerm:true});W.files['/tmp/.cache/miner.py']='# ...';W.dirs.add('/tmp/.cache');return W},steps:[
  {t:'learn',h:'Сервер тормозит',p:'Каждая запущенная программа — процесс со своим номером, PID. Если машина еле отвечает, надо найти, кто съел процессор.'},
  {t:'task',h:'Список процессов',p:'Выведи все процессы: `ps aux`.',hint:'ps aux',check:(W,c)=>c.some(x=>/^ps\b/.test(x))},
  {t:'quiz',h:'Какой процесс подозрительный?',o:['python3 /tmp/.cache/miner.py','nginx: worker process','/usr/sbin/sshd -D','/sbin/init'],a:0,ex:'98% CPU, скрытая папка в /tmp и слово miner. Кто-то майнит на твоём сервере.'},
  {t:'task',h:'Останови его',p:'Заверши процесс по PID: `kill <PID>`. Посмотри PID в таблице. Потом проверь, что процесс исчез.',hint:'Если обычный kill не помог, процесс перехватывает сигнал SIGTERM. Попробуй kill -9 4242.',check:W=>!W.procs.find(p=>p.pid===4242)},
  {t:'quiz',h:'Чем `kill -9` отличается от `kill`?',o:['Посылает SIGKILL, который процесс не может перехватить','Убивает 9 процессов сразу','Ждёт 9 секунд и убивает','Перезапускает процесс'],a:0,ex:'Обычный kill шлёт SIGTERM: «пожалуйста, завершись». -9 шлёт SIGKILL, ядро убивает процесс без спроса.'},
 ]},
 l4:{title:'nginx лёг в 3 ночи',xp:30,setup:()=>{const W=baseWorld();W.svc.nginx={active:false};W.disk=100;W.procs=W.procs.filter(p=>!p.cmd.startsWith('nginx'));
   W.files['/var/log/nginx/error.log']='2026/10/21 03:11:58 [crit] write() to "/var/log/nginx/access.log" failed (28: No space left on device)\n2026/10/21 03:12:01 [emerg] open() "/run/nginx.pid" failed (28: No space left on device)';
   W.files['/var/log/old/app-2025.log.1']='...';W.sizes['/var/log/old/app-2025.log.1']='38G';W.files['/var/log/old/readme.txt']='старые логи, кто-нибудь почистите';return W},steps:[
  {t:'learn',h:'03:12. Звонит мониторинг',p:'Сайт не открывается. На сервере prod-web-01 работает nginx. Разберёмся по шагам, как настоящий дежурный: проверить симптом, найти причину, починить, убедиться.'},
  {t:'task',h:'Симптом',p:'Проверь, отвечает ли сайт локально: `curl localhost`.',hint:'curl localhost',check:(W,c)=>c.some(x=>/^curl\b/.test(x))},
  {t:'task',h:'Статус сервиса',p:'Узнай, что с nginx: `systemctl status nginx`.',hint:'systemctl status nginx',check:(W,c)=>c.some(x=>/^systemctl\s+status\s+nginx/.test(x))},
  {t:'task',h:'Причина в логе',p:'Сервис упал. Причину ищи в его логе ошибок: `/var/log/nginx/error.log`.',hint:'cat /var/log/nginx/error.log',check:W=>W.f.read['/var/log/nginx/error.log']},
  {t:'task',h:'Проверь диск',p:'«No space left on device». Посмотри заполненность дисков: `df -h`.',hint:'df -h',check:(W,c)=>c.some(x=>/^df\b/.test(x))},
  {t:'task',h:'Освободи место',p:'Диск заполнен на 100%. Найди огромный файл в `/var/log/old` (подойдёт `ls -la`) и удали его через `rm`.',hint:'ls -la /var/log/old, затем rm /var/log/old/app-2025.log.1',check:W=>W.disk<100},
  {t:'task',h:'Подними и проверь',p:'Перезапусти сервис `systemctl restart nginx` и убедись, что сайт отвечает: `curl localhost`.',hint:'systemctl restart nginx, затем curl localhost',check:W=>W.svc.nginx.active&&W.f.curl&&W.f.curl.ok&&W.f.curl.port===80},
  {t:'quiz',h:'Как не допустить этого снова?',o:['Настроить logrotate и алерт на диск > 85%','Каждую ночь перезагружать сервер','Выключить логирование','Купить диск в 10 раз больше'],a:0,ex:'Корневая причина — старые логи никто не удалял. Ротация логов плюс ранний алерт на заполнение диска закрывают её.'},
 ]},
 l5:{title:'HTTP и порты',xp:15,setup:baseWorld,steps:[
  {t:'quiz',h:'Пользователи видят 502 Bad Gateway. Что это значит?',o:['Прокси (nginx) не получил нормальный ответ от бэкенда','У пользователя нет интернета','Страница не найдена','Сервер требует пароль'],a:0,ex:'502 отдаёт прокси, когда сервис за ним упал или отвечает мусором.'},
  {t:'quiz',h:'Стандартный порт HTTPS?',o:['443','80','22','8080'],a:0,ex:'80 — HTTP, 443 — HTTPS, 22 — SSH.'},
  {t:'quiz',h:'Как проверить, что слушает порт 80?',o:['ss -tlnp | grep :80','ping 80','ls /port/80','cat :80'],a:0,ex:'ss показывает открытые сокеты: -t TCP, -l слушающие, -n цифрами, -p с процессом.'},
  {t:'quiz',h:'Код 404 означает...',o:['Ресурс не найден','Сервер упал','Нет доступа','Слишком много запросов'],a:0,ex:'4xx — ошибка на стороне запроса. 404 — такого пути нет.'},
  {t:'quiz',h:'Сервис отвечает 500. Где искать причину в первую очередь?',o:['В логах приложения','В настройках браузера','В DNS','В расписании cron'],a:0,ex:'5xx — ошибка внутри сервера. Стектрейс почти всегда в логе приложения.'},
  {t:'quiz',h:'Код 429 Too Many Requests — это...',o:['Сработал rate limit','Сервер перегрет','Ошибка базы','Истёк сертификат'],a:0,ex:'Клиент упёрся в лимит запросов. Решение на стороне клиента: backoff и повтор.'},
 ]},
 l6:{title:'Первый контейнер',xp:20,setup:baseWorld,steps:[
  {t:'learn',h:'Контейнер: приложение в коробке',p:'Образ (image) — шаблон с приложением и всеми зависимостями. Контейнер — запущенный экземпляр образа. Один образ, сколько угодно контейнеров.'},
  {t:'task',h:'Что запущено?',p:'Посмотри запущенные контейнеры: `docker ps`.',hint:'docker ps',check:(W,c)=>c.some(x=>/^docker\s+ps/.test(x))},
  {t:'quiz',h:'Образ относится к контейнеру как...',o:['Класс к объекту','Папка к файлу','Сервер к сети','Логин к паролю'],a:0,ex:'Из одного класса создаются объекты, из одного образа — контейнеры.'},
  {t:'task',h:'Запусти nginx',p:'Запусти nginx в фоне с именем `web`, пробросив порт 8080 хоста на 80 контейнера:\n`docker run -d --name web -p 8080:80 nginx`',hint:'docker run -d --name web -p 8080:80 nginx',check:W=>W.containers.some(x=>x.name==='web'&&x.up&&x.hp==='8080')},
  {t:'task',h:'Проверь',p:'Сайт из контейнера должен отвечать на 8080: `curl localhost:8080`.',hint:'curl localhost:8080',check:W=>W.f.curl&&W.f.curl.ok&&W.f.curl.port===8080},
 ]},
 l7:{title:'Контейнер падает',xp:25,setup:()=>{const W=baseWorld();W.containers.push({id:'3f9a1c7e2b10',name:'api',image:'api:1.0',up:false,code:1,hp:'',env:{},logs:'api v1.0 starting...\nFATAL: environment variable DATABASE_URL is required'});return W},steps:[
  {t:'learn',h:'Команда собрала образ api:1.0',p:'Его запустили, но сервис не отвечает. Разберись.'},
  {t:'task',h:'Найди контейнер',p:'`docker ps` показывает только запущенные. Чтобы увидеть все, добавь флаг `-a`.',hint:'docker ps -a',check:(W,c)=>c.some(x=>/^docker\s+ps\s+(-a|--all)/.test(x))},
  {t:'task',h:'Почему умер?',p:'Статус Exited (1). Почитай логи: `docker logs api`.',hint:'docker logs api',check:W=>W.f.dlogs==='api'},
  {t:'quiz',h:'Как передать переменную окружения в контейнер?',o:['-e DATABASE_URL=...','-p DATABASE_URL=...','--name DATABASE_URL','Никак, только пересобрать образ'],a:0,ex:'-e задаёт переменную окружения при запуске. Пересобирать образ ради конфига не нужно.'},
  {t:'task',h:'Освободи имя',p:'Старый контейнер занимает имя `api`. Удали его: `docker rm api`.',hint:'docker rm api',check:W=>!W.containers.find(x=>x.name==='api'&&x.image==='api:1.0'&&!x.env.DATABASE_URL)},
  {t:'task',h:'Запусти правильно',p:'Запусти заново с переменной:\n`docker run -d --name api -e DATABASE_URL=postgres://db:5432/app api:1.0`',hint:'docker run -d --name api -e DATABASE_URL=postgres://db:5432/app api:1.0',check:W=>W.containers.some(x=>x.name==='api'&&x.up&&x.env.DATABASE_URL)},
 ]},
 l8:{title:'Поды и деплойменты',xp:20,setup:()=>k8sWorld(baseWorld(),{web:{replicas:2,image:'web:1.4',ok:true,load:60},api:{replicas:2,image:'api:2.3',ok:true,load:80}}),steps:[
  {t:'learn',h:'Kubernetes делает рутину за тебя',p:'**Pod** — минимальная единица, один или несколько контейнеров. **Deployment** следит, чтобы нужное число подов всегда работало, и обновляет их без простоя.'},
  {t:'task',h:'Поды',p:'Посмотри поды: `kubectl get pods`.',hint:'kubectl get pods',check:(W,c)=>c.some(x=>/^(kubectl|k)\s+get\s+po/.test(x))},
  {t:'task',h:'Деплойменты',p:'Теперь деплойменты: `kubectl get deploy`.',hint:'kubectl get deploy',check:(W,c)=>c.some(x=>/^(kubectl|k)\s+get\s+deploy/.test(x))},
  {t:'quiz',h:'Ты удалил под, которым управляет Deployment. Что произойдёт?',o:['Deployment создаст новый под','Приложение навсегда потеряет реплику','Удалится весь Deployment','Кластер перезагрузится'],a:0,ex:'Deployment постоянно сверяет желаемое и текущее состояние. Подов меньше, чем надо — создаёт новый.'},
  {t:'task',h:'Проверь на практике',p:'Удали любой под web: `kubectl delete pod <имя>`. Потом снова `kubectl get pods`.',hint:'Имя возьми из kubectl get pods. Tab дополняет имена.',check:W=>W.f.kdelAt!=null&&W.hist.slice(W.f.kdelAt+1).some(h=>/get\s+po/.test(h))},
 ]},
 l9:{title:'CrashLoopBackOff',xp:25,setup:()=>k8sWorld(baseWorld(),{web:{replicas:2,image:'web:1.4',ok:true,load:60},api:{replicas:3,image:'api:2.4',ok:false,prev:'api:2.3',load:90}}),steps:[
  {t:'learn',h:'Час назад выкатили api:2.4',p:'Пришёл алерт: поды api перезапускаются по кругу. Пользователи получают ошибки.'},
  {t:'task',h:'Оцени масштаб',p:'Посмотри поды: `kubectl get pods`.',hint:'kubectl get pods',check:(W,c)=>c.some(x=>/get\s+po/.test(x))},
  {t:'task',h:'Логи упавшего пода',p:'Почитай логи любого пода api: `kubectl logs <имя>`.',hint:'kubectl logs api-… (Tab дополняет имя)',check:W=>W.f.klogsBad},
  {t:'quiz',h:'Прод лежит. Что сделать первым?',o:['Откатить деплой на прошлую версию','Чинить конфиг прямо в проде','Удалять поды, пока не заработает','Ждать, вдруг само пройдёт'],a:0,ex:'Сначала восстанови сервис, потом разбирайся. Откат — самый быстрый и проверенный путь.'},
  {t:'task',h:'Откат',p:'Откати деплой: `kubectl rollout undo deployment/api`. Потом смотри `kubectl get pods`, пока все api не станут Running.',hint:'kubectl rollout undo deployment/api, затем kubectl get pods пару раз',check:W=>W.k8s.deploys.api.ok&&W.k8s.pods.filter(p=>p.app==='api').every(p=>p.status==='Running')},
 ]},
 l10:{title:'Масштабирование',xp:20,setup:()=>k8sWorld(baseWorld(),{web:{replicas:2,image:'web:1.4',ok:true,load:190},api:{replicas:2,image:'api:2.3',ok:true,load:70}}),steps:[
  {t:'learn',h:'Вечер пятницы',p:'Трафик вырос в три раза. Два пода web не вытягивают нагрузку.'},
  {t:'task',h:'Найди узкое место',p:'Посмотри нагрузку на поды: `kubectl top pods`.',hint:'kubectl top pods',check:(W,c)=>c.some(x=>/top\s+po/.test(x))},
  {t:'task',h:'Добавь реплик',p:'Увеличь web хотя бы до 4 подов: `kubectl scale deployment/web --replicas=5`.',hint:'kubectl scale deployment/web --replicas=5',check:W=>W.k8s.deploys.web.replicas>=4},
  {t:'quiz',h:'HPA в Kubernetes — это...',o:['Автомасштабирование подов по метрикам','Балансировщик HTTP','Хранилище паролей','Резервная копия кластера'],a:0,ex:'Horizontal Pod Autoscaler сам меняет число реплик по CPU или своим метрикам.'},
  {t:'quiz',h:'Почему не поставить сразу 100 реплик?',o:['Каждый под потребляет ресурсы и стоит денег','Kubernetes запрещает больше 10','Поды начнут драться за порт','Это замедлит DNS'],a:0,ex:'Лишние реплики — прямые деньги за железо. Задача DevOps — столько, сколько нужно, не больше.'},
 ]},
 l11:{title:'Свой автоскейлер',xp:30,steps:[
  {t:'learn',h:'Хватит скейлить руками',p:'Скрипт запускается каждую игровую минуту. Он получает `cluster`: в `cluster.services` лежат сервисы с полями `name`, `replicas`, `util` (нагрузка от 0 до 1+). Чтобы поменять число реплик, вызывай `cluster.scale(имя, n)`.'},
  {t:'script',h:'Напиши правило',p:'Если `util` больше 0.8 — добавь одну реплику. Если меньше 0.3 и реплик больше одной — убери одну.',
   starter:'for (const s of cluster.services) {\n  // твой код\n  \n}\n',
   cases:[
    {name:'db перегружен (util 0.95, 2 реплики) → 3',data:{services:[{name:'db',replicas:2,util:.95,pods:[]}]},expect:c=>c.some(x=>x.t==='scale'&&x.n==='db'&&x.r===3)&&c.length===1},
    {name:'api в норме (util 0.5) → ничего не трогать',data:{services:[{name:'api',replicas:2,util:.5,pods:[]}]},expect:c=>c.length===0},
    {name:'worker простаивает (util 0.1, 3 реплики) → 2',data:{services:[{name:'worker',replicas:3,util:.1,pods:[]}]},expect:c=>c.some(x=>x.t==='scale'&&x.n==='worker'&&x.r===2)&&c.length===1},
    {name:'auth простаивает, но реплика одна → не трогать',data:{services:[{name:'auth',replicas:1,util:.05,pods:[]}]},expect:c=>c.length===0},
   ]},
  {t:'quiz',h:'Новый под стартует 3 минуты, а скрипт срабатывает каждую. Что сделает простое правило «+1»?',o:['Насоздаёт лишних реплик, пока поды стартуют','Ничего плохого','Удалит все поды','Сломает базу'],a:0,ex:'Пока новый под не готов, util всё ещё высокий, и скрипт добавляет ещё. Поэтому у HPA есть окно стабилизации (cooldown). Пригодится на боевом дежурстве.'},
 ]},
 l12:{title:'Автохил',xp:30,steps:[
  {t:'learn',h:'Поды тоже болеют',p:'У каждого сервиса есть `pods`: массив объектов с полями `name`, `status`, `mem` (память в % от лимита). Удалить под можно через `cluster.restart(имя)`, Deployment создаст новый.'},
  {t:'script',h:'Лечи автоматически',p:'Удали все поды в статусе `CrashLoopBackOff` и все поды с `mem` больше 90. Остальные не трогай.',
   starter:'for (const s of cluster.services) {\n  for (const p of s.pods) {\n    // твой код\n  }\n}\n',
   cases:[
    {name:'под в CrashLoopBackOff → удалить',data:{services:[{name:'api',replicas:2,util:.5,pods:[{name:'api-a',status:'Running',mem:40},{name:'api-b',status:'CrashLoopBackOff',mem:0}]}]},expect:c=>c.length===1&&c[0].t==='restart'&&c[0].p==='api-b'},
    {name:'утечка памяти (mem 96) → удалить',data:{services:[{name:'worker',replicas:1,util:.4,pods:[{name:'worker-x',status:'Running',mem:96}]}]},expect:c=>c.length===1&&c[0].p==='worker-x'},
    {name:'здоровые поды и mem ровно 90 → не трогать',data:{services:[{name:'db',replicas:2,util:.6,pods:[{name:'db-1',status:'Running',mem:90},{name:'db-2',status:'Running',mem:30}]}]},expect:c=>c.length===0},
    {name:'под ещё создаётся → не трогать',data:{services:[{name:'auth',replicas:1,util:.2,pods:[{name:'auth-n',status:'Creating',mem:5}]}]},expect:c=>c.length===0},
   ]},
  {t:'quiz',h:'Что в настоящем Kubernetes перезапускает зависший контейнер?',o:['liveness probe','readiness probe','ConfigMap','Ingress'],a:0,ex:'liveness probe — «жив ли ты?». Не отвечает — kubelet перезапускает контейнер. readiness решает, слать ли на под трафик.'},
 ]},
 l14:{title:'Пайплайн покраснел',xp:30,setup:repoWorld,steps:[
  {t:'learn',h:'CI проверяет каждый коммит',p:'Continuous Integration: каждая правка автоматически собирается и прогоняется тестами. Красный пайплайн значит, что в main что-то сломалось и деплоить нельзя.'},
  {t:'task',h:'Что с пайплайном?',p:'Посмотри последние запуски: `gh run list`.',hint:'gh run list',check:(W,c)=>c.some(x=>/^gh\s+run\s+list/.test(x))},
  {t:'task',h:'Логи упавшего шага',p:'Последний запуск упал. Открой логи: `gh run view 4821 --log-failed`.',hint:'gh run view 4821 --log-failed',check:W=>W.f.ghlog},
  {t:'quiz',h:'В чём причина?',o:['Пайплайн собирает на Node 16, а проект требует Node 20+','Упали юнит-тесты','Нет доступа к npm registry','Кончился диск на раннере'],a:0,ex:'npm ci отказался ставить зависимости: в package.json engines node >=20, а раннер на 16. Коммит «bump engines» сломал CI ещё два запуска назад.'},
  {t:'edit',h:'Почини пайплайн',p:'Поменяй версию в `node-version` на 20 или новее.',file:'.github/workflows/ci.yml',path:'/home/dev/app/.github/workflows/ci.yml',hint:'Строка `node-version: 16` → `node-version: 20`.',
   checks:[{name:'Node 20 или новее',test:t=>/node-version:\s*['"]?(2\d|[3-9]\d)\b/.test(t)},{name:'Структура на месте: jobs, test, steps',test:t=>/jobs:/.test(t)&&/test:/.test(t)&&/steps:/.test(t)}],
   onSave:W=>{if(!W.git.modified.includes('.github/workflows/ci.yml'))W.git.modified.push('.github/workflows/ci.yml')},done:'Файл сохранён. Теперь его надо доставить в репозиторий.'},
  {t:'task',h:'Закоммить и запушь',p:'`git add .`, затем `git commit -m "ci: node 20"`, затем `git push`. После этого смотри `gh run list`, пока новый запуск не станет success. Посмотреть свою правку можно через `git diff`.',hint:'git add . → git commit -m "ci: node 20" → git push → gh run list (пару раз)',check:W=>W.ci.runs[0].id>4821&&W.ci.runs[0].status==='success'},
  {t:'quiz',h:'Зачем фиксировать версию Node в пайплайне?',o:['Чтобы сборка была воспроизводимой','Чтобы пайплайн работал быстрее','GitHub без этого не запустит job','Чтобы не платить за раннер'],a:0,ex:'Явная версия гарантирует, что CI собирает так же, как прод. «Какая есть на раннере» однажды обновится без спроса.'},
 ]},
 l15:{title:'Безопасный деплой',xp:25,steps:[
  {t:'learn',h:'CD: код сам едет в прод',p:'Continuous Delivery: после зелёных тестов пайплайн деплоит сам. Две классические дыры: деплой, который не ждёт тестов, и токены, вписанные прямо в репозиторий.'},
  {t:'quiz',h:'Где хранить токен для деплоя?',o:['В секретах CI, вне репозитория','В .env, закоммиченном в репозиторий','Прямо в YAML пайплайна','В README, чтобы команда знала'],a:0,ex:'Секреты CI шифруются и подставляются только во время запуска. Всё, что попало в git, считай опубликованным.'},
  {t:'edit',h:'Исправь деплой',p:'Сделай три вещи: job `deploy` должен ждать тесты (`needs: test`), запускаться только из main (`if: github.ref == \'refs/heads/main\'`) и брать токен из секретов (`${{ secrets.KUBE_TOKEN }}`).',file:'.github/workflows/deploy.yml',
   starter:"name: deploy\non:\n  push:\n    branches: [main, develop]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci && npm test\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: kubectl set image deployment/shop shop=registry.local/shop:${{ github.sha }}\n        env:\n          KUBE_TOKEN: eyJhbGciOiJSUzI1NiIsImtpZCI6Ik1rZ2...\n",
   hint:'Под `deploy:` добавь строки `    needs: test` и `    if: github.ref == \'refs/heads/main\'`, а значение KUBE_TOKEN замени на `${{ secrets.KUBE_TOKEN }}`.',
   checks:[{name:'deploy ждёт тесты (needs: test)',test:t=>/deploy:[\s\S]*needs:\s*\[?\s*['"]?test/.test(t)},{name:'Деплой только из main',test:t=>/if:.*github\.ref\s*==\s*['"]refs\/heads\/main['"]/.test(t)},
    {name:'Токен берётся из секретов, в файле его нет',test:t=>/KUBE_TOKEN:\s*\$\{\{\s*secrets\.\w+\s*\}\}/.test(t)&&!/eyJhbGci/.test(t)},{name:'Job test на месте',test:t=>/\n\s+test:/.test(t)}],done:'Теперь в прод едет только протестированный main, а токен не лежит в git.'},
  {t:'quiz',h:'Canary-деплой — это...',o:['Новая версия сначала получает малую долю трафика, а ты следишь за метриками','Деплой только по ночам','Деплой без тестов для скорости','Откат на прошлую версию'],a:0,ex:'Если 5% пользователей на новой версии видят ошибки, ты откатываешь, не задев остальных 95%.'},
  {t:'quiz',h:'Токен уже попал в git-историю. Что делать?',o:['Отозвать токен и выпустить новый','Удалить файл новым коммитом','Сделать репозиторий приватным','Ничего, никто не заметит'],a:0,ex:'Новый коммит не стирает историю, а боты сканируют GitHub на утёкшие токены за минуты. Только отзыв.'},
 ]},
 l16:{title:'Метрики и PromQL',xp:25,setup:()=>{const W=baseWorld();W.prom=true;return W},steps:[
  {t:'learn',h:'Prometheus видит всё',p:'Prometheus каждые 15 секунд опрашивает сервисы и хранит метрики. Спрашивать его можно на языке PromQL. В этом терминале запрос пишется так: `query <выражение>`.'},
  {t:'task',h:'Кто жив?',p:'Метрика `up` равна 1, если Prometheus достучался до цели, и 0, если нет. Выполни `query up`.',hint:'query up',check:W=>W.f.qup},
  {t:'quiz',h:'up = 0 у api-2 значит...',o:['Prometheus не может опросить цель: под лежит или недоступен','api-2 обработал 0 запросов','api-2 только что задеплоен','Это нормально для API'],a:0,ex:'up — первое, что проверяют: без него остальные метрики цели просто пропадают с графиков.'},
  {t:'task',h:'Кто сыпет ошибками?',p:'Счётчик `http_requests_total` только растёт, поэтому смотрят скорость: `query rate(http_requests_total{status=~"5.."}[5m])`.',hint:'query rate(http_requests_total{status=~"5.."}[5m])',check:W=>W.f.q5xx},
  {t:'quiz',h:'Какой инстанс отдаёт 5xx?',o:['api-1','api-0','api-2','db-0'],a:0,ex:'Почти 6 ошибок в секунду у api-1 против 0.02 у api-0. api-2 лежит целиком, это видно по up.'},
  {t:'quiz',h:'Четыре золотых сигнала SRE:',o:['Latency, Traffic, Errors, Saturation','CPU, RAM, Disk, Network','Uptime, Downtime, MTTR, MTBF','Logs, Traces, Metrics, Events'],a:0,ex:'Из книги Google SRE: задержка, трафик, ошибки, насыщение. Если следишь за ними, большинство проблем видно сразу.'},
 ]},
 l17:{title:'Алерты без спама',xp:25,steps:[
  {t:'learn',h:'Хороший алерт будит только по делу',p:'Если алерт срабатывает от каждой единичной ошибки, через неделю его перестанут читать. Это alert fatigue, и однажды из-за неё пропустят настоящий инцидент.'},
  {t:'quiz',h:'Зачем в правиле алерта `for: 5m`?',o:['Сработать, только если условие держится 5 минут','Проверять правило раз в 5 минут','Слать алерт 5 минут подряд','Хранить алерт 5 минут'],a:0,ex:'Короткие всплески проходят сами. for отсекает их и будит только при устойчивой проблеме.'},
  {t:'edit',h:'Почини правило',p:'Сейчас алерт срабатывает на любую ошибку. Сделай так: порог по доле ошибок (например `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05`), добавь `for` от 2 до 15 минут, severity `critical` и `annotations` с `summary`.',file:'rules/alerts.yml',
   starter:"groups:\n  - name: shop\n    rules:\n      - alert: HighErrorRate\n        expr: rate(http_requests_total{status=~\"5..\"}[1m]) > 0\n        labels:\n          severity: info\n",
   hint:'Пример готового правила:\n`expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05`\n`for: 5m`, в labels `severity: critical`, ниже `annotations:` и `summary: "5xx выше 5%"`',
   checks:[{name:'Порог считает долю ошибок, а не любую ошибку',test:t=>{const e=(t.split(/expr:/)[1]||'').split(/\n\s*(for|labels|annotations):/)[0];return e.includes('/')&&/>\s*0?\.\d+/.test(e)}},
    {name:'for от 2 до 15 минут',test:t=>/\n\s+for:\s*([2-9]|1[0-5])m\b/.test(t)},{name:'severity: critical',test:t=>/severity:\s*['"]?(critical|page)/.test(t)},{name:'annotations с summary',test:t=>/annotations:\s*\n\s+summary:\s*\S/.test(t)}],done:'Такой алерт разбудит только тогда, когда пользователи правда страдают.'},
  {t:'quiz',h:'Диск заполнен на 70% и растёт на 1% в неделю. Как алертить?',o:['Тикет в бэклог, а не ночной вызов','Будить дежурного немедленно','Никак не алертить','Перезагрузить сервер'],a:0,ex:'До проблемы месяцы. Будить человека стоит, только если без него сломается в ближайшие часы.'},
  {t:'quiz',h:'Алерт срабатывает 40 раз за ночь и всегда сам проходит. Что делать?',o:['Поправить порог или удалить алерт','Добавить второго дежурного','Отключить звук на телефоне','Ничего, так и должно быть'],a:0,ex:'Алерт, который не требует действий, вредит: учит игнорировать пейджер.'},
 ]},
 l13:{title:'Ночная смена',xp:60,boss:true},
};
export const ORDER=UNITS.flatMap(u=>u.lessons);
export const unitOf=id=>UNITS.find(u=>u.lessons.includes(id));
export const unlocked=id=>{const i=ORDER.indexOf(id);return i===0||S.done[ORDER[i-1]]};
export const nextLesson=()=>ORDER.find(id=>!S.done[id]);
