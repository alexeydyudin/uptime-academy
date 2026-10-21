/** Код игрока исполняется в отдельном Web Worker: бесконечный цикл не повесит страницу. */
export function makeWorker(): Worker {
  return new Worker(new URL('./scriptWorker.ts', import.meta.url), { type: 'module' });
}

export interface ScriptCall {
  t: 'scale' | 'restart';
  n?: string;
  r?: number;
  p?: string;
}

export interface TestRun {
  err?: string;
  res?: { calls: ScriptCall[]; logs: string[]; err?: string }[];
}

export function runTests(code: string, cases: { data: unknown }[]): Promise<TestRun> {
  return new Promise((resolve) => {
    const w = makeWorker();
    const to = setTimeout(() => {
      w.terminate();
      resolve({ err: 'Скрипт выполняется слишком долго. Похоже на бесконечный цикл.' });
    }, 1500);
    w.onmessage = (e: MessageEvent<TestRun>) => {
      clearTimeout(to);
      w.terminate();
      resolve(e.data);
    };
    w.onerror = (e) => {
      clearTimeout(to);
      w.terminate();
      resolve({ err: e.message || 'Ошибка скрипта' });
    };
    w.postMessage({ type: 'test', code, cases: cases.map((c) => c.data) });
  });
}
