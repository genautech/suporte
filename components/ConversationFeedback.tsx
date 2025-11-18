// Componente para coletar feedback sobre a conversa do chatbot
import React, { useState } from 'react';
import { conversationService } from '../services/conversationService';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface ConversationFeedbackProps {
  conversationId: string;
  onSubmitted?: () => void;
  onSkip?: () => void;
}

export const ConversationFeedback: React.FC<ConversationFeedbackProps> = ({
  conversationId,
  onSubmitted,
  onSkip,
}) => {
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (npsScore === null) return;

    setIsSubmitting(true);
    try {
      await conversationService.addFeedback(conversationId, npsScore, comment || undefined, true); // true = isNps
      setSubmitted(true);
      if (onSubmitted) {
        setTimeout(() => {
          onSubmitted();
        }, 2000);
      }
    } catch (error) {
      console.error('[ConversationFeedback] Erro ao salvar feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-4 bg-success/10 border-success/20">
        <p className="text-sm text-center text-success">
          Obrigado pelo seu feedback! Ele nos ajuda a melhorar.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-base-100 border-border">
      <h4 className="font-semibold mb-2 text-sm">Como foi seu atendimento?</h4>
      <p className="text-xs text-muted-foreground mb-3">
        Em uma escala de 0 a 10, qual a probabilidade de você recomendar nosso serviço a um amigo ou colega?
      </p>

      {/* Escala NPS 0-10 */}
      <div className="mb-3">
        <div className="flex gap-1 justify-between mb-2">
          <span className="text-xs text-muted-foreground">Não recomendaria</span>
          <span className="text-xs text-muted-foreground">Recomendaria com certeza</span>
        </div>
        <div className="flex gap-1 flex-wrap justify-center">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => setNpsScore(score)}
              className={`w-10 h-10 rounded-md text-sm font-semibold transition-colors ${
                npsScore !== null && score === npsScore
                  ? score >= 9
                    ? 'bg-green-500 text-white'
                    : score >= 7
                    ? 'bg-yellow-500 text-white'
                    : 'bg-red-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              disabled={isSubmitting}
            >
              {score}
            </button>
          ))}
        </div>
        {npsScore !== null && (
          <p className="text-xs text-center mt-2 text-muted-foreground">
            {npsScore >= 9
              ? 'Promotor - Obrigado!'
              : npsScore >= 7
              ? 'Neutro - Obrigado pelo feedback!'
              : 'Detrator - Vamos melhorar!'}
          </p>
        )}
      </div>

      {/* Comentário opcional */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Deixe um comentário (opcional)..."
        className="textarea textarea-bordered w-full text-sm mb-3"
        rows={2}
        disabled={isSubmitting}
      />

      {/* Botões */}
      <div className="flex gap-2 justify-end">
        {onSkip && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
            disabled={isSubmitting}
          >
            Pular
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={npsScore === null || isSubmitting}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar'}
        </Button>
      </div>
    </Card>
  );
};







