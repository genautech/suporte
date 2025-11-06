
import React, { useState } from 'react';
import { ExchangeFormData } from '../types';

interface ExchangeFormProps {
  orderId?: string;
  onSubmit: (data: ExchangeFormData) => void;
  onClose: () => void;
}

export const ExchangeForm: React.FC<ExchangeFormProps> = ({ orderId = '', onSubmit, onClose }) => {
  const [formData, setFormData] = useState<ExchangeFormData>({
    orderId: orderId,
    name: '',
    email: '',
    reason: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="p-4 bg-base-100 rounded-lg shadow-lg animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-neutral">Formulário de Troca</h3>
        <button onClick={onClose} className="text-neutral hover:text-error">&times;</button>
      </div>
      <p className="text-sm text-neutral mb-4">
        Lembre-se: As trocas devem ser solicitadas em até 3 dias após o recebimento do pedido.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="orderId" className="block text-sm font-medium text-gray-700">Número do Pedido</label>
          <input
            type="text"
            id="orderId"
            name="orderId"
            value={formData.orderId}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome Completo</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Motivo da Troca</label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            required
            rows={3}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          ></textarea>
        </div>
        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-base-200 text-neutral rounded-md hover:bg-base-300">Cancelar</button>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-content rounded-md hover:bg-primary-focus">Enviar Solicitação</button>
        </div>
      </form>
    </div>
  );
};
