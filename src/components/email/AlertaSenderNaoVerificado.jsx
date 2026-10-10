import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * CRITICAL: Alerta se sender genérico não verificado = emails FALHARÃO
 */
export default function AlertaSenderNaoVerificado({ user }) {
  const { data: validacao } = useQuery({
    queryKey: ['sender-generico-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('validarSenderGenerico', {});
      return res.data;
    },
    enabled: user?.role === 'admin',
    staleTime: 10 * 60 * 1000,
    retry: 1
  });

  if (!validacao || validacao.verified) return null;

  return (
    <div className="mb-6 p-4 rounded-xl border-2" style={{ backgroundColor: '#fef2f2', borderColor: '#ef4444' }}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-1" style={{ color: '#991b1b' }}>
            🚨 Sender Genérico Não Verificado
          </h3>
          <p className="text-xs mb-3" style={{ color: '#7f1d1d' }}>
            {validacao?.exists 
              ? `Sender noreply@conectaclinica.com.br existe mas NÃO está verificado no SendGrid. Emails de confirmação/auto-resposta FALHARÃO.`
              : `Sender noreply@conectaclinica.com.br NÃO existe no SendGrid. Sistema não pode enviar emails.`
            }
          </p>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => window.open('https://app.sendgrid.com/settings/sender_auth/senders', '_blank')}
            className="gap-2"
          >
            <ExternalLink className="w-3 h-3" />
            Configurar no SendGrid
          </Button>
        </div>
      </div>
    </div>
  );
}