import React from "react";
import { Shield, Zap, Brain, TrendingUp, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * FASE 5: PAYWALL MÓDULO IA PREMIUM
 * Bloqueia acesso se não tiver módulo ativo
 */
export default function PaywallModuloIA({ onUpgrade }) {
  const [loading, setLoading] = React.useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('criarCheckoutModuloIA', {});
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error('Erro ao criar checkout');
      }
    } catch (error) {
      console.error('[PaywallIA] Erro:', error);
      toast.error('Erro ao processar upgrade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-2xl">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Secretária IA Premium
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Automatize atendimento, agendamentos e consultas de prontuário com IA de última geração
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-purple-200">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-6xl font-bold">R$ 2.999</span>
              <span className="text-2xl opacity-80">/mês</span>
            </div>
            <p className="text-purple-100 text-lg">
              ROI médio: R$ 25.000/mês em tempo economizado
            </p>
          </div>

          <div className="p-8 md:p-12">
            <div className="space-y-6 mb-10">
              {[
                { icon: Zap, title: "Atendimento 24/7 Automatizado", desc: "IA responde dúvidas, cria tickets, escala complexidade" },
                { icon: Brain, title: "Agendamento via NLP", desc: "Entende 'preciso consulta terça 14h' e agenda automaticamente" },
                { icon: Shield, title: "Consulta Prontuários (LGPD)", desc: "Busca semântica em histórico clínico com auditoria completa" },
                { icon: TrendingUp, title: "Analytics Preditivo", desc: "Taxa conversão >30%, precisão >85%, upsell automático" }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-purple-50 rounded-2xl p-6 mb-8">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                Incluso no Plano:
              </h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✅ Mensagens ilimitadas (sem cap de 100/mês)</li>
                <li>✅ WhatsApp integrado</li>
                <li>✅ Widget customizável</li>
                <li>✅ Multi-tenant isolado (LGPD compliant)</li>
                <li>✅ Suporte prioritário</li>
              </ul>
            </div>

            <Button
              onClick={handleUpgrade}
              loading={loading}
              className="w-full py-4 text-lg font-bold"
              style={{ backgroundColor: '#7E57FF' }}
            >
              {loading ? 'Processando...' : 'Ativar Módulo IA Premium'}
            </Button>

            <p className="text-center text-xs text-gray-500 mt-4">
              Cobrança via Stripe • Cancele quando quiser • LGPD compliant
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Dúvidas? <a href="mailto:contato@conectaclinica.com.br" className="text-purple-600 font-medium">Fale conosco</a>
          </p>
        </div>
      </div>
    </div>
  );
}