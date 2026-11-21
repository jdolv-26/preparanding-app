---
# gstack: design-md-format=spec
name: Preparanding
description: Instrumento calibrado. Superficies mate, tinta precisa y una sola señal de acción; cada dato dice de dónde viene.
colors:
  background: "#F3F5F1"
  background-dark: "#101518"
  surface: "#FFFFFF"
  surface-dark: "#1A2125"
  text: "#18211D"
  text-dark: "#E2E8DD"
  text-muted: "#4A574F"
  text-muted-dark: "#A3B0A8"
  line: "#D3DACE"
  line-dark: "#2A343B"
  border: "#7D8A80"
  border-dark: "#5E6B74"
  primary: "#F2C230"
  primary-dark: "#E3B321"
  on-primary: "#18211D"
  on-primary-dark: "#101518"
  evidence: "#1F4C8A"
  evidence-dark: "#8DB5EE"
  evidence-surface: "#E7EEF8"
  evidence-surface-dark: "#16233A"
  success: "#2D6A3E"
  success-dark: "#86CF98"
  warning: "#8A5A00"
  warning-dark: "#F1C66D"
  error: "#A8261C"
  error-dark: "#FF8F84"
  code-string: "#8A4B08"
  code-string-dark: "#E2A36B"
  code-number: "#0B6E64"
  code-number-dark: "#6FD2C0"
typography:
  display:
    fontFamily: Recursive Variable
    fontWeight: 800
    fontSize: 2rem
    letterSpacing: -0.01em
  heading:
    fontFamily: Recursive Variable
    fontWeight: 750
    fontSize: 1.25rem
  body:
    fontFamily: Recursive Variable
    fontSize: 1rem
    lineHeight: 1.5
  reading:
    fontFamily: Atkinson Hyperlegible Next Variable
    fontSize: 1.0625rem
    lineHeight: 1.55
  label:
    fontFamily: Recursive Variable
    fontWeight: 600
    fontSize: 0.8125rem
  mono:
    fontFamily: Recursive Variable
    fontVariation: '"MONO" 1'
    fontSize: 1rem
    fontFeature: tnum
  hint:
    fontFamily: Recursive Variable
    fontVariation: '"CASL" 0.6'
    fontSize: 0.9375rem
rounded:
  sm: 3px
  md: 4px
  card: 8px
  device: 12px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  2xl: 2rem
  3xl: 3rem
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    borderColor: "{colors.text}"
    borderWidth: 2px
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    borderColor: "{colors.border}"
    borderWidth: 2px
    rounded: "{rounded.md}"
  proof-strip:
    backgroundColor: "{colors.evidence-surface}"
    textColor: "{colors.evidence}"
    rounded: "{rounded.md}"
  fsrs-card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.card}"
  input:
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
  nav-link:
    textColor: "{colors.text-muted}"
---

# Preparanding

## Overview

**Creative North Star:** instrumento calibrado. Lo que el usuario debe recordar es "confianza en lo que aprendo": todo tiene fuente y está verificado, y la interfaz lo muestra en vez de prometerlo.
**Product context:** PWA offline para una sola persona (estudiante de TI) que practica Python/SQL/pandas, repaso FSRS, mercado de habilidades vs vacantes y entrevistas en PC. Categoría: apps de práctica de código y repaso espaciado (Codecademy smart practice, acodeaday, apps tipo LeetFlash), que se apoyan en gamificación y no muestran procedencia.
**Mode per surface:** Hoy, sesión, ejercicio, mercado y Yo son Operate. Los enunciados largos son Read dentro de Operate.
**Reference sites:** https://github.com/GoogleChrome/modern-web-guidance (guías dark-mode, color, typography, respect-os-text-scale, visually-stable-font-fallbacks); https://www.codecademy.com/resources/blog/behind-the-build-smart-practice/ ; https://github.com/engineeringwithtemi/acodeaday
**Key characteristics:**
- Un solo bloque amarillo dice qué hacer; nada más compite.
- La franja azul de verificación dice por qué creerle a cada ítem.
- Superficies mate, sin sombras: se lee igual a pleno sol que de noche.
- Medición honesta: rangos y "muestra chica", nunca rachas ni confeti.

## Colors

**Strategy:** restringida con dos señales de trabajo fijo. Neutros verde-grisáceos (tinta y papel técnico, no crema) más un amarillo de señalización que solo existe como relleno de la acción principal y un azul cianotipo que solo marca procedencia. Verde, rojo y ámbar son semánticos y siempre van con ícono y texto (✓ ✕ !), nunca solos.
**Light or dark:** los dos, según `prefers-color-scheme`, porque la escena es un camión de día (sol directo, tema claro de alto contraste) y de noche (tema oscuro). Se implementa con `color-scheme: light dark`, `<meta name="color-scheme" content="light dark">` y tokens `light-dark()` (Modern Web Guidance, dark-mode).
- Contraste verificado: tinta/fondo 15.0:1 (claro) y 14.7:1 (oscuro); tinta 2 6.9:1 y 8.2:1; evidencia 7.8:1 y 8.7:1; texto sobre la acción 9.8:1 y 9.4:1; bordes de control 3.3:1 y 3.4:1.
- El amarillo contra el fondo claro es 1.5:1, por eso el botón primario lleva siempre un borde de tinta de 2 px (contraste no textual ≥3:1).
- `line` es solo para divisores decorativos; todo límite de control usa `border`.
- El tema oscuro no invierte: las superficies suben un paso de luminosidad (`#101518` → `#1A2125`) para mantener la jerarquía, y los semánticos se aclaran para conservar el contraste.
- `accent-color` usa `evidence` para los controles nativos. Soportar `forced-colors: active` con colores del sistema.

## Typography

- **Recursive** (Arrow Type, OFL-1.1, variable, ejes wght/slnt/MONO/CASL/CRSV) es la voz única. MONO 0 para interfaz y títulos; MONO 1 para código, versiones, fechas y conteos (dato real, no disfraz); CASL ≈0.6 solo en pistas, para que suenen a nota de un mentor. Un solo archivo cubre UI y editor con métricas compartidas.
- **Atkinson Hyperlegible Next** (OFL-1.1) para enunciados largos en el celular: distingue caracteres con reflejo de sol.
- Carga autoalojada con `@fontsource-variable/recursive` y `@fontsource-variable/atkinson-hyperlegible-next` (subset latin), precacheadas por el service worker para offline. `font-display: swap` y `font-size-adjust: from-font` para fallbacks estables.
- Tamaños en `rem` (nunca `px` para texto), `<meta name="text-scale" content="scale">` para respetar el tamaño de texto del sistema, código ≥1rem (evita el zoom de iOS), `line-height` sin unidad, enunciados con máximo 65ch.
- Escala: 2rem / 1.25rem / 1rem / 0.8125rem. Los niveles difieren en tamaño y peso, nunca solo en peso.

## Layout

- Celular (<48rem): una columna, barra inferior Hoy · Mercado · Yo, pestañas Enunciado · Código · Resultado, Ejecutar fijo sobre el teclado (visualViewport), barra de símbolos encima.
- PC (≥48rem): navegación lateral de 11rem y dos columnas (enunciado y resultado | editor), ancho máximo 72rem.
- Inicio con un solo foco (CTA abajo, al alcance del pulgar), un único espacio de aviso arriba.
- Ritmo de espacio: base 0.25rem; 0.75–1rem dentro de bloques, 1.5–3rem entre secciones. Densidad cómoda, no aireada.
- Objetivos táctiles ≥2.75rem (44 px). Alineado a la izquierda; nada centrado salvo pies de figura.

## Modern Web Guidance (fuente de las reglas de implementación)

Este sistema se implementa siguiendo Modern Web Guidance (https://github.com/GoogleChrome/modern-web-guidance; Chrome, Edge, Firefox y MDN). Antes de construir un patrón, se consulta su guía con `npx modern-web-guidance@latest search "<patrón>"` y `retrieve "<id>"`, y en CI se corre `npx modern-web-guidance@latest legacy-scan .`. Guías ya aplicadas a este documento:

| Guía | Qué fija en Preparanding |
|---|---|
| `dark-mode` | `<meta name="color-scheme" content="light dark">` + `color-scheme: light dark` en `:root`; tokens con `light-dark()` que guardan los valores crudos en propiedades separadas; `accent-color` y `scrollbar-color` desde los tokens; `::selection` y el caret con la paleta |
| `component-specific-light-dark-theme` | El editor y los bloques de resultado **siguen el tema de la página**, sin forzar `color-scheme: dark`; nunca se pone `color-scheme` en un elemento sin fondo; los tokens no se registran como `<color>` |
| `color` | Ningún estado solo por color (✓ ✕ !); 4.5:1 en texto y 3:1 en límites y estados de controles; soporte de `forced-colors: active` con colores del sistema; tintes con `color-mix(in oklab, …)`, nunca `in oklch` con neutros |
| `contrast-color` | Texto sobre la acción fijo en `on-primary` (verificado 9.8:1 y 9.4:1), sin calcularlo en tiempo de ejecución |
| `typography` | `rem` para tamaños, `line-height` sin unidad, enunciados con máximo 65ch, `text-wrap: balance` en títulos y `pretty` en enunciados (nunca en `*`), sin mayúsculas para enfatizar, reflow a 320px sin scroll horizontal (salvo los bloques de código y tablas, que tienen scroll propio) |
| `respect-os-text-scale` | `<meta name="text-scale" content="scale">`; sin tamaño de fuente en `:root`/`html` |
| `visually-stable-font-fallbacks` | `font-size-adjust: from-font` en el contenedor de texto |
| `fluid-scaling` | En PC, las columnas del ejercicio son contenedores (`container-type: inline-size`) y el texto escala con `clamp()` usando unidades de contenedor + `rem`, con un máximo ≤2.5× el mínimo |
| `css` | Dos niveles de tokens (literales → semánticos); un tercer nivel solo para el botón primario y la franja de verificación; ningún valor no trivial inline; sin resets globales en `*`; `:has()` en vez de clases de estado en JS |
| `natural-interactions` | Cada control distingue hover, pulsado y foco (también combinados): hover = borde `text`, pulsado = desplazamiento de 1px, foco = outline 3px `evidence` con offset (≥3:1 contra el fondo en los dos temas); las pistas y la cita de la franja se despliegan desde su disparador; los scrollers horizontales (tablas, barra de símbolos) se pueden deslizar; todo es alcanzable con teclado |
| `accessibility` | Landmarks `header`/`nav`/`main` (un solo `main`) y skip link; objetivos ≥2.75rem (más que el mínimo AA de 24px) con `min-block-size`, no `height`; una región `aria-live="polite"` para resultados de tests y "guardado"; `assertive` solo para pérdida de datos o token caducado; íconos decorativos con `aria-hidden` |
| `icons` | Íconos como tokens CSS (`--icon-*`) con data URIs o URLs raíz, así funcionan offline y heredan el color con `mask`; los botones solo con ícono llevan nombre accesible |
| `install-web-app` | La pantalla de primera vez (3A) ofrece instalar con el elemento `<install>` o `navigator.install()` llamado dentro del click, con `beforeinstallprompt` y el manifiesto como fallback |

## Elevation & Depth

Sin sombras. La profundidad se expresa con superficie (`surface` sobre `background`) y bordes de 1–2 px. Nunca halos ni brillos, tampoco en el tema oscuro.

## Shapes

Esquinas casi rectas: 3–4px en botones, entradas, franjas y pestañas; 8px solo en la tarjeta FSRS (la única tarjeta del sistema); 12px solo en marcos de dispositivo de vistas previas. Radio interior = radio exterior − separación.

## Components

- **Botón primario:** relleno `primary`, texto `on-primary`, borde 2px `text`. Uno por pantalla como máximo. Hover: borde de 3px. Foco: outline 3px `evidence` con offset 2px. Pulsado: desplazamiento de 1px (`natural-interactions`). Deshabilitado: `surface` + borde `border` + texto `text-muted`, nunca un amarillo apagado.
- **Botón secundario:** `surface` con borde 2px `border`.
- **Franja de verificación (proof-strip):** fondo `evidence-surface`, texto `evidence`, contenido en MONO 1: herramienta y versión · fuente oficial · fecha de consulta · ✓ ejecutado/verificado. Obligatoria en todo ítem, tarjeta y habilidad. Al tocarla se despliega la cita exacta con su enlace. Es el único momento de motion de la app (ver Motion).
- **Resultado de test:** fila con ✓ o ✕ + frase; el fallo muestra esperado vs obtenido en un bloque MONO con scroll horizontal propio (DataFrames de ≤20 filas).
- **Pista:** borde discontinuo `border`, voz CASL; máximo 2 por ítem; "Ver solución" va al final y es secundario.
- **Barra de mercado:** tú (relleno `text`) contra la mediana (marca de 3px `evidence`), con rango del dominio; con n chico se raya el relleno y aparece la etiqueta "muestra chica" (`warning`). El rayado codifica incertidumbre, no decora.
- **Aviso único:** borde `warning` + ícono "!" + acción; solo el de mayor prioridad, con "y N más".
- **Tarjeta FSRS:** `surface`, borde `border`, radio 8px; botones Otra vez / Difícil / Bien en una fila de 3, cada uno ≥2.75rem.
- **Editor (resaltado de sintaxis):** palabras clave en `text` con peso 700, sin color; strings `code-string` (6.8:1 / 7.5:1); números `code-number` (6.1:1 / 9.1:1); comentarios `text-muted` (7.6:1 / 7.3:1). Nunca `evidence` ni `success`/`error` dentro del código: esas señales son exclusivas de procedencia y resultado.
- **Barra de símbolos:** fila sobre el teclado con teclas ⇥ ( ) [ ] : ' " = . _ # ↶, cada una ≥2.75rem, borde `border`, fondo `surface`, MONO 1, con scroll horizontal deslizable (`natural-interactions`).
- **Progreso por bloques:** 3 segmentos de 0.3rem de alto con el nombre del bloque debajo: completado `text`, actual a medias, pendiente `line`.
- **Progreso de primera descarga:** lista de 3 filas (app · Python · ejercicios) con ✓ o porcentaje en MONO 1 y el tamaño real; botón secundario "Pausar".
- **Campo de token:** input con borde `border` y etiqueta visible; OK con ✓ `success` + "Token OK, vence el <fecha>"; error con ✕ `error` + motivo (inválido, sin acceso, sin permiso de escritura). El resultado se anuncia en la región `aria-live="polite"`.
- **Etiquetas de incertidumbre:** "muestra chica" y "baja confianza" comparten estilo: texto `warning`, borde 1px `warning`, radio `sm`.
- **Ítem retirado:** en el lugar del ejercicio, aviso con ✕ y "Retirado para revisión: se comportó distinto en este dispositivo"; la sesión continúa con el siguiente ítem.
- **Pestañas y navegación:** el activo lleva una barra de 3px `text` y texto `text`; los inactivos, `text-muted`.

## Do's and Don'ts

- Do: mostrar la franja de verificación en cada ítem, tarjeta y habilidad.
- Do: acompañar todo estado de color con ícono y texto (✓ ✕ !).
- Do: usar MONO 1 solo para datos reales (código, versiones, fechas, n).
- Do: comprobar AA en los dos temas cada vez que se agregue un par de colores.
- Do: consultar Modern Web Guidance (`npx modern-web-guidance search/retrieve`) antes de implementar un patrón web.
- Don't: usar el amarillo como texto, como fondo de sección o en más de un botón por pantalla.
- Don't: usar sombras, halos, gradientes decorativos, retícula de fondo ni perforados.
- Don't: poner tarjetas fuera de la tarjeta FSRS, ni tarjetas anidadas.
- Don't: usar rachas, confeti, puntos o frases motivacionales; el progreso es medición ("X de 7 días").
- Don't: mostrar un porcentaje de dominio sin su rango cuando la muestra es chica.

## Motion

- **Approach:** mínimo-funcional.
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)
- **The one authored moment:** al pasar los tests, la franja de verificación se "sella" (aparece en 150ms, ease-out, 0.2rem hacia arriba). Todo dentro de `@media (prefers-reduced-motion: no-preference)`.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-21 | Initial design system created | Created by /design-consultation from the approved plan (decisiones 1A-13A), Modern Web Guidance and category research; direction synthesized from my draft + subagent ("banco de calibración") + Codex ("cuaderno de campo", serif/crema descartados por ser un look genérico) |
| 2026-11-21 | Recursive + Atkinson Hyperlegible Next | OFL-1.1 verificada en Fontsource; un archivo variable cubre UI y código offline; Atkinson para lectura al sol |
| 2026-11-21 | Amarillo de señalización como única acción | Se encuentra a pleno sol; borde de tinta de 2px para contraste no textual |
| 2026-11-21 | Azul cianotipo exclusivo de procedencia | Hace visible "confianza en lo que aprendo" |
| 2026-11-21 | Resaltado de sintaxis propio (code-*) y componentes 7A/9A/3A, token, incertidumbre e ítem retirado | /plan-design-review (segunda vuelta): cada color con un solo trabajo; todo componente aprobado con su especificación |
| 2026-11-21 | Modern Web Guidance como fuente de implementación | Pedido del usuario; 13 guías aplicadas (tabla en su sección); consultar search/retrieve antes de cada patrón y legacy-scan en CI |
