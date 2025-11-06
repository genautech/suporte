// Firebase Auth Reset Service - Reseta senha quando código é válido
// Deploy this as a Cloud Run service
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(express.json());
// CORS configurado para aceitar requisições de qualquer origem em desenvolvimento
app.use(cors({
  origin: true, // Permite qualquer origem (incluindo localhost:3000)
  credentials: true
}));

// Initialize Firebase Admin SDK
// Use service account from environment variable or default credentials
if (!admin.apps.length) {
  try {
    // Try to initialize with service account from env var
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccount) {
      // Try to parse as JSON string first
      let parsedAccount;
      try {
        // Try to decode from base64 first (Cloud Run passes it as base64)
        const decoded = Buffer.from(serviceAccount, 'base64').toString('utf8');
        parsedAccount = JSON.parse(decoded);
        console.log('[FIREBASE ADMIN] Service Account decodificado de base64');
      } catch (e1) {
        // If not base64, try to parse as JSON string directly
        try {
          parsedAccount = typeof serviceAccount === 'string' 
            ? JSON.parse(serviceAccount) 
            : serviceAccount;
          console.log('[FIREBASE ADMIN] Service Account parseado como JSON');
        } catch (e2) {
          // If not JSON, try to read as file path
          const fs = require('fs');
          const path = require('path');
          const keyPath = path.resolve(serviceAccount);
          if (fs.existsSync(keyPath)) {
            parsedAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
            console.log('[FIREBASE ADMIN] Service Account lido de arquivo');
          } else {
            throw new Error('Service Account não encontrado no caminho: ' + keyPath);
          }
        }
      }
      admin.initializeApp({
        credential: admin.credential.cert(parsedAccount)
      });
      console.log('[FIREBASE ADMIN] Inicializado com Service Account');
    } else {
      // Use default credentials (when running on Cloud Run or with gcloud auth)
      admin.initializeApp();
      console.log('[FIREBASE ADMIN] Inicializado com Default Credentials');
    }
  } catch (error) {
    console.error('[FIREBASE ADMIN] Erro ao inicializar:', error.message);
    console.error('[FIREBASE ADMIN] Stack:', error.stack);
    console.error('[FIREBASE ADMIN] Certifique-se de que FIREBASE_SERVICE_ACCOUNT está configurado ou use gcloud auth application-default login');
    // Não lançar erro aqui - deixar o servidor iniciar e falhar apenas quando tentar usar
    console.warn('[FIREBASE ADMIN] Servidor iniciará, mas operações Firebase podem falhar');
  }
}

/**
 * GET / - Health check endpoint
 */
app.get('/', (req, res) => {
  res.json({
    service: 'Firebase Auth Reset Proxy',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      'POST /reset-password': 'Reset user password using auth code'
    }
  });
});

/**
 * POST /reset-password
 * Resets user password when auth code is valid
 * 
 * Body:
 * {
 *   email: string,
 *   code: string,
 *   newPassword: string (optional, will generate deterministic password if not provided)
 * }
 */
app.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        error: 'Email e código são obrigatórios.' 
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // Validate code using Firestore (same logic as authService)
    const db = admin.firestore();
    const authCodesRef = db.collection('authCodes');
    const querySnapshot = await authCodesRef
      .where('email', '==', normalizedEmail)
      .where('code', '==', code.trim())
      .where('used', '==', false)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return res.status(400).json({ 
        error: 'Código inválido ou expirado.' 
      });
    }

    const codeDoc = querySnapshot.docs[0];
    const codeData = codeDoc.data();
    const expiresAt = codeData.expiresAt.toDate();
    const now = new Date();

    if (now > expiresAt) {
      // Mark as used
      await codeDoc.ref.update({ used: true });
      return res.status(400).json({ 
        error: 'Código expirado.' 
      });
    }

    // Code is valid, proceed with password reset
    // Generate deterministic password if not provided
    const password = newPassword || `temp_${normalizedEmail}_${normalizedEmail.length}_2025!`;

    try {
      // Get user by email
      const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
      
      // Update password
      await admin.auth().updateUser(userRecord.uid, {
        password: password
      });

      // Mark code as used only after successful password reset
      await codeDoc.ref.update({ used: true });

      console.log(`[RESET PASSWORD] Password reset successful for: ${normalizedEmail}`);
      
      return res.status(200).json({ 
        success: true,
        message: 'Senha resetada com sucesso.' 
      });
    } catch (authError) {
      console.error('[RESET PASSWORD] Error resetting password:', authError);
      
      if (authError.code === 'auth/user-not-found') {
        // User doesn't exist, create it
        try {
          await admin.auth().createUser({
            email: normalizedEmail,
            password: password,
            emailVerified: false
          });
          
          // Mark code as used only after successful user creation
          await codeDoc.ref.update({ used: true });
          
          console.log(`[RESET PASSWORD] User created: ${normalizedEmail}`);
          
          return res.status(200).json({ 
            success: true,
            message: 'Usuário criado com sucesso.' 
          });
        } catch (createError) {
          console.error('[RESET PASSWORD] Error creating user:', createError);
          return res.status(500).json({ 
            error: 'Erro ao criar usuário.' 
          });
        }
      } else {
        return res.status(500).json({ 
          error: 'Erro ao resetar senha.',
          details: authError.message 
        });
      }
    }
  } catch (error) {
    console.error('[RESET PASSWORD] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor.',
      details: error.message 
    });
  }
});

const port = process.env.PORT || 8081; // Cloud Run usa PORT, local usa 8081
app.listen(port, () => {
  console.log(`🔥 Firebase Auth Reset Service rodando na porta ${port}`);
  console.log(`📡 Endpoint: http://localhost:${port}/reset-password`);
  console.log(`🌐 CORS habilitado para todas as origens`);
});

