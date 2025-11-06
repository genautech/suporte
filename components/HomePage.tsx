import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

interface HomePageProps {
    onUserLoginClick: () => void;
    onAdminLoginClick: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onUserLoginClick, onAdminLoginClick }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center">
                    <div className="text-6xl mb-4">🛍️</div>
                    <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                        Suporte Yoobe
                    </CardTitle>
                    <CardDescription className="text-base">O aplicativo de suporte da sua loja corporativa.</CardDescription>
                </CardHeader>
                
                <CardContent>
                    <p className="text-muted-foreground mb-6 text-center">
                        Bem-vindo ao nosso portal de suporte. Acesse para rastrear pedidos, 
                        solicitar trocas ou tirar dúvidas.
                    </p>
                    
                    <div className="space-y-3">
                        <Button 
                            onClick={onUserLoginClick} 
                            size="lg"
                            className="w-full"
                        >
                            <span className="text-lg">👤</span>
                            Acessar Portal do Cliente
                        </Button>
                        
                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-background text-muted-foreground">ou</span>
                            </div>
                        </div>
                        
                        <Button 
                            onClick={onAdminLoginClick} 
                            variant="outline"
                            className="w-full"
                        >
                            Acesso Administrativo
                        </Button>
                    </div>
                </CardContent>
                
                <CardFooter className="flex-col">
                    <div className="w-full border-t border-border pt-6">
                        <p className="text-xs text-muted-foreground text-center">
                            💬 Use nosso chatbot para atendimento rápido e eficiente
                        </p>
                    </div>
                </CardFooter>
            </Card>
            </motion.div>
        </div>
    );
};