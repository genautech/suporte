// Fix: Implement the TicketDetailModal component.
import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, CubboOrder } from '../types';
import { supportService } from '../services/supportService';
import { knowledgeBaseService } from '../services/knowledgeBaseService';
import { UserIcon, BotIcon } from './Icons';
import { OrderDetailModal } from './OrderDetailModal';

interface TicketDetailModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
  userType: 'admin' | 'user';
  onUpdate: () => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, isOpen, onClose, userType, onUpdate }) => {
    const [reply, setReply] = useState('');
    const [newStatus, setNewStatus] = useState<TicketStatus>(ticket.status);
    const [isUpdating, setIsUpdating] = useState(false);
    const [relatedOrder, setRelatedOrder] = useState<CubboOrder | null>(null);
    const [isLoadingOrder, setIsLoadingOrder] = useState(false);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

    useEffect(() => {
        // Reset state if ticket changes
        setNewStatus(ticket.status);
        setReply('');
        
        // Buscar pedido relacionado se orderNumber existe
        if (ticket.orderNumber && !relatedOrder) {
            setIsLoadingOrder(true);
            supportService.getOrderDetails(ticket.orderNumber)
                .then(order => {
                    if (order) {
                        setRelatedOrder(order);
                    }
                })
                .catch(error => {
                    console.error('[TicketDetailModal] Erro ao buscar pedido:', error);
                })
                .finally(() => {
                    setIsLoadingOrder(false);
                });
        } else if (!ticket.orderNumber) {
            setRelatedOrder(null);
        }
    }, [ticket, relatedOrder]);

    const handleArchiveToggle = async () => {
        setIsUpdating(true);
        try {
            if (ticket.status === 'arquivado') {
                await supportService.unarchiveTicket(ticket.id);
            } else {
                await supportService.archiveTicket(ticket.id);
            }
            onUpdate();
        } catch (error) {
            console.error('Erro ao arquivar/reativar ticket:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reply.trim() && newStatus === ticket.status) return; // Do nothing if there's no change

        setIsUpdating(true);
        try {
            if (reply.trim()) {
                // 1. Send email via Postmark proxy
                const emailHtmlBody = `
                    <div style="font-family: sans-serif; line-height: 1.6;">
                        <h2>Olá ${ticket.name},</h2>
                        <p>Temos uma nova resposta para o seu chamado de suporte <strong>#${ticket.id.substring(0, 6)}</strong> sobre "${ticket.subject}".</p>
                        <div style="background-color: #f4f4f4; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0;">
                            <p><strong>Nossa equipe respondeu:</strong></p>
                            <p><em>${reply.replace(/\n/g, '<br>')}</em></p>
                        </div>
                        <p>Você pode ver o histórico completo em nosso portal de suporte.</p>
                        <p>Atenciosamente,<br>Equipe Lojinha Prio by Yoobe</p>
                    </div>`;

                await supportService.sendTicketReplyEmail({
                    to: ticket.email,
                    subject: `Re: Seu chamado de suporte #${ticket.id.substring(0,6)}`,
                    htmlBody: emailHtmlBody
                });

                // 2. Add reply to ticket history in Firestore
                const historyMessage = `${reply}\n\n(Notificação por e-mail enviada para o cliente.)`;
                await supportService.addTicketReply(ticket.id, { content: historyMessage, author: 'admin' });
            }

            if (newStatus !== ticket.status) {
                await supportService.updateTicketStatus(ticket.id, newStatus);
                
                // Se o ticket foi marcado como resolvido, sugerir criar entrada na base de conhecimento
                if (newStatus === 'resolvido' && ticket.status !== 'resolvido') {
                    try {
                        // Criar sugestão de conhecimento a partir do ticket resolvido
                        await knowledgeBaseService.suggestFromTicket(ticket.id);
                        // Nota: A entrada será criada como não verificada, precisando de aprovação do admin
                    } catch (error) {
                        console.error('[TicketDetailModal] Erro ao criar sugestão de conhecimento:', error);
                        // Não bloquear a atualização do ticket se falhar
                    }
                }
            }
            
            onUpdate(); // Refreshes the list and closes the modal
        } catch (error) {
            console.error("Failed to update ticket", error);
            // Optionally, show an error message to the admin
        } finally {
            setIsUpdating(false);
        }
    };
    
    if (!isOpen) return null;

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

    return (
        <dialog id="detail_modal" className={`modal ${isOpen ? 'modal-open' : ''}`} style={{ zIndex: 50 }}>
            <div className="modal-box w-11/12 max-w-3xl" style={{ zIndex: 51 }}>
                <form method="dialog">
                    <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>✕</button>
                </form>
                <h3 className="font-bold text-lg mb-1">Chamado #{ticket.id.substring(0, 6)}</h3>
                <p className="text-md mb-4">{ticket.subject}</p>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-4">
                    <p><strong>Cliente:</strong> {ticket.name}</p>
                    <p><strong>Email:</strong> {ticket.email}</p>
                    <p><strong>Status:</strong> <span className={`badge ${getStatusColor(ticket.status)}`}>{ticket.status.replace('_', ' ')}</span></p>
                    <p><strong>Prioridade:</strong> <span className={`badge`}>{ticket.priority}</span></p>
                </div>

                {/* Pedido Relacionado */}
                {ticket.orderNumber && (
                    <div className="mb-4 p-4 bg-base-200 rounded-lg">
                        <h4 className="font-semibold mb-2 text-sm">Pedido Relacionado</h4>
                        {isLoadingOrder ? (
                            <div className="flex items-center gap-2">
                                <span className="loading loading-spinner loading-sm"></span>
                                <span className="text-sm">Carregando informações do pedido...</span>
                            </div>
                        ) : relatedOrder ? (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-semibold">Pedido {relatedOrder.order_number}</p>
                                        <p className="text-xs text-gray-600">Status: {relatedOrder.status}</p>
                                        {relatedOrder.total_amount !== undefined && (
                                            <p className="text-xs text-gray-600">
                                                Valor: {relatedOrder.currency === 'BRL' ? 'R$' : relatedOrder.currency || 'R$'} {relatedOrder.total_amount.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setIsOrderModalOpen(true)}
                                        className="btn btn-sm btn-primary"
                                    >
                                        Ver Detalhes
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">Pedido {ticket.orderNumber} não encontrado ou indisponível.</p>
                        )}
                    </div>
                )}

                {/* History/Conversation */}
                <div className="bg-base-200 p-3 rounded-lg max-h-64 overflow-y-auto mb-4">
                     <p className="font-semibold mb-2 text-sm">Descrição Original:</p>
                     <p className="text-sm mb-4 p-3 bg-base-100 rounded-md whitespace-pre-wrap">{ticket.description}</p>
                    <hr className="my-2 border-base-300"/>
                    <p className="font-semibold mb-2 text-sm">Histórico de Interações:</p>
                    <div className="space-y-4">
                        {(ticket.history || []).map((item, index) => (
                            <div key={index} className={`chat ${item.author === 'admin' ? 'chat-start' : 'chat-end'}`}>
                                <div className="chat-image avatar">
                                    <div className="w-8 rounded-full bg-primary text-primary-content flex items-center justify-center">
                                       {item.author === 'admin' ? <BotIcon className="w-5 h-5"/> : <UserIcon className="w-5 h-5"/>}
                                    </div>
                                </div>
                                <div className="chat-header text-xs opacity-50 mb-1">
                                    {item.author === 'admin' ? 'Suporte' : 'Sistema'}
                                    <time className="text-xs opacity-50"> • {item.timestamp ? new Date(item.timestamp).toLocaleString('pt-BR') : 'agora'}</time>
                                </div>
                                <div className={`chat-bubble text-sm ${item.type === 'comment' ? 'chat-bubble-primary' : 'chat-bubble-accent'}`}>
                                    <p className="whitespace-pre-wrap">{item.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Admin Reply Form */}
                {userType === 'admin' && (
                    <form onSubmit={handleReplySubmit}>
                        <h4 className="font-bold mb-2">Responder ao Cliente</h4>
                        <textarea
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            className="textarea textarea-bordered w-full"
                            rows={4}
                            placeholder="Digite sua resposta aqui..."
                        ></textarea>
                        <div className="flex justify-between items-center mt-2">
                            <div className="flex gap-2">
                                <label className="form-control w-full max-w-xs">
                                    <div className="label"><span className="label-text">Mudar Status</span></div>
                                    <select 
                                        className="select select-bordered"
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value as TicketStatus)}
                                    >
                                        <option value="aberto">Aberto</option>
                                        <option value="em_andamento">Em Andamento</option>
                                        <option value="resolvido">Resolvido</option>
                                        <option value="fechado">Fechado</option>
                                        <option value="arquivado">Arquivado</option>
                                    </select>
                                </label>
                                <button 
                                    type="button"
                                    onClick={handleArchiveToggle}
                                    className="btn btn-secondary mt-8"
                                    disabled={isUpdating}
                                >
                                    {ticket.status === 'arquivado' ? 'Reativar' : 'Arquivar'}
                                </button>
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={isUpdating}>
                                {isUpdating ? <span className="loading loading-spinner"></span> : 'Enviar Resposta'}
                            </button>
                        </div>
                    </form>
                )}

                {userType === 'user' && (
                    <div className="modal-action">
                        <button className="btn" onClick={onClose}>Fechar</button>
                    </div>
                )}
            </div>
             <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
            
            {/* Modal de Detalhes do Pedido */}
            {relatedOrder && (
                <OrderDetailModal
                    order={relatedOrder}
                    isOpen={isOrderModalOpen}
                    onClose={() => setIsOrderModalOpen(false)}
                />
            )}
        </dialog>
    );
};