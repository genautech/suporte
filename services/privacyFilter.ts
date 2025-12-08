// Serviço para filtrar dados pessoais e garantir privacidade entre clientes
import { Conversation, ConversationMessage } from '../types';

/**
 * Padrões para detectar dados pessoais
 */
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const ORDER_NUMBER_PATTERN = /\b([A-Z]{1,5}\d{6,}|#?[A-Z]{1,5}\d{6,})\b/gi;
const PHONE_PATTERN = /\b(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}\b/g;
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

/**
 * Lista de emails permitidos (do próprio cliente ou genéricos)
 */
const getAllowedEmails = (currentUserEmail?: string): string[] => {
  const allowed = ['atendimento@yoobe.co', 'suporte@yoobe.co'];
  if (currentUserEmail) {
    allowed.push(currentUserEmail.toLowerCase());
  }
  return allowed;
};

/**
 * Remove emails de outros clientes do texto
 */
export const filterEmails = (text: string, currentUserEmail?: string): string => {
  const allowedEmails = getAllowedEmails(currentUserEmail);
  const normalizedCurrentEmail = currentUserEmail?.toLowerCase();
  
  return text.replace(EMAIL_PATTERN, (match) => {
    const normalizedMatch = match.toLowerCase();
    
    // Permitir email do cliente atual
    if (normalizedCurrentEmail && normalizedMatch === normalizedCurrentEmail) {
      return match;
    }
    
    // Permitir emails genéricos/suporte
    if (allowedEmails.some(allowed => normalizedMatch.includes(allowed))) {
      return match;
    }
    
    // Substituir emails de outros clientes
    return '[email_removido]';
  });
};

/**
 * Remove números de pedido de outros clientes
 */
export const filterOrderNumbers = (text: string, allowedOrderNumbers: string[] = []): string => {
  const normalizedAllowed = allowedOrderNumbers.map(o => o.toLowerCase().replace(/[^a-z0-9]/g, ''));
  
  return text.replace(ORDER_NUMBER_PATTERN, (match) => {
    const normalizedMatch = match.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Permitir pedidos do cliente atual
    if (normalizedAllowed.some(allowed => normalizedMatch.includes(allowed) || allowed.includes(normalizedMatch))) {
      return match;
    }
    
    // Substituir pedidos de outros clientes
    return '[pedido_removido]';
  });
};

/**
 * Remove telefones do texto
 */
export const filterPhones = (text: string): string => {
  return text.replace(PHONE_PATTERN, '[telefone_removido]');
};

/**
 * Remove CPFs do texto
 */
export const filterCPFs = (text: string): string => {
  return text.replace(CPF_PATTERN, '[cpf_removido]');
};

/**
 * Filtra dados pessoais de um texto completo
 */
export const filterPersonalData = (
  text: string,
  currentUserEmail?: string,
  allowedOrderNumbers: string[] = []
): string => {
  let filtered = text;
  filtered = filterEmails(filtered, currentUserEmail);
  filtered = filterOrderNumbers(filtered, allowedOrderNumbers);
  filtered = filterPhones(filtered);
  filtered = filterCPFs(filtered);
  return filtered;
};

/**
 * Sanitiza mensagens de conversa removendo dados pessoais de outros clientes
 */
export const sanitizeConversationMessages = (
  messages: ConversationMessage[],
  currentUserEmail?: string,
  allowedOrderNumbers: string[] = []
): ConversationMessage[] => {
  return messages.map(msg => ({
    ...msg,
    text: filterPersonalData(msg.text, currentUserEmail, allowedOrderNumbers),
  }));
};

/**
 * Sanitiza conversa completa
 */
export const sanitizeConversation = (
  conversation: Conversation,
  currentUserEmail?: string
): Conversation => {
  const allowedOrderNumbers = conversation.orderNumbers || [];
  
  return {
    ...conversation,
    messages: sanitizeConversationMessages(
      conversation.messages,
      currentUserEmail,
      allowedOrderNumbers
    ),
  };
};

/**
 * Valida se resposta contém dados de outros clientes
 */
export const validateResponsePrivacy = (
  response: string,
  currentUserEmail?: string,
  allowedOrderNumbers: string[] = []
): { isValid: boolean; sanitized: string; issues: string[] } => {
  const issues: string[] = [];
  let sanitized = response;
  
  // Verificar emails
  const emails = response.match(EMAIL_PATTERN) || [];
  const allowedEmails = getAllowedEmails(currentUserEmail);
  const unauthorizedEmails = emails.filter(
    email => !allowedEmails.some(allowed => email.toLowerCase().includes(allowed.toLowerCase()))
  );
  
  if (unauthorizedEmails.length > 0) {
    issues.push(`Emails não autorizados encontrados: ${unauthorizedEmails.join(', ')}`);
    sanitized = filterEmails(sanitized, currentUserEmail);
  }
  
  // Verificar pedidos
  const orderNumbers = response.match(ORDER_NUMBER_PATTERN) || [];
  const normalizedAllowed = allowedOrderNumbers.map(o => o.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const unauthorizedOrders = orderNumbers.filter(order => {
    const normalized = order.toLowerCase().replace(/[^a-z0-9]/g, '');
    return !normalizedAllowed.some(allowed => normalized.includes(allowed) || allowed.includes(normalized));
  });
  
  if (unauthorizedOrders.length > 0) {
    issues.push(`Pedidos não autorizados encontrados: ${unauthorizedOrders.join(', ')}`);
    sanitized = filterOrderNumbers(sanitized, allowedOrderNumbers);
  }
  
  return {
    isValid: issues.length === 0,
    sanitized,
    issues,
  };
};

/**
 * Filtra contexto de múltiplas conversas mantendo apenas dados genéricos
 */
export const filterContextForPrivacy = (
  conversations: Conversation[],
  currentUserEmail?: string,
  currentOrderNumbers: string[] = []
): string => {
  const sanitizedConversations = conversations.map(conv => 
    sanitizeConversation(conv, currentUserEmail)
  );
  
  // Extrair apenas perguntas e respostas genéricas (sem dados pessoais)
  const genericQAs: string[] = [];
  
  for (const conv of sanitizedConversations) {
    for (let i = 0; i < conv.messages.length - 1; i++) {
      const userMsg = conv.messages[i];
      const botMsg = conv.messages[i + 1];
      
      if (userMsg.sender === 'user' && botMsg.sender === 'bot') {
        // Verificar se mensagens não contêm dados pessoais
        const userText = userMsg.text;
        const botText = botMsg.text;
        
        // Se não contém placeholders de remoção, é genérico
        if (!userText.includes('[email_removido]') && 
            !userText.includes('[pedido_removido]') &&
            !botText.includes('[email_removido]') && 
            !botText.includes('[pedido_removido]')) {
          genericQAs.push(`P: ${userText}\nR: ${botText}`);
        }
      }
    }
  }
  
  return genericQAs.join('\n\n');
};








