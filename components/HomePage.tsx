import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { useEmailCodeLogin } from '../hooks/useEmailCodeLogin';

interface HomePageProps {
    onUserLoginClick?: () => void; // Mantido para compatibilidade, mas não será usado
}

const SAVED_EMAIL_KEY = 'suporte_saved_email';

export const HomePage: React.FC<HomePageProps> = ({ onUserLoginClick }) => {
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
    } = useEmailCodeLogin({ rememberEmailKey: SAVED_EMAIL_KEY });

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4 sm:p-6">
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
                                <form onSubmit={sendCode} className="space-y-4">
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