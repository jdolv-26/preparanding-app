// Repaso espaciado con ts-fsrs (FSRS v6). Estado por card_id estable en IndexedDB.
// Las tarjetas de ítems fallados ("item:<id>") se dan de alta una sola vez (idempotente).
import { createEmptyCard, fsrs, Rating, type Card as FCard, type Grade } from 'ts-fsrs';
import { CORE_VERSION, type Item, type Pack, type PublicCard } from '../core/item.ts';
import { events, kv } from './db.ts';

const f = fsrs();
type States = Record<string, FCard>;
const states = async () => (await kv.get<States>('fsrs')) ?? {};

export const RATINGS: [string, Grade][] = [['Otra vez', Rating.Again], ['Difícil', Rating.Hard], ['Bien', Rating.Good]];

export function itemCard(it: Item): PublicCard {
  return { schema_version: 1, id: `item:${it.id}`, kind: it.kind, skills: it.skills, front: it.card.front, back: it.card.back, sources: it.sources };
}

export async function allCards(pack: Pack): Promise<PublicCard[]> {
  const extra = (await kv.get<string[]>('itemCards')) ?? [];
  const byId = new Map(pack.items.map((i) => [`item:${i.id}`, i]));
  return [...pack.cards, ...extra.filter((id) => byId.has(id)).map((id) => itemCard(byId.get(id)!))];
}

// Vencidas primero; si faltan para llegar a `min`, se completan con nuevas.
export async function pickCards(pack: Pack, min: number, max: number, exclude: string[] = [], now = new Date()): Promise<string[]> {
  const s = await states();
  const all = (await allCards(pack)).filter((c) => !exclude.includes(c.id));
  const due = all.filter((c) => s[c.id] && new Date(s[c.id].due) <= now).sort((a, b) => +new Date(s[a.id].due) - +new Date(s[b.id].due));
  const fresh = all.filter((c) => !s[c.id]);
  const out = due.slice(0, max).map((c) => c.id);
  for (const c of fresh) { if (out.length >= min) break; out.push(c.id); }
  return out;
}

export async function dueCount(pack: Pack, now = new Date()) {
  const s = await states();
  return (await allCards(pack)).filter((c) => s[c.id] && new Date(s[c.id].due) <= now).length;
}

export async function review(id: string, grade: Grade, now = new Date()) {
  const s = await states();
  s[id] = f.next(s[id] ?? createEmptyCard(now), now, grade).card;
  await kv.set('fsrs', s);
  await events.add({ id: crypto.randomUUID(), type: 'review', schema_version: 1, core_version: CORE_VERSION, at: now.toISOString(), card_id: id, grade });
}

export async function addItemCard(it: Item): Promise<boolean> {
  const list = (await kv.get<string[]>('itemCards')) ?? [];
  const id = `item:${it.id}`;
  if (list.includes(id)) return false;
  await kv.set('itemCards', [...list, id]);
  return true;
}
