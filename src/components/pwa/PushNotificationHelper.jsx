import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

/**
 * Helper para enviar push notifications mobile via Service Worker
 * Usado pelo NotificationStack para notificações críticas
 */
export default function PushNotificationHelper({ user }) {
  const { data: permission } = useQuery({
    queryKey: ['push-permission'],
    queryFn: async () => {
      if ('Notification' in window) {
        return Notification.permission;
      }
      return 'denied';
    },
    staleTime: Infinity
  });

  useEffect(() => {
    if (!user || permission !== 'granted') return;

    // Configurar listener para notificações push do service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Service worker está pronto para receber notificações
        console.log('[PUSH] Service Worker pronto');
      });
    }
  }, [user, permission]);

  return null;
}

/**
 * Função helper para enviar push notification
 * Usada dentro de componentes que querem disparar notificações
 */
export async function enviarPushNotification(titulo, mensagem, link) {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(titulo, {
        body: mensagem,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: `notif-${Date.now()}`,
        requireInteraction: false,
        silent: false,
        data: { url: link }
      });
    }
  }
}