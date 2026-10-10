import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Play, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import RouteGuard from "@/components/auth/RouteGuard";

/**
 * P2.10 - Página de Testes de Compliance
 */
export default function TestesCompliance() {
  const [resultado, setResultado] = useState(null);
  const [executando, setExecutando] = useState(false);

  const executarTeste = async () => {
    setExecutando(true);
    setResultado(null);

    try {
      const response = await base44.functions.invoke('testarFluxoAceiteTermo', {});
      setResultado(response.data);
    } catch (error) {
      setResultado({
        erro: true,
        mensagem: error.message
      });
    } finally {
      setExecutando(false);
    }
  };

  return (
    <RouteGuard requireAuth={true}>
      <div className="space-y-6">
        <PageHeader
          title="Testes de Compliance"
          description="P2.10 - Testes E2E do fluxo de aceite de termos legais"
          breadcrumbs={[
            { label: "Compliance" },
            { label: "Testes" }
          ]}
        />

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Teste E2E: Aceite de Termo</h2>
              <p className="text-sm text-gray-600 mt-1">
                Valida todo o fluxo: criação → busca → aceite → validação → remoção
              </p>
            </div>
            <Button
              onClick={executarTeste}
              disabled={executando}
              className="flex items-center gap-2"
            >
              {executando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Executar Teste
                </>
              )}
            </Button>
          </div>

          {resultado && (
            <div className="space-y-4">
              {/* Resultado Final */}
              <div className={`p-4 rounded-lg border-2 ${
                resultado.resultado_final === '✅ TESTE PASSOU' 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-red-50 border-red-500'
              }`}>
                <p className="font-bold text-lg">
                  {resultado.resultado_final || '❌ ERRO NO TESTE'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Executado em: {resultado.timestamp}
                </p>
              </div>

              {/* Passos */}
              {resultado.passos && (
                <div className="space-y-2">
                  <h3 className="font-bold text-gray-900">Passos Executados:</h3>
                  {resultado.passos.map((passo, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        passo.status === 'sucesso' ? 'bg-green-50 border-green-200' :
                        passo.status?.includes('FALHA') ? 'bg-red-50 border-red-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {passo.status === 'sucesso' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : passo.status?.includes('FALHA') ? (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            Passo {passo.passo}: {passo.acao?.replace(/_/g, ' ')}
                          </p>
                          {passo.status && (
                            <Badge variant={passo.status === 'sucesso' ? 'success' : 'error'}>
                              {passo.status}
                            </Badge>
                          )}
                          {Object.entries(passo).filter(([k, v]) => k !== 'passo' && k !== 'acao' && k !== 'status').map(([key, value]) => (
                            <p key={key} className="text-xs text-gray-600 mt-1">
                              {key}: {JSON.stringify(value)}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Erro */}
              {resultado.erro && (
                <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg">
                  <p className="font-bold text-red-900">Erro:</p>
                  <p className="text-sm text-red-700 mt-1">{resultado.mensagem}</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Legenda */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="font-bold text-blue-900 mb-3">Como interpretar:</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✅ <strong>TESTE PASSOU</strong> = Fluxo funcional, sem loop infinito</li>
            <li>❌ <strong>LOOP DETECTADO</strong> = Termo não sai da lista após aceite → BUG CRÍTICO</li>
            <li>⚠️ <strong>FALHA CRÍTICA</strong> = Aceite não foi salvo no banco</li>
          </ul>
        </Card>
      </div>
    </RouteGuard>
  );
}