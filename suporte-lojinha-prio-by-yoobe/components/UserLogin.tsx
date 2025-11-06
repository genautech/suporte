// Fix: Implement the UserLogin component.
import React, { useState } from 'react';
import { auth } from '../firebase';
import { 
    sendSignInLinkToEmail, 
    RecaptchaVerifier, 
    signInWithPhoneNumber,
    ConfirmationResult
} from 'firebase/auth';

interface UserLoginProps {
    onBackToHome: () => void;
}

type LoginMethod = 'phone' | 'email';

export const UserLogin: React.FC<UserLoginProps> = ({ onBackToHome }) => {
    const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Email state
    const [email, setEmail] = useState('');
    const [emailSent, setEmailSent] = useState(false);

    // Phone state
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        
        const actionCodeSettings = {
            url: window.location.origin, // Redirect back to the main page after login
            handleCodeInApp: true,
        };

        try {
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            setEmailSent(true);
        } catch (err: any) {
            console.error(err);
            setError('Falha ao enviar o e-mail. Verifique o endereço e tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePhoneLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Clean phone number: remove all non-digits
            const cleanPhone = phone.replace(/\D/g, '');
            console.log('Número digitado:', phone);
            console.log('Número limpo:', cleanPhone);
            
            // Validate phone number format (should be 10 or 11 digits for Brazil)
            if (cleanPhone.length < 10 || cleanPhone.length > 11) {
                throw new Error('Número de telefone deve ter 10 ou 11 dígitos (com DDD)');
            }

            // Ensure any previous instance is cleaned up.
            if ((window as any).recaptchaVerifier) {
                try {
                    (window as any).recaptchaVerifier.clear();
                } catch (clearErr) {
                    console.warn('Error clearing previous verifier:', clearErr);
                }
                delete (window as any).recaptchaVerifier;
            }

            // Create a new RecaptchaVerifier instance for this login attempt.
            console.log('Criando RecaptchaVerifier...');
            const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => { 
                    console.log('reCAPTCHA verificado com sucesso');
                },
                'expired-callback': () => {
                    console.error('reCAPTCHA expirado');
                    setError('reCAPTCHA expirado. Por favor, tente novamente.');
                }
            });
            
            // Store verifier on window to manage its lifecycle
            (window as any).recaptchaVerifier = verifier;

            // Format phone number: +55 + DDD + number
            const formattedPhone = `+55${cleanPhone}`;
            console.log('Número formatado:', formattedPhone);
            
            // Additional validation
            if (formattedPhone.length !== 13 && formattedPhone.length !== 14) {
                throw new Error(`Número inválido. Formato esperado: +55XXXXXXXXXXX ou +55XXXXXXXXXXXX`);
            }

            console.log('Enviando SMS para:', formattedPhone);
            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
            console.log('SMS enviado com sucesso! ConfirmationResult:', confirmation);
            
            setConfirmationResult(confirmation);
            setError(''); // Clear any previous errors

        } catch (err: any) {
            console.error("Erro completo no Phone Auth:", err);
            console.error("Código do erro:", err.code);
            console.error("Mensagem do erro:", err.message);
            console.error("Stack trace:", err.stack);
            
            // Clean up verifier on error
            if ((window as any).recaptchaVerifier) {
                try {
                    (window as any).recaptchaVerifier.clear();
                } catch (clearErr) {
                    console.error('Error clearing verifier:', clearErr);
                }
                delete (window as any).recaptchaVerifier;
            }
            
            // Provide more specific feedback
            if (err.code === 'auth/invalid-phone-number') {
                setError('O número de telefone é inválido. Use o formato DDD + número (ex: 41987607512).');
            } else if (err.code === 'auth/invalid-app-credential') {
                setError('Erro de configuração do Firebase. Verifique se Phone Authentication está habilitado no Firebase Console.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Muitas tentativas. Por favor, aguarde alguns minutos e tente novamente.');
            } else if (err.code === 'auth/captcha-check-failed') {
                setError('Falha na verificação do reCAPTCHA. Por favor, recarregue a página e tente novamente.');
            } else if (err.code === 'auth/quota-exceeded') {
                setError('Limite de SMS excedido. Verifique as quotas do Firebase ou tente novamente mais tarde.');
            } else if (err.code === 'auth/missing-phone-number') {
                setError('Número de telefone não fornecido.');
            } else if (err.message?.includes('invalid') || err.message?.includes('inválido')) {
                setError(`Número de telefone inválido: ${err.message}`);
            } else {
                setError(`Erro ao enviar SMS: ${err.message || err.code || 'Erro desconhecido'}. Verifique o console para mais detalhes.`);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmationResult || otp.length !== 6) return;

        setIsLoading(true);
        setError('');
        try {
            await confirmationResult.confirm(otp);
            // onAuthStateChanged in App.tsx will now handle the successful login
        } catch (err: any) {
            console.error(err);
            setError('Código de verificação inválido. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
             <div id="recaptcha-container"></div>
             <div className="absolute inset-0 bg-gray-800"></div>
            <div className="relative z-10 w-full max-w-sm p-8 space-y-6 bg-white rounded-xl shadow-lg animate-fade-in">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Acesso ao Suporte
                    </h1>
                     <p className="mt-2 text-sm text-gray-600">
                       Acesse com seu telefone ou e-mail.
                    </p>
                </div>
                
                <div role="tablist" className="tabs tabs-boxed">
                    <a role="tab" className={`tab ${loginMethod === 'phone' ? 'tab-active' : ''}`} onClick={() => setLoginMethod('phone')}>Telefone</a>
                    <a role="tab" className={`tab ${loginMethod === 'email' ? 'tab-active' : ''}`} onClick={() => setLoginMethod('email')}>Email</a>
                </div>
                
                {error && <div className="alert alert-error text-sm">{error}</div>}

                {loginMethod === 'email' && !emailSent && (
                     <form className="space-y-6" onSubmit={handleEmailLogin}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Seu E-mail</label>
                            <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full input input-bordered" />
                        </div>
                        <div>
                            <button type="submit" disabled={isLoading} className="w-full btn btn-primary">
                                {isLoading ? <span className="loading loading-spinner"></span> : 'Enviar Link de Acesso'}
                            </button>
                        </div>
                    </form>
                )}
                {loginMethod === 'email' && emailSent && (
                    <div className="text-center p-4 bg-green-100 border border-green-300 text-green-800 rounded-md">
                        <h3 className="font-bold">Link enviado!</h3>
                        <p className="text-sm">Verifique sua caixa de entrada (e spam) e clique no link para acessar.</p>
                    </div>
                )}
                
                {loginMethod === 'phone' && !confirmationResult && (
                    <form className="space-y-6" onSubmit={handlePhoneLogin}>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Seu Telefone (com DDD)</label>
                            <input id="phone" name="phone" type="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11999998888" className="w-full input input-bordered" />
                        </div>
                        <div>
                            <button type="submit" disabled={isLoading} className="w-full btn btn-primary">
                                {isLoading ? <span className="loading loading-spinner"></span> : 'Enviar Código SMS'}
                            </button>
                        </div>
                    </form>
                )}

                {loginMethod === 'phone' && confirmationResult && (
                    <div className="space-y-6">
                        <div className="text-center p-4 bg-green-100 border border-green-300 text-green-800 rounded-md">
                            <h3 className="font-bold">SMS Enviado!</h3>
                            <p className="text-sm mt-1">Verifique seu telefone e digite o código de 6 dígitos recebido.</p>
                        </div>
                        <form className="space-y-6" onSubmit={handleVerifyOtp}>
                            <div>
                                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">Código de 6 dígitos</label>
                                <input id="otp" name="otp" type="text" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="w-full input input-bordered text-center tracking-[0.5em] md:tracking-[1em]" placeholder="000000" />
                            </div>
                            <div>
                                <button type="submit" disabled={isLoading || otp.length !== 6} className="w-full btn btn-primary">
                                    {isLoading ? <span className="loading loading-spinner"></span> : 'Verificar e Acessar'}
                                </button>
                            </div>
                            <div className="text-center">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setConfirmationResult(null);
                                        setOtp('');
                                        setError('');
                                    }} 
                                    className="link text-sm"
                                >
                                    Reenviar código
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="text-center text-sm">
                    <button onClick={onBackToHome} className="link">Voltar para a página inicial</button>
                </div>
            </div>
        </div>
    );
};