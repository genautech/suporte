// Serviço de Métricas de Aprendizado
// Coleta e analisa métricas sobre o sistema de aprendizado

import { conversationService } from './conversationService';
import { supportService } from './supportService';
import { customerKnowledgeService } from './customerKnowledgeService';
import { autoLearningService } from './autoLearningService';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const customerKnowledgeCollection = collection(db, 'customerKnowledge');

/**
 * Obtém métricas completas de aprendizado
 */
export const getLearningMetrics = async (): Promise<{
  // Conversas
  totalConversations: number;
  resolvedConversations: number;
  successfulConversations: number;
  learnedFromConversations: number;
  autoLearnedFromConversations: number;
  
  // Tickets
  totalTickets: number;
  resolvedTickets: number;
  successfulTickets: number;
  learnedFromTickets: number;
  autoLearnedFromTickets: number;
  
  // Conhecimento
  totalKnowledgeEntries: number;
  knowledgeBySource: {
    conversation: number;
    ticket: number;
    manual: number;
    auto_learning: number;
  };
  
  // Taxas
  autoLearningRate: number; // % de interações aprendidas automaticamente
  successRate: number; // % de interações bem-sucedidas
  learningEfficiency: number; // % de interações bem-sucedidas que foram aprendidas
  
  // Evolução (últimos 30 dias)
  evolution: {
    date: string;
    conversations: number;
    learned: number;
    autoLearned: number;
  }[];
}> => {
  try {
    // Buscar conversas
    const conversations = await conversationService.getAllConversations(undefined, false);
    const resolvedConversations = conversations.filter(c => c.resolved);
    const successfulConversations = conversations.filter(c => 
      autoLearningService.isSuccessfulConversation(c)
    );

    // Buscar tickets
    const allTickets = await supportService.getTickets(true);
    const resolvedTickets = allTickets.filter(t => t.status === 'resolvido');
    const successfulTickets = resolvedTickets.filter(t => 
      autoLearningService.isSuccessfulTicket(t)
    );

    // Buscar conhecimento
    const knowledgeSnapshot = await getDocs(customerKnowledgeCollection);
    const allKnowledgeEntries = knowledgeSnapshot.docs.flatMap(doc => {
      const data = doc.data();
      return (data.knowledgeEntries || []).map((entry: any) => ({
        ...entry,
        customerEmail: data.customerEmail,
      }));
    });

    // Contar por fonte
    const knowledgeBySource = {
      conversation: allKnowledgeEntries.filter((e: any) => 
        e.source === 'conversation' && !e.tags?.includes('auto_learning')
      ).length,
      ticket: allKnowledgeEntries.filter((e: any) => 
        e.source === 'ticket' && !e.tags?.includes('auto_learning')
      ).length,
      manual: allKnowledgeEntries.filter((e: any) => 
        e.source === 'manual'
      ).length,
      auto_learning: allKnowledgeEntries.filter((e: any) => 
        e.tags?.includes('auto_learning')
      ).length,
    };

    // Calcular taxas
    const totalInteractions = conversations.length + resolvedTickets.length;
    const successfulInteractions = successfulConversations.length + successfulTickets.length;
    const autoLearningRate = totalInteractions > 0 
      ? ((knowledgeBySource.auto_learning / totalInteractions) * 100)
      : 0;
    const successRate = totalInteractions > 0
      ? ((successfulInteractions / totalInteractions) * 100)
      : 0;
    const learningEfficiency = successfulInteractions > 0
      ? ((knowledgeBySource.auto_learning / successfulInteractions) * 100)
      : 0;

    // Evolução (últimos 30 dias)
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const evolution: { date: string; conversations: number; learned: number; autoLearned: number }[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = date.setHours(0, 0, 0, 0);
      const dayEnd = date.setHours(23, 59, 59, 999);

      const dayConversations = conversations.filter(c => 
        c.createdAt >= dayStart && c.createdAt <= dayEnd
      );
      
      const dayKnowledge = allKnowledgeEntries.filter((e: any) => {
        const entryDate = e.createdAt || 0;
        return entryDate >= dayStart && entryDate <= dayEnd;
      });
      
      const dayAutoLearned = dayKnowledge.filter((e: any) => 
        e.tags?.includes('auto_learning')
      );

      evolution.push({
        date: dateStr,
        conversations: dayConversations.length,
        learned: dayKnowledge.length,
        autoLearned: dayAutoLearned.length,
      });
    }

    return {
      totalConversations: conversations.length,
      resolvedConversations: resolvedConversations.length,
      successfulConversations: successfulConversations.length,
      learnedFromConversations: knowledgeBySource.conversation,
      autoLearnedFromConversations: knowledgeBySource.auto_learning,
      
      totalTickets: resolvedTickets.length,
      resolvedTickets: resolvedTickets.length,
      successfulTickets: successfulTickets.length,
      learnedFromTickets: knowledgeBySource.ticket,
      autoLearnedFromTickets: 0, // TODO: Separar auto_learning de tickets
      
      totalKnowledgeEntries: allKnowledgeEntries.length,
      knowledgeBySource,
      
      autoLearningRate: Math.round(autoLearningRate * 10) / 10,
      successRate: Math.round(successRate * 10) / 10,
      learningEfficiency: Math.round(learningEfficiency * 10) / 10,
      
      evolution,
    };
  } catch (error) {
    console.error('[learningMetricsService] Erro ao obter métricas:', error);
    return {
      totalConversations: 0,
      resolvedConversations: 0,
      successfulConversations: 0,
      learnedFromConversations: 0,
      autoLearnedFromConversations: 0,
      totalTickets: 0,
      resolvedTickets: 0,
      successfulTickets: 0,
      learnedFromTickets: 0,
      autoLearnedFromTickets: 0,
      totalKnowledgeEntries: 0,
      knowledgeBySource: {
        conversation: 0,
        ticket: 0,
        manual: 0,
        auto_learning: 0,
      },
      autoLearningRate: 0,
      successRate: 0,
      learningEfficiency: 0,
      evolution: [],
    };
  }
};

/**
 * Obtém estatísticas resumidas
 */
export const getLearningStats = async (): Promise<{
  summary: string;
  recommendations: string[];
}> => {
  try {
    const metrics = await getLearningMetrics();
    
    const summary = `
📊 Métricas de Aprendizado:

Conversas:
- Total: ${metrics.totalConversations}
- Resolvidas: ${metrics.resolvedConversations}
- Bem-sucedidas: ${metrics.successfulConversations}
- Aprendidas automaticamente: ${metrics.autoLearnedFromConversations}

Tickets:
- Total resolvidos: ${metrics.resolvedTickets}
- Bem-sucedidos: ${metrics.successfulTickets}
- Aprendidos: ${metrics.learnedFromTickets}

Conhecimento:
- Total de entradas: ${metrics.totalKnowledgeEntries}
- Por fonte:
  * Conversas: ${metrics.knowledgeBySource.conversation}
  * Tickets: ${metrics.knowledgeBySource.ticket}
  * Manual: ${metrics.knowledgeBySource.manual}
  * Auto-aprendizado: ${metrics.knowledgeBySource.auto_learning}

Taxas:
- Taxa de sucesso: ${metrics.successRate}%
- Taxa de auto-aprendizado: ${metrics.autoLearningRate}%
- Eficiência de aprendizado: ${metrics.learningEfficiency}%
`;

    const recommendations: string[] = [];
    
    if (metrics.autoLearningRate < 30) {
      recommendations.push('Taxa de auto-aprendizado está baixa. Considere ajustar critérios de sucesso.');
    }
    
    if (metrics.successRate < 50) {
      recommendations.push('Taxa de sucesso está baixa. Revise respostas do chatbot.');
    }
    
    if (metrics.learningEfficiency < 40) {
      recommendations.push('Eficiência de aprendizado pode ser melhorada. Mais interações bem-sucedidas deveriam ser aprendidas.');
    }
    
    if (metrics.knowledgeBySource.auto_learning === 0) {
      recommendations.push('Nenhum conhecimento foi aprendido automaticamente ainda. Execute processAutoLearning().');
    }

    return {
      summary,
      recommendations,
    };
  } catch (error) {
    console.error('[learningMetricsService] Erro ao obter estatísticas:', error);
    return {
      summary: 'Erro ao obter métricas',
      recommendations: [],
    };
  }
};

export const learningMetricsService = {
  getLearningMetrics,
  getLearningStats,
};

