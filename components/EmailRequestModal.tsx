import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface EmailRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => void;
  orderId?: string;
  reason?: string;
}

export const EmailRequestModal: React.FC<EmailRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  orderId,
  reason
}) => {
  const [email, setEmail] = useState('');
  const [isValid, setIsValid] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setIsValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSubmit(email);
      setEmail('');
      setIsValid(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {orderId ? `Buscar Pedido #${orderId}` : 'Informe seu Email'}
          </DialogTitle>
          {reason && (
            <DialogDescription className="pt-2">
              <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-sm rounded-md">
                {reason}
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu-email@exemplo.com"
              className={isValid && email ? 'border-green-500' : ''}
              value={email}
              onChange={handleEmailChange}
              autoFocus
              required
            />
            {email && !isValid && (
              <p className="text-xs text-destructive">Email inválido</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid}
            >
              Continuar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

