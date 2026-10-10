import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AgendamentoOnline from "@/components/portal/AgendamentoOnline";
import SlideInPanel from "@/components/ui/SlideInPanel";
import ProgressBar from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import {
  Calendar,
  FileText,
  MessageSquare,
  User,
  Heart,
  Clock,
  MapPin,
  Video,
  Phone,
  Mail,
  HelpCircle,
  Ticket as TicketIcon,
  Activity,
  Plus,
  Download,
  Shield,
  ShoppingCart
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PortalGuard from "@/components/auth/PortalGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import UnifiedChatWidget from "@/components/chat/UnifiedChatWidget";
import TermoConsentimento from "@/components/lgpd/TermoConsentimento";
import LayoutPortalPaciente from "@/components/portais/LayoutPortalPaciente";
import CatalogoServicos from "@/components/portal/CatalogoServicos";
import MinhasCompras from "@/components/portal/MinhasCompras";
import TicketForm from "@/components/portal/TicketForm";
import { toast } from "sonner";

export default function PortalPaciente() {
  usePerformanceTracker('/PortalPaciente');
  const queryClient = useQueryClient();
  const [mostrarTimeline, setMostrarTimeline] = useState(false);
  const [showAgendamentoPanel, setShowAgendamentoPanel] = useState(false);
  const [showTicketPanel, setShowTicketPanel] = useState(false);
  const [showCatalogoPanel, setShowCatalogoPanel] = useState(false);
  const [showComprasPanel, setShowComprasPanel] = useState(false);
  const [showFinanceiroPanel, setShowFinanceiroPanel] = useState(false);
  const [exportandoDados, setExportandoDados] = useState(false);

  // QUERY ÚNICA SEGURA - Arquitetura V2 (Contato unificado)
  const { data: portalData, isLoading, refetch } = useQuery({
    queryKey: ["portal-data"],
    queryFn: async () => {
      const response = await base44.functions.invoke('getPortalDataV2', {});
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const user = portalData?.paciente;
  const pacienteData = portalData?.paciente;
  const contatoUsuario = portalData?.paciente;
  const agendamentos = portalData?.agendamentos || [];
  const prontuarios = portalData?.prontuarios || [];
  const tickets = portalData?.tickets || [];
  const planos = portalData?.planos || [];
  const stats = portalData?.stats || {};

  const proximosAgendamentos = agendamentos
    .filter((a) => new Date(a.data) >= new Date() && a.status !== "cancelado")
    .slice(0, 3);

  const ticketsAbertos = tickets.filter((t) => t.status !== "fechado" && t.status !== "resolvido");

  const planoAtivo = planos.find(p => p.status === "ativo");

  const whatsappURL = base44.agents.getWhatsAppConnectURL("assistente_prevenclin");

  const handleTicketSuccess = () => {
    setShowTicketPanel(false);
    refetch();
  };

  // ARQUITETURA V3: Timeline backend-rendered (performance + segurança)
  const { data: timelineData } = useQuery({
    queryKey: ["portal-timeline"],
    queryFn: async () => {
      const response = await base44.functions.invoke('getPortalTimeline', {});
      return response.data;
    },
    enabled: !!portalData,
    staleTime: 2 * 60 * 1000
  });

  const timelineInteracoes = timelineData?.eventos || [];

  // LGPD Art. 18, IV - Auto-exportação de dados
  const handleExportarMeusDados = async () => {
    if (!confirm('Exportar TODOS os seus dados?\n\nIsto inclui:\n✅ Dados cadastrais\n✅ Histórico de consultas\n✅ Prontuários\n✅ Prescrições\n✅ Documentos\n✅ Agendamentos\n✅ Financeiro\n\nArquivo JSON será baixado automaticamente.')) {
      return;
    }

    setExportandoDados(true);
    try {
      const response = await base44.functions.invoke('exportarDadosPaciente', {
        paciente_id: user?.id
      });

      // Download JSON
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus_dados_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('✅ Dados exportados com sucesso!');
    } catch (error) {
      toast.error(`❌ Erro ao exportar: ${error.message}`);
    } finally {
      setExportandoDados(false);
    }
  };

  return (
    <PortalGuard>
      <LayoutPortalPaciente user={user} contatoData={contatoUsuario}>
      <div className="space-y-5 md:space-y-6 overflow-x-hidden">
        {/* Header - Skeleton State */}
        {isLoading ? (
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-7 bg-gray-200 rounded w-48" />
                <div className="h-5 bg-gray-200 rounded w-64" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                <User className="w-8 h-8 md:w-10 md:h-10" style={{ color: '#7E57FF' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold mb-2 truncate" style={{ color: '#202124', fontSize: '28px' }}>
                  Olá, {user?.full_name || "Paciente"}!
                </h1>
                <p className="truncate" style={{ color: '#80868b', fontSize: '16px' }}>Bem-vindo ao seu Portal ConectaClínica</p>
              </div>
            </div>
          </div>
        )}

      {/* Cards de Acesso Rápido - Skeleton States */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <div className="w-12 h-12 rounded-xl bg-gray-200 mb-4" />
                <div className="h-5 bg-gray-200 rounded w-32 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </>
        ) : (
          <>
            <button
              onClick={() => setShowAgendamentoPanel(true)}
              className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-all cursor-pointer text-left min-h-[160px] overflow-hidden"
              style={{ borderColor: '#e8eaed' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#e6f7ed' }}>
                <Calendar className="w-6 h-6" style={{ color: '#34a853' }} />
              </div>
              <h3 className="font-bold mb-2" style={{ color: '#202124', fontSize: '18px' }}>Agendar Consulta</h3>
              <p style={{ color: '#80868b', fontSize: '14px', lineHeight: '1.5' }}>Presencial ou telemedicina</p>
            </button>

            <button
              onClick={() => setShowCatalogoPanel(true)}
              className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-all cursor-pointer text-left min-h-[160px] overflow-hidden"
              style={{ borderColor: '#e8eaed' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#f5f3ff' }}>
                <ShoppingCart className="w-6 h-6" style={{ color: '#7E57FF' }} />
              </div>
              <h3 className="font-bold mb-2" style={{ color: '#202124', fontSize: '18px' }}>Serviços</h3>
              <p style={{ color: '#80868b', fontSize: '14px', lineHeight: '1.5' }}>Ver catálogo completo</p>
            </button>

            <button
              onClick={() => setShowFinanceiroPanel(true)}
              className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-all cursor-pointer text-left min-h-[160px] overflow-hidden"
              style={{ borderColor: '#e8eaed' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#e6f7ed' }}>
                <FileText className="w-6 h-6" style={{ color: '#34a853' }} />
              </div>
              <h3 className="font-bold mb-2" style={{ color: '#202124', fontSize: '18px' }}>Financeiro</h3>
              <p style={{ color: '#80868b', fontSize: '14px', lineHeight: '1.5' }}>Faturas e pagamentos</p>
            </button>

            <button
              onClick={() => setShowTicketPanel(true)}
              className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-all cursor-pointer min-h-[160px] overflow-hidden w-full text-left"
              style={{ borderColor: '#e8eaed' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#fef9e5' }}>
                <MessageSquare className="w-6 h-6" style={{ color: '#f59e0b' }} />
              </div>
              <h3 className="font-bold mb-2" style={{ color: '#202124', fontSize: '18px' }}>Suporte</h3>
              <p style={{ color: '#80868b', fontSize: '14px', lineHeight: '1.5' }}>Abrir chamado</p>
            </button>

            <Link to={createPageUrl("CentralAjuda")}>
              <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-all cursor-pointer min-h-[160px] overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#e8f1fb' }}>
                  <HelpCircle className="w-6 h-6" style={{ color: '#1a73e8' }} />
                </div>
                <h3 className="font-bold mb-2" style={{ color: '#202124', fontSize: '18px' }}>Ajuda</h3>
                <p style={{ color: '#80868b', fontSize: '14px', lineHeight: '1.5' }}>FAQ e documentação</p>
              </div>
            </Link>

            <a href={whatsappURL} target="_blank" rel="noopener noreferrer">
              <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-all cursor-pointer min-h-[160px] overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#e6f7ed' }}>
                  <Phone className="w-6 h-6" style={{ color: '#34a853' }} />
                </div>
                <h3 className="font-bold mb-2" style={{ color: '#202124', fontSize: '18px' }}>WhatsApp</h3>
                <p style={{ color: '#80868b', fontSize: '14px', lineHeight: '1.5' }}>Atendimento direto</p>
              </div>
            </a>
          </>
        )}
      </div>

      {/* Plano Ativo */}
      {planoAtivo && (
        <div className="rounded-2xl p-6 border-l-4 overflow-hidden" style={{ backgroundColor: '#e8f1fb', borderColor: '#1a73e8' }}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1a73e8' }}>
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold mb-2" style={{ color: '#0e4082', fontSize: '18px' }}>📋 Plano de Tratamento Ativo</h3>
              <p className="mb-3" style={{ color: '#0e4082', fontSize: '14px', lineHeight: '1.5' }}>{planoAtivo.objetivo_tratamento}</p>
              <div className="bg-white rounded-xl p-3 mb-3 border overflow-hidden" style={{ borderColor: '#92bfed' }}>
                <div className="flex justify-between items-center mb-2">
                  <span style={{ color: '#5f6368', fontSize: '14px' }}>Progresso</span>
                  <span className="font-bold" style={{ color: '#1a73e8', fontSize: '14px' }}>{planoAtivo.progresso_percentual || 0}%</span>
                </div>
                <ProgressBar value={planoAtivo.progresso_percentual || 0} max={100} showLabel={false} />
              </div>
              <div className="flex flex-wrap gap-2">
                {planoAtivo.tratamentos?.length > 0 && (
                  <span className="bg-white border px-3 py-1.5 rounded-xl font-semibold" style={{ borderColor: '#92bfed', color: '#0e4082', fontSize: '14px' }}>
                    {planoAtivo.tratamentos.filter(t => t.status === "concluido").length}/{planoAtivo.tratamentos.length} tratamentos
                  </span>
                )}
                {planoAtivo.metas?.length > 0 && (
                  <span className="bg-white border px-3 py-1.5 rounded-xl font-semibold" style={{ borderColor: '#92bfed', color: '#0e4082', fontSize: '14px' }}>
                    {planoAtivo.metas.filter(m => m.alcancada).length}/{planoAtivo.metas.length} metas
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tickets Abertos */}
      {ticketsAbertos.length > 0 && (
        <div className="rounded-2xl p-5 border-l-4 overflow-hidden" style={{ backgroundColor: '#fef9e5', borderColor: '#f59e0b' }}>
          <div className="flex items-start gap-4">
            <TicketIcon className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: '#f59e0b' }} />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold mb-3 truncate" style={{ color: '#956802', fontSize: '18px' }}>
                Você tem {ticketsAbertos.length} ticket(s) em andamento
              </h3>
              <div className="space-y-2">
                {ticketsAbertos.slice(0, 2).map((ticket) => (
                  <div key={ticket.id} className="bg-white rounded-xl p-3 border overflow-hidden" style={{ borderColor: '#fbd54f' }}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold" style={{ color: '#202124', fontSize: '14px' }}>#{ticket.id.slice(0, 8)}</span>
                        <span className="ml-2 truncate" style={{ color: '#5f6368', fontSize: '14px' }}>{ticket.assunto}</span>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl font-semibold border whitespace-nowrap" style={{
                        backgroundColor: ticket.status === "em_atendimento" ? '#e8f1fb' : '#fef9e5',
                        color: ticket.status === "em_atendimento" ? '#0e4082' : '#956802',
                        borderColor: ticket.status === "em_atendimento" ? '#92bfed' : '#fbd54f',
                        fontSize: '14px'
                      }}>
                        {ticket.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Link to={createPageUrl("Atendimento")}>
                <button className="mt-3 font-bold hover:underline min-h-[44px]" style={{ color: '#7E57FF', fontSize: '14px' }}>
                  Ver todos os tickets →
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Timeline de Interações - Skeleton States */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <div className="flex items-center justify-between mb-6 gap-3">
          <h2 className="font-bold flex items-center gap-2" style={{ color: '#202124', fontSize: '20px' }}>
            <Clock className="w-5 h-5" style={{ color: '#7E57FF' }} />
            <span>Minha Timeline</span>
          </h2>
          <button
            onClick={() => setMostrarTimeline(!mostrarTimeline)}
            className="font-bold hover:underline min-h-[44px] px-3"
            style={{ color: '#7E57FF', fontSize: '14px' }}
          >
            {mostrarTimeline ? "Ocultar" : "Ver todas"}
          </button>
        </div>

        <div className="relative border-l-2 pl-6 space-y-4" style={{ borderColor: '#e8eaed' }}>
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[29px] w-4 h-4 rounded-full bg-gray-200" />
                  <div className="rounded-xl p-4 border animate-pulse overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-40" />
                        <div className="h-4 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-24" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : timelineInteracoes.length === 0 ? (
            <div className="text-center py-10 rounded-xl overflow-hidden" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
              <Clock className="w-16 h-16 mx-auto mb-4" style={{ color: '#dadce0' }} />
              <p className="font-medium" style={{ color: '#5f6368', fontSize: '16px' }}>Nenhuma interação registrada</p>
            </div>
          ) : (
            timelineInteracoes.slice(0, mostrarTimeline ? undefined : 5).map((evento, idx) => {
              // Backend já retorna ícone-tipo mapeado
              const iconMap = {
                agendamento: Calendar,
                prontuario: FileText,
                ticket: MessageSquare,
                plano: Activity
              };
              const Icon = iconMap[evento.tipo] || Activity;
              
              return (
                <div key={idx} className="relative">
                  <div className="absolute -left-[29px] w-4 h-4 rounded-full border-2" style={{
                    backgroundColor: evento.status === "concluido" || evento.status === "confirmado" || evento.status === "assinado" ? '#34a853' : 
                                     evento.status === "em_andamento" || evento.status === "ativo" || evento.status === "aberto" ? '#1a73e8' : '#ffffff',
                    borderColor: evento.status === "concluido" || evento.status === "confirmado" || evento.status === "assinado" ? '#34a853' : 
                                 evento.status === "em_andamento" || evento.status === "ativo" || evento.status === "aberto" ? '#1a73e8' : '#e8eaed'
                  }} />
                  <div className="rounded-xl p-4 border hover:shadow-sm transition-all overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                        <Icon className="w-5 h-5" style={{ color: '#7E57FF' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold truncate" style={{ color: '#202124', fontSize: '16px' }}>{evento.titulo}</h4>
                        <p className="mt-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>{evento.descricao}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span style={{ color: '#80868b', fontSize: '14px' }}>{evento.data} {evento.hora}</span>
                          {evento.status && (
                            <span className="capitalize font-semibold" style={{ color: '#5f6368', fontSize: '14px' }}>{evento.status.replace(/_/g, " ")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Informações do Paciente + Exportação LGPD */}
      {pacienteData && (
        <div className="bg-white rounded-2xl shadow-sm border p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2" style={{ color: '#202124', fontSize: '20px' }}>
              <Heart className="w-5 h-5" style={{ color: '#7E57FF' }} />
              <span>Meus Dados</span>
            </h2>
            <button
              onClick={handleExportarMeusDados}
              disabled={exportandoDados}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#7E57FF', color: 'white' }}
              title="Exportar meus dados (LGPD Art. 18)"
            >
              <Download className="w-4 h-4" />
              {exportandoDados ? 'Exportando...' : 'Exportar Dados'}
            </button>
          </div>
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#e8f1fb', border: '1px solid #bdd8f4' }}>
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#1a73e8' }} />
              <p className="text-xs" style={{ color: '#1662c6' }}>
                <strong>LGPD Art. 18, IV:</strong> Você tem direito à portabilidade dos seus dados em formato estruturado e interoperável.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div className="rounded-xl p-4 border overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
              <p className="mb-1" style={{ color: '#80868b', fontSize: '14px' }}>Telefone</p>
              <p className="font-medium truncate" style={{ color: '#202124', fontSize: '16px' }}>{pacienteData.telefone}</p>
            </div>
            <div className="rounded-xl p-4 border overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
              <p className="mb-1" style={{ color: '#80868b', fontSize: '14px' }}>Email</p>
              <p className="font-medium truncate" style={{ color: '#202124', fontSize: '16px' }}>{pacienteData.email}</p>
            </div>
            <div className="rounded-xl p-4 border overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
              <p className="mb-1" style={{ color: '#80868b', fontSize: '14px' }}>Tipo Sanguíneo</p>
              <p className="font-medium truncate" style={{ color: '#202124', fontSize: '16px' }}>
                {pacienteData.tipo_sanguineo || "Não informado"}
              </p>
            </div>
            {pacienteData.endereco && (
              <div className="rounded-xl p-4 border sm:col-span-2 lg:col-span-3 overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
                <p className="mb-1" style={{ color: '#80868b', fontSize: '14px' }}>Endereço</p>
                <p className="font-medium" style={{ color: '#202124', fontSize: '16px', lineHeight: '1.5' }}>{pacienteData.endereco}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MEUS AGENDAMENTOS - Completo */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <h2 className="font-bold mb-6 flex items-center gap-2" style={{ color: '#202124', fontSize: '20px' }}>
          <Calendar className="w-5 h-5" style={{ color: '#7E57FF' }} />
          <span>Meus Agendamentos</span>
        </h2>
        
        {/* Próximas Consultas */}
        <div className="mb-8">
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#5f6368', fontSize: '16px' }}>
            <Clock className="w-4 h-4" />
            Próximas Consultas
          </h3>
          {proximosAgendamentos.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
              <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: '#dadce0' }} />
              <p className="mb-4" style={{ color: '#5f6368', fontSize: '15px' }}>Você não tem agendamentos próximos</p>
              <button
                onClick={() => setShowAgendamentoPanel(true)}
                className="px-6 py-2.5 rounded-xl font-bold hover:opacity-90"
                style={{ backgroundColor: '#7E57FF', color: '#ffffff' }}
              >
                Agendar Consulta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {proximosAgendamentos.map((agendamento) => (
                <div key={agendamento.id} className="rounded-xl p-5 border hover:shadow-sm transition-all" style={{ backgroundColor: '#f5f3ff', borderColor: '#e9ddff' }}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                            agendamento.tipo_consulta === "telemedicina"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}>
                            {agendamento.tipo_consulta === "telemedicina" ? (
                              <span className="flex items-center gap-1">
                                <Video className="w-3.5 h-3.5" />
                                Telemedicina
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                Presencial
                              </span>
                            )}
                          </span>
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                            agendamento.status === 'confirmado' ? 'bg-green-100 text-green-700' :
                            agendamento.status === 'agendado' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {agendamento.status}
                          </span>
                        </div>
                        <h3 className="font-bold mb-2 text-lg" style={{ color: '#202124' }}>
                          {agendamento.especialidade?.replace(/_/g, " ") || 'Consulta'}
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-2 text-sm" style={{ color: '#5f6368' }}>
                          <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {agendamento.data ? format(new Date(agendamento.data), "dd/MM/yyyy", { locale: ptBR }) : 'Data não definida'}
                          </span>
                          <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {agendamento.horario}
                          </span>
                        </div>
                        {agendamento.medico && (
                          <p className="mt-2 font-medium" style={{ color: '#7E57FF', fontSize: '15px' }}>
                            Dr(a). {agendamento.medico}
                          </p>
                        )}
                        {agendamento.observacoes && (
                          <p className="mt-2 text-sm" style={{ color: '#5f6368' }}>
                            {agendamento.observacoes}
                          </p>
                        )}
                      </div>
                    </div>
                    {agendamento.link_telemedicina && agendamento.tipo_consulta === 'telemedicina' && (
                      <a
                        href={agendamento.link_telemedicina}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl font-bold text-center hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#0B7A9E', color: '#ffffff' }}
                      >
                        <Video className="w-4 h-4" />
                        Entrar na Consulta
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Histórico de Agendamentos (passados) */}
        <div>
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#5f6368', fontSize: '16px' }}>
            <FileText className="w-4 h-4" />
            Histórico de Consultas
          </h3>
          {agendamentos.filter(a => new Date(a.data) < new Date()).length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
              <p style={{ color: '#5f6368', fontSize: '14px' }}>Nenhuma consulta anterior registrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {agendamentos
                .filter(a => new Date(a.data) < new Date())
                .slice(0, 5)
                .map((agendamento) => (
                  <div key={agendamento.id} className="rounded-xl p-4 border" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: '#202124', fontSize: '15px' }}>
                          {agendamento.especialidade?.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm mt-1" style={{ color: '#5f6368' }}>
                          {agendamento.data ? format(new Date(agendamento.data), "dd/MM/yyyy") : ''} • {agendamento.horario}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        agendamento.status === 'concluido' ? 'bg-green-100 text-green-700' :
                        agendamento.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {agendamento.status}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Histórico de Consultas - Skeleton States */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#202124', fontSize: '20px' }}>
          <FileText className="w-5 h-5" style={{ color: '#7E57FF' }} />
          <span>Histórico de Consultas</span>
        </h2>
        <div className="space-y-3">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl p-4 border animate-pulse overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
                  <div className="h-5 bg-gray-200 rounded w-40 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-56 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              ))}
            </>
          ) : prontuarios.length === 0 ? (
            <div className="text-center py-10 md:py-12 rounded-xl overflow-hidden" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
              <FileText className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4" style={{ color: '#dadce0' }} />
              <p className="font-medium" style={{ color: '#5f6368', fontSize: '16px' }}>Nenhuma consulta registrada ainda</p>
            </div>
          ) : (
            prontuarios.slice(0, 5).map((prontuario) => (
              <div key={prontuario.id} className="rounded-xl p-4 border hover:shadow-sm transition-all overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
                <div className="flex flex-col gap-2">
                  <p className="font-bold truncate" style={{ color: '#202124', fontSize: '16px' }}>
                    {prontuario.tipo_atendimento}
                  </p>
                  <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>
                    {format(new Date(prontuario.data_atendimento), "dd/MM/yyyy")} - Dr(a). {prontuario.medico_nome}
                  </p>
                  {prontuario.hipotese_diagnostica && (
                    <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>
                      {prontuario.hipotese_diagnostica}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Informações de Contato */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <h2 className="font-bold mb-4" style={{ color: '#202124', fontSize: '20px' }}>Entre em Contato</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div className="rounded-xl p-4 border flex items-start gap-3 overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
            <MapPin className="w-5 h-5 flex-shrink-0 mt-1" style={{ color: '#7E57FF' }} />
            <div className="flex-1 min-w-0">
              <p className="font-medium mb-1" style={{ color: '#202124', fontSize: '16px' }}>Endereço</p>
              <p style={{ color: '#80868b', fontSize: '14px', lineHeight: '1.5' }}>
                Av. Cel. Teixeira, 6225, Britannia Park Offices<br />
                Torre Stamford, Sala 09 - Ponta Negra<br />
                Manaus - AM
              </p>
            </div>
          </div>
          <div className="rounded-xl p-4 border space-y-3 overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 flex-shrink-0" style={{ color: '#7E57FF' }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium mb-1" style={{ color: '#202124', fontSize: '16px' }}>Telefone</p>
                <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>+55 92 3028-1656</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 flex-shrink-0" style={{ color: '#7E57FF' }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium mb-1" style={{ color: '#202124', fontSize: '16px' }}>Email</p>
                <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>contato@prevenclin.com.br</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel - Agendamento Online */}
      <SlideInPanel
        open={showAgendamentoPanel}
        onClose={() => setShowAgendamentoPanel(false)}
        title="Agendar Consulta"
        maxWidth="700px"
      >
        <AgendamentoOnline pacienteData={pacienteData} onSuccess={refetch} />
      </SlideInPanel>

      {/* Panel - Novo Ticket */}
      <SlideInPanel
        open={showTicketPanel}
        onClose={() => setShowTicketPanel(false)}
        title="Novo Atendimento"
        maxWidth="600px"
      >
        <TicketForm 
          onSuccess={handleTicketSuccess}
          onCancel={() => setShowTicketPanel(false)}
        />
      </SlideInPanel>

      {/* Panel - Catálogo Serviços */}
      <SlideInPanel
        open={showCatalogoPanel}
        onClose={() => setShowCatalogoPanel(false)}
        title="Serviços e Produtos"
        maxWidth="1200px"
      >
        <CatalogoServicos />
      </SlideInPanel>

      {/* Panel - Histórico Financeiro */}
      <SlideInPanel
        open={showFinanceiroPanel}
        onClose={() => setShowFinanceiroPanel(false)}
        title="Histórico Financeiro"
        maxWidth="1000px"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Histórico de pagamentos e faturas</p>
          <MinhasCompras pacienteId={pacienteData?.id} />
        </div>
      </SlideInPanel>
      </div>
      
      {/* Chat Widget Unificado */}
      <UnifiedChatWidget userType="paciente" />
      
      {/* Termo LGPD - Primeira vez */}
      <TermoConsentimento />
      </LayoutPortalPaciente>
    </PortalGuard>
  );
}