import React from "react";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/Button";
import { Play, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function PipelineQualidade() {
  const [resultado, setResultado] = React.useState(null);

  const executarMutation = useMutation({
    mutationFn: async (tipo) => {
      const res = await base44.functions.invoke('auditarQualidadeCodigo', { tipo_auditoria: tipo });
      setResultado(res.data);
      return res.data;
    }
  });

  const gates = [
    { id: 'eslint', nome: 'ESLint (Código)', desc: 'Validação de regras StyleGuide' },
    { id: 'lighthouse', nome: 'Lighthouse (Performance)', desc: 'Score >= 90, FCP < 1.8s' },
    { id: 'e2e', nome: 'E2E (Flows)', desc: 'Simulação de fluxos críticos' },
    { id: 'completa', nome: 'Pipeline Completa', desc: 'Todos os gates' }
  ];

  return (
    <RouteGuard requireAuth>
      <PageHeader
        title="🚦 Pipeline de Qualidade"
        description="CI/CD via Backend Functions (sem GitHub Actions)"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gates.map(gate => (
          <div key={gate.id} className="pc-card p-6">
            <h3 className="font-bold mb-2">{gate.nome}</h3>
            <p className="text-sm text-gray-600 mb-4">{gate.desc}</p>
            <Button 
              onClick={() => executarMutation.mutate(gate.id)}
              loading={executarMutation.isPending}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Executar
            </Button>
          </div>
        ))}
      </div>

      {resultado && (
        <div className={`pc-card p-6 mt-6 ${resultado.passou_gates ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
          <div className="flex items-center gap-3 mb-4">
            {resultado.passou_gates ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <XCircle className="w-8 h-8 text-red-600" />
            )}
            <div>
              <h3 className="font-bold text-xl">{resultado.recomendacao}</h3>
              <p className="text-sm">Score Total: {resultado.score_total.toFixed(1)}/100</p>
            </div>
          </div>

          <div className="space-y-4">
            {resultado.auditorias?.map((audit, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold">{audit.tipo.toUpperCase()}</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    audit.score >= 90 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {audit.score?.toFixed(1)}
                  </span>
                </div>
                {audit.violacoes && (
                  <div className="text-xs text-gray-600">
                    {audit.violacoes.length} violações detectadas
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </RouteGuard>
  );
}