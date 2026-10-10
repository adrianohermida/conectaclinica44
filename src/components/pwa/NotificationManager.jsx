import React, { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

export default function NotificationManager() {
  const [permission, setPermission] = useState(Notification.permission);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error('Erro ao verificar subscription:', error);
    }
  };

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeToPush();
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // VAPID public key - em produção, gerar uma chave real
      const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY_HERE';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      setSubscription(subscription);
      
      // Enviar subscription para o servidor
      await saveSubscription(subscription);
    } catch (error) {
      console.error('Erro ao se inscrever:', error);
    }
  };

  const saveSubscription = async (subscription) => {
    // Salvar no backend
    console.log('Subscription salva:', subscription);
  };

  const unsubscribe = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
      }
    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
    }
  };

  if (permission === 'denied') {
    return null;
  }

  if (permission === 'granted' && subscription) {
    return (
      <button
        onClick={unsubscribe}
        className="fixed bottom-24 right-6 bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg z-50"
        title="Desativar notificações"
      >
        <BellOff className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      onClick={requestPermission}
      className="fixed bottom-24 right-6 bg-[#0B7A9E] hover:bg-[#0a6582] text-white p-3 rounded-full shadow-lg z-50 animate-pulse"
      title="Ativar notificações"
    >
      <Bell className="w-5 h-5" />
    </button>
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}