// ManagerDashboard component for company managers
import React, { useState, useEffect, useCallback } from 'react';
import { Ticket } from '../types';
import { supportService } from '../services/supportService';
import { companyService } from '../services/companyService';
import { AdminFAQ } from './AdminFAQ';
import { AdminKnowledgeBase } from './AdminKnowledgeBase';
import { LogoutIcon } from './Icons';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { motion } from 'framer-motion';

type ManagerView = 'tickets' | 'faq' | 'knowledge';

interface ManagerDashboardProps {
    companyId: string;
    onLogout: () => void;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ companyId, onLogout }) => {
    const [view, setView] = useState<ManagerView>('tickets');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [companyName, setCompanyName] = useState<string>('');
    
    useEffect(() => {
        // Carregar nome da empresa
        companyService.getCompanyName(companyId).then((name) => {
            setCompanyName(name);
        });
    }, [companyId]);
    
    const loadTickets = useCallback(async () => {
        setIsLoading(true);
        try {
            // Buscar todos os tickets e filtrar por companyId
            const allTickets = await supportService.getTickets(false);
            const companyTickets = allTickets.filter(t => t.companyId === companyId);
            setTickets(companyTickets);
        } catch (error) {
            console.error('Erro ao carregar tickets:', error);
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        if (view === 'tickets') {
            loadTickets();
        }
    }, [view, loadTickets]);

    const renderView = () => {
        switch (view) {
            case 'tickets':
                return (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">Chamados de Suporte</h1>
                                <p className="text-sm text-gray-600">Chamados da empresa {companyName}</p>
                            </div>
                        </div>

                        {isLoading ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <span className="loading loading-spinner loading-lg text-primary"></span>
                                    <p className="mt-4 text-muted-foreground font-medium">Carregando chamados...</p>
                                </CardContent>
                            </Card>
                        ) : tickets.length === 0 ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <p className="text-muted-foreground">Nenhum chamado encontrado para esta empresa.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="overflow-x-auto">
                                <table className="table-standard">
                                    <thead>
                                        <tr>
                                            <th>Cliente</th>
                                            <th>Assunto</th>
                                            <th>Status</th>
                                            <th>Prioridade</th>
                                            <th>Data</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tickets.map(ticket => (
                                            <tr key={ticket.id}>
                                                <td className="font-medium">
                                                    {ticket.name || 'N/A'}
                                                    <br/>
                                                    <span className="text-xs text-gray-500">{ticket.email}</span>
                                                </td>
                                                <td className="font-semibold">{ticket.subject}</td>
                                                <td>
                                                    <Badge variant="secondary">
                                                        {ticket.status.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Badge 
                                                        variant={
                                                            ticket.priority === 'alta' ? 'destructive' :
                                                            ticket.priority === 'media' ? 'warning' :
                                                            'secondary'
                                                        }
                                                    >
                                                        {ticket.priority}
                                                    </Badge>
                                                </td>
                                                <td className="text-sm text-gray-600">
                                                    {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        )}
                    </div>
                );
            case 'faq':
                return <AdminFAQ companyId={companyId} />;
            case 'knowledge':
                return <AdminKnowledgeBase companyId={companyId} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Sidebar */}
            <motion.aside 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-64 bg-background/80 backdrop-blur-md border-r border-border min-h-screen flex flex-col shadow-lg"
            >
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center mb-1">
                        <span className="text-2xl mr-2">🏢</span>
                        {companyName}
                    </h2>
                    <p className="text-xs text-muted-foreground">Painel do Gestor</p>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    <motion.a 
                        onClick={() => setView('tickets')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'tickets' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>🎫</span>
                        Chamados
                    </motion.a>
                    <motion.a 
                        onClick={() => setView('faq')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'faq' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>❓</span>
                        FAQ
                    </motion.a>
                    <motion.a 
                        onClick={() => setView('knowledge')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'knowledge' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>📚</span>
                        Base de Conhecimento
                    </motion.a>
                </nav>
                <div className="p-4 border-t border-border">
                    <Button
                        onClick={onLogout}
                        variant="outline"
                        className="w-full"
                    >
                        <LogoutIcon className="w-4 h-4 mr-2" />
                        Sair
                    </Button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                {renderView()}
            </main>
        </div>
    );
};

export default ManagerDashboard;

