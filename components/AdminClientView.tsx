// Componente para visualização do admin como cliente
import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { companyService } from '../services/companyService';
import UserDashboard from './UserDashboard';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { motion } from 'framer-motion';

interface AdminClientViewProps {
  adminSelectedCompanyId?: string;
  onLogout: () => void;
  onSwitchToAdmin: () => void;
}

export const AdminClientView: React.FC<AdminClientViewProps> = ({
  adminSelectedCompanyId,
  onLogout,
  onSwitchToAdmin,
}) => {
  const [mockUser, setMockUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [realClientEmail, setRealClientEmail] = useState<string>('');
  const [showEmailInput, setShowEmailInput] = useState(false);

  const loadMockUser = useCallback(async () => {
    let displayName = 'Cliente';
    let email = 'cliente@exemplo.com';
    
    if (adminSelectedCompanyId && adminSelectedCompanyId !== 'general') {
      try {
        const company = await companyService.getCompany(adminSelectedCompanyId);
        if (company) {
          displayName = company.name;
          // Criar email fictício baseado no nome da empresa
          const emailDomain = company.name.toLowerCase().replace(/\s+/g, '') + '.com';
          email = `cliente@${emailDomain}`;
        }
      } catch (error) {
        console.error('Error loading company:', error);
      }
    } else {
      displayName = 'Cliente Geral';
      email = 'cliente@exemplo.com';
    }
    
    const user: User = {
      uid: `admin-mock-user-${adminSelectedCompanyId || 'general'}`,
      email: email,
      displayName: displayName,
      phoneNumber: null,
      photoURL: null,
      emailVerified: false,
      isAnonymous: false,
      metadata: {} as any,
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => '',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
    } as User;
    
    setMockUser(user);
    setIsLoading(false);
  }, [adminSelectedCompanyId]);

  useEffect(() => {
    loadMockUser();
  }, [loadMockUser]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (realClientEmail.trim()) {
      setShowEmailInput(false);
      // Atualizar mockUser com email real para busca de dados
      if (mockUser) {
        const updatedUser = {
          ...mockUser,
          email: realClientEmail.trim(),
        };
        setMockUser(updatedUser as User);
      }
    }
  };

  const handleUseMockEmail = () => {
    setRealClientEmail('');
    setShowEmailInput(false);
    // Recarregar mockUser com email fictício
    loadMockUser();
  };

  if (isLoading || !mockUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Determinar qual email usar: real se fornecido, senão fictício
  const emailToUse = realClientEmail.trim() || mockUser.email;
  const isUsingRealEmail = !!realClientEmail.trim();

  return (
    <div className="min-h-screen bg-base-200">
      {/* Banner de configuração para admin */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-warning/20 border-b border-warning/30 p-4"
      >
        <div className="container mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="badge badge-warning">Modo Admin - Visualização como Cliente</span>
            {isUsingRealEmail ? (
              <span className="badge badge-success">Email Real: {emailToUse}</span>
            ) : (
              <span className="badge badge-info">Email Simulado: {mockUser.email}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!showEmailInput ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmailInput(true)}
                >
                  📧 Usar Email Real
                </Button>
                {isUsingRealEmail && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUseMockEmail}
                  >
                    🔄 Voltar ao Simulado
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSwitchToAdmin}
                >
                  ← Voltar ao Admin
                </Button>
              </>
            ) : (
              <Card className="p-4">
                <form onSubmit={handleEmailSubmit} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="realEmail" className="text-xs mb-1 block">
                      Email Real do Cliente
                    </Label>
                    <Input
                      id="realEmail"
                      type="email"
                      placeholder="exemplo@cliente.com"
                      value={realClientEmail}
                      onChange={(e) => setRealClientEmail(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={!realClientEmail.trim()}>
                    Aplicar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowEmailInput(false);
                      setRealClientEmail('');
                    }}
                  >
                    Cancelar
                  </Button>
                </form>
              </Card>
            )}
          </div>
        </div>
      </motion.div>

      <UserDashboard 
        user={{
          ...mockUser,
          email: emailToUse, // Usar email real se fornecido
        } as User}
        onLogout={onLogout}
        adminMode={true}
        adminSelectedCompanyId={adminSelectedCompanyId}
        onSwitchToAdmin={onSwitchToAdmin}
        realClientEmail={isUsingRealEmail ? emailToUse : undefined}
      />
    </div>
  );
};

