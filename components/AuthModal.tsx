import React from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'success' | 'info' | 'warning';
  email?: string;
  onEmailSubmit?: (email: string) => void;
  isLoading?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  email: initialEmail = '',
  onEmailSubmit,
  isLoading = false
}) => {
  const [email, setEmail] = React.useState(initialEmail);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return 'alert-error';
      case 'success':
        return 'alert-success';
      case 'warning':
        return 'alert-warning';
      default:
        return 'alert-info';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onEmailSubmit && email) {
      onEmailSubmit(email);
    }
  };

  return (
    <dialog className={`modal ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box max-w-md">
        <div className="flex items-center gap-3 mb-4">
          {type === 'success' && <span className="text-2xl">✅</span>}
          {type === 'error' && <span className="text-2xl">❌</span>}
          {type === 'warning' && <span className="text-2xl">⚠️</span>}
          {type === 'info' && <span className="text-2xl">ℹ️</span>}
          <h3 className={`font-bold text-xl ${type === 'error' ? 'text-error' : type === 'success' ? 'text-success' : ''}`}>
            {title}
          </h3>
        </div>
        
        {onEmailSubmit ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-base-content/70 mb-4">{message}</p>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Seu E-mail</span>
              </label>
              <input
                type="email"
                className="input input-bordered w-full focus:input-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={isLoading}
                autoFocus
              />
            </div>
            <div className="modal-action gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Processando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="text-base-content/80 mb-6">{message}</p>
            <div className="modal-action">
              <button className="btn btn-primary w-full" onClick={onClose}>
                Entendi
              </button>
            </div>
          </>
        )}
      </div>
      <form method="dialog" className="modal-backdrop bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <button className="sr-only">close</button>
      </form>
    </dialog>
  );
};

