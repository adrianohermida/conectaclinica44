import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

/**
 * FASE 4: INTERFACE VALIDAÇÃO MÉDICA
 * Permite médico/admin validar respostas da IA
 */
export default function ValidadorPrecisaoIA({ clinicaId }) {
  const queryClient = useQueryClient();
  const [expandido, setExpandido] = React.useState(null);

  const { data: respostasNaoValidadas = [], isLoading } = useQuery({
    queryKey: ["precisao-nao-validadas", clinicaId],
    queryFn: () => base44.entities.PrecisaoRespostaIA.filter({ 
      clinica_id: clinicaId,
      avaliacao: 'nao_validada'
    }, '-created_date', 20),
    enabled: !!clinicaId,
    refetchInterval: 30000
  });

  const validarMutation = useMutation({
    mutationFn: async ({ id, avaliacao, feedback }) => {
      const user = await base44.auth.me();
      return base44.entities.PrecisaoRespostaIA.update(id, {
        avaliacao,
        feedback,
        validada_por: user.email,
        data_validacao: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["precisao-nao-validadas"] });
      queryClient.invalidateQueries({ queryKey: ["precisao-ia"] });
      toast.success('Validação registrada');
      setExpandido(null);
    }
  });

  if (isLoading) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />;

  if (respostasNaoValidadas.length === 0) {
    return (
      <div className="pc-card p-6 bg-green-50 border-2 border-green-200">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-bold text-green-900">Todas respostas validadas</p>
            <p className="text-sm text-green-700">Nenhuma validação pendente no momento.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Validar Respostas IA ({respostasNaoValidadas.length} pendentes)
        </h3>
      </div>

      {respostasNaoValidadas.map((resposta) => (
        <div key={resposta.id} className="pc-card p-4 border-2 border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3 mb-3">
            <MessageSquare className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {resposta.tipo_consulta === 'historico_paciente' ? '🩺 Consulta Histórico' : '🔍 Busca Prontuários'}
              </p>
              <p className="text-xs text-gray-600 mb-2">
                <strong>Pergunta:</strong> {resposta.pergunta_original}
              </p>
              
              {expandido === resposta.id ? (
                <>
                  <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
                    <p className="text-xs text-gray-700 whitespace-pre-wrap">
                      {resposta.resposta_ia}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-700">Como você avalia esta resposta?</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => validarMutation.mutate({ id: resposta.id, avaliacao: 'correta' })}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Correta
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => validarMutation.mutate({ id: resposta.id, avaliacao: 'parcialmente_correta' })}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Parcial
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const feedback = prompt('Por que está incorreta? (opcional)');
                          validarMutation.mutate({ 
                            id: resposta.id, 
                            avaliacao: 'incorreta',
                            feedback: feedback || 'Resposta incorreta'
                          });
                        }}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Incorreta
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpandido(resposta.id)}
                >
                  Ver resposta e validar
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
            <span>⏱️ {resposta.tempo_resposta_ms}ms</span>
            <span>📅 {new Date(resposta.created_date).toLocaleString('pt-BR')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}