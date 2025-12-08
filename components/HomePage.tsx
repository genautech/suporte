import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { auth } from '../firebase';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { generateAuthCode, validateAuthCode, sendAuthCodeEmail, resetPasswordWithCode } from '../services/authService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { SupportNoticeBanner } from './SupportNoticeBanner';

interface HomePageProps {
    onUserLoginClick?: () => void; // Mantido para compatibilidade, mas não será usado
}

const SAVED_EMAIL_KEY = 'suporte_saved_email';

export const HomePage: React.FC<HomePageProps> = ({ onUserLoginClick }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [authCode, setAuthCode] = useState('');

    // Carregar email salvo ao montar componente
    useEffect(() => {
        const savedEmail = localStorage.getItem(SAVED_EMAIL_KEY);
        if (savedEmail) {
            setEmail(savedEmail);
        }
    }, []);

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
            
            // Salvar email no localStorage
            localStorage.setItem(SAVED_EMAIL_KEY, email);
            
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
            const normalizedEmail = email.toLowerCase().trim();
            const tempPassword = `temp_${normalizedEmail}_${normalizedEmail.length}_2025!`;
            
            // Strategy: Try to create user first (if doesn't exist), then sign in
            try {
                console.log('[handleVerifyCode] Attempting to create user...');
                await createUserWithEmailAndPassword(auth, normalizedEmail, tempPassword);
                console.log('[handleVerifyCode] User created successfully');
                // Mark code as used after successful authentication
                await validateAuthCode(email, authCode, true);
                // Salvar email no localStorage após login bem-sucedido
                localStorage.setItem(SAVED_EMAIL_KEY, normalizedEmail);
                // Authentication successful - onAuthStateChanged will handle redirect
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
                        // Salvar email no localStorage após login bem-sucedido
                        localStorage.setItem(SAVED_EMAIL_KEY, normalizedEmail);
                        // Authentication successful - onAuthStateChanged will handle redirect
                        setError('');
                        return;
                    } catch (signInError: any) {
                        console.error('[handleVerifyCode] Sign in failed, error code:', signInError.code);
                        
                        // If invalid credential, user exists but password doesn't match
                        if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/wrong-password') {
                            console.log('[handleVerifyCode] Password mismatch detected, attempting to reset password...');
                            
                            try {
                                const resetResult = await resetPasswordWithCode(normalizedEmail, authCode);
                                
                                if (resetResult.success) {
                                    console.log('[handleVerifyCode] Password reset successful, attempting sign in...');
                                    await signInWithEmailAndPassword(auth, normalizedEmail, tempPassword);
                                    console.log('[handleVerifyCode] Sign in successful after password reset');
                                    await validateAuthCode(email, authCode, true);
                                    // Salvar email no localStorage após login bem-sucedido
                                    localStorage.setItem(SAVED_EMAIL_KEY, normalizedEmail);
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
                        await validateAuthCode(email, authCode, true);
                        // Salvar email no localStorage após login bem-sucedido
                        localStorage.setItem(SAVED_EMAIL_KEY, normalizedEmail);
                        setError('');
                        return;
                    } catch (signInError: any) {
                        console.error('[handleVerifyCode] Fallback sign in failed:', signInError.code);
                        throw createError;
                    }
                }
            }
            
        } catch (err: any) {
            console.error("Erro ao verificar código:", err);
            
            let errorMessage = 'Erro ao fazer login. Tente novamente.';
            
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
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col items-center justify-center gap-6 p-4 sm:p-6">
            <div className="w-full max-w-3xl">
                <SupportNoticeBanner
                    companyId="general"
                    location="home"
                    className="shadow-lg"
                    title="Avisos importantes"
                    description="Confira os comunicados antes de acessar o suporte."
                />
            </div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="shadow-xl border-border/60">
                    <CardHeader className="text-center space-y-3 pb-6">
                        {/* Ícone de sacolas de compras */}
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="text-5xl sm:text-6xl">🛍️</div>
                            <div className="text-4xl sm:text-5xl">👜</div>
                        </div>
                        <CardTitle className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Bem-vindo ao Suporte Yoobe
                        </CardTitle>
                        <CardDescription className="text-sm sm:text-base mt-2">
                            Informe seu e-mail uma única vez para acessar o suporte
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-5">
                        {error && (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        {!codeSent ? (
                            <>
                                <form onSubmit={handleSendCode} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-sm font-medium">
                                            Seu E-mail
                                        </Label>
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
                                    
                                    <Button 
                                        type="submit"
                                        size="lg"
                                        className="w-full"
                                        disabled={isLoading || !email.trim()}
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm mr-2" />
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <span className="mr-2">✨</span>
                                                Acessar Suporte
                                            </>
                                        )}
                                    </Button>
                                </form>

                                {/* Texto informativo */}
                                <div className="flex items-start gap-2 pt-2">
                                    <span className="text-lg mt-0.5">✨</span>
                                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                        Você só precisa fazer isso uma vez. Nas próximas visitas, entraremos automaticamente.
                                    </p>
                                </div>
                            </>
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
                    </CardContent>
                    
                    <CardFooter className="flex-col pt-4">
                        <div className="w-full border-t border-border pt-4">
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-sm">💬</span>
                                <p className="text-xs sm:text-sm text-muted-foreground text-center">
                                    Use nosso chatbot para atendimento rápido e eficiente
                                </p>
                            </div>
                        </div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
};