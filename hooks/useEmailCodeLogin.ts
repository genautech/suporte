import { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from 'firebase/auth';
import {
    generateAuthCode,
    sendAuthCodeEmail,
    validateAuthCode,
    resetPasswordWithCode,
} from '../services/authService';

const DEFAULT_PASSWORD_SUFFIX = '_2025!';
const DEFAULT_MEMORY_KEY = 'suporte_saved_email';

const isBrowser = typeof window !== 'undefined';

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const sanitizeCode = (value: string) => value.replace(/\D/g, '');
const buildTempPassword = (email: string) =>
    `temp_${email}_${email.length}${DEFAULT_PASSWORD_SUFFIX}`;

type FirebaseAuthError = {
    code?: string;
    message?: string;
};

interface EmailCodeLoginOptions {
    rememberEmailKey?: string | null;
    onLoginSuccess?: () => void;
}

interface EmailCodeLoginHook {
    email: string;
    setEmail: (value: string) => void;
    authCode: string;
    setAuthCode: (value: string) => void;
    codeSent: boolean;
    isLoading: boolean;
    error: string | null;
    sendCode: (event?: React.FormEvent) => Promise<void>;
    verifyCode: (event?: React.FormEvent) => Promise<void>;
    resendCode: () => void;
    clearError: () => void;
}

const mapFirebaseError = (error?: FirebaseAuthError) => {
    switch (error?.code) {
        case 'auth/invalid-email':
            return 'E-mail inválido.';
        case 'auth/weak-password':
            return 'Erro interno. Tente novamente.';
        case 'auth/network-request-failed':
            return 'Erro de conexão. Verifique sua internet e tente novamente.';
        case 'auth/user-disabled':
            return 'Usuário desabilitado. Entre em contato com o suporte.';
        case 'auth/too-many-requests':
            return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
        default:
            return error?.message || 'Erro ao fazer login. Tente novamente.';
    }
};

export const useEmailCodeLogin = (
    options: EmailCodeLoginOptions = {}
): EmailCodeLoginHook => {
    const { rememberEmailKey = DEFAULT_MEMORY_KEY, onLoginSuccess } = options;

    const [email, setEmail] = useState('');
    const [authCode, setAuthCodeState] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const persistEmail = useCallback(
        (value: string) => {
            if (!rememberEmailKey || !isBrowser) return;
            try {
                localStorage.setItem(rememberEmailKey, value);
            } catch (storageError) {
                console.warn('[useEmailCodeLogin] Falha ao salvar email:', storageError);
            }
        },
        [rememberEmailKey]
    );

    useEffect(() => {
        if (!rememberEmailKey || !isBrowser) return;
        try {
            const saved = localStorage.getItem(rememberEmailKey);
            if (saved) {
                setEmail(saved);
            }
        } catch (storageError) {
            console.warn('[useEmailCodeLogin] Falha ao carregar email salvo:', storageError);
        }
    }, [rememberEmailKey]);

    const handleSendCode = useCallback(
        async (event?: React.FormEvent) => {
            event?.preventDefault();
            setError(null);

            const trimmedEmail = email.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmedEmail)) {
                setError('Por favor, insira um e-mail válido.');
                return;
            }

            setIsLoading(true);
            try {
                const normalized = normalizeEmail(trimmedEmail);
                const code = await generateAuthCode(normalized);
                console.log('[useEmailCodeLogin] Código gerado:', code);

                const result = await sendAuthCodeEmail(normalized, code);
                if (!result.success) {
                    throw new Error(result.error || 'Falha ao enviar e-mail.');
                }

                if (rememberEmailKey) {
                    persistEmail(normalized);
                }
                setCodeSent(true);
            } catch (sendError: any) {
                console.error('[useEmailCodeLogin] Erro ao enviar código:', sendError);
                if (sendError?.message?.includes('email')) {
                    setError('Erro ao enviar e-mail. Verifique sua conexão e tente novamente.');
                } else {
                    setError(sendError?.message || 'Falha ao enviar o código. Verifique o endereço e tente novamente.');
                }
            } finally {
                setIsLoading(false);
            }
        },
        [email, persistEmail, rememberEmailKey]
    );

    const completeLogin = useCallback(
        async (emailValue: string) => {
            if (rememberEmailKey) {
                persistEmail(emailValue);
            }
            onLoginSuccess?.();
        },
        [onLoginSuccess, persistEmail, rememberEmailKey]
    );

    const authenticateWithCode = useCallback(
        async (normalizedEmail: string, normalizedCode: string) => {
            const tempPassword = buildTempPassword(normalizedEmail);
            const markCodeAsUsed = async () => {
                try {
                    await validateAuthCode(normalizedEmail, normalizedCode, true);
                } catch (markError) {
                    console.warn('[useEmailCodeLogin] Falha ao marcar código como usado:', markError);
                }
            };

            try {
                await createUserWithEmailAndPassword(auth, normalizedEmail, tempPassword);
                await markCodeAsUsed();
                await completeLogin(normalizedEmail);
                return;
            } catch (createError: any) {
                if (createError?.code === 'auth/email-already-in-use') {
                    try {
                        await signInWithEmailAndPassword(auth, normalizedEmail, tempPassword);
                        await markCodeAsUsed();
                        await completeLogin(normalizedEmail);
                        return;
                    } catch (signInError: any) {
                        if (
                            signInError?.code === 'auth/invalid-credential' ||
                            signInError?.code === 'auth/wrong-password'
                        ) {
                            const resetResult = await resetPasswordWithCode(normalizedEmail, normalizedCode);
                            if (!resetResult.success) {
                                throw new Error(
                                    resetResult.error ||
                                        'Erro ao resetar senha. Solicite um novo código ou entre em contato com o suporte.'
                                );
                            }
                            await signInWithEmailAndPassword(auth, normalizedEmail, tempPassword);
                            await markCodeAsUsed();
                            await completeLogin(normalizedEmail);
                            return;
                        }
                        throw new Error(mapFirebaseError(signInError));
                    }
                }
                throw new Error(mapFirebaseError(createError));
            }
        },
        [completeLogin]
    );

    const handleVerifyCode = useCallback(
        async (event?: React.FormEvent) => {
            event?.preventDefault();
            const normalizedEmail = normalizeEmail(email);
            const normalizedCode = sanitizeCode(authCode);

            if (normalizedCode.length !== 4) {
                setError('O código deve ter 4 dígitos.');
                return;
            }

            setIsLoading(true);
            setError(null);
            try {
                const isValid = await validateAuthCode(normalizedEmail, normalizedCode, false);
                if (!isValid) {
                    setError('Código inválido ou expirado. Solicite um novo código.');
                    return;
                }

                await authenticateWithCode(normalizedEmail, normalizedCode);
            } catch (verifyError: any) {
                console.error('[useEmailCodeLogin] Erro ao verificar código:', verifyError);
                setError(verifyError?.message || 'Erro ao fazer login. Tente novamente.');
            } finally {
                setIsLoading(false);
            }
        },
        [authCode, authenticateWithCode, email]
    );

    const handleResendCode = useCallback(() => {
        setCodeSent(false);
        setAuthCodeState('');
        setError(null);
    }, []);

    const clearError = useCallback(() => setError(null), []);

    const setAuthCode = useCallback((value: string) => {
        setAuthCodeState(sanitizeCode(value));
    }, []);

    return useMemo(
        () => ({
            email,
            setEmail,
            authCode,
            setAuthCode,
            codeSent,
            isLoading,
            error,
            sendCode: handleSendCode,
            verifyCode: handleVerifyCode,
            resendCode: handleResendCode,
            clearError,
        }),
        [
            authCode,
            clearError,
            codeSent,
            email,
            handleResendCode,
            handleSendCode,
            handleVerifyCode,
            isLoading,
            error,
            setAuthCode,
        ]
    );
};


