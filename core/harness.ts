// Arnés de ejecución compartido por el worker del navegador y el verificador en Node,
// para que la app y la verificación corran exactamente lo mismo.
import type { Item, TestResult } from './item.ts';

const PY_HARNESS = String.raw`
import json, math, traceback

def _show(x):
    try:
        import pandas as pd
        if isinstance(x, (pd.DataFrame, pd.Series)):
            return x.to_string(max_rows=20)
    except Exception:
        pass
    return repr(x)

def _eq(a, b):
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_eq(a[k], b[k]) for k in a)
    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
        return len(a) == len(b) and all(_eq(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float):
        try:
            return math.isclose(float(a), float(b), rel_tol=1e-9, abs_tol=1e-9)
        except Exception:
            return False
    return bool(a == b)

def check(got, expected):
    if not _eq(got, expected):
        raise AssertionError("esperado: " + _show(expected) + "\nobtenido: " + _show(got))

def _last_line(e):
    return "".join(traceback.format_exception_only(type(e), e)).strip()

def _run(setup, code, tests_json):
    tests = json.loads(tests_json)
    ns = {"check": check}
    exec(setup, ns)
    try:
        exec(code, ns)
    except Exception as e:
        msg = "Tu código falla al cargarse: " + _last_line(e)
        return json.dumps([{"name": t["name"], "status": "error", "message": msg} for t in tests])
    out = []
    for t in tests:
        try:
            exec(t["code"], dict(ns))
            out.append({"name": t["name"], "status": "pass", "message": ""})
        except AssertionError as e:
            out.append({"name": t["name"], "status": "fail", "message": str(e)})
        except Exception as e:
            out.append({"name": t["name"], "status": "error", "message": _last_line(e)})
    return json.dumps(out)
`;

export interface PyodideLike {
  runPython(code: string): unknown;
  globals: { get(name: string): (...a: unknown[]) => unknown };
}

const loaded = new WeakSet<object>();

export function runPython(py: PyodideLike, item: Pick<Item, 'setup' | 'tests'>, code: string): TestResult[] {
  if (!loaded.has(py)) { py.runPython(PY_HARNESS); loaded.add(py); }
  const tests = JSON.stringify(item.tests.map((t) => ({ name: t.name, code: t.code ?? '' })));
  return JSON.parse(py.globals.get('_run')(item.setup, code, tests) as string);
}

export interface SqlDb { exec(sql: string): { columns: string[]; values: unknown[][] }[]; close(): void }

export function runSql(newDb: () => SqlDb, item: Pick<Item, 'setup' | 'tests'>, code: string): TestResult[] {
  const db = newDb();
  try {
    db.exec(item.setup);
    let rows: unknown[][];
    try {
      const res = db.exec(code);
      rows = res.length ? res[res.length - 1].values : [];
    } catch (e) {
      const msg = `Tu consulta falla: ${(e as Error).message}`;
      return item.tests.map((t) => ({ name: t.name, status: 'error' as const, message: msg }));
    }
    const show = (r: unknown[][]) => r.map((x) => JSON.stringify(x)).join('\n') || '(sin filas)';
    return item.tests.map((t) => {
      const exp = t.expect ?? [];
      const ok = JSON.stringify(rows) === JSON.stringify(exp);
      return { name: t.name, status: ok ? 'pass' as const : 'fail' as const, message: ok ? '' : `esperado:\n${show(exp)}\nobtenido:\n${show(rows)}` };
    });
  } finally { db.close(); }
}
