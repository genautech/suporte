// Script de teste para o proxy do Cubbo
// Execute: node test-proxy.js

const fetch = require('node-fetch');

const PROXY_URL = process.env.PROXY_URL || 'https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app';

async function testProxy() {
    console.log('🧪 Testando proxy do Cubbo...\n');
    console.log(`URL: ${PROXY_URL}\n`);

    try {
        // Teste 1: Requisição POST básica
        console.log('📤 Enviando requisição POST...');
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:3000'
            }
        });

        console.log(`✅ Status: ${response.status} ${response.statusText}`);
        console.log(`📋 Headers CORS:`);
        console.log(`   Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin') || 'NÃO ENCONTRADO'}`);
        console.log(`   Access-Control-Allow-Methods: ${response.headers.get('access-control-allow-methods') || 'NÃO ENCONTRADO'}`);
        console.log(`   Access-Control-Allow-Headers: ${response.headers.get('access-control-allow-headers') || 'NÃO ENCONTRADO'}`);

        const data = await response.text();
        console.log(`\n📦 Resposta:`);
        
        try {
            const jsonData = JSON.parse(data);
            console.log(JSON.stringify(jsonData, null, 2));
            
            if (jsonData.access_token) {
                console.log('\n✅ SUCESSO! Token obtido com sucesso.');
                console.log(`   Token (primeiros 20 chars): ${jsonData.access_token.substring(0, 20)}...`);
            } else if (jsonData.error) {
                console.log('\n⚠️ ERRO: Proxy retornou erro.');
                console.log(`   Erro: ${jsonData.error}`);
                if (jsonData.details) {
                    console.log(`   Detalhes: ${JSON.stringify(jsonData.details)}`);
                }
            }
        } catch (e) {
            console.log(data);
            console.log('\n⚠️ Resposta não é JSON válido');
        }

    } catch (error) {
        console.error('\n❌ ERRO ao testar proxy:');
        console.error(`   ${error.message}`);
        if (error.cause) {
            console.error(`   Causa: ${error.cause.message || error.cause}`);
        }
    }
}

// Teste de preflight OPTIONS
async function testPreflight() {
    console.log('\n\n🧪 Testando requisição OPTIONS (preflight)...\n');
    
    try {
        const response = await fetch(PROXY_URL, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });

        console.log(`✅ Status: ${response.status} ${response.statusText}`);
        console.log(`📋 Headers CORS:`);
        console.log(`   Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin') || 'NÃO ENCONTRADO'}`);
        console.log(`   Access-Control-Allow-Methods: ${response.headers.get('access-control-allow-methods') || 'NÃO ENCONTRADO'}`);
        console.log(`   Access-Control-Allow-Headers: ${response.headers.get('access-control-allow-headers') || 'NÃO ENCONTRADO'}`);
        
        if (response.status === 200 || response.status === 204) {
            console.log('\n✅ Preflight OK! CORS configurado corretamente.');
        } else {
            console.log('\n⚠️ Preflight retornou status inesperado.');
        }
    } catch (error) {
        console.error('\n❌ ERRO ao testar preflight:');
        console.error(`   ${error.message}`);
    }
}

// Executar testes
(async () => {
    await testPreflight();
    await testProxy();
})();










