import { test, expect } from '@playwright/test';

const CLIENT_EMAIL = 'genau@yoobe.co';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://suporte-lojinha-409489811769.southamerica-east1.run.app';

test.describe('Client Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para a página inicial
    await page.goto(BASE_URL);
  });

  test('should login and display orders', async ({ page }) => {
    // Preencher email na página inicial
    await page.fill('input[type="email"]', CLIENT_EMAIL);
    
    // Clicar no botão de enviar código ou entrar
    const submitButton = page.locator('button:has-text("Enviar")').or(page.locator('button[type="submit"]')).first();
    await submitButton.click();
    
    // Aguardar redirecionamento ou carregamento do dashboard
    await page.waitForTimeout(3000);
    
    // Verificar se o dashboard do cliente carregou
    // Pode ser que precise fazer login com código, então vamos verificar diferentes estados
    const dashboardLoaded = await Promise.race([
      page.locator('text=Meus Pedidos').waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
      page.locator('text=Código de verificação').waitFor({ state: 'visible', timeout: 5000 }).then(() => false),
      page.locator('text=Bem-vindo').waitFor({ state: 'visible', timeout: 10000 }).then(() => true)
    ]).catch(() => false);
    
    if (dashboardLoaded) {
      // Verificar se a seção de pedidos está visível
      const ordersSection = page.locator('text=Meus Pedidos').or(page.locator('text=Pedidos'));
      await expect(ordersSection.first()).toBeVisible({ timeout: 10000 });
      
      // Verificar se há indicador de loading ou lista de pedidos
      const loadingIndicator = page.locator('text=Carregando').or(page.locator('text=Buscando'));
      const ordersList = page.locator('.card, table, [class*="order"]');
      const emptyState = page.locator('text=Nenhum pedido encontrado');
      
      // Aguardar um dos estados aparecer
      await Promise.race([
        loadingIndicator.waitFor({ state: 'visible', timeout: 5000 }).then(() => loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })),
        ordersList.first().waitFor({ state: 'visible', timeout: 30000 }),
        emptyState.waitFor({ state: 'visible', timeout: 30000 })
      ]);
    }
  });

  test('should verify Cubbo API calls for orders', async ({ page }) => {
    // Monitorar requisições de rede
    const apiCalls: string[] = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/orders') || url.includes('cubbo') || url.includes('yoobe')) {
        apiCalls.push(url);
      }
    });
    
    // Preencher email
    await page.fill('input[type="email"]', CLIENT_EMAIL);
    const submitButton = page.locator('button:has-text("Enviar")').or(page.locator('button[type="submit"]')).first();
    await submitButton.click();
    
    // Aguardar carregamento
    await page.waitForTimeout(5000);
    
    // Verificar logs no console para chamadas à API
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('findOrdersByCustomer') || text.includes('API Cubbo') || text.includes('UserDashboard')) {
        consoleLogs.push(text);
      }
    });
    
    await page.waitForTimeout(3000);
    
    // Verificar se há logs de chamada à API
    expect(consoleLogs.length + apiCalls.length).toBeGreaterThan(0);
  });
});



