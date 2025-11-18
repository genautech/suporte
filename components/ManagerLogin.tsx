// ManagerLogin component for company managers
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { isManager, getManagerCompany } from '../services/authService';
import { companyService } from '../services/companyService';

interface ManagerLoginProps {
    onLoginSuccess: (companyId: string) => void;
}

export const ManagerLogin: React.FC<ManagerLoginProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Verificar se é gestor
            const isManagerUser = await isManager(email);
            
            if (!isManagerUser) {
                setError('Você não tem permissão de gestor. Entre em contato com o administrador.');
                setIsLoading(false);
                return;
            }

            // Obter companyId do gestor
            const companyId = await getManagerCompany(email);
            
            if (!companyId) {
                setError('Empresa não encontrada. Entre em contato com o administrador.');
                setIsLoading(false);
                return;
            }

            // Verificar se empresa existe e gestor tem acesso habilitado
            const company = await companyService.getCompany(companyId);
            
            if (!company) {
                setError('Empresa não encontrada.');
                setIsLoading(false);
                return;
            }

            if (!company.managerAccessEnabled) {
                setError('Acesso do gestor não está habilitado. Entre em contato com o administrador.');
                setIsLoading(false);
                return;
            }

            if (company.managerEmail.toLowerCase() !== email.toLowerCase()) {
                setError('Email não corresponde ao gestor cadastrado.');
                setIsLoading(false);
                return;
            }

            // Autenticar com Firebase Auth
            const normalizedEmail = email.toLowerCase().trim();
            try {
                console.log('[ManagerLogin] Tentando fazer login com Firebase Auth...');
                await signInWithEmailAndPassword(auth, normalizedEmail, password);
                console.log('[ManagerLogin] Login bem-sucedido!');
                // Login bem-sucedido - onAuthStateChanged no App.tsx vai detectar
                onLoginSuccess(companyId);
                setIsLoading(false);
            } catch (authError: any) {
                console.log('[ManagerLogin] Erro no login:', authError.code, authError.message);
                
                // Se usuário não existe, tentar criar
                if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
                    console.log('[ManagerLogin] Usuário não encontrado, tentando criar...');
                    try {
                        await createUserWithEmailAndPassword(auth, normalizedEmail, password);
                        console.log('[ManagerLogin] Usuário criado com sucesso!');
                        onLoginSuccess(companyId);
                        setIsLoading(false);
                    } catch (createError: any) {
                        console.error('[ManagerLogin] Erro ao criar usuário:', createError);
                        let errorMessage = 'Erro ao criar usuário gestor.';
                        
                        if (createError.code === 'auth/email-already-in-use') {
                            errorMessage = 'Email já está em uso. Entre em contato com o administrador.';
                        } else if (createError.code === 'auth/invalid-email') {
                            errorMessage = 'Email inválido.';
                        } else if (createError.code === 'auth/weak-password') {
                            errorMessage = 'Senha muito fraca. Use uma senha mais forte.';
                        } else {
                            errorMessage = `Erro: ${createError.message || createError.code}. Entre em contato com o administrador.`;
                        }
                        
                        setError(errorMessage);
                        setIsLoading(false);
                    }
                } else if (authError.code === 'auth/wrong-password') {
                    setError('Senha incorreta. Verifique sua senha e tente novamente.');
                    setIsLoading(false);
                } else if (authError.code === 'auth/invalid-email') {
                    setError('Email inválido.');
                    setIsLoading(false);
                } else if (authError.code === 'auth/user-disabled') {
                    setError('Usuário desabilitado. Entre em contato com o administrador.');
                    setIsLoading(false);
                } else if (authError.code === 'auth/too-many-requests') {
                    setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
                    setIsLoading(false);
                } else {
                    console.error('[ManagerLogin] Auth error:', authError);
                    setError(`Erro ao fazer login: ${authError.message || authError.code}. Entre em contato com o administrador.`);
                    setIsLoading(false);
                }
            }

        } catch (err: any) {
            console.error('Erro no login do gestor:', err);
            setError('Erro ao fazer login. Tente novamente.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card className="w-full max-w-sm shadow-xl">
                    <CardHeader className="text-center">
                        <div className="text-5xl mb-4">🏢</div>
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                            Acesso de Gestor
                        </CardTitle>
                        <CardDescription>
                            Faça login para acessar o painel da sua empresa
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form className="space-y-4" onSubmit={handleLogin}>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email do Gestor</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="gestor@empresa.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            
                            {error && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
                                    {error}
                                </div>
                            )}

                            <div className="mt-6">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full"
                                    size="lg"
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm mr-2"></span>
                                            Verificando...
                                        </>
                                    ) : (
                                        'Entrar'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

