// Ejecuta el código del usuario fuera del hilo principal. Si se cuelga, el runner lo mata.
import initSqlJs from 'sql.js';
import { runPython, runSql, type PyodideLike } from '../../core/harness.ts';
import type { Kind, Test, TestResult } from '../../core/item.ts';

export interface RunRequest { id: number; kind: Kind; setup: string; tests: Test[]; code: string }
export type WorkerMsg =
  | { id: number; phase: 'start' }
  | { id: number; phase: 'done'; results: TestResult[] }
  | { id: number; phase: 'crash'; message: string };

declare const __PYODIDE__: string;
const base = new URL(import.meta.env.BASE_URL, self.location.origin).href;
const pyBase = `${base}pyodide/v${__PYODIDE__}/`;
let py: Promise<PyodideLike> | undefined;
let sql: Promise<{ Database: new () => never }> | undefined;

function loadPy(): Promise<PyodideLike> {
  return (py ??= (async () => {
    const { loadPyodide } = await import(/* @vite-ignore */ `${pyBase}pyodide.mjs`);
    const p = await loadPyodide({ indexURL: pyBase });
    await p.loadPackage('pandas', { messageCallback: () => {} });
    // importar pandas tarda varios segundos la primera vez: es carga, no cuenta para el límite de 10 s
    p.runPython('import pandas');
    return p;
  })());
}

function loadSql() {
  return (sql ??= initSqlJs({ locateFile: () => `${base}sqljs/sql-wasm.wasm` } as never) as never);
}

// Sin ceder la tarea, Chromium retiene el "start" hasta que el código termina (y un ciclo infinito no termina).
const yieldTask = () => new Promise((r) => setTimeout(r, 0));

self.onmessage = async (ev: MessageEvent<RunRequest | { warm: Kind }>) => {
  const m = ev.data;
  if ('warm' in m) { void (m.warm === 'python' ? loadPy() : loadSql()); return; }
  try {
    if (m.kind === 'python') {
      const p = await loadPy();
      postMessage({ id: m.id, phase: 'start' } satisfies WorkerMsg);
      await yieldTask();
      const r = runPython(p, m, m.code);
      postMessage({ id: m.id, phase: 'done', results: r } satisfies WorkerMsg);
    } else {
      const S = await loadSql();
      postMessage({ id: m.id, phase: 'start' } satisfies WorkerMsg);
      await yieldTask();
      postMessage({ id: m.id, phase: 'done', results: runSql(() => new S.Database(), m, m.code) } satisfies WorkerMsg);
    }
  } catch (e) {
    postMessage({ id: m.id, phase: 'crash', message: String((e as Error)?.message ?? e) } satisfies WorkerMsg);
  }
};
