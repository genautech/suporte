// Fix: Implement the AdminDashboard component.
import React, { useState, useEffect, useCallback } from 'react';
import { Ticket } from '../types';
import { supportService } from '../services/supportService';
import { TicketForm } from './TicketForm';
import { TicketDetailModal } from './TicketDetailModal';
import { AdminTraining } from './AdminTraining';
import { BrainIcon, LogoutIcon, MessageIcon } from './Icons'; // MessageIcon added
import { SystemStatus } from './SystemStatus';
import { Chatbot } from './Chatbot'; // New import for testing

type AdminView = 'tickets' | 'training' | 'status' | 'chatbot'; // Added 'chatbot' view

const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [view, setView] = useState<AdminView>('tickets');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    
    const loadTickets = useCallback(async () => {
        setIsLoading(true);
        const fetchedTickets = await supportService.getTickets();
        setTickets(fetchedTickets);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (view === 'tickets') {
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

    const getStatusColor = (status: Ticket['status']) => {
        switch (status) {
            case 'aberto': return 'badge-info';
            case 'em_andamento': return 'badge-warning';
            case 'resolvido': return 'badge-success';
            case 'fechado': return 'badge-ghost';
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
                return (
                     <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-3xl font-bold text-gray-800">Chamados de Suporte</h1>
                            <button onClick={handleCreateTicket} className="btn btn-primary">Criar Chamado</button>
                        </div>

                        {isLoading ? (
                            <div className="text-center p-8">Carregando chamados...</div>
                        ) : (
                            <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
                                <table className="table w-full">
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
                                        {tickets.map(ticket => (
                                            <tr key={ticket.id} className="hover">
                                                <td>{ticket.name}<br/><span className="text-xs text-gray-500">{ticket.email}</span></td>
                                                <td>{ticket.subject}</td>
                                                <td><span className={`badge ${getStatusColor(ticket.status)}`}>{ticket.status.replace('_', ' ')}</span></td>
                                                <td><span className={`badge ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span></td>
                                                <td>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</td>
                                                <td className="flex gap-2">
                                                    <button onClick={() => handleViewTicket(ticket)} className="btn btn-xs btn-outline">Ver</button>
                                                    <button onClick={() => handleEditTicket(ticket)} className="btn btn-xs btn-outline btn-info">Editar</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            case 'training':
                return <AdminTraining />;
            case 'status':
                return <SystemStatus />;
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
         <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-gray-800 text-white flex flex-col">
                <div className="p-4 text-xl font-bold border-b border-gray-700">Admin Prio</div>
                <nav className="flex-1 p-2">
                    <a onClick={() => setView('tickets')} className={`block p-3 rounded-lg cursor-pointer hover:bg-gray-700 ${view === 'tickets' ? 'bg-primary' : ''}`}>
                        Chamados de Suporte
                    </a>
                    <a onClick={() => setView('training')} className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-gray-700 ${view === 'training' ? 'bg-primary' : ''}`}>
                       <BrainIcon className="w-5 h-5"/> Configurações
                    </a>
                    <a onClick={() => setView('status')} className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-gray-700 ${view === 'status' ? 'bg-primary' : ''}`}>
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Status do Sistema
                    </a>
                    <a onClick={() => setView('chatbot')} className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-gray-700 ${view === 'chatbot' ? 'bg-primary' : ''}`}>
                       <MessageIcon className="w-5 h-5"/> Chatbot
                    </a>
                </nav>
                <div className="p-2 border-t border-gray-700">
                    <button onClick={onLogout} className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-red-500/80">
                        <LogoutIcon className="w-5 h-5"/> Sair
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
               {renderMainContent()}
            </main>
            
            {/* The chatbot is rendered here but only shown if the view is 'chatbot' to allow testing */}
            {view === 'chatbot' && (
                <Chatbot 
                    user={{ name: 'Admin', email: 'admin@yoobe.co', phone: '' }} 
                />
            )}

            {/* Modals */}
             <dialog id="form_modal" className={`modal ${isFormModalOpen ? 'modal-open' : ''}`}>
                <div className="modal-box w-11/12 max-w-2xl">
                    <form method="dialog">
                        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setIsFormModalOpen(false)}>✕</button>
                    </form>
                    <TicketForm ticket={selectedTicket} onSubmit={handleFormSubmit} />
                </div>
            </dialog>
            
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