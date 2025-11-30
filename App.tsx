// Fix: Implement the main App component to handle views.
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HomePage } from './components/HomePage';
import { UserLogin } from './components/UserLogin';
import { AdminLogin } from './components/AdminLogin';
import { ManagerLogin } from './components/ManagerLogin';
import UserDashboard from './components/UserDashboard';
import { auth } from './firebase';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { AdminClientView } from './components/AdminClientView';
import { Toaster } from './components/ui/toaster';
import { storeContext } from './lib/storeContext';
import { getManagerCompany, getUserRole } from './services/authService';

const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const ManagerDashboard = lazy(() => import('./components/ManagerDashboard'));

type AppView = 'home' | 'userLogin' | 'adminLogin' | 'managerLogin';
type AdminViewMode = 'admin' | 'client';

const App: React.FC = () => {
    const [view, setView] = useState<AppView>('home');
    const [entryPoint, setEntryPoint] = useState<AppView>('home');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isManager, setIsManager] = useState(false);
    const [managerCompanyId, setManagerCompanyId] = useState<string | null>(() => storeContext.getStoredCompanyId());
    const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>('admin');
    const [adminSelectedCompanyId, setAdminSelectedCompanyId] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Detectar rota da URL (suporte incremental para /admin e /manager)
        storeContext.detectAndStoreContext();
        const pathname = window.location.pathname;
        if (pathname === '/admin') {
            setView('adminLogin');
            setEntryPoint('adminLogin');
        } else if (pathname === '/manager') {
            setView('managerLogin');
            setEntryPoint('managerLogin');
        } else {
            setView('home');
            setEntryPoint('home');
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
                if (user?.email) {
                    setIsLoading(true);
                    resolveUserRole(user.email)
                        .catch((error) => {
                            console.error('[App] Erro ao resolver role do usuário:', error);
                            setIsAdmin(false);
                            setIsManager(false);
                            setManagerCompanyId(null);
                        })
                        .finally(() => setIsLoading(false));
                } else {
                    setIsAdmin(false);
                    setIsManager(false);
                    setManagerCompanyId(null);
                    setIsLoading(false);
                }
            },
            (error) => {
                clearTimeout(timeoutId);
                console.error('[App] Erro ao verificar autenticação:', error);
                setIsLoading(false);
            }
        );

        return () => {
            clearTimeout(timeoutId);
            unsubscribe();
        };
    }, []); // Array vazio - executar apenas uma vez

    const resolveUserRole = async (email: string) => {
        const role = await getUserRole(email);
        const storedCompanyId = storeContext.getStoredCompanyId();
        const forceManager = entryPoint === 'managerLogin' || (typeof window !== 'undefined' && window.location.pathname === '/manager');
        const applyManagerSession = (companyId: string) => {
            setManagerCompanyId(companyId);
            storeContext.setStoredCompanyId(companyId);
            setIsManager(true);
            setIsAdmin(false);
        };
        if (role === 'admin') {
            setIsAdmin(true);
            setIsManager(false);
            setManagerCompanyId(null);
        } else if (role === 'manager') {
            let companyId = await getManagerCompany(email);
            if (!companyId && storedCompanyId) {
                console.warn('[App] getManagerCompany retornou vazio, usando companyId armazenado localmente');
                companyId = storedCompanyId;
            }
            if (companyId) {
                applyManagerSession(companyId);
            } else {
                console.warn('[App] Usuário manager sem companyId associado:', email);
                setIsManager(false);
                setManagerCompanyId(null);
            }
        } else {
            if (forceManager && storedCompanyId) {
                console.warn('[App] Aplicando modo gestor baseado no entry point e companyId armazenado.');
                applyManagerSession(storedCompanyId);
                return;
            }
            setIsAdmin(false);
            setIsManager(false);
            setManagerCompanyId(null);
        }
    };

    const handleAdminLoginSuccess = () => {
        setEntryPoint('adminLogin');
        setIsAdmin(true);
        setIsManager(false);
        setManagerCompanyId(null);
        setAdminViewMode('admin');
    };

    const handleManagerLoginSuccess = (companyId: string) => {
        setEntryPoint('managerLogin');
        setIsManager(true);
        setIsAdmin(false);
        setManagerCompanyId(companyId);
        storeContext.setStoredCompanyId(companyId);
    };
    
    const handleLogout = () => {
        signOut(auth).then(() => {
            setIsAdmin(false);
            setIsManager(false);
            setManagerCompanyId(null);
            storeContext.setStoredCompanyId(null);
            setEntryPoint('home');
            setAdminViewMode('admin');
            setView('home');
            // Limpar email salvo do localStorage ao fazer logout
            localStorage.removeItem('suporte_saved_email');
        }).catch((error) => {
            console.error("Logout Error", error);
        });
    };
    
    const handleAdminViewModeChange = (mode: AdminViewMode, companyId?: string) => {
        setAdminViewMode(mode);
        setAdminSelectedCompanyId(companyId);
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
                <Suspense fallback={<FullPageLoader message="Carregando painel do gestor..." />}>
                    <ManagerDashboard 
                        companyId={managerCompanyId}
                        onLogout={handleLogout}
                    />
                </Suspense>
            );
        }
        if (isAdmin) {
            // Admin pode alternar entre visualização admin e cliente
            if (adminViewMode === 'client') {
                // Usar componente que carrega os dados da empresa assincronamente
                return (
                    <AdminClientView 
                        adminSelectedCompanyId={adminSelectedCompanyId}
                        onLogout={handleLogout}
                        onSwitchToAdmin={() => handleAdminViewModeChange('admin')}
                    />
                );
            }
            return (
                <Suspense fallback={<FullPageLoader message="Carregando painel administrativo..." />}>
                    <AdminDashboard 
                        onLogout={handleLogout}
                        onSwitchToClient={(companyId) => handleAdminViewModeChange('client', companyId)}
                    />
                </Suspense>
            );
        }
        if (currentUser) {
            return <UserDashboard user={currentUser} onLogout={handleLogout} />;
        }
        switch (view) {
            case 'adminLogin':
                return <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />;
            case 'managerLogin':
                return <ManagerLogin onLoginSuccess={handleManagerLoginSuccess} />;
            case 'userLogin':
                return <UserLogin onBackToHome={() => setView('home')} />;
            case 'home':
            default:
                return <HomePage />;
        }
    };

    return (
        <div className="App">
            {renderView()}
            <Toaster />
        </div>
    );
};

const FullPageLoader: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-muted-foreground">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p>{message}</p>
    </div>
);

export default App;
