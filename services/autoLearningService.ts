// Serviço de Aprendizado Automático Aprimorado
// Aprende automaticamente de interações bem-sucedidas sem depender de feedback explícito

import { conversationService } from './conversationService';
import { supportService } from './supportService';
import { customerKnowledgeService } from './customerKnowledgeService';
import { Conversation, Ticket } from '../types';

/**
 * Critérios para identificar interações bem-sucedidas automaticamente
 */
interface SuccessCriteria {
  // Conversa curta (menos mensagens = mais eficiente)
  maxMessages: number;
  // Sem escalação para humano
  noEscalation: boolean;
  // Pedido encontrado ou FAQ respondido
  problemResolved: boolean;
  // Sem feedback negativo
  noNegativeFeedback: boolean;
  // Ticket resolvido rapidamente
  quickResolution?: number; // horas
}

const DEFAULT_SUCCESS_CRITERIA: SuccessCriteria = {
  maxMessages: 5,
  noEscalation: true,
  problemResolved: true,
  noNegativeFeedback: true,
  quickResolution: 24, // 24 horas
};

/**
 * Analisa uma conversa e determina se foi bem-sucedida
 */
const isSuccessfulConversation = (conversation: Conversation): boolean => {
  try {
    // Verificar se tem feedback negativo
    if (conversation.feedback) {
      const rating = conversation.feedback.rating || conversation.feedback.npsScore;
      if (rating !== undefined) {
        // NPS: 0-6 é negativo, Rating: 1-2 é negativo
        if (conversation.feedback.npsScore !== undefined && conversation.feedback.npsScore <= 6) {
          return false;
        }
        if (conversation.feedback.rating !== undefined && conversation.feedback.rating <= 2) {
          return false;
        }
      }
    }

    // Verificar número de mensagens
    if (conversation.messages.length > DEFAULT_SUCCESS_CRITERIA.maxMessages) {
      return false;
    }

    // Verificar se foi resolvida
    if (!conversation.resolved) {
      return false;
    }

    // Verificar tentativas sem resolução
    if (conversation.attempts > 2) {
      return false;
    }

    // Verificar se tem ticket vinculado (escalação)
    if (conversation.ticketId) {
      // Ticket vinculado pode ser bom se foi resolvido rapidamente
      // Mas vamos considerar como menos bem-sucedido
      return false;
    }

    // Verificar se encontrou pedido ou respondeu FAQ
    const hasOrderNumbers = conversation.orderNumbers && conversation.orderNumbers.length > 0;
    const hasFunctionCalls = conversation.messages.some(m => 
      m.functionCalls && m.functionCalls.length > 0
    );

    if (!hasOrderNumbers && !hasFunctionCalls) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('[autoLearningService] Erro ao analisar conversa:', error);
    return false;
  }
};

/**
 * Analisa um ticket e determina se foi resolvido com sucesso
 */
const isSuccessfulTicket = (ticket: Ticket): boolean => {
  try {
    // Apenas tickets resolvidos
    if (ticket.status !== 'resolvido') {
      return false;
    }

    // Verificar tempo de resolução
    if (ticket.createdAt && ticket.updatedAt) {
      const resolutionTime = ticket.updatedAt - ticket.createdAt;
      const hours = resolutionTime / (1000 * 60 * 60);
      
      if (hours > DEFAULT_SUCCESS_CRITERIA.quickResolution!) {
        return false; // Resolução muito lenta
      }
    }

    // Verificar se tem solução documentada
    const hasSolution = ticket.history.some(h => 
      h.author === 'admin' && h.type === 'comment' && h.content
    );

    if (!hasSolution) {
      return false; // Sem solução documentada
    }

    return true;
  } catch (error) {
    console.error('[autoLearningService] Erro ao analisar ticket:', error);
    return false;
  }
};

/**
 * Extrai conhecimento de uma conversa bem-sucedida
 */
const extractKnowledgeFromConversation = (conversation: Conversation): {
  question: string;
  answer: string;
  confidence: number; // 0-1
} | null => {
  try {
    const userMessages = conversation.messages.filter(m => m.sender === 'user');
    const botMessages = conversation.messages.filter(m => m.sender === 'bot');

    if (userMessages.length === 0 || botMessages.length === 0) {
      return null;
    }

    // Pegar última pergunta do usuário e última resposta do bot
    const lastUserMessage = userMessages[userMessages.length - 1];
    const lastBotMessage = botMessages[botMessages.length - 1];

    if (!lastUserMessage.text || !lastBotMessage.text) {
      return null;
    }

    // Calcular confiança baseado em critérios
    let confidence = 0.5; // Base

    // Conversa curta aumenta confiança
    if (conversation.messages.length <= 3) {
      confidence += 0.2;
    }

    // Sem tentativas sem resolução aumenta confiança
    if (conversation.attempts === 0) {
      confidence += 0.2;
    }

    // Feedback positivo aumenta confiança
    if (conversation.feedback) {
      const rating = conversation.feedback.rating || conversation.feedback.npsScore;
      if (rating !== undefined) {
        if (conversation.feedback.npsScore !== undefined && conversation.feedback.npsScore >= 9) {
          confidence += 0.1;
        }
        if (conversation.feedback.rating !== undefined && conversation.feedback.rating >= 4) {
          confidence += 0.1;
        }
      }
    }

    // Limitar confiança entre 0 e 1
    confidence = Math.min(1, Math.max(0, confidence));

    return {
      question: lastUserMessage.text,
      answer: lastBotMessage.text,
      confidence,
    };
  } catch (error) {
    console.error('[autoLearningService] Erro ao extrair conhecimento:', error);
    return null;
  }
};

/**
 * Extrai conhecimento de um ticket bem-sucedido
 */
const extractKnowledgeFromTicket = (ticket: Ticket): {
  question: string;
  answer: string;
  confidence: number;
} | null => {
  try {
    const problem = ticket.description;
    const solutionMessages = ticket.history
      .filter(h => h.author === 'admin' && h.type === 'comment' && h.content)
      .map(h => h.content);

    if (!problem || solutionMessages.length === 0) {
      return null;
    }

    const solution = solutionMessages.join('\n\n');

    // Calcular confiança baseado em tempo de resolução
    let confidence = 0.5; // Base

    if (ticket.createdAt && ticket.updatedAt) {
      const resolutionTime = ticket.updatedAt - ticket.createdAt;
      const hours = resolutionTime / (1000 * 60 * 60);
      
      // Resolução rápida aumenta confiança
      if (hours < 12) {
        confidence += 0.3;
      } else if (hours < 24) {
        confidence += 0.2;
      }
    }

    // Solução bem documentada aumenta confiança
    if (solutionMessages.length > 1) {
      confidence += 0.1;
    }

    // Limitar confiança entre 0 e 1
    confidence = Math.min(1, Math.max(0, confidence));

    return {
      question: `Problema: ${problem}`,
      answer: `Solução: ${solution}`,
      confidence,
    };
  } catch (error) {
    console.error('[autoLearningService] Erro ao extrair conhecimento do ticket:', error);
    return null;
  }
};

/**
 * Aprende automaticamente de conversas bem-sucedidas
 */
const learnFromSuccessfulConversations = async (limit: number = 50): Promise<{
  learned: number;
  skipped: number;
  errors: number;
}> => {
  let learned = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Buscar conversas recentes (últimas 50)
    const conversations = await conversationService.getAllConversations(limit, false);

    for (const conversation of conversations) {
      try {
        // Pular se já foi aprendida (tem sourceId no conhecimento)
        // Isso será verificado no aprendizado

        // Verificar se é bem-sucedida
        if (!isSuccessfulConversation(conversation)) {
          skipped++;
          continue;
        }

        // Extrair conhecimento
        const knowledge = extractKnowledgeFromConversation(conversation);
        if (!knowledge) {
          skipped++;
          continue;
        }

        // Apenas aprender se confiança for alta (> 0.6)
        if (knowledge.confidence < 0.6) {
          skipped++;
          continue;
        }

        // Verificar se já existe conhecimento similar
        // (evitar duplicação - implementação futura)

        // Adicionar conhecimento (formato: question + answer como content)
        await customerKnowledgeService.addKnowledgeEntry(
          conversation.userId,
          {
            content: `P: ${knowledge.question}\nR: ${knowledge.answer}`,
            source: 'conversation', // Usar 'conversation' para manter compatibilidade
            sourceId: conversation.id || '',
            tags: ['auto_learning', `confidence_${Math.round(knowledge.confidence * 10)}`],
          },
          conversation.companyId
        );

        learned++;
      } catch (error) {
        console.error('[autoLearningService] Erro ao processar conversa:', {
          conversationId: conversation.id,
          error: error instanceof Error ? error.message : String(error),
        });
        errors++;
      }
    }

    return { learned, skipped, errors };
  } catch (error) {
    console.error('[autoLearningService] Erro ao aprender de conversas:', error);
    return { learned, skipped, errors };
  }
};

/**
 * Aprende automaticamente de tickets bem-sucedidos
 */
const learnFromSuccessfulTickets = async (limit: number = 50): Promise<{
  learned: number;
  skipped: number;
  errors: number;
}> => {
  let learned = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Buscar tickets resolvidos recentes
    const allTickets = await supportService.getTickets(true); // Incluir arquivados
    const resolvedTickets = allTickets
      .filter(t => t.status === 'resolvido')
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, limit);

    for (const ticket of resolvedTickets) {
      try {
        // Verificar se é bem-sucedido
        if (!isSuccessfulTicket(ticket)) {
          skipped++;
          continue;
        }

        // Extrair conhecimento
        const knowledge = extractKnowledgeFromTicket(ticket);
        if (!knowledge) {
          skipped++;
          continue;
        }

        // Apenas aprender se confiança for alta (> 0.6)
        if (knowledge.confidence < 0.6) {
          skipped++;
          continue;
        }

        // Verificar se já foi aprendido (via learnFromTicketResolution)
        // Isso será verificado no aprendizado

        // Adicionar conhecimento (formato: question + answer como content)
        await customerKnowledgeService.addKnowledgeEntry(
          ticket.email,
          {
            content: `${knowledge.question}\n${knowledge.answer}`,
            source: 'ticket', // Usar 'ticket' para manter compatibilidade
            sourceId: ticket.id || '',
            tags: ['auto_learning', `confidence_${Math.round(knowledge.confidence * 10)}`],
          },
          ticket.companyId
        );

        learned++;
      } catch (error) {
        console.error('[autoLearningService] Erro ao processar ticket:', {
          ticketId: ticket.id,
          error: error instanceof Error ? error.message : String(error),
        });
        errors++;
      }
    }

    return { learned, skipped, errors };
  } catch (error) {
    console.error('[autoLearningService] Erro ao aprender de tickets:', error);
    return { learned, skipped, errors };
  }
};

/**
 * Processa aprendizado automático completo
 */
const processAutoLearning = async (options?: {
  conversationLimit?: number;
  ticketLimit?: number;
}): Promise<{
  conversations: { learned: number; skipped: number; errors: number };
  tickets: { learned: number; skipped: number; errors: number };
  total: number;
}> => {
  const conversationLimit = options?.conversationLimit || 50;
  const ticketLimit = options?.ticketLimit || 50;

  console.log('[autoLearningService] Iniciando aprendizado automático...');

  const [conversationsResult, ticketsResult] = await Promise.all([
    learnFromSuccessfulConversations(conversationLimit),
    learnFromSuccessfulTickets(ticketLimit),
  ]);

  const total = conversationsResult.learned + ticketsResult.learned;

  console.log('[autoLearningService] Aprendizado automático concluído:', {
    conversations: conversationsResult,
    tickets: ticketsResult,
    total,
  });

  return {
    conversations: conversationsResult,
    tickets: ticketsResult,
    total,
  };
};

/**
 * Obtém métricas de aprendizado automático
 */
const getLearningMetrics = async (): Promise<{
  totalConversations: number;
  successfulConversations: number;
  learnedFromConversations: number;
  totalTickets: number;
  successfulTickets: number;
  learnedFromTickets: number;
  autoLearningRate: number; // % de interações aprendidas automaticamente
}> => {
  try {
    const conversations = await conversationService.getAllConversations(100, false);
    const allTickets = await supportService.getTickets(true);
    const resolvedTickets = allTickets.filter(t => t.status === 'resolvido');

    const successfulConversations = conversations.filter(isSuccessfulConversation).length;
    const successfulTickets = resolvedTickets.filter(isSuccessfulTicket).length;

    // Estimar conhecimento aprendido automaticamente
    // (baseado em source: 'auto_learning' ou 'auto_learning_ticket')
    // Isso requer busca no customerKnowledge, implementação futura

    const totalInteractions = conversations.length + resolvedTickets.length;
    const successfulInteractions = successfulConversations + successfulTickets;
    const autoLearningRate = totalInteractions > 0 
      ? (successfulInteractions / totalInteractions) * 100 
      : 0;

    return {
      totalConversations: conversations.length,
      successfulConversations,
      learnedFromConversations: 0, // TODO: Buscar do customerKnowledge
      totalTickets: resolvedTickets.length,
      successfulTickets,
      learnedFromTickets: 0, // TODO: Buscar do customerKnowledge
      autoLearningRate: Math.round(autoLearningRate * 10) / 10,
    };
  } catch (error) {
    console.error('[autoLearningService] Erro ao obter métricas:', error);
    return {
      totalConversations: 0,
      successfulConversations: 0,
      learnedFromConversations: 0,
      totalTickets: 0,
      successfulTickets: 0,
      learnedFromTickets: 0,
      autoLearningRate: 0,
    };
  }
};

export const autoLearningService = {
  isSuccessfulConversation,
  isSuccessfulTicket,
  extractKnowledgeFromConversation,
  extractKnowledgeFromTicket,
  learnFromSuccessfulConversations,
  learnFromSuccessfulTickets,
  processAutoLearning,
  getLearningMetrics,
};

