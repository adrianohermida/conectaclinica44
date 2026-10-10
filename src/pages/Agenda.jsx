import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { secureEntities } from "@/components/security/SecureEntityWrapper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PermissionGuard from "@/components/auth/PermissionGuard";
import { validarDataFutura, verificarConflito } from "../components/utils/validacoes";
import { 
  validarLimiteAgendamentosPaciente, 
  validarCargaMedico, 
  validarHorarioComercial,
  validarIntervaloMinimo 
} from "../components/utils/validacoesFase4";
import { Calendar, User, Clock as ClockIcon, Video, MapPin, Loader2, Grid3x3, List, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import SearchBar from "@/components/ui/SearchBar";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SlideInPanel from "@/components/ui/SlideInPanel";
import PageHeader from "@/components/ui/PageHeader";
import CalendarioDisponibilidade from "@/components/agendamento/CalendarioDisponibilidade";
import AgendamentoQuickForm from "@/components/agendamento/AgendamentoQuickForm";
import AgendamentoEditForm from "@/components/agendamento/AgendamentoEditForm";
import AgendamentoDetalhes from "@/components/agendamento/AgendamentoDetalhes";
import { format } from "date-fns";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import ModuleTour from "@/components/onboarding/ModuleTour";
import { useEnforceLimits } from "@/components/hooks/useEnforceLimits";
import { motion } from "framer-motion";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import VirtualizedList from "@/components/performance/VirtualizedList";
import EmptyState from "@/components/ui/EmptyState";
import { useAgendaData } from "@/components/hooks/useAgendaData";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";

export default function Agenda() {
  return (
    <RouteGuard requireAuth requireClinica>
      <AgendaContent />
    </RouteGuard>
  );
}

function AgendaContent() {
  usePerformanceTracker('/Agenda');
  const { clinicaId } = useClinicaContext();
  const queryClient = useQueryClient();
  const [visaoAtual, setVisaoAtual] = useState("calendario");
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState(null);
  const [dataHoraSelecionada, setDataHoraSelecionada] = useState(null);
  const [medicoFiltro, setMedicoFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [viewMode, setViewMode] = useState("calendario"); // calendario ou lista
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState(null);

  // CRÍTICO: 3 queries em paralelo (Promise.all) - 600ms → 250ms
  const { data: agendaData, isLoading } = useAgendaData(clinicaId, !!clinicaId);

  // CRÍTICO: Prefetch pacientes via secureEntities (previne vazamento)
  const { data: pacientesSecure = [] } = useQuery({
    queryKey: ["pacientes-secure", clinicaId],
    queryFn: () => secureEntities.Contato.filter({ clinica_id: clinicaId, tipo_contato: "paciente" }, '-created_date', 50),
    enabled: !!clinicaId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const agendamentos = agendaData?.agendamentos || [];
  const pacientes = agendaData?.pacientes || [];
  const medicos = agendaData?.medicos || [];

  const { enforceBeforeCreate, showUpgradePrompt } = useEnforceLimits();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Validação de data futura
      const dataValidacao = validarDataFutura(data.data);
      if (!dataValidacao.valido) {
        throw new Error(dataValidacao.erro);
      }
      
      // Validação de existência de paciente
      const pacienteExiste = pacientes.find(p => p.nome_completo === data.paciente_nome || p.id === data.paciente_id);
      if (!pacienteExiste) {
        throw new Error("Paciente não encontrado no sistema");
      }
      
      // Validação de existência de médico
      if (data.medico) {
        const medicoExiste = medicos.find(m => m.nome_completo === data.medico);
        if (!medicoExiste) {
          throw new Error("Médico não encontrado no sistema");
        }
      }
      
      // FASE 4: Validações de edge cases
      const horarioValidacao = validarHorarioComercial(data.horario);
      if (!horarioValidacao.valido) {
        throw new Error(horarioValidacao.erro);
      }
      
      const limiteValidacao = await validarLimiteAgendamentosPaciente(data.paciente_id, agendamentos);
      if (!limiteValidacao.valido) {
        throw new Error(limiteValidacao.erro);
      }
      
      if (data.medico) {
        const cargaValidacao = validarCargaMedico(data.medico, data.data, data.horario, agendamentos);
        if (!cargaValidacao.valido) {
          throw new Error(cargaValidacao.erro);
        }
        
        const intervaloValidacao = validarIntervaloMinimo(data.data, data.horario, data.medico, agendamentos);
        if (!intervaloValidacao.valido) {
          throw new Error(intervaloValidacao.erro);
        }
      }
      
      try {
        enforceBeforeCreate('agendamentos');
      } catch (error) {
        if (error.message.includes('Limite')) {
          showUpgradePrompt('agendamentos');
          throw error;
        }
      }
      
      // P2 FINAL: Backend function faz validação + create atômico
      const response = await base44.functions.invoke('criarAgendamento', data);
      return response.data;
    },
    onSuccess: async (agendamento) => {
      queryClient.invalidateQueries(["agendamentos"]);
      setShowQuickForm(false);
      toast.success("Agendamento criado!");

      // NOTIFICAR PACIENTE E MÉDICO
      try {
        await base44.functions.invoke('notificarAgendamento', {
          agendamento_id: agendamento.id,
          acao: 'criar'
        });
      } catch (e) {
        console.error('Erro ao enviar notificações:', e);
      }
      
      // Criar lembretes automáticos se configurado
      if (agendamento.enviar_lembrete) {
        try {
          const user = await base44.auth.me();
          const dataLembrete = new Date(agendamento.data);
          dataLembrete.setDate(dataLembrete.getDate() - 1);
          
          // E-mail
          if (agendamento.confirmacao_email && agendamento.data) {
            await base44.functions.invoke('enviarLembreteAgendamento', {
              tipo: 'email',
              agendamento_id: agendamento.id,
              paciente_nome: agendamento.paciente_nome,
              data: agendamento.data,
              horario: agendamento.horario
            });
          }
          
          // WhatsApp
          if (agendamento.confirmacao_whatsapp && agendamento.data) {
            await base44.functions.invoke('enviarNotificacaoWhatsApp', {
              telefone: agendamento.paciente_telefone,
              mensagem: `Olá ${agendamento.paciente_nome}! Lembrete: você tem consulta agendada em ${format(new Date(agendamento.data), "dd/MM/yyyy")} às ${agendamento.horario}. Confirme sua presença respondendo SIM.`
            });
          }
          
          // SMS (implementar depois)
          if (agendamento.confirmacao_sms) {
            // TODO: Integração SMS
          }
          
          toast.success("Lembretes agendados!");
        } catch (e) {
          console.error("Erro ao enviar lembretes:", e);
          toast.error("Agendamento criado, mas houve erro ao enviar lembretes");
        }
      }
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => secureEntities.Agendamento.update(id, data),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries(["agendamentos"]);
      toast.success("Agendamento atualizado!");

      // NOTIFICAR se foi cancelamento
      if (variables.data.status === 'cancelado') {
        try {
          await base44.functions.invoke('notificarAgendamento', {
            agendamento_id: variables.id,
            acao: 'cancelar'
          });
        } catch (e) {
          console.error('Erro ao enviar notificações:', e);
        }
      } else {
        // Notificar edição
        try {
          await base44.functions.invoke('notificarAgendamento', {
            agendamento_id: variables.id,
            acao: 'editar'
          });
        } catch (e) {
          console.error('Erro ao enviar notificações:', e);
        }
      }
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => secureEntities.Agendamento.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["agendamentos"])
  });

  const agendamentosFiltrados = useMemo(() => {
    return (agendamentos || []).filter(ag => {
      const matchBusca = ag.paciente_nome?.toLowerCase().includes(busca.toLowerCase());
      const matchMedico = !medicoFiltro || ag.medico === medicoFiltro;
      return matchBusca && matchMedico;
    });
  }, [agendamentos, busca, medicoFiltro]);

  const handleSelectHorario = (data, horario) => {
    setDataHoraSelecionada({
      data: format(data, "yyyy-MM-dd"),
      horario: horario
    });
    setShowQuickForm(true);
  };

  const handleQuickSubmit = (formData) => {
    createMutation.mutate(formData);
  };

  const handleCancelar = (agendamento) => {
    setAgendamentoParaCancelar(agendamento);
    setShowCancelDialog(true);
  };

  const confirmarCancelamento = () => {
    if (agendamentoParaCancelar) {
      updateMutation.mutate({
        id: agendamentoParaCancelar.id,
        data: { ...agendamentoParaCancelar, status: "cancelado" }
      });
      setShowCancelDialog(false);
      setAgendamentoParaCancelar(null);
    }
  };

  const handleRemarcar = (agendamento) => {
    setDataHoraSelecionada(null);
    // Lógica de remarcação
  };

  const tourSteps = [
    {
      title: "Bem-vindo à Agenda Inteligente",
      description: "Gerencie todas as consultas e procedimentos em um único lugar. Escolha entre visão de calendário ou lista."
    },
    {
      title: "Agendar consulta rapidamente",
      description: "No calendário, clique em um horário disponível para criar um novo agendamento. Ou use o WhatsApp para agendamentos automáticos via IA."
    },
    {
      title: "Confirmação e lembretes",
      description: "O sistema envia lembretes automáticos por WhatsApp para pacientes antes das consultas."
    }
  ];

  return (
    <PermissionGuard modulo="agenda">
      <div className="space-y-4 md:space-y-6 overflow-x-hidden min-w-0">
      <ModuleTour moduleName="agenda" steps={tourSteps} />
      <PageHeader
        title="Agenda"
        description="Gestão de agendamentos e consultas"
        breadcrumbs={[{ label: "Agenda" }]}
        showLGPDShield={true}
        action={
          <a
            href={base44.agents.getWhatsAppConnectURL('agendamento_consultas')}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Agendar consulta via WhatsApp"
            className="inline-flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all min-h-[48px]"
            style={{ backgroundColor: '#7E57FF', fontSize: '16px' }}
          >
            💬 Agendar via WhatsApp
          </a>
        }
      />

      {/* Navegação */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border inline-flex gap-1 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <button
          onClick={() => setVisaoAtual("calendario")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all min-h-[44px] ${
            visaoAtual === "calendario" ? "bg-[#f5f3ff] text-[#7E57FF]" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Calendário
        </button>
        <button
          onClick={() => setVisaoAtual("lista")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all min-h-[44px] ${
            visaoAtual === "lista" ? "bg-[#f5f3ff] text-[#7E57FF]" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <User className="w-4 h-4" />
          Lista
        </button>
      </div>

      {visaoAtual === "calendario" && (
        <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <Select value={medicoFiltro} onValueChange={setMedicoFiltro}>
            <SelectTrigger className="border-0 rounded-xl w-full md:w-64 min-h-[44px] text-base" style={{ backgroundColor: 'var(--pc-bg-secondary)' }}>
              <SelectValue placeholder="Filtrar por médico" />
            </SelectTrigger>
            <SelectContent className="z-[80]">
              <SelectItem value={null}>Todos os médicos</SelectItem>
              {(medicos || []).map(m => (
                <SelectItem key={m.id} value={m.nome_completo}>
                  Dr(a). {m.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Calendário de Disponibilidade */}
      {visaoAtual === "calendario" && (
        isLoading ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            <div className="h-80 bg-gray-100 rounded-xl" role="status" aria-label="Carregando calendário" />
          </div>
        ) : (
          <CalendarioDisponibilidade
            agendamentos={agendamentos}
            medicoSelecionado={medicoFiltro}
            onSelectHorario={handleSelectHorario}
          />
        )
      )}

      {/* Lista de Agendamentos */}
      {visaoAtual === "lista" && (
        <>
          <div className="bg-white rounded-2xl p-4 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            <SearchBar
              value={busca}
              onChange={setBusca}
              placeholder="Buscar paciente..."
            />
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="h-5 bg-gray-200 rounded w-2/3" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : agendamentosFiltrados.length === 0 ? (
            <EmptyState
              icon={User}
              title="Nenhum agendamento encontrado"
              description="Ajuste os filtros ou crie um novo agendamento"
              iconColor="#bdc1c6"
            />
          ) : (

            <VirtualizedList
              items={agendamentosFiltrados}
              itemHeight={200}
              renderItem={(ag) => (
                <div className="bg-white rounded-2xl shadow-sm border hover:shadow-md transition-all mb-4" style={{ borderColor: '#e8eaed' }}>
                  <div className="p-4">
                    {/* Header com Avatar + Nome */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'var(--pc-primary-50)', color: 'var(--pc-primary)' }}
                      >
                        <User className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold truncate" style={{ fontSize: '16px', color: 'var(--pc-text-primary)' }}>{ag.paciente_nome}</h3>
                    </div>

                    {/* Info Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: 'var(--pc-gray-50)', color: 'var(--pc-text-secondary)' }}>
                        <Calendar className="w-3.5 h-3.5" />
                        {ag.data && ag.data !== '' ? format(new Date(ag.data), "dd/MM/yyyy") : 'Sem data'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: 'var(--pc-gray-50)', color: 'var(--pc-text-secondary)' }}>
                        <ClockIcon className="w-3.5 h-3.5" />
                        {ag.horario}
                      </span>
                      {ag.tipo_consulta === "telemedicina" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: 'var(--pc-info-50)', color: 'var(--pc-info)' }}>
                          <Video className="w-3.5 h-3.5" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: 'var(--pc-gray-50)', color: 'var(--pc-text-secondary)' }}>
                          <MapPin className="w-3.5 h-3.5" />
                          Presencial
                        </span>
                      )}
                    </div>

                    {/* Ações - HORIZONTAL SEMPRE */}
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setAgendamentoDetalhes(ag);
                          setShowDetalhes(true);
                        }}
                        aria-label="Ver detalhes"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2 rounded-lg font-medium hover:opacity-90 border text-sm"
                        style={{ backgroundColor: 'var(--pc-bg-primary)', color: 'var(--pc-primary)', borderColor: 'var(--pc-border-primary)' }}
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setAgendamentoEditando(ag);
                          setShowEditForm(true);
                        }}
                        aria-label="Editar agendamento"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2 rounded-lg font-medium hover:opacity-90 text-sm"
                        style={{ backgroundColor: 'var(--pc-primary)', color: 'var(--pc-text-on-primary)' }}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </>
      )}

      {/* Quick Form */}
      <SlideInPanel
        open={showQuickForm}
        onClose={() => setShowQuickForm(false)}
        title="Novo Agendamento"
        maxWidth="600px"
      >
        <AgendamentoQuickForm
          pacientes={pacientes}
          medicos={medicos}
          dataHoraSelecionada={dataHoraSelecionada}
          onSubmit={handleQuickSubmit}
          onCancel={() => setShowQuickForm(false)}
          isSubmitting={createMutation.isPending}
        />
      </SlideInPanel>

      {/* Edit Form */}
      <SlideInPanel
        open={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setAgendamentoEditando(null);
        }}
        title="Editar Agendamento"
        maxWidth="600px"
      >
        {agendamentoEditando && (
          <AgendamentoEditForm
            agendamento={agendamentoEditando}
            onSuccess={() => {
              setShowEditForm(false);
              setAgendamentoEditando(null);
            }}
            onCancel={() => {
              setShowEditForm(false);
              setAgendamentoEditando(null);
            }}
          />
        )}
      </SlideInPanel>

      {/* Modal Detalhes */}
      {showDetalhes && agendamentoDetalhes && (
        <AgendamentoDetalhes
          agendamento={agendamentoDetalhes}
          onClose={() => {
            setShowDetalhes(false);
            setAgendamentoDetalhes(null);
          }}
          onEditar={() => {
            setShowDetalhes(false);
            setAgendamentoEditando(agendamentoDetalhes);
            setShowEditForm(true);
          }}
          onCancelar={() => {
            setShowDetalhes(false);
            handleCancelar(agendamentoDetalhes);
          }}
        />
      )}

      {/* Dialog de Confirmação de Cancelamento */}
      <ConfirmDialog
        open={showCancelDialog}
        onClose={() => {
          setShowCancelDialog(false);
          setAgendamentoParaCancelar(null);
        }}
        onConfirm={confirmarCancelamento}
        title="Cancelar Agendamento"
        description={`Tem certeza que deseja cancelar o agendamento de ${agendamentoParaCancelar?.paciente_nome}?`}
        confirmText="Sim, Cancelar"
        cancelText="Não, Manter"
        variant="danger"
        isLoading={updateMutation.isPending}
      />
      </div>
    </PermissionGuard>
  );
}