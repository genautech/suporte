// Fix: Implement the TicketDetailModal component.
import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus } from '../types';
import { supportService } from '../services/supportService';
import { UserIcon, BotIcon } from './Icons';

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

    useEffect(() => {
        // Reset state if ticket changes
        setNewStatus(ticket.status);
        setReply('');
    }, [ticket]);

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
            default: return '';
        }
    };

    return (
        <dialog id="detail_modal" className={`modal ${isOpen ? 'modal-open' : ''}`}>
            <div className="modal-box w-11/12 max-w-3xl">
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
                                </select>
                            </label>
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
        </dialog>
    );
};