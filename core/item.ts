// Schema del ítem y de la tarjeta. `ref` y `wrong` existen solo en el banco;
// el pack publicado nunca los lleva (lo comprueban scripts/build-packs.ts y CI).
export const SCHEMA_VERSION = 1;
export const CORE_VERSION = '0.1.0';

export type Kind = 'python' | 'sql';
export type Status = 'pass' | 'fail' | 'error';

export interface Source { url: string; title: string; version: string }

export interface Test {
  name: string;
  code?: string;          // python: asserts con check(got, expected)
  expect?: unknown[][];   // sql: filas exactas del resultado
}

export interface Item {
  schema_version: number;
  id: string;
  kind: Kind;
  title: string;
  device: 'any' | 'pc';
  skills: string[];
  prompt: string;         // markdown, sin HTML crudo
  setup: string;          // código oculto que prepara los datos
  starter: string;
  tests: Test[];
  starter_expect: Record<string, Status>;
  hints: string[];        // hasta 2
  solution: string;       // "Ver solución" (cuenta como fallo)
  card: { front: string; back: string };
  sources: Source[];
}

export interface BankItem extends Item { ref: string; wrong: string }

export interface Card {
  schema_version: number;
  id: string;
  kind: Kind;
  skills: string[];
  front: string;
  back: string;
  proof: string;          // código que demuestra la afirmación; el verificador lo corre
  sources: Source[];
}

export type PublicCard = Omit<Card, 'proof'>;

export interface Pack {
  schema_version: number;
  core_version: string;
  runtime: Record<string, string>;
  built_at: string;
  runtime_files: { path: string; bytes: number; group: 'python' | 'ejercicios' }[];
  items: Item[];
  cards: PublicCard[];
}

export interface TestResult { name: string; status: Status; message: string }

export function validateItem(x: BankItem): string[] {
  const e: string[] = [];
  const req = ['id', 'kind', 'title', 'device', 'prompt', 'setup', 'starter', 'ref', 'wrong', 'solution'] as const;
  for (const k of req) if (typeof x[k] !== 'string' || !x[k]) e.push(`${x.id}: falta ${k}`);
  if (x.schema_version !== SCHEMA_VERSION) e.push(`${x.id}: schema_version ${x.schema_version}`);
  if (!x.tests?.length) e.push(`${x.id}: sin tests`);
  if ((x.hints?.length ?? 0) > 2) e.push(`${x.id}: más de 2 pistas`);
  if (!x.sources?.length) e.push(`${x.id}: sin fuente`);
  for (const t of x.tests ?? []) if (!(t.name in (x.starter_expect ?? {}))) e.push(`${x.id}: starter_expect sin "${t.name}"`);
  // 10A: un ítem "any" se resuelve editando el starter, con ≤10 líneas nuevas
  if (x.device === 'any' && x.ref) {
    const starter = new Set(x.starter.split('\n').map((l) => l.trim()));
    const nuevas = x.ref.split('\n').filter((l) => l.trim() && !starter.has(l.trim())).length;
    if (nuevas > 10) e.push(`${x.id}: device any con ${nuevas} líneas nuevas (>10)`);
  }
  return e;
}

export function toPublicItem(x: BankItem): Item {
  const { ref: _r, wrong: _w, ...item } = x;
  return item;
}

export function toPublicCard(c: Card): PublicCard {
  const { proof: _p, ...card } = c;
  return card;
}
