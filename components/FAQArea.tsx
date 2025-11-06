import React, { useState, useEffect } from 'react';
import { faqService } from '../services/faqService';
import { FAQEntry, FAQCategory } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';

interface FAQAreaProps {
  onOpenTicket?: () => void;
}

const categoryLabels: Record<FAQCategory, string> = {
  compra: 'Compras',
  troca: 'Trocas',
  rastreio: 'Rastreios',
  cancelamento: 'Cancelamentos',
  reembolso: 'Reembolsos',
  sla: 'SLAs',
  geral: 'Geral',
};

const categoryIcons: Record<FAQCategory, string> = {
  compra: '🛍️',
  troca: '🔄',
  rastreio: '📦',
  cancelamento: '❌',
  reembolso: '💰',
  sla: '⏱️',
  geral: '❓',
};

export const FAQArea: React.FC<FAQAreaProps> = ({ onOpenTicket }) => {
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | 'todos'>('todos');
  const [faqEntries, setFaqEntries] = useState<FAQEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FAQEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadFAQEntries();
  }, [selectedCategory]);

  const loadFAQEntries = async () => {
    try {
      const entries = selectedCategory === 'todos'
        ? await faqService.getFAQEntries()
        : await faqService.getFAQEntries(selectedCategory);
      setFaqEntries(entries);
    } catch (error) {
      console.error('Error loading FAQ entries:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await faqService.searchFAQ(query);
      setSearchResults(results);
      
      // Incrementar views das entradas encontradas
      results.forEach(entry => {
        if (entry.id) {
          faqService.incrementFAQViews(entry.id);
        }
      });
    } catch (error) {
      console.error('Error searching FAQ:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        // Incrementar views quando expandir
        faqService.incrementFAQViews(id);
      }
      return newSet;
    });
  };

  const handleHelpful = async (id: string) => {
    try {
      await faqService.markFAQHelpful(id);
      setHelpfulCounts(prev => ({
        ...prev,
        [id]: (prev[id] || 0) + 1,
      }));
    } catch (error) {
      console.error('Error marking FAQ as helpful:', error);
    }
  };

  const displayEntries = searchQuery.trim().length >= 2 ? searchResults : faqEntries;

  return (
    <div className="space-y-6">
      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar no FAQ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Digite sua dúvida..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1"
            />
            {isSearching && (
              <div className="flex items-center text-muted-foreground text-sm">
                Buscando...
              </div>
            )}
          </div>
          {searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-muted-foreground mb-2">
                Não encontramos resultados para "{searchQuery}"
              </p>
              {onOpenTicket && (
                <Button variant="outline" size="sm" onClick={onOpenTicket}>
                  Abrir Chamado de Suporte
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categorias */}
      {searchQuery.trim().length < 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Perguntas Frequentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as FAQCategory | 'todos')}>
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
                <TabsTrigger value="todos">Todos</TabsTrigger>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <TabsTrigger key={key} value={key}>
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{categoryIcons[key as FAQCategory]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(categoryLabels).map(([key]) => (
                <TabsContent key={key} value={key}>
                  <FAQList
                    entries={displayEntries.filter(e => e.category === key)}
                    expandedIds={expandedIds}
                    onToggle={toggleExpanded}
                    onHelpful={handleHelpful}
                    helpfulCounts={helpfulCounts}
                  />
                </TabsContent>
              ))}
              <TabsContent value="todos">
                <FAQList
                  entries={displayEntries}
                  expandedIds={expandedIds}
                  onToggle={toggleExpanded}
                  onHelpful={handleHelpful}
                  helpfulCounts={helpfulCounts}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Resultados da busca */}
      {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Resultados da Busca ({searchResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FAQList
              entries={searchResults}
              expandedIds={expandedIds}
              onToggle={toggleExpanded}
              onHelpful={handleHelpful}
              helpfulCounts={helpfulCounts}
            />
          </CardContent>
        </Card>
      )}

      {/* Link para abrir chamado */}
      {displayEntries.length === 0 && searchQuery.trim().length < 2 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Não encontrou sua resposta? Entre em contato conosco!
              </p>
              {onOpenTicket && (
                <Button onClick={onOpenTicket}>
                  Abrir Chamado de Suporte
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface FAQListProps {
  entries: FAQEntry[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onHelpful: (id: string) => void;
  helpfulCounts: Record<string, number>;
}

const FAQList: React.FC<FAQListProps> = ({
  entries,
  expandedIds,
  onToggle,
  onHelpful,
  helpfulCounts,
}) => {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma pergunta encontrada nesta categoria.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {entries.map((entry) => {
          const isExpanded = entry.id && expandedIds.has(entry.id);
          const helpfulCount = entry.id ? (helpfulCounts[entry.id] || entry.helpful || 0) : 0;

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div
                    className="cursor-pointer"
                    onClick={() => entry.id && onToggle(entry.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                          <span>{categoryIcons[entry.category]}</span>
                          {entry.question}
                        </h3>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 text-sm text-muted-foreground whitespace-pre-line"
                          >
                            {entry.answer}
                          </motion.div>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {categoryLabels[entry.category]}
                      </Badge>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {entry.views || 0} visualizações
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          entry.id && onHelpful(entry.id);
                        }}
                      >
                        👍 Foi útil ({helpfulCount})
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

