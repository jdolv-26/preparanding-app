// Banco de la fase 0: casos sintéticos hechos a mano (D17). Todos los datos son inventados.
// Pasa a preparanding-engine/bank en la fase 1.
import type { BankItem } from '../core/item.ts';

const PANDAS = { title: 'pandas 3.0 API reference', version: 'pandas 3.0.2' };
const SQLITE = { title: 'SQLite documentation', version: 'SQLite (sql.js 1.17.0)' };

const rhCsv = `CSV = """id,nombre,departamento,salario,fecha_ingreso
1, Ana López ,Ventas,"18,500",2023-02-01
2,Luis Pérez,ventas,21000,2022-11-15
3,Marta Ruiz,Calidad,,2021-06-30
4,Luis Pérez,ventas,21000,2022-11-15
5,Jorge Díaz,CALIDAD,19800,2024-01-10
6,Sofía Gil,Producción,17200,2023-08-21
"""
import io
import pandas as pd
df = pd.read_csv(io.StringIO(CSV))
`;

export const items: BankItem[] = [
  {
    schema_version: 1,
    id: 'py-rh-limpieza',
    kind: 'python',
    title: 'El resumen de salarios de RH no cuadra',
    device: 'any',
    skills: ['pandas', 'limpieza-datos'],
    prompt: `RH exporta un CSV con empleados. \`limpiar(df)\` debería dejar los datos listos y \`resumen(df)\` dar el **salario promedio por departamento**.

El reporte sale mal: Ventas aparece con un promedio raro y hay una persona contada dos veces.

Arregla \`limpiar\`. El DataFrame \`df\` ya está cargado:

| id | nombre | departamento | salario | fecha_ingreso |
|---|---|---|---|---|
| 1 | " Ana López " | Ventas | "18,500" | 2023-02-01 |
| 2 | Luis Pérez | ventas | 21000 | 2022-11-15 |
| 3 | Marta Ruiz | Calidad | *(vacío)* | 2021-06-30 |
| 4 | Luis Pérez | ventas | 21000 | 2022-11-15 |
| 5 | Jorge Díaz | CALIDAD | 19800 | 2024-01-10 |
| 6 | Sofía Gil | Producción | 17200 | 2023-08-21 |

Un duplicado es la misma persona con la misma fecha de ingreso, aunque tenga otro \`id\`.`,
    setup: rhCsv,
    starter: `def limpiar(df):
    df = df.copy()
    df["nombre"] = df["nombre"].str.strip()
    df["departamento"] = df["departamento"].str.capitalize()
    df["salario"] = pd.to_numeric(df["salario"], errors="coerce")
    df = df.drop_duplicates()
    return df

def resumen(df):
    return df.groupby("departamento")["salario"].mean().round(0).to_dict()
`,
    ref: `def limpiar(df):
    df = df.copy()
    df["nombre"] = df["nombre"].str.strip()
    df["departamento"] = df["departamento"].str.capitalize()
    df["salario"] = pd.to_numeric(df["salario"].str.replace(",", ""), errors="coerce")
    df = df.drop_duplicates(subset=["nombre", "fecha_ingreso"])
    return df

def resumen(df):
    return df.groupby("departamento")["salario"].mean().round(0).to_dict()
`,
    wrong: `def limpiar(df):
    df = df.copy()
    df["nombre"] = df["nombre"].str.strip()
    df["departamento"] = df["departamento"].str.capitalize()
    df["salario"] = pd.to_numeric(df["salario"].str.replace(",", ""), errors="coerce")
    df = df.drop_duplicates()
    return df

def resumen(df):
    return df.groupby("departamento")["salario"].mean().round(0).to_dict()
`,
    tests: [
      { name: 'el salario "18,500" se lee como 18500', code: 'check(float(limpiar(df).loc[lambda d: d["id"] == 1, "salario"].iloc[0]), 18500.0)' },
      { name: 'Luis Pérez aparece una sola vez', code: 'check(len(limpiar(df)), 5)' },
      { name: 'resumen por departamento', code: 'check(resumen(limpiar(df)), {"Calidad": 19800.0, "Producción": 17200.0, "Ventas": 19750.0})' },
    ],
    starter_expect: { 'el salario "18,500" se lee como 18500': 'fail', 'Luis Pérez aparece una sola vez': 'fail', 'resumen por departamento': 'fail' },
    hints: [
      '`pd.to_numeric(..., errors="coerce")` convierte en NaN lo que no puede leer. ¿Qué tiene "18,500" que no es un número?',
      '`drop_duplicates()` compara todas las columnas, incluido `id`. Mira el parámetro `subset`.',
    ],
    solution: `Quita la coma antes de convertir y define qué columnas hacen a una fila duplicada:

\`\`\`python
df["salario"] = pd.to_numeric(df["salario"].str.replace(",", ""), errors="coerce")
df = df.drop_duplicates(subset=["nombre", "fecha_ingreso"])
\`\`\``,
    card: { front: '¿Por qué `drop_duplicates()` no quitó a Luis Pérez repetido?', back: 'Sin `subset` compara todas las columnas; el `id` distinto hace que las filas no sean iguales. Usa `subset=["nombre", "fecha_ingreso"]`.' },
    sources: [
      { url: 'https://pandas.pydata.org/docs/reference/api/pandas.to_numeric.html', ...PANDAS },
      { url: 'https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.drop_duplicates.html', ...PANDAS },
    ],
  },
  {
    schema_version: 1,
    id: 'py-ventas-mes',
    kind: 'python',
    title: 'Las ventas por mes salen agrupadas por año',
    device: 'any',
    skills: ['pandas', 'agregacion'],
    prompt: `\`por_mes(df)\` debe devolver el **total vendido por mes** como \`{"AAAA-MM": total}\`.

Hoy devuelve una sola llave y números que no son montos. \`df\` tiene las columnas \`fecha\` (texto \`AAAA-MM-DD\`) y \`monto\`.`,
    setup: `import pandas as pd
df = pd.DataFrame({
    "fecha": ["2026-01-05", "2026-01-20", "2026-02-03", "2026-02-14", "2026-02-28"],
    "monto": [120, 180, 200, 100, 150],
})
`,
    starter: `def por_mes(df):
    df = df.copy()
    df["mes"] = df["fecha"].str[:6]
    return df.groupby("mes")["monto"].count().to_dict()
`,
    ref: `def por_mes(df):
    df = df.copy()
    df["mes"] = df["fecha"].str[:7]
    return df.groupby("mes")["monto"].sum().to_dict()
`,
    wrong: `def por_mes(df):
    df = df.copy()
    df["mes"] = df["fecha"].str[:7]
    return df.groupby("mes")["monto"].count().to_dict()
`,
    tests: [
      { name: 'agrupa por AAAA-MM', code: 'check(sorted(por_mes(df).keys()), ["2026-01", "2026-02"])' },
      { name: 'suma los montos', code: 'check(por_mes(df), {"2026-01": 300, "2026-02": 450})' },
    ],
    starter_expect: { 'agrupa por AAAA-MM': 'fail', 'suma los montos': 'fail' },
    hints: [
      '`"2026-01-05"[:6]` es `"2026-0"`. Cuenta los caracteres de `AAAA-MM`.',
      '`count()` cuenta filas, no suma valores.',
    ],
    solution: `\`\`\`python
df["mes"] = df["fecha"].str[:7]
return df.groupby("mes")["monto"].sum().to_dict()
\`\`\``,
    card: { front: 'En un groupby, ¿qué diferencia hay entre `count()` y `sum()`?', back: '`count()` cuenta valores no nulos por grupo; `sum()` suma los valores.' },
    sources: [
      { url: 'https://pandas.pydata.org/docs/reference/api/pandas.core.groupby.DataFrameGroupBy.count.html', ...PANDAS },
      { url: 'https://pandas.pydata.org/docs/reference/api/pandas.core.groupby.DataFrameGroupBy.sum.html', ...PANDAS },
    ],
  },
  {
    schema_version: 1,
    id: 'py-merge-plantilla',
    kind: 'python',
    title: 'La plantilla de Calidad salió duplicada',
    device: 'any',
    skills: ['pandas', 'joins', 'calidad-datos'],
    prompt: `\`plantilla(empleados, deptos)\` debe contar **cuántas personas hay en cada departamento**.

Hay 5 empleados, pero el conteo da más. La tabla \`deptos\` viene de otro sistema y tiene una fila repetida para el \`depto_id\` 2 (con un espacio de más en el nombre).`,
    setup: `import pandas as pd
empleados = pd.DataFrame({"emp_id": [1, 2, 3, 4, 5], "depto_id": [1, 1, 1, 2, 2]})
deptos = pd.DataFrame({"depto_id": [1, 2, 2], "depto": ["Ventas", "Calidad", "Calidad "]})
`,
    starter: `def plantilla(empleados, deptos):
    m = empleados.merge(deptos, on="depto_id", how="left")
    return m.groupby("depto")["emp_id"].count().to_dict()
`,
    ref: `def plantilla(empleados, deptos):
    deptos = deptos.drop_duplicates(subset="depto_id")
    m = empleados.merge(deptos, on="depto_id", how="left", validate="many_to_one")
    return m.groupby("depto")["emp_id"].count().to_dict()
`,
    wrong: `def plantilla(empleados, deptos):
    deptos = deptos.drop_duplicates()
    m = empleados.merge(deptos, on="depto_id", how="left")
    return m.groupby("depto")["emp_id"].count().to_dict()
`,
    tests: [
      { name: 'el total sigue siendo 5', code: 'check(sum(plantilla(empleados, deptos).values()), 5)' },
      { name: 'conteo por departamento', code: 'check(plantilla(empleados, deptos), {"Calidad": 2, "Ventas": 3})' },
    ],
    starter_expect: { 'el total sigue siendo 5': 'fail', 'conteo por departamento': 'fail' },
    hints: [
      'Si la tabla de la derecha repite una llave, el merge repite las filas de la izquierda.',
      '`drop_duplicates()` sin `subset` no ve iguales "Calidad" y "Calidad ". `validate="many_to_one"` te avisa del problema.',
    ],
    solution: `Deja una fila por llave antes de unir y pide a pandas que lo valide:

\`\`\`python
deptos = deptos.drop_duplicates(subset="depto_id")
m = empleados.merge(deptos, on="depto_id", how="left", validate="many_to_one")
\`\`\``,
    card: { front: '¿Qué hace `validate="many_to_one"` en `merge`?', back: 'Comprueba que las llaves de la tabla derecha sean únicas; si no, lanza `MergeError` en lugar de duplicar filas en silencio.' },
    sources: [{ url: 'https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.merge.html', ...PANDAS }],
  },
  {
    schema_version: 1,
    id: 'sql-cursos-left-join',
    kind: 'sql',
    title: 'Beto desapareció del reporte de capacitación',
    device: 'any',
    skills: ['sql', 'joins'],
    prompt: `El reporte debe listar a **cada empleado con su número de cursos**, ordenado por nombre, incluidos quienes llevan 0.

Tablas: \`empleados(id, nombre)\` y \`capacitaciones(emp_id, curso)\`. Beto no ha tomado cursos y no aparece.`,
    setup: `CREATE TABLE empleados (id INTEGER PRIMARY KEY, nombre TEXT);
INSERT INTO empleados VALUES (1, 'Ana'), (2, 'Beto'), (3, 'Carla');
CREATE TABLE capacitaciones (emp_id INTEGER, curso TEXT);
INSERT INTO capacitaciones VALUES (1, 'Excel'), (1, 'SQL'), (3, 'Python');`,
    starter: `SELECT e.nombre, COUNT(*) AS cursos
FROM empleados e
JOIN capacitaciones c ON c.emp_id = e.id
GROUP BY e.id
ORDER BY e.nombre;`,
    ref: `SELECT e.nombre, COUNT(c.emp_id) AS cursos
FROM empleados e
LEFT JOIN capacitaciones c ON c.emp_id = e.id
GROUP BY e.id
ORDER BY e.nombre;`,
    wrong: `SELECT e.nombre, COUNT(*) AS cursos
FROM empleados e
LEFT JOIN capacitaciones c ON c.emp_id = e.id
GROUP BY e.id
ORDER BY e.nombre;`,
    tests: [{ name: 'todos los empleados con su conteo', expect: [['Ana', 2], ['Beto', 0], ['Carla', 1]] }],
    starter_expect: { 'todos los empleados con su conteo': 'fail' },
    hints: [
      'Un `JOIN` normal solo deja las filas que tienen pareja en las dos tablas.',
      'Con `LEFT JOIN`, Beto llega con `c.emp_id` en NULL. `COUNT(*)` cuenta la fila; `COUNT(columna)` ignora los NULL.',
    ],
    solution: `\`\`\`sql
SELECT e.nombre, COUNT(c.emp_id) AS cursos
FROM empleados e
LEFT JOIN capacitaciones c ON c.emp_id = e.id
GROUP BY e.id
ORDER BY e.nombre;
\`\`\``,
    card: { front: 'Tras un LEFT JOIN, ¿`COUNT(*)` o `COUNT(columna)` para contar coincidencias?', back: '`COUNT(columna)` de la tabla derecha: ignora los NULL. `COUNT(*)` cuenta 1 aunque no haya coincidencia.' },
    sources: [
      { url: 'https://www.sqlite.org/lang_aggfunc.html', ...SQLITE },
      { url: 'https://www.sqlite.org/lang_select.html', ...SQLITE },
    ],
  },
  {
    schema_version: 1,
    id: 'sql-top-salario-depto',
    kind: 'sql',
    title: 'Solo sale una persona en "mejor pagado por departamento"',
    device: 'any',
    skills: ['sql', 'window-functions'],
    prompt: `La consulta debe dar **la persona con el salario más alto de cada departamento**, ordenada por departamento.

Tabla: \`empleados(nombre, depto, salario)\`. Hoy solo devuelve una fila.`,
    setup: `CREATE TABLE empleados (nombre TEXT, depto TEXT, salario INTEGER);
INSERT INTO empleados VALUES
  ('Ana', 'Calidad', 19800), ('Iván', 'Calidad', 22100),
  ('Luis', 'Ventas', 21000), ('Rosa', 'Ventas', 24500), ('Pepe', 'Ventas', 18000);`,
    starter: `SELECT depto, nombre, salario FROM (
  SELECT depto, nombre, salario,
         ROW_NUMBER() OVER (ORDER BY salario DESC) AS rn
  FROM empleados
)
WHERE rn = 1
ORDER BY depto;`,
    ref: `SELECT depto, nombre, salario FROM (
  SELECT depto, nombre, salario,
         ROW_NUMBER() OVER (PARTITION BY depto ORDER BY salario DESC) AS rn
  FROM empleados
)
WHERE rn = 1
ORDER BY depto;`,
    wrong: `SELECT depto, nombre, salario FROM (
  SELECT depto, nombre, salario,
         ROW_NUMBER() OVER (PARTITION BY depto ORDER BY salario) AS rn
  FROM empleados
)
WHERE rn = 1
ORDER BY depto;`,
    tests: [{ name: 'una fila por departamento con el salario más alto', expect: [['Calidad', 'Iván', 22100], ['Ventas', 'Rosa', 24500]] }],
    starter_expect: { 'una fila por departamento con el salario más alto': 'fail' },
    hints: [
      'Sin `PARTITION BY`, `ROW_NUMBER()` numera toda la tabla como un solo grupo.',
      'Revisa también la dirección del `ORDER BY` dentro de `OVER`.',
    ],
    solution: `\`\`\`sql
ROW_NUMBER() OVER (PARTITION BY depto ORDER BY salario DESC) AS rn
\`\`\``,
    card: { front: '¿Qué agrega `PARTITION BY` a una window function?', back: 'Reinicia el cálculo (por ejemplo la numeración de `ROW_NUMBER`) en cada grupo.' },
    sources: [{ url: 'https://www.sqlite.org/windowfunctions.html', ...SQLITE }],
  },
];
