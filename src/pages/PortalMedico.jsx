import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Video
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";
import UnifiedChatWidget from "@/components/chat/UnifiedChatWidget";
import LayoutPortalMedico from "@/components/portais/LayoutPortalMedico";

export default function PortalMedico() {
  usePerformanceTracker('/PortalMedico');
  const [periodoRelatorio, setPeriodoRelatorio] = useState("mes");
  
  const { data: user, isLoading: loadingUser } = useOptimizedQuery({
    queryKey: ["user"],
    queryFn: () => base44.auth.me()
  });

  const { data: medicos = [], isLoading: loadingMedicos } = useOptimizedQuery({
    queryKey: ["medicos"],
    queryFn: () => base44.entities.Medico.list(),
    initialData: []
  });

  const { data: agendamentos = [], isLoading: loadingAgendamentos } = useOptimizedQuery({
    queryKey: ["agendamentos"],
    queryFn: () => base44.entities.Agendamento.list(),
    initialData: []
  });

  const { data: prontuarios = [], isLoading: loadingProntuarios } = useOptimizedQuery({
    queryKey: ["prontuarios"],
    queryFn: () => base44.entities.Prontuario.list(),
    initialData: []
  });

  const { data: vendas = [], isLoading: loadingVendas } = useOptimizedQuery({
    queryKey: ["vendas"],
    queryFn: () => base44.entities.Venda.list(),
    initialData: []
  });

  const { data: pacientes = [], isLoading: loadingPacientes } = useOptimizedQuery({
    queryKey: ["pacientes"],
    queryFn: () => base44.entities.Paciente.list(),
    initialData: []
  });

  const isLoading = loadingUser || loadingMedicos || loadingAgendamentos || loadingProntuarios || loadingVendas || loadingPacientes;

  const medicoLogado = useMemo(
    () => (medicos || []).find((m) => m.email === user?.email),
    [medicos, user]
  );

  const agendamentosMedico = useMemo(
    () => (agendamentos || []).filter((a) => a.medico === medicoLogado?.nome_completo),
    [agendamentos, medicoLogado]
  );

  const hoje = format(new Date(), "yyyy-MM-dd");
  
  const agendamentosHoje = useMemo(
    () => (agendamentosMedico || []).filter((a) => a.data === hoje),
    [agendamentosMedico]
  );

  const agendamentosMes = useMemo(() => {
    try {
      const inicio = startOfMonth(new Date());
      const fim = endOfMonth(new Date());
      return (agendamentosMedico || []).filter(
        (a) => {
          try {
            return new Date(a.data) >= inicio && new Date(a.data) <= fim;
          } catch {
            return false;
          }
        }
      );
    } catch {
      return [];
    }
  }, [agendamentosMedico]);

  const atendimentosMes = useMemo(() => {
    try {
      const inicio = startOfMonth(new Date());
      const fim = endOfMonth(new Date());
      return (prontuarios || []).filter(
        (p) => {
          try {
            return p.medico_nome === medicoLogado?.nome_completo &&
                   new Date(p.data_atendimento) >= inicio &&
                   new Date(p.data_atendimento) <= fim;
          } catch {
            return false;
          }
        }
      );
    } catch {
      return [];
    }
  }, [prontuarios, medicoLogado]);

  const receitaMes = useMemo(() => {
    try {
      const inicio = startOfMonth(new Date());
      const fim = endOfMonth(new Date());
      return (vendas || [])
        .filter((v) => {
          try {
            const data = new Date(v.data_venda);
            return data >= inicio && data <= fim && v.status_pagamento === "pago";
          } catch {
            return false;
          }
        })
        .reduce((acc, v) => acc + (v?.valor_final || 0), 0);
    } catch {
      return 0;
    }
  }, [vendas]);

  const pacientesUnicos = useMemo(() => {
    const ids = new Set((agendamentosMedico || []).map((a) => a.paciente_id).filter(Boolean));
    return ids.size;
  }, [agendamentosMedico]);

  const taxaConclusao = useMemo(() => {
    if ((agendamentosMes || []).length === 0) return 0;
    const concluidos = (agendamentosMes || []).filter(a => a.status === "concluido").length;
    return Math.round((concluidos / agendamentosMes.length) * 100);
  }, [agendamentosMes]);

  const pacientesMedico = useMemo(() => {
    const pacientesIds = new Set((agendamentosMedico || []).map(a => a.paciente_id).filter(Boolean));
    return (pacientes || []).filter(p => pacientesIds.has(p.id));
  }, [pacientes, agendamentosMedico]);

  if (isLoading) {
    return (
      <RouteGuard requireAuth={true} requireClinica={false}>
        <div className="space-y-4 md:space-y-6 overflow-x-hidden">
          {/* Header Skeleton */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            <div className="h-6 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-64" />
          </div>
          
          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <div className="h-5 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
          
          {/* Cards Skeleton */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  if (!medicoLogado) {
    return (
      <RouteGuard requireAuth={true} requireClinica={false}>
        <div className="max-w-4xl mx-auto space-y-6 overflow-x-hidden">
          <PageHeader
            title="Portal do Médico"
            breadcrumbs={[{ label: "Portal do Médico" }]}
          />
          <div className="rounded-2xl p-8 md:p-10 text-center border-l-4 overflow-hidden" style={{ backgroundColor: '#fef9e5', borderColor: '#f59e0b' }}>
            <AlertCircle className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4" style={{ color: '#f59e0b' }} />
            <h3 className="font-bold mb-2" style={{ color: '#956802', fontSize: '24px' }}>Acesso Restrito</h3>
            <p style={{ color: '#956802', fontSize: '16px' }}>
              Este portal é exclusivo para médicos cadastrados no sistema.
            </p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={false}>
      <LayoutPortalMedico user={user} medicoData={medicoLogado}>
      <div className="space-y-4 md:space-y-6 overflow-x-hidden">
      <PageHeader
        title={`Dr(a). ${medicoLogado.nome_completo}`}
        description={`CRM ${medicoLogado.crms?.[0]?.numero || medicoLogado.crm || "N/A"}/${medicoLogado.crms?.[0]?.estado || medicoLogado.estado_crm || "AM"} • ${medicoLogado.especialidades?.[0]?.replace(/_/g, " ") || ""}`}
        breadcrumbs={[{ label: "Portal do Médico" }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="Hoje" value={agendamentosHoje.length} icon={Calendar} color="#7E57FF" />
        <StatCard title="Atendimentos (Mês)" value={atendimentosMes.length} icon={FileText} color="#34a853" />
        <StatCard title="Meus Pacientes" value={pacientesMedico.length} icon={Users} color="#7E57FF" />
        <StatCard title="Taxa Conclusão" value={`${taxaConclusao}%`} icon={CheckCircle} color="#34a853" />
      </div>

      {/* AGENDA COMPLETA DO MÉDICO */}
      <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <h2 className="font-bold mb-6 flex items-center gap-2" style={{ color: '#202124', fontSize: '20px' }}>
          <Calendar className="w-5 h-5" style={{ color: '#7E57FF' }} />
          <span>Minha Agenda</span>
        </h2>

        {/* Agendamentos Hoje */}
        <div className="mb-8">
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#5f6368', fontSize: '16px' }}>
            <Clock className="w-4 h-4" />
            Consultas de Hoje
          </h3>
        {agendamentosHoje.length === 0 ? (
          <div className="text-center py-10 md:py-12 rounded-xl overflow-hidden" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
            <Calendar className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4" style={{ color: '#dadce0' }} />
            <p className="font-medium" style={{ color: '#5f6368', fontSize: '16px' }}>Nenhum agendamento para hoje</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agendamentosHoje.map((agendamento) => {
              const paciente = (pacientes || []).find(p => p.id === agendamento.paciente_id);
              return (
                <div key={agendamento.id} className="rounded-xl p-4 border hover:shadow-sm transition-all overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
                  <div className="flex flex-col gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate" style={{ color: '#202124', fontSize: '18px' }}>{agendamento.paciente_nome}</h3>
                      <div className="flex flex-wrap gap-3 mt-2">
                        <span className="px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap" style={{ backgroundColor: '#f5f3ff', color: '#7E57FF', fontSize: '14px' }}>
                          {agendamento.horario}
                        </span>
                        <span className="px-3 py-1.5 rounded-xl font-semibold capitalize whitespace-nowrap" style={{ backgroundColor: '#e8f1fb', color: '#0e4082', fontSize: '14px' }}>
                          {agendamento.tipo_consulta}
                        </span>
                        <span className="px-3 py-1.5 rounded-xl font-semibold capitalize whitespace-nowrap" style={{ backgroundColor: '#f8f9fa', color: '#5f6368', fontSize: '14px' }}>
                          {agendamento.especialidade?.replace(/_/g, " ")}
                        </span>
                      </div>
                      {paciente?.telefone && (
                        <p className="flex items-center gap-1.5 mt-2 truncate" style={{ color: '#80868b', fontSize: '14px' }}>
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{paciente.telefone}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {paciente?.whatsapp && (
                        <a
                          href={`https://wa.me/55${paciente.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-3 rounded-xl font-bold hover:shadow-sm transition-all min-h-[48px] flex items-center gap-2 whitespace-nowrap"
                          style={{ backgroundColor: '#e6f7ed', color: '#1f6332', fontSize: '14px' }}
                        >
                          <span>WhatsApp</span>
                        </a>
                      )}
                      {agendamento.tipo_consulta === "telemedicina" && (
                        <button
                          onClick={() => window.open(`https://meet.google.com/new?hs=224`, "_blank")}
                          className="px-4 py-3 rounded-xl font-bold hover:shadow-sm transition-all min-h-[48px] flex items-center gap-2 whitespace-nowrap"
                          style={{ backgroundColor: '#e8f1fb', color: '#0e4082', fontSize: '14px' }}
                        >
                          <Video className="w-4 h-4" />
                          <span>Iniciar</span>
                        </button>
                      )}
                      <Link to={createPageUrl("Prontuarios")}>
                        <button className="px-4 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all min-h-[48px] whitespace-nowrap" style={{ backgroundColor: '#7E57FF', fontSize: '14px' }}>
                          Prontuário
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* Próximos Agendamentos (7 dias) */}
        <div>
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#5f6368', fontSize: '16px' }}>
            <Calendar className="w-4 h-4" />
            Próximos 7 Dias
          </h3>
          {(() => {
            const proximosSete = agendamentosMedico
              .filter(a => {
                const dataAg = new Date(a.data);
                const hoje = new Date();
                const seteDias = new Date();
                seteDias.setDate(seteDias.getDate() + 7);
                return dataAg > hoje && dataAg <= seteDias && a.status !== 'cancelado';
              })
              .sort((a, b) => new Date(a.data) - new Date(b.data));

            if (proximosSete.length === 0) {
              return (
                <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
                  <p style={{ color: '#5f6368', fontSize: '14px' }}>Nenhum agendamento nos próximos 7 dias</p>
                </div>
              );
            }

            return (
              <div className="space-y-2">
                {proximosSete.slice(0, 10).map((agendamento) => (
                  <div key={agendamento.id} className="rounded-xl p-4 border hover:shadow-sm transition-all" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold truncate" style={{ color: '#202124', fontSize: '16px' }}>
                          {agendamento.paciente_nome}
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-2 text-sm" style={{ color: '#5f6368' }}>
                          <span>{agendamento.data ? format(new Date(agendamento.data), "dd/MM/yyyy") : ''}</span>
                          <span>•</span>
                          <span>{agendamento.horario}</span>
                          <span>•</span>
                          <span>{agendamento.especialidade?.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        agendamento.status === 'confirmado' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {agendamento.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <h2 className="font-bold mb-6 flex items-center gap-2" style={{ color: '#202124', fontSize: '20px' }}>
          <Users className="w-5 h-5" style={{ color: '#7E57FF' }} />
          <span>Meus Pacientes ({pacientesMedico.length})</span>
        </h2>
        {pacientesMedico.length === 0 ? (
          <div className="text-center py-10 md:py-12 rounded-xl overflow-hidden" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
            <Users className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4" style={{ color: '#dadce0' }} />
            <p className="font-medium" style={{ color: '#5f6368', fontSize: '16px' }}>Nenhum paciente associado ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pacientesMedico.slice(0, 10).map((paciente) => {
              const ultimasConsultas = (prontuarios || [])
                .filter(p => p.paciente_id === paciente.id && p.medico_nome === medicoLogado.nome_completo)
                .slice(0, 1);
              
              return (
                <div key={paciente.id} className="rounded-xl p-4 border hover:shadow-sm transition-all overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
                  <div className="flex flex-col gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate" style={{ color: '#202124', fontSize: '18px' }}>{paciente.nome_completo}</h3>
                      <div className="flex flex-wrap gap-3 mt-2">
                        {paciente.telefone && (
                          <span className="px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap" style={{ backgroundColor: '#f5f3ff', color: '#7E57FF', fontSize: '14px' }}>
                            <Phone className="w-4 h-4" />
                            <span>{paciente.telefone}</span>
                          </span>
                        )}
                        {ultimasConsultas.length > 0 && (
                          <span className="px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap" style={{ backgroundColor: '#f8f9fa', color: '#80868b', border: '1px solid #e8eaed', fontSize: '14px' }}>
                            Última: {format(new Date(ultimasConsultas[0].data_atendimento), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link to={createPageUrl("Prontuarios")} className="self-start">
                      <button className="px-4 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all min-h-[48px] whitespace-nowrap" style={{ backgroundColor: '#7E57FF', fontSize: '14px' }}>
                        Ver Prontuário
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="font-bold flex items-center gap-2" style={{ color: '#202124', fontSize: '20px' }}>
            <TrendingUp className="w-5 h-5" style={{ color: '#7E57FF' }} />
            <span>Meu Desempenho</span>
          </h2>
          <Select value={periodoRelatorio} onValueChange={setPeriodoRelatorio}>
            <SelectTrigger className="min-w-[140px] rounded-xl border min-h-[48px]" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed', fontSize: '14px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="ano">Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="rounded-xl p-5 border overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
            <p className="mb-2" style={{ color: '#80868b', fontSize: '14px' }}>Agendamentos</p>
            <p className="font-bold" style={{ color: '#7E57FF', fontSize: '32px' }}>{agendamentosMes.length}</p>
          </div>
          <div className="rounded-xl p-5 border overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
            <p className="mb-2" style={{ color: '#80868b', fontSize: '14px' }}>Prontuários</p>
            <p className="font-bold" style={{ color: '#7E57FF', fontSize: '32px' }}>{atendimentosMes.length}</p>
          </div>
          <div className="rounded-xl p-5 border overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
            <p className="mb-2" style={{ color: '#80868b', fontSize: '14px' }}>Taxa Conclusão</p>
            <p className="font-bold" style={{ color: '#34a853', fontSize: '32px' }}>{taxaConclusao}%</p>
          </div>
        </div>
      </div>
      
      {/* Chat Widget Unificado */}
      <UnifiedChatWidget userType="medico" />
      </div>
      </LayoutPortalMedico>
    </RouteGuard>
  );
}