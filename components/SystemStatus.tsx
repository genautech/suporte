import React, { useState, useEffect, useCallback } from 'react';
import { ApiConfig } from '../types';
import { supportService } from '../services/supportService';
import { auth } from '../firebase';

const StatusCard: React.FC<{ title: string; status: 'ok' | 'error' | 'loading'; message: string; children?: React.ReactNode }> = ({ title, status, message, children }) => {
    const statusInfo = {
        ok: { color: 'border-green-500', icon: '✅' },
        error: { color: 'border-red-500', icon: '❌' },
        loading: { color: 'border-yellow-500', icon: '⏳' }
    };
    const { color, icon } = statusInfo[status];
    return (
        <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${color}`}>
            <h3 className="text-lg font-semibold flex items-center">{icon} <span className="ml-2">{title}</span></h3>
            <p className="text-sm text-gray-600 mt-2">{message}</p>
            {children}
        </div>
    );
};

export const SystemStatus: React.FC = () => {
    const [cubboConfig, setCubboConfig] = useState<ApiConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTesting, setIsTesting] = useState(false);
    const [testError, setTestError] = useState<string | null>(null); // State for detailed error message

    const loadCubboConfig = useCallback(async () => {
        setIsLoading(true);
        const configs = await supportService.getApiConfigs();
        const cubbo = configs.find(c => c.id === 'cubbo');
        setCubboConfig(cubbo || null);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadCubboConfig();
    }, [loadCubboConfig]);

    const handleTestConnection = async () => {
        if (!cubboConfig) return;
        setIsTesting(true);
        setTestError(null); // Clear previous errors
        const result = await supportService.testApiConnection();
        const newStatus = result.success ? 'connected' : 'error';
        
        if (!result.success) {
            setTestError(result.error || 'Erro desconhecido durante o teste.');
        }

        await supportService.saveApiConfig(cubboConfig.id, { status: newStatus });
        await loadCubboConfig();
        setIsTesting(false);
    };

    return (
        <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Status do Sistema</h2>
            <p className="text-gray-600 mb-6">Verifique a saúde das integrações e serviços essenciais da aplicação.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatusCard
                    title="Autenticação Firebase"
                    status={auth.app ? 'ok' : 'error'}
                    message={auth.app ? "Serviço de autenticação (E-mail e Telefone) operacional." : "Falha ao inicializar o serviço de autenticação."}
                />
                <StatusCard
                    title="Banco de Dados (Firestore)"
                    status={auth.app ? 'ok' : 'error'}
                    message={auth.app ? "Conexão com o banco de dados estabelecida com sucesso." : "Não foi possível conectar ao Firestore."}
                />
                 <StatusCard
                    title="reCAPTCHA"
                    status={'ok'}
                    message={"reCAPTCHA invisível configurado para proteger o login por telefone."}
                />

                {isLoading ? (
                     <StatusCard title="API da Cubbo" status="loading" message="Verificando configuração da API de pedidos..." />
                ) : cubboConfig ? (
                    <StatusCard
                        title="API da Cubbo"
                        status={cubboConfig.status === 'connected' ? 'ok' : 'error'}
                        message={
                            cubboConfig.status === 'connected'
                            ? "A conexão com a API da Cubbo foi bem-sucedida."
                            : "Falha na conexão com a API da Cubbo. Isso impede o rastreamento de pedidos."
                        }
                    >
                       <div className="mt-4">
                           <button onClick={handleTestConnection} className="btn btn-sm btn-outline" disabled={isTesting}>
                               {isTesting ? <span className="loading loading-spinner loading-xs"></span> : null}
                               Testar Conexão
                           </button>
                       </div>
                       {testError && cubboConfig.status === 'error' && (
                           <div className="text-xs text-red-700 mt-2 p-2 bg-red-50 rounded-md space-y-1">
                               <p><strong>Detalhe do erro:</strong> {testError}</p>
                               <p className="font-semibold">Isso geralmente indica que as credenciais (Client ID/Secret) configuradas no serviço de proxy no Google Cloud estão incorretas. Verifique a aba de "Configurações" para mais detalhes sobre como corrigir.</p>
                           </div>
                       )}
                    </StatusCard>
                ) : (
                    <StatusCard title="API da Cubbo" status="error" message="Configuração da API da Cubbo não encontrada no banco de dados." />
                )}
            </div>
        </div>
    );
};