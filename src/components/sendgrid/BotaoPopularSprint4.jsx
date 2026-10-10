import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/Button";
import { Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function BotaoPopularSprint4() {
  const [loading, setLoading] = React.useState(false);
  const [resultado, setResultado] = React.useState(null);

  const popular = async () => {
    setLoading(true);
    setResultado(null);
    
    try {
      const response = await base44.functions.invoke('popularTemplatesSprint4', {});
      
      if (response.data.success) {
        setResultado(response.data);
        toast.success(`✅ ${response.data.criados} templates Sprint 4!`);
      } else {
        throw new Error(response.data.error || 'Falha');
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
      <div className="pc-card p-6 border-2 border-green-300 bg-green-50">
        <div className="flex items-start gap-3 mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-700 flex-shrink-0 mt-1" />
          <div>
            <p className="font-bold text-green-900 mb-1">SPRINT 4: Compliance + LGPD</p>
            <p className="text-sm text-green-800">
              3 templates: termo_pendente, certidao_vence, ticket_criado
            </p>
          </div>
        </div>

        <Button
          onClick={popular}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700"
          icon={loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
        >
          {loading ? 'Criando...' : '⚡ Criar Templates Sprint 4'}
        </Button>
      </div>

      {resultado && (
        <div className={`pc-card p-4 border-2 ${resultado.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className="flex items-start gap-3">
            {resultado.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <div className="flex-1">
              <p className="font-bold mb-2">{resultado.success ? '✅ Sprint 4 Completo' : '❌ Erro'}</p>
              {resultado.success && resultado.detalhes?.criados && (
                <div className="space-y-1 text-xs">
                  {resultado.detalhes.criados.map((t, i) => (
                    <p key={i} className="text-green-800">
                      ✅ {t.tipo}
                    </p>
                  ))}
                  <p className="text-green-900 font-bold mt-3">
                    🎉 ROADMAP SENDGRID 100% IMPLEMENTADO
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}