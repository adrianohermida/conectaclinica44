import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, TrendingUp, AlertCircle, CheckCircle, Package, Zap, Database, Users, Calendar } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";

/**
 * Clínica gerencia sua própria assinatura
 * Ver plano, uso, próximo pagamento, upgrade
 */
export default function GerenciarAssinatura() {
  usePerformanceTracker('/GerenciarAssinatura');
  const { clinicaId } = useClinicaContext();

  const { data: assinaturas = [] } = useQuery({
    queryKey: ["minha_assinatura", clinicaId],
    queryFn: () => clinicaId ? base44.entities.AssinaturaClinica.filter({ clinica_id: clinicaId }) : [],
    enabled: !!clinicaId
  });

  const assinatura = assinaturas[0];

  const { data: creditosIA = [] } = useQuery({
    queryKey: ["creditos_ia", clinicaId],
    queryFn: () => clinicaId ? base44.entities.CreditoIA.filter({ clinica_id: clinicaId }) : [],
    enabled: !!clinicaId
  });

  const creditoIA = creditosIA[0];

  const { data: creditosConsulta = [] } = useQuery({
    queryKey: ["creditos_consulta", clinicaId],
    queryFn: () => clinicaId ? base44.entities.CreditoConsulta.filter({ clinica_id: clinicaId }) : [],
    enabled: !!clinicaId
  });

  const creditoConsulta = creditosConsulta[0];

  // TODOS OS HOOKS DEVEM VIR ANTES DE QUALQUER EARLY RETURN
  const hoje = new Date();
  const { data: clinicaData = null, isLoading: loadingClinicaData } = useQuery({
    queryKey: ["clinica_data", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return null;
      const clinicas = await base44.entities.Clinica.filter({ id: clinicaId });
      return clinicas[0] || null;
    },
    enabled: !!clinicaId && !!assinatura
  });

  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({
    queryKey: ["usuarios_clinica", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return [];
      return await base44.entities.User.filter({ clinica_id: clinicaId });
    },
    enabled: !!clinicaId && !!assinatura
  });

  const { data: pacientes = [], isLoading: loadingPacientes } = useQuery({
    queryKey: ["pacientes_clinica", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return [];
      return await base44.entities.Paciente.filter({ clinica_id: clinicaId });
    },
    enabled: !!clinicaId && !!assinatura
  });

  const { data: agendamentosMes = [], isLoading: loadingAgendamentos } = useQuery({
    queryKey: ["agendamentos_mes", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return [];
      const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
      const todos = await base44.entities.Agendamento.filter({ clinica_id: clinicaId });
      return todos.filter(a => a.data?.startsWith(mesAtual));
    },
    enabled: !!clinicaId && !!assinatura
  });

  const isLoadingMetricas = loadingClinicaData || loadingUsuarios || loadingPacientes || loadingAgendamentos;

  const percentualIA = creditoIA 
    ? ((creditoIA.total_consumido_mes / creditoIA.creditos_mensais_plano) * 100).toFixed(0)
    : 0;

  const percentualConsulta = creditoConsulta
    ? ((creditoConsulta.total_consumido_mes / creditoConsulta.creditos_mensais_plano) * 100).toFixed(0)
    : 0;

  // EARLY RETURN DEPOIS DE TODOS OS HOOKS
  if (!assinatura) {
    return (
      <RouteGuard requireAuth={true} requireClinica={true}>
        <div className="space-y-6">
          <PageHeader title="Gerenciar Assinatura" />
          <div className="oneui-card p-8 text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-700 font-medium mb-4">Você ainda não possui uma assinatura ativa</p>
            <Link to={createPageUrl("PlanosPrecos")} className="oneui-button inline-flex items-center gap-2">
              Ver Planos Disponíveis
            </Link>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <div className="space-y-6 overflow-x-hidden min-w-0">
      <PageHeader
        title="Plano e Pagamentos"
        description="Gerencie seu plano, consumo e créditos"
        breadcrumbs={[{ label: "Configurações" }, { label: "Pagamentos" }]}
      />

      {/* Monitor de Uso do Plano */}
      {isLoadingMetricas ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="h-6 bg-gray-200 rounded w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-8 bg-gray-200 rounded w-16" />
              <div className="h-2 bg-gray-200 rounded-full w-full" />
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-8 bg-gray-200 rounded w-16" />
              <div className="h-2 bg-gray-200 rounded-full w-full" />
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-8 bg-gray-200 rounded w-16" />
              <div className="h-2 bg-gray-200 rounded-full w-full" />
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-8 bg-gray-200 rounded w-16" />
              <div className="h-2 bg-gray-200 rounded-full w-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <h3 className="font-bold mb-6" style={{ color: '#202124', fontSize: '20px' }}>
            Uso do Plano {assinatura.plano_slug.toUpperCase()}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 overflow-hidden">
            {/* Usuários */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" style={{ color: '#7E57FF' }} />
                <p className="font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Usuários</p>
              </div>
              <p className="font-bold mb-2" style={{ color: '#202124', fontSize: '28px' }}>
                {usuarios.length}/{assinatura.limites?.max_usuarios || 3}
              </p>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e8eaed' }}>
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${Math.min((usuarios.length / (assinatura.limites?.max_usuarios || 3)) * 100, 100)}%`,
                    backgroundColor: '#7E57FF'
                  }}
                />
              </div>
              <p className="mt-1 truncate" style={{ color: '#80868b', fontSize: '13px' }}>
                {((usuarios.length / (assinatura.limites?.max_usuarios || 3)) * 100).toFixed(0)}% usado
              </p>
            </div>

            {/* Pacientes */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" style={{ color: '#7E57FF' }} />
                <p className="font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Pacientes</p>
              </div>
              <p className="font-bold mb-2" style={{ color: '#202124', fontSize: '28px' }}>
                {pacientes.length}/{assinatura.limites?.max_pacientes || 100}
              </p>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e8eaed' }}>
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${Math.min((pacientes.length / (assinatura.limites?.max_pacientes || 100)) * 100, 100)}%`,
                    backgroundColor: '#7E57FF'
                  }}
                />
              </div>
              <p className="mt-1 truncate" style={{ color: '#80868b', fontSize: '13px' }}>
                {((pacientes.length / (assinatura.limites?.max_pacientes || 100)) * 100).toFixed(0)}% usado
              </p>
            </div>

            {/* Agendamentos */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4" style={{ color: '#7E57FF' }} />
                <p className="font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Agendamentos</p>
              </div>
              <p className="font-bold mb-2" style={{ color: '#202124', fontSize: '28px' }}>
                {agendamentosMes.length}/{assinatura.limites?.max_agendamentos_mes || 1000}
              </p>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e8eaed' }}>
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${Math.min((agendamentosMes.length / (assinatura.limites?.max_agendamentos_mes || 1000)) * 100, 100)}%`,
                    backgroundColor: '#7E57FF'
                  }}
                />
              </div>
              <p className="mt-1 truncate" style={{ color: '#80868b', fontSize: '13px' }}>
                {((agendamentosMes.length / (assinatura.limites?.max_agendamentos_mes || 1000)) * 100).toFixed(0)}% usado
              </p>
            </div>

            {/* Storage */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4" style={{ color: '#7E57FF' }} />
                <p className="font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Storage</p>
              </div>
              <p className="font-bold mb-2" style={{ color: '#202124', fontSize: '28px' }}>
                {(assinatura.uso_atual?.storage_usado_gb || 0).toFixed(1)}/{assinatura.limites?.storage_gb || 5} GB
              </p>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e8eaed' }}>
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${Math.min(((assinatura.uso_atual?.storage_usado_gb || 0) / (assinatura.limites?.storage_gb || 5)) * 100, 100)}%`,
                    backgroundColor: '#7E57FF'
                  }}
                />
              </div>
              <p className="mt-1 truncate" style={{ color: '#80868b', fontSize: '13px' }}>
                {(((assinatura.uso_atual?.storage_usado_gb || 0) / (assinatura.limites?.storage_gb || 5)) * 100).toFixed(0)}% usado
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Assinatura */}
      <div className="oneui-card p-6 border-l-4 border-green-500 bg-green-50">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-bold text-green-900 mb-1">Assinatura {assinatura.status === 'ativa' ? 'Ativa' : assinatura.status}</h3>
            <p className="text-sm text-green-800">
              Plano <span className="font-bold uppercase">{assinatura.plano_slug}</span> • 
              R$ {((assinatura.valor_mensal_centavos || 0) / 100).toFixed(2)}/mês
            </p>
            {assinatura.data_proximo_pagamento && (
              <p className="text-xs text-green-700 mt-1">
                Próxima cobrança em {format(new Date(assinatura.data_proximo_pagamento), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            )}
          </div>
          <Link to={createPageUrl("PlanosPrecos")} className="oneui-button inline-flex items-center gap-2 text-sm">
            Fazer Upgrade
          </Link>
        </div>
      </div>

      {/* Limites do Plano */}
      <div className="oneui-card p-6">
        <h2 className="text-xl font-medium text-[#202124] mb-4 flex items-center gap-2">
          <Package className="w-6 h-6 text-[#0B7A9E]" />
          Limites do Plano
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-[#f8f9fa] rounded-xl p-4">
            <p className="text-sm text-[#5f6368] mb-1">Usuários</p>
            <p className="text-2xl font-bold text-[#202124]">
              {assinatura.uso_atual?.usuarios || 0} / {assinatura.limites?.max_usuarios || 0}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-[#0B7A9E] h-2 rounded-full"
                style={{ width: `${Math.min((assinatura.uso_atual?.usuarios / assinatura.limites?.max_usuarios) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-[#f8f9fa] rounded-xl p-4">
            <p className="text-sm text-[#5f6368] mb-1">Pacientes</p>
            <p className="text-2xl font-bold text-[#202124]">
              {assinatura.uso_atual?.pacientes || 0} / {assinatura.limites?.max_pacientes || 0}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-[#0B7A9E] h-2 rounded-full"
                style={{ width: `${Math.min((assinatura.uso_atual?.pacientes / assinatura.limites?.max_pacientes) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-[#f8f9fa] rounded-xl p-4">
            <p className="text-sm text-[#5f6368] mb-1">Storage</p>
            <p className="text-2xl font-bold text-[#202124]">
              {(assinatura.uso_atual?.storage_usado_gb || 0).toFixed(1)} / {assinatura.limites?.storage_gb || 0} GB
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-[#0B7A9E] h-2 rounded-full"
                style={{ width: `${Math.min((assinatura.uso_atual?.storage_usado_gb / assinatura.limites?.storage_gb) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Créditos */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* IA */}
        <div className="oneui-card p-6">
          <h3 className="font-medium text-[#202124] mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Créditos de IA
          </h3>
          {creditoIA ? (
            <>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#5f6368]">Saldo Atual</span>
                  <span className="text-2xl font-bold text-[#202124]">{creditoIA.saldo_creditos}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${Number(percentualIA) >= 80 ? 'bg-red-500' : 'bg-purple-500'}`}
                    style={{ width: `${Math.min(percentualIA, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-[#5f6368] mt-1">
                  {creditoIA.total_consumido_mes} / {creditoIA.creditos_mensais_plano} usados ({percentualIA}%)
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5f6368]">Inclusos no plano</span>
                  <span className="font-medium text-[#202124]">{creditoIA.creditos_mensais_plano}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f6368]">Comprados avulso</span>
                  <span className="font-medium text-[#202124]">{creditoIA.creditos_comprados_avulso || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f6368]">Total histórico</span>
                  <span className="font-medium text-[#202124]">{creditoIA.total_consumido_historico}</span>
                </div>
              </div>
              {Number(percentualIA) >= 80 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    ⚠️ Você usou {percentualIA}% dos créditos. Considere fazer upgrade ou comprar créditos avulsos.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[#5f6368]">Sem créditos configurados</p>
          )}
        </div>

        {/* Consulta API */}
        <div className="oneui-card p-6">
          <h3 className="font-medium text-[#202124] mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Créditos de Consulta API
          </h3>
          {creditoConsulta ? (
            <>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#5f6368]">Saldo Atual</span>
                  <span className="text-2xl font-bold text-[#202124]">{creditoConsulta.saldo_creditos}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${Number(percentualConsulta) >= 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(percentualConsulta, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-[#5f6368] mt-1">
                  {creditoConsulta.total_consumido_mes} / {creditoConsulta.creditos_mensais_plano} usados ({percentualConsulta}%)
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5f6368]">Inclusos no plano</span>
                  <span className="font-medium text-[#202124]">{creditoConsulta.creditos_mensais_plano}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f6368]">Comprados avulso</span>
                  <span className="font-medium text-[#202124]">{creditoConsulta.creditos_comprados_avulso || 0}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#5f6368]">Sem créditos configurados</p>
          )}
        </div>
      </div>

      {/* Histórico de Pagamentos */}
      {assinatura.historico_pagamentos && assinatura.historico_pagamentos.length > 0 && (
        <div className="oneui-card p-6">
          <h2 className="text-xl font-medium text-[#202124] mb-4 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#0B7A9E]" />
            Histórico de Pagamentos
          </h2>
          <div className="space-y-2">
            {assinatura.historico_pagamentos.slice(-5).reverse().map((pag, idx) => (
              <div key={idx} className="bg-[#f8f9fa] rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#202124]">
                    R$ {(pag.valor / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-[#5f6368]">
                    {format(new Date(pag.data), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  pag.status === 'pago' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {pag.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </RouteGuard>
  );
}