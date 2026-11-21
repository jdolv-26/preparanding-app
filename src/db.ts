// IndexedDB mínimo: un almacén clave-valor y uno de eventos (intentos, repasos, defectos).
// Los eventos llevan id estable para el dedup de la sync de la fase 2.
const DB = 'preparanding';
let dbp: Promise<IDBDatabase> | undefined;

function open(): Promise<IDBDatabase> {
  return (dbp ??= new Promise((ok, ko) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('kv');
      r.result.createObjectStore('events', { keyPath: 'id' });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  }));
}

function req<T>(store: string, mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then((db) => new Promise<T>((ok, ko) => {
    const r = f(db.transaction(store, mode).objectStore(store));
    r.onsuccess = () => ok(r.result as T);
    r.onerror = () => ko(r.error);
  }));
}

export const kv = {
  get: <T>(k: string) => req<T | undefined>('kv', 'readonly', (s) => s.get(k)),
  set: (k: string, v: unknown) => req<void>('kv', 'readwrite', (s) => s.put(v, k)),
  del: (k: string) => req<void>('kv', 'readwrite', (s) => s.delete(k)),
};

export type EventType = 'attempt' | 'review' | 'item_defect';
export interface AppEvent {
  id: string;
  type: EventType;
  schema_version: 1;
  core_version: string;
  at: string;
  [k: string]: unknown;
}

export const events = {
  add: (e: AppEvent) => req<void>('events', 'readwrite', (s) => s.put(e)),
  all: () => req<AppEvent[]>('events', 'readonly', (s) => s.getAll()),
};
