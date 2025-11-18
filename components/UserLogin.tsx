// UserLogin component with email code-based authentication
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useEmailCodeLogin } from '../hooks/useEmailCodeLogin';

interface UserLoginProps {
    onBackToHome?: () => void;
}

export const UserLogin: React.FC<UserLoginProps> = ({ onBackToHome }) => {
    const {
        email,
        setEmail,
        authCode,
        setAuthCode,
        codeSent,
        isLoading,
        error,
        sendCode,
        verifyCode,
        resendCode,
    } = useEmailCodeLogin({ rememberEmailKey: null });

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
                            <form className="space-y-4" onSubmit={sendCode}>
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

                                <form className="space-y-4" onSubmit={verifyCode}>
                                    <div className="space-y-2">
                                        <Label htmlFor="authCode">Código de 4 dígitos</Label>
                                        <Input
                                            id="authCode"
                                            name="authCode"
                                            type="text"
                                            maxLength={4}
                                            required
                                            value={authCode}
                                            onChange={(e) => setAuthCode(e.target.value)}
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
                                            onClick={resendCode}
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
