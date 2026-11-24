// 7A: Calentamiento (3-5 tarjetas) → Reto principal (1-2 ítems) → Repaso opcional → Cierre.
// Cada paso terminado se guarda; "Continuar" retoma exactamente ahí.
import type { Item, Pack } from '../core/item.ts';
import { pickCards } from './cards.ts';
import { events, kv } from './db.ts';

export const BLOCKS = ['Calentamiento', 'Reto principal', 'Repaso'] as const;

export interface Session {
  id: string;
  started: string;
  block: 0 | 1 | 2 | 3;   // 3 = cierre
  pos: number;
  warm: string[];
  main: string[];
  review: string[];
  stats: { cards: number; items: number; tests_passed: number; new_cards: number };
  short?: boolean;          // sesión de 3 minutos: solo tarjetas
}

export const current = () => kv.get<Session>('session');
export const save = (s: Session) => kv.set('session', s);
export const clear = () => kv.del('session');

export async function retired(): Promise<string[]> { return (await kv.get<string[]>('retired')) ?? []; }

export async function passedItems(): Promise<Set<string>> {
  return new Set((await events.all()).filter((e) => e.type === 'attempt' && e.passed).map((e) => e.item_id as string));
}

export function fitsDevice(it: Item) {
  return it.device === 'any' || matchMedia('(min-width: 48rem)').matches;
}

export async function mainItems(pack: Pack, n = 2): Promise<string[]> {
  const gone = await retired();
  const done = await passedItems();
  const ok = pack.items.filter((i) => !gone.includes(i.id) && fitsDevice(i));
  return [...ok.filter((i) => !done.has(i.id)), ...ok.filter((i) => done.has(i.id))].slice(0, n).map((i) => i.id);
}

// full: calentamiento + reto + repaso · short: solo tarjetas · reto: directo al ejercicio
export async function start(pack: Pack, kind: 'full' | 'short' | 'reto' = 'full'): Promise<Session> {
  const short = kind === 'short';
  const warm = kind === 'reto' ? [] : await pickCards(pack, 3, 5);
  const s: Session = {
    id: crypto.randomUUID(), started: new Date().toISOString(), block: 0, pos: 0,
    warm, main: short ? [] : await mainItems(pack), review: [],
    stats: { cards: 0, items: 0, tests_passed: 0, new_cards: 0 }, short,
  };
  if (!s.warm.length) s.block = 1;
  await save(s);
  return s;
}

// Avanza al siguiente paso; al salir del reto arma el repaso con lo que haya vencido.
export async function advance(pack: Pack, s: Session): Promise<Session> {
  const list = [s.warm, s.main, s.review][s.block] ?? [];
  if (s.pos + 1 < list.length) s.pos++;
  else {
    s.pos = 0;
    s.block = (s.block + 1) as Session['block'];
    if (s.block === 1 && s.short) s.block = 3;
    else if (s.block === 2) {
      s.review = await pickCards(pack, 0, 5, s.warm);
      if (!s.review.length) s.block = 3;
    }
  }
  await save(s);
  return s;
}

// "Esta semana: X de 7 días" (6A): días distintos con actividad desde el lunes.
export async function daysThisWeek(now = new Date()): Promise<number> {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = new Set((await events.all()).filter((e) => new Date(e.at) >= monday).map((e) => new Date(e.at).toDateString()));
  return days.size;
}
