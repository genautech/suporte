// Serviço para otimizar contexto do Gemini
// Resumir e priorizar conhecimento quando contexto fica muito longo

import { customerKnowledgeService } from './customerKnowledgeService';
import { faqService } from './faqService';
import { knowledgeBaseService } from './knowledgeBaseService';
import { defaultResponseService } from './defaultResponseService';
import { filterPersonalData, filterContextForPrivacy } from './privacyFilter';

const MAX_CONTEXT_LENGTH = 8000; // Caracteres máximos para contexto
const TARGET_CONTEXT_LENGTH = 6000; // Tamanho ideal

/**
 * Resumo inteligente de texto usando heurísticas
 */
const summarizeText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }

  // Dividir em parágrafos
  const paragraphs = text.split('\n\n');
  const summary: string[] = [];
  let currentLength = 0;

  for (const paragraph of paragraphs) {
    if (currentLength + paragraph.length > maxLength) {
      // Tentar resumir o parágrafo
      const sentences = paragraph.split(/[.!?]\s+/);
      const importantSentences = sentences.slice(0, Math.ceil(sentences.length * 0.7));
      const summarizedParagraph = importantSentences.join('. ') + '.';
      
      if (currentLength + summarizedParagraph.length <= maxLength) {
        summary.push(summarizedParagraph);
        currentLength += summarizedParagraph.length;
      }
      break;
    } else {
      summary.push(paragraph);
      currentLength += paragraph.length;
    }
  }

  return summary.join('\n\n');
};

/**
 * Prioriza conhecimento por relevância
 */
const prioritizeKnowledge = (entries: Array<{
  text: string;
  createdAt: number;
  confidence?: number;
  usageCount?: number;
}>): Array<{
  text: string;
  score: number;
}> => {
  const now = Date.now();
  const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 dias

  return entries
    .map(entry => {
      let score = 0.5; // Base

      // Recência (mais recente = maior score)
      const age = now - entry.createdAt;
      const recencyScore = Math.max(0, 1 - (age / maxAge));
      score += recencyScore * 0.3;

      // Confiança (se disponível)
      if (entry.confidence !== undefined) {
        score += entry.confidence * 0.2;
      }

      // Uso (se disponível)
      if (entry.usageCount !== undefined && entry.usageCount > 0) {
        score += Math.min(0.2, entry.usageCount / 10);
      }

      return {
        text: entry.text,
        score: Math.min(1, score),
      };
    })
    .sort((a, b) => b.score - a.score); // Ordenar por score decrescente
};

/**
 * Otimiza contexto do FAQ
 */
export const optimizeFAQContext = async (
  companyId?: string,
  maxLength: number = TARGET_CONTEXT_LENGTH
): Promise<string> => {
  try {
    const faqs = await faqService.getFAQEntries(undefined, companyId);
    
    if (faqs.length === 0) {
      return '';
    }

    // Formatar FAQs
    let faqText = faqs
      .map(faq => `Q: ${faq.question}\nR: ${faq.answer}`)
      .join('\n\n');

    // Se muito longo, resumir
    if (faqText.length > maxLength) {
      faqText = summarizeText(faqText, maxLength);
    }

    return `\n\nFAQ DISPONÍVEL (Base de Conhecimento):
${faqText}

Use estas informações quando o usuário fizer perguntas relacionadas.
Seja natural e não cite literalmente, mas use o conhecimento para responder de forma amigável.`;
  } catch (error) {
    console.error('[contextOptimizer] Erro ao otimizar FAQ context:', error);
    return '';
  }
};

/**
 * Otimiza contexto do cliente
 */
export const optimizeCustomerContext = async (
  customerEmail?: string,
  companyId?: string,
  maxLength: number = 2000
): Promise<string> => {
  if (!customerEmail) {
    return '';
  }

  try {
    const knowledge = await customerKnowledgeService.getCustomerKnowledge(customerEmail);
    if (!knowledge || knowledge.knowledgeEntries.length === 0) {
      return '';
    }

    // Preparar entradas com metadados
    const entries = knowledge.knowledgeEntries.map(entry => {
      // Extrair confidence dos tags se disponível
      const confidenceTag = entry.tags.find(t => t.startsWith('confidence_'));
      const confidence = confidenceTag 
        ? parseInt(confidenceTag.replace('confidence_', '')) / 10 
        : undefined;

      return {
        text: entry.content,
        createdAt: entry.createdAt,
        confidence,
        usageCount: 0, // TODO: Implementar rastreamento de uso
      };
    });

    // Priorizar e limitar
    const prioritized = prioritizeKnowledge(entries)
      .slice(0, 10) // Top 10 mais relevantes
      .map(e => e.text);

    let contextText = prioritized.join('\n\n');

    // Se muito longo, resumir
    if (contextText.length > maxLength) {
      contextText = summarizeText(contextText, maxLength);
    }

    return `\n\nCONHECIMENTO ESPECÍFICO DO CLIENTE (${customerEmail}):
${contextText}

Use este conhecimento específico do cliente quando relevante para responder perguntas similares.`;
  } catch (error) {
    console.error('[contextOptimizer] Erro ao otimizar customer context:', error);
    return '';
  }
};

/**
 * Otimiza contexto da Base de Conhecimento (Treinamento da IA)
 */
export const optimizeKnowledgeBaseContext = async (
  companyId?: string,
  maxLength: number = 2000
): Promise<string> => {
  try {
    // Buscar entradas verificadas da base de conhecimento (sempre, não apenas quando há customerEmail)
    const kbEntries = await knowledgeBaseService.getKnowledgeBaseEntries({
      companyId,
      verified: true, // Apenas entradas verificadas
    });
    
    if (kbEntries.length === 0) {
      return '';
    }

    // Priorizar entradas mais recentes e relevantes
    const prioritizedEntries = kbEntries
      .sort((a, b) => b.updatedAt - a.updatedAt) // Mais recentes primeiro
      .slice(0, 10); // Top 10 mais recentes

    // Formatar entradas
    let kbText = prioritizedEntries
      .map(entry => {
        // Incluir título, conteúdo e tags se disponíveis
        const tagsText = entry.tags && entry.tags.length > 0 
          ? `\nTags: ${entry.tags.join(', ')}` 
          : '';
        const categoryText = entry.category 
          ? `\nCategoria: ${entry.category}` 
          : '';
        return `${entry.title}${categoryText}${tagsText}\n${entry.content}`;
      })
      .join('\n\n---\n\n');

    // Se muito longo, resumir
    if (kbText.length > maxLength) {
      kbText = summarizeText(kbText, maxLength);
    }

    return `\n\nBASE DE CONHECIMENTO (Treinamento da IA):
${kbText}

Esta é a base de conhecimento geral do sistema, criada e verificada por administradores.
Use estas informações como referência principal para responder perguntas dos usuários.
Sempre priorize este conhecimento sobre outras fontes quando relevante.`;
  } catch (error) {
    console.error('[contextOptimizer] Erro ao otimizar base de conhecimento:', error);
    return '';
  }
};

/**
 * Otimiza contexto de respostas padrão
 */
export const optimizeDefaultResponsesContext = async (
  companyId?: string,
  maxLength: number = 1500
): Promise<string> => {
  if (!companyId) {
    return '';
  }
  
  try {
    const responses = await defaultResponseService.getDefaultResponses(companyId, true);
    
    if (responses.length === 0) {
      return '';
    }
    
    // Priorizar respostas mais usadas
    const sortedResponses = responses
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5); // Top 5 mais usadas
    
    let contextText = sortedResponses
      .map(response => `P: ${response.question}\nR: ${response.answer}`)
      .join('\n\n');
    
    if (contextText.length > maxLength) {
      contextText = summarizeText(contextText, maxLength);
    }
    
    return `\n\nRESPOSTAS PADRÃO DISPONÍVEIS:
${contextText}

Use estas respostas padrão quando a pergunta do usuário for semelhante.
Priorize respostas padrão sobre outras fontes quando aplicável.`;
  } catch (error) {
    console.error('[contextOptimizer] Erro ao otimizar respostas padrão:', error);
    return '';
  }
};

/**
 * Otimiza contexto completo (FAQ + Cliente + Base de Conhecimento + Respostas Padrão)
 */
export const optimizeFullContext = async (
  customerEmail?: string,
  companyId?: string,
  allowedOrderNumbers: string[] = []
): Promise<string> => {
  try {
    // Calcular tamanhos proporcionais
    const totalMaxLength = MAX_CONTEXT_LENGTH;
    const faqMaxLength = Math.floor(totalMaxLength * 0.30); // 30% para FAQ
    const customerMaxLength = Math.floor(totalMaxLength * 0.20); // 20% para cliente
    const kbMaxLength = Math.floor(totalMaxLength * 0.30); // 30% para base de conhecimento
    const defaultResponsesMaxLength = Math.floor(totalMaxLength * 0.20); // 20% para respostas padrão

    // Buscar todos os contextos em paralelo
    const [faqContext, customerContext, kbContext, defaultResponsesContext] = await Promise.all([
      optimizeFAQContext(companyId, faqMaxLength),
      optimizeCustomerContext(customerEmail, companyId, customerMaxLength),
      optimizeKnowledgeBaseContext(companyId, kbMaxLength),
      optimizeDefaultResponsesContext(companyId, defaultResponsesMaxLength),
    ]);

    // Combinar contextos (Respostas Padrão primeiro, depois Base de Conhecimento)
    const fullContext = [defaultResponsesContext, kbContext, faqContext, customerContext]
      .filter(c => c.length > 0)
      .join('\n');

    // Filtrar dados pessoais antes de retornar
    let filteredContext = fullContext;
    if (customerEmail) {
      filteredContext = filterPersonalData(fullContext, customerEmail, allowedOrderNumbers);
    }

    // Se ainda muito longo, resumir tudo (mas manter Respostas Padrão e Base de Conhecimento)
    if (filteredContext.length > MAX_CONTEXT_LENGTH) {
      // Tentar manter Respostas Padrão e Base de Conhecimento completas
      if (defaultResponsesContext.length > 0 && kbContext.length > 0) {
        const remainingLength = MAX_CONTEXT_LENGTH - defaultResponsesContext.length - kbContext.length - 200;
        const otherContext = [faqContext, customerContext]
          .filter(c => c.length > 0)
          .join('\n');
        const summarizedOther = summarizeText(otherContext, Math.max(0, remainingLength));
        return [defaultResponsesContext, kbContext, summarizedOther]
          .filter(c => c.length > 0)
          .join('\n');
      }
      return summarizeText(filteredContext, MAX_CONTEXT_LENGTH);
    }

    return filteredContext;
  } catch (error) {
    console.error('[contextOptimizer] Erro ao otimizar contexto completo:', error);
    return '';
  }
};

