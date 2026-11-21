// Copia el núcleo de Pyodide y sql.js a public/ y descarga las ruedas de pandas
// (con sus dependencias) del CDN oficial, verificando el sha256 del lockfile.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const PY = 'node_modules/pyodide';
const version0 = JSON.parse(readFileSync('node_modules/pyodide/package.json', 'utf8')).version;
const OUT = `public/pyodide/v${version0}`;
const SQL_OUT = 'public/sqljs';
const lock = JSON.parse(readFileSync(`${PY}/pyodide-lock.json`, 'utf8'));
const version = JSON.parse(readFileSync(`${PY}/package.json`, 'utf8')).version;

mkdirSync(OUT, { recursive: true });
mkdirSync(SQL_OUT, { recursive: true });
for (const f of ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']) {
  cpSync(`${PY}/${f}`, `${OUT}/${f}`);
}
cpSync('node_modules/sql.js/dist/sql-wasm.wasm', `${SQL_OUT}/sql-wasm.wasm`);

const need = new Set();
const walk = (n) => { if (need.has(n)) return; need.add(n); lock.packages[n].depends.forEach(walk); };
walk('pandas');

for (const name of need) {
  const { file_name, sha256 } = lock.packages[name];
  const dest = `${OUT}/${file_name}`;
  const ok = (buf) => createHash('sha256').update(buf).digest('hex') === sha256;
  if (existsSync(dest) && ok(readFileSync(dest))) continue;
  const res = await fetch(`https://cdn.jsdelivr.net/pyodide/v${version}/full/${file_name}`);
  if (!res.ok) throw new Error(`${file_name}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!ok(buf)) throw new Error(`${file_name}: sha256 no coincide con el lockfile`);
  writeFileSync(dest, buf);
  console.log(`ok ${file_name} (${(buf.length / 1e6).toFixed(1)} MB)`);
}
console.log(`Pyodide ${version}: ${[...need].join(', ')}`);
