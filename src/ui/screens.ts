import type { Pack } from '../../core/item.ts';
import { allCards, dueCount, pickCards, RATINGS, review } from '../cards.ts';
import { events, kv } from '../db.ts';
import { googleCalendarUrl, ics } from '../reminder.ts';
import { askPersist, download, mb, missing, persisted } from '../offline.ts';
import { advance, BLOCKS, clear, current, daysThisWeek, mainItems, passedItems, retired, start, type Session } from '../session.ts';
import { announce, h, markdown } from './dom.ts';
import { itemView, proofStrip } from './item.ts';

type Main = HTMLElement;
const go = (hash: string) => { location.hash = hash; };

// 2A: un solo aviso, el de mayor prioridad. En la fase 0 solo existe "almacenamiento".
async function notice(): Promise<HTMLElement | null> {
  if (await persisted()) return null;
  const btn = h('button', { type: 'button', class: 'secondary', onclick: async () => {
    const ok = await askPersist();
    announce(ok ? 'Almacenamiento persistente activado.' : 'El navegador no lo concedió; instalar la app ayuda.');
    if (ok) btn.closest('.notice')?.remove();
  } }, 'Pedir almacenamiento persistente');
  return h('div', { class: 'notice', role: 'status' },
    h('p', {}, h('span', { 'aria-hidden': 'true', class: 'icon' }, '! '), 'El navegador puede borrar tu progreso si le falta espacio.'), btn);
}

export async function hoy(main: Main, pack: Pack) {
  const [s, toGet, days, due, items, quick, reminder] = await Promise.all([current(), missing(pack), daysThisWeek(), dueCount(pack), mainItems(pack), pickCards(pack, 3, 5), kv.get<string>('reminder')]);
  const n = items.length;
  const cta = s
    ? h('button', { type: 'button', class: 'primary cta', onclick: () => go('#/sesion') }, `Continuar · ${BLOCKS[Math.min(s.block, 2)]}`)
    : h('button', { type: 'button', class: 'primary cta', onclick: async () => { await start(pack); go('#/sesion'); } }, `Empezar sesión · ~20 min · ${n} ${n === 1 ? 'ítem' : 'ítems'}`);
  // Sesión corta: baja la barrera de entrada; cuenta como día de práctica igual que la completa.
  const short = !s && quick.length
    ? h('button', { type: 'button', class: 'secondary cta', onclick: async () => { await start(pack, 'short'); go('#/sesion'); } }, `Solo 3 minutos · ${quick.length} tarjetas`)
    : '';
  const offline = toGet.length
    ? h('p', { class: 'offline' }, h('a', { href: '#/preparar' }, `Preparar para usar sin internet (${mb(toGet.reduce((a, f) => a + f.bytes, 0))})`))
    : h('p', { class: 'offline ok' }, h('span', { 'aria-hidden': 'true' }, '✓ '), 'Listo offline');
  main.replaceChildren(h('div', { class: 'hoy' },
    (await notice()) ?? '',
    h('h1', {}, 'Hoy'),
    h('p', { class: 'muted' }, `${due} ${due === 1 ? 'tarjeta vencida' : 'tarjetas vencidas'} · Esta semana: `, h('span', { class: 'mono' }, `${days} de 7 días`)),
    h('div', { class: 'cta-zone' }, cta, short, offline),
    reminder ? '' : h('p', {}, h('a', { href: '#/yo' }, 'Ponte un recordatorio diario')),
  ));
}

function blockProgress(s: Session): HTMLElement {
  return h('ol', { class: 'blocks', 'aria-label': 'Progreso de la sesión' }, ...BLOCKS.map((b, i) => h('li', {
    class: i < s.block ? 'done' : i === s.block ? 'now' : '', 'aria-current': i === s.block ? 'step' : undefined,
  }, b)));
}

export async function sesion(main: Main, pack: Pack) {
  const s = await current();
  if (!s) return go('#/hoy');
  const next = async () => { await advance(pack, s); void sesion(main, pack); };

  if (s.block === 0 || s.block === 2) {
    const ids = s.block === 0 ? s.warm : s.review;
    const card = (await allCards(pack)).find((c) => c.id === ids[s.pos]);
    if (!card) return next();
    const back = h('div', { class: 'card-back', hidden: true }, markdown(card.back));
    const grades = h('div', { class: 'grades', hidden: true }, ...RATINGS.map(([label, g]) => h('button', { type: 'button', class: 'secondary', onclick: async () => {
      await review(card.id, g);
      s.stats.cards++;
      await next();
    } }, label)));
    const reveal = h('button', { type: 'button', class: 'primary', onclick: () => { back.hidden = false; grades.hidden = false; reveal.remove(); (grades.firstElementChild as HTMLElement).focus(); } }, 'Ver respuesta');
    const extra = s.block === 2 ? h('button', { type: 'button', class: 'link', onclick: async () => { s.block = 3; s.pos = 0; await kv.set('session', s); void sesion(main, pack); } }, 'Terminar aquí') : null;
    main.replaceChildren(h('div', { class: 'session' },
      blockProgress(s),
      h('p', { class: 'muted mono' }, `${s.pos + 1} de ${ids.length}`),
      h('article', { class: 'fsrs-card', 'aria-label': 'Tarjeta de repaso' },
        markdown(card.front, 'prose card-front'), back,
        proofStrip(pack, card.sources, card.id.startsWith('item:') ? 'tarjeta de un ejercicio verificado' : 'la afirmación de la tarjeta se ejecutó y se cumple'),
      ),
      reveal, grades, extra,
    ));
    (main.querySelector('.primary') as HTMLElement | null)?.focus();
    return;
  }

  if (s.block === 1) {
    const it = pack.items.find((i) => i.id === s.main[s.pos]);
    if (!it || (await retired()).includes(it.id)) return next();
    main.replaceChildren(itemView(pack, it, {
      progress: blockProgress(s),
      reason: (await passedItems()).has(it.id) ? 'repaso de un caso que ya resolviste' : 'caso semilla de la fase 0',
      sessionId: s.id,
      onDone: async (d) => {
        s.stats.items++;
        s.stats.tests_passed += d.tests_passed;
        if (d.new_card) s.stats.new_cards++;
        await next();
      },
    }));
    return;
  }

  // 6A: cierre con tres datos y el estado de guardado
  const days = await daysThisWeek();
  await clear();
  main.replaceChildren(h('div', { class: 'session close' },
    h('h1', {}, s.short ? 'Listo por hoy' : 'Sesión terminada'),
    h('ul', { class: 'summary' },
      h('li', {}, s.short ? `Repasaste ${s.stats.cards} tarjetas. El día ya cuenta.` : `Practicaste ${s.stats.items} ${s.stats.items === 1 ? 'ejercicio' : 'ejercicios'} (${s.stats.tests_passed} tests pasados) y ${s.stats.cards} tarjetas.`),
      s.short ? '' : h('li', {}, `Quedan para repasar: ${s.stats.new_cards} ${s.stats.new_cards === 1 ? 'tarjeta nueva' : 'tarjetas nuevas'}.`),
      h('li', {}, 'Esta semana: ', h('span', { class: 'mono' }, `${days} de 7 días`), '.'),
    ),
    h('p', { class: 'muted' }, h('span', { 'aria-hidden': 'true' }, '✓ '), 'Guardado en este dispositivo.'),
    h('button', { type: 'button', class: 'primary', onclick: () => go('#/hoy') }, 'Volver a Hoy'),
    s.short ? h('button', { type: 'button', class: 'secondary', onclick: async () => { await start(pack, 'reto'); void sesion(main, pack); } }, 'Ya que estás: un ejercicio (~15 min)') : '',
  ));
  announce('Sesión terminada. Guardado en este dispositivo.');
}

// 3A: preparación offline con tamaño real, progreso por partes y pausa.
let install: (Event & { prompt(): Promise<void> }) | undefined;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); install = e as never; });

export async function preparar(main: Main, pack: Pack) {
  const groups = ['python', 'ejercicios'] as const;
  const total = Object.fromEntries(groups.map((g) => [g, pack.runtime_files.filter((f) => f.group === g).reduce((a, f) => a + f.bytes, 0)]));
  const todo = await missing(pack);
  const got = Object.fromEntries(groups.map((g) => [g, total[g] - todo.filter((f) => f.group === g).reduce((a, f) => a + f.bytes, 0)]));
  const appReady = !!(await navigator.serviceWorker?.getRegistration())?.active;
  const cell = (g: 'python' | 'ejercicios') => h('span', { class: 'mono', id: `pct-${g}` }, got[g] >= total[g] ? '✓' : `${Math.floor((got[g] / total[g]) * 100)} %`);
  const status = h('p', { class: 'muted' });
  let ctrl: AbortController | undefined;
  const pause = h('button', { type: 'button', class: 'secondary', hidden: true, onclick: () => ctrl?.abort() }, 'Pausar');
  const startBtn = h('button', { type: 'button', class: 'primary', onclick: () => void go2() }, todo.length ? 'Descargar' : 'Listo');

  async function go2() {
    const files = await missing(pack);
    if (!files.length) return done();
    ctrl = new AbortController();
    startBtn.hidden = true;
    pause.hidden = false;
    status.textContent = 'Descargando… puedes leer el primer caso mientras tanto.';
    try {
      await download(files, (f, n) => {
        got[f.group] += n;
        document.getElementById(`pct-${f.group}`)!.textContent = got[f.group] >= total[f.group] ? '✓' : `${Math.floor((got[f.group] / total[f.group]) * 100)} %`;
      }, ctrl.signal);
      await done();
    } catch (e) {
      startBtn.hidden = false;
      pause.hidden = true;
      startBtn.textContent = 'Reanudar';
      // la parte a medias no se guardó: se reinicia esa parte al reanudar
      for (const g of groups) got[g] = total[g] - (await missing(pack)).filter((f) => f.group === g).reduce((a, f) => a + f.bytes, 0);
      status.textContent = (e as Error).name === 'AbortError' ? 'En pausa. Lo ya descargado se conserva.' : `Se cortó la descarga: ${(e as Error).message}. Reanuda cuando tengas red.`;
    }
  }

  async function done() {
    const ok = await askPersist();
    pause.hidden = true;
    startBtn.hidden = true;
    main.querySelector('.prep')!.append(
      h('p', { class: 'offline ok' }, h('span', { 'aria-hidden': 'true' }, '✓ '), 'Listo offline'),
      h('p', { class: 'muted' }, ok ? 'Almacenamiento persistente activado: el navegador no borrará tu progreso por falta de espacio.' : 'Pedimos almacenamiento persistente para que el navegador no borre tu progreso; no lo concedió. Instalar la app ayuda.'),
      install ? h('button', { type: 'button', class: 'secondary', onclick: () => void install!.prompt() }, 'Instalar la app') : '',
      h('button', { type: 'button', class: 'primary', onclick: () => go('#/hoy') }, 'Ir a Hoy'),
    );
    announce('Listo offline.');
  }

  const sum = mb(pack.runtime_files.reduce((a, f) => a + f.bytes, 0));
  main.replaceChildren(h('div', { class: 'prep' },
    h('h1', {}, 'Preparar para usar sin internet'),
    h('p', {}, `Se descargan ${sum} una sola vez (mejor con wifi). Después todo funciona en modo avión.`),
    h('table', { class: 'parts' }, h('tbody', {},
      h('tr', {}, h('th', { scope: 'row' }, 'App'), h('td', {}, h('span', { class: 'mono' }, appReady ? '✓' : '…'))),
      h('tr', {}, h('th', { scope: 'row' }, 'Python'), h('td', { class: 'mono' }, mb(total.python)), h('td', {}, cell('python'))),
      h('tr', {}, h('th', { scope: 'row' }, 'Ejercicios'), h('td', { class: 'mono' }, mb(total.ejercicios)), h('td', {}, cell('ejercicios'))),
    )),
    status, startBtn, pause,
    h('p', {}, h('a', { href: `#/item/${pack.items[0].id}` }, 'Leer el primer caso mientras tanto')),
  ));
}

export function mercado(main: Main) {
  main.replaceChildren(h('div', {},
    h('h1', {}, 'Mercado'),
    h('p', {}, 'Sin datos aún.'),
    h('p', { class: 'muted' }, 'Aquí verás tus 8 habilidades de más peso contra lo que piden las vacantes, con su n. Llega con la rutina semanal (fase 2); mientras tanto las vacantes se capturan a mano en la matriz semilla.'),
  ));
}

export async function yo(main: Main, pack: Pack) {
  const [done, gone, evs, ok, toGet] = await Promise.all([passedItems(), retired(), events.all(), persisted(), missing(pack)]);
  const exportBtn = h('button', { type: 'button', class: 'secondary', onclick: () => {
    const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(evs, null, 1)], { type: 'application/json' })), download: `preparanding-eventos-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  } }, 'Exportar mis eventos (JSON)');
  main.replaceChildren(h('div', { class: 'yo' },
    h('h1', {}, 'Yo'),
    h('h2', {}, 'Repaso libre'),
    h('ul', { class: 'list' }, ...pack.items.map((i) => h('li', {},
      h('a', { href: `#/item/${i.id}` }, i.title),
      h('span', { class: 'muted' }, gone.includes(i.id) ? ' · ✕ retirado' : done.has(i.id) ? ' · ✓ resuelto' : ' · pendiente'),
    ))),
    h('h2', {}, 'Entrevistas'),
    h('p', { class: 'muted' }, 'Disponibles en la PC (fase 3).'),
    h('h2', {}, 'Estado'),
    h('ul', { class: 'list' },
      h('li', {}, toGet.length ? `! Faltan ${toGet.length} archivos para usar sin internet` : '✓ Listo offline'),
      h('li', {}, ok ? '✓ Almacenamiento persistente' : '! Almacenamiento no persistente'),
      h('li', {}, 'Sincronización: no configurada (llega en la fase 2; todo se guarda en este dispositivo).'),
      h('li', { class: 'mono' }, `${evs.length} eventos · core ${pack.core_version} · pack ${pack.built_at}`),
      h('li', { class: 'mono' }, `Python ${pack.runtime.python} · pandas ${pack.runtime.pandas} · sql.js ${pack.runtime.sqljs}`),
    ),
    h('h2', { id: 'recordatorio' }, 'Recordatorio diario'),
    reminderForm(),
    exportBtn,
  ));
}

// Recordatorio como evento recurrente del calendario del teléfono: avisa aunque la app esté
// cerrada y sin servidor de push. Google Calendar (Android) o .ics (iPhone y otros).
function reminderForm(): HTMLElement {
  const time = h('input', { type: 'time', id: 'rem-time', value: '20:00', required: true }) as HTMLInputElement;
  void kv.get<string>('reminder').then((t) => { if (t) { time.value = t; time.dispatchEvent(new Event('input')); } });
  const save = () => kv.set('reminder', time.value);
  const gcal = h('a', { class: 'secondary', target: '_blank', rel: 'noopener noreferrer', href: googleCalendarUrl(time.value, appUrl()), onclick: () => void save() }, 'Agregar a Google Calendar');
  time.addEventListener('input', () => gcal.setAttribute('href', googleCalendarUrl(time.value, appUrl())));
  const file = h('button', { type: 'button', class: 'secondary', onclick: () => {
    const a = h('a', { href: URL.createObjectURL(new Blob([ics(time.value, appUrl())], { type: 'text/calendar' })), download: 'preparanding-recordatorio.ics' });
    a.click();
    URL.revokeObjectURL(a.href);
    void save();
  } }, 'Descargar .ics (iPhone y otros)');
  return h('div', { class: 'reminder' },
    h('p', { class: 'muted' }, 'Un evento diario en tu calendario con el link a la app. Basta con 3 minutos para que cuente el día.'),
    h('label', { for: 'rem-time' }, 'Hora '), time, h('div', { class: 'row' }, gcal, file),
  );
}
const appUrl = () => new URL(import.meta.env.BASE_URL, location.origin).href;

export async function libre(main: Main, pack: Pack, id: string) {
  const it = pack.items.find((i) => i.id === id);
  if (!it) return go('#/yo');
  main.replaceChildren(itemView(pack, it, { reason: 'repaso libre', onDone: () => go('#/yo') }));
}
