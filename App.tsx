// Fix: Implement the main App component to handle views.
import React, { useState, useEffect } from 'react';
import { HomePage } from './components/HomePage';
import { UserLogin } from './components/UserLogin';
import { AdminLogin } from './components/AdminLogin';
import { ManagerLogin } from './components/ManagerLogin';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import { auth } from './firebase';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { Toaster } from './components/ui/toaster';

type AppView = 'home' | 'userLogin' | 'adminLogin' | 'managerLogin';
type AdminViewMode = 'admin' | 'client';

const App: React.FC = () => {
    const [view, setView] = useState<AppView>('home');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isManager, setIsManager] = useState(false);
    const [managerCompanyId, setManagerCompanyId] = useState<string | null>(null);
    const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>('admin');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Detectar rota da URL (suporte incremental para /admin e /manager)
        const pathname = window.location.pathname;
        if (pathname === '/admin' && view !== 'adminLogin') {
            setView('adminLogin');
        } else if (pathname === '/manager' && view !== 'managerLogin') {
            setView('managerLogin');
        }
        
        // Monitor authentication state changes
        // Adicionar timeout para evitar loading infinito em caso de erro
        const timeoutId = setTimeout(() => {
            setIsLoading(false);
        }, 10000); // 10 segundos de timeout

        const unsubscribe = onAuthStateChanged(
            auth, 
            (user) => {
                clearTimeout(timeoutId);
                setCurrentUser(user);
                setIsLoading(false);
            },
            (error) => {
                clearTimeout(timeoutId);
                console.error('[App] Erro ao verificar autenticação:', error);
                // Continuar mesmo com erro para não bloquear a aplicação
                setIsLoading(false);
            }
        );

        return () => {
            clearTimeout(timeoutId);
            unsubscribe();
        };
    }, []); // Array vazio - executar apenas uma vez

    const handleAdminLoginSuccess = () => {
        setIsAdmin(true);
        setIsManager(false);
        setManagerCompanyId(null);
        setAdminViewMode('admin');
    };

    const handleManagerLoginSuccess = (companyId: string) => {
        setIsManager(true);
        setIsAdmin(false);
        setManagerCompanyId(companyId);
    };
    
    const handleLogout = () => {
        signOut(auth).then(() => {
            setIsAdmin(false);
            setIsManager(false);
            setManagerCompanyId(null);
            setAdminViewMode('admin');
            setView('home');
        }).catch((error) => {
            console.error("Logout Error", error);
        });
    };
    
    const handleAdminViewModeChange = (mode: AdminViewMode) => {
        setAdminViewMode(mode);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }
    
    const renderView = () => {
        if (isManager && managerCompanyId) {
            return (
                <ManagerDashboard 
                    companyId={managerCompanyId}
                    onLogout={handleLogout}
                />
            );
        }
        if (isAdmin) {
            // Admin pode alternar entre visualização admin e cliente
            if (adminViewMode === 'client') {
                // Criar um usuário mock para o admin visualizar como cliente
                const mockUser: User = currentUser || {
                    uid: 'admin-mock-user',
                    email: 'admin@yoobe.co',
                    displayName: 'Admin (Modo Cliente)',
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
                return (
                    <UserDashboard 
                        user={mockUser} 
                        onLogout={handleLogout}
                        adminMode={true}
                        onSwitchToAdmin={() => handleAdminViewModeChange('admin')}
                    />
                );
            }
            return (
                <AdminDashboard 
                    onLogout={handleLogout}
                    onSwitchToClient={() => handleAdminViewModeChange('client')}
                />
            );
        }
        if (currentUser) {
            return <UserDashboard user={currentUser} onLogout={handleLogout} />;
        }
        switch (view) {
            case 'userLogin':
                return <UserLogin onBackToHome={() => setView('home')} />;
            case 'adminLogin':
                return <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />;
            case 'managerLogin':
                return <ManagerLogin onLoginSuccess={handleManagerLoginSuccess} />;
            case 'home':
            default:
                return <HomePage onUserLoginClick={() => setView('userLogin')} onAdminLoginClick={() => setView('adminLogin')} />;
        }
    };

    return (
        <div className="App">
            {renderView()}
            <Toaster />
        </div>
    );
};

export default App;
