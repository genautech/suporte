// This is the backend service for your Cubbo authentication proxy.
// Deploy this code to Google Cloud Run.
// Make sure to set the environment variables CUBBO_CLIENT_ID and CUBBO_CLIENT_SECRET in your Cloud Run service configuration.

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();

// Use CORS to allow requests from your frontend's domain
// For production, you should restrict this to your actual domain
// e.g., app.use(cors({ origin: 'https://your-frontend-app-url.com' }));
app.use(cors());

app.post('/', async (req, res) => {
    const { CUBBO_CLIENT_ID, CUBBO_CLIENT_SECRET } = process.env;

    if (!CUBBO_CLIENT_ID || !CUBBO_CLIENT_SECRET) {
        console.error("FATAL: Variáveis de ambiente CUBBO_CLIENT_ID ou CUBBO_CLIENT_SECRET não estão definidas.");
        return res.status(500).json({ error: 'Configuração do servidor incompleta. Variáveis de ambiente faltando.' });
    }

    // Cubbo's OAuth endpoint. The URL for production might be different.
    const CUBBO_AUTH_URL = 'https://api.cubbo.com/oauth/token';

    const body = new URLSearchParams();
    body.append('grant_type', 'client_credentials');
    body.append('client_id', CUBBO_CLIENT_ID);
    body.append('client_secret', CUBBO_CLIENT_SECRET);
    
    try {
        const cubboResponse = await fetch(CUBBO_AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        });
        
        const data = await cubboResponse.json();

        if (!cubboResponse.ok) {
            console.error('Erro ao obter token da Cubbo:', data);
            // Forward the error from Cubbo to the frontend for better debugging
            return res.status(cubboResponse.status).json({
                error: 'Falha na autenticação com a API da Cubbo.',
                details: data
            });
        }
        
        // Success: forward the token response to the frontend
        res.status(200).json(data);

    } catch (error) {
        console.error('Erro interno no proxy de autenticação:', error);
        res.status(500).json({ error: 'Erro interno no servidor do proxy.' });
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Proxy de autenticação Cubbo rodando na porta ${port}`);
});
