// Serviço para rastrear perguntas feitas e evitar repetições

/**
 * Normaliza uma pergunta para comparação
 */
export const normalizeQuestion = (question: string): string => {
  return question
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .replace(/\s+/g, ' ') // Normaliza espaços
    .substring(0, 100); // Limita tamanho
};

/**
 * Verifica se uma pergunta é similar a outra (para evitar variações)
 */
export const isSimilarQuestion = (question1: string, question2: string): boolean => {
  const normalized1 = normalizeQuestion(question1);
  const normalized2 = normalizeQuestion(question2);
  
  // Verifica se são idênticas após normalização
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Verifica se uma contém a outra (para variações)
  if (normalized1.length > 20 && normalized2.length > 20) {
    const words1 = normalized1.split(' ');
    const words2 = normalized2.split(' ');
    
    // Se mais de 70% das palavras coincidem, considera similar
    const commonWords = words1.filter(w => words2.includes(w));
    const similarity = commonWords.length / Math.max(words1.length, words2.length);
    
    return similarity >= 0.7;
  }
  
  return false;
};

/**
 * Verifica se uma pergunta já foi feita anteriormente
 */
export const hasQuestionBeenAsked = (
  question: string,
  askedQuestions: string[] = []
): boolean => {
  if (askedQuestions.length === 0) {
    return false;
  }
  
  return askedQuestions.some(asked => isSimilarQuestion(question, asked));
};

/**
 * Extrai perguntas de uma mensagem do bot
 */
export const extractQuestionFromMessage = (message: string): string | null => {
  // Padrões comuns de perguntas
  const questionPatterns = [
    /(?:^|\n)([^.!?]*\?[^.!?]*)/g, // Texto com interrogação
    /(?:^|\n)(?:pode|poderia|você|voce|qual|quais|onde|quando|como|por que|porque|quem|o que|que)\s+[^.!?]*[.!?]?/gi, // Frases que começam com palavras interrogativas
  ];
  
  for (const pattern of questionPatterns) {
    const matches = message.match(pattern);
    if (matches && matches.length > 0) {
      // Retorna a primeira pergunta encontrada
      return matches[0].trim();
    }
  }
  
  // Se não encontrou padrão claro, verifica se a mensagem termina com "?"
  if (message.trim().endsWith('?')) {
    return message.trim();
  }
  
  return null;
};

/**
 * Adiciona uma pergunta à lista de perguntas feitas
 */
export const addAskedQuestion = (
  question: string,
  askedQuestions: string[] = []
): string[] => {
  const normalized = normalizeQuestion(question);
  
  // Não adiciona se já existe similar
  if (hasQuestionBeenAsked(question, askedQuestions)) {
    return askedQuestions;
  }
  
  // Adiciona e mantém apenas as últimas 10 perguntas
  return [...askedQuestions, normalized].slice(-10);
};

/**
 * Busca perguntas semelhantes em outras conversas da empresa
 */
export const findSimilarQuestionsInCompany = async (
  question: string,
  companyId: string,
  currentUserEmail?: string
): Promise<Array<{ question: string; answer: string; similarity: number }>> => {
  try {
    // Importar serviço de perguntas semelhantes
    const { findSimilarInConversations } = await import('./similarQuestionService');
    const matches = await findSimilarInConversations(question, companyId, currentUserEmail);
    
    return matches.map(m => ({
      question: m.question,
      answer: m.answer,
      similarity: m.similarity,
    }));
  } catch (error) {
    console.error('[questionTracker] Erro ao buscar perguntas semelhantes na empresa:', error);
    return [];
  }
};

