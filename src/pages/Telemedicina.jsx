import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Video,
  Calendar,
  Clock,
  User,
  Play,
  FileSignature,
  Link as LinkIcon,
  Monitor
} from "lucide-react";
import SalaVideo from "@/components/telemedicina/SalaVideo";
import SalaEsperaVirtual from "@/components/telemedicina/SalaEsperaVirtual";
import PrescricaoDuranteConsulta from "@/components/telemedicina/PrescricaoDuranteConsulta";
import { Button } from "@/components/ui/Button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import AlertBanner from "@/components/ui/AlertBanner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, EmptyState } from "@/components/ui/LoadingSpinner";
import { motion } from "framer-motion";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import RouteGuard from "@/components/auth/RouteGuard";
import PermissionGuard from "@/components/auth/PermissionGuard";

export default function Telemedicina() {
  usePerformanceTracker('/Telemedicina');
  const { clinicaId } = useClinicaContext();
  const [showSalaEspera, setShowSalaEspera] = useState(false);
  const [showConsultaPanel, setShowConsultaPanel] = useState(false);
  const [showPrescricaoPanel, setShowPrescricaoPanel] = useState(false);
  const [consultaAtiva, setConsultaAtiva] = useState(null);
  const [modoVideo, setModoVideo] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useOptimizedQuery({
    queryKey: ["user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: agendamentos = [], isLoading } = useOptimizedQuery({
    queryKey: ["agendamentos", clinicaId],
    queryFn: () => clinicaId ? base44.entities.Agendamento.filter({ 
      clinica_id: clinicaId,
      tipo_consulta: "telemedicina"
    }) : [],
    enabled: !!clinicaId
  });

  // ARQUITETURA V2: Contato unificado
  const { data: pacientes = [] } = useOptimizedQuery({
    queryKey: ["pacientes", clinicaId],
    queryFn: () => clinicaId ? base44.entities.Contato.filter({ 
      clinica_id: clinicaId,
      tipo_contato: "paciente"
    }) : [],
    enabled: !!clinicaId
  });

  const updateAgendamentoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agendamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["agendamentos"]);
    }
  });

  const hoje = format(new Date(), "yyyy-MM-dd");
  
  const agendamentosTelemedicina = useMemo(
    () => agendamentos
      .filter(a => a.tipo_consulta === "telemedicina")
      .filter(a => a.data >= hoje)
      .sort((a, b) => {
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        return a.horario.localeCompare(b.horario);
      }),
    [agendamentos]
  );

  const agendamentosHoje = useMemo(
    () => agendamentosTelemedicina.filter(a => a.data === hoje),
    [agendamentosTelemedicina]
  );

  const salaEspera = useMemo(
    () => agendamentosTelemedicina.filter(a => 
      a.status === "confirmado" && a.data === hoje
    ),
    [agendamentosTelemedicina]
  );

  const iniciarConsulta = (agendamento) => {
    const linkMeet = `https://meet.google.com/new?hs=224&authuser=${user?.email || ''}`;
    
    updateAgendamentoMutation.mutate({
      id: agendamento.id,
      data: { ...agendamento, status: "em_atendimento", link_telemedicina: linkMeet }
    });

    setConsultaAtiva({ ...agendamento, link_telemedicina: linkMeet });
    setModoVideo(true);
    setShowConsultaPanel(true);
  };

  const notificarPaciente = async (agendamento) => {
    try {
      await base44.integrations.Core.SendEmail({
        to: agendamento.paciente_email || "paciente@exemplo.com",
        subject: "Sua consulta está prestes a começar!",
        body: `Olá ${agendamento.paciente_nome},

Sua consulta de telemedicina com Dr(a). ${agendamento.medico} está prestes a começar.

🔗 Link da consulta: ${agendamento.link_telemedicina}

Por favor, entre na sala virtual.

Atenciosamente,
Equipe PrevenClin`
      });
      alert("✅ Paciente notificado via e-mail!");
    } catch (error) {
      console.error("Erro ao notificar:", error);
    }
  };

  const finalizarConsulta = () => {
    if (consultaAtiva) {
      updateAgendamentoMutation.mutate({
        id: consultaAtiva.id,
        data: { ...consultaAtiva, status: "concluido" }
      });
    }
    setConsultaAtiva(null);
    setShowConsultaPanel(false);
  };

  const gerarLinkPaciente = (agendamento) => {
    if (!agendamento.link_telemedicina) {
      const linkMeet = `https://meet.google.com/${Math.random().toString(36).substr(2, 10)}`;
      updateAgendamentoMutation.mutate({
        id: agendamento.id,
        data: { ...agendamento, link_telemedicina: linkMeet }
      });
    }
  };

  return (
    <RouteGuard requireAuth requireClinica>
      <PermissionGuard modulo="telemedicina">
        <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Telemedicina"
        description="Consultas virtuais conformes CFM"
        breadcrumbs={[{ label: "Telemedicina" }]}
      />

      {/* Informativo CFM */}
      <AlertBanner variant="info" title="Telemedicina Conforme CFM">
        <ul className="space-y-1" style={{ fontSize: '14px' }}>
          <li>• Resolução CFM 2.314/22 - Telemedicina regulamentada</li>
          <li>• Atendimento ético e seguro a distância</li>
          <li>• Prontuário eletrônico e prescrição digital integrados</li>
          <li>• Consentimento informado do paciente</li>
        </ul>
      </AlertBanner>

      {/* Stats - Skeleton States */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <div className="w-12 h-12 rounded-xl bg-gray-200 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-5 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#f5f3ff' }}>
                <Calendar className="w-6 h-6" style={{ color: '#7E57FF' }} />
              </div>
              <p className="text-sm mb-1" style={{ color: '#80868b', fontSize: '14px' }}>Agendadas</p>
              <p className="text-3xl font-bold" style={{ color: '#202124' }}>{agendamentosTelemedicina.length}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#e8f1fb' }}>
                <Clock className="w-6 h-6" style={{ color: '#1a73e8' }} />
              </div>
              <p className="text-sm mb-1" style={{ color: '#80868b', fontSize: '14px' }}>Hoje</p>
              <p className="text-3xl font-bold" style={{ color: '#202124' }}>{agendamentosHoje.length}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#e6f7ed' }}>
                <User className="w-6 h-6" style={{ color: '#34a853' }} />
              </div>
              <p className="text-sm mb-1" style={{ color: '#80868b', fontSize: '14px' }}>Sala de Espera</p>
              <p className="text-3xl font-bold" style={{ color: '#202124' }}>{salaEspera.length}</p>
            </div>
          </>
        )}
      </div>

      {/* Sala de Espera Virtual */}
      {salaEspera.length > 0 && (
        <SalaEsperaVirtual
          pacientes={salaEspera}
          onIniciarConsulta={iniciarConsulta}
          onNotificar={notificarPaciente}
        />
      )}

      {/* Próximas Consultas - Skeleton States */}
      <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <h2 className="text-xl font-bold mb-6 flex items-center gap-3" style={{ color: '#202124' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
            <Video className="w-5 h-5" style={{ color: '#7E57FF' }} />
          </div>
          <span>Próximas Consultas</span>
        </h2>
        <div className="space-y-3">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl p-4 border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-gray-200 rounded w-40" />
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 rounded w-24" />
                        <div className="h-6 bg-gray-200 rounded w-20" />
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : agendamentosTelemedicina.length === 0 ? (
            <div className="py-16 text-center">
              <Video className="w-16 h-16 mx-auto mb-4" style={{ color: '#dadce0' }} />
              <p className="text-base font-medium mb-2" style={{ color: '#202124' }}>Nenhuma consulta virtual</p>
              <p style={{ color: '#80868b', fontSize: '14px' }}>Agendamentos de telemedicina aparecerão aqui</p>
            </div>
          ) : (
           <>
             {agendamentosTelemedicina.slice(0, 10).map((agendamento, idx) => {
               const ehHoje = agendamento.data === hoje;
               return (
                 <div 
                   key={agendamento.id} 
                   className="rounded-2xl p-4 border hover:shadow-sm transition-all overflow-hidden"
                   style={{ borderColor: '#e8eaed', backgroundColor: '#ffffff' }}
                 >
                   <div className="flex flex-col gap-4">
                     <div className="flex items-start gap-3 flex-1 min-w-0">
                       <div
                         className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{
                           backgroundColor: agendamento.status === "em_atendimento" ? '#fef9e5' :
                                          agendamento.status === "concluido" ? '#e6f7ed' : '#e8f1fb'
                         }}
                       >
                         <Video className="w-6 h-6" style={{
                           color: agendamento.status === "em_atendimento" ? '#f59e0b' :
                                  agendamento.status === "concluido" ? '#34a853' : '#1a73e8'
                         }} />
                       </div>
                       <div className="flex-1 min-w-0">
                         <h3 className="font-semibold text-base mb-2 truncate" style={{ color: '#202124' }}>{agendamento.paciente_nome}</h3>
                         <div className="flex flex-wrap gap-2 mb-2">
                           <span className="px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap" style={{ backgroundColor: '#f5f3ff', color: '#6d28d9', fontSize: '14px' }}>
                             {format(new Date(agendamento.data), "dd/MM/yyyy", { locale: ptBR })}
                           </span>
                           <span className="px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap" style={{ backgroundColor: '#f5f3ff', color: '#6d28d9', fontSize: '14px' }}>
                             {agendamento.horario}
                           </span>
                           {ehHoje && (
                             <span className="px-3 py-1 rounded-lg text-sm font-semibold whitespace-nowrap" style={{ backgroundColor: '#e8f1fb', color: '#1a73e8', fontSize: '14px' }}>Hoje</span>
                           )}
                         </div>
                         {agendamento.medico && (
                           <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>Dr(a). {agendamento.medico}</p>
                         )}
                       </div>
                     </div>
                     <div className="flex flex-wrap gap-2">
                       {agendamento.status === "confirmado" && ehHoje && (
                         <button
                           onClick={() => iniciarConsulta(agendamento)}
                           className="px-4 py-2.5 rounded-xl text-white font-semibold hover:opacity-90 transition-all flex items-center gap-2 min-h-[44px]"
                           style={{ backgroundColor: '#34a853', fontSize: '14px' }}
                         >
                           <Play className="w-4 h-4" />
                           <span className="whitespace-nowrap">Iniciar Consulta</span>
                         </button>
                       )}
                       {agendamento.link_telemedicina && (
                         <a
                           href={agendamento.link_telemedicina}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="px-4 py-2.5 rounded-xl border-2 font-semibold hover:bg-gray-50 transition-all flex items-center gap-2 min-h-[44px]"
                           style={{ borderColor: '#7E57FF', color: '#7E57FF', fontSize: '14px' }}
                         >
                           <LinkIcon className="w-4 h-4" />
                           <span className="whitespace-nowrap">Abrir Link</span>
                         </a>
                       )}
                       {!agendamento.link_telemedicina && (
                         <button
                           onClick={() => gerarLinkPaciente(agendamento)}
                           className="px-4 py-2.5 rounded-xl border-2 font-semibold hover:bg-gray-50 transition-all min-h-[44px]"
                           style={{ borderColor: '#e8eaed', color: '#5f6368', fontSize: '14px' }}
                         >
                           <span className="whitespace-nowrap">Gerar Link</span>
                         </button>
                       )}
                     </div>
                   </div>
                 </div>
               );
             })}
           </>
          )}
          </div>
          </div>

      {/* SlideInPanel - Interface de Consulta */}
      <SlideInPanel
        open={showConsultaPanel}
        onClose={() => {
          setShowConsultaPanel(false);
          setModoVideo(false);
        }}
        title={`Consulta Virtual - ${consultaAtiva?.paciente_nome}`}
        maxWidth="1200px"
      >
        {consultaAtiva && (
          <div className="space-y-4">
            {/* Selector de Modo */}
            <div className="flex gap-2 p-2 rounded-xl" style={{ backgroundColor: '#f8f9fa' }}>
              <button
                onClick={() => setModoVideo(true)}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all min-h-[48px] ${
                  modoVideo ? "bg-white shadow-sm" : ""
                }`}
                style={{
                  color: modoVideo ? '#7E57FF' : '#5f6368',
                  fontSize: '14px'
                }}
              >
                <Monitor className="w-5 h-5 inline mr-2" />
                Videochamada
              </button>
              <button
                onClick={() => setModoVideo(false)}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all min-h-[48px] ${
                  !modoVideo ? "bg-white shadow-sm" : ""
                }`}
                style={{
                  color: !modoVideo ? '#7E57FF' : '#5f6368',
                  fontSize: '14px'
                }}
              >
                <FileSignature className="w-5 h-5 inline mr-2" />
                Prescrição
              </button>
            </div>

            {/* Modo Vídeo */}
            {modoVideo ? (
              <SalaVideo
                consultaId={consultaAtiva.id}
                onEncerrar={() => {
                  finalizarConsulta();
                  setModoVideo(false);
                }}
                onGravacaoIniciada={(url) => {
                  console.log("Gravação iniciada:", url);
                }}
              />
            ) : (
              <PrescricaoDuranteConsulta
                consulta={consultaAtiva}
                onPrescricaoGerada={() => {
                  alert("✅ Prescrição enviada ao paciente!");
                }}
              />
            )}


          </div>
        )}
      </SlideInPanel>
        </div>
      </PermissionGuard>
    </RouteGuard>
  );
}