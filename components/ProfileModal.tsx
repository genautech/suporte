// Fix: Create the ProfileModal component.
import React, { useState, useEffect } from 'react';
import { User, updateProfile, updateEmail } from 'firebase/auth';
import { auth } from '../firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { motion } from 'framer-motion';

interface ProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, isOpen, onClose, onUpdate }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      const nameParts = user.displayName?.split(' ') || ['', ''];
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(user.email || '');
      setPhone(user.phoneNumber || '');
      setError('');
      setSuccess(false);
    }
  }, [user, isOpen]);
  
  const isNewUserSetup = !user.displayName || !user.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess(false);

    if (!auth.currentUser) {
        setError('Usuário não autenticado.');
        setIsSaving(false);
        return;
    }

    try {
        const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

        if (!displayName) {
          setError('Nome e sobrenome são obrigatórios.');
          setIsSaving(false);
          return;
        }

        // Update profile (name) if it has changed
        if (displayName && auth.currentUser.displayName !== displayName) {
            await updateProfile(auth.currentUser, { displayName });
        }

        // Update email if it's new (only for new users)
        if (email && !auth.currentUser.email && isNewUserSetup) {
             try {
                await updateEmail(auth.currentUser, email);
             } catch (emailError: any) {
                 if (emailError.code === 'auth/email-already-in-use') {
                     throw new Error('Este e-mail já está em uso por outra conta.');
                 }
                 throw emailError;
             }
        }
        
        setSuccess(true);
        setTimeout(() => {
          onUpdate();
          onClose();
        }, 500);

    } catch (err: any) {
        console.error("Failed to update profile", err);
        setError(err.message || 'Ocorreu um erro ao salvar o perfil.');
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl">👤</span>
            {isNewUserSetup ? 'Complete seu Perfil' : 'Editar Perfil'}
          </DialogTitle>
          {isNewUserSetup && (
            <DialogDescription>
              Precisamos de mais algumas informações para personalizar sua experiência.
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm"
            >
              <strong>Erro:</strong> {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-success/10 border border-success/20 text-success rounded-lg text-sm"
            >
              ✅ Perfil atualizado com sucesso!
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome *</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="Seu nome"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome *</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Seu sobrenome"
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!!user.email || isSaving}
              placeholder="seu@email.com"
              className={user.email ? 'bg-muted' : ''}
            />
            {user.email && (
              <p className="text-xs text-muted-foreground mt-1">
                ℹ️ O e-mail não pode ser alterado após definido.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              disabled
              placeholder="(00) 00000-0000"
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              ℹ️ O telefone é definido durante o login e não pode ser alterado aqui.
            </p>
          </div>

          <Card className="bg-muted/50 border-muted">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <strong>Dica:</strong> Mantenha seus dados atualizados para receber notificações importantes sobre seus pedidos e chamados de suporte.
              </p>
            </CardContent>
          </Card>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            {!isNewUserSetup && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSaving || success}
              className="min-w-[120px]"
            >
              {isSaving ? (
                <>
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                  Salvando...
                </>
              ) : success ? (
                'Salvo!'
              ) : (
                'Salvar Perfil'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
