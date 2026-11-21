// Pantalla del ítem: 11A (pestañas en móvil, dos columnas en PC), 4A (esperado vs obtenido,
// pistas, "Ver solución"), 13A ("Porque:"), franja de verificación, autosave (D20) y E5.
import { CORE_VERSION, type Item, type Pack, type TestResult } from '../../core/item.ts';
import { addItemCard } from '../cards.ts';
import { events, kv } from '../db.ts';
import { run, warm } from '../runtime/runner.ts';
import { announce, h, markdown } from './dom.ts';
import { editor } from './editor.ts';

export interface ItemDone { passed: boolean; tests_passed: number; new_card: boolean }

const ICON = { pass: '✓', fail: '✕', error: '!' } as const;

export function proofStrip(pack: Pack, sources: Item['sources'], what: string): HTMLElement {
  const host = new URL(sources[0].url).host;
  const details = h('div', { class: 'proof-detail', hidden: true },
    h('p', {}, `Verificado el ${pack.built_at}: ${what}. Runtime: Python ${pack.runtime.python} · pandas ${pack.runtime.pandas} · sql.js ${pack.runtime.sqljs}.`),
    h('ul', {}, ...sources.map((s) => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.title), ` · ${s.version}`))),
    h('p', { class: 'muted' }, 'El extracto exacto de la fuente se comprueba contra un snapshot desde la fase 1.'),
  );
  const btn = h('button', { type: 'button', class: 'proof-strip', 'aria-expanded': 'false', onclick: () => {
    details.hidden = !details.hidden;
    btn.setAttribute('aria-expanded', String(!details.hidden));
  } }, h('span', { class: 'mono' }, `${sources[0].version} · ${host} · ${pack.built_at} · ✓ verificado`));
  return h('div', { class: 'proof' }, btn, details);
}

export function itemView(pack: Pack, it: Item, opts: { progress?: HTMLElement; reason: string; sessionId?: string; onDone: (d: ItemDone) => void }): HTMLElement {
  const t0 = Date.now();
  let runs = 0, hintsUsed = 0, solutionViewed = false, passed = false, lastPass = 0, finished = false;
  const draftKey = `draft:${it.id}`;

  // Pestañas (solo visibles < 48rem; en PC se ven las tres zonas a la vez)
  const root = h('section', { class: 'item', 'data-active': 'enunciado', 'aria-labelledby': 'item-title' });
  const tabs = (['enunciado', 'codigo', 'resultado'] as const).map((id) => h('button', {
    type: 'button', role: 'tab', id: `tab-${id}`, 'aria-controls': `pane-${id}`, 'aria-selected': String(id === 'enunciado'),
    onclick: () => show(id),
  }, { enunciado: 'Enunciado', codigo: 'Código', resultado: 'Resultado' }[id]));
  const show = (id: string) => {
    root.dataset.active = id;
    for (const t of tabs) t.setAttribute('aria-selected', String(t.id === `tab-${id}`));
  };

  // Enunciado + pistas + solución
  const hintBox = h('div', { class: 'hints' });
  const hintBtn = h('button', { type: 'button', class: 'secondary', onclick: () => {
    hintBox.append(h('p', { class: 'hint' }, markdown(it.hints[hintsUsed], 'prose')));
    hintsUsed++;
    if (hintsUsed >= it.hints.length) hintBtn.remove();
    else hintBtn.textContent = `Otra pista (${hintsUsed + 1} de ${it.hints.length})`;
  } }, `Pista (1 de ${it.hints.length})`);
  const solBox = h('div');
  const solBtn = h('button', { type: 'button', class: 'secondary', onclick: () => {
    solutionViewed = true;
    solBtn.remove();
    solBox.append(h('div', { class: 'solution' }, h('h3', {}, 'Solución'), markdown(it.solution)));
    void finish(false);
  } }, 'Ver solución (cuenta como fallo)');

  // Editor con autosave cada 2 s y al salir
  let dirty = false;
  const ed = editor(it.starter, it.kind, () => { dirty = true; });
  void kv.get<string>(draftKey).then((d) => {
    if (d && d !== it.starter) ed.view.dispatch({ changes: { from: 0, to: ed.view.state.doc.length, insert: d } });
    else void starterCheck();
  });
  const saveDraft = () => { if (dirty) { dirty = false; void kv.set(draftKey, ed.code()); } };
  const timer = setInterval(() => { if (!root.isConnected) { clearInterval(timer); saveDraft(); } else saveDraft(); }, 2000);
  addEventListener('pagehide', saveDraft);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveDraft(); });

  // Resultado
  const results = h('div', { class: 'results', id: 'results' }, h('p', { class: 'muted' }, 'Ejecuta tu código para ver los tests.'));
  const runBtn = h('button', { type: 'button', class: 'primary', onclick: () => void doRun() }, 'Ejecutar');
  const runBar = h('div', { class: 'run-bar' }, runBtn);
  warm(it.kind);

  const renderResults = (rs: TestResult[]) => {
    results.replaceChildren(...rs.map((r) => h('div', { class: `test ${r.status}` },
      h('p', {}, h('span', { 'aria-hidden': 'true', class: 'icon' }, ICON[r.status]), ` ${r.status === 'pass' ? 'Pasa' : r.status === 'fail' ? 'Falla' : 'Error'}: ${r.name}`),
      r.message ? h('pre', { class: 'scroll-x', tabindex: '0' }, r.message) : null,
    )));
  };

  async function doRun() {
    if (finished) return;
    runBtn.disabled = true;
    runBtn.textContent = 'Ejecutando…';
    show('resultado');
    saveDraft();
    runs++;
    const out = await run(it, ed.code(), () => announce('Reiniciando Python… tu código está a salvo.'));
    runBtn.disabled = false;
    runBtn.textContent = 'Ejecutar';
    if (!out.ok) {
      results.replaceChildren(h('div', { class: 'test error' }, h('p', {}, h('span', { 'aria-hidden': 'true', class: 'icon' }, '!'), ` ${out.message}`), h('p', { class: 'muted' }, 'Python se reinició; tu código está a salvo.')));
      announce(out.message);
      return;
    }
    renderResults(out.results);
    lastPass = out.results.filter((r) => r.status === 'pass').length;
    const all = lastPass === out.results.length;
    announce(all ? `Pasan los ${lastPass} tests.` : `Pasan ${lastPass} de ${out.results.length} tests.`);
    if (all) { passed = true; root.querySelector('.proof-strip')?.classList.add('stamped'); void finish(true); }
  }

  async function finish(ok: boolean) {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    const firstTry = ok && runs === 1 && hintsUsed === 0;
    const newCard = !firstTry ? await addItemCard(it) : false;
    await events.add({
      id: crypto.randomUUID(), type: 'attempt', schema_version: 1, core_version: CORE_VERSION, at: new Date().toISOString(),
      item_id: it.id, passed: ok && !solutionViewed, runs, hints_used: hintsUsed, solution_viewed: solutionViewed,
      duration_ms: Date.now() - t0, session_id: opts.sessionId ?? null,
    });
    await kv.del(draftKey);
    hintBtn.remove();
    solBtn.remove();
    const next = h('button', { type: 'button', class: 'primary', onclick: () => opts.onDone({ passed: ok && !solutionViewed, tests_passed: lastPass, new_card: newCard }) }, 'Siguiente');
    runBtn.className = 'secondary';
    runBtn.disabled = true;
    if (newCard) results.append(h('p', { class: 'note' }, 'Se creó una tarjeta para repasar esto.'));
    else if (!firstTry) results.append(h('p', { class: 'note' }, 'Ya tenías una tarjeta de repaso para este caso.'));
    // "Siguiente" vive en Resultado: es la pestaña que estás viendo al terminar (en PC también está visible)
    results.append(next);
    show('resultado');
    next.focus();
  }

  // E5: al abrir por primera vez, el starter debe fallar/pasar exactamente como dice el ítem.
  // Si no, el ítem se retira solo en este dispositivo y queda un item_defect con el diff.
  async function starterCheck() {
    const key = `checked:${it.id}:${pack.built_at}`;
    if (await kv.get(key)) return;
    const out = await run(it, it.starter);
    if (!out.ok) return;
    const diff = out.results.filter((r) => it.starter_expect[r.name] !== r.status).map((r) => ({ test: r.name, expected: it.starter_expect[r.name], got: r.status, message: r.message }));
    await kv.set(key, true);
    if (!diff.length || runs > 0) return;
    await kv.set('retired', [...((await kv.get<string[]>('retired')) ?? []), it.id]);
    await events.add({ id: crypto.randomUUID(), type: 'item_defect', schema_version: 1, core_version: CORE_VERSION, at: new Date().toISOString(), item_id: it.id, user_agent: navigator.userAgent, runtime: pack.runtime, diff });
    finished = true;
    clearInterval(timer);
    root.replaceChildren(h('div', { class: 'notice' },
      h('p', {}, h('span', { 'aria-hidden': 'true' }, '✕ '), 'Retirado para revisión: se comportó distinto en este dispositivo.'),
      h('button', { type: 'button', class: 'primary', onclick: () => opts.onDone({ passed: false, tests_passed: 0, new_card: false }) }, 'Seguir con el siguiente'),
    ));
    announce('Este ejercicio se retiró para revisión. Sigue con el siguiente.');
  }

  root.append(
    opts.progress ?? '',
    h('header', { class: 'item-head' },
      h('h1', { id: 'item-title' }, it.title),
      h('p', { class: 'reason' }, `Porque: ${opts.reason}`),
      proofStrip(pack, it.sources, 'la solución de referencia pasa los tests y una solución incorrecta los falla'),
    ),
    h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Partes del ejercicio' }, ...tabs),
    h('div', { class: 'panes' },
      h('section', { class: 'pane', id: 'pane-enunciado', 'data-pane': 'enunciado', role: 'tabpanel', 'aria-labelledby': 'tab-enunciado' },
        markdown(it.prompt), it.device === 'pc' ? h('p', { class: 'muted' }, 'Pensado para la PC.') : null, hintBox, it.hints.length ? hintBtn : null, solBox, solBtn),
      h('section', { class: 'pane', id: 'pane-codigo', 'data-pane': 'codigo', role: 'tabpanel', 'aria-labelledby': 'tab-codigo' },
        ed.bar, h('div', { class: 'editor' }, ed.view.dom), runBar),
      h('section', { class: 'pane', id: 'pane-resultado', 'data-pane': 'resultado', role: 'tabpanel', 'aria-labelledby': 'tab-resultado' },
        h('h2', { class: 'pane-title' }, 'Resultado'), results),
    ),
  );
  return root;
}
