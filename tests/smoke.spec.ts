import { test, expect } from '@playwright/test';

test('basic navigation and landing page check', async ({ page }) => {
  await page.goto('/');
  
  // Check title
  await expect(page).toHaveTitle(/QuizzLive/);
  
  // Check main buttons
  const studentBtn = page.getByRole('link', { name: /SOY ESTUDIANTE/i });
  const teacherBtn = page.getByRole('link', { name: /SOY PROFESOR/i });
  
  await expect(studentBtn).toBeVisible();
  await expect(teacherBtn).toBeVisible();
});

test('join game page loads', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByPlaceholder(/PIN del juego/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible();
});

test('teacher login page loads', async ({ page }) => {
  await page.goto('/teacher/login');
  await expect(page.getByText(/Acceso Profesores/i)).toBeVisible();
  await expect(page.getByLabel(/Correo Electrónico/i)).toBeVisible();
  await expect(page.getByLabel(/Contraseña/i)).toBeVisible();
});
