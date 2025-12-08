import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { generateAuthCode, resetPasswordWithCode } from '../services/authService';

interface AdminLoginProps {
    onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const normalizedEmail = email.toLowerCase().trim();
            
            // Verificar credenciais admin
            if (normalizedEmail !== 'admin@yoobe.co' || password !== '123456') {
                setError('Credenciais inválidas.');
                setIsLoading(false);
                return;
            }

            // Tentar fazer login com Firebase Auth
            try {
                console.log('[AdminLogin] Tentando fazer login com Firebase Auth...');
                await signInWithEmailAndPassword(auth, normalizedEmail, password);
                console.log('[AdminLogin] Login bem-sucedido!');
                // Login bem-sucedido - onAuthStateChanged no App.tsx vai detectar
                onLoginSuccess();
            } catch (authError: any) {
                console.log('[AdminLogin] Erro no login:', authError.code, authError.message);
                
                // Se usuário não existe ou credenciais inválidas, tentar criar
                // auth/invalid-credential pode ocorrer quando usuário não existe
                if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
                    console.log('[AdminLogin] Usuário não encontrado ou credenciais inválidas, tentando criar...');
                    try {
                        await createUserWithEmailAndPassword(auth, normalizedEmail, password);
                        console.log('[AdminLogin] Usuário criado com sucesso!');
                        // Usuário criado e autenticado
                        onLoginSuccess();
                    } catch (createError: any) {
                        console.error('[AdminLogin] Erro ao criar usuário admin:', createError);
                        let errorMessage = 'Erro ao criar usuário admin.';
                        
                        if (createError.code === 'auth/email-already-in-use') {
                            // Se email já existe, tentar usar proxy de reset para definir senha correta
                            console.log('[AdminLogin] Email já existe, tentando usar proxy de reset...');
                            try {
                                // Gerar código temporário e usar proxy para resetar senha
                                const tempCode = await generateAuthCode(normalizedEmail);
                                const resetResult = await resetPasswordWithCode(normalizedEmail, tempCode);
                                
                                if (resetResult.success) {
                                    // Senha resetada, tentar login novamente
                                    console.log('[AdminLogin] Senha resetada via proxy, tentando login...');
                                    await signInWithEmailAndPassword(auth, normalizedEmail, password);
                                    onLoginSuccess();
                                    return;
                                } else {
                                    errorMessage = `Email já existe mas não foi possível resetar senha: ${resetResult.error}`;
                                }
                            } catch (proxyError: any) {
                                console.error('[AdminLogin] Erro ao usar proxy:', proxyError);
                                errorMessage = 'Email já está em uso. Crie o usuário manualmente no Firebase Console ou reset a senha.';
                            }
                        } else if (createError.code === 'auth/invalid-email') {
                            errorMessage = 'Email inválido.';
                        } else if (createError.code === 'auth/weak-password') {
                            errorMessage = 'Senha muito fraca. Use uma senha mais forte.';
                        } else if (createError.code === 'auth/operation-not-allowed') {
                            errorMessage = 'Operação não permitida. Email/Password não está habilitado no Firebase. Habilite em: https://console.firebase.google.com/project/suporte-7e68b/authentication/providers';
                        } else {
                            errorMessage = `Erro: ${createError.message || createError.code}. Crie o usuário manualmente no Firebase Console: https://console.firebase.google.com/project/suporte-7e68b/authentication/users`;
                        }
                        
                        setError(errorMessage);
                    }
                } else if (authError.code === 'auth/wrong-password') {
                    setError('Senha incorreta. Se você é o administrador, reset a senha no Firebase Console.');
                } else if (authError.code === 'auth/invalid-email') {
                    setError('Email inválido.');
                } else if (authError.code === 'auth/user-disabled') {
                    setError('Usuário desabilitado. Entre em contato com o suporte.');
                } else if (authError.code === 'auth/too-many-requests') {
                    setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
                } else {
                    console.error('[AdminLogin] Auth error:', authError);
                    setError(`Erro ao fazer login: ${authError.message || authError.code}. Verifique o console para mais detalhes.`);
                }
            }
        } catch (err: any) {
            console.error('[AdminLogin] Erro geral no login:', err);
            // Se o erro tem código, mostrar mensagem específica
            if (err?.code) {
                if (err.code === 'auth/operation-not-allowed') {
                    setError('Email/Password não está habilitado no Firebase. Habilite em: https://console.firebase.google.com/project/suporte-7e68b/authentication/providers');
                } else {
                    setError(`Erro: ${err.code} - ${err.message || 'Erro desconhecido'}`);
                }
            } else {
                setError(`Erro ao fazer login: ${err?.message || 'Erro desconhecido'}. Verifique o console para mais detalhes.`);
            }
        } finally {
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
                        <div className="text-5xl mb-4">⚡</div>
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                            Acesso Administrativo
                        </CardTitle>
                        <CardDescription>
                            Faça login para acessar o painel administrativo
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form className="space-y-4" onSubmit={handleLogin}>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
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