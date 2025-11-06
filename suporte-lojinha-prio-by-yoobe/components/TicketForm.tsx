import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, TicketPriority } from '../types';
import { supportService } from '../services/supportService';

interface TicketFormProps {
  ticket: Ticket | null;
  onSubmit: () => void;
}

const emptyTicket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'history'> = {
    subject: '',
    description: '',
    priority: 'media',
    status: 'aberto',
    name: '',
    email: '',
    phone: '',
    orderId: ''
};

export const TicketForm: React.FC<TicketFormProps> = ({ ticket, onSubmit }) => {
  const [formData, setFormData] = useState(emptyTicket);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = ticket !== null;

  useEffect(() => {
    if (isEditing) {
      const { id, createdAt, updatedAt, history, ...editableData } = ticket;
      setFormData(editableData);
    } else {
      setFormData(emptyTicket);
    }
  }, [ticket, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value as any }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        if (isEditing) {
            await supportService.updateTicket(ticket.id, formData);
        } else {
            await supportService.createTicket(formData);
        }
        onSubmit();
    } catch (error) {
        console.error("Failed to save ticket", error);
        // Add user-facing error message here
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div>
        <h3 className="text-lg font-bold mb-4">{isEditing ? 'Editar Chamado' : 'Criar Novo Chamado'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <label className="form-control w-full">
                    <div className="label"><span className="label-text">Nome do Cliente</span></div>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="input input-bordered w-full" />
                </label>
                 <label className="form-control w-full">
                    <div className="label"><span className="label-text">Email</span></div>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required className="input input-bordered w-full" />
                </label>
                 <label className="form-control w-full">
                    <div className="label"><span className="label-text">Telefone</span></div>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="input input-bordered w-full" />
                </label>
                 <label className="form-control w-full">
                    <div className="label"><span className="label-text">ID Pedido (Opcional)</span></div>
                    <input type="text" name="orderId" value={formData.orderId} onChange={handleChange} className="input input-bordered w-full" />
                </label>
            </div>

            <label className="form-control w-full">
                <div className="label"><span className="label-text">Assunto</span></div>
                <input type="text" name="subject" value={formData.subject} onChange={handleChange} required className="input input-bordered w-full" />
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="form-control w-full">
                    <div className="label"><span className="label-text">Prioridade</span></div>
                    <select name="priority" value={formData.priority} onChange={handleChange} className="select select-bordered w-full">
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                    </select>
                </label>
                <label className="form-control w-full">
                    <div className="label"><span className="label-text">Status</span></div>
                    <select name="status" value={formData.status} onChange={handleChange} className="select select-bordered w-full">
                        <option value="aberto">Aberto</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="resolvido">Resolvido</option>
                        <option value="fechado">Fechado</option>
                    </select>
                </label>
            </div>
            
            <label className="form-control w-full">
                <div className="label"><span className="label-text">Descrição</span></div>
                <textarea name="description" value={formData.description} onChange={handleChange} required rows={5} className="textarea textarea-bordered w-full"></textarea>
            </label>
            
            <div className="modal-action">
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading && <span className="loading loading-spinner"></span>}
                    {isEditing ? 'Salvar Alterações' : 'Criar Chamado'}
                </button>
            </div>
        </form>
    </div>
  );
};