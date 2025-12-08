import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Error boundary para capturar erros de renderização
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  // TypeScript workaround - props are inherited from React.Component
  declare props: Readonly<ErrorBoundaryProps>;

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    // Tentar enviar erro para um serviço de logging se disponível
    if (typeof window !== 'undefined' && (window as any).gtag) {
      try {
        (window as any).gtag('event', 'exception', {
          description: `App Error: ${error.message}`,
          fatal: true
        });
      } catch (e) {
        // Ignorar erros de gtag
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      return (
        <div style={{ 
          padding: '50px', 
          textAlign: 'center', 
          fontFamily: 'Arial, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h1 style={{ color: '#dc2626', marginBottom: '20px' }}>Ops! Algo deu errado</h1>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              textAlign: 'left',
              width: '100%'
            }}>
              <h2 style={{ fontSize: '18px', marginBottom: '10px', color: '#991b1b' }}>
                Detalhes do Erro:
              </h2>
              <p style={{ color: '#7f1d1d', marginBottom: '10px', wordBreak: 'break-word' }}>
                <strong>Mensagem:</strong> {error.message || 'Erro desconhecido'}
              </p>
              {error.stack && (
                <details style={{ marginTop: '10px' }}>
                  <summary style={{ cursor: 'pointer', color: '#991b1b', marginBottom: '10px' }}>
                    Stack Trace (clique para expandir)
                  </summary>
                  <pre style={{
                    background: '#fff',
                    padding: '10px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '12px',
                    maxHeight: '200px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}
          <p style={{ marginBottom: '20px', color: '#6b7280' }}>
            Por favor, recarregue a página ou verifique o console do navegador (F12) para mais detalhes.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '10px',
              padding: '12px 24px',
              fontSize: '16px',
              cursor: 'pointer',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '500'
            }}
          >
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props?.children || null;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  // Tentar criar o elemento se não existir
  const newRoot = document.createElement('div');
  newRoot.id = 'root';
  document.body.appendChild(newRoot);
  const root = ReactDOM.createRoot(newRoot);
  root.render(
    <React.StrictMode>
      <ErrorBoundary children={<App />} />
    </React.StrictMode>
  );
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary children={<App />} />
    </React.StrictMode>
  );
}
