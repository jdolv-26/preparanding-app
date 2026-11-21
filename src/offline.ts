// 3A + D-T5: descarga por archivo con streaming (progreso real), pausa con AbortController.
// Una respuesta parcial nunca entra a la caché: cache.put solo al terminar el archivo.
// La caché "runtimes-v1" es la misma que sirve el service worker (CacheFirst).
import type { Pack } from '../core/item.ts';

export const RUNTIME_CACHE = 'runtimes-v1';
const base = new URL(import.meta.env.BASE_URL, location.origin).href;
type RFile = Pack['runtime_files'][number];

export async function missing(pack: Pack): Promise<RFile[]> {
  if (!('caches' in self)) return pack.runtime_files;
  const c = await caches.open(RUNTIME_CACHE);
  const out: RFile[] = [];
  for (const f of pack.runtime_files) if (!(await c.match(base + f.path))) out.push(f);
  return out;
}

export async function prune(pack: Pack) {
  const keep = new Set(pack.runtime_files.map((f) => base + f.path));
  const c = await caches.open(RUNTIME_CACHE);
  for (const r of await c.keys()) if (!keep.has(r.url)) await c.delete(r);
}

export async function download(files: RFile[], onBytes: (f: RFile, n: number) => void, signal: AbortSignal) {
  const c = await caches.open(RUNTIME_CACHE);
  for (const f of files) {
    const url = base + f.path;
    const res = await fetch(url, { signal, cache: 'no-store' });
    if (!res.ok || !res.body) throw new Error(`${f.path}: HTTP ${res.status}`);
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      onBytes(f, value.length);
    }
    // Solo content-type: un "Vary" del servidor haría que el import del módulo no coincida offline.
    const type = res.headers.get('content-type') ?? 'application/octet-stream';
    await c.put(url, new Response(new Blob(chunks as BlobPart[]), { headers: { 'content-type': type } }));
  }
}

export async function persisted(): Promise<boolean> {
  return (await navigator.storage?.persisted?.()) ?? false;
}

export async function askPersist(): Promise<boolean> {
  return (await navigator.storage?.persist?.()) ?? false;
}

export const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
