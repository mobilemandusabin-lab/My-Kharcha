const { test, expect } = require('@playwright/test');

function uniqueEmail(prefix = 'user') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.local`;
}

test.describe('MyKharcha E2E', () => {
  test('quick-add route prompts login when unauthenticated', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/quick-add');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/Please log in first/i)).toBeVisible();
    await context.close();
  });

  test('register, add personal expense, and see it in dashboard/history', async ({ page }) => {
    const email = uniqueEmail();
    const password = 'password123';

    await page.goto('/register?next=/');
    await page.getByPlaceholder('Full name').fill('Test User');
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password (min 6 chars)').fill(password);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'MyKharcha' })).toBeVisible();

    await page.getByRole('link', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Add Transaction|Quick Add/ })).toBeVisible();
    await page.getByPlaceholder('Amount (NPR)').fill('500');
    await page.getByPlaceholder(/Title/).fill('Playwright Lunch');
    await page.getByRole('button', { name: /Save|Update/ }).click();
    await expect(page.getByText(/Saved successfully|Updated successfully|Saved offline/)).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'History' }).click();
    await expect(page.getByText('Playwright Lunch')).toBeVisible({ timeout: 15000 });
  });

  test('udhar (unpaid) transaction can be marked settled', async ({ page }) => {
    const email = uniqueEmail('udhar');
    await page.goto('/register');
    await page.getByPlaceholder('Full name').fill('Udhar User');
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password (min 6 chars)').fill('password123');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole('link', { name: 'Add', exact: true }).click();
    await page.getByPlaceholder('Amount (NPR)').fill('1200');
    await page.getByPlaceholder(/Title/).fill('Udharo Grocery');
    await page.locator('select').filter({ hasText: 'Paid' }).last().selectOption('unpaid');
    await page.getByRole('button', { name: /Save/ }).click();
    await expect(page.getByText(/Saved successfully/)).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'History' }).click();
    await expect(page.getByText('Udharo Grocery')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('(Udharo)', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Mark settled' }).first().click();
    await expect(page.getByText('(Udharo)', { exact: true })).toHaveCount(0, { timeout: 15000 });
  });

  test('offline create queues and syncs when back online', async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const email = uniqueEmail('offline');

    await page.goto('/register');
    await page.getByPlaceholder('Full name').fill('Offline User');
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password (min 6 chars)').fill('password123');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole('link', { name: 'Add', exact: true }).click();
    await context.setOffline(true);
    await page.getByPlaceholder('Amount (NPR)').fill('300');
    await page.getByPlaceholder(/Title/).fill('Offline Snack');
    await page.getByRole('button', { name: /Save/ }).click();
    await expect(page.getByText(/Saved offline|Will sync/i)).toBeVisible({ timeout: 15000 });

    await context.setOffline(false);
    await page.goto('/');
    await page.waitForTimeout(2500);
    await page.getByRole('link', { name: 'History' }).click();
    await expect(page.getByText('Offline Snack')).toBeVisible({ timeout: 20000 });
    await context.close();
  });

  test('seeded family data: Sabin can view Awal Family and reports', async ({ page, request }) => {
    const seedRes = await request.post('/api/dev/seed');
    expect(seedRes.ok()).toBeTruthy();

    await page.goto('/login');
    await page.getByPlaceholder('Email').fill('sabin.seed@mykharcha.local');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole('button', { name: 'Awal Family' }).click();
    await expect(page.getByText(/Monthly groceries|Family dinner|Electricity/i).first()).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'Reports' }).click();
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
    await page.getByRole('button', { name: 'Awal Family' }).click();
    await expect(page.getByText(/Member-wise Expenses Paid|BS Month-end Summary/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('family invitation and join flow', async ({ browser }) => {
    const adminCtx = await browser.newContext();
    const memberCtx = await browser.newContext();
    const admin = await adminCtx.newPage();
    const member = await memberCtx.newPage();
    const adminEmail = uniqueEmail('admin');
    const memberEmail = uniqueEmail('member');

    await admin.goto('/register');
    await admin.getByPlaceholder('Full name').fill('Admin User');
    await admin.getByPlaceholder('Email').fill(adminEmail);
    await admin.getByPlaceholder('Password (min 6 chars)').fill('password123');
    await admin.getByRole('button', { name: 'Create Account' }).click();
    await expect(admin).toHaveURL(/\/$/);
    await admin.getByRole('link', { name: 'Settings' }).click();
    await admin.getByRole('link', { name: /Family Management/ }).click();
    await admin.getByPlaceholder(/Family name/).fill('Playwright Family');
    await admin.getByRole('button', { name: 'Create' }).click();
    await expect(admin.getByText(/Family created/i)).toBeVisible({ timeout: 15000 });
    await admin.getByRole('button', { name: 'Generate invitation' }).click();
    const inviteMsg = admin.getByText(/Invitation created:/i);
    await expect(inviteMsg).toBeVisible({ timeout: 15000 });
    const msgText = await inviteMsg.textContent();
    const codeMatch = msgText.match(/Invitation created:\s*([A-Z0-9_-]+)/i);
    expect(codeMatch).toBeTruthy();
    const code = codeMatch[1].trim();

    await member.goto('/register');
    await member.getByPlaceholder('Full name').fill('Member User');
    await member.getByPlaceholder('Email').fill(memberEmail);
    await member.getByPlaceholder('Password (min 6 chars)').fill('password123');
    await member.getByRole('button', { name: 'Create Account' }).click();
    await expect(member).toHaveURL(/\/$/);
    await member.getByRole('link', { name: 'Settings' }).click();
    await member.getByRole('link', { name: /Family Management/ }).click();
    await member.getByPlaceholder('Invitation code').fill(code);
    await member.getByRole('button', { name: 'Join' }).click();
    await expect(member.getByText(/Joined family successfully|Joined/i)).toBeVisible({ timeout: 15000 });

    await adminCtx.close();
    await memberCtx.close();
  });
});
