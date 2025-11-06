// Fix: Implement the main App component to handle views.
import React, { useState, useEffect } from 'react';
import { HomePage } from './components/HomePage';
import { UserLogin } from './components/UserLogin';
import { AdminLogin } from './components/AdminLogin';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import { auth } from './firebase';
import { User, onAuthStateChanged, signOut, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';

type AppView = 'home' | 'userLogin' | 'adminLogin';

const App: React.FC = () => {
    const [view, setView] = useState<AppView>('home');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isSignInWithEmailLink(auth, window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn');
            if (!email) {
                email = window.prompt('Por favor, forneça seu e-mail para confirmação.');
            }
            if (email) {
                signInWithEmailLink(auth, email, window.location.href)
                    .then(() => {
                        window.localStorage.removeItem('emailForSignIn');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    })
                    .catch((error) => {
                        console.error("Error signing in with email link", error);
                        alert("Ocorreu um erro. O link pode ter expirado ou ser inválido.");
                    });
            }
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAdminLoginSuccess = () => {
        setIsAdmin(true);
    };
    
    const handleLogout = () => {
        signOut(auth).then(() => {
            setIsAdmin(false);
            setView('home');
        }).catch((error) => {
            console.error("Logout Error", error);
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }
    
    const renderView = () => {
        if (isAdmin) {
            return <AdminDashboard onLogout={handleLogout} />;
        }
        if (currentUser) {
            return <UserDashboard user={currentUser} onLogout={handleLogout} />;
        }
        switch (view) {
            case 'userLogin':
                return <UserLogin onBackToHome={() => setView('home')} />;
            case 'adminLogin':
                return <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />;
            case 'home':
            default:
                return <HomePage onUserLoginClick={() => setView('userLogin')} onAdminLoginClick={() => setView('adminLogin')} />;
        }
    };

    return <div className="App">{renderView()}</div>;
};

export default App;