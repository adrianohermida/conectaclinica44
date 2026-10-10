import React from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Zap, TrendingUp, Crown } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function PaywallPrescricao({ 
  usado, 
  limite, 
  percentual, 
  bloqueado,
  onUpgrade 
}) {
  if (bloqueado) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Limite Mensal Atingido
          </h2>
          
          <p className="text-gray-600 mb-1">
            Você usou <strong>{usado} de {limite}</strong> prescrições eletrônicas neste mês.
          </p>
          
          <p className="text-sm text-gray-500 mb-6">
            Faça upgrade para continuar prescrevendo sem limites.
          </p>

          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 mb-6 border border-purple-200">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-900">Plano Profissional</h3>
            </div>
            <p className="text-sm text-purple-700 mb-3">
              ✓ Prescrições ilimitadas<br/>
              ✓ Assinatura digital incluída<br/>
              ✓ Armazenamento 50 GB<br/>
              ✓ Suporte prioritário
            </p>
            <p className="text-2xl font-bold text-purple-900">
              R$ 297<span className="text-sm font-normal">/mês</span>
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              onClick={onUpgrade}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Fazer Upgrade Agora
            </Button>
            <Link to={createPageUrl("Planos")}>
              <Button variant="outline" className="w-full">
                Ver Todos os Planos
              </Button>
            </Link>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Upgrade instantâneo • Sem multa de cancelamento
          </p>
        </div>
      </div>
    );
  }

  // Alerta 80%+ (não bloqueante)
  if (percentual >= 80) {
    return (
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-orange-900 mb-1">
              ⚠️ Você está usando {percentual}% do limite mensal
            </h3>
            <p className="text-sm text-orange-700 mb-3">
              {usado} de {limite} prescrições eletrônicas usadas. 
              Faça upgrade para prescrições ilimitadas antes do limite acabar.
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={onUpgrade}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Crown className="w-4 h-4 mr-1" />
                Upgrade Profissional
              </Button>
              <Link to={createPageUrl("Planos")}>
                <Button variant="outline" size="sm">
                  Ver Planos
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 bg-white rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
            style={{ width: `${percentual}%` }}
          />
        </div>
      </div>
    );
  }

  return null;
}