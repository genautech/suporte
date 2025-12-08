import React, { useState } from 'react';
import { faqService } from '../services/faqService';
import { knowledgeBaseService } from '../services/knowledgeBaseService';
import { searchIntelligentFAQ } from '../services/geminiService';
import { FAQEntry } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { getGeminiResponse } from '../services/geminiService';
import { Message, MessageSender } from '../types';
import { motion } from 'framer-motion';

interface IntelligentFAQSearchProps {
  onOpenTicket?: () => void;
  companyId?: string; // ID da empresa para filtrar FAQ
}

export const IntelligentFAQSearch: React.FC<IntelligentFAQSearchProps> = ({ onOpenTicket, companyId }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [faqResults, setFaqResults] = useState<FAQEntry[]>([]);
  const [geminiAnswer, setGeminiAnswer] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setFaqResults([]);
    setGeminiAnswer(null);
    setSuggestedQuestions([]);

    try {
      // 1. Buscar no FAQ primeiro (filtrar por companyId)
      const faqResults = await faqService.searchFAQ(query, companyId);
      setFaqResults(faqResults);

      // 2. Buscar na base de conhecimento (filtrar por companyId)
      const kbResult = await knowledgeBaseService.searchKnowledgeBase(query, false, companyId);
      
      // 3. Usar busca inteligente com Gemini (filtrar por companyId)
      const intelligentResult = await searchIntelligentFAQ(query, companyId);
      
      if (intelligentResult.answer) {
        setGeminiAnswer(intelligentResult.answer);
        
        // Adicionar perguntas sugeridas se disponíveis
        if (intelligentResult.suggestedQuestions) {
          setSuggestedQuestions(intelligentResult.suggestedQuestions);
        }
      } else if (faqResults.length > 0) {
        // Fallback: usar primeira resposta do FAQ
        setGeminiAnswer(`Baseado nas informações do nosso FAQ:\n\n${faqResults[0].answer}`);
      }
    } catch (error) {
      console.error('Error in intelligent search:', error);
      setGeminiAnswer('Desculpe, ocorreu um erro ao buscar informações. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Busca Inteligente de Dúvidas</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Use nossa busca inteligente para encontrar respostas rápidas ou tirar dúvidas usando inteligência artificial.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Digite sua dúvida ou pergunta..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
            {isSearching ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>

        {isSearching && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              Buscando respostas inteligentes...
            </div>
          </div>
        )}

        {/* Resultados do FAQ */}
        {!isSearching && faqResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="font-semibold text-sm text-muted-foreground">
              Resultados Encontrados no FAQ ({faqResults.length})
            </h3>
            {faqResults.slice(0, 3).map((entry) => (
              <Card key={entry.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0">
                      FAQ
                    </Badge>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">{entry.question}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {entry.answer}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        {/* Resposta do Gemini */}
        {!isSearching && geminiAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-primary">
                🤖 Resposta Inteligente
              </Badge>
            </div>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <p className="text-sm whitespace-pre-line">{geminiAnswer}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Perguntas sugeridas */}
        {!isSearching && suggestedQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <h3 className="font-semibold text-sm text-muted-foreground">
              Perguntas Relacionadas
            </h3>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery(question);
                    handleSearch();
                  }}
                  className="text-xs"
                >
                  {question}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sem resultados */}
        {!isSearching && query && faqResults.length === 0 && !geminiAnswer && (
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">
              Não encontramos uma resposta direta para sua pergunta.
            </p>
            {onOpenTicket && (
              <Button onClick={onOpenTicket}>
                Abrir Chamado de Suporte
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

