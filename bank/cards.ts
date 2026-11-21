// Tarjetas de concepto para el calentamiento FSRS. Cada afirmación trae `proof`:
// código que la demuestra contra el runtime fijado. Si deja de ser cierta, la build falla.
import type { Card } from '../core/item.ts';

const PANDAS = { title: 'pandas 3.0 API reference', version: 'pandas 3.0.2' };
const SQLITE = { title: 'SQLite documentation', version: 'SQLite (sql.js 1.17.0)' };

export const cards: Card[] = [
  {
    schema_version: 1, id: 'c-to-numeric-coerce', kind: 'python', skills: ['pandas', 'limpieza-datos'],
    front: '¿Qué devuelve `pd.to_numeric(["18,500"], errors="coerce")`?',
    back: 'NaN: la coma de miles no es un número válido y `coerce` convierte lo ilegible en NaN sin avisar.',
    proof: 'import pandas as pd, math\ncheck(math.isnan(pd.to_numeric(pd.Series(["18,500"]), errors="coerce").iloc[0]), True)',
    sources: [{ url: 'https://pandas.pydata.org/docs/reference/api/pandas.to_numeric.html', ...PANDAS }],
  },
  {
    schema_version: 1, id: 'c-groupby-mean-nan', kind: 'python', skills: ['pandas', 'agregacion'],
    front: '¿`groupby(...).mean()` cuenta los NaN como 0?',
    back: 'No. Los excluye: el promedio de [10, NaN, 20] es 15.',
    proof: 'import pandas as pd\ncheck(float(pd.DataFrame({"g": [1, 1, 1], "x": [10, None, 20]}).groupby("g")["x"].mean().iloc[0]), 15.0)',
    sources: [{ url: 'https://pandas.pydata.org/docs/reference/api/pandas.core.groupby.DataFrameGroupBy.mean.html', ...PANDAS }],
  },
  {
    schema_version: 1, id: 'c-drop-duplicates-keep', kind: 'python', skills: ['pandas', 'limpieza-datos'],
    front: '¿Qué fila conserva `drop_duplicates()` por defecto?',
    back: 'La primera aparición (`keep="first"`). Con `keep=False` quita todas las repetidas.',
    proof: 'import pandas as pd\ncheck(pd.DataFrame({"k": [1, 1], "v": ["a", "b"]}).drop_duplicates(subset="k")["v"].tolist(), ["a"])',
    sources: [{ url: 'https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.drop_duplicates.html', ...PANDAS }],
  },
  {
    schema_version: 1, id: 'c-merge-validate', kind: 'python', skills: ['pandas', 'joins'],
    front: '¿Qué pasa con `merge(..., validate="many_to_one")` si la tabla derecha repite una llave?',
    back: 'Lanza `pandas.errors.MergeError` en lugar de duplicar filas.',
    proof: 'import pandas as pd\ntry:\n    pd.DataFrame({"k": [1]}).merge(pd.DataFrame({"k": [1, 1]}), on="k", validate="many_to_one")\n    ok = False\nexcept pd.errors.MergeError:\n    ok = True\ncheck(ok, True)',
    sources: [{ url: 'https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.merge.html', ...PANDAS }],
  },
  {
    schema_version: 1, id: 'c-count-null', kind: 'sql', skills: ['sql', 'agregacion'],
    front: '¿`COUNT(col)` cuenta los NULL?',
    back: 'No. `COUNT(col)` cuenta valores no NULL; `COUNT(*)` cuenta filas.',
    proof: 'SELECT COUNT(x), COUNT(*) FROM (SELECT NULL AS x UNION ALL SELECT 1);\n-- expect: [[1,2]]',
    sources: [{ url: 'https://www.sqlite.org/lang_aggfunc.html', ...SQLITE }],
  },
  {
    schema_version: 1, id: 'c-where-vs-having', kind: 'sql', skills: ['sql', 'agregacion'],
    front: '¿Cuándo se filtra con `HAVING` en lugar de `WHERE`?',
    back: '`WHERE` filtra filas antes de agrupar; `HAVING` filtra grupos después, y puede usar agregados como `COUNT(*) > 1`.',
    proof: 'SELECT g FROM (SELECT 1 AS g UNION ALL SELECT 1 UNION ALL SELECT 2) GROUP BY g HAVING COUNT(*) > 1;\n-- expect: [[1]]',
    sources: [{ url: 'https://www.sqlite.org/lang_select.html', ...SQLITE }],
  },
];
