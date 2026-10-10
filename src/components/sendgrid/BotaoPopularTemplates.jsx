import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/Button";
import { Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * DESBLOQUEIO SPRINT 1: Botão popular templates SendGrid
 * Cria 8 templates via API + popula entity (1 clique)
 */
export default function BotaoPopularTemplates() {
  const [loading, setLoading] = React.useState(false);
  const [resultado, setResultado] = React.useState(null);

  const popular = async () => {
    setLoading(true);
    setResultado(null);
    
    try {
      const response = await base44.functions.invoke('popularTemplatesSendGrid', {});
      
      if (response.data.success) {
        setResultado(response.data);
        toast.success(`✅ ${response.data.criados} templates criados!`);
        
        // Aguardar 2s e testar envio real
        setTimeout(async () => {
          try {
            const testeResponse = await base44.functions.invoke('testarEnvioResetSenha', {});
            if (testeResponse.data.success) {
              toast.success('✅ Teste real: Email reset senha enviado!');
            }
          } catch (errTeste) {
            toast.error(`❌ Teste falhou: ${errTeste.message}`);
          }
        }, 2000);
      } else {
        throw new Error(response.data.error || 'Falha ao popular');
      }
    } catch (error) {
      toast.error(`Erro: ${error.message}`);
      setResultado({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="pc-card p-6 border-2 border-red-300 bg-red-50">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <p className="font-bold text-red-900 mb-1">🚨 BLOQUEADOR: Templates não criados</p>
            <p className="text-sm text-red-800">
              Código 100% pronto mas entity TemplateSendGrid vazia = throw "Template não encontrado"
            </p>
          </div>
        </div>

        <Button
          onClick={popular}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700"
          icon={loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
        >
          {loading ? 'Criando 8 templates...' : '⚡ DESBLOQUEAR: Criar 8 Templates SendGrid (30s)'}
        </Button>
      </div>

      {resultado && (
        <div className={`pc-card p-4 border-2 ${resultado.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className="flex items-start gap-3">
            {resultado.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <p className={`font-bold mb-2 ${resultado.success ? 'text-green-900' : 'text-red-900'}`}>
                {resultado.success ? '✅ Templates Criados' : '❌ Erro'}
              </p>
              
              {resultado.success && resultado.detalhes?.criados && (
                <div className="space-y-1 text-xs">
                  {resultado.detalhes.criados.map((t, i) => (
                    <p key={i} className="text-green-800">
                      {t.status === 'created' ? '✅' : '📋'} {t.tipo}: <code className="bg-white px-2 py-0.5 rounded">{t.id}</code>
                    </p>
                  ))}
                  <p className="text-green-900 font-bold mt-3">
                    🎉 Sprint 1 DESBLOQUEADO: emailService.js agora funcional!
                  </p>
                </div>
              )}

              {resultado.detalhes?.errors?.length > 0 && (
                <div className="mt-2 space-y-1 text-xs">
                  {resultado.detalhes.errors.map((e, i) => (
                    <p key={i} className="text-red-800">❌ {e.tipo}: {e.error}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}