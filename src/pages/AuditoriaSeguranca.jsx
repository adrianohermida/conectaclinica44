import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { AlertCircle, CheckCircle2, Shield, AlertTriangle, Play, RefreshCw } from "lucide-react";
import RouteGuard from "@/components/auth/RouteGuard";

export default function AuditoriaSeguranca() {
  const [executando, setExecutando] = useState(false);

  // Query para executar auditoria
  const { data: auditoria, isLoading, refetch } = useQuery({
    queryKey: ["auditoria-seguranca"],
    queryFn: async () => {
      setExecutando(true);
      try {
        const response = await base44.functions.invoke("auditarMultitenancyBrutal", {});
        return response.data;
      } finally {
        setExecutando(false);
      }
    },
    enabled: false,
    staleTime: 0
  });

  // Mutation para corrigir vulnerabilidades
  const corrigirMutation = useMutation({
    mutationFn: async (modo) => {
      const response = await base44.functions.invoke("corrigirVazamentosMultitenant", {
        modo,
        entidades: [] // Vazio = processar todas as críticas
      });
      return response.data;
    }
  });

  const handleExecutarAuditoria = () => {
    refetch();
  };

  const handleCorrigir = async (dryRun = true) => {
    if (!dryRun) {
      if (!confirm("⚠️ ATENÇÃO: Isso vai DELETAR registros órfãos e aplicar correções PERMANENTES. Confirma?")) {
        return;
      }
    }
    await corrigirMutation.mutateAsync(dryRun ? "dry_run" : "execute");
    // Re-auditar após correção
    setTimeout(() => refetch(), 2000);
  };

  const score = auditoria?.score || 0;
  const criticas = auditoria?.vulnerabilidades?.filter(v => v.severidade === 'CRÍTICA') || [];
  const altas = auditoria?.vulnerabilidades?.filter(v => v.severidade === 'ALTA') || [];

  return (
    <RouteGuard requireAuth>
      <PageHeader
        title="Auditoria de Segurança Multi-Tenant"
        description="Varredura automatizada de vulnerabilidades críticas (LGPD/GDPR)"
      />

      {/* Botão Principal */}
      <div className="mb-6 flex gap-3">
        <Button
          onClick={handleExecutarAuditoria}
          disabled={executando}
          icon={executando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        >
          {executando ? "Auditando..." : "Executar Auditoria"}
        </Button>

        {auditoria && criticas.length > 0 && (
          <>
            <Button
              variant="outline"
              onClick={() => handleCorrigir(true)}
              disabled={corrigirMutation.isPending}
            >
              Simular Correções (Dry Run)
            </Button>
            <Button
              variant="danger"
              onClick={() => handleCorrigir(false)}
              disabled={corrigirMutation.isPending}
            >
              Aplicar Correções AGORA
            </Button>
          </>
        )}
      </div>

      {/* Loading State */}
      {executando && (
        <div className="pc-card p-8 text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-[var(--pc-primary)]" />
          <p className="text-lg font-medium">Escaneando codebase e banco de dados...</p>
          <p className="text-sm text-gray-500 mt-2">Isso pode levar até 30 segundos</p>
        </div>
      )}

      {/* Resultado da Correção */}
      {corrigirMutation.data && (
        <div className="pc-card p-6 mb-6 border-2 border-blue-200 bg-blue-50">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            Correção {corrigirMutation.data.modo === 'dry_run' ? 'Simulada' : 'Aplicada'}
          </h3>
          <div className="space-y-2">
            {corrigirMutation.data.acoes?.map((acao, idx) => (
              <div key={idx} className="text-sm bg-white p-3 rounded-lg">
                <span className="font-medium">{acao.tipo}:</span> {acao.acao}
                {acao.quantidade && <span className="ml-2 text-gray-600">({acao.quantidade} registros)</span>}
                {acao.erro && <span className="ml-2 text-red-600">ERRO: {acao.erro}</span>}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-4">{corrigirMutation.data.resumo?.proximo_passo}</p>
        </div>
      )}

      {/* Score Card */}
      {auditoria && (
        <div className={`pc-card p-8 mb-6 text-center ${
          score === 100 ? 'border-2 border-green-500 bg-green-50' :
          score >= 70 ? 'border-2 border-yellow-500 bg-yellow-50' :
          'border-2 border-red-500 bg-red-50'
        }`}>
          <div className="text-6xl font-bold mb-4" style={{ 
            color: score === 100 ? 'var(--pc-success)' : 
                   score >= 70 ? 'var(--pc-warning)' : 
                   'var(--pc-error)' 
          }}>
            {score}/100
          </div>
          <h2 className="text-2xl font-bold mb-2">{auditoria.status}</h2>
          <div className="flex gap-6 justify-center mt-4">
            <div>
              <div className="text-3xl font-bold text-red-600">{criticas.length}</div>
              <div className="text-sm text-gray-600">Críticas</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-600">{altas.length}</div>
              <div className="text-sm text-gray-600">Altas</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{auditoria.ok?.length || 0}</div>
              <div className="text-sm text-gray-600">OK</div>
            </div>
          </div>
        </div>
      )}

      {/* Vulnerabilidades Críticas */}
      {criticas.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-6 h-6" />
            Vulnerabilidades Críticas ({criticas.length})
          </h3>
          <div className="space-y-4">
            {criticas.map((v, idx) => (
              <div key={idx} className="pc-card p-6 border-l-4 border-red-500">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">
                        CRÍTICA
                      </span>
                      <span className="text-sm text-gray-600">{v.tipo}</span>
                      {v.entidade && <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{v.entidade}</span>}
                      {v.metodo && <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{v.metodo}</span>}
                    </div>
                    <p className="font-semibold mb-1">{v.descricao}</p>
                    <p className="text-sm text-red-700 mb-2">
                      <strong>Impacto:</strong> {v.impacto}
                    </p>
                    <p className="text-sm bg-blue-50 p-3 rounded border border-blue-200">
                      <strong>Ação:</strong> {v.acao}
                    </p>
                    {v.clinicas_vazadas && (
                      <div className="mt-2 text-sm">
                        <strong>Clínicas Vazadas:</strong> {v.clinicas_vazadas.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vulnerabilidades Altas */}
      {altas.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="w-6 h-6" />
            Vulnerabilidades Altas ({altas.length})
          </h3>
          <div className="space-y-4">
            {altas.map((v, idx) => (
              <div key={idx} className="pc-card p-6 border-l-4 border-yellow-500">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">
                        ALTA
                      </span>
                      <span className="text-sm text-gray-600">{v.tipo}</span>
                    </div>
                    <p className="font-semibold mb-1">{v.descricao}</p>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Impacto:</strong> {v.impacto}
                    </p>
                    <p className="text-sm bg-blue-50 p-3 rounded border border-blue-200">
                      <strong>Ação:</strong> {v.acao}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {auditoria?.warnings?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-600">
            <AlertTriangle className="w-5 h-5" />
            Avisos ({auditoria.warnings.length})
          </h3>
          <div className="space-y-2">
            {auditoria.warnings.map((w, idx) => (
              <div key={idx} className="pc-card p-4 bg-gray-50">
                <p className="text-sm">
                  <strong>{w.tipo}:</strong> {w.descricao}
                  {w.detalhe && <span className="text-gray-600"> - {w.detalhe}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Próximos Passos */}
      {auditoria?.proximos_passos?.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Próximos Passos
          </h3>
          <div className="space-y-3">
            {auditoria.proximos_passos.map((passo, idx) => (
              <div key={idx} className="pc-card p-4 border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">
                    P{passo.prioridade}
                  </span>
                  <span className="font-semibold">{passo.acao}</span>
                </div>
                {passo.motivo && (
                  <p className="text-sm text-gray-600">{passo.motivo}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </RouteGuard>
  );
}