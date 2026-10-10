import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import ContactHeader from "@/components/contato/ContactHeader";
import TicketsList from "@/components/contato/TicketsList";
import SlideInPanel from "@/components/ui/SlideInPanel";
import FormularioPacienteCompleto from "@/components/contato/FormularioPacienteCompleto";
import { Button } from "@/components/ui/Button";
import { Calendar, FileText, MessageSquare, Pencil, Trash2, Loader2, Shield, Upload, Plus } from "lucide-react";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import AgendamentoQuickFormInline from "@/components/agendamento/AgendamentoQuickFormInline";
import ModalVendaPaciente from "@/components/marketplace/ModalVendaPaciente";
import { usePlano } from "@/components/providers/PlanoProvider";
import CriarTicketForm from "@/components/atendimento/CriarTicketForm";
import GaleriaDocumentos from "@/components/paciente/GaleriaDocumentos";
import ModalJustificativaAcesso from "@/components/prontuario/ModalJustificativaAcesso";

const ContactSidebarLazy = lazy(() => import("@/components/contato/ContactSidebarLazy"));
const DadosPacienteCardLazy = lazy(() => import("@/components/contato/DadosPacienteCardLazy"));
const HistoricoClinicoTabLazy = lazy(() => import("@/components/contato/HistoricoClinicoTabLazy"));
const ComunicacaoTabLazy = lazy(() => import("@/components/contato/ComunicacaoTabLazy"));
const ProntuarioQuickForm = lazy(() => import("@/components/prontuario/ProntuarioQuickForm"));
const UnifiedChatWidget = lazy(() => import("@/components/chat/UnifiedChatWidget"));

export default function PacienteDetalhes() {
  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <PacienteDetalhesContent />
    </RouteGuard>
  );
}

function PacienteDetalhesContent() {
  // FIX: useParams não funciona com query string - usar URLSearchParams
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { temAcessoModulo, planoAtivo } = usePlano();
  const [abaSelecionada, setAbaSelecionada] = useState('historico');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAgendarConsulta, setShowAgendarConsulta] = useState(false);
  const [showNovoProntuario, setShowNovoProntuario] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showChatWidget, setShowChatWidget] = useState(false);
  const [showCriarTicket, setShowCriarTicket] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showJustificativaContato, setShowJustificativaContato] = useState(false);
  const [contatoAutorizado, setContatoAutorizado] = useState(null); // null=checking, false=bloqueado, true=liberado

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  });

  // LGPD CRÍTICO - REMOVIDO: Modal global (Layout.js) já gerencia
  // BRUTAL FIX: PacienteDetalhes NÃO deve bloquear - Layout faz validação universal
  const termosAceitos = [];
  const lgpdBloqueado = false; // Sempre liberado - Layout gerencia modal global

  const { data: medicos = [] } = useQuery({
    queryKey: ["medicos", user?.clinica_id],
    queryFn: async () => {
      return await base44.entities.Medico.filter({ clinica_id: user.clinica_id });
    },
    enabled: !!user?.clinica_id,
    staleTime: 10 * 60 * 1000
  });

  const isMedico = medicos.some(m => m.email === user?.email);

  // AGREGADOR: 1 call vs 5
  const { data: contatoData, isLoading, error } = useQuery({
    queryKey: ["contato-completo", id],
    queryFn: async () => {
      const response = await base44.functions.invoke('getContatoCompleto', { contato_id: id });
      
      // LGPD: Log de acesso a dados sensíveis (async, não bloqueia UI)
      if (response.data?.contato && user?.clinica_id) {
        setTimeout(() => {
          base44.entities.LogAcessoDado?.create({
            clinica_id: user.clinica_id,
            usuario_id: user.id,
            entidade: 'Contato',
            registro_id: id,
            tipo_acesso: 'leitura_manual',
            base_legal: 'execucao_contrato',
            ip_origem: window.location.hostname,
            user_agent: navigator.userAgent
          }).catch(() => {});
        }, 0);
      }
      
      return response.data;
    },
    enabled: !!id && !!user?.clinica_id,
    staleTime: 30 * 60 * 1000, // 30min cache máximo
    gcTime: 60 * 60 * 1000, // 60min garbage collection
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    networkMode: 'online' // Skip cache if offline
  });

  const contato = contatoData?.contato;

  // LGPD/CFM: Verificar ownership do CONTATO (paciente)
  useEffect(() => {
    if (!contato || !user || contatoAutorizado !== null) return;

    console.log('[PacienteDetalhes] 🔍 Verificando ownership contato:', contato.id);

    const isSuperAdmin = user.role === 'admin' || user.email === 'contato@aetherlab.com.br';
    const isCreatedByMe = contato.created_by === user.email;

    // BRUTAL FIX: Equipe clínica da MESMA clínica = acesso direto (log mantido)
    const mesmaClinica = contato.clinica_id === user.clinica_id;
    // FALLBACK: Se role_clinica não definido, assumir 'equipe' (transição)
    const roleClinica = user.role_clinica || 'equipe';
    const isEquipeClinica = mesmaClinica && (roleClinica === 'equipe' || roleClinica === 'admin' || roleClinica === 'medico');
    
    // Médico pode ver seus próprios pacientes sem justificativa
    const medicoLogado = medicos.find(m => m.email === user.email);
    const crmMedico = medicoLogado?.crm || (medicoLogado?.crms?.[0] ? `${medicoLogado.crms[0].numero}/${medicoLogado.crms[0].estado}` : null);

    // CRITICAL: Verificar se algum prontuário do paciente tem este médico como responsável
    const temProntuarioComMedico = contatoData?.prontuarios?.some(p => 
      p.medico_crm === crmMedico || p.medico_id === medicoLogado?.id
    );

    const podeAcessarDiretamente = isSuperAdmin || isCreatedByMe || temProntuarioComMedico || (mesmaClinica && isEquipeClinica);

    console.log('[PacienteDetalhes] 📊 Ownership:', { 
      isSuperAdmin, 
      isCreatedByMe, 
      temProntuarioComMedico,
      mesmaClinica,
      isEquipeClinica,
      role_clinica: roleClinica,
      podeAcessar: podeAcessarDiretamente,
      tipo_acesso: podeAcessarDiretamente ? 'DIRETO (só log)' : 'BLOQUEADO (requer aprovação admin)'
    });

    if (!podeAcessarDiretamente) {
      console.log('[PacienteDetalhes] 🔒 Acesso cross-tenant - modal necessário');
      setShowJustificativaContato(true);
      setContatoAutorizado(false);
    } else {
      console.log('[PacienteDetalhes] ✅ Acesso direto autorizado');
      setContatoAutorizado(true);
    }
  }, [contato, user, medicos, contatoData, contatoAutorizado]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Contato.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contato-completo", id] });
      queryClient.invalidateQueries({ queryKey: ["contatos"] });
      toast.success("Paciente atualizado");
      setShowEditForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Contato.delete(id),
    onSuccess: () => {
      toast.success("Paciente excluído");
      navigate(createPageUrl("Pacientes"));
    }
  });

  const arquivarMutation = useMutation({
    mutationFn: () => base44.entities.Contato.update(id, { status: 'baixado' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contato-completo", id] });
      queryClient.invalidateQueries({ queryKey: ["contatos"] });
      toast.success("Paciente arquivado");
    }
  });

  // LGPD: Removido bloqueio local - Layout.js gerencia modal global para TODOS usuários

  if (isLoading) {
    // SKELETON ULTRA-MINIMALISTA - LCP < 300ms (zero animações)
    return (
      <div className="p-6">
        <div className="h-8 bg-gray-100 rounded w-48 mb-6" />
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
          <div className="h-6 bg-gray-100 rounded w-32" />
        </div>
      </div>
    );
  }

  if (!contato) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Paciente não encontrado</p>
        <Button onClick={() => navigate(createPageUrl("Pacientes"))} className="mt-4">
          Voltar para Pacientes
        </Button>
      </div>
    );
  }

  // LGPD/CFM: Verificação ownership em andamento
  if (contatoAutorizado === null) {
    return (
      <div className="p-6">
        <div className="h-8 bg-gray-100 rounded w-48 mb-6 animate-pulse" />
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
          <div className="h-6 bg-gray-100 rounded w-32 animate-pulse" />
        </div>
      </div>
    );
  }

  // LGPD/CFM: Acesso bloqueado - aguardando APROVAÇÃO de admin/médico responsável
  if (contatoAutorizado === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
            <Shield className="w-10 h-10" style={{ color: '#ea4335' }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#202124' }}>
            🔒 Acesso Restrito - Paciente de Outro Médico
          </h2>
          <p className="text-sm mb-4" style={{ color: '#5f6368' }}>
            Este paciente está sob responsabilidade de outro profissional.
          </p>
          <p className="text-xs mb-8" style={{ color: '#9aa0a6' }}>
            <strong>CFM 2.314/2022 + LGPD Art. 46:</strong> Acesso cross-tenant requer aprovação do médico responsável ou administrador da clínica.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-yellow-800">
              <strong>📋 Próximos passos:</strong><br/>
              1. Contate o administrador da clínica para solicitar acesso<br/>
              2. Aguarde aprovação formal<br/>
              3. Acesso será liberado com registro de auditoria
            </p>
          </div>
          <Button 
            onClick={() => navigate(createPageUrl("Pacientes"))}
            style={{ backgroundColor: '#7E57FF' }}
            className="w-full"
          >
            Voltar para Pacientes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={contato.nome_completo}
        breadcrumbs={[
          { label: "Pacientes", url: createPageUrl("Pacientes") },
          { label: contato.nome_completo }
        ]}
        showBack={true}
        action={
          <Link
            to={`${createPageUrl("AuditoriaAceitesTermos")}?from=paciente&paciente_id=${id}&paciente_nome=${encodeURIComponent(contato.nome_completo)}`}
            className="flex items-center justify-center rounded-xl transition-all hover:opacity-80"
            style={{ backgroundColor: '#f5f3ff', border: '2px solid #e9ddff', minWidth: '44px', minHeight: '44px' }}
            title="Ver Aceites LGPD deste paciente"
            aria-label="Acessar aceites LGPD do paciente"
          >
            <Shield className="w-5 h-5" style={{ color: '#7E57FF' }} />
          </Link>
        }
      />

      {/* LAYOUT RESPONSIVO: Desktop 2 cols | Mobile Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN CONTENT */}
        <div className="lg:col-span-2 space-y-6">
          <ContactHeader
            contato={contato}
            onEdit={() => setShowEditForm(true)}
            onDelete={() => {
              if (confirm("Confirma exclusão?")) deleteMutation.mutate();
            }}
            onArquivar={() => {
              if (confirm("Arquivar paciente? Status será alterado para 'baixado'.")) {
                arquivarMutation.mutate();
              }
            }}
            onOpenChat={() => setShowChatWidget(true)}
            onOpenEmail={() => setShowCriarTicket(true)}
            isMobile={isMobile}
            compact={true}
          />

          <Suspense fallback={<div className="h-32 bg-white rounded-2xl border animate-pulse" style={{ borderColor: '#e8eaed' }} />}>
            <DadosPacienteCardLazy 
              contato={contato} 
              onEdit={() => setShowEditForm(true)} 
              isMedico={isMedico}
              isAdmin={user?.role === 'admin'}
            />
          </Suspense>

          {/* TABS */}
          <div className="bg-white rounded-2xl shadow-sm border" style={{ borderColor: '#e8eaed' }}>
            <div className="border-b" style={{ borderColor: '#e8eaed' }}>
              <nav className="flex overflow-x-auto">
                {[
                  { id: 'historico', label: 'Histórico Clínico', icon: FileText },
                  { id: 'documentos', label: 'Documentos', icon: Upload },
                  { id: 'comunicacao', label: 'Comunicação', icon: MessageSquare }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAbaSelecionada(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap min-h-[48px] ${
                      abaSelecionada === tab.id
                        ? 'border-[#7E57FF] text-[#7E57FF]'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                    aria-label={`Visualizar ${tab.label}`}
                    aria-current={abaSelecionada === tab.id ? 'page' : undefined}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7E57FF' }} /></div>}>
                {abaSelecionada === 'historico' && <HistoricoClinicoTabLazy contato={contato} isMedico={isMedico} isAdmin={user?.role === 'admin'} />}
                {abaSelecionada === 'documentos' && <GaleriaDocumentos paciente={contato} tipo="paciente" />}
                {abaSelecionada === 'comunicacao' && <ComunicacaoTabLazy contato={contato} />}
              </Suspense>
            </div>
          </div>
        </div>

        {/* SIDEBAR - Desktop sticky | Mobile aparece em baixo */}
        <div className="lg:sticky lg:top-24 h-fit space-y-4">
          {/* CARD ACTION: + Novo Prontuário (isMedico ou admin) */}
          {(isMedico || user?.role === 'admin') && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
              <button
                onClick={() => setShowNovoProntuario(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all"
                style={{ backgroundColor: '#7E57FF', minHeight: '48px' }}
                aria-label="Criar novo prontuário"
              >
                <Plus className="w-5 h-5" />
                Novo Prontuário
              </button>
            </div>
          )}

          <Suspense fallback={<div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border animate-pulse" style={{ borderColor: '#e8eaed' }} />)}</div>}>
            <div onClick={(e) => {
              if (e.target.closest('[data-marketplace-trigger]')) {
                setShowMarketplace(true);
              }
            }}>
              <ContactSidebarLazy 
                contatoId={id} 
                metricas={contatoData?.metricas} 
                contato={contato}
                isMobile={isMobile}
              />
            </div>
          </Suspense>
        </div>
      </div>

      {/* EDIT FORM */}
      <SlideInPanel
        open={showEditForm}
        onClose={() => setShowEditForm(false)}
        title="Editar Paciente"
      >
        <FormularioPacienteCompleto
          contato={contato}
          onSubmit={(data) => updateMutation.mutate(data)}
          onCancel={() => setShowEditForm(false)}
          isLoading={updateMutation.isPending}
        />
      </SlideInPanel>

      {/* AGENDAR CONSULTA */}
      <SlideInPanel
        open={showAgendarConsulta}
        onClose={() => setShowAgendarConsulta(false)}
        title="Agendar Consulta"
      >
        <AgendamentoQuickFormInline
          pacientePreSelecionado={contato}
          onSuccess={() => {
            setShowAgendarConsulta(false);
            queryClient.invalidateQueries({ queryKey: ["contato-completo", id] });
          }}
          onCancel={() => setShowAgendarConsulta(false)}
        />
      </SlideInPanel>

      {/* NOVO PRONTUÁRIO - Visível apenas para médico ou admin */}
      {(isMedico || user?.role === 'admin') && (
        <SlideInPanel
          open={showNovoProntuario}
          onClose={() => setShowNovoProntuario(false)}
          title="Novo Prontuário"
        >
          <Suspense fallback={<Loader2 className="w-6 h-6 animate-spin mx-auto" />}>
            <ProntuarioQuickForm
              pacientePreSelecionado={contato}
              onSuccess={() => {
                setShowNovoProntuario(false);
                queryClient.invalidateQueries({ queryKey: ["contato-completo", id] });
              }}
              onCancel={() => setShowNovoProntuario(false)}
            />
          </Suspense>
        </SlideInPanel>
      )}

      {/* CRIAR TICKET/EMAIL */}
      <SlideInPanel
        open={showCriarTicket}
        onClose={() => setShowCriarTicket(false)}
        title="Enviar Email"
      >
        <CriarTicketForm
          contatoPreSelecionado={contato}
          onSuccess={() => {
            setShowCriarTicket(false);
            queryClient.invalidateQueries({ queryKey: ["contato-completo", id] });
          }}
          onCancel={() => setShowCriarTicket(false)}
        />
      </SlideInPanel>

      {/* MARKETPLACE */}
      <ModalVendaPaciente
        contato={contato}
        isOpen={showMarketplace}
        onClose={() => setShowMarketplace(false)}
      />

      {/* CHAT WIDGET */}
      {showChatWidget && (
        <div className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center sm:items-end sm:justify-end sm:p-4" onClick={() => setShowChatWidget(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full h-full sm:w-auto sm:h-auto">
            <Suspense fallback={<div className="w-full h-full sm:w-[420px] sm:h-[680px] bg-white rounded-t-2xl sm:rounded-2xl" />}>
              <UnifiedChatWidget
                userType="staff"
                contatoId={id}
                autoOpen={true}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}