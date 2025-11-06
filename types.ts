// Fix: Implement the type definitions.
import type { ReactNode } from 'react';

export enum MessageSender {
  USER = 'user',
  BOT = 'bot',
  SYSTEM = 'system',
}

export interface Message {
  id: string;
  text: string;
  sender: MessageSender;
  component?: ReactNode;
}

export interface ExchangeFormData {
  orderId: string;
  name: string;
  email: string;
  reason: string;
}

export type TicketStatus = 'aberto' | 'em_andamento' | 'resolvido' | 'fechado' | 'arquivado';
export type TicketPriority = 'baixa' | 'media' | 'alta';

export interface TicketHistoryItem {
  timestamp: number;
  content: string;
  author: 'user' | 'admin' | 'system';
  type: 'comment' | 'status_change' | 'creation';
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  name: string;
  email: string;
  phone?: string;
  orderId?: string; // ID do pedido (compatibilidade)
  orderNumber?: string; // Número do pedido (ex: "R595531189-dup")
  conversationId?: string; // ID da conversa que gerou o ticket
  createdAt: number;
  updatedAt: number;
  history: TicketHistoryItem[];
}

export interface KnowledgeBase {
  content: string;
  lastUpdatedAt: Date;
}

export interface ApiConfig {
  id: string;
  name: string;
  url: string;
  description: string;
  clientId: string;
  clientSecret: string;
  storeId?: string; // ID da loja na Cubbo (obrigatório para algumas APIs)
  status: 'unknown' | 'connected' | 'error';
}

export interface ShippingAddress {
    street?: string;
    street_number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
    complement?: string;
    reference?: string;
}

export interface PickupLocation {
    service_name: string;
    service_code: string;
    source: string; // Endereço do local
    description: string;
    distance?: string; // Distância em km
}

export interface OrderItem {
    sku: string;
    name?: string;
    quantity: number;
    price?: number;
    total?: number;
}

export interface CubboOrder {
    id: string;
    order_number: string;
    status: string;
    items_summary: string[]; // Resumo dos produtos (mantido para compatibilidade)
    items?: OrderItem[]; // Array detalhado de itens do pedido
    shipping_information: {
        tracking_url?: string;
        tracking_number?: string;
        courier?: string;
        email?: string; // Email de entrega
        estimated_time_arrival?: string; // Tempo estimado de entrega
    };
    shipping_address?: ShippingAddress; // Endereço completo de entrega
    pickup_location?: PickupLocation; // Informações de local de coleta (Click and Collect)
    billing_address?: ShippingAddress; // Endereço de cobrança
    created_at: string;
    updated_at?: string; // Data de última atualização
    shipped_at?: string; // Data de envio do pedido (quando status = shipped)
    delivered_at?: string; // Data de entrega/recebimento (quando status = delivered)
    customer_email?: string; // Email do cliente associado ao pedido
    shipping_email?: string; // Email de entrega (usado na busca)
    customer_phone?: string; // Telefone do cliente associado ao pedido
    payment_method?: string; // Método de pagamento
    total_amount?: number; // Valor total do pedido
    currency?: string; // Moeda do pedido (ex: BRL, USD)
    receipt_url?: string; // URL do comprovante de recebimento (se disponível na API)
    receipt_image?: string; // Imagem/base64 do comprovante de recebimento (se disponível na API)
}

export interface AuthCode {
    id?: string;
    email: string;
    code: string;
    createdAt: number;
    expiresAt: number;
    used: boolean;
}

export interface ConversationMessage {
    text: string;
    sender: MessageSender;
    timestamp: number;
    functionCalls?: Array<{
        name: string;
        args: any;
    }>;
    orderNumbers?: string[]; // Códigos de pedidos extraídos da mensagem
}

export interface Conversation {
    id?: string;
    userId: string; // Email do usuário
    sessionId: string; // ID único da sessão (UUID)
    messages: ConversationMessage[];
    orderNumbers: string[]; // Array de pedidos mencionados na conversa
    resolved: boolean; // Se a conversa foi resolvida
    feedback?: {
        rating: number; // 1-5 estrelas
        comment?: string;
        timestamp: number;
    };
    attempts: number; // Contador de tentativas sem resolução
    createdAt: number;
    updatedAt: number;
}

export type FAQCategory = 'compra' | 'troca' | 'rastreio' | 'cancelamento' | 'reembolso' | 'sla' | 'geral';

export interface FAQEntry {
  id?: string;
  question: string;
  answer: string;
  category: FAQCategory;
  tags: string[];
  order: number; // Para ordenação manual
  active: boolean;
  createdAt: number;
  updatedAt: number;
  views?: number; // Contador de visualizações
  helpful?: number; // Contador de "útil"
}

export type TicketSubject = 
  | 'cancelamento' 
  | 'reembolso' 
  | 'troca' 
  | 'produto_defeituoso'
  | 'produto_nao_recebido'
  | 'produto_errado'
  | 'atraso_entrega'
  | 'duvida_pagamento'
  | 'outro';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface TicketFormConfig {
  subject: TicketSubject;
  fields: FormField[];
  questions: string[]; // Perguntas contextuais
  validationRules?: Record<string, any>;
}

export interface KnowledgeBaseEntry {
  id?: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: 'faq' | 'ticket' | 'manual' | 'gemini';
  relatedTickets?: string[]; // IDs de tickets relacionados
  createdAt: number;
  updatedAt: number;
  verified: boolean;
}