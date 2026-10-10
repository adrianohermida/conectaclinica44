import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

/**
 * CRITICAL: Error Boundary global - última linha de defesa
 * Previne crash total do app quando componente quebra
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🛑 ErrorBoundary capturou erro:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState({
      error,
      errorInfo,
      errorCount: this.state.errorCount + 1
    });

    // ENVIAR TRACE PARA collectTrace (dev only)
    if (import.meta.env.DEV) {
      const trace = {
        event_type: 'error',
        path: window.location.pathname,
        component: errorInfo?.componentStack?.split('\n')[1]?.trim() || 'Unknown',
        error_message: error?.message || 'Unknown error',
        error_stack: error?.stack || '',
        timestamp: new Date().toISOString()
      };
      
      base44.functions.invoke('collectTrace', trace).catch(() => {});
    }

    if (this.state.errorCount >= 3) {
      setTimeout(() => {
        window.location.href = createPageUrl('DashboardCompleto');
      }, 3000);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F4F7FA',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
            border: '2px solid #ea4335'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <AlertTriangle style={{ 
                width: '64px', 
                height: '64px', 
                color: '#ea4335',
                margin: '0 auto 16px'
              }} />
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#202124',
                marginBottom: '8px'
              }}>
                Algo deu errado
              </h1>
              <p style={{ 
                fontSize: '14px', 
                color: '#5f6368',
                lineHeight: '1.6'
              }}>
                Um erro impediu esta página de carregar. Nossas ferramentas de diagnóstico já registraram o problema.
              </p>
            </div>

            {/* Erro técnico (para admins no console) */}
            {this.state.error && (
              <details style={{
                backgroundColor: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '24px',
                fontSize: '12px',
                fontFamily: 'monospace',
                border: '1px solid #e8eaed'
              }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  color: '#5f6368',
                  marginBottom: '8px'
                }}>
                  Detalhes técnicos (para desenvolvedores)
                </summary>
                <div style={{ color: '#ea4335', marginTop: '12px' }}>
                  <strong>Erro:</strong> {this.state.error.message}
                </div>
                <pre style={{ 
                  marginTop: '12px', 
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#202124',
                  fontSize: '11px',
                  lineHeight: '1.5'
                }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {/* Ações */}
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              flexDirection: window.innerWidth < 640 ? 'column' : 'row'
            }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: '#7E57FF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.opacity = '0.9'}
                onMouseOut={(e) => e.target.style.opacity = '1'}
              >
                <RefreshCw style={{ width: '18px', height: '18px' }} />
                Recarregar Página
              </button>

              <button
                onClick={() => window.location.href = createPageUrl('DashboardCompleto')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: '#fff',
                  color: '#5f6368',
                  border: '1px solid #e8eaed',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#fff'}
              >
                <Home style={{ width: '18px', height: '18px' }} />
                Voltar ao Início
              </button>
            </div>

            {/* Contador de tentativas */}
            {this.state.errorCount >= 2 && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#fef9e5',
                border: '1px solid #fef3c7',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#92400e',
                textAlign: 'center'
              }}>
                ⚠️ Erro recorrente detectado ({this.state.errorCount}x). 
                {this.state.errorCount >= 3 && ' Redirecionando para dashboard...'}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}