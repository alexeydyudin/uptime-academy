import { describe, expect, it } from 'vitest';
import { sh } from '../engine/shell/index';
import type { Lesson, Step, World } from '../engine/types';
import { LESSONS } from './lessons/index';
import { UNITS } from './units';

type TaskStep = Extract<Step, { t: 'task' }>;
type EditStep = Extract<Step, { t: 'edit' }>;

/** Подстановки для решений, зависящих от случайных имён подов */
function expand(W: World, cmd: string): string {
  if (cmd === '@delete-web') return 'kubectl delete pod ' + W.k8s.pods.find((p) => p.app === 'web')!.name;
  return cmd;
}

function run(W: World, step: TaskStep, cmds: string[]): boolean {
  const seen: string[] = [];
  let ok = false;
  for (const raw of cmds) {
    const c = expand(W, raw);
    sh(W, c);
    W.hist.push(c);
    seen.push(c);
    ok = Boolean(step.check(W, seen));
  }
  return ok;
}

function sampleFor(id: string, step: EditStep, W: World | null): string | undefined {
  if (step.sample) return step.sample;
  // у урока про CI эталон — исходный файл с исправленной версией Node
  if (id === 'l14' && W && step.path) return W.files[step.path].replace('node-version: 16', 'node-version: 20');
  return undefined;
}

/**
 * Проходит урок от начала до конца: задания — указанными командами,
 * правки конфигов — эталоном. Возвращает непройденные шаги.
 */
function playLesson(id: string, L: Lesson, variants: Record<number, string[]> = {}): string[] {
  const W = L.setup ? L.setup() : null;
  const failed: string[] = [];
  (L.steps ?? []).forEach((st, i) => {
    if (st.t === 'edit') {
      const sample = sampleFor(id, st, W);
      if (sample && W && st.path) {
        W.files[st.path] = sample;
        st.onSave?.(W);
      }
      return;
    }
    if (st.t !== 'task' || !W) return;
    const cmds = variants[i] ?? st.sol;
    if (!run(W, st, cmds)) {
      failed.push(`${id}:${i} «${st.h}» ${JSON.stringify(cmds)}`);
      if (variants[i]) for (const c of st.sol) sh(W, expand(W, c)); // догоняем мир, чтобы проверить следующие шаги
    }
  });
  return failed;
}

const lessons = Object.entries(LESSONS).filter(([, L]) => !L.boss);

describe('карта', () => {
  it('каждый урок есть на карте и наоборот', () => {
    const onMap = UNITS.flatMap((u) => u.lessons);
    expect(onMap.filter((id) => !LESSONS[id])).toEqual([]);
    expect(Object.keys(LESSONS).filter((id) => !onMap.includes(id))).toEqual([]);
    expect(new Set(onMap).size).toBe(onMap.length);
  });

  it('каждый урок начинается с лекции', () => {
    expect(lessons.filter(([, L]) => L.steps?.[0]?.t !== 'lecture').map(([id]) => id)).toEqual([]);
  });

  it('у каждого задания три подсказки, последняя — решение', () => {
    const bad = lessons.flatMap(([id, L]) => (L.steps ?? []).flatMap((s, i) => (s.t === 'task' && s.hints.length !== 3 ? [`${id}:${i}`] : [])));
    expect(bad).toEqual([]);
  });
});

describe('уроки проходятся эталонным решением', () => {
  it.each(lessons)('%s', (id, L) => {
    expect(playLesson(id, L)).toEqual([]);
  });
});

describe('правки конфигов', () => {
  const edits = lessons.flatMap(([id, L]) => (L.steps ?? []).flatMap((s, i) => (s.t === 'edit' ? [[`${id}:${i} ${s.h}`, id, L, s] as const] : [])));
  it.each(edits)('%s: исходник не проходит проверку, эталон проходит', (_name, id, L, st) => {
    const W = L.setup ? L.setup() : null;
    const initial = (st.path && W ? W.files[st.path] : st.starter) ?? '';
    const sample = sampleFor(id, st, W);
    if (!sample) return; // для части старых уроков эталон не задан
    expect(st.checks.every((c) => c.test(initial))).toBe(false);
    expect(st.checks.filter((c) => !c.test(sample)).map((c) => c.name)).toEqual([]);
  });
});

/** Другие правильные способы решить те же задания — должны засчитываться */
const VARIANTS: Record<string, Record<number, string[]>> = {
  l2: { 3: ['cat app.log | grep ERROR'], 5: ['cat app.log | grep ERROR | wc -l'] },
  l3: { 1: ['ps aux | sort -k3 -r | head -n 3'] },
  l4: { 3: ['journalctl -u nginx'], 5: ['sudo rm /var/log/old/app-2025.log.1'] },
  l7: { 1: ['docker container ls -a'] },
  l9: { 1: ['kubectl get pods'] },
  l18: { 1: ['bash deploy.sh'], 4: ['chmod 755 deploy.sh; ./deploy.sh'], 5: ['sudo chown shop /etc/shop/db.env && sudo chmod 400 /etc/shop/db.env'] },
  l19: { 1: ['systemctl status node-exporter'], 3: ['systemctl enable node-exporter && systemctl start node-exporter'] },
  l20: { 3: ['chmod u+x healthcheck.sh; ./healthcheck.sh'], 4: ['systemctl stop nginx', './healthcheck.sh', 'echo $?'] },
  l21: { 1: ['curl http://shop.local'], 2: ['nslookup shop.local'], 3: ['curl -v http://shop.local'] },
  l22: { 2: ['git checkout -b feature/api-timeout'], 4: ['git add config.yaml', 'git commit -m "feat: timeout"', 'git push --set-upstream origin feature/api-timeout'] },
  l23: { 1: ['git pull origin main'], 4: ['git add .', 'git commit -m "Merge main"', 'git push'] },
  l24: { 1: ['docker build -t shop:1.0 .', 'docker image ls'] },
  l25: { 2: ['docker-compose up -d', 'docker compose ps'] },
  l26: { 5: ['terraform apply -auto-approve'] },
  l28: { 1: ['kubectl get ep web'], 5: ['kubectl apply -f /home/dev/k8s/service.yaml', 'kubectl get endpoints web'] },
  l29: { 3: ['kubectl apply -f deployment.yaml', 'kubectl get pods', 'kubectl create secret generic db --from-literal=password=x', 'kubectl get pods', 'kubectl get pods'] },
  l30: { 4: ['kubectl get pods', 'kubectl get pods', 'helm rollback shop'] },
  l32: { 1: ['trivy image --severity CRITICAL,HIGH shop:1.2'], 4: ['docker build -t shop:1.3 .', 'trivy image --exit-code 1 --severity CRITICAL,HIGH shop:1.3'] },
  l33: { 1: ['gitleaks git'] },
};

describe('альтернативные решения засчитываются', () => {
  it.each(Object.entries(VARIANTS))('%s', (id, variants) => {
    expect(playLesson(id, LESSONS[id], variants)).toEqual([]);
  });
});

describe('терминал', () => {
  it('честно говорит про неподдерживаемые команды', () => {
    const W = LESSONS.l1.setup!();
    expect(sh(W, 'vim app.log').out).toMatch(/в тренажёре этой команды нет/);
    expect(sh(W, 'foobar').out).toMatch(/command not found/);
  });
  it('подсказывает про русскую раскладку и регистр', () => {
    const W = LESSONS.l1.setup!();
    expect(sh(W, 'зцв').out).toContain('Ты имел в виду: pwd');
    expect(sh(W, 'сфе тщеуыюече').out).toContain('cat notes.txt');
    expect(sh(W, 'PWD').out).toContain('маленькими буквами: pwd');
  });
  it('трубы, цепочки и ; работают', () => {
    const W = LESSONS.l2.setup!();
    expect(sh(W, 'grep ERROR app.log | wc -l').out).toBe('3');
    expect(sh(W, 'cd /tmp && pwd').out).toBe('/tmp');
    expect(sh(W, 'cd /nope && pwd').out).not.toContain('/tmp\n');
    expect(sh(W, 'cd /var/log; pwd').out).toBe('/var/log');
  });
});
