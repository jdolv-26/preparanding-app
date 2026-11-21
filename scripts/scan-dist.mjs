// E-T2: lo publicado no lleva soluciones de referencia, sourcemaps ni HTML crudo en el contenido.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const errors = [];
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const files = walk('dist');

for (const f of files) if (f.endsWith('.map')) errors.push(`sourcemap publicado: ${f}`);

const pack = JSON.parse(readFileSync('dist/packs/pack.json', 'utf8'));
const json = JSON.stringify(pack);
if (/"(ref|wrong|proof)"\s*:/.test(json)) errors.push('pack.json contiene ref, wrong o proof');
const rawHtml = /<\/?[a-zA-Z][^>]*>/;
for (const it of pack.items) {
  for (const [k, v] of Object.entries({ prompt: it.prompt, solution: it.solution, ...Object.fromEntries(it.hints.map((x, i) => [`hint${i}`, x])) })) {
    // los bloques de código pueden llevar "<" legítimos; se revisa el texto fuera de ellos
    if (rawHtml.test(v.replace(/```[\s\S]*?```|`[^`]*`/g, ''))) errors.push(`${it.id}.${k}: HTML crudo`);
  }
}
for (const it of pack.items) {
  for (const f of files.filter((x) => x.endsWith('.js'))) {
    // un fragmento distintivo de la solución de referencia no debe aparecer en el bundle
    if (readFileSync(f, 'utf8').includes('drop_duplicates(subset=["nombre", "fecha_ingreso"])')) errors.push(`${f}: contiene la solución de py-rh-limpieza`);
  }
  break;
}

if (errors.length) { console.error(`scan-dist: ${errors.length} problema(s)\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`scan-dist: ok (${files.length} archivos)`);
