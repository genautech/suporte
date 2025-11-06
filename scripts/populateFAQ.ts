// Script para popular o FAQ com dados iniciais
import { faqService } from '../services/faqService';
import { faqSeedData } from '../data/faqSeedData';

export const populateFAQ = async (): Promise<{ success: number; errors: number }> => {
  let success = 0;
  let errors = 0;

  console.log('Iniciando população do FAQ...');
  
  // Buscar todas as entradas existentes uma vez (usando getAllFAQEntries para evitar filtros)
  let existingEntries: any[] = [];
  try {
    existingEntries = await faqService.getAllFAQEntries();
  } catch (error) {
    console.warn('Erro ao buscar entradas existentes, continuando...', error);
  }

  for (const entry of faqSeedData) {
    try {
      // Verificar se já existe uma entrada com a mesma pergunta (busca em memória)
      const exists = existingEntries.some(e => 
        e.question.toLowerCase() === entry.question.toLowerCase()
      );

      if (!exists) {
        await faqService.createFAQEntry(entry);
        success++;
        console.log(`✓ Criada: ${entry.question}`);
        // Adicionar à lista local para próximas verificações
        existingEntries.push({ ...entry, question: entry.question });
      } else {
        console.log(`⊘ Já existe: ${entry.question}`);
      }
    } catch (error) {
      errors++;
      console.error(`✗ Erro ao criar: ${entry.question}`, error);
    }
  }

  console.log(`\nPopulação concluída: ${success} criadas, ${errors} erros`);
  return { success, errors };
};

// Função para ser chamada manualmente ou automaticamente
export const checkAndPopulateFAQ = async (): Promise<void> => {
  try {
    const entries = await faqService.getFAQEntries();
    
    // Se não houver entradas, popular automaticamente
    if (entries.length === 0) {
      console.log('FAQ vazio detectado. Populando com dados iniciais...');
      await populateFAQ();
    } else {
      console.log(`FAQ já possui ${entries.length} entradas.`);
    }
  } catch (error) {
    console.error('Erro ao verificar FAQ:', error);
  }
};

