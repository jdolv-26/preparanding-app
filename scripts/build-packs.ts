// Verificador mínimo de la fase 0 (crece hasta ser engine/verifier en la fase 1).
// Para cada ítem: ref pasa todo, wrong falla algo, starter da exactamente starter_expect.
// Para cada tarjeta: su `proof` pasa. Si algo no cumple, no se publica nada.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadPyodide } from 'pyodide';
import { CORE_VERSION, SCHEMA_VERSION, toPublicCard, toPublicItem, validateItem, type Pack, type Test, type TestResult } from '../core/item.ts';
import { runPython, runSql } from '../core/harness.ts';
import { items } from '../bank/items.ts';
import { cards } from '../bank/cards.ts';

const PY_VERSION = JSON.parse(readFileSync('node_modules/pyodide/package.json', 'utf8')).version;
const PY_DIR = `public/pyodide/v${PY_VERSION}`;
const initSqlJs = createRequire(import.meta.url)('sql.js');
const t0 = Date.now();
const errors: string[] = items.flatMap(validateItem);

const py = await loadPyodide({ indexURL: resolve(PY_DIR) + '/' });
await py.loadPackage('pandas', { messageCallback: () => {} });
const SQL = await initSqlJs({ locateFile: () => resolve('public/sqljs/sql-wasm.wasm') });

type Runnable = { kind: 'python' | 'sql'; setup: string; tests: Test[] };
const run = (x: Runnable, code: string): TestResult[] =>
  x.kind === 'python' ? runPython(py as never, x, code) : runSql(() => new SQL.Database(), x, code);
const fmt = (r: TestResult[]) => r.map((t) => `${t.name}=${t.status}${t.message ? ` (${t.message.split('\n')[0]})` : ''}`).join('; ');

for (const it of items) {
  const ref = run(it, it.ref);
  if (ref.some((t) => t.status !== 'pass')) errors.push(`${it.id}: ref no pasa: ${fmt(ref)}`);
  const wrong = run(it, it.wrong);
  if (wrong.every((t) => t.status === 'pass')) errors.push(`${it.id}: wrong pasa todos los tests`);
  const starter = run(it, it.starter);
  for (const t of starter) {
    if (it.starter_expect[t.name] !== t.status) errors.push(`${it.id}: starter "${t.name}" dio ${t.status}, se esperaba ${it.starter_expect[t.name]}`);
  }
}

for (const c of cards) {
  let res: TestResult[];
  if (c.kind === 'python') {
    res = run({ kind: 'python', setup: '', tests: [{ name: 'proof', code: c.proof }] }, '');
  } else {
    const m = c.proof.match(/--\s*expect:\s*(.+)$/m);
    if (!m) { errors.push(`${c.id}: proof SQL sin "-- expect:"`); continue; }
    res = run({ kind: 'sql', setup: '', tests: [{ name: 'proof', expect: JSON.parse(m[1]) }] }, c.proof);
  }
  if (res[0].status !== 'pass') errors.push(`${c.id}: la afirmación no se cumple: ${fmt(res)}`);
}

if (errors.length) {
  console.error(`VERIFICACIÓN FALLIDA (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

const lock = JSON.parse(readFileSync(`${PY_DIR}/pyodide-lock.json`, 'utf8'));
const pack: Pack = {
  schema_version: SCHEMA_VERSION,
  core_version: CORE_VERSION,
  runtime: {
    pyodide: JSON.parse(readFileSync('node_modules/pyodide/package.json', 'utf8')).version,
    python: lock.info.python,
    pandas: lock.packages.pandas.version,
    sqljs: JSON.parse(readFileSync('node_modules/sql.js/package.json', 'utf8')).version,
  },
  built_at: new Date().toISOString().slice(0, 10),
  runtime_files: [
    ...readdirSync(PY_DIR).map((f) => ({ path: `pyodide/v${PY_VERSION}/${f}`, bytes: statSync(`${PY_DIR}/${f}`).size, group: 'python' as const })),
    { path: 'sqljs/sql-wasm.wasm', bytes: statSync('public/sqljs/sql-wasm.wasm').size, group: 'ejercicios' as const },
  ],
  items: items.map(toPublicItem),
  cards: cards.map(toPublicCard),
};
const json = JSON.stringify(pack);
if (/"(ref|wrong|proof)"\s*:/.test(json)) throw new Error('El pack contiene ref/wrong/proof');
mkdirSync('public/packs', { recursive: true });
writeFileSync('public/packs/pack.json', json);
console.log(`ok: ${items.length} ítems y ${cards.length} tarjetas verificados en ${((Date.now() - t0) / 1000).toFixed(1)} s (${JSON.stringify(pack.runtime)})`);
