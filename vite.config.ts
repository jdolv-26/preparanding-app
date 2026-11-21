import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const pyodide = JSON.parse(readFileSync('node_modules/pyodide/package.json', 'utf8')).version;

export default defineConfig({
  // En GitHub Pages: BASE=/preparanding-app/
  base: process.env.BASE ?? '/',
  define: { __PYODIDE__: JSON.stringify(pyodide) },
  build: { sourcemap: false, target: 'es2022' },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['pyodide'] },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      manifest: {
        name: 'Preparanding',
        short_name: 'Preparanding',
        description: 'Práctica diaria de Python, SQL y pandas, offline y verificada.',
        lang: 'es',
        display: 'standalone',
        start_url: '.',
        background_color: '#F3F5F1',
        theme_color: '#F3F5F1',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // El shell y el pack van en el precache; Python y sql.js en "runtimes-v1",
        // que llena la pantalla de preparación con progreso real (3A).
        globPatterns: ['**/*.{js,css,html,woff2,png,json}'],
        globIgnores: ['pyodide/**', 'sqljs/**'],
        navigateFallback: 'index.html',
        runtimeCaching: [{
          urlPattern: ({ url }) => /\/(pyodide|sqljs)\//.test(url.pathname),
          handler: 'CacheFirst',
          options: { cacheName: 'runtimes-v1', matchOptions: { ignoreVary: true, ignoreSearch: true } },
        }],
      },
    }),
  ],
});
