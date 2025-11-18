import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

interface HomePageProps {
    onUserLoginClick: () => void;
    onAdminLoginClick: () => void;
    onManagerLoginClick?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onUserLoginClick, onAdminLoginClick, onManagerLoginClick }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email.trim()) {
            setIsLoading(true);
            // Simula um pequeno delay para melhor UX
            setTimeout(() => {
                setIsLoading(false);
                onUserLoginClick();
            }, 300);
        }
    };

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
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                                        Acessando...
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
                        
                        {/* Link para acesso administrativo */}
                        <div className="mt-4 pt-4 border-t border-border w-full">
                            <button
                                onClick={onAdminLoginClick}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                            >
                                Acesso Administrativo
                            </button>
                            {onManagerLoginClick && (
                                <button
                                    onClick={onManagerLoginClick}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center mt-2"
                                >
                                    Acesso de Gestor
                                </button>
                            )}
                        </div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
};