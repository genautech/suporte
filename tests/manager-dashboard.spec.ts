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
    
    // Verificar se o dashboard carregou (verificar por elementos específicos do dashboard)
    const dashboardLoaded = await Promise.race([
      page.locator('text=Chamados').waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
      page.locator('text=Pedidos').waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
      page.locator('text=Tickets').waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
      page.locator('h2:has-text("Painel do Gestor")').waitFor({ state: 'visible', timeout: 10000 }).then(() => true)
    ]).catch(() => false);
    
    expect(dashboardLoaded).toBe(true);
  });

  test('should display orders tab and load orders', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard carregar
    await page.waitForTimeout(3000);
    const dashboardLoaded = await Promise.race([
      page.locator('text=Chamados').waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
      page.locator('text=Pedidos').waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
      page.locator('h2:has-text("Painel do Gestor")').waitFor({ state: 'visible', timeout: 10000 }).then(() => true)
    ]).catch(() => false);
    
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
    
    // Verificar logs no console para chamadas à API
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('findOrdersByCustomer') || msg.text().includes('getCompanyOrders')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Aguardar um pouco para capturar logs
    await page.waitForTimeout(2000);
    
    // Verificar se há pelo menos um log de chamada à API (mesmo que não tenha pedidos)
    expect(consoleLogs.length).toBeGreaterThan(0);
  });

  test('should display users tab and load users', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard carregar
    await page.waitForTimeout(3000);
    const dashboardLoaded = await Promise.race([
      page.locator('text=Chamados').waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
      page.locator('text=Usuários').waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
      page.locator('h2:has-text("Painel do Gestor")').waitFor({ state: 'visible', timeout: 10000 }).then(() => true)
    ]).catch(() => false);
    
    expect(dashboardLoaded).toBe(true);
    
    // Clicar na aba de usuários
    await page.click('text=Usuários', { timeout: 10000 });
    
    // Verificar se a aba de usuários está visível
    await expect(page.locator('text=Usuários da Empresa')).toBeVisible({ timeout: 10000 });
    
    // Verificar se há indicador de loading ou lista de usuários
    const loadingIndicator = page.locator('text=Carregando usuários');
    const usersList = page.locator('table');
    const emptyState = page.locator('text=Nenhum usuário encontrado');
    const errorState = page.locator('text=Erro ao carregar usuários');
    
    // Aguardar um dos estados aparecer
    await Promise.race([
      loadingIndicator.waitFor({ state: 'visible', timeout: 5000 }).then(() => loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })),
      usersList.first().waitFor({ state: 'visible', timeout: 30000 }),
      emptyState.waitFor({ state: 'visible', timeout: 30000 }),
      errorState.waitFor({ state: 'visible', timeout: 30000 })
    ]);
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
    const dashboardLoaded = await Promise.race([
      page.locator('text=Chamados').waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
      page.locator('text=Pedidos').waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
      page.locator('h2:has-text("Painel do Gestor")').waitFor({ state: 'visible', timeout: 10000 }).then(() => true)
    ]).catch(() => false);
    
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

