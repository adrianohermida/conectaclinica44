import { useEffect } from 'react';

/**
 * ServiceWorkerRegistration - PWA Essencial
 * 
 * CRÍTICO: Registra Service Worker para:
 * - Cache offline
 * - Push notifications
 * - App instalável
 * - Performance boost
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Só registrar em production (não em dev mode)
    if (import.meta.env.DEV) {
      console.log('[SW] Dev mode - Service Worker desativado');
      return;
    }

    // Verificar suporte
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW] Service Worker não suportado neste navegador');
      return;
    }

    const registerSW = async () => {
      try {
        // Registrar Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('[SW] ✅ Registrado com sucesso:', registration.scope);

        // Verificar updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] 🔄 Update disponível - recarregue para atualizar');
              
              // OPCIONAL: Notificar usuário sobre update
              if (window.confirm('Nova versão disponível! Recarregar agora?')) {
                window.location.reload();
              }
            }
          });
        });

        // Update check a cada 1 hora
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

      } catch (error) {
        console.error('[SW] ❌ Falha ao registrar:', error);
      }
    };

    // Delay de 2s para não impactar FCP/LCP
    setTimeout(registerSW, 2000);

  }, []);

  return null; // Componente sem UI
}