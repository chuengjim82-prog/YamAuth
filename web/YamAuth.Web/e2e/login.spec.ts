import { test, expect } from '@playwright/test';

const loginSuccessBody = {
  code: 0,
  message: 'OK',
  data: {
    token: 'e2e-jwt-token',
    refreshToken: 'e2e-refresh-token',
    expiresIn: 7200,
    permissions: ['*:*:*'],
    userName: 'admin',
    nickName: 'Admin',
    dataScope: { limited: false, dimensions: {} }
  },
  traceId: 'e2e'
};

const menuTreeBody = {
  code: 0,
  message: 'OK',
  data: [
    {
      id: 1,
      parentId: 0,
      menuName: 'Home',
      menuUrl: '/home',
      menuIcon: '',
      permissions: [],
      children: []
    }
  ],
  traceId: 'e2e'
};

test.describe('Login flow', () => {
  test('submit login form stores token and navigates home', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async route => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(loginSuccessBody)
      });
    });

    await page.route('**/api/v1/auth/menus**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(menuTreeBody)
      });
    });

    await page.goto('/login');
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/home$/);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBe('e2e-jwt-token');
  });

  test('invalid credentials show error (API 400)', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 400,
          message: '用户名或密码错误',
          data: null,
          traceId: 'e2e'
        })
      });
    });

    await page.goto('/login');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('login-page')).toBeVisible();
  });
});
