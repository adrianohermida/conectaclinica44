import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { FileText, Zap, Shield, AlertTriangle, BookOpen, Code } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";

export default function Documentacao() {
  usePerformanceTracker('/Documentacao');
  const [tabAtiva, setTabAtiva] = useState("arquitetura");
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 80);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <RouteGuard requireAuth={true} requireClinica={true}>
        <div className="space-y-6 overflow-x-hidden animate-pulse">
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            <div className="h-8 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-5 bg-gray-200 rounded w-64" />
          </div>
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            <div className="space-y-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-6 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <div className="space-y-5 md:space-y-6 overflow-x-hidden">:::
      <PageHeader
        title="Documentação"
        description="Arquitetura e SLOs"
      />

      <Tabs
        tabs={[
          { value: "arquitetura", label: "Arquitetura", icon: Code },
          { value: "slos", label: "SLOs", icon: Zap },
          { value: "runbooks", label: "Runbooks", icon: AlertTriangle }
        ]}
        activeTab={tabAtiva}
        onChange={setTabAtiva}
      />

      {tabAtiva === "arquitetura" && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">🏗️ Arquitetura PrevenClin v2.0</h2>
          
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-2">Stack Tecnológico</h3>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li><strong>Frontend:</strong> React 18 + Tailwind CSS + Framer Motion</li>
                <li><strong>Backend:</strong> Base44 BaaS + Deno Deploy Functions</li>
                <li><strong>Database:</strong> Base44 Entities (PostgreSQL abstrato)</li>
                <li><strong>Cache:</strong> React Query (staleTime 30min)</li>
                <li><strong>Payments:</strong> Stripe (checkout + webhooks)</li>
                <li><strong>AI:</strong> Base44 InvokeLLM + agentes especializados</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Camadas</h3>
              
              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">1. Presentation Layer</h4>
                  <p className="text-sm"><strong>Localização:</strong> /pages, /components</p>
                  <p className="text-sm mt-1"><strong>Core:</strong> Dashboard, Pacientes, Prontuários, Agenda</p>
                  <p className="text-sm"><strong>Beta (lazy):</strong> Jornada, Planos Tratamento, IA, Telemedicina</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">2. Application Layer</h4>
                  <p className="text-sm"><strong>Localização:</strong> /functions</p>
                  <p className="text-sm mt-1"><strong>Backend Functions:</strong> testarCRUD*, auditoriaLGPD, agregadorMetricas, stripeWebhook</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">3. Domain Layer</h4>
                  <p className="text-sm"><strong>Localização:</strong> /entities</p>
                  <p className="text-sm mt-1"><strong>Core:</strong> Paciente, Prontuario, Agendamento (multi-tenant)</p>
                  <p className="text-sm mt-1"><strong>Compliance:</strong> ROPA, DPIA, LogAcessoDado</p>
                  <p className="text-sm mt-1"><strong>Performance:</strong> MetricaPerformance, AlertaPerformance</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Multi-tenancy</h3>
              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-600">
                <p className="text-sm font-mono">✅ base44.entities.Paciente.filter({'{'}clinica_id: user.clinica_id{'}'})</p>
                <p className="text-sm font-mono text-red-600 mt-2">❌ base44.entities.Paciente.list() // vazamento</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Performance</h3>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li><strong>VirtualizedList:</strong> Listas &gt;50 itens (Pacientes, Prontuários, Agenda)</li>
                <li><strong>useOptimizedQuery:</strong> Cache 30min dados estáveis</li>
                <li><strong>usePerformanceTracker:</strong> Coleta FCP, LCP, render time</li>
                <li><strong>Lazy Load:</strong> Páginas beta (bundle -40%)</li>
              </ul>
            </section>
          </div>
        </Card>
      )}

      {tabAtiva === "slos" && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">⚡ Service Level Objectives</h2>
          
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-3">Latência Targets</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Módulo</th>
                      <th className="text-right p-3 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>P50</th>
                      <th className="text-right p-3 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>P95</th>
                      <th className="text-right p-3 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>P99</th>
                      <th className="text-right p-3 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Uptime</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f3f4' }}>
                      <td className="p-3 min-h-[48px]" style={{ color: '#202124', fontSize: '14px' }}>Pacientes (list)</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>&lt;100ms</td>
                      <td className="text-right font-bold min-h-[48px]" style={{ color: '#e37400', fontSize: '14px' }}>&lt;200ms</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>&lt;500ms</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>99.9%</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f3f4' }}>
                      <td className="p-3 min-h-[48px]" style={{ color: '#202124', fontSize: '14px' }}>Prontuários (list)</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>&lt;100ms</td>
                      <td className="text-right font-bold min-h-[48px]" style={{ color: '#e37400', fontSize: '14px' }}>&lt;200ms</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>&lt;500ms</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>99.9%</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f3f4' }}>
                      <td className="p-3 min-h-[48px]" style={{ color: '#202124', fontSize: '14px' }}>Agenda (calendar)</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>&lt;80ms</td>
                      <td className="text-right font-bold min-h-[48px]" style={{ color: '#e37400', fontSize: '14px' }}>&lt;150ms</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>&lt;300ms</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>99.9%</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f3f4' }}>
                      <td className="p-3 min-h-[48px]" style={{ color: '#202124', fontSize: '14px' }}>Dashboard</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>&lt;150ms</td>
                      <td className="text-right font-bold min-h-[48px]" style={{ color: '#e37400', fontSize: '14px' }}>&lt;300ms</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>&lt;800ms</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>99.5%</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f3f4' }}>
                      <td className="p-3 min-h-[48px]" style={{ color: '#202124', fontSize: '14px' }}>IA Diagnóstico</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>&lt;2s</td>
                      <td className="text-right font-bold min-h-[48px]" style={{ color: '#e37400', fontSize: '14px' }}>&lt;5s</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>&lt;10s</td>
                      <td className="text-right min-h-[48px]" style={{ color: '#5f6368', fontSize: '14px' }}>99%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">Taxa de Erro</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700 mb-1">Frontend</p>
                  <p className="text-2xl font-bold text-green-800">&lt;0.5%</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-700 mb-1">Backend 4xx</p>
                  <p className="text-2xl font-bold text-yellow-800">&lt;1%</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-xs text-red-700 mb-1">Backend 5xx</p>
                  <p className="text-2xl font-bold text-red-800">&lt;0.1%</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">North Star Metrics</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <ul className="space-y-2 text-sm">
                  <li><strong>Time to Value:</strong> &lt;10min (signup → primeiro agendamento)</li>
                  <li><strong>P95 Global:</strong> &lt;200ms</li>
                  <li><strong>MRR Growth:</strong> +20%/mês</li>
                  <li><strong>Churn:</strong> &lt;5%/mês</li>
                  <li><strong>Retention D30:</strong> &gt;80%</li>
                </ul>
              </div>
            </section>
          </div>
        </Card>
      )}

      {tabAtiva === "runbooks" && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">🚨 Runbooks de Incidentes</h2>
          
          <div className="space-y-6">
            <section className="border-l-4 border-red-600 pl-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                P0: P95 &gt;200ms (SLA: 15min)
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Sintomas:</strong> Dashboard Performance vermelho, usuários lentos</p>
                <p><strong>Diagnóstico:</strong></p>
                <ol className="list-decimal pl-6">
                  <li>Acessar /DashboardPerformance</li>
                  <li>Identificar endpoint violador</li>
                  <li>Verificar P95, P99, taxa erro</li>
                </ol>
                <p><strong>Fix:</strong></p>
                <ul className="list-disc pl-6">
                  <li>Query sem índice → adicionar índice</li>
                  <li>Lista não virtualizada → VirtualizedList</li>
                  <li>Cache inexistente → useOptimizedQuery</li>
                </ul>
              </div>
            </section>

            <section className="border-l-4 border-orange-600 pl-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-600" />
                P0: LGPD Score &lt;75% (SLA: 30min)
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Sintomas:</strong> Auditoria LGPD "NÃO CONFORME", multa &gt;R$10M</p>
                <p><strong>Fix Crítico:</strong></p>
                <ol className="list-decimal pl-6">
                  <li>ROPA vazio → Preencher /ConfiguracaoLGPD</li>
                  <li>Logs inexistentes → Validar LogAcessoDado criado</li>
                  <li>Export/Delete falha → Testar /ExportarDadosPaciente</li>
                </ol>
              </div>
            </section>

            <section className="border-l-4 border-blue-600 pl-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-600" />
                P1: Teste E2E Falha 401 (SLA: 1h)
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Causa:</strong> Backend não validou auth antes de service role</p>
                <p><strong>Fix:</strong></p>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs">
{`const base44 = createClientFromRequest(req);
const user = await base44.auth.me();
if (!user?.clinica_id) {
  return Response.json({ erro: 'Auth falhou' }, { status: 401 });
}
// Agora pode usar asServiceRole`}
                </pre>
              </div>
            </section>

            <section className="border-l-4 border-yellow-600 pl-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                P2: Performance Degradation (SLA: 4h)
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Sintomas:</strong> P95 subiu 50% em 24h</p>
                <p><strong>Ação Preventiva:</strong></p>
                <ol className="list-decimal pl-6">
                  <li>Identificar módulo em DashboardPerformance</li>
                  <li>Checar deploy recente</li>
                  <li>Comparar query plans</li>
                  <li>Otimizar ou adicionar índice</li>
                </ol>
              </div>
            </section>
          </div>
        </Card>
      )}

      {tabAtiva === "slos" && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">⚡ Service Level Objectives</h2>
          
          <div className="space-y-6">
            <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded">
              <p className="text-sm font-semibold text-yellow-900 mb-2">🎯 Meta Principal: P95 &lt;200ms</p>
              <p className="text-xs text-yellow-800">
                Se violado consistentemente: FREEZE features, foco em reliability.
              </p>
            </div>

            <section>
              <h3 className="text-lg font-semibold mb-3">Disponibilidade</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">Componente</th>
                    <th className="text-right p-2">SLA</th>
                    <th className="text-right p-2">Budget Mensal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2">Frontend</td><td className="text-right">99.9%</td><td className="text-right">43min downtime</td></tr>
                  <tr className="border-b"><td className="p-2">Backend</td><td className="text-right">99.5%</td><td className="text-right">3.6h downtime</td></tr>
                  <tr className="border-b"><td className="p-2">Stripe</td><td className="text-right">99.99%</td><td className="text-right">4min downtime</td></tr>
                </tbody>
              </table>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">Error Budget</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm mb-2"><strong>Fórmula:</strong></p>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs">
{`Error Budget = (1 - SLO) × Total Requests

Exemplo: 99.9% SLO, 1M requests/mês
Budget = 0.001 × 1M = 1000 erros permitidos`}
                </pre>
                <p className="text-xs text-red-600 mt-3">
                  ⚠️ Se budget esgotado: FREEZE features até estabilizar
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">Revisão Mensal</h3>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>P95 atual vs target (todas páginas)</li>
                <li>Taxa erro tendência (↑ ou ↓)</li>
                <li>Novos endpoints precisam SLO?</li>
                <li>Budget de erro respeitado?</li>
                <li>Incidentes recorrentes → root cause?</li>
              </ul>
            </section>
          </div>
        </Card>
      )}
      </div>
    </RouteGuard>
  );
}