// Serviço para detectar perguntas semelhantes em conversas, customerKnowledge e defaultResponses
import { conversationService } from './conversationService';
import { customerKnowledgeService } from './customerKnowledgeService';
import { defaultResponseService } from './defaultResponseService';
import { normalizeQuestion, isSimilarQuestion } from './questionTracker';
import { filterPersonalData } from './privacyFilter';
import { Conversation } from '../types';

interface SimilarQuestionMatch {
  question: string;
  answer: string;
  source: 'conversation' | 'customerKnowledge' | 'defaultResponse';
  sourceId?: string;
  similarity: number; // 0-1
}

/**
 * Busca perguntas semelhantes em conversas da empresa
 */
export const findSimilarInConversations = async (
  question: string,
  companyId: string,
  currentUserEmail?: string
): Promise<SimilarQuestionMatch[]> => {
  try {
    const conversations = await conversationService.getConversationsByCompany(companyId);
    const matches: SimilarQuestionMatch[] = [];
    const normalizedQuestion = normalizeQuestion(question);
    
    for (const conv of conversations) {
      // Pular conversa atual se for do mesmo usuário
      if (currentUserEmail && conv.userId.toLowerCase() === currentUserEmail.toLowerCase()) {
        continue;
      }
      
      // Buscar perguntas/respostas genéricas na conversa
      for (let i = 0; i < conv.messages.length - 1; i++) {
        const userMsg = conv.messages[i];
        const botMsg = conv.messages[i + 1];
        
        if (userMsg.sender === 'user' && botMsg.sender === 'bot') {
          // Filtrar dados pessoais antes de comparar
          const sanitizedUserMsg = filterPersonalData(userMsg.text, currentUserEmail);
          const sanitizedBotMsg = filterPersonalData(botMsg.text, currentUserEmail);
          
          // Verificar se é genérico (não contém dados pessoais removidos)
          if (sanitizedUserMsg.includes('[email_removido]') || 
              sanitizedUserMsg.includes('[pedido_removido]') ||
              sanitizedBotMsg.includes('[email_removido]') || 
              sanitizedBotMsg.includes('[pedido_removido]')) {
            continue; // Pular se contém dados pessoais
          }
          
          // Comparar similaridade
          if (isSimilarQuestion(normalizedQuestion, normalizeQuestion(sanitizedUserMsg))) {
            const similarity = calculateSimilarityScore(normalizedQuestion, normalizeQuestion(sanitizedUserMsg));
            matches.push({
              question: sanitizedUserMsg,
              answer: sanitizedBotMsg,
              source: 'conversation',
              sourceId: conv.id,
              similarity,
            });
          }
        }
      }
    }
    
    // Ordenar por similaridade (maior primeiro)
    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  } catch (error) {
    console.error('[similarQuestionService] Erro ao buscar em conversas:', error);
    return [];
  }
};

/**
 * Busca perguntas semelhantes em customerKnowledge da empresa
 */
export const findSimilarInCustomerKnowledge = async (
  question: string,
  companyId: string
): Promise<SimilarQuestionMatch[]> => {
  try {
    // Buscar conhecimento de todos os clientes da empresa
    // Nota: Isso requer uma query que busque por companyId
    // Por enquanto, vamos buscar conhecimento genérico apenas
    const matches: SimilarQuestionMatch[] = [];
    const normalizedQuestion = normalizeQuestion(question);
    
    // TODO: Implementar busca por companyId no customerKnowledgeService
    // Por enquanto, retornar vazio pois customerKnowledge é por cliente específico
    // e não por empresa
    
    return matches;
  } catch (error) {
    console.error('[similarQuestionService] Erro ao buscar em customerKnowledge:', error);
    return [];
  }
};

/**
 * Busca perguntas semelhantes em defaultResponses da empresa
 */
export const findSimilarInDefaultResponses = async (
  question: string,
  companyId: string
): Promise<SimilarQuestionMatch[]> => {
  try {
    const responses = await defaultResponseService.getDefaultResponses(companyId, true);
    const matches: SimilarQuestionMatch[] = [];
    const normalizedQuestion = normalizeQuestion(question);
    
    for (const response of responses) {
      const normalizedResponseQuestion = normalizeQuestion(response.question);
      
      if (isSimilarQuestion(normalizedQuestion, normalizedResponseQuestion)) {
        const similarity = calculateSimilarityScore(normalizedQuestion, normalizedResponseQuestion);
        matches.push({
          question: response.question,
          answer: response.answer,
          source: 'defaultResponse',
          sourceId: response.id,
          similarity,
        });
      }
    }
    
    // Ordenar por similaridade (maior primeiro)
    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  } catch (error) {
    console.error('[similarQuestionService] Erro ao buscar em defaultResponses:', error);
    return [];
  }
};

/**
 * Busca perguntas semelhantes em todas as fontes
 */
export const findSimilarQuestions = async (
  question: string,
  companyId: string,
  currentUserEmail?: string
): Promise<SimilarQuestionMatch[]> => {
  const [conversationMatches, knowledgeMatches, defaultResponseMatches] = await Promise.all([
    findSimilarInConversations(question, companyId, currentUserEmail),
    findSimilarInCustomerKnowledge(question, companyId),
    findSimilarInDefaultResponses(question, companyId),
  ]);
  
  // Combinar todos os matches
  const allMatches = [
    ...conversationMatches,
    ...knowledgeMatches,
    ...defaultResponseMatches,
  ];
  
  // Ordenar por similaridade e remover duplicatas
  const uniqueMatches = allMatches
    .sort((a, b) => b.similarity - a.similarity)
    .filter((match, index, self) => 
      index === self.findIndex(m => m.answer === match.answer)
    )
    .slice(0, 5);
  
  return uniqueMatches;
};

/**
 * Calcula score de similaridade (0-1)
 */
const calculateSimilarityScore = (question1: string, question2: string): number => {
  if (question1 === question2) {
    return 1.0;
  }
  
  if (question1.includes(question2) || question2.includes(question1)) {
    return 0.9;
  }
  
  const words1 = question1.split(' ').filter(w => w.length > 2);
  const words2 = question2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }
  
  const commonWords = words1.filter(w => words2.includes(w));
  const similarity = commonWords.length / Math.max(words1.length, words2.length);
  
  return similarity;
};

/**
 * Encontra a melhor resposta padrão para uma pergunta
 */
export const findBestDefaultResponse = async (
  question: string,
  companyId: string,
  threshold: number = 0.7
): Promise<SimilarQuestionMatch | null> => {
  const matches = await findSimilarInDefaultResponses(question, companyId);
  
  if (matches.length === 0) {
    return null;
  }
  
  const bestMatch = matches[0];
  
  if (bestMatch.similarity >= threshold) {
    return bestMatch;
  }
  
  return null;
};








