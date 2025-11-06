// UserLogin component with email code-based authentication
import React, { useState } from 'react';
import { auth } from '../firebase';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { generateAuthCode, validateAuthCode, sendAuthCodeEmail, resetPasswordWithCode } from '../services/authService';

interface UserLoginProps {
    onBackToHome: () => void;
}

export const UserLogin: React.FC<UserLoginProps> = ({ onBackToHome }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Email state
    const [email, setEmail] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [authCode, setAuthCode] = useState('');
    
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Por favor, insira um e-mail válido.');
            setIsLoading(false);
            return;
        }
        
        try {
            // Generate and save code
            const code = await generateAuthCode(email);
            console.log('Código gerado:', code);
            
            // Send email with code
            const emailResult = await sendAuthCodeEmail(email, code);
            
            if (!emailResult.success) {
                throw new Error(emailResult.error || 'Falha ao enviar e-mail.');
            }
            
            setCodeSent(true);
            setError('');
        } catch (err: any) {
            console.error("Erro ao enviar código:", err);
            
            let errorMessage = 'Falha ao enviar o código. Verifique o endereço e tente novamente.';
            
            if (err.message?.includes('email')) {
                errorMessage = 'Erro ao enviar e-mail. Verifique sua conexão e tente novamente.';
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (authCode.length !== 4) {
            setError('O código deve ter 4 dígitos.');
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            // Validate code first (don't mark as used yet - we'll mark it after successful auth)
            const isValid = await validateAuthCode(email, authCode, false);
            
            if (!isValid) {
                setError('Código inválido ou expirado. Solicite um novo código.');
                setIsLoading(false);
                return;
            }
            
            // Code is valid, now authenticate with Firebase
            // Generate a deterministic password based on email (user doesn't need to know it)
            // This ensures the same password is used every time for the same email
            const normalizedEmail = email.toLowerCase().trim();
            const tempPassword = `temp_${normalizedEmail}_${normalizedEmail.length}_2025!`;
            
            // Strategy: Try to create user first (if doesn't exist), then sign in
            // This is more reliable than trying sign in first
            try {
                // Try to create user first (will fail if user already exists)
                console.log('[handleVerifyCode] Attempting to create user...');
                await createUserWithEmailAndPassword(auth, normalizedEmail, tempPassword);
                console.log('[handleVerifyCode] User created successfully');
                // Mark code as used after successful authentication
                await validateAuthCode(email, authCode, true);
                // User created, authentication successful - onAuthStateChanged will handle redirect
                setError('');
                return;
            } catch (createError: any) {
                console.log('[handleVerifyCode] Create user failed, error code:', createError.code);
                
                // If user already exists, try to sign in
                if (createError.code === 'auth/email-already-in-use') {
                    try {
                        console.log('[handleVerifyCode] User exists, attempting sign in...');
                        await signInWithEmailAndPassword(auth, normalizedEmail, tempPassword);
                        console.log('[handleVerifyCode] Sign in successful');
                        // Mark code as used after successful authentication
                        await validateAuthCode(email, authCode, true);
                        // Authentication successful - onAuthStateChanged will handle redirect
                        setError('');
                        return;
                    } catch (signInError: any) {
                        console.error('[handleVerifyCode] Sign in failed, error code:', signInError.code);
                        
                        // If invalid credential, user exists but password doesn't match
                        // Try to reset password using the valid auth code
                        if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/wrong-password') {
                            console.log('[handleVerifyCode] Password mismatch detected, attempting to reset password...');
                            
                            try {
                                // Reset password using backend service (code is already validated)
                                const resetResult = await resetPasswordWithCode(normalizedEmail, authCode);
                                
                                if (resetResult.success) {
                                    console.log('[handleVerifyCode] Password reset successful, attempting sign in...');
                                    // Try sign in again with new password
                                    await signInWithEmailAndPassword(auth, normalizedEmail, tempPassword);
                                    console.log('[handleVerifyCode] Sign in successful after password reset');
                                    // Mark code as used after successful authentication
                                    await validateAuthCode(email, authCode, true);
                                    setError('');
                                    return;
                                } else {
                                    throw new Error(resetResult.error || 'Erro ao resetar senha. Por favor, solicite um novo código.');
                                }
                            } catch (resetError: any) {
                                console.error('[handleVerifyCode] Password reset failed:', resetError);
                                throw new Error('Erro ao fazer login. A senha pode ter sido alterada. Por favor, solicite um novo código ou entre em contato com o suporte.');
                            }
                        } else {
                            throw signInError;
                        }
                    }
                } else if (createError.code === 'auth/invalid-email') {
                    throw new Error('E-mail inválido.');
                } else if (createError.code === 'auth/weak-password') {
                    throw new Error('Erro interno. Tente novamente.');
                } else {
                    // For other errors, try sign in as fallback
                    console.log('[handleVerifyCode] Trying sign in as fallback...');
                    try {
                        await signInWithEmailAndPassword(auth, normalizedEmail, tempPassword);
                        console.log('[handleVerifyCode] Sign in successful (fallback)');
                        // Mark code as used after successful authentication
                        await validateAuthCode(email, authCode, true);
                        setError('');
                        return;
                    } catch (signInError: any) {
                        console.error('[handleVerifyCode] Fallback sign in failed:', signInError.code);
                        throw createError; // Throw original create error
                    }
                }
            }
            
        } catch (err: any) {
            console.error("Erro ao verificar código:", err);
            
            let errorMessage = 'Erro ao fazer login. Tente novamente.';
            
            // Most errors are already handled in the try block above
            // This catch is mainly for unexpected errors
            if (err.message) {
                errorMessage = err.message;
            } else if (err.code === 'auth/invalid-email') {
                errorMessage = 'E-mail inválido.';
            } else if (err.code === 'auth/weak-password') {
                errorMessage = 'Erro interno. Tente novamente.';
            } else if (err.code === 'auth/network-request-failed') {
                errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleResendCode = () => {
        setCodeSent(false);
        setAuthCode('');
        setError('');
    };

    return (
        <>
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="card-standard w-full max-w-md">
                    <div className="text-center mb-6">
                        <div className="text-4xl mb-4">🔐</div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Acesso ao Suporte
                        </h1>
                        <p className="text-sm text-gray-600">
                            Digite seu e-mail para receber um código de acesso
                        </p>
                    </div>
                    
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700">
                            <span>{error}</span>
                        </div>
                    )}

                    {!codeSent ? (
                        <form className="space-y-4" onSubmit={handleSendCode}>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Seu E-mail
                                </label>
                                <input 
                                    id="email" 
                                    name="email" 
                                    type="email" 
                                    autoComplete="email" 
                                    required 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    className="input-standard" 
                                    placeholder="seu@email.com"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="mt-6">
                                <button type="submit" disabled={isLoading} className="btn-standard-primary w-full py-3">
                                    {isLoading ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm mr-2"></span>
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <span className="mr-2">✉️</span>
                                            Enviar Código de Acesso
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-green-50 border border-green-200 text-green-800">
                                <div className="flex items-start">
                                    <span className="text-xl mr-3">✅</span>
                                    <div>
                                        <h3 className="font-bold mb-1">Código Enviado!</h3>
                                        <p className="text-sm mb-1">Verifique seu e-mail e digite o código de 4 dígitos recebido.</p>
                                        <p className="text-xs text-green-700">O código expira em 5 minutos.</p>
                                    </div>
                                </div>
                            </div>
                            <form className="space-y-4" onSubmit={handleVerifyCode}>
                                <div>
                                    <label htmlFor="authCode" className="block text-sm font-medium text-gray-700 mb-2">
                                        Código de 4 dígitos
                                    </label>
                                    <input 
                                        id="authCode" 
                                        name="authCode" 
                                        type="text" 
                                        maxLength={4} 
                                        required 
                                        value={authCode} 
                                        onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, ''))} 
                                        className="input-standard text-center text-2xl tracking-widest font-mono" 
                                        placeholder="0000"
                                        autoFocus
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="mt-6">
                                    <button 
                                        type="submit" 
                                        disabled={isLoading || authCode.length !== 4} 
                                        className="btn-standard-primary w-full py-3"
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm mr-2"></span>
                                                Verificando...
                                            </>
                                        ) : (
                                            'Verificar e Acessar'
                                        )}
                                    </button>
                                </div>
                                <div className="text-center">
                                    <button 
                                        type="button" 
                                        onClick={handleResendCode} 
                                        className="text-sm text-blue-600 hover:text-blue-700"
                                        disabled={isLoading}
                                    >
                                        ↻ Reenviar código
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="text-center">
                            <button 
                                onClick={onBackToHome} 
                                className="btn-standard w-full text-sm"
                                disabled={isLoading}
                            >
                                ← Voltar para a página inicial
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
