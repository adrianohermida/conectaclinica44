import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Shield, Play, Loader2, CheckCircle, AlertCircle, Download, Clock, Zap, GitBranch, Database, Activity } from "lucide-react";
import { toast } from "sonner";
import CIOrchestratorPanel from "@/components/testes/CIOrchestratorPanel";
import CIStatusBadge from "@/components/testes/CIStatusBadge";
import TestExecutionTimeline from "@/components/testes/TestExecutionTimeline";
import E2EHistoryChart from "@/components/testes/E2EHistoryChart";
import StatCard from "@/components/ui/StatCard";
import ModuleCard from "@/components/ui/ModuleCard";

export default function TestesE2E() {
  return (
    <RouteGuard requireAuth>
      <TestesContent />
    </RouteGuard>
  );
}

function TestesContent() {
  const [resultado, setResultado] = useState(null);
  const [executando, setExecutando] = useState(false);
  const [autorun, setAutorun] = useState(false);

  const executarTestesMutation = useMutation({
    mutationFn: async () => {
      setExecutando(true);
      const inicio = Date.now();
      const res = await base44.functions.invoke('testeE2EIsolamentoCompleto', {});
      const duracao = Date.now() - inicio;
      return { ...res.data, duracao_total_ms: duracao };
    },
    onSuccess: (data) => {
      setResultado(data);
      setExecutando(false);
      
      if (data.failed > 0) {
        toast.error(`❌ ${data.failed} testes falharam - DEPLOY BLOQUEADO`, {
          duration: 10000,
          description: `Score: ${data.score}`
        });
      } else {
        toast.success(`✅ ${data.passed} testes passaram`, {
          description: `Score: ${data.score} em ${(data.duracao_total_ms / 1000).toFixed(1)}s`
        });
      }
    },
    onError: (error) => {
      setExecutando(false);
      toast.error('Erro ao executar testes', { description: error.message });
    }
  });

  // Auto-executar se habilitado
  React.useEffect(() => {
    if (autorun && !resultado) {
      executarTestesMutation.mutate();
    }
  }, [autorun]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="🧪 Testes E2E - Isolamento Multi-Tenant"
        description="Suite completa de validação de isolamento em todos os módulos críticos"
        breadcrumbs={[
          { label: "SuperAdmin", url: "/SuperAdmin" },
          { label: "Testes E2E" }
        ]}
      />

      {/* CI Status Badge */}
      <div className="flex justify-end">
        <CIStatusBadge />
      </div>

      {/* Hero Status */}
      <div className="pc-card p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
                 style={{ 
                   backgroundColor: executando ? '#f5f3ff' : resultado?.ci_cd_gate === false ? '#fef2f2' : resultado?.ci_cd_gate === true ? '#e6f7ed' : '#f5f3ff'
                 }}>
              {executando ? (
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#7E57FF' }} />
              ) : resultado?.ci_cd_gate === false ? (
                <AlertCircle className="w-10 h-10" style={{ color: '#ea4335' }} />
              ) : resultado?.ci_cd_gate === true ? (
                <CheckCircle className="w-10 h-10" style={{ color: '#34a853' }} />
              ) : (
                <Shield className="w-10 h-10" style={{ color: '#7E57FF' }} />
              )}
            </div>
            
            <div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#202124' }}>
                {executando ? 'Executando testes...' : resultado ? resultado.status : 'Pronto para executar'}
              </h2>
              
              {resultado && (
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: '#5f6368' }}>Score:</span>
                    <span className="text-2xl font-bold" style={{ 
                      color: resultado.failed > 0 ? '#ea4335' : '#34a853' 
                    }}>
                      {resultado.score}
                    </span>
                  </div>
                  
                  <div className="h-6 w-px bg-gray-300" />
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" style={{ color: '#34a853' }} />
                    <span className="font-medium" style={{ color: '#34a853' }}>{resultado.passed}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" style={{ color: '#ea4335' }} />
                    <span className="font-medium" style={{ color: '#ea4335' }}>{resultado.failed}</span>
                  </div>
                  
                  <div className="h-6 w-px bg-gray-300" />
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: '#5f6368' }} />
                    <span className="text-sm" style={{ color: '#5f6368' }}>
                      {(resultado.duracao_total_ms / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>
              )}
              
              {!resultado && !executando && (
                <p className="text-sm" style={{ color: '#5f6368' }}>
                  17 módulos cobertos • ~30s de execução
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => setAutorun(!autorun)}
              className={`px-4 py-3 rounded-xl font-medium text-sm flex items-center gap-2 border-2`}
              style={{ 
                borderColor: autorun ? '#34a853' : '#e8eaed',
                backgroundColor: autorun ? '#e6f7ed' : 'white',
                color: autorun ? '#1f6332' : '#5f6368'
              }}
            >
              <GitBranch className="w-5 h-5" />
              {autorun ? 'CI/CD: ON' : 'CI/CD: OFF'}
            </button>
            
            <button
              onClick={() => executarTestesMutation.mutate()}
              disabled={executando}
              className="px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-3 flex-1 md:flex-initial"
              style={{ 
                backgroundColor: '#7E57FF', 
                color: 'white',
                opacity: executando ? 0.6 : 1
              }}
            >
              {executando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Executar Testes
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        {executando && (
          <div className="mt-6">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#7E57FF] to-[#34a853] animate-pulse" 
                   style={{ width: '70%' }} />
            </div>
            <p className="text-xs mt-2 text-center" style={{ color: '#5f6368' }}>
              Testando isolamento em 17 módulos...
            </p>
          </div>
        )}
      </div>

      {/* Métricas - Componentizadas */}
      {resultado && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard 
            icon={CheckCircle}
            label="Passaram"
            value={resultado.passed}
            color="#34a853"
            bgColor="#e6f7ed"
          />
          <StatCard 
            icon={AlertCircle}
            label="Falharam"
            value={resultado.failed}
            color="#ea4335"
            bgColor="#fef2f2"
          />
          <StatCard 
            icon={Zap}
            label="Cobertura"
            value={resultado.suites.length}
            color="#7E57FF"
            bgColor="#f5f3ff"
          />
          <StatCard 
            icon={Shield}
            label="CI/CD Gate"
            value={resultado.ci_cd_gate ? '✓ PASSA' : '✗ BLOQUEIA'}
            color={resultado.ci_cd_gate ? '#34a853' : '#ea4335'}
            bgColor={resultado.ci_cd_gate ? '#e6f7ed' : '#fef2f2'}
          />
        </div>
      )}

      {/* Timeline de Execução */}
      {resultado && resultado.suites && (
        <div className="pc-card p-6">
          <TestExecutionTimeline 
            suites={resultado.suites} 
            totalDuracao={resultado.duracao_total_ms}
          />
        </div>
      )}

      {/* Grid de Suites - Visual melhor */}
      {resultado && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold" style={{ color: '#202124' }}>
              Resultados por Módulo ({resultado.suites.length})
            </h3>
            {resultado.log && (
              <button
                onClick={() => {
                  const blob = new Blob([resultado.log.join('\n')], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `e2e-tests-${new Date().toISOString()}.log`;
                  a.click();
                }}
                className="px-3 py-2 rounded-lg border font-medium text-xs flex items-center gap-2 hover:bg-gray-50"
                style={{ borderColor: '#e8eaed' }}
              >
                <Download className="w-4 h-4" />
                Download Log
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resultado.suites.map((suite, i) => (
              <ModuleCard
                key={i}
                title={suite.suite}
                status={suite.status}
                passed={suite.passed}
                failed={suite.failed}
                badge={suite.status}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recomendações + Módulos Lentos */}
      {resultado && resultado.recomendacoes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="pc-card p-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: '#202124' }}>
              {resultado.failed > 0 ? '🚨 Ações Obrigatórias' : '✅ Próximos Passos'}
            </h3>
            <ul className="space-y-2">
              {resultado.recomendacoes.map((rec, i) => (
                <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#5f6368' }}>
                  <span>•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Módulos Lentos */}
          {resultado.modulos_lentos && resultado.modulos_lentos.length > 0 && (
            <div className="pc-card p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: '#202124' }}>
                ⚡ Performance Alerts
              </h3>
              <p className="text-xs mb-3" style={{ color: '#5f6368' }}>
                Módulos com execução &gt; 3s (otimizar):
              </p>
              <div className="space-y-2">
                {resultado.modulos_lentos.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border"
                       style={{ borderColor: '#fcd34d', backgroundColor: '#fef9e5' }}>
                    <span className="text-sm font-medium" style={{ color: '#713f12' }}>
                      {m.modulo}
                    </span>
                    <span className="text-xs font-mono" style={{ color: '#956802' }}>
                      {m.tempo_ms}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log Completo */}
      {resultado && (
        <details className="pc-card p-6">
          <summary className="cursor-pointer font-bold mb-4" style={{ color: '#202124' }}>
            📋 Log Completo ({resultado.log.length} linhas)
          </summary>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-96">
            {resultado.log.join('\n')}
          </pre>
        </details>
      )}

      {/* Arquitetura e Stats */}
      {resultado && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="pc-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#e0f2fe' }}>
                <Database className="w-5 h-5" style={{ color: '#0284c7' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: '#5f6368' }}>Total Operações</p>
                <p className="text-2xl font-bold" style={{ color: '#202124' }}>
                  {resultado.total}
                </p>
              </div>
            </div>
            <p className="text-xs" style={{ color: '#80868b' }}>
              {resultado.suites.length} módulos × 3 testes cada
            </p>
          </div>

          <div className="pc-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef9e5' }}>
                <Activity className="w-5 h-5" style={{ color: '#fbbc04' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: '#5f6368' }}>Criticidade</p>
                <p className="text-lg font-bold" style={{ color: '#202124' }}>
                  {resultado.criticidade}
                </p>
              </div>
            </div>
          </div>

          <div className="pc-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
                   style={{ backgroundColor: resultado.ci_cd_gate ? '#e6f7ed' : '#fef2f2' }}>
                <Shield className="w-5 h-5" style={{ color: resultado.ci_cd_gate ? '#34a853' : '#ea4335' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: '#5f6368' }}>Deploy Status</p>
                <p className="text-lg font-bold" style={{ 
                  color: resultado.ci_cd_gate ? '#16a34a' : '#dc2626' 
                }}>
                  {resultado.ci_cd_gate ? 'LIBERADO' : 'BLOQUEADO'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instruções CI/CD Expandidas */}
      <div className="pc-card p-6">
        <h3 className="text-lg font-bold mb-4" style={{ color: '#202124' }}>
          🔧 Setup CI/CD Automático
        </h3>
        
        <div className="space-y-6">
          {/* GitHub Actions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
                <GitBranch className="w-4 h-4" style={{ color: '#7E57FF' }} />
              </div>
              <h4 className="font-bold" style={{ color: '#202124' }}>GitHub Actions (Recomendado)</h4>
            </div>
            <p className="text-xs mb-3" style={{ color: '#5f6368' }}>
              Crie <code className="bg-gray-100 px-1 rounded">.github/workflows/e2e.yml</code>:
            </p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-[10px] overflow-x-auto leading-relaxed">
{`name: E2E Multi-Tenant Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run E2E Tests
        id: e2e
        run: |
          RESPONSE=$(curl -s -X POST \\
            https://base44.app/api/apps/\${{ secrets.BASE44_APP_ID }}/functions/testeE2EIsolamentoCompleto \\
            -H "Authorization: Bearer \${{ secrets.BASE44_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d '{}')
          
          echo "$RESPONSE" | jq .
          
          GATE=$(echo "$RESPONSE" | jq -r '.ci_cd_gate')
          echo "gate=$GATE" >> $GITHUB_OUTPUT
          
          if [ "$GATE" != "true" ]; then
            echo "❌ Tests FAILED - blocking deploy"
            exit 1
          fi
          
      - name: Comment PR
        if: github.event_name == 'pull_request'
        run: |
          gh pr comment \${{ github.event.pull_request.number }} \\
            --body "✅ E2E Tests PASSED - safe to merge"`}
            </pre>
          </div>

          {/* Vercel - SETUP COMPLETO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
                <Zap className="w-4 h-4" style={{ color: '#7E57FF' }} />
              </div>
              <h4 className="font-bold" style={{ color: '#202124' }}>Vercel Setup Completo</h4>
            </div>

            {/* STEP 1: Cron */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#fef9e5', border: '1px solid #fcd34d' }}>
              <p className="text-xs font-bold mb-2" style={{ color: '#713f12' }}>
                STEP 1: Configurar Cron (Dashboard Vercel)
              </p>
              <ol className="text-xs space-y-2" style={{ color: '#78350f' }}>
                <li>1. Acesse <strong>Vercel Dashboard → Project → Settings → Cron Jobs</strong></li>
                <li>2. Adicione novo Cron Job:</li>
              </ol>
              <pre className="bg-white p-3 rounded text-[10px] mt-2 border" style={{ borderColor: '#fcd34d' }}>
{`Path: /api/apps/6933153160425a5bbedbcb87/functions/cronE2EDaily
Schedule: 0 3 * * *
(Diariamente 03:00 UTC = 00:00 BRT)`}
              </pre>
            </div>

            {/* STEP 2: Ignore Build */}
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: '#202124' }}>
                STEP 2: Bloquear Deploy se Tests Falham (Opcional)
              </p>
              <p className="text-xs mb-2" style={{ color: '#5f6368' }}>
                Crie <code className="bg-gray-100 px-1 rounded">vercel-ignore-build.sh</code> na raiz:
              </p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-[10px] overflow-x-auto">
{`#!/bin/bash
# vercel-ignore-build.sh

RESPONSE=$(curl -s -X POST \\
  https://base44.app/api/apps/6933153160425a5bbedbcb87/functions/testeE2EIsolamentoCompleto \\
  -H "Authorization: Bearer \${VERCEL_AUTOMATION_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{}')

GATE=$(echo "$RESPONSE" | jq -r '.ci_cd_gate')

if [ "$GATE" == "true" ]; then
  echo "✅ E2E Tests PASSED - proceeding with build"
  exit 1  # Build
else
  echo "❌ E2E Tests FAILED - skipping build"
  exit 0  # Don't build
fi`}
              </pre>
              <p className="text-xs mt-2" style={{ color: '#5f6368' }}>
                Depois configure: <strong>Settings → Git → Ignored Build Step</strong> → <code>bash ./vercel-ignore-build.sh</code>
              </p>
            </div>

            {/* STEP 3: Variável de Ambiente */}
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#e0f2fe', border: '1px solid #0284c7' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#075985' }}>
                💡 STEP 3: Token de Autenticação
              </p>
              <p className="text-xs" style={{ color: '#0c4a6e' }}>
                Adicione <code>VERCEL_AUTOMATION_TOKEN</code> nas Environment Variables do Vercel (crie um Bearer token admin)
              </p>
            </div>
          </div>

          {/* Cron - IMPLEMENTADO */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#e6f7ed', border: '2px solid #34a853' }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5" style={{ color: '#34a853' }} />
              <h4 className="font-bold" style={{ color: '#1f6332' }}>✅ Cron Daily Configurado</h4>
            </div>
            <p className="text-xs mb-3" style={{ color: '#1f6332' }}>
              Execução automática diária às <strong>03:00 UTC</strong> (00:00 BRT)
            </p>
            <pre className="bg-white p-3 rounded-lg text-[10px] overflow-x-auto border mb-3" style={{ borderColor: '#34a853' }}>
{`// function: cronE2EDaily
✓ Executa testes completos
✓ Notifica admins por email se falhar
✓ Score < 100% = email crítico imediato`}
            </pre>
            <div className="flex items-start gap-2 text-xs" style={{ color: '#1f6332' }}>
              <span>📧</span>
              <span>Emails automáticos incluem: score, módulos falhados e link direto para esta página</span>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico */}
      {resultado && (
        <div className="pc-card p-6">
          <E2EHistoryChart execucoes={[]} />
        </div>
      )}

      {/* Orchestrator */}
      <div className="pc-card p-6">
        <CIOrchestratorPanel />
      </div>

      {/* Como adicionar testes */}
      <div className="pc-card p-6">
        <h3 className="text-lg font-bold mb-4" style={{ color: '#202124' }}>
          ➕ Adicionar Novos Módulos
        </h3>
        <div className="space-y-3">
          <p className="text-sm" style={{ color: '#5f6368' }}>
            Para adicionar um novo módulo ao teste automático:
          </p>
          
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="font-bold text-[#7E57FF]">1.</span>
              <span style={{ color: '#5f6368' }}>
                Edite <code className="bg-gray-100 px-1 rounded">functions/testeE2EIsolamentoCompleto</code>
              </span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="font-bold text-[#7E57FF]">2.</span>
              <span style={{ color: '#5f6368' }}>
                Copie o bloco de teste de qualquer suite existente
              </span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="font-bold text-[#7E57FF]">3.</span>
              <span style={{ color: '#5f6368' }}>
                Ajuste nome da entidade e campos <code className="bg-gray-100 px-1 rounded">required</code>
              </span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="font-bold text-[#7E57FF]">4.</span>
              <span style={{ color: '#5f6368' }}>
                Deploy → Execute testes → Valide score 100%
              </span>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#e0f2fe', border: '1px solid #0284c7' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#075985' }}>
              💡 Template rápido:
            </p>
            <pre className="bg-white p-3 rounded text-[10px] overflow-x-auto" style={{ color: '#202124' }}>
{`const moduloResult = await testIsolamento(
  'SuaEntidade',
  { clinica_id: clinica1.id, campo_required: 'valor1' },
  { clinica_id: clinica2.id, campo_required: 'valor2' },
  'Nome do Módulo'
);
suites.push(moduloResult);
log.push(...moduloResult.logs);
totalPassed += moduloResult.passed;
totalFailed += moduloResult.failed;`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}