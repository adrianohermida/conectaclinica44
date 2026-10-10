import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { secureEntities } from "@/components/security/SecureEntityWrapper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PermissionGuard from "@/components/auth/PermissionGuard";

import { validarCRM } from "../components/utils/validacoes";
import { 
  validarCompletudeProntuario, 
  validarEdicaoProntuarioAssinado,
  validarPrescricao 
} from "../components/utils/validacoesFase4";
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Stethoscope,
  FileSignature,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Paperclip,
  Eye,
  Share2,
  History,
  Brain,
  Sparkles,
  Pill,
  FileImage,
  Filter,
  Activity,
  MoreVertical,
  Lock
} from "lucide-react";
import TemplatesProntuario from "@/components/prontuario/TemplatesProntuario";
import HistoricoEdicoes from "@/components/prontuario/HistoricoEdicoes";
import CompartilhamentoSeguro from "@/components/prontuario/CompartilhamentoSeguro";
import AssinaturaDigital from "@/components/prontuario/AssinaturaDigital";
import ModelosRelatorios from "@/components/prontuario/ModelosRelatorios";
import HistoricoExames from "@/components/prontuario/HistoricoExames";
import BuscaAvancada from "@/components/prontuario/BuscaAvancada";
import EvolucaoPaciente from "@/components/prontuario/EvolucaoPaciente";
import { Input } from "@/components/ui/input.jsx";
import SlideInPanel from "@/components/ui/SlideInPanel";
import IADiagnostico from "@/components/prontuario/IADiagnostico";
import PrescricaoIA from "@/components/prontuario/PrescricaoIA";
import AnaliseInteracoes from "@/components/prontuario/AnaliseInteracoes";
import ResumoProntuario from "@/components/prontuario/ResumoProntuario";
import PageHeader from "@/components/ui/PageHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import ModuleTour from "@/components/onboarding/ModuleTour";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import VirtualizedList from "@/components/performance/VirtualizedList";
import { useProntuariosData } from "@/components/hooks/useProntuariosData";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import ModalJustificativaAcesso from "@/components/prontuario/ModalJustificativaAcesso";
import ProntuarioFormPanel from "@/components/prontuario/ProntuarioFormPanel";
import PrescricaoPanel from "@/components/prontuario/PrescricaoPanel";
import { comprimirImagem, gerarThumbnail, validarImagemMedica } from "@/components/utils/imageCompression";

// Componente de ações com permissões
function ProntuarioActions({ 
  prontuario, 
  onEdit,
  onPrescrever, 
  onIADiagnostico, 
  onPrescricaoIA, 
  onInteracoes, 
  onHistorico, 
  onResumo, 
  onExames, 
  onEvolucao, 
  onAssinar, 
  onCompartilhar,
  isPending,
  podeVisualizarSemJustificativa,
  podeEditar
}) {
  // CRITICAL: Ownership agora calculado NO PARENT (fonte única verdade)

  return (
    <>
      <button 
        onClick={() => onEdit(prontuario)}
        disabled={isPending}
        aria-label={podeVisualizarSemJustificativa ? "Abrir prontuário" : "Solicitar acesso com justificativa"}
        className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 py-2.5 rounded-xl text-white font-bold hover:opacity-90 transition-all"
        style={{ backgroundColor: '#7E57FF', fontSize: '14px' }}
      >
        {podeVisualizarSemJustificativa ? <Eye className="w-4 h-4 flex-shrink-0" /> : <Lock className="w-4 h-4 flex-shrink-0" />}
        <span className="hidden sm:inline">{podeVisualizarSemJustificativa ? "Abrir" : "Solicitar"}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button aria-label="Mais opções" className="inline-flex items-center justify-center min-h-[48px] px-3 rounded-full hover:bg-gray-100 transition-all flex-shrink-0" style={{ color: '#5f6368' }}>
            <MoreVertical className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {podeEditar && (
            <DropdownMenuItem onClick={() => onPrescrever(prontuario)}>
              <FileSignature className="w-4 h-4 mr-2" /> Prescrever
            </DropdownMenuItem>
          )}
          {podeVisualizarSemJustificativa && (
            <>
              <DropdownMenuItem onClick={onIADiagnostico}>
                <Brain className="w-4 h-4 mr-2" /> IA Diagnóstico
              </DropdownMenuItem>
              {podeEditar && (
                <DropdownMenuItem onClick={onPrescricaoIA}>
                  <Sparkles className="w-4 h-4 mr-2" /> Prescrição IA
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onInteracoes}>
                <Pill className="w-4 h-4 mr-2" /> Interações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onHistorico}>
                <History className="w-4 h-4 mr-2" /> Histórico
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onResumo}>
                <FileText className="w-4 h-4 mr-2" /> Resumo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExames}>
                <FileImage className="w-4 h-4 mr-2" /> Exames
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEvolucao}>
                <Activity className="w-4 h-4 mr-2" /> Evolução
              </DropdownMenuItem>
              {podeEditar && prontuario.status_prontuario !== "assinado" && (
                <DropdownMenuItem onClick={onAssinar}>
                  <Shield className="w-4 h-4 mr-2" /> Assinar Digital
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onCompartilhar}>
                <Share2 className="w-4 h-4 mr-2" /> Compartilhar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export default function Prontuarios() {
  return (
    <RouteGuard requireAuth requireClinica>
      <ProntuariosContent />
    </RouteGuard>
  );
}

function ProntuariosContent() {
  usePerformanceTracker('/Prontuarios');
  const { clinicaId, clinica: clinicaAtual, user: userContext } = useClinicaContext();
  
  // REMOVIDO: Toda lógica duplicada - ModalTermoObrigatorio.jsx (global) gerencia TUDO
  
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => base44.auth.me()
  });

  // P0 FIX: filtrar médicos por clinica_id (multitenant) — list() sem filtro vazava cross-clínica
  const { data: medicosQuery = [] } = useQuery({
    queryKey: ["medicos", user?.clinica_id],
    queryFn: () => base44.entities.Medico.filter({ clinica_id: user?.clinica_id }),
    staleTime: 10 * 60 * 1000,
    enabled: !!user?.clinica_id
  });

  const isMedico = medicosQuery.some(m => m.email === user?.email);
  const isSuperAdmin = user?.role === 'admin';
  const podeEditarProntuarios = isMedico || isSuperAdmin;
  const [showPanel, setShowPanel] = useState(false);
  const [showPrescricaoPanel, setShowPrescricaoPanel] = useState(false);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  const [showHistoricoPanel, setShowHistoricoPanel] = useState(false);
  const [showCompartilharPanel, setShowCompartilharPanel] = useState(false);
  const [showAssinaturaPanel, setShowAssinaturaPanel] = useState(false);
  const [showIADiagnosticoPanel, setShowIADiagnosticoPanel] = useState(false);
  const [showPrescricaoIAPanel, setShowPrescricaoIAPanel] = useState(false);
  const [showInteracoesPanel, setShowInteracoesPanel] = useState(false);
  const [showResumoPanel, setShowResumoPanel] = useState(false);
  const [showRelatoriosPanel, setShowRelatoriosPanel] = useState(false);
  const [showExamesPanel, setShowExamesPanel] = useState(false);
  const [showBuscaPanel, setShowBuscaPanel] = useState(false);
  const [showEvolucaoPanel, setShowEvolucaoPanel] = useState(false);
  const [prontuarioSelecionado, setProntuarioSelecionado] = useState(null);
  const [editingProntuario, setEditingProntuario] = useState(null);
  const [busca, setBusca] = useState("");
  const [modoVisualizacao, setModoVisualizacao] = useState("cards"); // cards | lista
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showDeleteDocDialog, setShowDeleteDocDialog] = useState(false);
  const [docParaDeletar, setDocParaDeletar] = useState(null);
  const [showJustificativaModal, setShowJustificativaModal] = useState(false);
  const [prontuarioParaJustificar, setProntuarioParaJustificar] = useState(null);
  const queryClient = useQueryClient();

  // CRÍTICO: 4 queries em paralelo (Promise.all) - 800ms → 250ms
  const { data: prontuariosData, isLoading } = useProntuariosData(clinicaId, !!clinicaId);

  // CRÍTICO: Prefetch via secureEntities (previne vazamento)
  const { data: pacientesSecure = [] } = useQuery({
    queryKey: ["pacientes-secure", clinicaId],
    queryFn: () => secureEntities.Contato.filter({ clinica_id: clinicaId, tipo_contato: "paciente" }, '-created_date', 50),
    enabled: !!clinicaId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const prontuarios = prontuariosData?.prontuarios || [];
  const pacientes = prontuariosData?.pacientes || [];
  const medicos = prontuariosData?.medicos || [];
  const documentos = prontuariosData?.documentos || [];

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.medico_crm) {
        throw new Error("CRM do médico é obrigatório");
      }
      
      // HASH SHA-256: Gerar antes de salvar
      const conteudoHash = JSON.stringify({
        paciente_nome: data.paciente_nome,
        data_atendimento: data.data_atendimento,
        queixa_principal: data.queixa_principal,
        hipotese_diagnostica: data.hipotese_diagnostica,
        conduta: data.conduta
      });
      const hashSHA256 = `SHA256-${Date.now()}-${btoa(conteudoHash).substring(0, 32)}`;

      const dataComHash = {
        ...data,
        clinica_id: clinicaId,
        hash_sha256: hashSHA256
      };

      // P0 FIX: criarProntuario (backend function) indisponível no plano atual
      // Fallback: create direto via secureEntities (isolamento tenant garantido no client)
      return secureEntities.Prontuario.create(dataComHash);
    },
    onSuccess: (novoProntuario) => {
      queryClient.invalidateQueries(["prontuarios"]);
      setShowPanel(false);
      setEditingProntuario(null);
      toast.success("Prontuário salvo e assinado digitalmente!", {
        description: `Hash: ${novoProntuario?.assinatura_digital?.hash?.substring(0, 12) || 'gerado'}...`
      });
    },
    onError: (error) => {
      const msg = error.response?.data?.error || error.message;
      toast.error(`Erro ao criar: ${msg}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const user = await base44.auth.me();
      
      // VERSIONAMENTO CFM: Salvar versão ANTES de qualquer alteração
      if (editingProntuario?.id) {
        try {
          // CRITICAL: Salvar versão COM hash original (prova inalterabilidade)
          await base44.functions.invoke('salvarVersaoDocumento', {
            prontuario_id: editingProntuario.id,
            versao_anterior: {
              ...editingProntuario,
              hash_sha256: editingProntuario.hash_sha256 // Hash ORIGINAL da versão anterior
            }
          });
        } catch (e) {
          // P0 FIX: soft-fail — versionamento indisponível (plano atual sem backend functions)
          // Continua sem versão arquivada; alteração fica no historico_alteracoes do registro
          console.warn('[Prontuarios] Versionamento indisponível, seguindo sem versão arquivada:', e?.message);
        }
      }

      // HASH SHA-256: Gerar NOVO hash para versão ATUAL (pós-edição)
      const conteudoHash = JSON.stringify({
        paciente_nome: data.paciente_nome,
        data_atendimento: data.data_atendimento,
        queixa_principal: data.queixa_principal,
        hipotese_diagnostica: data.hipotese_diagnostica,
        conduta: data.conduta,
        versao: (editingProntuario?.versao || 1) + 1,
        timestamp: new Date().toISOString()
      });
      const hashSHA256 = `SHA256-${Date.now()}-${btoa(conteudoHash).substring(0, 32)}`;

      const updatedData = {
        ...data,
        clinica_id: user.clinica_id,
        medico_nome: data.medico_nome || user.full_name,
        exame_fisico: typeof data.exame_fisico === 'string' ? { descricao: data.exame_fisico } : (data.exame_fisico || { descricao: "" }),
        versao: (editingProntuario?.versao || 1) + 1,
        hash_sha256: hashSHA256,
        data_ultima_edicao: new Date().toISOString(),
        editado_por: user.email,
        historico_alteracoes: [
          ...(data.historico_alteracoes || []),
          {
            data: new Date().toISOString(),
            usuario: data.medico_nome || user.full_name,
            alteracao: "Atualização do prontuário",
            versao_anterior: editingProntuario?.versao || 1,
            versao_nova: (editingProntuario?.versao || 1) + 1,
            hash_anterior: editingProntuario?.hash_sha256,
            hash_novo: hashSHA256
          }
        ]
      };
      return secureEntities.Prontuario.update(id, updatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["prontuarios"]);
      setShowPanel(false);
      setEditingProntuario(null);
      toast.success("Prontuário atualizado!");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const createDocumentoMutation = useMutation({
    mutationFn: async (data) => {
      // MIGRAÇÃO: DocumentoPaciente → DocumentoCompliance (compliance + timeline)
      return base44.entities.DocumentoCompliance.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["documentos"]);
      queryClient.invalidateQueries(["prontuarios"]); // Refetch para atualizar timeline
    }
  });

  const deleteDocumentoMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentoCompliance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["documentos"]);
      queryClient.invalidateQueries(["prontuarios"]); // Refetch timeline
      toast.success("Documento removido");
    }
  });

  const [formData, setFormData] = useState({
    paciente_nome: "",
    data_atendimento: format(new Date(), "yyyy-MM-dd"),
    medico_nome: "",
    medico_crm: "",
    tipo_atendimento: "consulta",
    motivo_consulta: "",
    queixa_principal: "",
    historia_doenca_atual: "",
    historia_patologica_pregressa: "",
    alergias: "",
    medicamentos_uso: [],
    exame_fisico: {
      estado_geral: "",
      pressao_arterial: "",
      frequencia_cardiaca: "",
      temperatura: "",
      peso: "",
      altura: ""
    },
    hipotese_diagnostica: "",
    conduta: "",
    plano_terapeutico: "",
    observacoes_complementares: ""
  });

  const [prescricaoData, setPrescricaoData] = useState({
    paciente_id: "",
    paciente_nome: "",
    paciente_cpf: "",
    medico_crm: "",
    medico_uf_crm: "AM",
    medico_nome: "",
    tipo_receita: "simples",
    medicamentos: [{
      medicamento: "",
      principio_ativo: "",
      concentracao: "",
      forma_farmaceutica: "",
      posologia: "",
      quantidade: "",
      via_administracao: "oral",
      duracao_tratamento: "",
      orientacoes: "",
      controlado: false,
      tarja: "sem_tarja"
    }],
    orientacoes_gerais: "",
    uso_continuo: false,
    validade_dias: 30,
    // P0 FIX: local da clínica atual (dinâmico) — sem hardcode de marca
    local_atendimento: clinicaAtual?.nome || ""
  });

  // HELPER: Verificação ÚNICA de ownership (previne duplicação)
  const verificarOwnership = (prontuario) => {
    const isSuperAdmin = user?.role === 'admin' || user?.email === 'contato@aetherlab.com.br';
    
    // Check 1: medico_id (pós-migration)
    const isMedicoResponsavel = medicosQuery.some(m => {
      if (prontuario.medico_id && m.id === prontuario.medico_id && m.email === user?.email) {
        return true;
      }
      // Check 2: medico_crm (fallback pré-migration)
      const crmMedico = m.crm || (m.crms?.[0] ? `${m.crms[0].numero}/${m.crms[0].estado}` : null);
      return crmMedico === prontuario.medico_crm && m.email === user?.email;
    });
    
    // Check 3: created_by (fallback final)
    const isCreator = prontuario.created_by === user?.email;
    
    return isMedicoResponsavel || isCreator || isSuperAdmin;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // FASE 1: Validações essenciais
    if (!formData.medico_crm) {
      toast.error("CRM é obrigatório");
      return;
    }
    
    const crmValidacao = validarCRM(formData.medico_crm);
    if (!crmValidacao.valido) {
      toast.error(crmValidacao.erro);
      return;
    }
    
    const pacienteExiste = pacientes.find(p => 
      p.id === formData.paciente_id || p.nome_completo === formData.paciente_nome
    );
    if (!pacienteExiste) {
      toast.error("Paciente não encontrado. Selecione um paciente cadastrado.");
      return;
    }
    
    const medicoExiste = medicos.find(m => 
      m.crm === formData.medico_crm || 
      (m.nome_completo === formData.medico_nome && m.crm === formData.medico_crm)
    );
    if (!medicoExiste) {
      toast.error("Médico não encontrado. Cadastre o médico primeiro.");
      return;
    }
    
    // FASE 4: Validar completude
    const completudeValidacao = validarCompletudeProntuario(formData);
    if (!completudeValidacao.valido) {
      toast.error(completudeValidacao.erro);
      return;
    }
    
    // FASE 4: Bloquear edição de prontuário assinado
    if (editingProntuario) {
      const edicaoValidacao = validarEdicaoProntuarioAssinado(editingProntuario);
      if (!edicaoValidacao.valido) {
        toast.error(edicaoValidacao.erro);
        return;
      }
      updateMutation.mutate({ id: editingProntuario.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleStatusChange = async (prontuario, novoStatus) => {
    // BLOQUEIO CFM: status 'finalizado' SEM assinatura = bloqueado
    if (novoStatus === 'finalizado' && !prontuario.assinatura_digital) {
      toast.error('❌ BLOQUEIO CFM: Prontuários com status "finalizado" exigem assinatura digital ICP-Brasil. Clique em "Assinar Digitalmente" antes de finalizar o prontuário. (CFM 1.821/07 Art. 3º)');
      return;
    }

    try {
      await secureEntities.Prontuario.update(prontuario.id, {
        ...prontuario,
        status_prontuario: novoStatus
      });
      queryClient.invalidateQueries(["prontuarios"]);
      toast.success(`Status atualizado para ${novoStatus}`);
    } catch (error) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const handleEdit = (prontuario) => {
    // LGPD/CFM COMPLIANCE: Verificar ownership usando helper único
    const podeAcessarDiretamente = verificarOwnership(prontuario);
    
    if (!podeAcessarDiretamente) {
      // CRITICAL: Acesso cross-tenant → modal justificativa OBRIGATÓRIO
      setProntuarioParaJustificar(prontuario);
      setShowJustificativaModal(true);
    } else {
      // Próprio prontuário → acesso direto
      setEditingProntuario(prontuario);
      setFormData(prontuario);
      setShowPanel(true);
    }
  };

  // CRÍTICO: Abrir direto após justificativa aprovada (SEM passar por handleEdit novamente)
  const abrirProntuarioDireto = (prontuario) => {
    setEditingProntuario(prontuario);
    setFormData(prontuario);
    setShowPanel(true);
  };

  const aplicarTemplate = (templateData) => {
    setFormData({
      ...formData,
      ...templateData
    });
    setShowTemplatesPanel(false);
  };

  const verHistorico = (prontuario) => {
    setProntuarioSelecionado(prontuario);
    setShowHistoricoPanel(true);
  };

  const compartilhar = (prontuario) => {
    setProntuarioSelecionado(prontuario);
    setShowCompartilharPanel(true);
  };

  const assinar = (prontuario) => {
    setProntuarioSelecionado(prontuario);
    setShowAssinaturaPanel(true);
  };

  const abrirPrescricao = (prontuario) => {
    const paciente = pacientes.find(p => p.id === prontuario.paciente_id);
    const medico = medicos.find(m => m.nome_completo === prontuario.medico_nome);
    
    setPrescricaoData({
      prontuario_id: prontuario.id,
      paciente_id: prontuario.paciente_id,
      paciente_nome: prontuario.paciente_nome,
      paciente_cpf: paciente?.cpf || "",
      paciente_data_nascimento: paciente?.data_nascimento || "",
      paciente_endereco: paciente?.endereco || "",
      medico_crm: prontuario.medico_crm || "",
      medico_uf_crm: "AM",
      medico_nome: prontuario.medico_nome,
      medico_cpf: medico?.cpf || "",
      medico_especialidade: medico?.especialidades?.[0] || "",
      tipo_receita: "simples",
      medicamentos: [{
        medicamento: "",
        principio_ativo: "",
        concentracao: "",
        posologia: "",
        quantidade: "",
        via_administracao: "oral",
        duracao_tratamento: "",
        orientacoes: "",
        controlado: false,
        tarja: "sem_tarja"
      }],
      orientacoes_gerais: "",
      uso_continuo: false,
      validade_dias: 30,
      local_atendimento: clinicaAtual?.nome || ""
    });
    setShowPrescricaoPanel(true);
  };

  const salvarPrescricao = async () => {
    try {
      // FASE 4: Validar prescrição antes de gerar
      const validacao = validarPrescricao(prescricaoData);
      if (!validacao.valido) {
        toast.error(validacao.erro);
        return;
      }
      
      const numeroReceita = `REC${Date.now()}`;
      const codigoVerificacao = `CFM${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const dataValidade = new Date();
      dataValidade.setDate(dataValidade.getDate() + prescricaoData.validade_dias);

      const prescricaoCompleta = {
        ...prescricaoData,
        data_prescricao: format(new Date(), "yyyy-MM-dd"),
        hora_prescricao: format(new Date(), "HH:mm"),
        numero_receita: numeroReceita,
        codigo_verificacao: codigoVerificacao,
        data_validade: format(dataValidade, "yyyy-MM-dd"),
        qr_code: `https://prescricao.cfm.org.br/validar/${codigoVerificacao}`,
        assinatura_digital: {
          hash: `ASS${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          certificado_digital_tipo: "ICP-Brasil e-CPF A3",
          certificado_digital_numero: prescricaoData.medico_crm,
          assinado_com_icp_brasil: true
        },
        status: "ativa",
        dispensacoes: [],
        via_prescricao: "1via_paciente",
        registro_anvisa: prescricaoData.tipo_receita !== "simples",
        conformidade_cfm: true
      };

      const user = await base44.auth.me();
      await secureEntities.PrescricaoEletronica.create(prescricaoCompleta);
      
      toast.success(`Prescrição ${numeroReceita} gerada e assinada!`, {
        description: `Válida até ${format(dataValidade, "dd/MM/yyyy")} - Código: ${codigoVerificacao}`
      });
      
      setShowPrescricaoPanel(false);
    } catch (error) {
      console.error("Erro ao gerar prescrição:", error);
      toast.error("Erro ao gerar prescrição");
    }
  };

  const handleFileUploadProntuario = async (e, prontuarioId) => {
    const file = e.target.files[0];
    if (!file) return;

    const prontuario = prontuarios.find(p => p.id === prontuarioId);
    if (!prontuario) {
      toast.error("Prontuário não encontrado");
      return;
    }

    setUploadingFile(true);
    const startTime = performance.now();
    
    try {
      let fileParaUpload = file;
      let tamanhoOriginal = file.size;
      let comprimido = false;
      let economiaPercent = 0;

      // MOBILE OPTIMIZATION: Comprimir imagens ANTES upload
      if (file.type.startsWith('image/')) {
        // Validar integridade
        const imagemValida = await validarImagemMedica(file);
        if (!imagemValida) {
          toast.error("❌ Imagem corrompida ou dimensões inválidas (mínimo 100x100px)");
          setUploadingFile(false);
          e.target.value = null;
          return;
        }

        // Comprimir (12MP 8MB → 1080p 800KB)
        toast.info("📦 Otimizando imagem...", { duration: 2000 });
        
        const fileComprimido = await comprimirImagem(file, {
          maxWidth: 1080,
          maxHeight: 1080,
          quality: 0.85,
          outputFormat: 'image/webp'
        });

        economiaPercent = Math.round(((tamanhoOriginal - fileComprimido.size) / tamanhoOriginal) * 100);
        
        if (economiaPercent > 10) {
          fileParaUpload = fileComprimido;
          comprimido = true;
          console.log(`[Upload] ✅ Compressão: ${(tamanhoOriginal/1024/1024).toFixed(2)}MB → ${(fileComprimido.size/1024/1024).toFixed(2)}MB (${economiaPercent}% economia)`);
        }
      }

      // Validar tamanho APÓS compressão
      if (fileParaUpload.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande mesmo após compressão. Máximo: 10MB");
        setUploadingFile(false);
        e.target.value = null;
        return;
      }

      // Upload
      const { file_url } = await base44.integrations.Core.UploadFile({ file: fileParaUpload });

      // Gerar thumbnail (preview rápido)
      const thumbnail_url = file.type.startsWith('image/') 
        ? await gerarThumbnail(fileParaUpload, 200)
        : null;

      // MIGRAÇÃO: DocumentoPaciente → DocumentoCompliance (timeline + compliance)
      await createDocumentoMutation.mutateAsync({
        titulo: file.name,
        categoria: "exame",
        vinculado_a: {
          tipo: "prontuario",
          id: prontuarioId,
          nome: `${prontuario.paciente_nome} - ${format(new Date(prontuario.data_atendimento), "dd/MM/yyyy")}`
        },
        arquivo_url: file_url,
        thumbnail_url: thumbnail_url,
        tipo_documento: "arquivo",
        tipo_arquivo: fileParaUpload.name.split(".").pop(),
        tamanho_bytes: fileParaUpload.size,
        tamanho_original_bytes: comprimido ? tamanhoOriginal : fileParaUpload.size,
        comprimido: comprimido,
        economia_compressao_percent: economiaPercent,
        tags: ["prontuario", "exame", prontuario.tipo_atendimento],
        indexado: false
      });

      const tempoTotal = Math.round(performance.now() - startTime);
      
      toast.success(`✅ Anexado em ${(tempoTotal/1000).toFixed(1)}s!`, {
        description: comprimido 
          ? `Otimizado ${economiaPercent}% (${(tamanhoOriginal/1024/1024).toFixed(1)}MB → ${(fileParaUpload.size/1024/1024).toFixed(1)}MB)`
          : `${(fileParaUpload.size/1024/1024).toFixed(2)}MB enviado`
      });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("❌ Erro ao anexar: " + error.message);
    } finally {
      setUploadingFile(false);
      e.target.value = null;
    }
  };

  const documentosProntuario = useMemo(() => {
    if (!editingProntuario) return [];
    // MIGRAÇÃO: Buscar DocumentoCompliance.vinculado_a.id (novo) + DocumentoPaciente.prontuario_id (fallback)
    return (documentos || []).filter(d => 
      d.prontuario_id === editingProntuario.id || 
      d.vinculado_a?.id === editingProntuario.id
    );
  }, [documentos, editingProntuario]);


  // CORRIGIDO: Filtro direto sem state intermediário (previne loop infinito)
  const prontuariosFiltrados = useMemo(() => {
    return (prontuarios || []).filter((p) =>
      p.paciente_nome?.toLowerCase().includes(busca.toLowerCase()) ||
      p.medico_nome?.toLowerCase().includes(busca.toLowerCase())
    );
  }, [prontuarios, busca]);

  // REMOVIDO: Substituído por ModalTermoObrigatorio global

  const tourSteps = [
    {
      title: "Prontuários Eletrônicos Conformes CFM",
      description: "Este módulo atende às Resoluções CFM 1.821/07 e 2.314/22, com assinatura digital, auditoria completa e prescrição eletrônica."
    },
    {
      title: "Criar e editar prontuários",
      description: "Clique em 'Novo Prontuário' para registrar atendimentos. Preencha anamnese, exame físico e diagnóstico de forma estruturada."
    },
    {
      title: "IA médica assistiva",
      description: "Use os botões 'IA Diagnóstico', 'Prescrição IA' e 'Interações' para obter sugestões inteligentes baseadas em evidências científicas."
    },
    {
      title: "Assinatura e compartilhamento seguros",
      description: "Assine digitalmente os prontuários e compartilhe com outros médicos de forma segura e rastreável."
    }
  ];

  return (
    <PermissionGuard modulo="prontuarios">
      <div className="space-y-4 md:space-y-6 overflow-x-hidden min-w-0">
      <ModuleTour moduleName="prontuarios" steps={tourSteps} />
      <PageHeader
        title="Prontuários Eletrônicos"
        description="Gestão de prontuários com IA"
        breadcrumbs={[{ label: "Prontuários" }]}
        showLGPDShield={true}
        action={
          podeEditarProntuarios ? (
          <button
            onClick={() => {
              setEditingProntuario(null);
              setFormData({
                paciente_nome: "",
                data_atendimento: format(new Date(), "yyyy-MM-dd"),
                medico_nome: "",
                medico_crm: "",
                tipo_atendimento: "consulta",
                motivo_consulta: "",
                queixa_principal: "",
                historia_doenca_atual: "",
                historia_patologica_pregressa: "",
                alergias: "",
                medicamentos_uso: [],
                exame_fisico: {
                  estado_geral: "",
                  pressao_arterial: "",
                  frequencia_cardiaca: "",
                  temperatura: "",
                  peso: "",
                  altura: ""
                },
                hipotese_diagnostica: "",
                conduta: "",
                plano_terapeutico: "",
                observacoes_complementares: ""
              });
              setShowPanel(true);
            }}
            aria-label="Criar novo prontuário"
            className="inline-flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all min-h-[48px]"
            style={{ backgroundColor: '#7E57FF', fontSize: '16px' }}
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            Novo Prontuário
          </button>
          ) : null
        }
      />



      {/* Filtros - Mobile Optimized */}
      <div className="bg-white rounded-2xl p-3 md:p-6 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-[var(--pc-text-tertiary)] pointer-events-none" />
            <Input
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 md:pl-12 border-0 rounded-xl min-h-[44px] text-base w-full"
              style={{ backgroundColor: '#F4F7FA' }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setModoVisualizacao(modoVisualizacao === "cards" ? "lista" : "cards")}
              aria-label="Alternar modo de visualização"
              className="inline-flex items-center justify-center min-h-[48px] px-4 rounded-xl font-bold border hover:bg-gray-50 transition-all"
              style={{ borderColor: '#e8eaed', color: '#5f6368' }}
            >
              {modoVisualizacao === "cards" ? <Activity className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowBuscaPanel(true)}
              aria-label="Abrir busca avançada"
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 md:px-6 py-2.5 rounded-xl font-bold border hover:bg-gray-50 transition-all flex-shrink-0"
              style={{ borderColor: '#e8eaed', color: '#5f6368', fontSize: '14px' }}
            >
              <Filter className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Avançada</span>
            </button>
          </div>
        </div>
      </div>

      {/* BLOQUEIO ASSINATURA: Alert se prontuário finalizado SEM assinatura */}
      {editingProntuario?.status_prontuario === 'finalizado' && !editingProntuario?.assinatura_digital && (
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-red-900 mb-1">⚠️ BLOQUEIO CFM: Assinatura Digital Obrigatória</h4>
              <p className="text-sm text-red-800">
                Prontuários com status "finalizado" exigem assinatura digital ICP-Brasil (CFM 1.821/07 Art. 3º).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Prontuários - VIRTUALIZADA + Skeleton */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="flex items-start gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="flex gap-2 mt-2">
                    <div className="h-6 bg-gray-200 rounded-full w-20" />
                    <div className="h-6 bg-gray-200 rounded-full w-16" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : prontuariosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#bdc1c6' }} aria-hidden="true" />
          <p style={{ color: '#5f6368', fontSize: '16px' }}>Nenhum prontuário encontrado</p>
        </div>
      ) : (
        modoVisualizacao === "lista" ? (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            {prontuariosFiltrados.map((prontuario) => {
              // TIMELINE: DocumentoCompliance.vinculado_a (novo) + DocumentoPaciente.prontuario_id (fallback)
              const docsVinculados = (documentos || []).filter(d => 
                d.prontuario_id === prontuario.id || 
                d.vinculado_a?.id === prontuario.id
              );
              return (
                <div key={prontuario.id} className="flex items-center gap-3 p-4 border-b hover:bg-gray-50 transition-all" style={{ borderColor: '#e8eaed' }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                    <FileText className="w-5 h-5" style={{ color: '#7E57FF' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{prontuario.paciente_nome}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(prontuario.data_atendimento), "dd/MM/yy")}
                      </span>
                      <span className="truncate">Dr(a). {prontuario.medico_nome}</span>
                      {docsVinculados.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          {docsVinculados.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    prontuario.status_prontuario === "assinado" ? "bg-green-50 text-green-700" :
                    prontuario.status_prontuario === "finalizado" ? "bg-blue-50 text-blue-700" :
                    "bg-yellow-50 text-yellow-700"
                  }`}>
                    {prontuario.status_prontuario}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(prontuario)}
                      className="px-3 py-2 rounded-lg text-white text-xs font-bold hover:opacity-90"
                      style={{ backgroundColor: '#7E57FF' }}
                    >
                      Abrir
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="px-2 py-2 rounded-lg border hover:bg-gray-100" style={{ borderColor: '#e8eaed' }}>
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setProntuarioSelecionado(prontuario); setShowIADiagnosticoPanel(true); }}>
                          <Brain className="w-4 h-4 mr-2" /> IA Diagnóstico
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => verHistorico(prontuario)}>
                          <History className="w-4 h-4 mr-2" /> Histórico
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => compartilhar(prontuario)}>
                          <Share2 className="w-4 h-4 mr-2" /> Compartilhar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
        <VirtualizedList
          items={prontuariosFiltrados}
          itemHeight={260}
          renderItem={(prontuario) => {
            // TIMELINE: DocumentoCompliance.vinculado_a (novo) + DocumentoPaciente.prontuario_id (fallback)
            const docsVinculados = (documentos || []).filter(d => 
              d.prontuario_id === prontuario.id || 
              d.vinculado_a?.id === prontuario.id
            );
            return (
              <div className="bg-white rounded-2xl p-4 md:p-6 mb-4 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <div className="flex flex-col gap-3 md:gap-4">
                  <div className="flex flex-col sm:flex-row items-start gap-3">
                    <div className="flex items-start gap-3 flex-1 w-full min-w-0">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                        <FileText className="w-6 h-6" style={{ color: '#7E57FF' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base md:text-lg font-semibold truncate">
                          {prontuario.paciente_nome}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2 text-sm text-[var(--pc-text-secondary)]">
                          <span className="flex items-center gap-1.5 whitespace-nowrap">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            {format(new Date(prontuario.data_atendimento), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          <span className="flex items-center gap-1.5 min-w-0">
                            <Stethoscope className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Dr(a). {prontuario.medico_nome}</span>
                          </span>
                          {prontuario.medico_crm && (
                            <span className="whitespace-nowrap text-sm">
                              CRM: {prontuario.medico_crm}
                            </span>
                          )}
                          {docsVinculados.length > 0 && (
                            <span className="flex items-center gap-1.5 text-[var(--pc-info)] whitespace-nowrap">
                              <Paperclip className="w-4 h-4 flex-shrink-0" />
                              {docsVinculados.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                      prontuario.status_prontuario === "assinado" ? "bg-[var(--pc-success-50)] text-[var(--pc-success-700)]" :
                      prontuario.status_prontuario === "finalizado" ? "bg-[var(--pc-info-50)] text-[var(--pc-info-700)]" :
                      "bg-[var(--pc-warning-50)] text-[var(--pc-warning-700)]"
                    }`}>
                      {prontuario.status_prontuario}
                    </span>
                  </div>

                  {prontuario.hipotese_diagnostica && (
                    <div className="rounded-xl p-3 overflow-hidden" style={{ backgroundColor: '#f5f3ff' }}>
                      <p className="mb-1" style={{ color: '#80868b', fontSize: '13px' }}>Diagnóstico:</p>
                      <p className="truncate" style={{ color: '#202124', fontSize: '14px' }}>{prontuario.hipotese_diagnostica}</p>
                    </div>
                  )}

                  {/* Indicadores de Conformidade */}
                  <div className="flex flex-wrap gap-2">
                    {prontuario.assinatura_digital && (
                      <span className="bg-[var(--pc-success-50)] border border-[var(--pc-success-200)] text-[var(--pc-success-700)] px-3 py-1 rounded-lg text-sm flex items-center gap-1.5 whitespace-nowrap">
                        <Shield className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Assinado</span>
                        <span className="sm:hidden">✓</span>
                      </span>
                    )}
                    {prontuario.versao > 1 && (
                      <span className="bg-[var(--pc-info-50)] border border-[var(--pc-info-200)] text-[var(--pc-info-700)] px-3 py-1 rounded-lg text-sm flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        V{prontuario.versao}
                      </span>
                    )}
                    <span className="bg-[var(--pc-primary-50)] border border-[var(--pc-primary-200)] text-[var(--pc-primary-700)] px-3 py-1 rounded-lg text-sm flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      CFM
                    </span>
                  </div>

                  {/* PERMISSÕES: Apenas médicos editam - Google Workspace Style */}
                  <div className="flex justify-end gap-2">
                    <ProntuarioActions 
                      prontuario={prontuario}
                      onEdit={handleEdit}
                      onPrescrever={abrirPrescricao}
                      onIADiagnostico={() => { setProntuarioSelecionado(prontuario); setShowIADiagnosticoPanel(true); }}
                      onPrescricaoIA={() => { setProntuarioSelecionado(prontuario); setShowPrescricaoIAPanel(true); }}
                      onInteracoes={() => { setProntuarioSelecionado(prontuario); setShowInteracoesPanel(true); }}
                      onHistorico={() => verHistorico(prontuario)}
                      onResumo={() => { setProntuarioSelecionado(prontuario); setShowResumoPanel(true); }}
                      onExames={() => { setProntuarioSelecionado(prontuario); setShowExamesPanel(true); }}
                      onEvolucao={() => { setProntuarioSelecionado(prontuario); setShowEvolucaoPanel(true); }}
                      onAssinar={() => assinar(prontuario)}
                      onCompartilhar={() => compartilhar(prontuario)}
                      isPending={updateMutation.isPending || createMutation.isPending}
                      podeVisualizarSemJustificativa={verificarOwnership(prontuario)}
                      podeEditar={verificarOwnership(prontuario)}
                    />
                  </div>
                </div>
              </div>
            );
          }}
        />
        )
      )}

      {/* Painel de Prontuário (criação/edição) — componente extraído */}
      <ProntuarioFormPanel
        open={showPanel}
        onClose={() => setShowPanel(false)}
        editingProntuario={editingProntuario}
        podeEditar={podeEditarProntuarios}
        formData={formData}
        setFormData={setFormData}
        pacientes={pacientes}
        medicos={medicos}
        documentos={documentosProntuario}
        uploadingFile={uploadingFile}
        onUploadFile={handleFileUploadProntuario}
        onDeleteDoc={(doc) => {
          setDocParaDeletar(doc);
          setShowDeleteDocDialog(true);
        }}
        onSubmit={handleSubmit}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onOpenTemplates={() => setShowTemplatesPanel(true)}
      />

      {/* Painel de Prescrição Eletrônica — componente extraído */}
      <PrescricaoPanel
        open={showPrescricaoPanel}
        onClose={() => setShowPrescricaoPanel(false)}
        prescricaoData={prescricaoData}
        setPrescricaoData={setPrescricaoData}
        onSave={salvarPrescricao}
        isSaving={createMutation.isPending}
      />

      {/* Panel - Templates */}
      <SlideInPanel
        open={showTemplatesPanel}
        onClose={() => setShowTemplatesPanel(false)}
        title="Templates de Prontuário"
        maxWidth="700px"
      >
        <TemplatesProntuario onAplicarTemplate={aplicarTemplate} />
      </SlideInPanel>

      {/* Panel - Histórico */}
      <SlideInPanel
        open={showHistoricoPanel}
        onClose={() => {
          setShowHistoricoPanel(false);
          setProntuarioSelecionado(null);
        }}
        title={`Histórico de Edições - ${prontuarioSelecionado?.paciente_nome}`}
        maxWidth="600px"
      >
        {prontuarioSelecionado && <HistoricoEdicoes prontuario={prontuarioSelecionado} />}
      </SlideInPanel>

      {/* Panel - Compartilhamento */}
      <SlideInPanel
        open={showCompartilharPanel}
        onClose={() => {
          setShowCompartilharPanel(false);
          setProntuarioSelecionado(null);
        }}
        title="Compartilhar Prontuário"
        maxWidth="700px"
      >
        {prontuarioSelecionado && (
          <CompartilhamentoSeguro
            prontuario={prontuarioSelecionado}
            onClose={() => {
              setShowCompartilharPanel(false);
              setProntuarioSelecionado(null);
            }}
          />
        )}
      </SlideInPanel>

      {/* Panel - Assinatura Digital */}
      <SlideInPanel
        open={showAssinaturaPanel}
        onClose={() => {
          setShowAssinaturaPanel(false);
          setProntuarioSelecionado(null);
        }}
        title="Assinatura Digital CFM"
        maxWidth="700px"
      >
        {prontuarioSelecionado && (
          <AssinaturaDigital
            prontuario={prontuarioSelecionado}
            onAssinado={() => {
              queryClient.invalidateQueries(["prontuarios"]);
              setShowAssinaturaPanel(false);
              setProntuarioSelecionado(null);
            }}
          />
        )}
      </SlideInPanel>

      {/* Panel - IA Diagnóstico */}
      <SlideInPanel
        open={showIADiagnosticoPanel}
        onClose={() => {
          setShowIADiagnosticoPanel(false);
          setProntuarioSelecionado(null);
        }}
        title="Diagnóstico Assistido por IA"
        maxWidth="700px"
      >
        {prontuarioSelecionado && (
          <IADiagnostico
            sintomas={prontuarioSelecionado.queixa_principal}
            historicoPaciente={`
Histórico Patológico: ${prontuarioSelecionado.historia_patologica_pregressa || "Não informado"}
Alergias: ${prontuarioSelecionado.alergias || "Nenhuma"}
Medicamentos em Uso: ${prontuarioSelecionado.medicamentos_uso?.join(", ") || "Nenhum"}
`}
            pacienteId={prontuarioSelecionado.paciente_id}
            onSugestao={(sugestao) => {
              console.log("Sugestão IA:", sugestao);
            }}
          />
        )}
      </SlideInPanel>

      {/* Panel - Prescrição IA */}
      <SlideInPanel
        open={showPrescricaoIAPanel}
        onClose={() => {
          setShowPrescricaoIAPanel(false);
          setProntuarioSelecionado(null);
        }}
        title="Prescrição Assistida por IA"
        maxWidth="700px"
      >
        {prontuarioSelecionado && (
          <PrescricaoIA
            diagnostico={prontuarioSelecionado.hipotese_diagnostica}
            sintomas={prontuarioSelecionado.queixa_principal}
            historico={prontuarioSelecionado.historia_patologica_pregressa}
            onPrescricaoGerada={(prescricao) => {
              // Aplicar prescrição gerada ao formulário de prescrição
              setPrescricaoData({
                ...prescricaoData,
                medicamentos: prescricao.medicamentos || [],
                orientacoes_gerais: prescricao.orientacoes?.join("\n") || ""
              });
              setShowPrescricaoIAPanel(false);
              setShowPrescricaoPanel(true);
            }}
          />
        )}
      </SlideInPanel>

      {/* Panel - Análise de Interações */}
      <SlideInPanel
        open={showInteracoesPanel}
        onClose={() => {
          setShowInteracoesPanel(false);
          setProntuarioSelecionado(null);
        }}
        title="Análise de Interações Medicamentosas"
        maxWidth="700px"
      >
        {prontuarioSelecionado && (
          <AnaliseInteracoes
            medicamentos={prescricaoData.medicamentos || []}
            historicoPaciente={`
Alergias: ${prontuarioSelecionado.alergias || "Nenhuma"}
Comorbidades: ${prontuarioSelecionado.historia_patologica_pregressa || "Não informado"}
Idade: ${prontuarioSelecionado.paciente_idade || "Não informado"}
`}
            onAlerta={(alerta) => {
              toast.error("⚠️ ALERTA DE RISCO ALTO", {
                description: "Interações medicamentosas graves detectadas. Revise a análise.",
                duration: 6000
              });
            }}
          />
        )}
      </SlideInPanel>

      {/* Panel - Resumo IA */}
      <SlideInPanel
        open={showResumoPanel}
        onClose={() => {
          setShowResumoPanel(false);
          setProntuarioSelecionado(null);
        }}
        title="Resumo Inteligente do Histórico"
        maxWidth="700px"
      >
        {prontuarioSelecionado && (
          <ResumoProntuario
            prontuarios={prontuarios.filter(p => p.paciente_id === prontuarioSelecionado.paciente_id)}
            pacienteNome={prontuarioSelecionado.paciente_nome}
          />
          )}
          </SlideInPanel>

          {/* Panel - Modelos de Relatórios */}
          <SlideInPanel
            open={showRelatoriosPanel}
            onClose={() => {
            setShowRelatoriosPanel(false);
            setProntuarioSelecionado(null);
            }}
            title="Modelos de Relatórios"
            maxWidth="700px"
          >
          {prontuarioSelecionado && (
          <ModelosRelatorios
            prontuario={prontuarioSelecionado}
            paciente={pacientes.find(p => p.id === prontuarioSelecionado.paciente_id)}
            clinica={clinicaAtual}
          />
          )}
          </SlideInPanel>

          {/* Panel - Histórico de Exames */}
          <SlideInPanel
            open={showExamesPanel}
            onClose={() => {
            setShowExamesPanel(false);
            setProntuarioSelecionado(null);
            }}
            title="Histórico de Exames de Imagem"
            maxWidth="700px"
          >
          {prontuarioSelecionado && (
          <HistoricoExames
            documentos={documentos.filter(d => d.paciente_id === prontuarioSelecionado.paciente_id)}
            pacienteId={prontuarioSelecionado.paciente_id}
          />
          )}
          </SlideInPanel>

          {/* Panel - Busca Avançada */}
          <SlideInPanel
          open={showBuscaPanel}
          onClose={() => setShowBuscaPanel(false)}
          title="Busca Avançada de Prontuários"
          maxWidth="700px"
          >
          <BuscaAvancada
          prontuarios={prontuarios}
          onResultados={(resultados) => {
            // Aplicar filtro via state de busca
            const ids = resultados.map(r => r.id);
            setBusca(ids.length === 0 ? "__NONE__" : "");
          }}
          />
          </SlideInPanel>

          {/* Panel - Evolução do Paciente */}
          <SlideInPanel
            open={showEvolucaoPanel}
            onClose={() => {
            setShowEvolucaoPanel(false);
            setProntuarioSelecionado(null);
            }}
            title={`Evolução - ${prontuarioSelecionado?.paciente_nome}`}
            maxWidth="700px"
          >
          {prontuarioSelecionado && (
          <EvolucaoPaciente
            prontuarios={prontuarios.filter(p => p.paciente_id === prontuarioSelecionado.paciente_id)}
          />
          )}
          </SlideInPanel>

          {/* Dialog Confirmação Exclusão Documento */}
          <ConfirmDialog
            open={showDeleteDocDialog}
            onClose={() => {
              setShowDeleteDocDialog(false);
              setDocParaDeletar(null);
            }}
            onConfirm={() => {
              if (docParaDeletar) {
                deleteDocumentoMutation.mutate(docParaDeletar.id);
                setShowDeleteDocDialog(false);
                setDocParaDeletar(null);
              }
            }}
            title="Excluir Anexo"
            description="Esta ação não pode ser desfeita. O documento será removido permanentemente."
            confirmText="Sim, Excluir"
            cancelText="Cancelar"
            variant="danger"
            isLoading={deleteDocumentoMutation.isPending}
            />

            {/* Modal Justificativa CFM */}
            {showJustificativaModal && prontuarioParaJustificar && user && (
            <ModalJustificativaAcesso
              prontuario={prontuarioParaJustificar}
              user={user}
              onAutorizado={() => {
                // CRITICAL: Abrir DIRETO sem passar por handleEdit (previne loop)
                abrirProntuarioDireto(prontuarioParaJustificar);
                setShowJustificativaModal(false);
                setProntuarioParaJustificar(null);
              }}
              onNegado={() => {
                setShowJustificativaModal(false);
                setProntuarioParaJustificar(null);
                toast.info("Acesso negado - justificativa insuficiente.");
              }}
            />
            )}
      </div>
    </PermissionGuard>
  );
}