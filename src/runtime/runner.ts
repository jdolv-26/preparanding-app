// T2/D12: un solo worker; el límite de 10 s corre desde que el runtime empieza a ejecutar
// (la carga de Python no cuenta). Timeout o caída: se mata y se crea otro.
import type { Item, TestResult } from '../../core/item.ts';
import type { RunRequest, WorkerMsg } from './worker.ts';

export const TIMEOUT_MS = 10_000;
export type RunOutcome =
  | { ok: true; results: TestResult[] }
  | { ok: false; reason: 'timeout' | 'crash'; message: string };

let worker: Worker | undefined;
let seq = 0;
const make = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

export function warm(kind: Item['kind']) {
  (worker ??= make()).postMessage({ warm: kind });
}

// Una ejecución a la vez: así el límite de 10 s siempre corresponde a la que está corriendo.
let queue: Promise<unknown> = Promise.resolve();

export function run(item: Pick<Item, 'kind' | 'setup' | 'tests'>, code: string, onRestart?: () => void): Promise<RunOutcome> {
  const p = queue.then(() => runNow(item, code, onRestart));
  queue = p;
  return p;
}

function runNow(item: Pick<Item, 'kind' | 'setup' | 'tests'>, code: string, onRestart?: () => void): Promise<RunOutcome> {
  const w = (worker ??= make());
  const id = ++seq;
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (o: RunOutcome, kill: boolean) => {
      clearTimeout(timer);
      w.removeEventListener('message', onMsg);
      w.removeEventListener('error', onErr);
      if (kill) { w.terminate(); if (worker === w) worker = undefined; onRestart?.(); }
      resolve(o);
    };
    const onMsg = (e: MessageEvent<WorkerMsg>) => {
      const m = e.data;
      if (m.id !== id) return;
      if (m.phase === 'start') {
        timer = setTimeout(() => finish({ ok: false, reason: 'timeout', message: 'Tu código tardó más de 10 s (¿un ciclo infinito?).' }, true), TIMEOUT_MS);
      } else if (m.phase === 'done') finish({ ok: true, results: m.results }, false);
      else finish({ ok: false, reason: 'crash', message: m.message }, true);
    };
    const onErr = (e: ErrorEvent) => finish({ ok: false, reason: 'crash', message: e.message || 'El runtime se cayó.' }, true);
    w.addEventListener('message', onMsg);
    w.addEventListener('error', onErr);
    w.postMessage({ id, kind: item.kind, setup: item.setup, tests: item.tests, code } satisfies RunRequest);
  });
}
