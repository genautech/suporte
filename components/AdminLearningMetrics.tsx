// Componente para visualizar métricas de aprendizado
import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { learningMetricsService } from '../services/learningMetricsService';

interface LearningMetrics {
  totalConversations: number;
  resolvedConversations: number;
  successfulConversations: number;
  learnedFromConversations: number;
  autoLearnedFromConversations: number;
  totalTickets: number;
  resolvedTickets: number;
  successfulTickets: number;
  learnedFromTickets: number;
  autoLearnedFromTickets: number;
  totalKnowledgeEntries: number;
  knowledgeBySource: {
    conversation: number;
    ticket: number;
    manual: number;
    auto_learning: number;
  };
  autoLearningRate: number;
  successRate: number;
  learningEfficiency: number;
  evolution: Array<{
    date: string;
    conversations: number;
    learned: number;
    autoLearned: number;
  }>;
}

export const AdminLearningMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await learningMetricsService.getLearningMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar métricas');
      console.error('[AdminLearningMetrics] Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-error">Erro: {error}</div>
        <button className="btn btn-sm btn-primary mt-4" onClick={loadMetrics}>
          Tentar Novamente
        </button>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Métricas de Aprendizado</h2>
        <button className="btn btn-sm btn-primary" onClick={loadMetrics}>
          Atualizar
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Taxa de Sucesso</div>
          <div className="text-3xl font-bold">{metrics.successRate}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            {metrics.successfulConversations + metrics.successfulTickets} de{' '}
            {metrics.totalConversations + metrics.totalTickets} interações
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Taxa de Auto-Aprendizado</div>
          <div className="text-3xl font-bold">{metrics.autoLearningRate}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            {metrics.autoLearnedFromConversations} entradas aprendidas automaticamente
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Eficiência de Aprendizado</div>
          <div className="text-3xl font-bold">{metrics.learningEfficiency}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            Interações bem-sucedidas que foram aprendidas
          </div>
        </Card>
      </div>

      {/* Conversas */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Conversas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{metrics.totalConversations}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Resolvidas</div>
            <div className="text-2xl font-bold">{metrics.resolvedConversations}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Bem-sucedidas</div>
            <div className="text-2xl font-bold text-success">{metrics.successfulConversations}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Auto-aprendidas</div>
            <div className="text-2xl font-bold text-primary">{metrics.autoLearnedFromConversations}</div>
          </div>
        </div>
      </Card>

      {/* Tickets */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Tickets</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Total Resolvidos</div>
            <div className="text-2xl font-bold">{metrics.resolvedTickets}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Bem-sucedidos</div>
            <div className="text-2xl font-bold text-success">{metrics.successfulTickets}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Aprendidos</div>
            <div className="text-2xl font-bold">{metrics.learnedFromTickets}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Auto-aprendidos</div>
            <div className="text-2xl font-bold text-primary">{metrics.autoLearnedFromTickets}</div>
          </div>
        </div>
      </Card>

      {/* Conhecimento por Fonte */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Conhecimento por Fonte</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Conversas</div>
            <div className="text-2xl font-bold">{metrics.knowledgeBySource.conversation}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Tickets</div>
            <div className="text-2xl font-bold">{metrics.knowledgeBySource.ticket}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Manual</div>
            <div className="text-2xl font-bold">{metrics.knowledgeBySource.manual}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Auto-aprendizado</div>
            <div className="text-2xl font-bold text-primary">{metrics.knowledgeBySource.auto_learning}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm text-muted-foreground">Total de Entradas</div>
          <div className="text-3xl font-bold">{metrics.totalKnowledgeEntries}</div>
        </div>
      </Card>

      {/* Evolução (últimos 30 dias) */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Evolução (Últimos 30 Dias)</h3>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Data</th>
                <th>Conversas</th>
                <th>Aprendidas</th>
                <th>Auto-aprendidas</th>
              </tr>
            </thead>
            <tbody>
              {metrics.evolution.slice(-7).map((day, idx) => (
                <tr key={idx}>
                  <td>{new Date(day.date).toLocaleDateString('pt-BR')}</td>
                  <td>{day.conversations}</td>
                  <td>{day.learned}</td>
                  <td className="text-primary font-semibold">{day.autoLearned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};



