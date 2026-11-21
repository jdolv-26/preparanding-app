import { expect, test } from 'vitest';
import { renderMd } from './dom.ts';

test('el markdown de un ítem malicioso se muestra como texto (D13)', () => {
  const out = renderMd('Hola <img src=x onerror="fetch(1)"> <script>alert(1)</script>\n\n[x](javascript:alert(1))');
  expect(out).not.toMatch(/<img|<script/);
  expect(out).toContain('&lt;script&gt;');
  expect(out).not.toContain('href="javascript:');
});
