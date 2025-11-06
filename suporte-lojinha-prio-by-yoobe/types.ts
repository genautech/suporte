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

export type TicketStatus = 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';
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
  orderId?: string;
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
  status: 'unknown' | 'connected' | 'error';
}

export interface CubboOrder {
    id: string;
    order_number: string;
    status: string;
    items_summary: string[];
    shipping_information: {
        tracking_url?: string;
        tracking_number?: string;
        courier?: string;
    };
    created_at: string;
}

export interface AuthCode {
    id?: string;
    email: string;
    code: string;
    createdAt: number;
    expiresAt: number;
    used: boolean;
}