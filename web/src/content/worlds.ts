import { kPod } from '../engine/world';
import { CI_PATH } from '../engine/shell/git';
import type { World, Deploy, K8s } from '../engine/types';

export const APP_LOG=['08:00:01 INFO  api started on :8080','08:00:02 INFO  connected to db','08:14:22 INFO  GET /orders 200 31ms','08:14:25 WARN  slow query 1200ms','08:15:02 ERROR db connection timeout after 30s','08:15:03 INFO  retry 1/3','08:15:09 INFO  GET /orders 200 54ms','08:31:44 ERROR db connection timeout after 30s','08:31:45 INFO  retry 1/3','08:40:10 INFO  GET /cart 200 22ms','08:52:13 WARN  pool exhausted, waiting','08:52:43 ERROR db connection timeout after 30s','08:53:00 INFO  GET /profile 200 18ms'].join('\n');
export function baseWorld(): World {
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
    svc:{nginx:{active:true}},disk:41,containers:[],images:['nginx:1.27','api:1.0','postgres:16'],k8s:null as unknown as K8s,hist:[],f:{read:{}}};
}
export function k8sWorld(W: World, deploys: Record<string, Deploy>): World {W.k8s={deploys,pods:[]};for(const[n,d]of Object.entries(deploys)){for(let i=0;i<d.replicas;i++)W.k8s.pods.push(kPod(n,d.ok?'Running':'CrashLoopBackOff',d.ok?0:4+i))}return W}
export function repoWorld(): World {const W=baseWorld();['/home/dev/app','/home/dev/app/.github','/home/dev/app/.github/workflows','/home/dev/app/src'].forEach(d=>W.dirs.add(d));
  W.files[CI_PATH]="name: ci\non:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 16\n      - run: npm ci\n      - run: npm test\n";
  W.files['/home/dev/app/package.json']='{\n  "name": "uptime-shop",\n  "version": "1.4.0",\n  "engines": { "node": ">=20" },\n  "scripts": { "test": "vitest run" }\n}';
  W.files['/home/dev/app/src/cart.js']='export const discount = (sum) => sum > 10000 ? sum * 0.9 : sum;';
  W.orig={[CI_PATH]:W.files[CI_PATH]};W.cwd='/home/dev/app';
  W.git={modified:[],staged:[],ahead:0,log:[{h:'9c41e02',msg:'feat: add cart discounts'},{h:'1b7d3aa',msg:'chore: bump engines to node 20'},{h:'f02e9c1',msg:'fix: cart total rounding'}]};
  W.ci={runs:[{id:4821,status:'failure',title:'feat: add cart discounts'},{id:4820,status:'failure',title:'chore: bump engines to node 20'},{id:4819,status:'success',title:'fix: cart total rounding'}]};
  return W}
export function permWorld(): World {const W=baseWorld();W.modes={};W.owners={};
  W.files['/home/dev/deploy.sh']='#!/bin/bash\necho "Деплой shop v1.4 начат..."\necho "Готово: 3 пода обновлены"';W.modes['/home/dev/deploy.sh']='644';
  W.dirs.add('/etc/shop');W.owners['/etc/shop']='root:root';W.files['/etc/shop/db.env']='DB_USER=shop\nDB_PASSWORD=S3cr3t-prod-pass';W.modes['/etc/shop/db.env']='644';W.owners['/etc/shop/db.env']='root:root';return W}
export function svcWorld(): World {const W=baseWorld();
  W.svc['node-exporter']={active:false,enabled:false,desc:'Prometheus Node Exporter',journal:'Oct 21 03:59:58 prod-web-01 systemd[1]: Stopping node-exporter.service - Prometheus Node Exporter...\nOct 21 03:59:58 prod-web-01 systemd[1]: Stopped node-exporter.service.\n-- Boot 7c1e4f0a9b2d4e8f --'};
  W.dirs.add('/var/spool');W.dirs.add('/var/spool/cron');W.files['/var/spool/cron/dev']='# м  ч  д  мес  дн_нед  команда\n';
  W.files['/home/dev/backup.sh']='#!/bin/bash\npg_dump shop | gzip > /backup/shop-$(date +%F).sql.gz';return W}
export function bashWorld(): World {const W=baseWorld();W.modes={};W.owners={};
  W.files['/home/dev/healthcheck.sh']='#!/usr/bin/env bash\n# Проверка здоровья shop. Запуск: ./healthcheck.sh\n# TODO: строгий режим, переменная URL, curl -f, OK или ERROR + exit 1\n';W.modes['/home/dev/healthcheck.sh']='644';return W}
export function dnsWorld(): World {const W=baseWorld();W.dns={'shop.local':'10.0.0.15','api.shop.local':'10.0.0.16','github.com':'140.82.121.4'};W.alive=['10.0.0.15','10.0.0.16','140.82.121.4'];
  W.files['/etc/hosts']='127.0.0.1   localhost\n127.0.1.1   prod-web-01\n10.0.0.99   shop.local   # временно, на время переезда (март)';return W}
export function gitWorld(): World {const W=baseWorld();const root='/home/dev/shop';W.dirs.add(root);W.cwd=root;
  W.files[root+'/config.yaml']='server:\n  port: 8080\napi:\n  timeout: 5s\n';W.files[root+'/README.md']='# Uptime Shop';
  W.g={root,branch:'main',branches:{main:[{h:'3e1a9c0',msg:'init: shop service'},{h:'7b2d4f1',msg:'feat: add cart api'}]},staged:[],modified:[],remote:['main'],upstream:{main:true},pushed:{main:2},ahead:0};return W}
export function conflictWorld(): World {const W=gitWorld(),G=W.g,b='feature/api-timeout';
  G.branches[b]=[...G.branches.main,{h:'c41f0e2',msg:'feat: api timeout 30s'}];G.branches.main=[...G.branches.main,{h:'9d8e7a3',msg:'feat: retries for api (Олег)'}];
  G.branch=b;G.remote.push(b);G.upstream[b]=true;G.pushed[b]=3;W.files[G.root+'/config.yaml']='server:\n  port: 8080\napi:\n  timeout: 30s\n';
  G.conflictOn=true;G.conflictText='server:\n  port: 8080\napi:\n<<<<<<< HEAD\n  timeout: 30s\n=======\n  timeout: 10s\n  retries: 3\n>>>>>>> main\n';return W}
export function dockerfileWorld(): World {const W=baseWorld();const root='/home/dev/shop';W.dirs.add(root);W.dirs.add(root+'/src');W.cwd=root;
  W.files[root+'/package.json']='{\n  "name": "uptime-shop",\n  "scripts": { "build": "tsc", "start": "node dist/server.js" }\n}';W.files[root+'/src/server.ts']='// API магазина';
  W.files[root+'/Dockerfile']='FROM node:latest\nWORKDIR /app\nCOPY . .\nRUN npm install\nRUN npm run build\nCMD npm start\n';W.imgInfo={};return W}
export function composeWorld(): World {const W=dockerfileWorld();W.images.push('shop:1.1');W.imgInfo['shop:1.1']={size:'168MB',froms:['node:22-alpine','node:22-alpine'],base:'node:22-alpine'};
  W.files['/home/dev/shop/compose.yaml']='services:\n  api:\n    image: shop:1.1\n    ports:\n      - "8080:8080"\n';return W}
export function tfWorld(): World {const W=baseWorld();const dir='/home/dev/infra';W.dirs.add(dir);W.cwd=dir;
  W.files[dir+'/main.tf']='provider "aws" {\n  region = "eu-central-1"\n}\n\nresource "aws_instance" "web" {\n  ami           = "ami-0a1b2c3d4e5f67890"\n  instance_type = "t3.micro"\n  tags = { Name = "shop-web" }\n}\n\nresource "aws_s3_bucket" "assets" {\n  bucket = "uptime-shop-assets"\n}\n';
  W.files[dir+'/terraform.tfstate']='{ "version": 4, "resources": [ "aws_instance.web" ] }';W.tf={dir,inited:false,state:{web:'t3.large',bucket:false},await:false};return W}
export function ansWorld(): World {const W=baseWorld();const dir='/home/dev/ansible';W.dirs.add(dir);W.cwd=dir;
  W.files[dir+'/inventory.ini']='[web]\nweb-1 ansible_host=10.0.0.21\nweb-2 ansible_host=10.0.0.22\n';
  W.files[dir+'/site.yml']='- name: Веб-серверы\n  hosts: all\n  tasks:\n    # TODO: установить nginx и запустить его с автозапуском\n';W.ans={dir,applied:false};return W}
export function svcK8sWorld(): World {const W=k8sWorld(baseWorld(),{web:{replicas:3,image:'web:1.4',ok:true,load:60}});W.k8s.svc={web:{selector:'shop-web',port:80,targetPort:8080}};
  const dir='/home/dev/k8s';W.dirs.add(dir);W.cwd=dir;W.files[dir+'/service.yaml']='apiVersion: v1\nkind: Service\nmetadata:\n  name: web\nspec:\n  selector:\n    app: shop-web\n  ports:\n    - port: 80\n      targetPort: 8080\n';return W}
export function cfgK8sWorld(): World {const W=k8sWorld(baseWorld(),{shop:{replicas:2,image:'shop:2.4',ok:true,load:50}});W.k8s.secrets={};const dir='/home/dev/k8s';W.dirs.add(dir);W.cwd=dir;
  W.files[dir+'/deployment.yaml']='apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: shop\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: shop\n  template:\n    metadata:\n      labels:\n        app: shop\n    spec:\n      containers:\n        - name: shop\n          image: shop:2.4\n          ports:\n            - containerPort: 8080\n          env:\n            - name: DB_PASSWORD\n              value: "S3cr3t-prod-pass"\n';return W}
export function helmWorld(): World {const W=k8sWorld(baseWorld(),{});W.helm={repos:{},rel:{}};return W}
export function trivyWorld(): World {const W=dockerfileWorld();const root='/home/dev/shop';
  W.files[root+'/Dockerfile']='FROM node:16 AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:16\nWORKDIR /app\nCOPY --from=build /app/dist ./dist\nCOPY --from=build /app/node_modules ./node_modules\nUSER node\nCMD ["node", "dist/server.js"]\n';
  W.images.push('shop:1.2');W.imgInfo['shop:1.2']={size:'412MB',froms:['node:16','node:16'],base:'node:16'};
  W.dirs.add(root+'/.github');W.dirs.add(root+'/.github/workflows');
  W.files[root+'/.github/workflows/ci.yml']='name: ci\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: docker build -t shop:${{ github.sha }} .\n      # TODO: сканирование образа\n      - run: docker push registry.local/shop:${{ github.sha }}\n';return W}
export function leakWorld(): World {const W=gitWorld();const root='/home/dev/shop';W.dirs.add(root+'/config');
  W.files[root+'/config/aws.js']='// Доступ к S3 для загрузки картинок\nconst AWS_REGION = "eu-central-1";\nconst AWS_KEY = "AKIAIOSFODNN7EXAMPLE";\nconst AWS_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";\n\nmodule.exports = { AWS_REGION, AWS_KEY, AWS_SECRET };\n';
  W.files[root+'/.gitignore']='node_modules/\ndist/\n';W.leak={file:root+'/config/aws.js'};return W}
/** Текст раздела markdown-документа по заголовку второго уровня */
export const mdSec=(t: string,h: string)=>{const p=t.split(/^##\s*/m).find(x=>x.toLowerCase().startsWith(h.toLowerCase()));return p?p.slice(p.indexOf('\n')+1):''};
