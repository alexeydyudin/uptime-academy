import { baseWorld, dnsWorld } from '../worlds';
import type { World, Lesson } from '../../engine/types';

export const netLessons: Record<string, Lesson> = {
 l21:{title:'DNS и /etc/hosts',xp:25,setup:dnsWorld,steps:[
  {t:'lecture',pages:[
   {h:'Как имя превращается в адрес',p:'Компьютеры общаются по IP-адресам, люди помнят имена. Перед каждым запросом система ищет адрес: сначала в файле /etc/hosts, потом спрашивает DNS-сервер.',code:'curl shop.local\n  │\n  ├─ 1. /etc/hosts   ← есть запись? берём её, DNS не спрашиваем\n  └─ 2. DNS-сервер   ← A-запись shop.local → 10.0.0.15\n  │\n  └─ TCP на 10.0.0.15:80 → HTTP-запрос'},
   {h:'Инструменты диагностики',code:'dig shop.local             # что отвечает DNS\ndig +short shop.local      # только адрес\ngetent hosts shop.local    # что видит система (вместе с /etc/hosts)\ncurl -v http://shop.local  # куда реально подключаемся\nss -tlnp                   # какие порты слушает этот сервер',terms:[['A-запись','имя → IPv4-адрес'],['TTL','сколько секунд ответ DNS можно кешировать'],['NXDOMAIN','такого имени не существует']]}]},
  {t:'task',h:'Воспроизведи',p:'Пользователи открывают shop.local без проблем, а скрипты на prod-web-01 падают по таймауту. Проверь доступность сайта с этого сервера.',hints:['HTTP-запрос из терминала — curl.','curl <имя сайта>','curl shop.local'],sol:['curl shop.local'],
   done:'Таймаут: соединение не устанавливается. Интересно, куда вообще стучится curl.',check:W=>W.f.curlHost==='shop.local'},
  {t:'task',h:'Спроси DNS',p:'Узнай, какой IP-адрес у shop.local по данным DNS.',hints:['Классический инструмент — dig.','dig <имя> или nslookup <имя>','dig shop.local'],sol:['dig shop.local'],
   done:'DNS отвечает 10.0.0.15, и у пользователей всё работает. Значит, дело в самом сервере.',check:W=>W.f.dig==='shop.local'},
  {t:'task',h:'Куда идёт curl?',p:'Посмотри подробно, к какому адресу на самом деле подключается curl.',hints:['У curl есть подробный режим.','curl -v <адрес>','curl -v shop.local'],sol:['curl -v shop.local'],
   done:'Trying 10.0.0.99 — это не тот адрес, что в DNS. Его подменили локально.',check:W=>W.f.curlV},
  {t:'quiz',h:'Почему curl идёт на 10.0.0.99, если DNS отвечает 10.0.0.15?',o:['Запись в /etc/hosts имеет приоритет над DNS','DNS-кеш браузера','curl не умеет DNS','Сломан DNS-сервер'],a:0,ex:'Система сначала смотрит /etc/hosts. Временная запись с переезда так и осталась — классика.'},
  {t:'edit',h:'Убери старую запись',p:'Удали или закомментируй устаревшую строку для shop.local в /etc/hosts. Остальные записи не трогай.',file:'/etc/hosts',path:'/etc/hosts',hint:'Поставь # в начало строки `10.0.0.99 shop.local` или удали её.',
   checks:[{name:'shop.local больше не указывает на 10.0.0.99',test:t=>!t.split('\n').some(l=>/^\s*10\.0\.0\.99\b.*shop\.local/.test(l))},{name:'localhost на месте',test:t=>/^\s*127\.0\.0\.1\s+localhost/m.test(t)}],
   sample:'127.0.0.1   localhost\n127.0.1.1   prod-web-01\n',done:'Теперь имя резолвится через DNS.'},
  {t:'task',h:'Проверь',p:'Убедись, что сайт с сервера открывается.',hints:['Тот же запрос, что в начале.','curl <имя>','curl shop.local'],sol:['curl shop.local'],
   done:'200 OK. В разборе стоит записать правило: временные записи в /etc/hosts — только с датой и тикетом на удаление.',check:W=>W.f.curlOk==='shop.local'},
  {t:'quiz',h:'Ты поменял A-запись в DNS, а часть пользователей ещё час ходит на старый адрес. Почему?',o:['Старый ответ закеширован на время TTL','DNS обновляется раз в сутки','Нужно перезагрузить сервер','Пользователи не почистили cookies'],a:0,ex:'Резолверы кешируют ответ на TTL секунд. Перед переездом TTL заранее снижают, например до 60 секунд.'},
 ]},
 l5:{title:'HTTP и порты',xp:15,setup:baseWorld,steps:[
  {t:'lecture',pages:[{h:'HTTP за одну карточку',p:'Клиент отправляет запрос (метод, путь, заголовки), сервер отвечает кодом статуса и телом. По первой цифре кода видно, чья проблема.',code:'2xx  успех             200 OK, 201 Created\n3xx  перенаправление   301, 302, 304\n4xx  ошибка клиента    400, 401, 403, 404, 429\n5xx  ошибка сервера    500, 502, 503, 504'},
     {h:'Порты',p:'IP-адрес — это дом, порт — квартира. Один сервер слушает много портов, у каждого сервиса свой.',code:'22    SSH\n80    HTTP\n443   HTTPS\n5432  PostgreSQL\n6379  Redis\n9090  Prometheus',terms:[['502','прокси не получил нормального ответа от бэкенда'],['503','сервис недоступен (часто — нет живых подов)'],['504','бэкенд не успел ответить']]}]},
  {t:'quiz',h:'Пользователи видят 502 Bad Gateway. Что это значит?',o:['Прокси (nginx) не получил нормальный ответ от бэкенда','У пользователя нет интернета','Страница не найдена','Сервер требует пароль'],a:0,ex:'502 отдаёт прокси, когда сервис за ним упал или отвечает мусором.'},
  {t:'quiz',h:'Стандартный порт HTTPS?',o:['443','80','22','8080'],a:0,ex:'80 — HTTP, 443 — HTTPS, 22 — SSH.'},
  {t:'quiz',h:'Как проверить, что слушает порт 80?',o:['ss -tlnp | grep :80','ping 80','ls /port/80','cat :80'],a:0,ex:'ss показывает открытые сокеты: -t TCP, -l слушающие, -n цифрами, -p с процессом.'},
  {t:'quiz',h:'Код 404 означает...',o:['Ресурс не найден','Сервер упал','Нет доступа','Слишком много запросов'],a:0,ex:'4xx — ошибка на стороне запроса. 404 — такого пути нет.'},
  {t:'quiz',h:'Сервис отвечает 500. Где искать причину в первую очередь?',o:['В логах приложения','В настройках браузера','В DNS','В расписании cron'],a:0,ex:'5xx — ошибка внутри сервера. Стектрейс почти всегда в логе приложения.'},
  {t:'quiz',h:'Код 429 Too Many Requests — это...',o:['Сработал rate limit','Сервер перегрет','Ошибка базы','Истёк сертификат'],a:0,ex:'Клиент упёрся в лимит запросов. Решение на стороне клиента: backoff и повтор.'},
 ]},
 l4:{title:'nginx лёг в 3 ночи',xp:30,setup:()=>{const W=baseWorld();W.svc.nginx={active:false};W.disk=100;W.procs=W.procs.filter(p=>!p.cmd.startsWith('nginx'));
   W.files['/var/log/nginx/error.log']='2026/10/21 03:11:58 [crit] write() to "/var/log/nginx/access.log" failed (28: No space left on device)\n2026/10/21 03:12:01 [emerg] open() "/run/nginx.pid" failed (28: No space left on device)';
   W.files['/var/log/old/app-2025.log.1']='...';W.sizes['/var/log/old/app-2025.log.1']='38G';W.files['/var/log/old/readme.txt']='старые логи, кто-нибудь почистите';return W},steps:[
  {t:'lecture',pages:[{h:'Как дежурный разбирает инцидент',p:'Не чинить наугад. Порядок всегда один: подтвердить симптом → найти причину по логам и метрикам → исправить → проверить → записать.',code:'симптом      curl localhost\nсостояние    systemctl status nginx\nпричина      journalctl -u nginx, /var/log/nginx/error.log\nресурсы      df -h, du -sh /var/log/*\nисправление  systemctl restart nginx\nпроверка     curl localhost'},
     {h:'Диск',p:'Заполненный диск — одна из самых частых причин ночных падений: сервисы не могут писать логи, PID-файлы и временные данные.',terms:[['df -h','занятость разделов'],['du -sh папка/*','что именно занимает место'],['logrotate','ротация и сжатие старых логов по расписанию']]}]},
  {t:'task',h:'Симптом',p:'Проверь, отвечает ли сайт на самом сервере.',hints:['HTTP-запрос из терминала делает curl.','curl <адрес>','curl localhost'],sol:['curl localhost'],
   done:'Connection refused значит, что на порту 80 вообще никто не слушает: сервис не тормозит, а лежит.',check:(W,c)=>c.some(x=>/(^|&&\s*)curl\b/.test(x))},
  {t:'task',h:'Статус сервиса',p:'Узнай, в каком состоянии сервис nginx.',hints:['Сервисами в Linux управляет systemd, команда systemctl.','systemctl status <сервис>','systemctl status nginx'],sol:['systemctl status nginx'],
   done:'failed (exit-code): процесс упал при старте. Причина почти всегда в логе.',check:(W,c)=>c.some(x=>/systemctl\s+status\s+nginx/.test(x))},
  {t:'task',h:'Причина',p:'Найди причину падения в логах nginx.',hints:['Логи nginx лежат в /var/log/nginx/. Ещё можно спросить журнал systemd.','cat /var/log/nginx/error.log или journalctl -u nginx','cat /var/log/nginx/error.log'],sol:['cat /var/log/nginx/error.log'],
   done:'No space left on device — диск заполнен. nginx не может записать даже свой PID-файл.',check:W=>W.f.read['/var/log/nginx/error.log']},
  {t:'task',h:'Проверь диск',p:'Проверь, насколько заполнены диски.',hints:['disk free — df.','df с флагом человекочитаемых размеров','df -h'],sol:['df -h'],
   done:'Use% 100% на / — корневой раздел забит до отказа.',check:(W,c)=>c.some(x=>/(^|&&\s*|sudo\s+)df\b/.test(x))},
  {t:'task',h:'Освободи место',p:'Найди, что съело место в /var/log, и удали ненужное. Старые логи из /var/log/old больше не нужны.',hints:['du показывает размер папок, ls -lh — размеры файлов.','du -sh /var/log/* , потом ls -lh /var/log/old и rm <файл>','rm /var/log/old/app-2025.log.1'],sol:['du -sh /var/log/*','rm /var/log/old/app-2025.log.1'],
   done:'38 ГБ старого лога. Корневая причина — не настроена ротация логов (logrotate), иначе файл давно бы сжался и удалился.',check:W=>W.disk<100},
  {t:'task',h:'Подними и проверь',p:'Запусти nginx снова и убедись, что сайт отвечает.',hints:['Перезапуск тоже через systemctl.','systemctl restart <сервис>, затем снова curl','systemctl restart nginx && curl localhost'],sol:['systemctl restart nginx && curl localhost'],
   done:'Полный цикл дежурного: симптом → причина → исправление → проверка. Без проверки инцидент не закрыт.',check:W=>W.svc.nginx.active&&W.f.curl&&W.f.curl.ok&&W.f.curl.port===80},
  {t:'quiz',h:'Как не допустить этого снова?',o:['Настроить logrotate и алерт на диск > 85%','Каждую ночь перезагружать сервер','Выключить логирование','Купить диск в 10 раз больше'],a:0,ex:'Корневая причина — старые логи никто не удалял. Ротация логов плюс ранний алерт на заполнение диска закрывают её.'},
 ]}
};
