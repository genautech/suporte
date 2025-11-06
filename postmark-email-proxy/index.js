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
    
    // Log detalhado para debug
    console.log('[POSTMARK PROXY] Recebida requisição:', {
        hasToken: !!POSTMARK_SERVER_TOKEN,
        tokenPrefix: POSTMARK_SERVER_TOKEN ? POSTMARK_SERVER_TOKEN.substring(0, 8) + '...' : 'MISSING',
        fromEmail: FROM_EMAIL,
        requestBody: {
            to: req.body.to,
            subject: req.body.subject,
            hasHtmlBody: !!req.body.htmlBody
        }
    });
    
    if (!POSTMARK_SERVER_TOKEN || !FROM_EMAIL) {
        console.error("FATAL: Variáveis de ambiente do Postmark não estão definidas.");
        console.error("POSTMARK_SERVER_TOKEN:", POSTMARK_SERVER_TOKEN ? "DEFINIDO" : "FALTANDO");
        console.error("FROM_EMAIL:", FROM_EMAIL || "FALTANDO");
        return res.status(500).json({ error: 'Configuração do servidor de e-mail incompleta.' });
    }

    const { to, subject, htmlBody } = req.body;

    if (!to || !subject || !htmlBody) {
        console.error('[POSTMARK PROXY] Campos faltando:', { to: !!to, subject: !!subject, htmlBody: !!htmlBody });
        return res.status(400).json({ error: 'Campos obrigatórios (to, subject, htmlBody) faltando.' });
    }
    
    const postmarkBody = {
        From: FROM_EMAIL,
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        MessageStream: "outbound"
    };

    try {
        console.log('[POSTMARK PROXY] Enviando para Postmark API:', {
            from: FROM_EMAIL,
            to: to,
            subject: subject
        });
        
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
        
        console.log('[POSTMARK PROXY] Resposta do Postmark:', {
            status: postmarkResponse.status,
            statusText: postmarkResponse.statusText,
            errorCode: data.ErrorCode,
            message: data.Message,
            messageId: data.MessageID
        });

        if (!postmarkResponse.ok) {
            console.error('[POSTMARK PROXY] Erro ao enviar e-mail via Postmark:', {
                status: postmarkResponse.status,
                errorCode: data.ErrorCode,
                message: data.Message,
                fullResponse: JSON.stringify(data, null, 2)
            });
            
            // Tratamento específico para erros comuns
            let errorMessage = 'Falha ao enviar o e-mail.';
            if (data.ErrorCode === 406) {
                errorMessage = `Email rejeitado: ${data.Message || 'Destinatário marcado como inativo ou com problemas.'}`;
            } else if (data.ErrorCode === 401 || data.ErrorCode === 403) {
                errorMessage = 'Erro de autenticação com Postmark. Verifique o token do servidor.';
            } else if (data.Message) {
                errorMessage = data.Message;
            }
            
            return res.status(postmarkResponse.status).json({
                error: errorMessage,
                details: data.Message,
                errorCode: data.ErrorCode
            });
        }
        
        console.log('[POSTMARK PROXY] Email enviado com sucesso:', {
            messageId: data.MessageID,
            to: data.To,
            submittedAt: data.SubmittedAt
        });
        
        res.status(200).json({ success: true, messageId: data.MessageID });

    } catch (error) {
        console.error('[POSTMARK PROXY] Erro interno no proxy de e-mail:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Erro interno no servidor do proxy de e-mail.',
            details: error.message
        });
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Proxy de e-mail Postmark rodando na porta ${port}`);
});
