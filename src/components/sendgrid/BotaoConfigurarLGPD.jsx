import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * CRÍTICO LGPD: 1-CLIQUE para configurar webhook + unsubscribe
 * CAN-SPAM + LGPD Art. 18 = OBRIGATÓRIO
 */
export default function BotaoConfigurarLGPD() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  const configurar = async () => {
    setLoading(true);
    setResultado(null);

    try {
      // 1. Auto-configurar webhook SendGrid
      toast.info("⏳ Configurando webhook SendGrid...");
      const webhookRes = await base44.functions.invoke('autoConfigurarWebhookSendGrid', {});
      
      if (!webhookRes.data.success) {
        throw new Error(webhookRes.data.error || 'Erro ao configurar webhook');
      }

      toast.success("✅ Webhook configurado");

      // 2. Adicionar unsubscribe nos 21 templates
      toast.info("⏳ Adicionando link unsubscribe nos templates...");
      const unsubRes = await base44.functions.invoke('adicionarUnsubscribeTemplates', {});
      
      if (!unsubRes.data.success) {
        throw new Error(unsubRes.data.error || 'Erro ao adicionar unsubscribe');
      }

      toast.success(`✅ ${unsubRes.data.templates_atualizados} templates atualizados com unsubscribe`);

      setResultado({
        success: true,
        webhook_url: webhookRes.data.webhook_url,
        templates_atualizados: unsubRes.data.templates_atualizados,
        unsubscribe_groups: unsubRes.data.unsubscribe_groups
      });

    } catch (error) {
      console.error('Erro configurar LGPD:', error);
      toast.error(`❌ Erro: ${error.message}`);
      setResultado({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pc-card p-6 mb-6" style={{ border: '2px solid #ea4335' }}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fde7e7' }}>
          <Shield className="w-6 h-6" style={{ color: '#ea4335' }} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1" style={{ color: '#991b1b' }}>
            🚨 COMPLIANCE LGPD OBRIGATÓRIO
          </h3>
          <p className="text-sm mb-4" style={{ color: '#5f6368' }}>
            Configure webhook + unsubscribe groups em 1 clique (LGPD Art. 18 + CAN-SPAM)
          </p>

          <button
            onClick={configurar}
            disabled={loading || resultado?.success}
            className="w-full sm:w-auto px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            style={{ backgroundColor: '#ea4335', color: 'white' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Configurando LGPD...
              </>
            ) : resultado?.success ? (
              <>
                <CheckCircle className="w-5 h-5" />
                ✅ LGPD Configurado
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Configurar Webhook + Unsubscribe
              </>
            )}
          </button>

          {resultado && (
            <div className={`mt-4 p-4 rounded-lg border-2 ${
              resultado.success 
                ? 'bg-green-50 border-green-500' 
                : 'bg-red-50 border-red-500'
            }`}>
              {resultado.success ? (
                <div className="text-sm space-y-2">
                  <p className="font-bold text-green-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    ✅ Compliance LGPD ativo
                  </p>
                  <ul className="text-xs text-green-700 ml-6 space-y-1">
                    <li>• <strong>Webhook:</strong> {resultado.webhook_url}</li>
                    <li>• <strong>Templates atualizados:</strong> {resultado.templates_atualizados}/21</li>
                    <li>• <strong>Unsubscribe Groups:</strong> Marketing ({resultado.unsubscribe_groups?.marketing}), Alertas ({resultado.unsubscribe_groups?.alertas}), Compliance ({resultado.unsubscribe_groups?.compliance})</li>
                    <li>• <strong>LGPD Art. 18:</strong> Link "Cancelar inscrição" em todos emails</li>
                  </ul>
                </div>
              ) : (
                <div className="text-sm">
                  <p className="font-bold text-red-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    ❌ Erro na configuração
                  </p>
                  <p className="text-xs text-red-700 mt-2">{resultado.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!resultado?.success && (
        <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#fff3cd', border: '1px solid #fbbc04' }}>
          <p className="text-xs font-semibold" style={{ color: '#856404' }}>
            ⚠️ BLOQUEADOR LEGAL: Sem unsubscribe = CAN-SPAM violado + LGPD Art. 18 = multa R$50M
          </p>
        </div>
      )}
    </div>
  );
}