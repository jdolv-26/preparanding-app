import { expect, type Page, test } from '@playwright/test';
import { items } from '../bank/items.ts';

const rh = items.find((i) => i.id === 'py-rh-limpieza')!;

async function setCode(page: Page, code: string) {
  await page.getByRole('tab', { name: 'Código' }).click();
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(code);
}

async function prepareOffline(page: Page) {
  await page.goto('/#/preparar');
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.ready).active);
  await page.getByRole('button', { name: 'Descargar' }).click();
  await expect(page.locator('.offline.ok')).toBeVisible({ timeout: 120_000 });
}

test('sesión completa en modo avión: tarjetas, ejercicio verificado y cierre', async ({ page, context }) => {
  await prepareOffline(page);
  await context.setOffline(true);
  await page.goto('/#/hoy');
  await expect(page.locator('.offline.ok')).toBeVisible();
  await page.getByRole('button', { name: /Empezar sesión/ }).click();

  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Ver respuesta' }).click();
    await page.getByRole('button', { name: 'Bien' }).click();
  }

  await expect(page.getByRole('heading', { name: rh.title })).toBeVisible();
  await page.getByRole('button', { name: /verificado/ }).click();
  await expect(page.getByText(/solución de referencia pasa los tests/)).toBeVisible();

  await setCode(page, rh.starter);
  await page.getByRole('button', { name: 'Ejecutar' }).click();
  await expect(page.getByText(`Falla: ${rh.tests[1].name}`)).toBeVisible();
  await expect(page.getByText('esperado: 5').first()).toBeVisible();

  await setCode(page, rh.ref);
  await page.getByRole('button', { name: 'Ejecutar' }).click();
  await expect(page.getByText(`Pasa: ${rh.tests[2].name}`)).toBeVisible();
  await expect(page.getByText('Se creó una tarjeta para repasar esto.')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente' }).click();

  // segundo reto: se resuelve con "Ver solución" (cuenta como fallo)
  await page.getByRole('tab', { name: 'Enunciado' }).click();
  await page.getByRole('button', { name: /Ver solución/ }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();

  // repaso opcional: se puede terminar aquí
  const terminar = page.getByRole('button', { name: 'Terminar aquí' });
  if (await terminar.isVisible().catch(() => false)) await terminar.click();
  await expect(page.getByRole('heading', { name: 'Sesión terminada' })).toBeVisible();
  await expect(page.getByText('Esta semana:')).toBeVisible();
});

test('un ciclo infinito se corta a los 10 s y Python vuelve a correr', async ({ page }) => {
  await page.goto(`/#/item/${rh.id}`);
  await setCode(page, 'while True:\n    pass\n');
  await page.getByRole('button', { name: 'Ejecutar' }).click();
  await expect(page.locator('#results').getByText(/tardó más de 10 s/)).toBeVisible({ timeout: 90_000 });
  await setCode(page, rh.ref);
  await page.getByRole('button', { name: 'Ejecutar' }).click();
  await expect(page.getByText(`Pasa: ${rh.tests[0].name}`)).toBeVisible({ timeout: 90_000 });
});

test('el borrador se guarda solo y sobrevive a cerrar la app', async ({ page }) => {
  await page.goto(`/#/item/${rh.id}`);
  await setCode(page, '# mi borrador\n');
  await page.waitForTimeout(2500);
  await page.reload();
  await page.getByRole('tab', { name: 'Código' }).click();
  await expect(page.locator('.cm-content')).toContainText('# mi borrador');
});

test('sin fetch externo: la CSP bloquea conexiones a otros orígenes', async ({ page }) => {
  await page.goto('/#/hoy');
  const blocked = await page.evaluate(() => fetch('https://example.com').then(() => false, () => true));
  expect(blocked).toBe(true);
});
