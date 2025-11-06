import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session
        pw = await async_api.async_playwright().start()
        
        # Launch browser
        browser = await pw.chromium.launch(
            headless=False,  # Show browser for debugging
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
            ],
        )
        
        # Create context
        context = await browser.new_context()
        context.set_default_timeout(10000)
        
        # Open page
        page = await context.new_page()
        
        # Navigate to app
        print("🌐 Navegando para http://localhost:3000...")
        await page.goto("http://localhost:3000", wait_until="networkidle", timeout=30000)
        
        # Wait for page to load
        await page.wait_for_load_state("domcontentloaded", timeout=10000)
        
        # Check if homepage loaded
        print("✅ Página carregada")
        
        # Take screenshot
        await page.screenshot(path="login_test_homepage.png")
        print("📸 Screenshot salvo: login_test_homepage.png")
        
        # Check for login button
        try:
            login_button = page.locator('text=Acessar Portal do Cliente').first
            await expect(login_button).to_be_visible(timeout=5000)
            print("✅ Botão 'Acessar Portal do Cliente' encontrado")
        except Exception as e:
            print(f"❌ Botão não encontrado: {e}")
            # Take screenshot of error
            await page.screenshot(path="login_test_error.png")
            raise
        
        # Click login button
        print("🖱️ Clicando no botão de login...")
        await login_button.click()
        await page.wait_for_timeout(2000)
        
        # Check if login form appeared
        try:
            email_input = page.locator('input[type="email"]').first
            await expect(email_input).to_be_visible(timeout=5000)
            print("✅ Formulário de login apareceu")
            
            # Take screenshot of login form
            await page.screenshot(path="login_test_form.png")
            print("📸 Screenshot do formulário salvo: login_test_form.png")
            
            # Check for email input
            email_label = page.locator('text=Seu E-mail').first
            await expect(email_label).to_be_visible(timeout=2000)
            print("✅ Campo de email encontrado")
            
            # Check for send code button
            send_button = page.locator('text=Enviar Código de Acesso').first
            await expect(send_button).to_be_visible(timeout=2000)
            print("✅ Botão 'Enviar Código de Acesso' encontrado")
            
            print("\n✅✅✅ TESTE PASSOU: Tela de login carregou corretamente!")
            
        except Exception as e:
            print(f"❌ Formulário de login não apareceu: {e}")
            await page.screenshot(path="login_test_form_error.png")
            raise
        
        await asyncio.sleep(2)
    
    except Exception as e:
        print(f"\n❌❌❌ ERRO NO TESTE: {e}")
        if page:
            await page.screenshot(path="login_test_final_error.png")
        raise
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

if __name__ == "__main__":
    asyncio.run(run_test())

