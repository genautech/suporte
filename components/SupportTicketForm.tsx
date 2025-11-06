// Fix: Implement the SupportTicketForm component.
import React, { useState } from 'react';
import { supportService } from '../services/supportService';

interface SupportTicketFormProps {
  initialData?: { name: string; email: string, phone?: string, orderId?: string, orderNumber?: string };
  onSubmit: (ticketId: string) => void;
  onClose: () => void;
}

export const SupportTicketForm: React.FC<SupportTicketFormProps> = ({ initialData = { name: '', email: '', phone: '', orderId: '', orderNumber: '' }, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    name: initialData.name,
    email: initialData.email,
    phone: initialData.phone || '',
    orderId: initialData.orderId || '',
    orderNumber: initialData.orderNumber || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderPreview, setOrderPreview] = useState<any>(null);

  // Buscar preview do pedido quando orderNumber for fornecido
  React.useEffect(() => {
    if (initialData.orderNumber && !orderPreview) {
      supportService.getOrderDetails(initialData.orderNumber).then(order => {
        if (order) {
          setOrderPreview(order);
          setFormData(prev => ({ ...prev, orderNumber: initialData.orderNumber || '' }));
        }
      }).catch(() => {
        // Silenciosamente falha se não encontrar pedido
      });
    }
  }, [initialData.orderNumber, orderPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.subject || !formData.description || !formData.name || !formData.email) {
        setError("Por favor, preencha todos os campos obrigatórios.");
        return;
    }
    setIsLoading(true);
    try {
      const ticketId = await supportService.createTicket({
          ...formData,
          orderNumber: formData.orderNumber || undefined,
          priority: 'media', // Default priority
          status: 'aberto' // Default status
      });
      onSubmit(ticketId);
    } catch (error) {
      console.error("Failed to create ticket:", error);
      setError("Ocorreu um erro ao criar seu chamado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-base-100 rounded-lg shadow-lg animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-neutral">Abrir Chamado de Suporte</h3>
        <button onClick={onClose} className="text-neutral hover:text-error">&times;</button>
      </div>
      <p className="text-sm text-neutral mb-4">
        Descreva seu problema em detalhes para que possamos te ajudar da melhor forma.
      </p>
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome Completo</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="mt-1 input input-bordered w-full" />
        </div>
         <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 input input-bordered w-full" />
        </div>
         <div>
          <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700">Número do Pedido (Opcional)</label>
          <input type="text" id="orderNumber" name="orderNumber" value={formData.orderNumber} onChange={handleChange} placeholder="Ex: R595531189-dup" className="mt-1 input input-bordered w-full" />
          {orderPreview && (
            <div className="mt-2 p-3 bg-info/10 rounded-lg text-sm">
              <p className="font-semibold">Pedido relacionado: {orderPreview.order_number}</p>
              <p className="text-xs text-gray-600">Status: {orderPreview.status}</p>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Assunto</label>
          <input type="text" id="subject" name="subject" value={formData.subject} onChange={handleChange} required className="mt-1 input input-bordered w-full" />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição do Problema</label>
          <textarea id="description" name="description" value={formData.description} onChange={handleChange} required rows={4} className="mt-1 textarea textarea-bordered w-full"></textarea>
        </div>
        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="btn">Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Enviando...' : 'Enviar Chamado'}
          </button>
        </div>
      </form>
    </div>
  );
};