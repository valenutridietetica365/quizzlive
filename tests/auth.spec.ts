import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('Teacher should be able to navigate to login page', async ({ page }) => {
        // Navigate to the login page
        await page.goto('/teacher/login');

        // Check if the login form is rendered
        await expect(page.locator('form')).toBeVisible();

        // Check for email and password inputs
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();

        // Check for the submit button
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('Should block access to dashboard without auth', async ({ page }) => {
        // Attempt to go to dashboard directly
        await page.goto('/teacher/dashboard');

        // It should redirect to the root or login page
        await expect(page).toHaveURL(/.*(\/|\/teacher\/login)$/);
    });
});
