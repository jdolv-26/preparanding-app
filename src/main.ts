import './styles.css';
import type { Pack } from '../core/item.ts';
import { prune } from './offline.ts';
import { h } from './ui/dom.ts';
import { hoy, libre, mercado, preparar, sesion, yo } from './ui/screens.ts';

const main = document.getElementById('main')!;
const packP: Promise<Pack> = fetch(`${import.meta.env.BASE_URL}packs/pack.json`).then((r) => {
  if (!r.ok) throw new Error(`pack: HTTP ${r.status}`);
  return r.json();
});

async function route() {
  const [, name = 'hoy', arg] = location.hash.split('/');
  for (const a of document.querySelectorAll<HTMLAnchorElement>('[data-nav]')) {
    if (a.dataset.nav === (['sesion', 'preparar'].includes(name) ? 'hoy' : name === 'item' ? 'yo' : name)) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  try {
    const pack = await packP;
    if (name === 'sesion') await sesion(main, pack);
    else if (name === 'preparar') await preparar(main, pack);
    else if (name === 'mercado') mercado(main);
    else if (name === 'yo') await yo(main, pack);
    else if (name === 'item' && arg) await libre(main, pack, decodeURIComponent(arg));
    else await hoy(main, pack);
  } catch (e) {
    main.replaceChildren(h('div', { class: 'notice' }, h('p', {}, '! No se pudo abrir la app: ', String((e as Error).message)), h('p', { class: 'muted' }, 'Si es la primera vez, abre la app con internet una vez.')));
  }
  if (document.activeElement === document.body) main.focus({ preventScroll: true });
}

addEventListener('hashchange', () => void route());
void route();
void packP.then(prune).catch(() => {});
