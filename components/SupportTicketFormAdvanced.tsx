import React, { useState, useEffect } from 'react';
import { supportService } from '../services/supportService';
import { TicketSubject, TicketFormConfig, FormField } from '../types';
import { getTicketFormConfig } from '../data/ticketFormConfigs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';

interface SupportTicketFormAdvancedProps {
  initialData?: {
    name: string;
    email: string;
    phone?: string;
    orderNumber?: string;
  };
  defaultSubject?: TicketSubject;
  onSubmit: (ticketId: string) => void;
  onClose: () => void;
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

export const SupportTicketFormAdvanced: React.FC<SupportTicketFormAdvancedProps> = ({
  initialData = { name: '', email: '', phone: '', orderNumber: '' },
  defaultSubject,
  onSubmit,
  onClose,
}) => {
  const [subject, setSubject] = useState<TicketSubject>(defaultSubject || 'outro');
  const [formConfig, setFormConfig] = useState<TicketFormConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({
    name: initialData.name,
    email: initialData.email,
    phone: initialData.phone || '',
    orderNumber: initialData.orderNumber || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderPreview, setOrderPreview] = useState<any>(null);

  // Carregar configuração do formulário quando o assunto mudar
  useEffect(() => {
    const config = getTicketFormConfig(subject);
    setFormConfig(config);
    
    // Resetar apenas campos dinâmicos, mantendo dados básicos
    setFormData(prev => {
      const newFormData: Record<string, any> = {
        name: prev.name,
        email: prev.email,
        phone: prev.phone || '',
        orderNumber: prev.orderNumber || '',
      };
      return newFormData;
    });
  }, [subject]);

  // Inicializar assunto padrão quando defaultSubject mudar
  useEffect(() => {
    if (defaultSubject && defaultSubject !== subject) {
      setSubject(defaultSubject);
    }
  }, [defaultSubject]);

  // Buscar preview do pedido quando orderNumber for fornecido (com debounce)
  useEffect(() => {
    if (!formData.orderNumber) {
      setOrderPreview(null);
      return;
    }

    // Debounce: aguardar 500ms após parar de digitar
    const timeoutId = setTimeout(() => {
      // Só buscar se tiver pelo menos 3 caracteres
      if (formData.orderNumber.length >= 3) {
        supportService.getOrderDetails(formData.orderNumber).then(order => {
          if (order) {
            setOrderPreview(order);
          } else {
            setOrderPreview(null);
          }
        }).catch(() => {
          setOrderPreview(null);
        });
      } else {
        setOrderPreview(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.orderNumber]);

  const handleSubjectChange = (newSubject: string) => {
    console.log('[SupportTicketFormAdvanced] Assunto alterado para:', newSubject);
    const typedSubject = newSubject as TicketSubject;
    setSubject(typedSubject);
    setError('');
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} é obrigatório`;
    }

    if (field.validation) {
      if (field.type === 'number') {
        const numValue = Number(value);
        if (field.validation.min !== undefined && numValue < field.validation.min) {
          return field.validation.message || `Valor mínimo é ${field.validation.min}`;
        }
        if (field.validation.max !== undefined && numValue > field.validation.max) {
          return field.validation.message || `Valor máximo é ${field.validation.max}`;
        }
      }
      if (field.validation.pattern && value) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value.toString())) {
          return field.validation.message || 'Formato inválido';
        }
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formConfig) {
      setError('Por favor, selecione um assunto.');
      return;
    }

    // Validar campos obrigatórios
    const validationErrors: string[] = [];
    formConfig.fields.forEach(field => {
      const value = formData[field.name];
      const error = validateField(field, value);
      if (error) {
        validationErrors.push(error);
      }
    });

    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    // Construir subject e description a partir dos dados do formulário
    let ticketSubject = subjectLabels[subject];
    
    // Se o assunto for "outro", usar o campo subject preenchido pelo usuário
    if (subject === 'outro' && formData.subject) {
      ticketSubject = formData.subject;
    }
    
    // Construir description
    let description = '';
    
    // Se for "outro", usar o campo description diretamente
    if (subject === 'outro') {
      description = formData.description || formConfig.questions.join('\n\n');
    } else {
      // Para outros assuntos, construir a descrição a partir das perguntas e campos
      const descriptionParts: string[] = [];
      
      // Adicionar perguntas e respostas
      formConfig.questions.forEach((question) => {
        descriptionParts.push(question);
      });
      
      // Adicionar campos preenchidos
      formConfig.fields.forEach((field) => {
        if (formData[field.name] && field.name !== 'orderNumber') {
          const value = formData[field.name];
          let displayValue = value;
          
          // Se for um select, tentar encontrar o label correspondente
          if (field.type === 'select' && field.options) {
            const option = field.options.find(opt => opt.value === value);
            if (option) {
              displayValue = option.label;
            }
          }
          
          descriptionParts.push(`${field.label}: ${displayValue}`);
        }
      });
      
      description = descriptionParts.join('\n\n');
    }

    setIsLoading(true);
    try {
      console.log('[SupportTicketFormAdvanced] Criando ticket com:', {
        subject: ticketSubject,
        description: description.substring(0, 100) + '...',
        name: formData.name,
        email: formData.email,
        orderNumber: formData.orderNumber,
      });
      
      const ticketId = await supportService.createTicket({
        subject: ticketSubject,
        description,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        orderNumber: formData.orderNumber || undefined,
        priority: subject === 'produto_nao_recebido' || subject === 'produto_defeituoso' ? 'alta' : 'media',
        status: 'aberto',
      });
      onSubmit(ticketId);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      setError('Ocorreu um erro ao criar seu chamado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || '';
    const fieldError = validateField(field, value);

    switch (field.type) {
      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value.toString()}
              onValueChange={(val) => handleFieldChange(field.name, val)}
            >
              <SelectTrigger id={field.name} className="w-full">
                <SelectValue placeholder={field.placeholder || `Selecione ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError && <p className="text-sm text-destructive mt-1">{fieldError}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={value.toString()}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              required={field.required}
            />
            {fieldError && <p className="text-sm text-destructive mt-1">{fieldError}</p>}
          </div>
        );

      case 'date':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="date"
              value={value.toString()}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              required={field.required}
            />
            {fieldError && <p className="text-sm text-destructive mt-1">{fieldError}</p>}
          </div>
        );

      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="number"
              value={value.toString()}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              min={field.validation?.min}
              max={field.validation?.max}
            />
            {fieldError && <p className="text-sm text-destructive mt-1">{fieldError}</p>}
          </div>
        );

      case 'file':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="file"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  handleFieldChange(field.name, Array.from(files));
                }
              }}
              accept="image/*"
              multiple={field.name === 'photos'}
              required={field.required}
            />
            {fieldError && <p className="text-sm text-destructive mt-1">{fieldError}</p>}
          </div>
        );

      default: // text
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="text"
              value={value.toString()}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
            {fieldError && <p className="text-sm text-destructive mt-1">{fieldError}</p>}
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      <p className="text-sm text-muted-foreground mb-6">
        Selecione o assunto do seu chamado e preencha o formulário correspondente.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo de assunto */}
          <div className="space-y-2">
            <Label htmlFor="subject-select">
              Assunto do Chamado <span className="text-destructive">*</span>
            </Label>
            <Select value={subject} onValueChange={(value) => handleSubjectChange(value)}>
              <SelectTrigger id="subject-select" className="w-full">
                <SelectValue placeholder="Selecione o assunto" />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                {Object.entries(subjectLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Perguntas contextuais */}
          {formConfig && formConfig.questions.length > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-sm">Para melhor atendê-lo:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {formConfig.questions.map((question, index) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Campos dinâmicos */}
          {formConfig && (
            <div className="space-y-4">
              {formConfig.fields.map((field) => renderField(field))}
            </div>
          )}

          {/* Preview do pedido */}
          {orderPreview && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
              <p className="font-semibold">Pedido relacionado: {orderPreview.order_number}</p>
              <p className="text-muted-foreground">Status: {orderPreview.status}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar Chamado'}
            </Button>
          </div>
        </form>
    </div>
  );
};

