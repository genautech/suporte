// This is the backend service for your Postmark email proxy.
// Deploy this code to Google Cloud Run.
// Make sure to set POSTMARK_SERVER_TOKEN and FROM_EMAIL environment variables.

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(express.json());

// Allow requests from your frontend
app.use(cors());

app.post('/', async (req, res) => {
    const { POSTMARK_SERVER_TOKEN, FROM_EMAIL } = process.env;
    
    if (!POSTMARK_SERVER_TOKEN || !FROM_EMAIL) {
        console.error("FATAL: Variáveis de ambiente do Postmark não estão definidas.");
        return res.status(500).json({ error: 'Configuração do servidor de e-mail incompleta.' });
    }

    const { to, subject, htmlBody } = req.body;

    if (!to || !subject || !htmlBody) {
        return res.status(400).json({ error: 'Campos obrigatórios (to, subject, htmlBody) faltando.' });
    }
    
    const postmarkBody = {
        From: FROM_EMAIL,
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        MessageStream: "outbound" // Or "broadcast" depending on your setup
    };

    try {
        const postmarkResponse = await fetch('https://api.postmarkapp.com/email', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Postmark-Server-Token': POSTMARK_SERVER_TOKEN
            },
            body: JSON.stringify(postmarkBody)
        });

        const data = await postmarkResponse.json();

        if (!postmarkResponse.ok) {
            console.error('Erro ao enviar e-mail via Postmark:', data);
            return res.status(postmarkResponse.status).json({
                error: 'Falha ao enviar o e-mail.',
                details: data.Message
            });
        }
        
        res.status(200).json({ success: true, messageId: data.MessageID });

    } catch (error) {
        console.error('Erro interno no proxy de e-mail:', error);
        res.status(500).json({ error: 'Erro interno no servidor do proxy de e-mail.' });
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Proxy de e-mail Postmark rodando na porta ${port}`);
});
