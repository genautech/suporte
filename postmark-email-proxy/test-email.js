// Script de teste para verificar envio de email via Postmark
// Uso: node test-email.js <seu-email-para-testar>

const fetch = require('node-fetch');

const POSTMARK_SERVER_TOKEN = 'ee246569-f54b-4986-937a-9288b25377f4';
const FROM_EMAIL = process.env.FROM_EMAIL || 'atendimento@yoobe.co'; // Email confirmado e verificado no Postmark
const TEST_EMAIL = process.argv[2];

if (!TEST_EMAIL) {
    console.error('❌ Erro: Forneça um email para teste');
    console.log('\nUso: node test-email.js seu-email@exemplo.com');
    console.log('Ou: FROM_EMAIL=remetente@exemplo.com node test-email.js seu-email@exemplo.com');
    process.exit(1);
}

console.log('📧 Testando envio de email via Postmark...\n');
console.log(`Token: ${POSTMARK_SERVER_TOKEN.substring(0, 8)}...`);
console.log(`De: ${FROM_EMAIL}`);
console.log(`Para: ${TEST_EMAIL}`);
console.log(`Stream: outbound\n`);

const postmarkBody = {
    From: FROM_EMAIL,
    To: TEST_EMAIL,
    Subject: 'Teste de Email - Portal de Suporte Loja Corporativa',
    HtmlBody: `
        <h2>Teste de Email</h2>
        <p>Este é um email de teste do Portal de Suporte Loja Corporativa.</p>
        <p>Se você recebeu este email, o sistema de envio está funcionando corretamente!</p>
        <hr>
        <p><small>Enviado em: ${new Date().toLocaleString('pt-BR')}</small></p>
    `,
    MessageStream: 'outbound'
};

async function testEmail() {
    try {
        console.log('⏳ Enviando email...\n');
        
        const response = await fetch('https://api.postmarkapp.com/email', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Postmark-Server-Token': POSTMARK_SERVER_TOKEN
            },
            body: JSON.stringify(postmarkBody)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Erro ao enviar email:');
            console.error(`Status: ${response.status}`);
            console.error(`Erro: ${data.Message || JSON.stringify(data)}`);
            if (data.ErrorCode) {
                console.error(`Código: ${data.ErrorCode}`);
            }
            process.exit(1);
        }

        console.log('✅ Email enviado com sucesso!');
        console.log(`\n📬 Message ID: ${data.MessageID}`);
        console.log(`📧 Para: ${data.To}`);
        console.log(`📅 Enviado em: ${data.SubmittedAt}`);
        console.log(`\n💡 Verifique a caixa de entrada de ${TEST_EMAIL} (e spam)`);
        
    } catch (error) {
        console.error('❌ Erro ao fazer requisição:', error.message);
        process.exit(1);
    }
}

testEmail();

