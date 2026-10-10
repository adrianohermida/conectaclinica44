import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ToastNotification from "./ToastNotification";
import { AnimatePresence } from "framer-motion";
import { enviarPushNotification } from "@/components/pwa/PushNotificationHelper";

export default function NotificationStack({ user }) {
  const [activeNotifications, setActiveNotifications] = useState([]);
  const [lastNotificationId, setLastNotificationId] = useState(null);
  const queryClient = useQueryClient();

  // Polling de notificações não lidas
  const { data: notificacoes = [] } = useQuery({
    queryKey: ['notificacoes-toast', user?.id, user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return [];
      return await base44.entities.NotificacaoSistema.filter(
        { 
          destinatario_id: user.id,
          clinica_id: user.clinica_id,
          lida: false
        },
        '-created_date',
        5
      );
    },
    refetchInterval: 5000, // 5s
    enabled: !!user?.id && !!user?.clinica_id,
    initialData: []
  });

  // Detectar novas notificações
  useEffect(() => {
    if (notificacoes.length === 0) return;

    const maisRecente = notificacoes[0];
    
    if (lastNotificationId !== maisRecente.id) {
      setLastNotificationId(maisRecente.id);
      
      // Adicionar à pilha de toasts
      setActiveNotifications(prev => {
        // Limitar a 3 toasts simultâneos
        const updated = [maisRecente, ...prev].slice(0, 3);
        return updated;
      });

      // Enviar push notification para mobile
      enviarPushNotification(
        maisRecente.titulo,
        maisRecente.corpo,
        maisRecente.acao_url
      ).catch(err => console.warn('[PUSH] Falhou:', err));

      // Marcar como lida após mostrar
      setTimeout(() => {
        base44.entities.NotificacaoSistema.update(maisRecente.id, { 
          lida: true,
          lida_em: new Date().toISOString(),
          entregue: true,
          entregue_em: new Date().toISOString()
        }).then(() => {
          queryClient.invalidateQueries(['notificacoes']);
          queryClient.invalidateQueries(['notificacoes-toast']);
        });
      }, 5500);
    }
  }, [notificacoes, lastNotificationId, queryClient]);

  const handleDismiss = (notificationId) => {
    setActiveNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return (
    <div className="fixed top-20 right-4 z-[10000] space-y-3 pointer-events-none">
      <AnimatePresence>
        {activeNotifications.map(notification => (
          <div key={notification.id} className="pointer-events-auto">
            <ToastNotification
              notification={notification}
              onDismiss={() => handleDismiss(notification.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}