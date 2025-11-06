// Fix: Create the ProfileModal component.
import React, { useState, useEffect } from 'react';
import { User, updateProfile, updateEmail } from 'firebase/auth';
import { auth } from '../firebase';

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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      const nameParts = user.displayName?.split(' ') || ['', ''];
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(user.email || '');
    }
  }, [user, isOpen]);
  
  const isNewUserSetup = !user.displayName || !user.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    if (!auth.currentUser) {
        setError('Usuário não autenticado.');
        setIsSaving(false);
        return;
    }

    try {
        const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

        // Update profile (name) if it has changed
        if (displayName && auth.currentUser.displayName !== displayName) {
            await updateProfile(auth.currentUser, { displayName });
        }

        // Update email if it's new
        if (email && !auth.currentUser.email) {
             try {
                await updateEmail(auth.currentUser, email);
             } catch (emailError: any) {
                 if (emailError.code === 'auth/email-already-in-use') {
                     throw new Error('Este e-mail já está em uso por outra conta.');
                 }
                 throw emailError;
             }
        }
        
        onUpdate();
        onClose();

    } catch (err: any) {
        console.error("Failed to update profile", err);
        setError(err.message || 'Ocorreu um erro ao salvar o perfil.');
    } finally {
        setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <dialog id="profile_modal" className={`modal ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box w-11/12 max-w-lg">
        {!isNewUserSetup && (
            <form method="dialog">
                <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>✕</button>
            </form>
        )}
        <h3 className="font-bold text-lg">
            {isNewUserSetup ? 'Complete seu Perfil' : 'Editar Perfil'}
        </h3>
        {isNewUserSetup && <p className="py-2 text-sm">Precisamos de mais algumas informações para personalizar sua experiência.</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
             {error && <div className="alert alert-error text-sm">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="form-control w-full">
                    <div className="label"><span className="label-text">Nome</span></div>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="input input-bordered w-full" />
                </label>
                 <label className="form-control w-full">
                    <div className="label"><span className="label-text">Sobrenome</span></div>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="input input-bordered w-full" />
                </label>
            </div>
             <label className="form-control w-full">
                <div className="label"><span className="label-text">E-mail</span></div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!!user.email} className="input input-bordered w-full disabled:bg-base-200" />
                 {!!user.email && <div className="label"><span className="label-text-alt">O e-mail não pode ser alterado após definido.</span></div>}
            </label>
             <label className="form-control w-full">
                <div className="label"><span className="label-text">Telefone</span></div>
                <input type="tel" value={user.phoneNumber || ''} disabled className="input input-bordered w-full disabled:bg-base-200" />
            </label>
            
            <div className="modal-action">
                {!isNewUserSetup && (
                     <button type="button" className="btn" onClick={onClose}>Cancelar</button>
                )}
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? <span className="loading loading-spinner"></span> : 'Salvar Perfil'}
                </button>
            </div>
        </form>

      </div>
       <form method="dialog" className="modal-backdrop">
          <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
};
