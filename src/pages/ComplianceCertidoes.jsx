import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Plus,
  Search,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  FileText,
  Calendar,
  ExternalLink,
  Trash2,
  Edit,
  Mail,
  Bell,
  History,
  Settings,
  RefreshCw,
  FileSpreadsheet,
  Key,
  Filter,
  Users,
  UserCog,
  Play,
  Pause,
  Usb,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  Info
} from "lucide-react";
import UploadCertificadoDigital from "@/components/compliance/UploadCertificadoDigital";
import UploadCertificadoDigitalSeguro from "@/components/compliance/UploadCertificadoDigitalSeguro";
import UploadCertidaoAprimorado from "@/components/compliance/UploadCertidaoAprimorado";
import NotificacaoInteligente from "@/components/compliance/NotificacaoInteligente";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import PageHeader from "@/components/ui/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, differenceInDays, addDays, addWeeks, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPageUrl } from "@/utils";
import CalendarioVencimentos from "@/components/compliance/CalendarioVencimentos";
import DashboardCompliance from "@/components/compliance/DashboardCompliance";
import LogsAuditoria from "@/components/compliance/LogsAuditoria";
import SuporteCompliance from "@/components/compliance/SuporteCompliance";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

const tiposCertidao = [
  { value: "cnd_fgts", label: "CND FGTS", categoria: "federal" },
  { value: "cnd_municipal", label: "CND Municipal", categoria: "municipal" },
  { value: "cnd_estadual", label: "CND Estadual (SEFAZ)", categoria: "estadual" },
  { value: "cnd_federal", label: "CND Receita Federal", categoria: "federal" },
  { value: "cnd_trabalhista", label: "CND Trabalhista", categoria: "trabalhista" },
  { value: "cnd_falencia", label: "Certidão Falência e Concordata", categoria: "judicial" },
  { value: "consulta_tcu", label: "Consulta Consolidada TCU", categoria: "federal" },
  { value: "cnd_ambiental", label: "Certidão Ambiental", categoria: "ambiental" },
  { value: "cnd_judicial", label: "Certidão Judicial", categoria: "judicial" },
  { value: "outra", label: "Outra", categoria: "federal" }
];

const categorias = [
  { value: "federal", label: "Federal" },
  { value: "estadual", label: "Estadual" },
  { value: "municipal", label: "Municipal" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "judicial", label: "Judicial" },
  { value: "ambiental", label: "Ambiental" }
];

const resultados = [
  { value: "negativa", label: "Negativa" },
  { value: "positiva", label: "Positiva" },
  { value: "positiva_com_efeito_negativa", label: "Positiva com Efeito de Negativa" },
  { value: "nada_consta", label: "Nada Consta" }
];

export default function ComplianceCertidoes() {
  usePerformanceTracker('/ComplianceCertidoes');
  const [visaoAtual, setVisaoAtual] = useState("dashboard");
  const [certidoesDoDia, setCertidoesDoDia] = useState([]);
  const [showDiaPanel, setShowDiaPanel] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showOrgaoPanel, setShowOrgaoPanel] = useState(false);
  const [showRegraPanel, setShowRegraPanel] = useState(false);
  const [showHistoricoPanel, setShowHistoricoPanel] = useState(false);
  const [showCertificadoPanel, setShowCertificadoPanel] = useState(false);
  const [showAgendamentoPanel, setShowAgendamentoPanel] = useState(false);
  const [showPermissaoPanel, setShowPermissaoPanel] = useState(false);
  const [showConsultaCaixaPanel, setShowConsultaCaixaPanel] = useState(false);
  const [showConsultaReceitaPanel, setShowConsultaReceitaPanel] = useState(false);
  const [showConsultaTRT11Panel, setShowConsultaTRT11Panel] = useState(false);
  const [showConsultaTCUPanel, setShowConsultaTCUPanel] = useState(false);
  const [showConsultaPrefeituraPanel, setShowConsultaPrefeituraPanel] = useState(false);
  const [showConsultaSefazPanel, setShowConsultaSefazPanel] = useState(false);
  const [showConsultaTSTPanel, setShowConsultaTSTPanel] = useState(false);
  const [consultandoCaixa, setConsultandoCaixa] = useState(false);
  const [consultandoReceita, setConsultandoReceita] = useState(false);
  const [consultandoTRT, setConsultandoTRT] = useState(false);
  const [consultandoTCU, setConsultandoTCU] = useState(false);
  const [consultandoPrefeitura, setConsultandoPrefeitura] = useState(false);
  const [consultandoSefaz, setConsultandoSefaz] = useState(false);
  const [consultandoTST, setConsultandoTST] = useState(false);
  const [editingCertidao, setEditingCertidao] = useState(null);
  const [editingCertificado, setEditingCertificado] = useState(null);
  const [selectedCertidao, setSelectedCertidao] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const queryClient = useQueryClient();

  // AUTH + CLINICA_ID
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = user?.role === 'admin';

  // MULTI-TENANT: Queries filtradas por clinica_id
  const { data: certidoes = [], isLoading: loadingCertidoes } = useOptimizedQuery({
    queryKey: ["certidoes", user?.clinica_id],
    queryFn: () => base44.entities.CertidaoRegularidade.filter({ clinica_id: user.clinica_id }, "-data_validade", 100),
    enabled: !!user?.clinica_id,
    initialData: []
  });

  const { data: dadosClinica = [], isLoading: loadingClinica } = useOptimizedQuery({
    queryKey: ["dadosFiscaisClinica", user?.clinica_id],
    queryFn: () => base44.entities.DadosFiscaisClinica.filter({ clinica_id: user.clinica_id }),
    enabled: !!user?.clinica_id,
    initialData: []
  });

  const clinica = dadosClinica[0];

  // COMPARTILHADOS (schemas globais - sem filtro clinica_id)
  const { data: orgaos = [], isLoading: loadingOrgaos } = useOptimizedQuery({
    queryKey: ["orgaos"],
    queryFn: () => base44.entities.OrgaoEmissor.list(),
    initialData: []
  });

  // MULTI-TENANT: Queries filtradas por clinica_id
  const { data: historico = [], isLoading: loadingHistorico } = useOptimizedQuery({
    queryKey: ["historicoCertidoes", user?.clinica_id],
    queryFn: () => base44.entities.HistoricoCertidao.filter({ clinica_id: user.clinica_id }, "-created_date", 100),
    enabled: !!user?.clinica_id,
    initialData: []
  });

  const { data: regrasNotificacao = [], isLoading: loadingRegras } = useOptimizedQuery({
    queryKey: ["regrasNotificacao", user?.clinica_id],
    queryFn: () => base44.entities.RegraNotificacao.filter({ clinica_id: user.clinica_id }),
    enabled: !!user?.clinica_id,
    initialData: []
  });

  const { data: certificados = [], isLoading: loadingCertificados } = useOptimizedQuery({
    queryKey: ["certificadosDigitais", user?.clinica_id],
    queryFn: () => base44.entities.CertificadoDigital.filter({ clinica_id: user.clinica_id }),
    enabled: !!user?.clinica_id,
    initialData: []
  });

  const { data: agendamentos = [], isLoading: loadingAgendamentos } = useOptimizedQuery({
    queryKey: ["agendamentosConsulta", user?.clinica_id],
    queryFn: () => base44.entities.AgendamentoConsulta.filter({ clinica_id: user.clinica_id }),
    enabled: !!user?.clinica_id,
    initialData: []
  });

  // ADMIN-ONLY: Permissões e Auditoria - apenas admin da clínica ou superadmin
  const { data: permissoes = [], isLoading: loadingPermissoes } = useOptimizedQuery({
    queryKey: ["permissoesCompliance", user?.clinica_id],
    queryFn: () => base44.entities.PermissaoCompliance.filter({ clinica_id: user.clinica_id }),
    enabled: !!user?.clinica_id && isAdmin,
    initialData: []
  });

  const { data: usuarios = [], isLoading: loadingUsuarios } = useOptimizedQuery({
    queryKey: ["usuarios"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
    initialData: []
  });

  const isLoading = loadingCertidoes || loadingClinica || loadingOrgaos || loadingHistorico || loadingRegras || loadingCertificados || loadingAgendamentos || loadingPermissoes || loadingUsuarios;

  // Mutations
  const createCertidaoMutation = useMutation({
    mutationFn: async (data) => {
      // MULTI-TENANT: Garantir clinica_id
      const dataComClinica = { ...data, clinica_id: user.clinica_id };
      const cert = await base44.entities.CertidaoRegularidade.create(dataComClinica);
      // Registrar no histórico
      await base44.entities.HistoricoCertidao.create({
        clinica_id: user.clinica_id,
        certidao_id: cert.id,
        certidao_titulo: data.titulo,
        orgao_emissor: data.orgao_emissor,
        data_emissao: data.data_emissao,
        data_validade: data.data_validade,
        numero_certidao: data.numero_certidao,
        resultado: data.resultado,
        arquivo_url: data.arquivo_url,
        tipo_registro: "emissao"
      });
      return cert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["certidoes"]);
      queryClient.invalidateQueries(["historicoCertidoes"]);
      setShowPanel(false);
      setEditingCertidao(null);
    }
  });

  const updateCertidaoMutation = useMutation({
    mutationFn: async ({ id, data, isRenovacao }) => {
      // MULTI-TENANT: Garantir clinica_id
      const dataComClinica = { ...data, clinica_id: user.clinica_id };
      await base44.entities.CertidaoRegularidade.update(id, dataComClinica);
      if (isRenovacao) {
        await base44.entities.HistoricoCertidao.create({
          clinica_id: user.clinica_id,
          certidao_id: id,
          certidao_titulo: data.titulo,
          orgao_emissor: data.orgao_emissor,
          data_emissao: data.data_emissao,
          data_validade: data.data_validade,
          numero_certidao: data.numero_certidao,
          resultado: data.resultado,
          arquivo_url: data.arquivo_url,
          tipo_registro: "renovacao"
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["certidoes"]);
      queryClient.invalidateQueries(["historicoCertidoes"]);
      setShowPanel(false);
      setEditingCertidao(null);
    }
  });

  const deleteCertidaoMutation = useMutation({
    mutationFn: (id) => base44.entities.CertidaoRegularidade.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["certidoes"])
  });

  const createOrgaoMutation = useMutation({
    mutationFn: (data) => base44.entities.OrgaoEmissor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["orgaos"]);
      setShowOrgaoPanel(false);
    }
  });

  const createRegraMutation = useMutation({
    mutationFn: (data) => base44.entities.RegraNotificacao.create({ ...data, clinica_id: user.clinica_id }),
    onSuccess: () => {
      queryClient.invalidateQueries(["regrasNotificacao"]);
      setShowRegraPanel(false);
    }
  });

  const deleteRegraMutation = useMutation({
    mutationFn: (id) => base44.entities.RegraNotificacao.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["regrasNotificacao"])
  });

  const createCertificadoMutation = useMutation({
    mutationFn: (data) => base44.entities.CertificadoDigital.create({ ...data, clinica_id: user.clinica_id }),
    onSuccess: () => {
      queryClient.invalidateQueries(["certificadosDigitais"]);
      setShowCertificadoPanel(false);
    }
  });

  const updateCertificadoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CertificadoDigital.update(id, { ...data, clinica_id: user.clinica_id }),
    onSuccess: () => {
      queryClient.invalidateQueries(["certificadosDigitais"]);
      setShowCertificadoPanel(false);
      setEditingCertificado(null);
    }
  });

  const deleteCertificadoMutation = useMutation({
    mutationFn: (id) => base44.entities.CertificadoDigital.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["certificadosDigitais"])
  });

  const createAgendamentoMutation = useMutation({
    mutationFn: (data) => base44.entities.AgendamentoConsulta.create({ ...data, clinica_id: user.clinica_id }),
    onSuccess: () => {
      queryClient.invalidateQueries(["agendamentosConsulta"]);
      setShowAgendamentoPanel(false);
    }
  });

  const updateAgendamentoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AgendamentoConsulta.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(["agendamentosConsulta"])
  });

  const deleteAgendamentoMutation = useMutation({
    mutationFn: (id) => base44.entities.AgendamentoConsulta.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["agendamentosConsulta"])
  });

  const createPermissaoMutation = useMutation({
    mutationFn: (data) => base44.entities.PermissaoCompliance.create({ ...data, clinica_id: user.clinica_id }),
    onSuccess: () => {
      queryClient.invalidateQueries(["permissoesCompliance"]);
      setShowPermissaoPanel(false);
    }
  });

  const updatePermissaoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PermissaoCompliance.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(["permissoesCompliance"])
  });

  const deletePermissaoMutation = useMutation({
    mutationFn: (id) => base44.entities.PermissaoCompliance.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["permissoesCompliance"])
  });

  // Form states
  const [formCertidao, setFormCertidao] = useState({
    orgao_emissor: "",
    titulo: "",
    tipo_certidao: "",
    categoria: "federal",
    numero_certidao: "",
    data_emissao: "",
    data_validade: "",
    status: "vigente",
    resultado: "negativa",
    arquivo_url: "",
    observacoes: "",
    alerta_vencimento_dias: 30,
    consulta_automatica: false,
    frequencia_consulta: "mensal",
    url_consulta: "",
    requer_certificado_digital: false,
    tipo_certificado: "nenhum"
  });

  const [formOrgao, setFormOrgao] = useState({
    nome: "",
    sigla: "",
    tipo: "federal",
    estado: "AM",
    cidade: "Manaus",
    site: "",
    observacoes: "",
    ativo: true
  });

  const [formRegra, setFormRegra] = useState({
    nome: "",
    tipo: "vencimento",
    prioridade: "media",
    dias_antecedencia: 30,
    destinatarios_emails: [],
    categorias_certidao: [],
    template_email: {
      assunto: "⚠️ Alerta: Certidão {titulo} - Vencimento em {dias_restantes} dias",
      corpo: "A certidão {titulo} do órgão {orgao} vencerá em {dias_restantes} dias.\n\nData de Validade: {data_validade}\nNúmero: {numero_certidao}\n\nPor favor, providencie a renovação o quanto antes.",
      incluir_anexo: true
    },
    ativo: true,
    enviar_email: true,
    mensagem_personalizada: ""
  });

  const [formCertificado, setFormCertificado] = useState({
    nome: "",
    tipo: "a1",
    titular: "",
    cpf_cnpj: "",
    autoridade_certificadora: "",
    data_emissao: "",
    data_validade: "",
    status: "ativo",
    arquivo_url: "",
    senha_protegida: true,
    numero_serie: "",
    dispositivo_a3: "nenhum",
    modelo_dispositivo: "",
    uso_autorizado: [],
    observacoes: ""
  });

  const [formAgendamento, setFormAgendamento] = useState({
    certidao_id: "",
    certidao_titulo: "",
    orgao_emissor: "",
    frequencia: "mensal",
    dia_semana: 1,
    dia_mes: 1,
    horario: "08:00",
    url_consulta: "",
    certificado_digital_id: "",
    notificar_resultado: true,
    emails_notificacao: "",
    ativo: true
  });

  const [formPermissao, setFormPermissao] = useState({
    usuario_email: "",
    usuario_nome: "",
    perfil: "visualizador",
    permissoes: {
      visualizar_certidoes: true,
      criar_certidoes: false,
      editar_certidoes: false,
      excluir_certidoes: false,
      download_certidoes: true,
      enviar_email: false,
      exportar_relatorios: false,
      gerenciar_orgaos: false,
      gerenciar_regras: false,
      gerenciar_certificados: false,
      gerenciar_agendamentos: false,
      gerenciar_permissoes: false
    },
    categorias_permitidas: [],
    ativo: true,
    observacoes: ""
  });

  const [formConsultaCaixa, setFormConsultaCaixa] = useState({
    cnpj: "",
    cei: ""
  });

  const [formConsultaReceita, setFormConsultaReceita] = useState({
    cnpj: "",
    cpf: "",
    birthdate: ""
  });

  const [formConsultaTRT11, setFormConsultaTRT11] = useState({
    cnpj: "",
    cpf: ""
  });

  const [formConsultaTCU, setFormConsultaTCU] = useState({
    cnpj: ""
  });

  const [formConsultaPrefeitura, setFormConsultaPrefeitura] = useState({
    cnpj: "",
    cpf: "",
    inscricao_municipal: "",
    estado: "AM",
    cidade: "Manaus"
  });

  const [formConsultaSefaz, setFormConsultaSefaz] = useState({
    cnpj: "",
    cpf: ""
  });

  const [formConsultaTST, setFormConsultaTST] = useState({
    cnpj: "",
    razao_social: "",
    numero_processo: ""
  });

  const perfisPermissao = {
    admin: {
      visualizar_certidoes: true, criar_certidoes: true, editar_certidoes: true, excluir_certidoes: true,
      download_certidoes: true, enviar_email: true, exportar_relatorios: true, gerenciar_orgaos: true,
      gerenciar_regras: true, gerenciar_certificados: true, gerenciar_agendamentos: true, gerenciar_permissoes: true
    },
    gestor: {
      visualizar_certidoes: true, criar_certidoes: true, editar_certidoes: true, excluir_certidoes: false,
      download_certidoes: true, enviar_email: true, exportar_relatorios: true, gerenciar_orgaos: true,
      gerenciar_regras: true, gerenciar_certificados: true, gerenciar_agendamentos: true, gerenciar_permissoes: false
    },
    operador: {
      visualizar_certidoes: true, criar_certidoes: true, editar_certidoes: true, excluir_certidoes: false,
      download_certidoes: true, enviar_email: true, exportar_relatorios: false, gerenciar_orgaos: false,
      gerenciar_regras: false, gerenciar_certificados: false, gerenciar_agendamentos: false, gerenciar_permissoes: false
    },
    visualizador: {
      visualizar_certidoes: true, criar_certidoes: false, editar_certidoes: false, excluir_certidoes: false,
      download_certidoes: true, enviar_email: false, exportar_relatorios: false, gerenciar_orgaos: false,
      gerenciar_regras: false, gerenciar_certificados: false, gerenciar_agendamentos: false, gerenciar_permissoes: false
    }
  };

  const hoje = new Date();

  // Filtros
  const certidoesFiltradas = useMemo(() => {
    return (certidoes || []).filter(cert => {
      const matchBusca = cert.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
                        cert.orgao_emissor?.toLowerCase().includes(busca.toLowerCase());
      
      try {
        const diasRestantes = differenceInDays(new Date(cert.data_validade), hoje);
        let statusAtual = "vigente";
        if (diasRestantes < 0) statusAtual = "vencida";
        else if (diasRestantes <= 30) statusAtual = "vencendo";
        
        const matchStatus = filtroStatus === "todos" || 
                           (filtroStatus === "vencida" && statusAtual === "vencida") ||
                           (filtroStatus === "vencendo" && statusAtual === "vencendo") ||
                           (filtroStatus === "vigente" && statusAtual === "vigente" && diasRestantes > 30);
        
        const matchCategoria = filtroCategoria === "todos" || cert.categoria === filtroCategoria;
        
        return matchBusca && matchStatus && matchCategoria;
      } catch {
        return false;
      }
    });
  }, [certidoes, busca, filtroStatus, filtroCategoria]);

  // Handlers
  const handleSubmitCertidao = (e) => {
    e.preventDefault();
    const tipoSelecionado = tiposCertidao.find(t => t.value === formCertidao.tipo_certidao);
    const dataToSave = {
      ...formCertidao,
      categoria: formCertidao.categoria || tipoSelecionado?.categoria || "federal"
    };
    
    if (editingCertidao) {
      const isRenovacao = formCertidao.data_validade !== editingCertidao.data_validade;
      updateCertidaoMutation.mutate({ id: editingCertidao.id, data: dataToSave, isRenovacao });
    } else {
      createCertidaoMutation.mutate(dataToSave);
    }
  };

  const handleSubmitOrgao = (e) => {
    e.preventDefault();
    createOrgaoMutation.mutate(formOrgao);
  };

  const handleSubmitRegra = (e) => {
    e.preventDefault();
    createRegraMutation.mutate(formRegra);
  };

  const handleSubmitCertificado = (e) => {
    e.preventDefault();
    if (editingCertificado) {
      updateCertificadoMutation.mutate({ id: editingCertificado.id, data: formCertificado });
    } else {
      createCertificadoMutation.mutate(formCertificado);
    }
  };

  const handleSubmitAgendamento = (e) => {
    e.preventDefault();
    createAgendamentoMutation.mutate(formAgendamento);
  };

  const handleSubmitPermissao = (e) => {
    e.preventDefault();
    createPermissaoMutation.mutate(formPermissao);
  };

  const consultarCertidaoCaixa = async () => {
    const cnpj = formConsultaCaixa.cnpj || clinica?.cnpj;
    const cei = formConsultaCaixa.cei;

    if (!cnpj && !cei) {
      alert("Informe o CNPJ/CEI ou configure os dados da clínica primeiro");
      return;
    }

    setConsultandoCaixa(true);
    try {
      const user = await base44.auth.me();
      const response = await base44.functions.invoke('obterCertidaoCaixa', {
        cnpj: cnpj,
        cei: cei
      });

      const resultado = response.data;
      
      // Salvar resultado completo da API
      await base44.entities.ResultadoAPICompleto.create({
        tipo_consulta: "fgts",
        parametros_enviados: { cnpj, cei },
        resposta_completa: resultado,
        sucesso: resultado.success,
        codigo_retorno: resultado.code || 200,
        tempo_resposta_ms: resultado.api_info?.elapsed_time,
        custo_api: resultado.api_info?.price?.toString(),
        usuario_solicitante: user.email
      });

      if (!resultado.success) {
        alert(`Erro ao consultar certidão:\n${resultado.error}\n\nCódigo: ${resultado.code || 'N/A'}`);
        return;
      }

      const cert = resultado.certidao;

      // Salvar resultado no log
      const novaCertidao = await base44.entities.CertidaoRegularidade.create({
        clinica_id: user.clinica_id,
        orgao_emissor: "CAIXA",
        titulo: "Certificado de Regularidade do FGTS (CRF)",
        tipo_certidao: "cnd_fgts",
        categoria: "federal",
        numero_certidao: cert.numero_certidao,
        data_emissao: cert.data_emissao,
        data_validade: cert.data_validade,
        status: cert.situacao === "REGULAR" ? "vigente" : "irregular",
        resultado: cert.situacao === "REGULAR" ? "negativa" : "positiva",
        arquivo_url: cert.arquivo_url,
        observacoes: `Razão Social: ${cert.razao_social}\nInscrição: ${cert.inscricao}\nEndereço: ${cert.endereco}\n\n${cert.pdf_url_original ? 'PDF Original: ' + cert.pdf_url_original : ''}`,
        consulta_automatica: false
      });

      // Atualizar log com ID da certidão gerada
      const logs = await base44.entities.ResultadoAPICompleto.filter({ 
        tipo_consulta: "fgts",
        certidao_gerada_id: null 
      });
      if (logs.length > 0) {
        await base44.entities.ResultadoAPICompleto.update(logs[logs.length - 1].id, {
          certidao_gerada_id: novaCertidao.id
        });
      }

      await base44.entities.HistoricoCertidao.create({
        clinica_id: user.clinica_id,
        certidao_id: novaCertidao.id,
        certidao_titulo: "Certificado de Regularidade do FGTS (CRF)",
        orgao_emissor: "CAIXA",
        data_emissao: cert.data_emissao,
        data_validade: cert.data_validade,
        numero_certidao: cert.numero_certidao,
        resultado: cert.situacao === "REGULAR" ? "negativa" : "positiva",
        arquivo_url: cert.arquivo_url,
        tipo_registro: "consulta_manual",
        observacoes: `Consulta via API Infosimples. Custo: R$ ${resultado.api_info.price}`
      });

      queryClient.invalidateQueries(["certidoes"]);
      queryClient.invalidateQueries(["historicoCertidoes"]);

      setShowConsultaCaixaPanel(false);
      setFormConsultaCaixa({ cnpj: "", cei: "" });

      alert(`✅ Certidão FGTS consultada!\n\nSituação: ${cert.situacao}\nNúmero: ${cert.numero_certidao}\nValidade: ${cert.data_validade ? formatarData(cert.data_validade) : 'N/A'}`);

    } catch (error) {
      console.error("Erro ao consultar certidão:", error);
      alert(`Erro: ${error.message}`);
    } finally {
      setConsultandoCaixa(false);
    }
  };

  const consultarCertidaoReceita = async (segundaVia = false) => {
    const cnpj = formConsultaReceita.cnpj || clinica?.cnpj;
    const cpf = formConsultaReceita.cpf;

    if (!cnpj && !cpf) {
      alert("Informe o CNPJ/CPF ou configure os dados da clínica primeiro");
      return;
    }

    setConsultandoReceita(true);
    try {
      const user = await base44.auth.me();
      const functionName = segundaVia ? 'obterCertidaoReceitaFederal2Via' : 'obterCertidaoReceitaFederal';
      
      const response = await base44.functions.invoke(functionName, {
        cnpj: cnpj,
        cpf: cpf,
        birthdate: formConsultaReceita.birthdate
      });

      const resultado = response.data;
      
      await base44.entities.ResultadoAPICompleto.create({
        tipo_consulta: "receita_federal",
        parametros_enviados: { cnpj, cpf },
        resposta_completa: resultado,
        sucesso: resultado.success,
        codigo_retorno: resultado.code || 200,
        tempo_resposta_ms: resultado.api_info?.elapsed_time,
        custo_api: resultado.api_info?.price?.toString(),
        usuario_solicitante: user.email
      });

      if (!resultado.success) {
        alert(`Erro: ${resultado.error}\n\nCódigo: ${resultado.code || 'N/A'}`);
        return;
      }

      const cert = resultado.certidao;

      const novaCertidao = await base44.entities.CertidaoRegularidade.create({
        clinica_id: user.clinica_id,
        orgao_emissor: "Receita Federal / PGFN",
        titulo: "Certidão Negativa de Débitos Federal",
        tipo_certidao: "cnd_federal",
        categoria: "federal",
        numero_certidao: cert.numero_certidao,
        data_emissao: cert.data_emissao,
        data_validade: cert.data_validade,
        status: cert.situacao === "REGULAR" ? "vigente" : "irregular",
        resultado: cert.situacao === "REGULAR" ? "negativa" : "positiva",
        arquivo_url: cert.arquivo_url,
        observacoes: `${cert.segunda_via ? '[SEGUNDA VIA]\n' : ''}Nome: ${cert.nome}\nCPF/CNPJ: ${cert.cpf_cnpj}\nTipo: ${cert.tipo || 'N/A'}\n\n${cert.pdf_url_original ? 'PDF Original: ' + cert.pdf_url_original : ''}`,
        consulta_automatica: false
      });

      const logs = await base44.entities.ResultadoAPICompleto.filter({ 
        tipo_consulta: "receita_federal",
        certidao_gerada_id: null 
      });
      if (logs.length > 0) {
        await base44.entities.ResultadoAPICompleto.update(logs[logs.length - 1].id, {
          certidao_gerada_id: novaCertidao.id
        });
      }

      await base44.entities.HistoricoCertidao.create({
        clinica_id: user.clinica_id,
        certidao_id: novaCertidao.id,
        certidao_titulo: "Certidão Negativa de Débitos Federal",
        orgao_emissor: "Receita Federal / PGFN",
        data_emissao: cert.data_emissao,
        data_validade: cert.data_validade,
        numero_certidao: cert.numero_certidao,
        resultado: cert.situacao === "REGULAR" ? "negativa" : "positiva",
        arquivo_url: cert.arquivo_url,
        tipo_registro: "consulta_manual",
        observacoes: `Via API. Custo: R$ ${resultado.api_info.price}`
      });

      queryClient.invalidateQueries(["certidoes"]);
      queryClient.invalidateQueries(["historicoCertidoes"]);

      setShowConsultaReceitaPanel(false);
      setFormConsultaReceita({ cnpj: "", cpf: "", birthdate: "" });

      alert(`✅ Certidão Federal consultada!\n\nSituação: ${cert.situacao}\nNúmero: ${cert.numero_certidao}\nValidade: ${cert.data_validade ? formatarData(cert.data_validade) : 'N/A'}`);

    } catch (error) {
      console.error("Erro:", error);
      alert(`Erro: ${error.message}`);
    } finally {
      setConsultandoReceita(false);
    }
  };

  const consultarCertidaoTRT11 = async () => {
    const cnpj = formConsultaTRT11.cnpj || clinica?.cnpj;
    const cpf = formConsultaTRT11.cpf;

    if (!cnpj && !cpf) {
      alert("Informe CNPJ ou CPF");
      return;
    }

    setConsultandoTRT(true);
    try {
      const user = await base44.auth.me();
      const response = await base44.functions.invoke('obterCertidaoTRT11', {
        cnpj: cnpj,
        cpf: cpf
      });
      const resultado = response.data;
      
      await base44.entities.ResultadoAPICompleto.create({
        tipo_consulta: "trt11",
        parametros_enviados: { cnpj, cpf },
        resposta_completa: resultado,
        sucesso: resultado.success,
        codigo_retorno: resultado.code || 200,
        tempo_resposta_ms: resultado.api_info?.elapsed_time,
        custo_api: resultado.api_info?.price?.toString(),
        usuario_solicitante: user.email
      });

      if (!resultado.success) {
        alert(`Erro: ${resultado.error}\n\nCódigo: ${resultado.code || 'N/A'}`);
        return;
      }

      const cert = resultado.certidao;

      let observacoes = `CPF/CNPJ: ${cert.cpf_cnpj}\n`;
      observacoes += `Situação: ${cert.situacao}\n`;
      observacoes += `Total de Processos: ${cert.total_processos || 0}\n\n`;
      
      if (cert.processos && cert.processos.length > 0) {
        observacoes += `PROCESSOS ENCONTRADOS:\n`;
        cert.processos.slice(0, 5).forEach((proc, idx) => {
          observacoes += `${idx + 1}. ${proc.numero_do_processo} - ${proc.vara}\n`;
        });
        if (cert.processos.length > 5) {
          observacoes += `... e mais ${cert.processos.length - 5} processo(s)\n`;
        }
      }
      
      if (cert.pdf_url_original) {
        observacoes += `\nPDF Original: ${cert.pdf_url_original}`;
      }

      const novaCertidao = await base44.entities.CertidaoRegularidade.create({
        clinica_id: user.clinica_id,
        orgao_emissor: "TRT11",
        titulo: "Certidão Eletrônica de Ações Trabalhistas (CEAT)",
        tipo_certidao: "cnd_trabalhista",
        categoria: "trabalhista",
        numero_certidao: cert.numero_certidao,
        data_emissao: cert.data_emissao,
        data_validade: cert.data_validade,
        status: cert.situacao === "NADA CONSTA" ? "vigente" : "irregular",
        resultado: cert.situacao === "NADA CONSTA" ? "nada_consta" : "positiva",
        arquivo_url: cert.arquivo_url,
        observacoes: observacoes,
        consulta_automatica: false
      });

      const logs = await base44.entities.ResultadoAPICompleto.filter({ 
        tipo_consulta: "trt11",
        certidao_gerada_id: null 
      });
      if (logs.length > 0) {
        await base44.entities.ResultadoAPICompleto.update(logs[logs.length - 1].id, {
          certidao_gerada_id: novaCertidao.id
        });
      }

      await base44.entities.HistoricoCertidao.create({
        clinica_id: user.clinica_id,
        certidao_id: novaCertidao.id,
        certidao_titulo: "Certidão Negativa de Débitos Trabalhistas",
        orgao_emissor: "TRT11",
        data_emissao: cert.data_emissao,
        data_validade: cert.data_validade,
        numero_certidao: cert.numero_certidao,
        resultado: cert.situacao === "NADA CONSTA" ? "nada_consta" : "positiva",
        arquivo_url: cert.arquivo_url,
        tipo_registro: "consulta_manual",
        observacoes: `Via API. Custo: R$ ${resultado.api_info.price}`
      });

      queryClient.invalidateQueries(["certidoes"]);
      queryClient.invalidateQueries(["historicoCertidoes"]);

      setShowConsultaTRT11Panel(false);
      setFormConsultaTRT11({ cnpj: "", cpf: "" });

      const mensagem = `✅ Certidão TRT11 consultada!\n\nSituação: ${cert.situacao}\nProcessos: ${cert.total_processos || 0}\nNúmero: ${cert.numero_certidao || 'N/A'}`;
      alert(mensagem);

    } catch (error) {
      console.error("Erro:", error);
      alert(`Erro: ${error.message}`);
    } finally {
      setConsultandoTRT(false);
    }
  };

  const consultarCertidaoTCU = async () => {
    const cnpj = formConsultaTCU.cnpj || clinica?.cnpj;

    if (!cnpj) {
      alert("Informe o CNPJ ou configure os dados da clínica");
      return;
    }

    setConsultandoTCU(true);
    try {
      const user = await base44.auth.me();
      const response = await base44.functions.invoke('obterCertidaoTCU', {
        cnpj: cnpj
      });

      const resultado = response.data;
      
      await base44.entities.ResultadoAPICompleto.create({
        tipo_consulta: "tcu",
        parametros_enviados: { cnpj },
        resposta_completa: resultado,
        sucesso: resultado.success,
        codigo_retorno: resultado.code || 200,
        tempo_resposta_ms: resultado.api_info?.elapsed_time,
        custo_api: resultado.api_info?.price?.toString(),
        usuario_solicitante: user.email
      });

      if (!resultado.success) {
        alert(`Erro: ${resultado.error}\n\nCódigo: ${resultado.code || 'N/A'}`);
        return;
      }

      const cert = resultado.certidao;

      const novaCertidao = await base44.entities.CertidaoRegularidade.create({
        clinica_id: user.clinica_id,
        orgao_emissor: "TCU",
        titulo: "Consulta Consolidada TCU",
        tipo_certidao: "consulta_tcu",
        categoria: "federal",
        numero_certidao: cert.numero_certidao,
        data_emissao: cert.data_emissao,
        data_validade: cert.data_validade,
        status: cert.situacao === "REGULAR" ? "vigente" : "irregular",
        resultado: cert.situacao === "REGULAR" ? "negativa" : "positiva",
        arquivo_url: cert.arquivo_url,
        observacoes: `Razão Social: ${cert.razao_social}\nCNPJ: ${cert.cnpj}\n\n${cert.pdf_url_original ? 'PDF Original: ' + cert.pdf_url_original : ''}`,
        consulta_automatica: false
      });

      const logs = await base44.entities.ResultadoAPICompleto.filter({ 
        tipo_consulta: "tcu",
        certidao_gerada_id: null 
      });
      if (logs.length > 0) {
        await base44.entities.ResultadoAPICompleto.update(logs[logs.length - 1].id, {
          certidao_gerada_id: novaCertidao.id
        });
      }

      await base44.entities.HistoricoCertidao.create({
        clinica_id: user.clinica_id,
        certidao_id: novaCertidao.id,
        certidao_titulo: "Consulta Consolidada TCU",
        orgao_emissor: "TCU",
        data_emissao: cert.data_emissao,
        data_validade: cert.data_validade,
        numero_certidao: cert.numero_certidao,
        resultado: cert.situacao === "REGULAR" ? "negativa" : "positiva",
        arquivo_url: cert.arquivo_url,
        tipo_registro: "consulta_manual",
        observacoes: `Via API. Custo: R$ ${resultado.api_info.price}`
      });

      queryClient.invalidateQueries(["certidoes"]);
      queryClient.invalidateQueries(["historicoCertidoes"]);

      setShowConsultaTCUPanel(false);
      setFormConsultaTCU({ cnpj: "" });

      alert(`✅ Consulta TCU realizada!\n\nSituação: ${cert.situacao}\nNúmero: ${cert.numero_certidao || 'N/A'}\nValidade: ${cert.data_validade ? formatarData(cert.data_validade) : 'N/A'}`);

    } catch (error) {
      console.error("Erro:", error);
      alert(`Erro: ${error.message}`);
    } finally {
      setConsultandoTCU(false);
    }
  };

  const consultarCertidaoTST = async () => {
    const cnpj = formConsultaTST.cnpj || clinica?.cnpj;
    const razao = formConsultaTST.razao_social || clinica?.razao_social;
    const processo = formConsultaTST.numero_processo;

    if (!cnpj && !razao && !processo) {
      alert("Informe ao menos um parâmetro de busca");
      return;
    }

    setConsultandoTST(true);
    try {
      const user = await base44.auth.me();
      const response = await base44.functions.invoke('obterCertidaoTST', {
        cnpj: cnpj,
        razao_social: razao,
        numero_processo: processo
      });

      const resultado = response.data;
      
      await base44.entities.ResultadoAPICompleto.create({
        tipo_consulta: "tst_falencia",
        parametros_enviados: { cnpj, razao_social: razao, numero_processo: processo },
        resposta_completa: resultado,
        sucesso: resultado.success,
        codigo_retorno: resultado.code || 200,
        tempo_resposta_ms: resultado.api_info?.elapsed_time,
        custo_api: resultado.api_info?.price?.toString(),
        usuario_solicitante: user.email
      });

      if (!resultado.success) {
        alert(`Resultado: ${resultado.error}\n\nCódigo: ${resultado.code || 'N/A'}`);
        return;
      }

      const cert = resultado.certidao;

      const novaCertidao = await base44.entities.CertidaoRegularidade.create({
        clinica_id: user.clinica_id,
        orgao_emissor: "TST - Tribunal Superior do Trabalho",
        titulo: "Consulta Banco de Falências - TST",
        tipo_certidao: "cnd_falencia",
        categoria: "judicial",
        numero_certidao: cert.numero_processo,
        data_emissao: cert.data_ocorrencia,
        data_validade: cert.data_ocorrencia,
        status: "em_consulta",
        resultado: "positiva",
        arquivo_url: cert.arquivo_url,
        observacoes: `CNPJ: ${cert.cnpj}\nRazão Social: ${cert.razao_social}\nProcesso: ${cert.numero_processo}\nDecisão: ${cert.decisao}\nOcorrência: ${cert.ocorrencia}\nVara: ${cert.vara}\nFonte: ${cert.fonte}\n\n${cert.pdf_url_original ? 'PDF Original: ' + cert.pdf_url_original : ''}`,
        consulta_automatica: false
      });

      const logs = await base44.entities.ResultadoAPICompleto.filter({ 
        tipo_consulta: "tst_falencia",
        certidao_gerada_id: null 
      });
      if (logs.length > 0) {
        await base44.entities.ResultadoAPICompleto.update(logs[logs.length - 1].id, {
          certidao_gerada_id: novaCertidao.id
        });
      }

      await base44.entities.HistoricoCertidao.create({
        clinica_id: user.clinica_id,
        certidao_id: novaCertidao.id,
        certidao_titulo: "Consulta Banco de Falências - TST",
        orgao_emissor: "TST",
        data_emissao: cert.data_ocorrencia,
        data_validade: cert.data_ocorrencia,
        numero_certidao: cert.numero_processo,
        resultado: "positiva",
        arquivo_url: cert.arquivo_url,
        tipo_registro: "consulta_manual",
        observacoes: `Via API. Custo: R$ ${resultado.api_info.price}`
      });

      queryClient.invalidateQueries(["certidoes"]);
      queryClient.invalidateQueries(["historicoCertidoes"]);

      setShowConsultaTSTPanel(false);
      setFormConsultaTST({ cnpj: "", razao_social: "", numero_processo: "" });

      alert(`✅ Consulta TST realizada!\n\nEmpresa: ${cert.razao_social}\nDecisão: ${cert.decisao}\nProcesso: ${cert.numero_processo}`);

    } catch (error) {
      console.error("Erro:", error);
      alert(`Erro: ${error.message}`);
    } finally {
      setConsultandoTST(false);
    }
  };

  const consultarCertidaoSefaz = async () => {
    const cnpj = formConsultaSefaz.cnpj || clinica?.cnpj;
    const cpf = formConsultaSefaz.cpf;

    if (!cnpj && !cpf) {
      alert("Informe CNPJ/CPF ou configure os dados da clínica primeiro");
      return;
    }

    setConsultandoSefaz(true);
    try {
      const user = await base44.auth.me();
      const response = await base44.functions.invoke('obterCertidaoSefaz', {
        cnpj: cnpj,
        cpf: cpf
      });

      const resultado = response.data;
      
      await base44.entities.ResultadoAPICompleto.create({
        tipo_consulta: "sefaz",
        parametros_enviados: { cnpj, cpf },
        resposta_completa: resultado,
        sucesso: resultado.success,
        codigo_retorno: resultado.code || 200,
        tempo_resposta_ms: resultado.api_info?.elapsed_time,
        custo_api: resultado.api_info?.price?.toString(),
        usuario_solicitante: user.email
      });

      if (!resultado.success) {
        alert(`Erro: ${resultado.error}\n\nCódigo: ${resultado.code || 'N/A'}`);
        return;
      }

      const cert = resultado.certidao;

      const novaCertidao = await base44.entities.CertidaoRegularidade.create({
        clinica_id: user.clinica_id,
        orgao_emissor: "SEFAZ/AM",
        titulo: "Certidão Negativa de Débitos SEFAZ/AM",
        tipo_certidao: "cnd_estadual",
        categoria: "estadual",
        numero_certidao: cert.numero_certidao,
        data_emissao: cert.data_emissao,
        data_validade: cert.data_validade,
        status: cert.situacao === "REGULAR" ? "vigente" : "irregular",
        resultado: cert.situacao === "REGULAR" ? "negativa" : "positiva",
        arquivo_url: cert.arquivo_url,
        observacoes: `CPF/CNPJ: ${cert.cpf_cnpj}\nMensagem: ${cert.mensagem || ''}\n\n${cert.pdf_url_original ? 'PDF Original: ' + cert.pdf_url_original : ''}`,
        consulta_automatica: false
      });

      const logs = await base44.entities.ResultadoAPICompleto.filter({ 
        tipo_consulta: "sefaz",
        certidao_gerada_id: null 
      });
      if (logs.length > 0) {
        await base44.entities.ResultadoAPICompleto.update(logs[logs.length - 1].id, {
          certidao_gerada_id: novaCertidao.id
        });
      }

      await base44.entities.HistoricoCertidao.create({
        clinica_id: user.clinica_id,
        certidao_id: novaCertidao.id,
        certidao_titulo: "Certidão Negativa de Débitos SEFAZ/AM",
        orgao_emissor: "SEFAZ/AM",
        data_emissao: cert.data_emissao,
        data_validade: cert.data_validade,
        numero_certidao: cert.numero_certidao,
        resultado: cert.situacao === "REGULAR" ? "negativa" : "positiva",
        arquivo_url: cert.arquivo_url,
        tipo_registro: "consulta_manual",
        observacoes: `Via API. Custo: R$ ${resultado.api_info.price}`
      });

      queryClient.invalidateQueries(["certidoes"]);
      queryClient.invalidateQueries(["historicoCertidoes"]);

      setShowConsultaSefazPanel(false);
      setFormConsultaSefaz({ cnpj: "", cpf: "" });

      alert(`✅ Certidão SEFAZ/AM consultada!\n\nSituação: ${cert.situacao}\nNúmero: ${cert.numero_certidao || 'N/A'}\nValidade: ${cert.data_validade ? formatarData(cert.data_validade) : 'N/A'}`);

    } catch (error) {
      console.error("Erro:", error);
      alert(`Erro: ${error.message}`);
    } finally {
      setConsultandoSefaz(false);
    }
  };

  const consultarCertidaoPrefeitura = async () => {
    const cnpj = formConsultaPrefeitura.cnpj || clinica?.cnpj;
    const cpf = formConsultaPrefeitura.cpf;
    const inscricao = formConsultaPrefeitura.inscricao_municipal;
    const estado = formConsultaPrefeitura.estado || clinica?.estado;
    const cidade = formConsultaPrefeitura.cidade || clinica?.cidade;

    if (!cnpj && !cpf && !inscricao) {
      alert("Informe CNPJ/CPF/Inscrição ou configure os dados da clínica");
      return;
    }
    
    if (!estado || !cidade) {
      alert("Informe estado e cidade ou configure os dados da clínica");
      return;
    }

    setConsultandoPrefeitura(true);
    try {
      const user = await base44.auth.me();
      const response = await base44.functions.invoke('obterCertidaoPrefeitura', {
        cnpj: cnpj,
        cpf: cpf,
        inscricao_municipal: inscricao,
        estado: estado,
        cidade: cidade
      });
      const resultado = response.data;
      
      await base44.entities.ResultadoAPICompleto.create({
        tipo_consulta: "prefeitura",
        parametros_enviados: { cnpj, cpf, inscricao, estado, cidade },
        resposta_completa: resultado,
        sucesso: resultado.success,
        codigo_retorno: resultado.code || 200,
        tempo_resposta_ms: resultado.api_info?.elapsed_time,
        custo_api: resultado.api_info?.price?.toString(),
        usuario_solicitante: user.email
      });

      if (!resultado.success) {
        alert(`Erro: ${resultado.error}\n\nCódigo: ${resultado.code || 'N/A'}\n${resultado.info || ''}`);
        return;
      }

      const cert = resultado.certidao;

      const novaCertidao = await base44.entities.CertidaoRegularidade.create({
        clinica_id: user.clinica_id,
        orgao_emissor: `Prefeitura de ${cert.cidade}/${cert.estado}`,
        titulo: `Certidão Negativa de Débitos Municipal - ${cert.cidade}`,
        tipo_certidao: "cnd_municipal",
        categoria: "municipal",
        numero_certidao: cert.numero_certidao,
        data_emissao: cert.data_emissao,
        data_validade: cert.data_validade,
        status: cert.situacao === "REGULAR" ? "vigente" : "irregular",
        resultado: cert.situacao === "REGULAR" ? "negativa" : "positiva",
        arquivo_url: cert.arquivo_url,
        observacoes: `Razão Social: ${cert.razao_social}\nCPF/CNPJ: ${cert.cpf_cnpj}\nInscrição Municipal: ${cert.inscricao_municipal || 'N/A'}\n\n${cert.pdf_url_original ? 'PDF Original: ' + cert.pdf_url_original : ''}`,
        consulta_automatica: false
      });

      const logs = await base44.entities.ResultadoAPICompleto.filter({ 
        tipo_consulta: "prefeitura",
        certidao_gerada_id: null 
      });
      if (logs.length > 0) {
        await base44.entities.ResultadoAPICompleto.update(logs[logs.length - 1].id, {
          certidao_gerada_id: novaCertidao.id
        });
      }

      await base44.entities.HistoricoCertidao.create({
        clinica_id: user.clinica_id,
        certidao_id: novaCertidao.id,
        certidao_titulo: `Certidão Negativa de Débitos Municipal - ${cert.cidade}`,
        orgao_emissor: `Prefeitura de ${cert.cidade}/${cert.estado}`,
        data_emissao: cert.data_emissao,
        data_validade: cert.data_validade,
        numero_certidao: cert.numero_certidao,
        resultado: cert.situacao === "REGULAR" ? "negativa" : "positiva",
        arquivo_url: cert.arquivo_url,
        tipo_registro: "consulta_manual",
        observacoes: `Via API. Custo: R$ ${resultado.api_info.price}`
      });

      queryClient.invalidateQueries(["certidoes"]);
      queryClient.invalidateQueries(["historicoCertidoes"]);

      setShowConsultaPrefeituraPanel(false);
      setFormConsultaPrefeitura({
        cnpj: "",
        cpf: "",
        inscricao_municipal: "",
        estado: "AM",
        cidade: "Manaus"
      });

      alert(`✅ Certidão Municipal consultada!\n\nSituação: ${cert.situacao}\nNúmero: ${cert.numero_certidao || 'N/A'}`);

    } catch (error) {
      console.error("Erro:", error);
      alert(`Erro: ${error.message}`);
    } finally {
      setConsultandoPrefeitura(false);
    }
  };

  const aplicarPerfil = (perfil) => {
    setFormPermissao(prev => ({
      ...prev,
      perfil,
      permissoes: perfisPermissao[perfil]
    }));
  };

  const toggleAgendamento = (agendamento) => {
    updateAgendamentoMutation.mutate({
      id: agendamento.id,
      data: { ...agendamento, ativo: !agendamento.ativo }
    });
  };

  const togglePermissao = (permissao) => {
    updatePermissaoMutation.mutate({
      id: permissao.id,
      data: { ...permissao, ativo: !permissao.ativo }
    });
  };

  const [processandoPDF, setProcessandoPDF] = useState(false);
  const [prazoValidade, setPrazoValidade] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (e, setterFn, field) => {
    const file = e.target.files[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setterFn(prev => ({ ...prev, [field]: file_url }));
    }
  };

  const calcularDataValidade = (prazo) => {
    if (!prazo || !formCertidao.data_emissao) return;
    const dias = parseInt(prazo);
    if (isNaN(dias)) return;
    
    const dataEmissao = new Date(formCertidao.data_emissao + 'T00:00:00');
    const dataValidade = new Date(dataEmissao);
    dataValidade.setDate(dataValidade.getDate() + dias);
    
    const ano = dataValidade.getFullYear();
    const mes = String(dataValidade.getMonth() + 1).padStart(2, '0');
    const dia = String(dataValidade.getDate()).padStart(2, '0');
    
    setFormCertidao(prev => ({
      ...prev,
      data_validade: `${ano}-${mes}-${dia}`
    }));
  };

  const handlePrazoChange = (value) => {
    setPrazoValidade(value);
    calcularDataValidade(value);
  };

  const formatarData = (data, formato = "dd/MM/yyyy") => {
    try {
      return format(new Date(data), formato);
    } catch {
      return "N/A";
    }
  };

  const processarArquivoCertidao = async (file) => {
    setProcessandoPDF(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke('lerCertidaoPDF', { file_url });
      
      if (response.data.success && response.data.dados) {
        const dados = response.data.dados;
        setFormCertidao(prev => ({
          ...prev,
          arquivo_url: file_url,
          numero_certidao: dados.numero_certidao || prev.numero_certidao,
          orgao_emissor: dados.orgao_emissor || prev.orgao_emissor,
          data_emissao: dados.data_emissao || prev.data_emissao,
          data_validade: dados.data_validade || prev.data_validade,
          titulo: dados.titulo || prev.titulo,
          tipo_certidao: dados.tipo_certidao || prev.tipo_certidao,
          resultado: dados.resultado || prev.resultado,
          observacoes: dados.observacoes || prev.observacoes
        }));
      } else {
        setFormCertidao(prev => ({ ...prev, arquivo_url: file_url }));
      }
    } catch (error) {
      console.error("Erro ao processar certidão:", error);
      alert("Arquivo enviado, mas não foi possível ler os dados automaticamente");
    } finally {
      setProcessandoPDF(false);
    }
  };

  const handleUploadCertidao = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await processarArquivoCertidao(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processarArquivoCertidao(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const enviarEmailCertidao = async (cert) => {
    try {
      const user = await base44.auth.me();
      const regra = regrasNotificacao.find(r => r.ativo) || {};
      const template = regra.template_email || {};
      
      const diasRestantes = differenceInDays(new Date(cert.data_validade), hoje);
      const dataFormatada = formatarData(cert.data_validade);
      
      const substituirPlaceholders = (texto) => {
        if (!texto) return "";
        return texto
          .replace(/{titulo}/g, cert.titulo)
          .replace(/{orgao}/g, cert.orgao_emissor)
          .replace(/{data_validade}/g, dataFormatada)
          .replace(/{dias_restantes}/g, diasRestantes)
          .replace(/{numero_certidao}/g, cert.numero_certidao || "N/A")
          .replace(/{categoria}/g, cert.categoria || "N/A");
      };

      const destinatarios = Array.isArray(regra.destinatarios_emails) && regra.destinatarios_emails.length > 0
        ? regra.destinatarios_emails[0]
        : user.email;
      
      await base44.integrations.Core.SendEmail({
        to: destinatarios,
        subject: substituirPlaceholders(template.assunto) || `Certidão: ${cert.titulo}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0B7A9E;">Certidão de Regularidade</h2>
            <div style="background: #E6F4F7; padding: 15px; border-radius: 8px; margin: 15px 0;">
              ${substituirPlaceholders(template.corpo || `
                <p><strong>Título:</strong> ${cert.titulo}</p>
                <p><strong>Órgão:</strong> ${cert.orgao_emissor}</p>
                <p><strong>Validade:</strong> ${dataFormatada}</p>
                <p><strong>Dias Restantes:</strong> ${diasRestantes}</p>
              `).replace(/\n/g, '<br>')}
            </div>
            ${cert.arquivo_url && template.incluir_anexo !== false ? `<p><a href="${cert.arquivo_url}" style="color: #0B7A9E;">📄 Baixar Certidão</a></p>` : ""}
          </div>
        `
      });
      alert("E-mail enviado com sucesso!");
    } catch (error) {
      alert("Erro ao enviar e-mail: " + error.message);
    }
  };

  const exportarExcel = () => {
    const dados = certidoesFiltradas.map(c => ({
      "Título": c.titulo,
      "Órgão": c.orgao_emissor,
      "Tipo": tiposCertidao.find(t => t.value === c.tipo_certidao)?.label || c.tipo_certidao,
      "Categoria": c.categoria,
      "Nº Certidão": c.numero_certidao || "",
      "Data Emissão": c.data_emissao ? formatarData(c.data_emissao) : "",
      "Data Validade": formatarData(c.data_validade),
      "Status": differenceInDays(new Date(c.data_validade), hoje) < 0 ? "Vencida" : "Vigente",
      "Resultado": c.resultado || ""
    }));

    // Criar CSV
    const headers = Object.keys(dados[0] || {}).join(";");
    const rows = dados.map(d => Object.values(d).join(";")).join("\n");
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dataArquivo = hoje.toISOString().split('T')[0];
    link.download = `certidoes_${dataArquivo}.csv`;
    link.click();
  };

  const downloadEmLote = () => {
    const certsComArquivo = certidoesFiltradas.filter(c => c.arquivo_url);
    certsComArquivo.forEach((cert, index) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = cert.arquivo_url;
        link.download = `${cert.titulo.replace(/\s/g, "_")}.pdf`;
        link.target = "_blank";
        link.click();
      }, index * 500);
    });
  };

  const getStatusBadge = (cert) => {
    try {
      const diasRestantes = differenceInDays(new Date(cert.data_validade), hoje);
      if (diasRestantes < 0) {
        return (
          <span className="px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap" style={{ backgroundColor: '#fde7e7', color: '#842820', fontSize: '14px' }}>
            <AlertTriangle className="w-4 h-4" />
            <span>Vencida</span>
          </span>
        );
      } else if (diasRestantes <= 30) {
        return (
          <span className="px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap" style={{ backgroundColor: '#fef9e5', color: '#956802', fontSize: '14px' }}>
            <Clock className="w-4 h-4" />
            <span>Vence em {diasRestantes}d</span>
          </span>
        );
      }
      return (
        <span className="px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap" style={{ backgroundColor: '#e6f7ed', color: '#1f6332', fontSize: '14px' }}>
          <CheckCircle className="w-4 h-4" />
          <span>Vigente</span>
        </span>
      );
    } catch {
      return <span className="px-4 py-2 rounded-xl font-bold" style={{ backgroundColor: '#f8f9fa', color: '#5f6368', fontSize: '14px' }}>N/A</span>;
    }
  };

  // Estatísticas
  const stats = useMemo(() => {
    let vigentes = 0, vencendo = 0, vencidas = 0;
    const porCategoria = {};
    (certidoes || []).forEach(cert => {
      try {
        const dias = differenceInDays(new Date(cert.data_validade), hoje);
        if (dias < 0) vencidas++;
        else if (dias <= 30) vencendo++;
        else vigentes++;
        
        const cat = cert.categoria || "federal";
        porCategoria[cat] = (porCategoria[cat] || 0) + 1;
      } catch {
        // Ignora certidões com data inválida
      }
    });
    return { vigentes, vencendo, vencidas, total: (certidoes || []).length, porCategoria };
  }, [certidoes]);

  const historicoSelecionado = useMemo(() => {
    if (!selectedCertidao) return [];
    return historico.filter(h => h.certidao_id === selectedCertidao.id || h.certidao_titulo === selectedCertidao.titulo);
  }, [historico, selectedCertidao]);

  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 overflow-x-hidden">
      
      {/* Header - Skeleton State */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="h-6 bg-gray-200 rounded w-32 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-48" />
        </div>
      ) : (
        <PageHeader
          title="Certidões"
          description="Gestão de certidões"
          breadcrumbs={[
            { label: "Administração", href: createPageUrl("Administracao") },
            { label: "Compliance - Certidões" }
          ]}
        />
      )}

      {/* Navegação - Skeleton State */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border p-4 animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-xl w-32" />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border p-4 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setVisaoAtual("dashboard")}
            className="px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] flex items-center gap-2"
            style={visaoAtual === "dashboard" ? { 
              backgroundColor: '#7E57FF',
              color: '#ffffff'
            } : {
              backgroundColor: '#f8f9fa',
              color: '#5f6368',
              border: '1px solid #e8eaed'
            }}
          >
            <Shield className="w-4 h-4" />
            <span style={{ fontSize: '14px' }}>Dashboard</span>
          </button>
          <button
            onClick={() => setVisaoAtual("certidoes")}
            className="px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] flex items-center gap-2"
            style={visaoAtual === "certidoes" ? { 
              backgroundColor: '#7E57FF',
              color: '#ffffff'
            } : {
              backgroundColor: '#f8f9fa',
              color: '#5f6368',
              border: '1px solid #e8eaed'
            }}
          >
            <FileText className="w-4 h-4" />
            <span style={{ fontSize: '14px' }}>Certidões</span>
          </button>
          <button
            onClick={() => setVisaoAtual("calendario")}
            className="px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] flex items-center gap-2"
            style={visaoAtual === "calendario" ? { 
              backgroundColor: '#7E57FF',
              color: '#ffffff'
            } : {
              backgroundColor: '#f8f9fa',
              color: '#5f6368',
              border: '1px solid #e8eaed'
            }}
          >
            <Calendar className="w-4 h-4" />
            <span style={{ fontSize: '14px' }}>Calendário</span>
          </button>
          <button
            onClick={() => setVisaoAtual("historico")}
            className="px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] flex items-center gap-2"
            style={visaoAtual === "historico" ? { 
              backgroundColor: '#7E57FF',
              color: '#ffffff'
            } : {
              backgroundColor: '#f8f9fa',
              color: '#5f6368',
              border: '1px solid #e8eaed'
            }}
          >
            <History className="w-4 h-4" />
            <span style={{ fontSize: '14px' }}>Histórico</span>
          </button>
          <button
            onClick={() => setVisaoAtual("regras")}
            className="px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] flex items-center gap-2"
            style={visaoAtual === "regras" ? { 
              backgroundColor: '#7E57FF',
              color: '#ffffff'
            } : {
              backgroundColor: '#f8f9fa',
              color: '#5f6368',
              border: '1px solid #e8eaed'
            }}
          >
            <Bell className="w-4 h-4" />
            <span style={{ fontSize: '14px' }}>Alertas</span>
          </button>
          <button
            onClick={() => setVisaoAtual("agendamentos")}
            className="px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] flex items-center gap-2"
            style={visaoAtual === "agendamentos" ? { 
              backgroundColor: '#7E57FF',
              color: '#ffffff'
            } : {
              backgroundColor: '#f8f9fa',
              color: '#5f6368',
              border: '1px solid #e8eaed'
            }}
          >
            <RefreshCw className="w-4 h-4" />
            <span style={{ fontSize: '14px' }}>Agendamentos</span>
          </button>
          <button
            onClick={() => setVisaoAtual("certificados")}
            className="px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] flex items-center gap-2"
            style={visaoAtual === "certificados" ? { 
              backgroundColor: '#7E57FF',
              color: '#ffffff'
            } : {
              backgroundColor: '#f8f9fa',
              color: '#5f6368',
              border: '1px solid #e8eaed'
            }}
          >
            <Key className="w-4 h-4" />
            <span style={{ fontSize: '14px' }}>Certificados</span>
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setVisaoAtual("permissoes")}
                className="px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] flex items-center gap-2"
                style={visaoAtual === "permissoes" ? { 
                  backgroundColor: '#7E57FF',
                  color: '#ffffff'
                } : {
                  backgroundColor: '#f8f9fa',
                  color: '#5f6368',
                  border: '1px solid #e8eaed'
                }}
              >
                <Users className="w-4 h-4" />
                <span style={{ fontSize: '14px' }}>Permissões</span>
              </button>
              <button
                onClick={() => setVisaoAtual("auditoria")}
                className="px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] flex items-center gap-2"
                style={visaoAtual === "auditoria" ? { 
                  backgroundColor: '#7E57FF',
                  color: '#ffffff'
                } : {
                  backgroundColor: '#f8f9fa',
                  color: '#5f6368',
                  border: '1px solid #e8eaed'
                }}
              >
                <Eye className="w-4 h-4" />
                <span style={{ fontSize: '14px' }}>Auditoria</span>
              </button>
              <button
                onClick={() => setVisaoAtual("suporte")}
                className="px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] flex items-center gap-2"
                style={visaoAtual === "suporte" ? { 
                  backgroundColor: '#7E57FF',
                  color: '#ffffff'
                } : {
                  backgroundColor: '#f8f9fa',
                  color: '#5f6368',
                  border: '1px solid #e8eaed'
                }}
              >
                <Settings className="w-4 h-4" />
                <span style={{ fontSize: '14px' }}>Suporte</span>
              </button>
            </>
          )}
        </div>
        </div>
      )}

      {/* === DASHBOARD === */}
      {visaoAtual === "dashboard" && (
        <DashboardCompliance 
          certidoes={certidoes} 
          agendamentos={agendamentos} 
          historico={historico} 
        />
      )}

      {/* === CALENDÁRIO === */}
      {visaoAtual === "calendario" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CalendarioVencimentos 
              certidoes={certidoes} 
              onSelectDate={(dia, certs) => {
                setDiaSelecionado(dia);
                setCertidoesDoDia(certs);
                setShowDiaPanel(true);
              }}
            />
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Legenda de Status</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Vencida</p>
                  <p className="text-xs text-red-600">Certidão já venceu</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">Urgente</p>
                  <p className="text-xs text-orange-600">Vence em até 7 dias</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">Alerta</p>
                  <p className="text-xs text-yellow-600">Vence em até 30 dias</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">OK</p>
                  <p className="text-xs text-green-600">Mais de 30 dias</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === AUDITORIA === */}
      {visaoAtual === "auditoria" && isAdmin && (
        <LogsAuditoria modulo="compliance" />
      )}

      {/* === SUPORTE === */}
      {visaoAtual === "suporte" && isAdmin && (
        <SuporteCompliance />
      )}

      {/* === CERTIDÕES === */}
      {visaoAtual === "certidoes" && (
        <>
          {/* Estatísticas - Skeleton States */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {isLoading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border p-5 animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-6 bg-gray-200 rounded w-16" />
                        <div className="h-3 bg-gray-200 rounded w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm border p-5 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                  <div className="flex items-center gap-3">
                    <FileText className="w-10 h-10" style={{ color: '#7E57FF' }} />
                    <div>
                      <p className="font-bold" style={{ color: '#202124', fontSize: '24px' }}>{stats.total}</p>
                      <p style={{ color: '#80868b', fontSize: '14px' }}>Total</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border p-5 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-10 h-10" style={{ color: '#34a853' }} />
                    <div>
                      <p className="font-bold" style={{ color: '#34a853', fontSize: '24px' }}>{stats.vigentes}</p>
                      <p style={{ color: '#80868b', fontSize: '14px' }}>Vigentes</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border p-5 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                  <div className="flex items-center gap-3">
                    <Clock className="w-10 h-10" style={{ color: '#f59e0b' }} />
                    <div>
                      <p className="font-bold" style={{ color: '#f59e0b', fontSize: '24px' }}>{stats.vencendo}</p>
                      <p style={{ color: '#80868b', fontSize: '14px' }}>Vencendo (30d)</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border p-5 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-10 h-10" style={{ color: '#ea4335' }} />
                    <div>
                      <p className="font-bold" style={{ color: '#ea4335', fontSize: '24px' }}>{stats.vencidas}</p>
                      <p style={{ color: '#80868b', fontSize: '14px' }}>Vencidas</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Por Categoria */}
          <div className="bg-white rounded-2xl shadow-sm border p-5 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            <h3 className="font-bold mb-4" style={{ color: '#202124', fontSize: '16px' }}>Por Categoria</h3>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {categorias.map(cat => (
                <div key={cat.value} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
                  <span style={{ color: '#5f6368', fontSize: '14px' }}>{cat.label}:</span>
                  <span className="font-bold" style={{ color: '#202124', fontSize: '16px' }}>{stats.porCategoria[cat.value] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filtros e Ações */}
          <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-5 overflow-x-auto" style={{ borderColor: '#e8eaed' }}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#80868b' }} />
                  <Input
                    placeholder="Buscar certidão..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10 border min-h-[48px]"
                    style={{ borderColor: '#e8eaed', fontSize: '14px' }}
                  />
                </div>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="min-w-[140px] border min-h-[48px]" style={{ borderColor: '#e8eaed', fontSize: '14px' }}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="vigente">Vigentes</SelectItem>
                    <SelectItem value="vencendo">Vencendo</SelectItem>
                    <SelectItem value="vencida">Vencidas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger className="min-w-[160px] border min-h-[48px]" style={{ borderColor: '#e8eaed', fontSize: '14px' }}>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {categorias.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={exportarExcel}
                  className="px-4 py-3 rounded-xl font-bold border transition-all min-h-[48px] flex items-center gap-2 whitespace-nowrap"
                  style={{ borderColor: '#e8eaed', color: '#5f6368', fontSize: '14px' }}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={downloadEmLote}
                  className="px-4 py-3 rounded-xl font-bold border transition-all min-h-[48px] flex items-center gap-2 whitespace-nowrap"
                  style={{ borderColor: '#e8eaed', color: '#5f6368', fontSize: '14px' }}
                >
                  <Download className="w-4 h-4" />
                  <span>Lote</span>
                </button>
                <button
                  onClick={() => setShowOrgaoPanel(true)}
                  className="px-4 py-3 rounded-xl font-bold border transition-all min-h-[48px] flex items-center gap-2 whitespace-nowrap"
                  style={{ borderColor: '#e8eaed', color: '#5f6368', fontSize: '14px' }}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Órgãos</span>
                </button>
                <button
                  onClick={() => {
                    setFormConsultaCaixa({ cnpj: "", cei: "" });
                    setShowConsultaCaixaPanel(true);
                  }}
                  className="px-4 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all min-h-[48px] flex items-center gap-2 whitespace-nowrap"
                  style={{ backgroundColor: '#34a853', fontSize: '14px' }}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>FGTS</span>
                </button>
                <button
                  onClick={() => {
                    setFormConsultaReceita({ cnpj: "", cpf: "", birthdate: "" });
                    setShowConsultaReceitaPanel(true);
                  }}
                  className="px-4 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all min-h-[48px] flex items-center gap-2 whitespace-nowrap"
                  style={{ backgroundColor: '#1a73e8', fontSize: '14px' }}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Receita</span>
                </button>
                <button
                  onClick={() => {
                    setFormConsultaTRT11({ cnpj: "", cpf: "" });
                    setShowConsultaTRT11Panel(true);
                  }}
                  className="px-4 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all min-h-[48px] flex items-center gap-2 whitespace-nowrap"
                  style={{ backgroundColor: '#9333ea', fontSize: '14px' }}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>TRT11</span>
                </button>
                <button
                  onClick={() => {
                    setFormConsultaTCU({ cnpj: "" });
                    setShowConsultaTCUPanel(true);
                  }}
                  className="px-4 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all min-h-[48px] flex items-center gap-2 whitespace-nowrap"
                  style={{ backgroundColor: '#f59e0b', fontSize: '14px' }}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>TCU</span>
                </button>
                <button
                  onClick={() => {
                    setFormConsultaPrefeitura({
                      cnpj: "",
                      cpf: "",
                      inscricao_municipal: "",
                      estado: "AM",
                      cidade: "Manaus"
                    });
                    setShowConsultaPrefeituraPanel(true);
                  }}
                  className="px-4 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all min-h-[48px] flex items-center gap-2 whitespace-nowrap"
                  style={{ backgroundColor: '#06b6d4', fontSize: '14px' }}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Prefeitura</span>
                </button>
                <button
                  onClick={() => {
                    setFormConsultaSefaz({ cnpj: "", cpf: "" });
                    setShowConsultaSefazPanel(true);
                  }}
                  className="px-4 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all min-h-[48px] flex items-center gap-2 whitespace-nowrap"
                  style={{ backgroundColor: '#14b8a6', fontSize: '14px' }}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>SEFAZ/AM</span>
                </button>
                <button
                  onClick={() => {
                    setFormConsultaTST({ cnpj: "", razao_social: "", numero_processo: "" });
                    setShowConsultaTSTPanel(true);
                  }}
                  className="px-4 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all min-h-[48px] flex items-center gap-2 whitespace-nowrap"
                  style={{ backgroundColor: '#ea4335', fontSize: '14px' }}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>TST Falência</span>
                </button>
                <button
                  onClick={() => {
                    setEditingCertidao(null);
                    setFormCertidao({
                      orgao_emissor: "", titulo: "", tipo_certidao: "", categoria: "federal",
                      numero_certidao: "", data_emissao: "", data_validade: "", status: "vigente",
                      resultado: "negativa", arquivo_url: "", observacoes: "", alerta_vencimento_dias: 30,
                      consulta_automatica: false, frequencia_consulta: "mensal", url_consulta: "",
                      requer_certificado_digital: false, tipo_certificado: "nenhum"
                    });
                    setShowPanel(true);
                  }}
                  className="px-4 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all min-h-[48px] flex items-center gap-2 whitespace-nowrap"
                  style={{ backgroundColor: '#7E57FF', fontSize: '14px' }}
                >
                  <Plus className="w-5 h-5" />
                  <span>Nova Certidão</span>
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Certidões - Skeleton States */}
          <div className="space-y-3 md:space-y-4">
            {isLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border p-6 animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-gray-200 rounded w-64" />
                        <div className="h-4 bg-gray-200 rounded w-40" />
                        <div className="flex gap-2">
                          <div className="h-6 bg-gray-200 rounded w-20" />
                          <div className="h-6 bg-gray-200 rounded w-16" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : certidoesFiltradas.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border p-12 text-center overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <Shield className="w-16 h-16 mx-auto mb-4" style={{ color: '#dadce0' }} />
                <p className="font-medium" style={{ color: '#5f6368', fontSize: '16px' }}>Nenhuma certidão encontrada</p>
              </div>
            ) : (
              certidoesFiltradas.map((cert) => (
                <div key={cert.id} className="bg-white rounded-2xl shadow-sm border p-5 md:p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                          <Shield className="w-6 h-6" style={{ color: '#7E57FF' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold truncate" style={{ color: '#202124', fontSize: '18px' }}>{cert.titulo}</h3>
                          <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>{cert.orgao_emissor}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap" style={{ backgroundColor: '#f8f9fa', color: '#5f6368', fontSize: '14px' }}>
                              {tiposCertidao.find(t => t.value === cert.tipo_certidao)?.label || cert.tipo_certidao}
                            </span>
                            <span className="px-3 py-1.5 rounded-xl font-semibold capitalize whitespace-nowrap" style={{ backgroundColor: '#f5f3ff', color: '#7E57FF', fontSize: '14px' }}>
                              {cert.categoria || "federal"}
                            </span>
                            {cert.resultado && (
                              <span className="px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap" style={{
                                backgroundColor: cert.resultado === "negativa" || cert.resultado === "nada_consta" ? '#e6f7ed' : '#fef9e5',
                                color: cert.resultado === "negativa" || cert.resultado === "nada_consta" ? '#1f6332' : '#956802',
                                fontSize: '14px'
                              }}>
                                {resultados.find(r => r.value === cert.resultado)?.label}
                              </span>
                            )}
                            {cert.consulta_automatica && (
                              <span className="px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap" style={{ backgroundColor: '#faf5ff', color: '#7e22ce', fontSize: '14px' }}>
                                <RefreshCw className="w-4 h-4" />
                                <span>Auto</span>
                              </span>
                            )}
                            {cert.requer_certificado_digital && (
                              <span className="px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap" style={{ backgroundColor: '#fef9e5', color: '#956802', fontSize: '14px' }}>
                                <Key className="w-4 h-4" />
                                <span>{cert.tipo_certificado?.toUpperCase()}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p style={{ color: '#80868b', fontSize: '14px' }}>Validade</p>
                        <p className="font-bold" style={{ color: '#202124', fontSize: '16px' }}>
                          {formatarData(cert.data_validade)}
                        </p>
                      </div>
                      {getStatusBadge(cert)}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid #e8eaed' }}>
                    {/* Análise IA */}
                    <NotificacaoInteligente certidao={cert} />
                    
                    {/* Ações */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {cert.arquivo_url && (
                        <a
                          href={cert.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2.5 rounded-xl font-bold border hover:shadow-sm transition-all min-h-[44px] flex items-center gap-1.5"
                          style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed', color: '#5f6368', fontSize: '14px' }}
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setEditingCertidao(cert);
                          setFormCertidao(cert);
                          setShowPanel(true);
                        }}
                        className="px-3 py-2.5 rounded-xl font-bold hover:shadow-sm transition-all min-h-[44px] flex items-center gap-1.5"
                        style={{ backgroundColor: '#e8f1fb', color: '#0e4082', fontSize: '14px' }}
                      >
                        <Edit className="w-4 h-4" />
                        <span>Editar</span>
                      </button>
                    <button
                      onClick={() => {
                        const dataHoje = new Date().toISOString().split('T')[0];
                        setEditingCertidao(cert);
                        setFormCertidao({ 
                          ...cert,
                          data_emissao: dataHoje,
                          data_validade: "",
                          numero_certidao: "",
                          arquivo_url: ""
                        });
                        setShowPanel(true);
                      }}
                      className="px-3 py-2.5 rounded-xl font-bold hover:shadow-sm transition-all min-h-[44px] flex items-center gap-1.5"
                      style={{ backgroundColor: '#e6f7ed', color: '#1f6332', fontSize: '14px' }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Renovar</span>
                    </button>
                    <button
                      onClick={() => enviarEmailCertidao(cert)}
                      className="px-3 py-2.5 rounded-xl font-bold hover:shadow-sm transition-all min-h-[44px] flex items-center gap-1.5"
                      style={{ backgroundColor: '#faf5ff', color: '#7e22ce', fontSize: '14px' }}
                    >
                      <Mail className="w-4 h-4" />
                      <span>E-mail</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCertidao(cert);
                        setShowHistoricoPanel(true);
                      }}
                      className="px-3 py-2.5 rounded-xl font-bold border hover:shadow-sm transition-all min-h-[44px] flex items-center gap-1.5"
                      style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed', color: '#5f6368', fontSize: '14px' }}
                    >
                      <History className="w-4 h-4" />
                      <span>Histórico</span>
                    </button>
                      <button
                        onClick={() => {
                          if (confirm("Deseja excluir esta certidão?")) {
                            deleteCertidaoMutation.mutate(cert.id);
                          }
                        }}
                        className="px-3 py-2.5 rounded-xl font-bold hover:shadow-sm transition-all min-h-[44px] flex items-center gap-1.5"
                        style={{ backgroundColor: '#fde7e7', color: '#842820', fontSize: '14px' }}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* === HISTÓRICO === */}
      {visaoAtual === "historico" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Histórico de Certidões</h2>
          <div className="space-y-3">
            {!historico || historico.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum registro no histórico</p>
            ) : (
              (historico || []).map((h) => (
                <div key={h.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      h.tipo_registro === "emissao" ? "bg-green-100" :
                      h.tipo_registro === "renovacao" ? "bg-blue-100" :
                      "bg-gray-100"
                    }`}>
                      <History className={`w-5 h-5 ${
                        h.tipo_registro === "emissao" ? "text-green-600" :
                        h.tipo_registro === "renovacao" ? "text-blue-600" :
                        "text-gray-600"
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{h.certidao_titulo}</p>
                      <p className="text-sm text-gray-600">{h.orgao_emissor}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatarData(h.created_date, "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                      h.tipo_registro === "emissao" ? "bg-green-100 text-green-700" :
                      h.tipo_registro === "renovacao" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {h.tipo_registro?.replace(/_/g, " ")}
                    </span>
                    {h.data_validade && (
                      <p className="text-xs text-gray-500 mt-1">
                        Val: {formatarData(h.data_validade)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* === REGRAS DE ALERTA === */}
      {visaoAtual === "regras" && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => {
                setFormRegra({
                  nome: "", 
                  tipo: "vencimento", 
                  prioridade: "media",
                  dias_antecedencia: 30,
                  destinatarios_emails: [], 
                  categorias_certidao: [],
                  template_email: {
                    assunto: "⚠️ Alerta: Certidão {titulo} - Vencimento em {dias_restantes} dias",
                    corpo: "A certidão {titulo} do órgão {orgao} vencerá em {dias_restantes} dias.\n\nData de Validade: {data_validade}\nNúmero: {numero_certidao}\n\nPor favor, providencie a renovação o quanto antes.",
                    incluir_anexo: true
                  },
                  ativo: true, 
                  enviar_email: true, 
                  mensagem_personalizada: ""
                });
                setShowRegraPanel(true);
              }}
              className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nova Regra
            </button>
          </div>

          <div className="space-y-4">
            {!regrasNotificacao || regrasNotificacao.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma regra de notificação cadastrada</p>
              </div>
            ) : (
              (regrasNotificacao || []).map((regra) => {
                const prioridadeCores = {
                  baixa: "bg-gray-100 text-gray-700",
                  media: "bg-[#E6F4F7] text-[#0B7A9E]",
                  alta: "bg-orange-100 text-orange-700",
                  critica: "bg-red-100 text-red-700"
                };
                return (
                  <div key={regra.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${!regra.ativo ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#E6F4F7] flex items-center justify-center">
                          <Bell className="w-5 h-5 text-[#0B7A9E]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{regra.nome}</h3>
                          <p className="text-sm text-gray-600 capitalize">{regra.tipo?.replace(/_/g, " ")}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {regra.prioridade && (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${prioridadeCores[regra.prioridade]}`}>
                                {regra.prioridade === "critica" ? "🔴" : regra.prioridade === "alta" ? "🟠" : regra.prioridade === "media" ? "🟡" : "⚪"} {regra.prioridade}
                              </span>
                            )}
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {regra.dias_antecedencia} dias antes
                            </span>
                            {regra.enviar_email && (
                              <span className="px-2 py-1 bg-[#E6F4F7] text-[#0B7A9E] rounded text-xs flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                E-mail
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-2 space-y-1">
                            {Array.isArray(regra.destinatarios_emails) ? (
                              <p>{regra.destinatarios_emails.length} destinatário(s)</p>
                            ) : (
                              <p>{regra.destinatarios_emails}</p>
                            )}
                            {regra.template_email?.assunto && (
                              <p className="text-[#0B7A9E]">✓ Template personalizado</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${regra.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {regra.ativo ? "Ativa" : "Inativa"}
                        </span>
                        <button
                          onClick={() => {
                            if (confirm("Excluir esta regra?")) {
                              deleteRegraMutation.mutate(regra.id);
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* === CERTIFICADOS DIGITAIS === */}
      {visaoAtual === "certificados" && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingCertificado(null);
                setFormCertificado({
                  nome: "", tipo: "a1", titular: "", cpf_cnpj: "",
                  autoridade_certificadora: "", data_emissao: "", data_validade: "",
                  status: "ativo", arquivo_url: "", senha_protegida: true,
                  numero_serie: "", dispositivo_a3: "nenhum", modelo_dispositivo: "",
                  uso_autorizado: [], observacoes: ""
                });
                setShowCertificadoPanel(true);
              }}
              className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Certificado
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {!certificados || certificados.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center col-span-2">
                <Key className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum certificado digital cadastrado</p>
              </div>
            ) : (
              (certificados || []).map((cert) => {
                const diasRestantes = differenceInDays(new Date(cert.data_validade), hoje);
                const isVencido = diasRestantes < 0;
                const isVencendo = diasRestantes <= 30 && diasRestantes >= 0;
                return (
                  <div key={cert.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${isVencido ? "border-red-300" : isVencendo ? "border-orange-300" : ""}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          cert.tipo === "a1" ? "bg-blue-100" : "bg-purple-100"
                        }`}>
                          {cert.tipo === "a1" ? (
                            <Key className="w-6 h-6 text-blue-600" />
                          ) : cert.dispositivo_a3 === "token" ? (
                            <Usb className="w-6 h-6 text-purple-600" />
                          ) : (
                            <CreditCard className="w-6 h-6 text-purple-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{cert.nome}</h3>
                          <p className="text-sm text-gray-600">{cert.titular}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          cert.tipo === "a1" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        }`}>
                          {cert.tipo?.toUpperCase()}
                        </span>
                        {cert.tipo === "a3" && cert.dispositivo_a3 !== "nenhum" && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs capitalize">
                            {cert.dispositivo_a3}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-600">CPF/CNPJ: {cert.cpf_cnpj}</p>
                      <p className="text-gray-600">AC: {cert.autoridade_certificadora}</p>
                      {cert.numero_serie && <p className="text-gray-600">Nº Série: {cert.numero_serie}</p>}
                      <p className="text-gray-600">
                        Validade: {formatarData(cert.data_validade)}
                        <span className={`ml-2 font-bold ${isVencido ? "text-red-600" : isVencendo ? "text-orange-600" : "text-green-600"}`}>
                          {isVencido ? "(Vencido)" : `(${diasRestantes} dias)`}
                        </span>
                      </p>
                      {cert.tipo === "a1" && cert.arquivo_url && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>Arquivo carregado</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                      {cert.tipo === "a1" && cert.arquivo_url && (
                        <a
                          href={cert.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setEditingCertificado(cert);
                          setFormCertificado({ ...cert });
                          setShowCertificadoPanel(true);
                        }}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Excluir certificado?")) {
                            deleteCertificadoMutation.mutate(cert.id);
                          }
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* === AGENDAMENTOS === */}
      {visaoAtual === "agendamentos" && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-blue-900">Agendamento de Consultas Automáticas</h3>
                <p className="text-sm text-blue-800">
                  Configure consultas automáticas para renovação de certidões. O sistema verificará periodicamente e notificará sobre vencimentos.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                setFormAgendamento({
                  certidao_id: "", certidao_titulo: "", orgao_emissor: "",
                  frequencia: "mensal", dia_semana: 1, dia_mes: 1, horario: "08:00",
                  url_consulta: "", certificado_digital_id: "", notificar_resultado: true,
                  emails_notificacao: "", ativo: true
                });
                setShowAgendamentoPanel(true);
              }}
              className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Agendamento
            </button>
          </div>

          <div className="space-y-4">
            {!agendamentos || agendamentos.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum agendamento de consulta configurado</p>
              </div>
            ) : (
              (agendamentos || []).map((ag) => (
                <div key={ag.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${!ag.ativo ? "opacity-60" : ""}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ag.ativo ? "bg-green-100" : "bg-gray-100"}`}>
                        <RefreshCw className={`w-5 h-5 ${ag.ativo ? "text-green-600" : "text-gray-500"}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{ag.certidao_titulo}</h3>
                        <p className="text-sm text-gray-600">{ag.orgao_emissor}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs capitalize">
                            {ag.frequencia}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {ag.horario}
                          </span>
                          {ag.notificar_resultado && (
                            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              Notificação
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAgendamento(ag)}
                        className={`p-2 rounded-lg ${ag.ativo ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        title={ag.ativo ? "Pausar" : "Ativar"}
                      >
                        {ag.ativo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Excluir agendamento?")) {
                            deleteAgendamentoMutation.mutate(ag.id);
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {ag.status_ultima_execucao && ag.status_ultima_execucao !== "nao_executado" && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Última execução: {ag.ultima_execucao ? formatarData(ag.ultima_execucao, "dd/MM/yyyy HH:mm") : "Nunca"}
                        <span className={`ml-2 px-2 py-0.5 rounded ${
                          ag.status_ultima_execucao === "sucesso" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {ag.status_ultima_execucao}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* === PERMISSÕES === */}
      {visaoAtual === "permissoes" && isAdmin && (
        <>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-yellow-900">Controle de Acesso Granular</h3>
                <p className="text-sm text-yellow-800">
                  Defina permissões específicas para cada usuário no módulo de Compliance. 
                  Use perfis pré-definidos ou personalize as permissões individualmente.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                setFormPermissao({
                  usuario_email: "", usuario_nome: "", perfil: "visualizador",
                  permissoes: perfisPermissao.visualizador,
                  categorias_permitidas: [], ativo: true, observacoes: ""
                });
                setShowPermissaoPanel(true);
              }}
              className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nova Permissão
            </button>
          </div>

          <div className="space-y-4">
            {!permissoes || permissoes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma permissão configurada</p>
              </div>
            ) : (
              (permissoes || []).map((perm) => (
                <div key={perm.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${!perm.ativo ? "opacity-60" : ""}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        perm.perfil === "admin" ? "bg-red-100" :
                        perm.perfil === "gestor" ? "bg-blue-100" :
                        perm.perfil === "operador" ? "bg-green-100" :
                        "bg-gray-100"
                      }`}>
                        <UserCog className={`w-5 h-5 ${
                          perm.perfil === "admin" ? "text-red-600" :
                          perm.perfil === "gestor" ? "text-blue-600" :
                          perm.perfil === "operador" ? "text-green-600" :
                          "text-gray-600"
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{perm.usuario_nome || perm.usuario_email}</h3>
                        <p className="text-sm text-gray-600">{perm.usuario_email}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                            perm.perfil === "admin" ? "bg-red-100 text-red-700" :
                            perm.perfil === "gestor" ? "bg-blue-100 text-blue-700" :
                            perm.perfil === "operador" ? "bg-green-100 text-green-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {perm.perfil}
                          </span>
                          {perm.permissoes?.gerenciar_permissoes && (
                            <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePermissao(perm)}
                        className={`p-2 rounded-lg ${perm.ativo ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        title={perm.ativo ? "Desativar" : "Ativar"}
                      >
                        {perm.ativo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Excluir permissão?")) {
                            deletePermissaoMutation.mutate(perm.id);
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Permissões ativas:</p>
                    <div className="flex flex-wrap gap-1">
                      {perm.permissoes && Object.entries(perm.permissoes).filter(([k, v]) => v).map(([key]) => (
                        <span key={key} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {key.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* === PANELS === */}

      {/* Panel Nova/Editar Certidão */}
      <SlideInPanel
        open={showPanel}
        onClose={() => setShowPanel(false)}
        title={editingCertidao ? "Editar Certidão" : "Nova Certidão"}
        maxWidth="800px"
      >
        <form onSubmit={handleSubmitCertidao} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Órgão Emissor *</label>
              <Select
                value={formCertidao.orgao_emissor}
                onValueChange={(value) => setFormCertidao({ ...formCertidao, orgao_emissor: value })}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {orgaos.map(org => (
                    <SelectItem key={org.id} value={org.nome}>
                      {org.nome} {org.sigla && `(${org.sigla})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Certidão *</label>
              <Select
                value={formCertidao.tipo_certidao}
                onValueChange={(value) => {
                  const tipo = tiposCertidao.find(t => t.value === value);
                  setFormCertidao({ ...formCertidao, tipo_certidao: value, categoria: tipo?.categoria || "federal" });
                }}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {tiposCertidao.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
              <Select
                value={formCertidao.categoria}
                onValueChange={(value) => setFormCertidao({ ...formCertidao, categoria: value })}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {categorias.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resultado</label>
              <Select
                value={formCertidao.resultado}
                onValueChange={(value) => setFormCertidao({ ...formCertidao, resultado: value })}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {resultados.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Título/Nome da Certidão *</label>
            <Input
              value={formCertidao.titulo}
              onChange={(e) => setFormCertidao({ ...formCertidao, titulo: e.target.value })}
              className="border-gray-300"
              placeholder="Ex: Certidão Negativa de Débitos Trabalhistas"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Número da Certidão</label>
            <Input
              value={formCertidao.numero_certidao}
              onChange={(e) => setFormCertidao({ ...formCertidao, numero_certidao: e.target.value })}
              className="border-gray-300"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data de Emissão</label>
              <Input
                type="date"
                value={formCertidao.data_emissao}
                onChange={(e) => {
                  setFormCertidao({ ...formCertidao, data_emissao: e.target.value });
                  if (prazoValidade) {
                    calcularDataValidade(prazoValidade);
                  }
                }}
                className="border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prazo (dias corridos)
                <span className="text-xs text-gray-500 ml-1">- opcional</span>
              </label>
              <Input
                type="number"
                placeholder="Ex: 30, 90, 180"
                value={prazoValidade}
                onChange={(e) => handlePrazoChange(e.target.value)}
                className="border-gray-300"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">Calcula automaticamente a validade</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data de Validade *</label>
              <Input
                type="date"
                value={formCertidao.data_validade}
                onChange={(e) => setFormCertidao({ ...formCertidao, data_validade: e.target.value })}
                className="border-gray-300"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Arquivo da Certidão</label>
            <UploadCertidaoAprimorado
              multiplo={false}
              onArquivosProcessados={(resultado) => {
                setFormCertidao(prev => ({
                  ...prev,
                  arquivo_url: resultado.arquivo_url,
                  ...(resultado.dados && {
                    numero_certidao: resultado.dados.numero_certidao || prev.numero_certidao,
                    orgao_emissor: resultado.dados.orgao_emissor || prev.orgao_emissor,
                    data_emissao: resultado.dados.data_emissao || prev.data_emissao,
                    data_validade: resultado.dados.data_validade || prev.data_validade,
                    titulo: resultado.dados.titulo || prev.titulo,
                    tipo_certidao: resultado.dados.tipo_certidao || prev.tipo_certidao,
                    resultado: resultado.dados.resultado || prev.resultado,
                    observacoes: resultado.dados.observacoes || prev.observacoes
                  })
                }));
              }}
            />
          </div>

          {/* Consulta Automática */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Consulta Automática
            </h4>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={formCertidao.consulta_automatica}
                onChange={(e) => setFormCertidao({ ...formCertidao, consulta_automatica: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-700">Habilitar consulta automática</label>
            </div>
            {formCertidao.consulta_automatica && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequência</label>
                  <Select
                    value={formCertidao.frequencia_consulta}
                    onValueChange={(value) => setFormCertidao({ ...formCertidao, frequencia_consulta: value })}
                  >
                    <SelectTrigger className="border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="diaria">Diária</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL de Consulta</label>
                  <Input
                    value={formCertidao.url_consulta}
                    onChange={(e) => setFormCertidao({ ...formCertidao, url_consulta: e.target.value })}
                    className="border-gray-300"
                    placeholder="https://"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Certificado Digital */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Certificado Digital
            </h4>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={formCertidao.requer_certificado_digital}
                onChange={(e) => setFormCertidao({ ...formCertidao, requer_certificado_digital: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-700">Requer certificado digital para consulta</label>
            </div>
            {formCertidao.requer_certificado_digital && (
              <Select
                value={formCertidao.tipo_certificado}
                onValueChange={(value) => setFormCertidao({ ...formCertidao, tipo_certificado: value })}
              >
                <SelectTrigger className="border-gray-300 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="a1">A1</SelectItem>
                  <SelectItem value="a3">A3</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
            <textarea
              value={formCertidao.observacoes}
              onChange={(e) => setFormCertidao({ ...formCertidao, observacoes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 resize-none"
              rows="3"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowPanel(false)} className="flex-1 border-gray-300">
              Cancelar
            </Button>
            <button
              type="submit"
              className="flex-1 bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg"
              disabled={createCertidaoMutation.isPending || updateCertidaoMutation.isPending}
            >
              {createCertidaoMutation.isPending || updateCertidaoMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </SlideInPanel>

      {/* Panel Órgãos */}
      <SlideInPanel open={showOrgaoPanel} onClose={() => setShowOrgaoPanel(false)} title="Cadastrar Órgão Emissor" maxWidth="600px">
        <form onSubmit={handleSubmitOrgao} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Órgão *</label>
              <Input value={formOrgao.nome} onChange={(e) => setFormOrgao({ ...formOrgao, nome: e.target.value })} className="border-gray-300" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sigla</label>
              <Input value={formOrgao.sigla} onChange={(e) => setFormOrgao({ ...formOrgao, sigla: e.target.value })} className="border-gray-300" />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Esfera *</label>
              <Select value={formOrgao.tipo} onValueChange={(value) => setFormOrgao({ ...formOrgao, tipo: value })}>
                <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="federal">Federal</SelectItem>
                  <SelectItem value="estadual">Estadual</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <Input value={formOrgao.estado} onChange={(e) => setFormOrgao({ ...formOrgao, estado: e.target.value })} className="border-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
              <Input value={formOrgao.cidade} onChange={(e) => setFormOrgao({ ...formOrgao, cidade: e.target.value })} className="border-gray-300" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
            <Input value={formOrgao.site} onChange={(e) => setFormOrgao({ ...formOrgao, site: e.target.value })} className="border-gray-300" placeholder="https://" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowOrgaoPanel(false)} className="flex-1 border-gray-300">Cancelar</Button>
            <button type="submit" className="flex-1 bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg" disabled={createOrgaoMutation.isPending}>
              {createOrgaoMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">Órgãos Cadastrados</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(orgaos || []).map(org => (
              <div key={org.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{org.nome}</p>
                  <p className="text-xs text-gray-500 capitalize">{org.tipo} - {org.cidade}/{org.estado}</p>
                </div>
                {org.sigla && <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">{org.sigla}</span>}
              </div>
            ))}
          </div>
        </div>
      </SlideInPanel>

      {/* Panel Regras */}
      <SlideInPanel open={showRegraPanel} onClose={() => setShowRegraPanel(false)} title="Nova Regra de Notificação" maxWidth="700px">
        <form onSubmit={handleSubmitRegra} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Regra *</label>
            <Input value={formRegra.nome} onChange={(e) => setFormRegra({ ...formRegra, nome: e.target.value })} className="border-gray-300" required />
          </div>
          
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
              <Select value={formRegra.tipo} onValueChange={(value) => setFormRegra({ ...formRegra, tipo: value })}>
                <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="vencimento">Vencimento</SelectItem>
                  <SelectItem value="consulta_agendada">Consulta Agendada</SelectItem>
                  <SelectItem value="resultado_irregular">Resultado Irregular</SelectItem>
                  <SelectItem value="renovacao">Renovação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade *</label>
              <Select value={formRegra.prioridade} onValueChange={(value) => setFormRegra({ ...formRegra, prioridade: value })}>
                <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dias Antecedência</label>
              <Input type="number" value={formRegra.dias_antecedencia} onChange={(e) => setFormRegra({ ...formRegra, dias_antecedencia: parseInt(e.target.value) })} className="border-gray-300" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">E-mails Destinatários *</label>
            <textarea 
              value={Array.isArray(formRegra.destinatarios_emails) ? formRegra.destinatarios_emails.join(", ") : formRegra.destinatarios_emails}
              onChange={(e) => setFormRegra({ 
                ...formRegra, 
                destinatarios_emails: e.target.value.split(",").map(email => email.trim()).filter(Boolean)
              })} 
              className="w-full border border-gray-300 rounded-lg p-3 resize-none" 
              rows="2"
              placeholder="email1@exemplo.com, email2@exemplo.com, email3@exemplo.com"
              required 
            />
            <p className="text-xs text-gray-500 mt-1">Separe múltiplos e-mails com vírgula</p>
          </div>

          <div className="bg-[#E6F4F7] rounded-lg p-4 border border-[#0B7A9E]/20">
            <h4 className="font-medium text-[#0B7A9E] mb-3">📧 Template de E-mail</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assunto</label>
                <Input 
                  value={formRegra.template_email?.assunto || ""} 
                  onChange={(e) => setFormRegra({ 
                    ...formRegra, 
                    template_email: { ...formRegra.template_email, assunto: e.target.value }
                  })} 
                  className="border-gray-300"
                  placeholder="⚠️ Alerta: {titulo} - Vencimento em {dias_restantes} dias"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Corpo do E-mail</label>
                <textarea 
                  value={formRegra.template_email?.corpo || ""} 
                  onChange={(e) => setFormRegra({ 
                    ...formRegra, 
                    template_email: { ...formRegra.template_email, corpo: e.target.value }
                  })} 
                  className="w-full border border-gray-300 rounded-lg p-3 resize-none font-mono text-sm" 
                  rows="5"
                  placeholder="A certidão {titulo} do órgão {orgao} vencerá em {dias_restantes} dias..."
                />
              </div>
              <div className="bg-white rounded p-2 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Placeholders disponíveis:</p>
                <div className="flex flex-wrap gap-1">
                  {["{titulo}", "{orgao}", "{data_validade}", "{dias_restantes}", "{numero_certidao}", "{categoria}"].map(p => (
                    <code key={p} className="px-2 py-0.5 bg-gray-100 text-[#0B7A9E] rounded text-xs">{p}</code>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={formRegra.template_email?.incluir_anexo || false} 
                  onChange={(e) => setFormRegra({ 
                    ...formRegra, 
                    template_email: { ...formRegra.template_email, incluir_anexo: e.target.checked }
                  })} 
                  className="w-4 h-4" 
                />
                <span className="text-sm text-gray-700">Incluir certidão como anexo</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formRegra.enviar_email} onChange={(e) => setFormRegra({ ...formRegra, enviar_email: e.target.checked })} className="w-4 h-4" />
              <span className="text-sm text-gray-700">Enviar e-mail</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formRegra.ativo} onChange={(e) => setFormRegra({ ...formRegra, ativo: e.target.checked })} className="w-4 h-4" />
              <span className="text-sm text-gray-700">Regra ativa</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowRegraPanel(false)} className="flex-1 border-gray-300">Cancelar</Button>
            <button type="submit" className="flex-1 bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg" disabled={createRegraMutation.isPending}>
              {createRegraMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </SlideInPanel>

      {/* Panel Certificado */}
      <SlideInPanel open={showCertificadoPanel} onClose={() => { setShowCertificadoPanel(false); setEditingCertificado(null); }} title={editingCertificado ? "Editar Certificado Digital" : "Novo Certificado Digital"} maxWidth="700px">
        <form onSubmit={handleSubmitCertificado} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome/Identificação *</label>
              <Input value={formCertificado.nome} onChange={(e) => setFormCertificado({ ...formCertificado, nome: e.target.value })} className="border-gray-300" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
              <Select value={formCertificado.tipo} onValueChange={(value) => setFormCertificado({ ...formCertificado, tipo: value, dispositivo_a3: value === "a1" ? "nenhum" : formCertificado.dispositivo_a3 })}>
                <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="a1">A1 (Arquivo)</SelectItem>
                  <SelectItem value="a3">A3 (Token/Smartcard)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Titular *</label>
            <Input value={formCertificado.titular} onChange={(e) => setFormCertificado({ ...formCertificado, titular: e.target.value })} className="border-gray-300" required />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CPF/CNPJ</label>
              <Input value={formCertificado.cpf_cnpj} onChange={(e) => setFormCertificado({ ...formCertificado, cpf_cnpj: e.target.value })} className="border-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nº de Série</label>
              <Input value={formCertificado.numero_serie} onChange={(e) => setFormCertificado({ ...formCertificado, numero_serie: e.target.value })} className="border-gray-300" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Autoridade Certificadora</label>
            <Input value={formCertificado.autoridade_certificadora} onChange={(e) => setFormCertificado({ ...formCertificado, autoridade_certificadora: e.target.value })} className="border-gray-300" placeholder="Ex: SERPRO, Certisign, Valid" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Emissão</label>
              <Input type="date" value={formCertificado.data_emissao} onChange={(e) => setFormCertificado({ ...formCertificado, data_emissao: e.target.value })} className="border-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Validade *</label>
              <Input type="date" value={formCertificado.data_validade} onChange={(e) => setFormCertificado({ ...formCertificado, data_validade: e.target.value })} className="border-gray-300" required />
            </div>
          </div>

          {/* Configurações específicas por tipo */}
          {formCertificado.tipo === "a1" && (
            <>
              <UploadCertificadoDigital
                onCertificadoLido={(cert) => {
                  setFormCertificado({
                    ...formCertificado,
                    nome: cert.nome,
                    titular: cert.titular,
                    cpf_cnpj: cert.cnpj_cpf,
                    numero_serie: cert.numero_serie,
                    autoridade_certificadora: cert.autoridade_certificadora,
                    data_emissao: cert.data_emissao,
                    data_validade: cert.data_validade,
                    arquivo_url: cert.arquivo_uri
                  });
                }}
              />

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Ou Upload Manual
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Arquivo do Certificado</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload(e, setFormCertificado, "arquivo_url")}
                        className="hidden"
                        id="arquivo-certificado"
                        accept=".pfx,.p12"
                      />
                      <label
                        htmlFor="arquivo-certificado"
                        className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 border border-gray-300"
                      >
                        <Upload className="w-4 h-4" />
                        Carregar .pfx
                      </label>
                      {formCertificado.arquivo_url && (
                        <span className="text-green-600 flex items-center gap-1 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Arquivo carregado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {formCertificado.tipo === "a3" && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                <Usb className="w-4 h-4" />
                Certificado A3 (Hardware)
              </h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Dispositivo</label>
                  <Select value={formCertificado.dispositivo_a3} onValueChange={(value) => setFormCertificado({ ...formCertificado, dispositivo_a3: value })}>
                    <SelectTrigger className="border-gray-300 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="token">Token USB</SelectItem>
                      <SelectItem value="smartcard">Smartcard</SelectItem>
                      <SelectItem value="hsm">HSM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Modelo do Dispositivo</label>
                  <Input value={formCertificado.modelo_dispositivo} onChange={(e) => setFormCertificado({ ...formCertificado, modelo_dispositivo: e.target.value })} className="border-gray-300 bg-white" placeholder="Ex: SafeNet 5110" />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
            <textarea value={formCertificado.observacoes} onChange={(e) => setFormCertificado({ ...formCertificado, observacoes: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 resize-none" rows="2" />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setShowCertificadoPanel(false); setEditingCertificado(null); }} className="flex-1 border-gray-300">Cancelar</Button>
            <button type="submit" className="flex-1 bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg" disabled={createCertificadoMutation.isPending || updateCertificadoMutation.isPending}>
              {createCertificadoMutation.isPending || updateCertificadoMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </SlideInPanel>

      {/* Panel Agendamento */}
      <SlideInPanel open={showAgendamentoPanel} onClose={() => setShowAgendamentoPanel(false)} title="Novo Agendamento de Consulta" maxWidth="700px">
        <form onSubmit={handleSubmitAgendamento} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Certidão *</label>
            <Select
              value={formAgendamento.certidao_id}
              onValueChange={(value) => {
                const cert = certidoes.find(c => c.id === value);
                setFormAgendamento({
                  ...formAgendamento,
                  certidao_id: value,
                  certidao_titulo: cert?.titulo || "",
                  orgao_emissor: cert?.orgao_emissor || "",
                  url_consulta: cert?.url_consulta || ""
                });
              }}
            >
              <SelectTrigger className="border-gray-300"><SelectValue placeholder="Selecione uma certidão" /></SelectTrigger>
              <SelectContent className="z-[100]">
                {(certidoes || []).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.titulo} - {c.orgao_emissor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequência *</label>
              <Select value={formAgendamento.frequencia} onValueChange={(value) => setFormAgendamento({ ...formAgendamento, frequencia: value })}>
                <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horário</label>
              <Input type="time" value={formAgendamento.horario} onChange={(e) => setFormAgendamento({ ...formAgendamento, horario: e.target.value })} className="border-gray-300" />
            </div>
          </div>

          {formAgendamento.frequencia === "semanal" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dia da Semana</label>
              <Select value={String(formAgendamento.dia_semana)} onValueChange={(value) => setFormAgendamento({ ...formAgendamento, dia_semana: parseInt(value) })}>
                <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="0">Domingo</SelectItem>
                  <SelectItem value="1">Segunda-feira</SelectItem>
                  <SelectItem value="2">Terça-feira</SelectItem>
                  <SelectItem value="3">Quarta-feira</SelectItem>
                  <SelectItem value="4">Quinta-feira</SelectItem>
                  <SelectItem value="5">Sexta-feira</SelectItem>
                  <SelectItem value="6">Sábado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {formAgendamento.frequencia === "mensal" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dia do Mês</label>
              <Input type="number" min="1" max="28" value={formAgendamento.dia_mes} onChange={(e) => setFormAgendamento({ ...formAgendamento, dia_mes: parseInt(e.target.value) })} className="border-gray-300" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">URL de Consulta</label>
            <Input value={formAgendamento.url_consulta} onChange={(e) => setFormAgendamento({ ...formAgendamento, url_consulta: e.target.value })} className="border-gray-300" placeholder="https://" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Certificado Digital</label>
            <Select value={formAgendamento.certificado_digital_id} onValueChange={(value) => setFormAgendamento({ ...formAgendamento, certificado_digital_id: value })}>
              <SelectTrigger className="border-gray-300"><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value={null}>Nenhum</SelectItem>
                {(certificados || []).filter(c => c.status === "ativo").map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome} ({c.tipo?.toUpperCase()})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notificações
            </h4>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={formAgendamento.notificar_resultado}
                onChange={(e) => setFormAgendamento({ ...formAgendamento, notificar_resultado: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-700">Notificar resultado por e-mail</label>
            </div>
            {formAgendamento.notificar_resultado && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-mails para notificação</label>
                <Input value={formAgendamento.emails_notificacao} onChange={(e) => setFormAgendamento({ ...formAgendamento, emails_notificacao: e.target.value })} className="border-gray-300" placeholder="email1@exemplo.com, email2@exemplo.com" />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowAgendamentoPanel(false)} className="flex-1 border-gray-300">Cancelar</Button>
            <button type="submit" className="flex-1 bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg" disabled={createAgendamentoMutation.isPending}>
              {createAgendamentoMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </SlideInPanel>

      {/* Panel Permissão */}
      <SlideInPanel open={showPermissaoPanel} onClose={() => setShowPermissaoPanel(false)} title="Nova Permissão de Usuário" maxWidth="700px">
        <form onSubmit={handleSubmitPermissao} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Usuário *</label>
            <Select
              value={formPermissao.usuario_email}
              onValueChange={(value) => {
                const user = usuarios.find(u => u.email === value);
                setFormPermissao({ ...formPermissao, usuario_email: value, usuario_nome: user?.full_name || "" });
              }}
            >
              <SelectTrigger className="border-gray-300"><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
              <SelectContent className="z-[100]">
                {(usuarios || []).map(u => (
                  <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Perfil de Acesso</label>
            <Select value={formPermissao.perfil} onValueChange={(value) => aplicarPerfil(value)}>
              <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="admin">Administrador (acesso total)</SelectItem>
                <SelectItem value="gestor">Gestor (gerencia tudo, exceto permissões)</SelectItem>
                <SelectItem value="operador">Operador (cria/edita, sem gerenciar)</SelectItem>
                <SelectItem value="visualizador">Visualizador (somente leitura)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Permissões Detalhadas
            </h4>
            <div className="grid sm:grid-cols-2 gap-3">
              {Object.entries(formPermissao.permissoes).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setFormPermissao({
                      ...formPermissao,
                      permissoes: { ...formPermissao.permissoes, [key]: e.target.checked }
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 capitalize">{key.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categorias Permitidas</label>
            <div className="flex flex-wrap gap-2">
              {categorias.map(cat => (
                <label key={cat.value} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    checked={formPermissao.categorias_permitidas?.includes(cat.value)}
                    onChange={(e) => {
                      const cats = formPermissao.categorias_permitidas || [];
                      setFormPermissao({
                        ...formPermissao,
                        categorias_permitidas: e.target.checked
                          ? [...cats, cat.value]
                          : cats.filter(c => c !== cat.value)
                      });
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{cat.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Deixe vazio para permitir todas as categorias</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
            <textarea value={formPermissao.observacoes} onChange={(e) => setFormPermissao({ ...formPermissao, observacoes: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 resize-none" rows="2" />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowPermissaoPanel(false)} className="flex-1 border-gray-300">Cancelar</Button>
            <button type="submit" className="flex-1 bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg" disabled={createPermissaoMutation.isPending}>
              {createPermissaoMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </SlideInPanel>

      {/* Panel Histórico Individual */}
      <SlideInPanel open={showHistoricoPanel} onClose={() => { setShowHistoricoPanel(false); setSelectedCertidao(null); }} title={`Histórico: ${selectedCertidao?.titulo || ""}`} maxWidth="600px">
        <div className="space-y-3">
          {!historicoSelecionado || historicoSelecionado.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum registro no histórico desta certidão</p>
          ) : (
            (historicoSelecionado || []).map((h) => (
              <div key={h.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="font-medium text-gray-800 capitalize">{h.tipo_registro?.replace(/_/g, " ")}</p>
                  <p className="text-sm text-gray-600">
                    {h.data_validade && `Validade: ${formatarData(h.data_validade)}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatarData(h.created_date, "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                {h.arquivo_url && (
                  <a href={h.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-[#0B7A9E] hover:underline text-sm">
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </SlideInPanel>

      {/* Panel Consulta Receita Federal */}
      <SlideInPanel
        open={showConsultaReceitaPanel}
        onClose={() => setShowConsultaReceitaPanel(false)}
        title="Consultar Certidão - Receita Federal"
        maxWidth="600px"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-blue-900 mb-1">Receita Federal / PGFN - CND Federal</h3>
                <p className="text-sm text-blue-800 mb-2">
                  Emite Certidão de Débitos Relativos a Créditos Tributários Federais e à Dívida Ativa da União.
                </p>
                <div className="space-y-1">
                  <a
                    href="https://servicos.receitafederal.gov.br/servico/certidoes/#/home/cnpj"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Nova certidão CNPJ (site)
                  </a>
                  <a
                    href="https://servicos.receitafederal.gov.br/servico/certidoes/#/home/cpf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Nova certidão CPF (site)
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ</label>
            <Input
              value={formConsultaReceita.cnpj || clinica?.cnpj || ""}
              onChange={(e) => setFormConsultaReceita({ ...formConsultaReceita, cnpj: e.target.value })}
              className="border-gray-300"
              placeholder={clinica?.cnpj || "00.000.000/0000-00"}
            />
            {clinica?.cnpj && !formConsultaReceita.cnpj && (
              <p className="text-xs text-blue-600 mt-1">✓ Usando CNPJ da clínica</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CPF (alternativa)</label>
            <Input
              value={formConsultaReceita.cpf}
              onChange={(e) => setFormConsultaReceita({ ...formConsultaReceita, cpf: e.target.value })}
              className="border-gray-300"
              placeholder="000.000.000-00"
            />
          </div>

          {formConsultaReceita.cpf && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento *</label>
              <Input
                type="date"
                value={formConsultaReceita.birthdate}
                onChange={(e) => setFormConsultaReceita({ ...formConsultaReceita, birthdate: e.target.value })}
                className="border-gray-300"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Obrigatório para consulta por CPF</p>
            </div>
          )}

          <div className="space-y-3 pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Nova:</strong> Emite uma certidão nova<br/>
                <strong>Segunda Via:</strong> Recupera certidão anterior válida
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => consultarCertidaoReceita(false)}
                disabled={consultandoReceita}
                className="flex-1 bg-[#0B7A9E] hover:bg-[#58B4D4] text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {consultandoReceita ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Emitir Nova
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => consultarCertidaoReceita(true)}
                disabled={consultandoReceita}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {consultandoReceita ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Segunda Via
                  </>
                )}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConsultaReceitaPanel(false)}
              className="w-full border-gray-300"
              disabled={consultandoReceita}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </SlideInPanel>

      {/* Panel Consulta TRT11 */}
      <SlideInPanel
        open={showConsultaTRT11Panel}
        onClose={() => setShowConsultaTRT11Panel(false)}
        title="Consultar Certidão - TRT11"
        maxWidth="600px"
      >
        <div className="space-y-4">
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-purple-900 mb-1">Tribunal / TRT11 - CEAT</h3>
                <p className="text-sm text-purple-800 mb-2">
                  Certidão Eletrônica de Ações Trabalhistas (Amazonas e Roraima)
                </p>
                <a
                  href="https://certtrab.trt11.jus.br/ceat/certidaoTrabalhista/emiteCertidao.xhtml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-700 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Obter manualmente no site do TRT11
                </a>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ</label>
            <Input
              value={formConsultaTRT11.cnpj || clinica?.cnpj || ""}
              onChange={(e) => setFormConsultaTRT11({ ...formConsultaTRT11, cnpj: e.target.value })}
              className="border-gray-300"
              placeholder={clinica?.cnpj || "00.000.000/0000-00"}
            />
            {clinica?.cnpj && !formConsultaTRT11.cnpj && (
              <p className="text-xs text-blue-600 mt-1">✓ Usando CNPJ da clínica</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CPF (alternativa)</label>
            <Input
              value={formConsultaTRT11.cpf}
              onChange={(e) => setFormConsultaTRT11({ ...formConsultaTRT11, cpf: e.target.value })}
              className="border-gray-300"
              placeholder="000.000.000-00"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              A certidão pode retornar "NADA CONSTA" ou listar processos trabalhistas em andamento.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConsultaTRT11Panel(false)}
              className="flex-1 border-gray-300"
              disabled={consultandoTRT}
            >
              Cancelar
            </Button>
            <button
              type="button"
              onClick={consultarCertidaoTRT11}
              disabled={consultandoTRT}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {consultandoTRT ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Consultar
                </>
              )}
            </button>
          </div>
        </div>
      </SlideInPanel>

      {/* Panel Consulta TCU */}
      <SlideInPanel
        open={showConsultaTCUPanel}
        onClose={() => setShowConsultaTCUPanel(false)}
        title="Consultar Certidão - TCU"
        maxWidth="600px"
      >
        <div className="space-y-4">
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-orange-900 mb-1">TCU - Consulta Consolidada PJ</h3>
                <p className="text-sm text-orange-800 mb-2">
                  Tribunal de Contas da União - Certidão consolidada para Pessoa Jurídica
                </p>
                <a
                  href="https://certidoes-apf.apps.tcu.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-700 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Obter manualmente no portal do TCU
                </a>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ *</label>
            <Input
              value={formConsultaTCU.cnpj || clinica?.cnpj || ""}
              onChange={(e) => setFormConsultaTCU({ ...formConsultaTCU, cnpj: e.target.value })}
              className="border-gray-300"
              placeholder={clinica?.cnpj || "00.000.000/0000-00"}
            />
            {clinica?.cnpj && !formConsultaTCU.cnpj && (
              <p className="text-xs text-blue-600 mt-1">✓ Usando CNPJ da clínica</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConsultaTCUPanel(false)}
              className="flex-1 border-gray-300"
              disabled={consultandoTCU}
            >
              Cancelar
            </Button>
            <button
              type="button"
              onClick={consultarCertidaoTCU}
              disabled={consultandoTCU}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {consultandoTCU ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Consultar
                </>
              )}
            </button>
          </div>
        </div>
      </SlideInPanel>

      {/* Panel Consulta Prefeitura */}
      <SlideInPanel
        open={showConsultaPrefeituraPanel}
        onClose={() => setShowConsultaPrefeituraPanel(false)}
        title="Consultar Certidão Municipal"
        maxWidth="600px"
      >
        <div className="space-y-4">
          <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-cyan-900 mb-1">Prefeitura - Certidão Negativa de Débitos</h3>
                <p className="text-sm text-cyan-800 mb-2">
                  Certidão municipal da prefeitura selecionada (atualmente suporta Manaus/AM)
                </p>
                <a
                  href="https://www.manaus.am.gov.br/servicos/certidoes/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-700 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Portal de certidões da Prefeitura de Manaus
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado *</label>
              <Input
                value={formConsultaPrefeitura.estado || clinica?.estado || ""}
                onChange={(e) => setFormConsultaPrefeitura({ ...formConsultaPrefeitura, estado: e.target.value })}
                className="border-gray-300"
                placeholder={clinica?.estado || "AM"}
                maxLength={2}
              />
              {clinica?.estado && !formConsultaPrefeitura.estado && (
                <p className="text-xs text-blue-600 mt-1">✓ Usando estado da clínica</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cidade *</label>
              <Input
                value={formConsultaPrefeitura.cidade || clinica?.cidade || ""}
                onChange={(e) => setFormConsultaPrefeitura({ ...formConsultaPrefeitura, cidade: e.target.value })}
                className="border-gray-300"
                placeholder={clinica?.cidade || "Manaus"}
              />
              {clinica?.cidade && !formConsultaPrefeitura.cidade && (
                <p className="text-xs text-blue-600 mt-1">✓ Usando cidade da clínica</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ</label>
            <Input
              value={formConsultaPrefeitura.cnpj || clinica?.cnpj || ""}
              onChange={(e) => setFormConsultaPrefeitura({ ...formConsultaPrefeitura, cnpj: e.target.value })}
              className="border-gray-300"
              placeholder={clinica?.cnpj || "00.000.000/0000-00"}
            />
            {clinica?.cnpj && !formConsultaPrefeitura.cnpj && (
              <p className="text-xs text-blue-600 mt-1">✓ Usando CNPJ da clínica</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CPF (alternativa)</label>
            <Input
              value={formConsultaPrefeitura.cpf}
              onChange={(e) => setFormConsultaPrefeitura({ ...formConsultaPrefeitura, cpf: e.target.value })}
              className="border-gray-300"
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Inscrição Municipal (opcional)</label>
            <Input
              value={formConsultaPrefeitura.inscricao_municipal}
              onChange={(e) => setFormConsultaPrefeitura({ ...formConsultaPrefeitura, inscricao_municipal: e.target.value })}
              className="border-gray-300"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConsultaPrefeituraPanel(false)}
              className="flex-1 border-gray-300"
              disabled={consultandoPrefeitura}
            >
              Cancelar
            </Button>
            <button
              type="button"
              onClick={consultarCertidaoPrefeitura}
              disabled={consultandoPrefeitura}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {consultandoPrefeitura ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Consultar
                </>
              )}
            </button>
          </div>
        </div>
      </SlideInPanel>

      {/* Panel Consulta SEFAZ/AM */}
      <SlideInPanel
        open={showConsultaSefazPanel}
        onClose={() => setShowConsultaSefazPanel(false)}
        title="Consultar Certidão - SEFAZ/AM"
        maxWidth="600px"
      >
        <div className="space-y-4">
          <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-teal-900 mb-1">SEFAZ/AM - Certidão Negativa de Débitos</h3>
                <p className="text-sm text-teal-800 mb-2">
                  Emite Certidão Negativa de Débitos na Secretaria da Fazenda do Amazonas
                </p>
                <a
                  href="http://sistemas.sefaz.am.gov.br/GAE/mnt/dividaAtiva/certidaoNegativa/emitirCertidaoNegativaNaoContPortal.do"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-teal-700 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Emitir manualmente no portal SEFAZ/AM
                </a>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ</label>
            <Input
              value={formConsultaSefaz.cnpj || clinica?.cnpj || ""}
              onChange={(e) => setFormConsultaSefaz({ ...formConsultaSefaz, cnpj: e.target.value })}
              className="border-gray-300"
              placeholder={clinica?.cnpj || "00.000.000/0000-00"}
            />
            {clinica?.cnpj && !formConsultaSefaz.cnpj && (
              <p className="text-xs text-blue-600 mt-1">✓ Usando CNPJ da clínica</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CPF (alternativa)</label>
            <Input
              value={formConsultaSefaz.cpf}
              onChange={(e) => setFormConsultaSefaz({ ...formConsultaSefaz, cpf: e.target.value })}
              className="border-gray-300"
              placeholder="000.000.000-00"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConsultaSefazPanel(false)}
              className="flex-1 border-gray-300"
              disabled={consultandoSefaz}
            >
              Cancelar
            </Button>
            <button
              type="button"
              onClick={consultarCertidaoSefaz}
              disabled={consultandoSefaz}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {consultandoSefaz ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Consultar
                </>
              )}
            </button>
          </div>
        </div>
      </SlideInPanel>

      {/* Panel Consulta Caixa FGTS */}
      <SlideInPanel
        open={showConsultaCaixaPanel}
        onClose={() => setShowConsultaCaixaPanel(false)}
        title="Consultar Certidão FGTS - Caixa"
        maxWidth="600px"
      >
        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-green-900 mb-1">Caixa / Regularidade do Empregador (FGTS)</h3>
                <p className="text-sm text-green-800 mb-2">
                  Consulta a situação de regularidade do empregador e obtém os dados do Certificado de Regularidade do FGTS (CRF).
                  O PDF será automaticamente salvo no sistema.
                </p>
                <a
                  href="https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-700 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Obter manualmente no site da Caixa
                </a>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ</label>
            <Input
              value={formConsultaCaixa.cnpj || clinica?.cnpj || ""}
              onChange={(e) => setFormConsultaCaixa({ ...formConsultaCaixa, cnpj: e.target.value })}
              className="border-gray-300"
              placeholder={clinica?.cnpj || "00.000.000/0000-00"}
            />
            {clinica?.cnpj && !formConsultaCaixa.cnpj && (
              <p className="text-xs text-blue-600 mt-1">✓ Usando CNPJ da clínica</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CEI (Opcional)</label>
            <Input
              value={formConsultaCaixa.cei}
              onChange={(e) => setFormConsultaCaixa({ ...formConsultaCaixa, cei: e.target.value })}
              className="border-gray-300"
              placeholder="Cadastro Específico do INSS"
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Custo:</strong> R$ 0,06 por consulta (será cobrado pela Infosimples)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConsultaCaixaPanel(false)}
              className="flex-1 border-gray-300"
              disabled={consultandoCaixa}
            >
              Cancelar
            </Button>
            <button
              type="button"
              onClick={consultarCertidaoCaixa}
              disabled={consultandoCaixa || (!formConsultaCaixa.cnpj && !clinica?.cnpj && !formConsultaCaixa.cei)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {consultandoCaixa ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Consultar Certidão
                </>
              )}
            </button>
          </div>
        </div>
      </SlideInPanel>

      {/* Panel Consulta TST Falência */}
      <SlideInPanel
        open={showConsultaTSTPanel}
        onClose={() => setShowConsultaTSTPanel(false)}
        title="Consultar Falências - TST"
        maxWidth="600px"
      >
        <div className="space-y-4">
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-900 mb-1">TST - Banco de Falências</h3>
                <p className="text-sm text-red-800 mb-2">
                  Consulta empresas falidas no Tribunal Superior do Trabalho
                </p>
                <a
                  href="https://bancofalencia.tst.jus.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-red-700 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Consultar manualmente no TST
                </a>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ</label>
            <Input
              value={formConsultaTST.cnpj || clinica?.cnpj || ""}
              onChange={(e) => setFormConsultaTST({ ...formConsultaTST, cnpj: e.target.value })}
              className="border-gray-300"
              placeholder={clinica?.cnpj || "00.000.000/0000-00"}
            />
            {clinica?.cnpj && !formConsultaTST.cnpj && (
              <p className="text-xs text-blue-600 mt-1">✓ Usando CNPJ da clínica</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Razão Social (alternativa)</label>
            <Input
              value={formConsultaTST.razao_social || clinica?.razao_social || ""}
              onChange={(e) => setFormConsultaTST({ ...formConsultaTST, razao_social: e.target.value })}
              className="border-gray-300"
              placeholder="Nome da empresa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Número do Processo (alternativa)</label>
            <Input
              value={formConsultaTST.numero_processo}
              onChange={(e) => setFormConsultaTST({ ...formConsultaTST, numero_processo: e.target.value })}
              className="border-gray-300"
              placeholder="0000000-00.0000.0.00.0000"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              Informe ao menos um dos parâmetros acima para realizar a consulta.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConsultaTSTPanel(false)}
              className="flex-1 border-gray-300"
              disabled={consultandoTST}
            >
              Cancelar
            </Button>
            <button
              type="button"
              onClick={consultarCertidaoTST}
              disabled={consultandoTST}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {consultandoTST ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Consultar
                </>
              )}
            </button>
          </div>
        </div>
      </SlideInPanel>

      {/* Panel Certidões do Dia (Calendário) */}
      <SlideInPanel 
        open={showDiaPanel} 
        onClose={() => { setShowDiaPanel(false); setCertidoesDoDia([]); setDiaSelecionado(null); }} 
        title={diaSelecionado ? `Vencimentos em ${formatarData(diaSelecionado)}` : "Vencimentos"} 
        maxWidth="600px"
      >
        <div className="space-y-3">
          {!certidoesDoDia || certidoesDoDia.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma certidão vence neste dia</p>
          ) : (
            (certidoesDoDia || []).map((cert) => (
              <div key={cert.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">{cert.titulo}</h4>
                    <p className="text-sm text-gray-600">{cert.orgao_emissor}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize">
                        {cert.categoria}
                      </span>
                      {cert.resultado && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          cert.resultado === "negativa" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {resultados.find(r => r.value === cert.resultado)?.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                  {cert.arquivo_url && (
                    <a href={cert.arquivo_url} target="_blank" rel="noopener noreferrer" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setShowDiaPanel(false);
                      setEditingCertidao(cert);
                      setFormCertidao({ ...cert });
                      setShowPanel(true);
                    }}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Renovar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </SlideInPanel>
      </div>
    </RouteGuard>
  );
}