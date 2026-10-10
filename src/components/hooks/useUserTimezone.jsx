import { useState, useEffect } from 'react';

/**
 * Hook para detectar timezone do usuário
 * Prioridade: 1) User.timezone_configurado, 2) Intl.DateTimeFormat, 3) UTC fallback
 */
export function useUserTimezone(user) {
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    if (user?.timezone_configurado) {
      setTimezone(user.timezone_configurado);
    } else {
      // Auto-detectar timezone do navegador
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(detected || 'America/Sao_Paulo');
      } catch {
        setTimezone('America/Sao_Paulo'); // Fallback Brasil
      }
    }
  }, [user]);

  return timezone;
}

/**
 * Formatar data com timezone do usuário
 */
export function formatarDataLocal(isoString, timezone, formato = 'completo') {
  if (!isoString) return '-';
  
  const data = new Date(isoString);
  
  const opcoes = formato === 'completo' ? {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  } : formato === 'data_hora' ? {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  } : {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  return new Intl.DateTimeFormat('pt-BR', opcoes).format(data);
}