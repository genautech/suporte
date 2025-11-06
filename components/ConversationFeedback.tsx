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
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === null) return;

    setIsSubmitting(true);
    try {
      await conversationService.addFeedback(conversationId, rating, comment || undefined);
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
        Sua opinião é muito importante para melhorarmos nosso serviço.
      </p>

      {/* Estrelas */}
      <div className="flex gap-1 mb-3 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`text-2xl ${
              rating !== null && star <= rating
                ? 'text-yellow-400'
                : 'text-gray-300 hover:text-yellow-300'
            } transition-colors`}
            disabled={isSubmitting}
          >
            ★
          </button>
        ))}
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
          disabled={rating === null || isSubmitting}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar'}
        </Button>
      </div>
    </Card>
  );
};

