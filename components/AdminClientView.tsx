// Componente para visualização do admin como cliente
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { companyService } from '../services/companyService';
import UserDashboard from './UserDashboard';

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

  useEffect(() => {
    const loadMockUser = async () => {
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
    };

    loadMockUser();
  }, [adminSelectedCompanyId]);

  if (isLoading || !mockUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <UserDashboard 
      user={mockUser} 
      onLogout={onLogout}
      adminMode={true}
      adminSelectedCompanyId={adminSelectedCompanyId}
      onSwitchToAdmin={onSwitchToAdmin}
    />
  );
};

