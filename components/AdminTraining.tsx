import React, { useState, useEffect, useCallback } from 'react';
import { KnowledgeBase, ApiConfig } from '../types';
import { supportService } from '../services/supportService';
import { EditIcon } from './Icons';

const KnowledgeBaseEditor: React.FC = () => {
    const [kb, setKb] = useState<KnowledgeBase>({ content: '', lastUpdatedAt: new Date() });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState('');

    const loadKb = useCallback(async () => {
        setIsLoading(true);
        const data = await supportService.getKnowledgeBase();
        setKb(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadKb();
    }, [loadKb]);

    const handleSave = async () => {
        setIsSaving(true);
        setFeedback('');
        try {
            await supportService.updateKnowledgeBase(kb.content);
            setFeedback('Base de conhecimento salva com sucesso!');
            setTimeout(() => setFeedback(''), 3000);
        } catch (error) {
            setFeedback('Erro ao salvar. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="text-center p-8">Carregando base de conhecimento...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold">Base de Conhecimento (Treinamento da IA)</h3>
            <p className="text-sm text-gray-500 mb-4">
                Edite o texto abaixo para treinar o chatbot. O assistente usará esta informação para responder às perguntas dos clientes. Use `## Título` para separar os tópicos.
            </p>
            <textarea
                className="textarea textarea-bordered w-full h-64 font-mono text-sm"
                value={kb.content}
                onChange={(e) => setKb({ ...kb, content: e.target.value })}
            ></textarea>
            <div className="flex justify-between items-center mt-4">
                <p className="text-xs text-gray-400">Última atualização: {kb.lastUpdatedAt.toLocaleString('pt-BR')}</p>
                <div>
                    {feedback && <span className="text-sm text-success mr-4">{feedback}</span>}
                    <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <span className="loading loading-spinner"></span> : 'Salvar Conhecimento'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ApiConfigFormModal: React.FC<{
    config: Partial<ApiConfig>;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}> = ({ config, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<ApiConfig>>({});

    useEffect(() => {
        setFormData(config || {});
    }, [config]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.id) {
            await supportService.saveApiConfig(formData.id, formData);
        }
        onSave();
    };

    if (!isOpen) return null;

    return (
        <dialog open className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Editar Configuração da API {formData.name}</h3>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                     <label className="input input-bordered flex items-center gap-2">
                        URL Base da API
                        <input type="text" name="url" value={formData.url || ''} onChange={handleChange} className="grow" placeholder="https://api.cubbo.com/v1" />
                    </label>
                    <label className="input input-bordered flex items-center gap-2">
                        Store ID (ID da Loja)
                        <input 
                            type="text" 
                            name="storeId" 
                            value={formData.storeId || ''} 
                            onChange={handleChange} 
                            className="grow" 
                            placeholder="ID da loja na Cubbo (obrigatório)" 
                        />
                    </label>
                    <p className="text-xs text-gray-500">
                        O Store ID é obrigatório para buscar pedidos na API da Cubbo. 
                        Você pode encontrar este ID no painel da Cubbo ou na documentação da API.
                    </p>
                    {/* Client ID and Secret fields are removed as they are now managed securely in the Google Cloud Run service environment. */}
                    <div className="modal-action">
                        <button type="button" className="btn" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </dialog>
    );
};


const ApiConfigManager: React.FC = () => {
    const [configs, setConfigs] = useState<ApiConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedConfig, setSelectedConfig] = useState<Partial<ApiConfig> | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message?: string }>({ status: 'idle' });

    const loadApis = useCallback(async () => {
        setIsLoading(true);
        const data = await supportService.getApiConfigs();
        setConfigs(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadApis();
    }, [loadApis]);
    
    const handleTestConnection = async (apiConfig: ApiConfig) => {
        setTestResult({ status: 'testing' });
        const result = await supportService.testApiConnection();
        const newStatus = result.success ? 'connected' : 'error';
        
        await supportService.saveApiConfig(apiConfig.id, { status: newStatus });
        
        if (result.success) {
            setTestResult({ status: 'success', message: 'Conexão bem-sucedida!' });
        } else {
            setTestResult({ status: 'error', message: result.error || 'Erro desconhecido.' });
        }
        
        loadApis();
        setTimeout(() => setTestResult({ status: 'idle' }), 15000);
    };

    const handleOpenModal = (config: ApiConfig | Partial<ApiConfig>) => {
        setSelectedConfig(config);
        setIsModalOpen(true);
    };
    
    const cubboConfig = configs.find(c => c.id === 'cubbo');

    const renderContent = () => {
        if (isLoading) {
            return <div className="text-center text-gray-500 py-4">Carregando configurações de API...</div>;
        }

        if (!cubboConfig) {
            return (
                <div className="text-center py-4">
                    <p className="text-gray-500 mb-4">A integração com a Cubbo não está configurada.</p>
                    <button 
                        className="btn btn-primary"
                        onClick={() => handleOpenModal({
                            id: 'cubbo',
                            name: 'Cubbo',
                            description: 'API para gerenciamento de pedidos.',
                            url: 'https://api.cubbo.com/v1',
                            clientId: '',
                            clientSecret: '',
                            status: 'unknown'
                        })}
                    >
                        Configurar Integração
                    </button>
                </div>
            );
        }
        
        return (
             <div className="p-4 border rounded-md">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-bold text-gray-800 flex items-center gap-2">
                            {cubboConfig.name}
                            {cubboConfig.status === 'connected' && <span className="badge badge-success">Conectado</span>}
                            {cubboConfig.status === 'error' && <span className="badge badge-error">Erro</span>}
                            {cubboConfig.status === 'unknown' && <span className="badge">Não testado</span>}
                        </p>
                        <p className="text-sm text-gray-600">{cubboConfig.description}</p>
                    </div>
                    <div className="flex gap-2">
                         <button className="btn btn-sm btn-outline" onClick={() => handleTestConnection(cubboConfig)} disabled={testResult.status === 'testing'}>
                             {testResult.status === 'testing' ? <span className="loading loading-spinner loading-xs"></span> : 'Testar'}
                         </button>
                         <button className="btn btn-sm btn-square" onClick={() => handleOpenModal(cubboConfig)}><EditIcon className="w-4 h-4"/></button>
                    </div>
                </div>
                {testResult.status === 'success' && <div className="text-xs text-success mt-2 p-2 bg-success/10 rounded">{testResult.message}</div>}
                {testResult.status === 'error' && (
                    <div className="alert alert-error mt-2 text-xs">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div className="flex flex-col">
                                <span className="font-bold">Falha na Conexão</span>
                                <p>O serviço de proxy retornou um erro: "{testResult.message}"</p>
                                <p className="mt-2 font-semibold">Ação Recomendada:</p>
                                <ol className="list-decimal list-inside text-left">
                                    <li>Acesse o <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="link">Google Cloud Console</a>.</li>
                                    <li>Navegue até o serviço **Cloud Run** e selecione **cubbo-auth-proxy**.</li>
                                    <li>Clique em **"Editar e implantar nova revisão"**.</li>
                                    <li>Vá até a aba **"Variáveis e Secrets"** e verifique se as variáveis de ambiente <code>CUBBO_CLIENT_ID</code> e <code>CUBBO_CLIENT_SECRET</code> estão corretas.</li>
                                </ol>
                                <p className="mt-1 opacity-80">As credenciais salvas neste painel (Client ID/Secret) não são mais utilizadas para a autenticação.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-md mt-8">
                <h3 className="text-xl font-semibold">Configurações de APIs</h3>
                 <p className="text-sm text-gray-500 mb-4">
                    Gerencie a integração com a API da Cubbo. A autenticação é gerenciada de forma segura por um serviço de proxy.
                </p>
                {renderContent()}
            </div>
             <ApiConfigFormModal
                config={selectedConfig || {}}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={() => {
                    setIsModalOpen(false);
                    loadApis();
                }}
            />
        </>
    )
};


export const AdminTraining: React.FC = () => {
    return (
        <div className="animate-fade-in space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">Configurações e Treinamento</h2>
            <KnowledgeBaseEditor />
            <ApiConfigManager />
        </div>
    );
};