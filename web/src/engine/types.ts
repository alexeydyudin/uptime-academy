/**
 * Типы движка тренажёра. Контент (уроки, миры, карта) описывается через них,
 * поэтому content/ проверяется компилятором строго.
 */

export interface Proc { pid: number; user: string; cpu: number; mem: number; cmd: string; ignoreTerm?: boolean }
export interface Container { id: string; name: string; image: string; up: boolean; code: number; hp: string; cp?: string; env: Record<string, string>; logs: string }
export interface Service { active: boolean; enabled?: boolean; desc?: string; journal?: string }
export interface Pod { name: string; app: string; status: string; restarts: number; age: number; fault?: boolean }
export interface Deploy { replicas: number; image: string; ok: boolean; load: number; prev?: string | null; waitSecret?: boolean }
export interface K8sService { selector: string; port: number; targetPort: number }
export interface K8s { deploys: Record<string, Deploy>; pods: Pod[]; svc?: Record<string, K8sService>; secrets?: Record<string, boolean> }

/** Симулируемая инфраструктура одного урока. Домены добавляют свои поля (git, tf, helm, …). */
export interface World {
  cwd: string;
  files: Record<string, string>;
  dirs: Set<string>;
  sizes: Record<string, string>;
  procs: Proc[];
  svc: Record<string, Service>;
  disk: number;
  containers: Container[];
  images: string[];
  /** Кластер Kubernetes; в уроках без кластера — null (shell проверяет это сам) */
  k8s: K8s;
  hist: string[];
  /** Флаги «что игрок уже сделал» — по ним и по состоянию мира проверяются задания */
  f: Record<string, any>;
  [domain: string]: any;
}

/** Проверка задания: смотрит на состояние мира и, при необходимости, на введённые команды. */
export type Check = (W: World, cmds: string[]) => unknown;

export interface LecturePage {
  h: string;
  p?: string;
  code?: string;
  terms?: [string, string][];
}

export interface ConfigCheck {
  name: string;
  test: (text: string) => boolean;
}

export interface ScriptCase {
  name: string;
  data: unknown;
  expect: (calls: any[]) => boolean;
}

export type Step =
  | { t: 'lecture'; pages: LecturePage[] }
  | { t: 'learn'; h: string; p: string }
  | { t: 'quiz'; h: string; o: string[]; a: number; ex: string }
  | { t: 'task'; h: string; p: string; hints: [string, string, string]; sol: string[]; done: string; check: Check }
  | {
      t: 'edit';
      h: string;
      p: string;
      file: string;
      /** Файл в мире урока; если не задан, редактируется starter */
      path?: string;
      starter?: string;
      hint: string;
      checks: ConfigCheck[];
      /** Эталонное решение: используется тестами, игроку не показывается */
      sample?: string;
      onSave?: (W: World) => void;
      done: string;
    }
  | { t: 'script'; h: string; p: string; starter: string; cases: ScriptCase[] };

export interface Lesson {
  title: string;
  xp: number;
  setup?: () => World;
  steps?: Step[];
  /** Финальный бой: отдельный экран симуляции */
  boss?: boolean;
}

export interface Unit {
  id: string;
  n: number;
  /** CSS-цвет ступени */
  c: string;
  title: string;
  sub: string;
  weeks?: string;
  lessons: string[];
  soon?: boolean;
  project?: { text: string; items: string[] };
}
