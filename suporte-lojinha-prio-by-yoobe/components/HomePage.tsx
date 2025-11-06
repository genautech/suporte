import React from 'react';

interface HomePageProps {
    onUserLoginClick: () => void;
    onAdminLoginClick: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onUserLoginClick, onAdminLoginClick }) => {
    return (
        <div className="hero min-h-screen" style={{ backgroundImage: `url(https://picsum.photos/1920/1080?grayscale&blur=2)` }}>
            <div className="hero-overlay bg-opacity-60"></div>
            <div className="hero-content text-center text-neutral-content animate-fade-in">
                <div className="max-w-md bg-black/30 p-10 rounded-lg">
                    <h1 className="mb-5 text-5xl font-bold">Suporte Lojinha Prio</h1>
                    <p className="mb-5">Bem-vindo ao nosso portal de suporte. Selecione uma opção abaixo para começar.</p>
                    <div className="flex flex-col gap-4">
                        <button onClick={onUserLoginClick} className="btn btn-primary">
                            Acessar Portal do Cliente
                        </button>
                    </div>
                    <div className="text-xs mt-8">
                        <a onClick={onAdminLoginClick} className="link link-hover">Acesso Administrativo</a>
                    </div>
                </div>
            </div>
        </div>
    );
};