import { test, expect } from '@playwright/test';

function seedAuthStorage() {
  localStorage.setItem('token', 'e2e-fake-token');
  localStorage.setItem('refreshToken', 'e2e-fake-refresh');
  localStorage.setItem('permissions', '[]');
}

test.describe('Smoke', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('403 page renders for authenticated shell', async ({ page }) => {
    await page.route('**/api/v1/auth/menus**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, message: 'OK', data: [], traceId: 'e2e' })
      });
    });

    await page.addInitScript(seedAuthStorage);
    await page.goto('/403');
    await expect(page.getByTestId('forbidden-page')).toBeVisible();
  });
});
