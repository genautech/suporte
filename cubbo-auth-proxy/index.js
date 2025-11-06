// This is the backend service for your Cubbo authentication proxy.
// Deploy this code to Google Cloud Run.
// Make sure to set the environment variables CUBBO_CLIENT_ID and CUBBO_CLIENT_SECRET in your Cloud Run service configuration.

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();

// Middleware para parsing JSON
app.use(express.json());

// Configure CORS with explicit options
// Allow localhost for development and Cloud Run URLs for production
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://suporte-7e68b.web.app',
    'https://suporte-7e68b.firebaseapp.com'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            callback(null, true);
        } else {
            // For production, you might want to be more restrictive
            // For now, allow all origins during development
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.post('/', async (req, res) => {
    const { CUBBO_CLIENT_ID, CUBBO_CLIENT_SECRET } = process.env;

    if (!CUBBO_CLIENT_ID || !CUBBO_CLIENT_SECRET) {
        console.error("FATAL: Variáveis de ambiente CUBBO_CLIENT_ID ou CUBBO_CLIENT_SECRET não estão definidas.");
        // Set CORS headers explicitly
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(500).json({ error: 'Configuração do servidor incompleta. Variáveis de ambiente faltando.' });
    }

    // Cubbo's OAuth endpoint
    const CUBBO_AUTH_URL = 'https://api.cubbo.com/v1/auth/token';

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
        
        // Get response text first to handle non-JSON responses
        const responseText = await cubboResponse.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            // If response is not JSON, log the raw response
            console.error('Resposta da API Cubbo não é JSON válido:', responseText);
            console.error('Status:', cubboResponse.status);
            res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            return res.status(cubboResponse.status || 500).json({
                error: 'Resposta inválida da API Cubbo.',
                details: `Status: ${cubboResponse.status}, Resposta: ${responseText.substring(0, 200)}`
            });
        }

        if (!cubboResponse.ok) {
            console.error('Erro ao obter token da Cubbo:', data);
            // Set CORS headers explicitly
            res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            // Forward the error from Cubbo to the frontend for better debugging
            return res.status(cubboResponse.status).json({
                error: 'Falha na autenticação com a API da Cubbo.',
                details: data
            });
        }
        
        // Success: forward the token response to the frontend
        // Set CORS headers explicitly
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(200).json(data);

    } catch (error) {
        console.error('Erro interno no proxy de autenticação:', error);
        // Set CORS headers explicitly even on error
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(500).json({ error: 'Erro interno no servidor do proxy.' });
    }
});

// Helper function to get access token
async function getAccessToken() {
    const { CUBBO_CLIENT_ID, CUBBO_CLIENT_SECRET } = process.env;

    if (!CUBBO_CLIENT_ID || !CUBBO_CLIENT_SECRET) {
        throw new Error('Variáveis de ambiente CUBBO_CLIENT_ID ou CUBBO_CLIENT_SECRET não estão definidas.');
    }

    const CUBBO_AUTH_URL = 'https://api.cubbo.com/v1/auth/token';
    const body = new URLSearchParams();
    body.append('grant_type', 'client_credentials');
    body.append('client_id', CUBBO_CLIENT_ID);
    body.append('client_secret', CUBBO_CLIENT_SECRET);
    
    const cubboResponse = await fetch(CUBBO_AUTH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
    });
    
    if (!cubboResponse.ok) {
        const errorText = await cubboResponse.text();
        throw new Error(`Falha na autenticação: ${cubboResponse.status} - ${errorText}`);
    }
    
    const data = await cubboResponse.json();
    return data.access_token || data.token;
}

// Proxy endpoint for API calls
// Usage: POST /api/orders/123 or GET /api/orders?customer_email=...
app.all('/api/*', async (req, res) => {
    try {
        // Get the path after /api/
        const apiPath = req.path.replace('/api', '');
        
        // Get access token
        const accessToken = await getAccessToken();
        
        // Build the Cubbo API URL
        const cubboApiUrl = `https://api.cubbo.com/v1${apiPath}`;
        
        // Get query string if present
        const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        const fullUrl = cubboApiUrl + queryString;
        
        console.log(`[API Proxy] ${req.method} ${fullUrl}`);
        
        // Prepare headers
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };
        
        // Forward the request to Cubbo API
        const options = {
            method: req.method,
            headers: headers
        };
        
        // Include body for POST, PUT, PATCH requests
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
            options.body = JSON.stringify(req.body);
        }
        
        const cubboResponse = await fetch(fullUrl, options);
        
        // Get response data
        const responseText = await cubboResponse.text();
        let responseData;
        
        try {
            responseData = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            responseData = { raw: responseText };
        }
        
        // Set CORS headers
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        
        // Forward status and data
        res.status(cubboResponse.status).json(responseData);
        
    } catch (error) {
        console.error('Erro no proxy de API:', error);
        
        // Set CORS headers even on error
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        
        res.status(500).json({ 
            error: 'Erro ao processar requisição na API Cubbo.',
            details: error.message 
        });
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Proxy de autenticação e API Cubbo rodando na porta ${port}`);
});
