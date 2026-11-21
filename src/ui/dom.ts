import MarkdownIt from 'markdown-it';

type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | boolean | ((e: Event) => void) | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const k of kids) if (k) el.append(k);
  return el;
}

// D13: el markdown se renderiza sin HTML crudo (html: false escapa cualquier etiqueta).
const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
const defaultLink = md.renderer.rules.link_open ?? ((t, i, o, _e, s) => s.renderToken(t, i, o));
md.renderer.rules.link_open = (t, i, o, e, s) => {
  t[i].attrSet('target', '_blank');
  t[i].attrSet('rel', 'noopener noreferrer');
  return defaultLink(t, i, o, e, s);
};

export const renderMd = (src: string) => md.render(src);

export function markdown(src: string, cls = 'prose'): HTMLElement {
  const el = h('div', { class: cls });
  el.innerHTML = renderMd(src);
  for (const t of el.querySelectorAll('table')) t.replaceWith(h('div', { class: 'scroll-x', tabindex: '0', role: 'region', 'aria-label': 'Tabla' }, t.cloneNode(true)));
  return el;
}

export function announce(msg: string) {
  const live = document.getElementById('live')!;
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = msg; });
}
