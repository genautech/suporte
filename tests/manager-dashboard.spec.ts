import { test, expect } from '@playwright/test';

const MANAGER_EMAIL = 'imacedo.aldelia@prio3.com.br';
const MANAGER_PASSWORD = '123456';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://suporte-lojinha-409489811769.southamerica-east1.run.app';

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      console.log(`[browser:${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', error => {
      console.log('[browser:pageerror]', error);
    });
    // Navegar para a página de login do gestor
    await page.goto(`${BASE_URL}/manager`);
  });

  test('should login successfully', async ({ page }) => {
    // Preencher formulário de login
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    
    // Clicar no botão de login
    await page.click('button[type="submit"]');
    
    // Aguardar redirecionamento para o dashboard ou verificar se ainda está na página de login
    await page.waitForTimeout(3000);
    
    // Verificar se o dashboard carregou (elementos específicos da visão geral)
    const dashboardLoaded = await page
      .locator('text=Dashboard do Gestor')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    
    expect(dashboardLoaded).toBe(true);
  });

  test('should display orders tab and load orders', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (
        text.includes('findOrdersByCustomer') ||
        text.includes('getCompanyOrders') ||
        text.includes('Domínios permitidos definidos')
      ) {
        consoleLogs.push(text);
      }
    });

    // Login
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard carregar
    await page.waitForTimeout(3000);
    const dashboardLoaded = await page
      .locator('text=Dashboard do Gestor')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    
    expect(dashboardLoaded).toBe(true);
    
    // Clicar na aba de pedidos
    await page.click('text=Pedidos', { timeout: 10000 });
    
    // Verificar se a aba de pedidos está visível
    await expect(page.locator('text=Pedidos relacionados')).toBeVisible({ timeout: 10000 });
    
    // Verificar se há indicador de loading ou lista de pedidos
    const loadingIndicator = page.locator('text=Carregando pedidos');
    const ordersList = page.locator('table, .card');
    const emptyState = page.locator('text=Nenhum pedido encontrado');
    const errorState = page.locator('text=Erro ao carregar pedidos');
    
    // Aguardar um dos estados aparecer
    await Promise.race([
      loadingIndicator.waitFor({ state: 'visible', timeout: 5000 }).then(() => loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })),
      ordersList.first().waitFor({ state: 'visible', timeout: 30000 }),
      emptyState.waitFor({ state: 'visible', timeout: 30000 }),
      errorState.waitFor({ state: 'visible', timeout: 30000 })
    ]);
    
    // Aguardar um pouco para capturar logs
    await page.waitForTimeout(2000);
    
    // Verificar se há pelo menos um log de chamada à API (mesmo que não tenha pedidos)
    expect(consoleLogs.length).toBeGreaterThan(0);

    // Garantir que o log de domínio permitido foi registrado
    const hasDomainLog = consoleLogs.some(log => log.includes('Domínios permitidos definidos') || log.includes('allowedDomains'));
    expect(hasDomainLog).toBe(true);
  });

  test('should show order filters and escalation action', async ({ page }) => {
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);
    await page.click('text=Pedidos', { timeout: 10000 });

    await expect(page.locator('button:has-text("Todos os status")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder="Buscar por pedido, cliente ou email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Atualizar")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Primeira")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Última")').first()).toBeVisible({ timeout: 10000 });

    const escalateButton = page.locator('button:has-text("Abrir chamado")').first();
    await expect(escalateButton).toBeVisible({ timeout: 10000 });
  });

  test('should open profile and escalations tabs', async ({ page }) => {
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);

    await page.click('text=Perfil do Gestor', { timeout: 10000 });
    await expect(page.locator('text=Perfil do Gestor').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input#manager-name')).toBeVisible({ timeout: 10000 });

    await page.click('text=Chamados do Gestor', { timeout: 10000 });
    await expect(page.locator('text=Chamados do Gestor').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Atualizar")').first()).toBeVisible({ timeout: 10000 });
  });

  test('should keep dashboard focused and hide users tab', async ({ page }) => {
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Dashboard do Gestor').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Usuários')).toHaveCount(0);
  });

  test('should verify Cubbo API calls', async ({ page }) => {
    // Monitorar requisições de rede
    const apiCalls: string[] = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/orders') || url.includes('cubbo') || url.includes('yoobe')) {
        apiCalls.push(url);
      }
    });
    
    // Login
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard carregar
    await page.waitForTimeout(3000);
    const dashboardLoaded = await page
      .locator('text=Dashboard do Gestor')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    
    expect(dashboardLoaded).toBe(true);
    
    // Clicar na aba de pedidos para disparar chamada à API
    await page.click('text=Pedidos', { timeout: 10000 });
    
    // Aguardar carregamento
    await page.waitForTimeout(5000);
    
    // Verificar se houve tentativa de chamada à API (mesmo que falhe)
    // Os logs no console também serão verificados
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('findOrdersByCustomer') || text.includes('getCompanyOrders') || text.includes('API Cubbo')) {
        consoleLogs.push(text);
      }
    });
    
    await page.waitForTimeout(3000);
    
    // Verificar se há logs de chamada à API
    expect(consoleLogs.length + apiCalls.length).toBeGreaterThan(0);
  });
});

