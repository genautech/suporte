// Serviço para otimizar contexto do Gemini
// Resumir e priorizar conhecimento quando contexto fica muito longo

import { customerKnowledgeService } from './customerKnowledgeService';
import { faqService } from './faqService';
import { knowledgeBaseService } from './knowledgeBaseService';

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
 * Otimiza contexto completo (FAQ + Cliente + Base de Conhecimento)
 */
export const optimizeFullContext = async (
  customerEmail?: string,
  companyId?: string
): Promise<string> => {
  try {
    // Calcular tamanhos proporcionais
    const totalMaxLength = MAX_CONTEXT_LENGTH;
    const faqMaxLength = Math.floor(totalMaxLength * 0.5); // 50% para FAQ
    const customerMaxLength = Math.floor(totalMaxLength * 0.3); // 30% para cliente
    const kbMaxLength = Math.floor(totalMaxLength * 0.2); // 20% para base de conhecimento

    const [faqContext, customerContext] = await Promise.all([
      optimizeFAQContext(companyId, faqMaxLength),
      optimizeCustomerContext(customerEmail, companyId, customerMaxLength),
    ]);

    // Buscar base de conhecimento se necessário
    let kbContext = '';
    if (customerEmail) {
      try {
        const kbResult = await knowledgeBaseService.searchKnowledgeBase(
          '', // Busca vazia retorna entradas recentes
          false,
          companyId
        );
        
        if (kbResult.sources.length > 0) {
          const kbText = kbResult.sources
            .slice(0, 3) // Limitar a 3 entradas
            .map(entry => `${entry.title}\n${entry.content.substring(0, 200)}...`)
            .join('\n\n');
          
          if (kbText.length <= kbMaxLength) {
            kbContext = `\n\nBASE DE CONHECIMENTO:\n${kbText}`;
          }
        }
      } catch (error) {
        console.error('[contextOptimizer] Erro ao buscar base de conhecimento:', error);
      }
    }

    // Combinar contextos
    const fullContext = [faqContext, customerContext, kbContext]
      .filter(c => c.length > 0)
      .join('\n');

    // Se ainda muito longo, resumir tudo
    if (fullContext.length > MAX_CONTEXT_LENGTH) {
      return summarizeText(fullContext, MAX_CONTEXT_LENGTH);
    }

    return fullContext;
  } catch (error) {
    console.error('[contextOptimizer] Erro ao otimizar contexto completo:', error);
    return '';
  }
};

