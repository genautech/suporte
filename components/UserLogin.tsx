// UserLogin component with email code-based authentication
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { auth } from '../firebase';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { generateAuthCode, validateAuthCode, sendAuthCodeEmail, resetPasswordWithCode } from '../services/authService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface UserLoginProps {
    onBackToHome?: () => void;
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
        
        // Normalizar código: remover espaços e caracteres não numéricos, manter apenas dígitos
        const normalizedCode = authCode.replace(/\D/g, '');
        
        if (normalizedCode.length !== 4) {
            setError('O código deve ter 4 dígitos.');
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            // Normalizar email também
            const normalizedEmail = email.toLowerCase().trim();
            
            console.log('[handleVerifyCode] Validating code:', {
                email: normalizedEmail,
                codeLength: normalizedCode.length,
                code: normalizedCode.replace(/\d/g, '*') // Log mascarado para segurança
            });
            
            // Validate code first (don't mark as used yet - we'll mark it after successful auth)
            const isValid = await validateAuthCode(normalizedEmail, normalizedCode, false);
            
            if (!isValid) {
                console.error('[handleVerifyCode] Code validation failed');
                setError('Código inválido ou expirado. Solicite um novo código.');
                setIsLoading(false);
                return;
            }
            
            console.log('[handleVerifyCode] Code validated successfully');
            
            // Code is valid, now authenticate with Firebase
            // Generate a deterministic password based on email (user doesn't need to know it)
            // This ensures the same password is used every time for the same email
            const tempPassword = `temp_${normalizedEmail}_${normalizedEmail.length}_2025!`;
            
            // Strategy: Try to create user first (if doesn't exist), then sign in
            // This is more reliable than trying sign in first
            try {
                // Try to create user first (will fail if user already exists)
                console.log('[handleVerifyCode] Attempting to create user...');
                await createUserWithEmailAndPassword(auth, normalizedEmail, tempPassword);
                console.log('[handleVerifyCode] User created successfully');
                // Mark code as used after successful authentication
                await validateAuthCode(normalizedEmail, normalizedCode, true);
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
                        await validateAuthCode(normalizedEmail, normalizedCode, true);
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
                                const resetResult = await resetPasswordWithCode(normalizedEmail, normalizedCode);
                                
                                if (resetResult.success) {
                                    console.log('[handleVerifyCode] Password reset successful, attempting sign in...');
                                    // Try sign in again with new password
                                    await signInWithEmailAndPassword(auth, normalizedEmail, tempPassword);
                                    console.log('[handleVerifyCode] Sign in successful after password reset');
                                    // Mark code as used after successful authentication
                                    await validateAuthCode(normalizedEmail, normalizedCode, true);
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
                        await validateAuthCode(normalizedEmail, normalizedCode, true);
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
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="shadow-xl border-border/60">
                    <CardHeader className="text-center space-y-2">
                        <div className="text-5xl mb-2">🔐</div>
                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Acesso ao Suporte
                        </CardTitle>
                        <CardDescription className="text-base">
                            Digite seu e-mail para receber um código de acesso
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {error && (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        {!codeSent ? (
                            <form className="space-y-4" onSubmit={handleSendCode}>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Seu e-mail</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        disabled={isLoading}
                                        className="h-12 text-base"
                                    />
                                </div>
                                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm mr-2" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <span className="mr-2">✉️</span>
                                            Enviar Código de Acesso
                                        </>
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                                    <div className="font-semibold mb-1">Código enviado!</div>
                                    <p className="text-muted-foreground text-xs">
                                        Verifique seu e-mail e digite o código de 4 dígitos recebido. O código expira em 5 minutos.
                                    </p>
                                </div>

                                <form className="space-y-4" onSubmit={handleVerifyCode}>
                                    <div className="space-y-2">
                                        <Label htmlFor="authCode">Código de 4 dígitos</Label>
                                        <Input
                                            id="authCode"
                                            name="authCode"
                                            type="text"
                                            maxLength={4}
                                            required
                                            value={authCode}
                                            onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, ''))}
                                            className="text-center text-2xl tracking-[0.4em] font-mono h-12"
                                            placeholder="0000"
                                            autoFocus
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full"
                                        disabled={isLoading || authCode.length !== 4}
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm mr-2" />
                                                Verificando...
                                            </>
                                        ) : (
                                            'Verificar e Acessar'
                                        )}
                                    </Button>
                                    <div className="text-center">
                                        <Button
                                            type="button"
                                            variant="link"
                                            className="text-sm"
                                            disabled={isLoading}
                                            onClick={handleResendCode}
                                        >
                                            ↻ Reenviar código
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}
                        
                        {onBackToHome && (
                            <div className="text-center pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-sm"
                                    disabled={isLoading}
                                    onClick={onBackToHome}
                                >
                                    ← Voltar para página inicial
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};
