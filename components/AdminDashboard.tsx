// Fix: Implement the AdminDashboard component.
import React, { useState, useEffect, useCallback } from 'react';
import { Ticket } from '../types';
import { supportService } from '../services/supportService';
import { TicketForm } from './TicketForm';
import { TicketDetailModal } from './TicketDetailModal';
import { AdminTraining } from './AdminTraining';
import { AdminOrders } from './AdminOrders';
import { AdminFAQ } from './AdminFAQ';
import { AdminKnowledgeBase } from './AdminKnowledgeBase';
import { AdminCompanies } from './AdminCompanies';
import { BrainIcon, LogoutIcon, MessageIcon } from './Icons'; // MessageIcon added
import { SystemStatus } from './SystemStatus';
import { Chatbot } from './Chatbot'; // New import for testing
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { motion } from 'framer-motion';

type AdminView = 'tickets' | 'training' | 'status' | 'chatbot' | 'orders' | 'faq' | 'knowledge' | 'arquivados' | 'companies';

interface AdminDashboardProps {
    onLogout: () => void;
    onSwitchToClient?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onSwitchToClient }) => {
    const [view, setView] = useState<AdminView>('tickets');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    
    const loadTickets = useCallback(async () => {
        setIsLoading(true);
        const fetchedTickets = await supportService.getTickets(view === 'arquivados' || showArchived);
        setTickets(fetchedTickets);
        setIsLoading(false);
    }, [view, showArchived]);

    useEffect(() => {
        if (view === 'tickets' || view === 'arquivados') {
            loadTickets();
        }
    }, [view, loadTickets]);
    
    const handleEditTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setIsFormModalOpen(true);
    };

    const handleCreateTicket = () => {
        setSelectedTicket(null);
        setIsFormModalOpen(true);
    };
    
    const handleViewTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setIsDetailModalOpen(true);
    };

    const handleFormSubmit = () => {
        setIsFormModalOpen(false);
        setSelectedTicket(null);
        loadTickets();
    };

    const handleModalUpdate = () => {
        setIsDetailModalOpen(false);
        setSelectedTicket(null);
        loadTickets();
    };

    const handleArchiveToggle = async (ticket: Ticket) => {
        try {
            if (ticket.status === 'arquivado') {
                await supportService.unarchiveTicket(ticket.id);
            } else {
                await supportService.archiveTicket(ticket.id);
            }
            loadTickets();
        } catch (error) {
            console.error('Erro ao arquivar/reativar ticket:', error);
        }
    };

    const getStatusColor = (status: Ticket['status']) => {
        switch (status) {
            case 'aberto': return 'badge-info';
            case 'em_andamento': return 'badge-warning';
            case 'resolvido': return 'badge-success';
            case 'fechado': return 'badge-ghost';
            case 'arquivado': return 'badge-secondary';
            default: return '';
        }
    };
    
     const getPriorityColor = (priority: Ticket['priority']) => {
        switch (priority) {
            case 'baixa': return 'badge-accent';
            case 'media': return 'badge-warning';
            case 'alta': return 'badge-error';
            default: return '';
        }
    };

    const renderMainContent = () => {
        switch(view) {
            case 'tickets':
                // Filtrar tickets baseado no toggle
                const displayedTickets = showArchived 
                    ? tickets 
                    : tickets.filter(t => t.status !== 'arquivado');
                
                return (
                     <div>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">Chamados de Suporte</h1>
                                <p className="text-sm text-gray-600">Gerencie todos os chamados de suporte dos clientes</p>
                            </div>
                            <div className="flex gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="checkbox checkbox-sm" 
                                        checked={showArchived}
                                        onChange={(e) => setShowArchived(e.target.checked)}
                                    />
                                    <span className="text-sm">Mostrar arquivados</span>
                                </label>
                                <Button onClick={handleCreateTicket}>
                                    ➕ Criar Chamado
                                </Button>
                            </div>
                        </div>

                        {isLoading ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <span className="loading loading-spinner loading-lg text-primary"></span>
                                    <p className="mt-4 text-muted-foreground font-medium">Carregando chamados...</p>
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
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedTickets.map(ticket => (
                                            <tr key={ticket.id}>
                                                <td className="font-medium">
                                                    {ticket.name || ticket.customerName || 'N/A'}
                                                    <br/>
                                                    <span className="text-xs text-gray-500">{ticket.email || ticket.customerEmail}</span>
                                                </td>
                                                <td className="font-semibold">{ticket.subject}</td>
                                                <td>
                                                    <Badge 
                                                        variant={
                                                            ticket.status === 'aberto' ? 'info' :
                                                            ticket.status === 'em_andamento' ? 'warning' :
                                                            ticket.status === 'resolvido' ? 'success' :
                                                            ticket.status === 'arquivado' ? 'secondary' :
                                                            'outline'
                                                        }
                                                    >
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
                                                <td>
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            onClick={() => handleViewTicket(ticket)} 
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            Ver
                                                        </Button>
                                                        <Button 
                                                            onClick={() => handleEditTicket(ticket)} 
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            Editar
                                                        </Button>
                                                        <Button 
                                                            onClick={() => handleArchiveToggle(ticket)} 
                                                            size="sm"
                                                            variant={ticket.status === 'arquivado' ? 'default' : 'outline'}
                                                        >
                                                            {ticket.status === 'arquivado' ? 'Reativar' : 'Arquivar'}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        )}
                    </div>
                );
            case 'arquivados':
                const archivedTickets = tickets.filter(t => t.status === 'arquivado');
                return (
                     <div>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">Chamados Arquivados</h1>
                                <p className="text-sm text-gray-600">Visualize e gerencie chamados arquivados</p>
                            </div>
                        </div>

                        {isLoading ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <span className="loading loading-spinner loading-lg text-primary"></span>
                                    <p className="mt-4 text-muted-foreground font-medium">Carregando chamados arquivados...</p>
                                </CardContent>
                            </Card>
                        ) : archivedTickets.length === 0 ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <p className="text-muted-foreground">Nenhum chamado arquivado encontrado.</p>
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
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {archivedTickets.map(ticket => (
                                            <tr key={ticket.id}>
                                                <td className="font-medium">
                                                    {ticket.name || ticket.customerName || 'N/A'}
                                                    <br/>
                                                    <span className="text-xs text-gray-500">{ticket.email || ticket.customerEmail}</span>
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
                                                <td>
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            onClick={() => handleViewTicket(ticket)} 
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            Ver
                                                        </Button>
                                                        <Button 
                                                            onClick={() => handleArchiveToggle(ticket)} 
                                                            size="sm"
                                                            variant="default"
                                                        >
                                                            Reativar
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        )}
                    </div>
                );
            case 'training':
                return <AdminTraining />;
            case 'status':
                return <SystemStatus />;
            case 'orders':
                return <AdminOrders />;
            case 'faq':
                return <AdminFAQ />;
            case 'knowledge':
                return <AdminKnowledgeBase />;
            case 'companies':
                return <AdminCompanies />;
            case 'chatbot': // New view for chatbot testing
                return (
                     <div className="animate-fade-in h-full flex flex-col items-center justify-center">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Teste do Chatbot</h2>
                        <p className="text-gray-600 mb-6 max-w-lg text-center">Interaja com o chatbot abaixo como se fosse um cliente. A janela do chat não será exibida aqui, apenas o botão para abri-la.</p>
                        <div className="alert alert-info max-w-md">
                          <div>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>Clique no ícone de chat no canto inferior direito para começar.</span>
                          </div>
                        </div>
                     </div>
                );
            default:
                return null;
        }
    }

    return (
         <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Sidebar Modernizada */}
            <motion.aside 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-64 bg-background/80 backdrop-blur-md border-r border-border min-h-screen flex flex-col shadow-lg"
            >
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center mb-1">
                        <span className="text-2xl mr-2">⚡</span>
                        Admin Prio
                    </h2>
                    <p className="text-xs text-muted-foreground">Painel Administrativo</p>
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
                        <MessageIcon className="w-4 h-4" />
                        Chamados de Suporte
                    </motion.a>
                    <motion.a 
                        onClick={() => setView('orders')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'orders' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>📦</span>
                        Pedidos Cubbo
                    </motion.a>
                    <motion.a 
                        onClick={() => setView('training')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'training' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <BrainIcon className="w-4 h-4" />
                        Configurações
                    </motion.a>
                    <motion.a 
                        onClick={() => setView('status')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'status' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>✓</span>
                        Status do Sistema
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
                        <BrainIcon className="w-4 h-4" />
                        Base de Conhecimento
                    </motion.a>
                    <motion.a 
                        onClick={() => setView('companies')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'companies' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>🏢</span>
                        Empresas
                    </motion.a>
                    <motion.a 
                        onClick={() => setView('arquivados')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'arquivados' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>📁</span>
                        Arquivados
                    </motion.a>
                    <motion.a 
                        onClick={() => setView('chatbot')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'chatbot' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>💬</span>
                        Chatbot
                    </motion.a>
                </nav>
                <div className="p-4 border-t border-border space-y-2">
                    {onSwitchToClient && (
                        <Button 
                            onClick={onSwitchToClient} 
                            variant="outline"
                            className="w-full"
                        >
                            <span className="mr-2">👤</span>
                            Ver como Cliente
                        </Button>
                    )}
                    <Button 
                        onClick={onLogout} 
                        variant="destructive"
                        className="w-full"
                    >
                        <LogoutIcon className="w-4 h-4 mr-2" /> 
                        Sair
                    </Button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={view}
                    transition={{ duration: 0.3 }}
                >
                    {renderMainContent()}
                </motion.div>
            </main>
            
            {/* The chatbot is rendered here but only shown if the view is 'chatbot' to allow testing */}
            {view === 'chatbot' && (
                <Chatbot 
                    user={{ name: 'Admin', email: 'admin@yoobe.co', phone: '' }} 
                />
            )}

            {/* Modals */}
            {isFormModalOpen && (
                <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{selectedTicket ? 'Editar Chamado' : 'Criar Novo Chamado'}</DialogTitle>
                            <DialogDescription>
                                {selectedTicket ? 'Edite as informações do chamado abaixo.' : 'Preencha os dados para criar um novo chamado de suporte.'}
                            </DialogDescription>
                        </DialogHeader>
                        <TicketForm ticket={selectedTicket} onSubmit={handleFormSubmit} />
                    </DialogContent>
                </Dialog>
            )}
            
            {selectedTicket && isDetailModalOpen && (
                <TicketDetailModal 
                    ticket={selectedTicket} 
                    isOpen={isDetailModalOpen} 
                    onClose={() => setIsDetailModalOpen(false)} 
                    userType="admin"
                    onUpdate={handleModalUpdate}
                />
            )}
        </div>
    );
};

export default AdminDashboard;