import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, TicketPriority, TicketSubject, TicketFormConfig, FormField } from '../types';
import { supportService } from '../services/supportService';
import { getTicketFormConfig } from '../data/ticketFormConfigs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

interface TicketFormProps {
  ticket: Ticket | null;
  onSubmit: () => void;
}

const subjectLabels: Record<TicketSubject, string> = {
  cancelamento: 'Cancelamento de Pedido',
  reembolso: 'Reembolso',
  troca: 'Troca de Produto',
  produto_defeituoso: 'Produto com Defeito',
  produto_nao_recebido: 'Produto Não Recebido',
  produto_errado: 'Produto Errado',
  atraso_entrega: 'Atraso na Entrega',
  duvida_pagamento: 'Dúvida sobre Pagamento',
  outro: 'Outro Assunto',
};

const emptyTicket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'history'> = {
    subject: '',
    description: '',
    priority: 'media',
    status: 'aberto',
    name: '',
    email: '',
    phone: '',
    orderId: '',
    orderNumber: ''
};

export const TicketForm: React.FC<TicketFormProps> = ({ ticket, onSubmit }) => {
  const [formData, setFormData] = useState(emptyTicket);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = ticket !== null;
  const [selectedSubject, setSelectedSubject] = useState<TicketSubject>('outro');
  const [formConfig, setFormConfig] = useState<TicketFormConfig | null>(null);
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});
  const [orderPreview, setOrderPreview] = useState<any>(null);

  useEffect(() => {
    if (isEditing && ticket) {
      const { id, createdAt, updatedAt, history, ...editableData } = ticket;
      setFormData(editableData);
      // Tentar identificar o assunto do ticket existente
      const subjectKey = Object.keys(subjectLabels).find(
        key => subjectLabels[key as TicketSubject].toLowerCase() === ticket.subject.toLowerCase()
      ) as TicketSubject | undefined;
      if (subjectKey) {
        setSelectedSubject(subjectKey);
      }
    } else {
      setFormData(emptyTicket);
      setSelectedSubject('outro');
      setDynamicFields({});
    }
  }, [ticket, isEditing]);

  useEffect(() => {
    const config = getTicketFormConfig(selectedSubject);
    setFormConfig(config);
    if (!isEditing) {
      setDynamicFields({});
    }
  }, [selectedSubject, isEditing]);

  useEffect(() => {
    if (formData.orderNumber && !orderPreview && !isEditing) {
      supportService.getOrderDetails(formData.orderNumber).then(order => {
        if (order) {
          setOrderPreview(order);
        }
      }).catch(() => {
        // Silenciosamente falha se não encontrar pedido
      });
    }
  }, [formData.orderNumber, orderPreview, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value as any }));
    if (name === 'orderNumber' && value) {
      setOrderPreview(null);
    }
  };

  const handleSubjectChange = (value: string) => {
    const subject = value as TicketSubject;
    setSelectedSubject(subject);
    setFormData(prev => ({ ...prev, subject: subjectLabels[subject] }));
    setDynamicFields({});
  };

  const handleDynamicFieldChange = (fieldName: string, value: any) => {
    setDynamicFields(prev => ({ ...prev, [fieldName]: value }));
  };

  const renderField = (field: FormField) => {
    const value = dynamicFields[field.name] || formData[field.name as keyof typeof formData] || '';

    switch (field.type) {
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleDynamicFieldChange(field.name, val)}
            required={field.required}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={field.placeholder || `Selecione ${field.label}`} />
            </SelectTrigger>
            <SelectContent className="z-[10000]">
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'textarea':
        return (
          <Textarea
            name={field.name}
            value={value}
            onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
            rows={field.rows || 4}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            name={field.name}
            value={value}
            onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );
      default:
        return (
          <Input
            type={field.type || 'text'}
            name={field.name}
            value={value}
            onChange={(e) => {
              if (field.name === 'orderNumber') {
                handleChange(e);
              } else {
                handleDynamicFieldChange(field.name, e.target.value);
              }
            }}
            required={field.required}
            placeholder={field.placeholder}
          />
        );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        // Determinar o assunto correto
        let finalSubject: string;
        if (isEditing) {
          finalSubject = formData.subject;
        } else {
          // Se for "outro" e tiver campo subject preenchido, usar ele
          if (selectedSubject === 'outro' && dynamicFields.subject) {
            finalSubject = dynamicFields.subject;
          } else {
            finalSubject = subjectLabels[selectedSubject];
          }
        }
        
        const ticketData: any = {
          ...formData,
          subject: finalSubject,
          description: formData.description || formConfig?.questions?.join('\n\n') || '',
          ...dynamicFields,
        };
        
        // Remover campos duplicados dos dynamicFields que já estão em formData
        // Mas manter subject e description que são os principais
        if (selectedSubject !== 'outro') {
          // Para assuntos específicos, não precisamos do campo subject dos dynamicFields
          delete ticketData.subject; // Remover se vier de dynamicFields
          ticketData.subject = finalSubject; // Garantir que está correto
        }

        console.log('[TicketForm] Criando/atualizando ticket com:', {
          subject: finalSubject,
          description: ticketData.description?.substring(0, 100) + '...',
          name: ticketData.name,
          email: ticketData.email,
        });

        if (isEditing) {
            await supportService.updateTicket(ticket.id, ticketData);
        } else {
            await supportService.createTicket(ticketData);
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
                 <div className="space-y-2">
                    <Label htmlFor="name">Nome do Cliente</Label>
                    <Input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="orderNumber">Número do Pedido (Opcional)</Label>
                    <Input type="text" id="orderNumber" name="orderNumber" value={formData.orderNumber || ''} onChange={handleChange} placeholder="Ex: R595531189-dup" />
                    {orderPreview && (
                      <div className="mt-2 p-3 bg-info/10 rounded-lg text-sm">
                        <p className="font-semibold">Pedido: {orderPreview.order_number}</p>
                        <p className="text-xs text-muted-foreground">Status: {orderPreview.status}</p>
                      </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="subject">Assunto</Label>
                {isEditing ? (
                  <Input type="text" id="subject" name="subject" value={formData.subject} onChange={handleChange} required />
                ) : (
                  <Select value={selectedSubject} onValueChange={handleSubjectChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de chamado" />
                    </SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {Object.entries(subjectLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
            </div>

            {/* Campos dinâmicos baseados no assunto */}
            {formConfig && !isEditing && formConfig.fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderField(field)}
              </div>
            ))}

            {/* Perguntas do assunto */}
            {formConfig && !isEditing && formConfig.questions && formConfig.questions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder={formConfig.questions.join('\n\n')}
                />
                <p className="text-xs text-muted-foreground">
                  Por favor, responda às seguintes perguntas: {formConfig.questions.join(', ')}
                </p>
              </div>
            )}

            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={5}
                />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as TicketPriority }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]">
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as TicketStatus }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]">
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                        <SelectItem value="fechado">Fechado</SelectItem>
                        {isEditing && <SelectItem value="arquivado">Arquivado</SelectItem>}
                      </SelectContent>
                    </Select>
                </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => onSubmit()} className="btn btn-ghost">
                    Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading && <span className="loading loading-spinner loading-sm mr-2"></span>}
                    {isEditing ? 'Salvar Alterações' : 'Criar Chamado'}
                </button>
            </div>
        </form>
    </div>
  );
};