# preparanding-app

PWA offline de práctica verificada (fase 0). Plan aprobado: repo privado Preparanding, `docs/designs/preparanding-aprendizaje-adaptativo.md`.

- `npm run build`: descarga runtimes (sha256 del lockfile), verifica el banco (ref pasa, wrong falla, starter = starter_expect, proof de tarjetas), compila y escanea dist.
- `npm test` (Vitest: core + src) · `npm run e2e` (Playwright móvil Chromium y WebKit, offline).
- `core/` es compartido con el engine (fase 2): cambio de schema = subir `schema_version`.
- Solo datos sintéticos. Nunca datos de empleadores.

## Design System
Lee DESIGN.md antes de tocar UI. Antes de un patrón web consulta Modern Web Guidance
(`npx modern-web-guidance@latest search "<patrón>"` y `retrieve "<id>"`) y corre
`npx modern-web-guidance@latest legacy-scan .` antes de mezclar cambios de UI.
