import React from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * FASE 5: ALERT CRÉDITOS <20% → UPSELL
 */
export default function AlertCreditosBaixos({ consumoAtual, limiteTotal, onUpgrade }) {
  const percentualUsado = (consumoAtual / limiteTotal) * 100;
  const estaProximoDoLimite = percentualUsado >= 80; // 80% usado = alerta

  if (!estaProximoDoLimite) return null;

  const handleUpgrade = async () => {
    try {
      const { data } = await base44.functions.invoke('criarCheckoutModuloIA', {});
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error('Erro ao criar checkout');
      }
    } catch (error) {
      console.error('[AlertCreditos] Erro:', error);
      toast.error('Erro ao processar upgrade');
    }
  };

  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-2xl p-6 mb-6 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-orange-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-lg mb-2">
            ⚠️ Créditos IA Esgotando ({percentualUsado.toFixed(0)}% usado)
          </h3>
          <p className="text-gray-700 mb-4">
            Você usou <strong>{consumoAtual}</strong> de <strong>{limiteTotal}</strong> mensagens IA este mês. 
            {percentualUsado >= 95 ? (
              <span className="text-red-700 font-bold"> Limite crítico! Upgrade necessário.</span>
            ) : (
              <span> Evite interrupções no atendimento.</span>
            )}
          </p>

          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Plano Atual: Starter</span>
              <span className="text-sm font-bold text-orange-600">{consumoAtual}/{limiteTotal}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
                style={{ width: `${Math.min(percentualUsado, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleUpgrade}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Upgrade para IA Premium (Ilimitado)
            </Button>
            <span className="text-sm text-gray-600">
              R$ 2.999/mês • Mensagens ilimitadas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}