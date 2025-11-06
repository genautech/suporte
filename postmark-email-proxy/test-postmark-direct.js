// Teste direto da API Postmark
const fetch = require('node-fetch').default || require('node-fetch');

const POSTMARK_SERVER_TOKEN = '0279366a-140e-4fab-b0af-e864e7250623';
const FROM_EMAIL = 'atendimento@yoobe.co';
const TEST_EMAIL = process.argv[2] || 'test@example.com';

console.log('🔍 Testando API Postmark diretamente...\n');
console.log(`Token: ${POSTMARK_SERVER_TOKEN.substring(0, 8)}...`);
console.log(`De: ${FROM_EMAIL}`);
console.log(`Para: ${TEST_EMAIL}\n`);

const postmarkBody = {
    From: FROM_EMAIL,
    To: TEST_EMAIL,
    Subject: 'Teste de Validação - Postmark',
    HtmlBody: '<h2>Teste</h2><p>Este é um teste direto da API Postmark.</p>',
    MessageStream: 'outbound'
};

fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_SERVER_TOKEN
    },
    body: JSON.stringify(postmarkBody)
})
.then(res => res.json())
.then(data => {
    console.log('📬 Resposta:', JSON.stringify(data, null, 2));
    if (data.ErrorCode) {
        console.log('\n❌ Erro:', data.Message);
        process.exit(1);
    } else {
        console.log('\n✅ Sucesso! MessageID:', data.MessageID);
    }
})
.catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
});
