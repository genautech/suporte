// Authentication service for email code-based login
import { db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { AuthCode } from '../types';

const authCodesCollection = collection(db, 'authCodes');
const CODE_EXPIRATION_MINUTES = 5;

/**
 * Generates a 4-digit authentication code and saves it to Firestore
 */
export const generateAuthCode = async (email: string): Promise<string> => {
  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase().trim();
  
  // Generate 4-digit code (1000-9999)
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Calculate expiration time (5 minutes from now)
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRATION_MINUTES);
  
  // Invalidate any existing codes for this email
  await invalidateExistingCodes(normalizedEmail);
  
  // Save code to Firestore
  await addDoc(authCodesCollection, {
    email: normalizedEmail,
    code,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    used: false,
  });
  
  return code;
};

/**
 * Validates an authentication code for a given email
 * Returns true if code is valid, false otherwise
 * @param markAsUsed - If true, marks code as used after validation (default: true)
 */
export const validateAuthCode = async (email: string, code: string, markAsUsed: boolean = true): Promise<boolean> => {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedCode = code.trim();
  
  // Find the code document
  const q = query(
    authCodesCollection,
    where('email', '==', normalizedEmail),
    where('code', '==', normalizedCode),
    where('used', '==', false)
  );
  
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return false;
  }
  
  // Check if code exists and hasn't expired
  const codeDoc = querySnapshot.docs[0];
  const codeData = codeDoc.data();
  
  const expiresAt = (codeData.expiresAt as Timestamp).toDate();
  const now = new Date();
  
  if (now > expiresAt) {
    // Code expired, mark as used anyway
    if (markAsUsed) {
      await updateDoc(doc(db, 'authCodes', codeDoc.id), { used: true });
    }
    return false;
  }
  
  // Mark code as used only if requested
  if (markAsUsed) {
    await updateDoc(doc(db, 'authCodes', codeDoc.id), { used: true });
  }
  
  return true;
};

/**
 * Invalidates all existing unused codes for an email
 */
const invalidateExistingCodes = async (email: string): Promise<void> => {
  const q = query(
    authCodesCollection,
    where('email', '==', email),
    where('used', '==', false)
  );
  
  const querySnapshot = await getDocs(q);
  
  const updatePromises = querySnapshot.docs.map((docSnapshot) =>
    updateDoc(doc(db, 'authCodes', docSnapshot.id), { used: true })
  );
  
  await Promise.all(updatePromises);
};

/**
 * Resets user password using backend service when auth code is valid
 * This uses Firebase Admin SDK on the backend to reset password
 */
export const resetPasswordWithCode = async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
  // Use localhost in development, production URL otherwise
  const RESET_PROXY_URL = import.meta.env.DEV 
    ? (import.meta.env.VITE_AUTH_RESET_PROXY_URL || 'http://localhost:8081')
    : (import.meta.env.VITE_AUTH_RESET_PROXY_URL || 'https://firebase-auth-reset-proxy-409489811769.southamerica-east1.run.app');
  
  try {
    const response = await fetch(`${RESET_PROXY_URL}/reset-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email,
        code,
      }),
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorBody;
      try {
        errorBody = JSON.parse(responseText);
      } catch (e) {
        errorBody = { error: responseText || `HTTP ${response.status}` };
      }
      return { 
        success: false, 
        error: errorBody.error || 'Falha ao resetar senha.' 
      };
    }
    
    const responseData = JSON.parse(responseText);
    return { success: true };
  } catch (error: any) {
    console.error("[resetPasswordWithCode] Erro ao resetar senha:", error);
    return { 
      success: false, 
      error: error.message || 'Erro desconhecido ao resetar senha.' 
    };
  }
};
// User roles and permissions management
const userRolesCollection = collection(db, 'userRoles');

/**
 * Gets user role from Firestore
 */
export const getUserRole = async (email: string): Promise<'admin' | 'manager' | 'client'> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if admin@yoobe.co (hardcoded admin for backward compatibility)
    if (normalizedEmail === 'admin@yoobe.co') {
      return 'admin';
    }
    
    const docRef = doc(db, 'userRoles', normalizedEmail);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.role || 'client';
    }
    
    return 'client'; // Default role
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'client'; // Safe fallback
  }
};

/**
 * Checks if user is admin
 */
export const isAdmin = async (email: string): Promise<boolean> => {
  const role = await getUserRole(email);
  return role === 'admin';
};

/**
 * Checks if user is manager
 */
export const isManager = async (email: string): Promise<boolean> => {
  const role = await getUserRole(email);
  return role === 'manager';
};

/**
 * Gets manager's company ID
 */
export const getManagerCompany = async (email: string): Promise<string | null> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const docRef = doc(db, 'userRoles', normalizedEmail);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.role === 'manager' && data.companyId) {
        return data.companyId;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting manager company:', error);
    return null;
  }
};

/**
 * Grants manager access to a user
 */
export const grantManagerAccess = async (email: string, companyId: string): Promise<void> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const docRef = doc(db, 'userRoles', normalizedEmail);
    
    await setDoc(docRef, {
      email: normalizedEmail,
      role: 'manager',
      companyId,
      createdAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error granting manager access:', error);
    throw error;
  }
};

/**
 * Revokes manager access
 */
export const revokeManagerAccess = async (email: string): Promise<void> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const docRef = doc(db, 'userRoles', normalizedEmail);
    
    // Update role to client or delete if needed
    await updateDoc(docRef, {
      role: 'client',
      companyId: null,
    });
  } catch (error) {
    console.error('Error revoking manager access:', error);
    throw error;
  }
};

export const sendAuthCodeEmail = async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
  const EMAIL_PROXY_URL = ((import.meta as any).env?.VITE_POSTMARK_PROXY_URL as string) || 
    'https://postmark-email-proxy-409489811769.southamerica-east1.run.app';
  
  const subject = 'Seu código de acesso - Portal de Suporte';
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .code-container {
          background-color: #f4f4f4;
          border: 2px dashed #666;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
        }
        .code {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #2563eb;
          font-family: 'Courier New', monospace;
        }
        .info {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 12px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <h2>Olá!</h2>
      <p>Você solicitou acesso ao Portal de Suporte. Use o código abaixo para fazer login:</p>
      
      <div class="code-container">
        <div class="code">${code}</div>
      </div>
      
      <div class="info">
        <strong>⚠️ Importante:</strong> Este código expira em ${CODE_EXPIRATION_MINUTES} minutos e só pode ser usado uma vez.
      </div>
      
      <p>Se você não solicitou este código, pode ignorar este e-mail com segurança.</p>
      
      <div class="footer">
        <p>Portal de Suporte - Suporte Lojinha Prio</p>
        <p>Este é um e-mail automático, por favor não responda.</p>
      </div>
    </body>
    </html>
  `;
  
  try {
    console.log('[sendAuthCodeEmail] Enviando email via proxy:', { 
      proxyUrl: EMAIL_PROXY_URL, 
      to: email,
      subject 
    });
    
    const response = await fetch(EMAIL_PROXY_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        to: email,
        subject,
        htmlBody,
      }),
    });
    
    const responseText = await response.text();
    console.log('[sendAuthCodeEmail] Resposta do proxy:', { 
      status: response.status, 
      statusText: response.statusText,
      body: responseText 
    });
    
    if (!response.ok) {
      let errorBody;
      try {
        errorBody = JSON.parse(responseText);
      } catch (e) {
        errorBody = { error: responseText || `HTTP ${response.status}` };
      }
      console.error('[sendAuthCodeEmail] Erro na resposta:', errorBody);
      throw new Error(errorBody.error || errorBody.details || `Falha ao enviar e-mail. Status: ${response.status}`);
    }
    
    const responseData = JSON.parse(responseText);
    console.log('[sendAuthCodeEmail] Email enviado com sucesso:', responseData);
    
    return { success: true };
  } catch (error: any) {
    console.error("[sendAuthCodeEmail] Erro ao enviar e-mail de autenticação via proxy:", error);
    return { 
      success: false, 
      error: error.message || 'Erro desconhecido ao enviar e-mail. Verifique os logs do console.' 
    };
  }
};



