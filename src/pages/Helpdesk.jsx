import React, { useState, useMemo, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { secureEntities } from "@/components/security/SecureEntityWrapper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { toast } from "sonner";
import { useAtendimentoData } from "@/components/hooks/useAtendimentoData";
import { useClinicaContext } from "@/components/atendimento/useClinicaContext";
import PermissionGuard from "@/components/auth/PermissionGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useUserTimezone } from "@/components/hooks/useUserTimezone";
import AlertaSenderNaoVerificado from "@/components/email/AlertaSenderNaoVerificado";

// CRITICAL: Lazy load heavy components + images (PageSpeed)
const EmailDebugPanel = lazy(() => import("@/components/atendimento/EmailDebugPanel"));
const GestaoTemplates = lazy(() => import("@/components/atendimento/GestaoTemplates"));
const DetectorDuplicatas = lazy(() => import("@/components/atendimento/DetectorDuplicatas"));
const DashboardMetricas = lazy(() => import("@/components/atendimento/DashboardMetricas"));
const ContatoDetalhesPanel = lazy(() => import("@/components/atendimento/ContatoDetalhesPanel"));

// CRITICAL: Lazy image component (PageSpeed - defer offscreen images)
const LazyImage = ({ src, alt, className, ...props }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const imgRef = React.useRef(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={isVisible ? src : undefined}
      alt={alt}
      loading="lazy"
      className={className}
      width={props.width}
      height={props.height}
      {...props}
    />
  );
};

// CRITICAL: Eager load above-the-fold components
import TicketListInbox from "@/components/atendimento/TicketListInbox";
import FiltrosInbox from "@/components/atendimento/FiltrosInbox";
import TicketStatsBar from "@/components/atendimento/TicketStatsBar";
import AtendimentoSearchBar from "@/components/atendimento/AtendimentoSearchBar";
import TicketListPanel from "@/components/atendimento/TicketListPanel";
import TicketChatWindow from "@/components/atendimento/TicketChatWindow";
import TicketDetailsSidebar from "@/components/atendimento/TicketDetailsSidebar";
import EmptyTicketState from "@/components/atendimento/EmptyTicketState";
import NovoTicketForm from "@/components/atendimento/NovoTicketForm";
import MobileTicketView from "@/components/atendimento/MobileTicketView";
import HeaderActions from "@/components/atendimento/HeaderActions";

// CRITICAL: Preconnect external origins (PageSpeed optimization)
const preconnectOrigins = () => {
  if (typeof document !== 'undefined') {
    const origins = ['https://base44.app', 'https://api.base44.app'];
    origins.forEach(origin => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }
};

// Memoized components for performance
const MemoizedTicketStatsBar = React.memo(TicketStatsBar);
const MemoizedAtendimentoSearchBar = React.memo(AtendimentoSearchBar);
const MemoizedTicketListPanel = React.memo(TicketListPanel);
const MemoizedTicketListInbox = React.memo(TicketListInbox);
const MemoizedFiltrosInbox = React.memo(FiltrosInbox);

export default function Helpdesk() {
  React.useEffect(() => {
    preconnectOrigins();
  }, []);

  return (
    <RouteGuard requireAuth requireClinica>
      <HelpdeskContent />
    </RouteGuard>
  );
}

function HelpdeskContent() {
  const { clinicaId, user: userContext } = useClinicaContext();
  const queryClient = useQueryClient();
  const timezone = useUserTimezone(userContext);
  const [ticketSelecionado, setTicketSelecionado] = useState(null);
  const [resposta, setResposta] = useState("");
  const [notaInterna, setNotaInterna] = useState("");
  const [tipoNota, setTipoNota] = useState("observacao");
  const [filtroStatus, setFiltroStatus] = useState("aberto,em_andamento");
  const [busca, setBusca] = useState("");
  const [buscaContato, setBuscaContato] = useState("");
  const [selecionados, setSelecionados] = useState([]);
  const [painelNovoTicket, setPainelNovoTicket] = useState(false);
  const [painelEmailDebug, setPainelEmailDebug] = useState(false);
  const [painelTemplates, setPainelTemplates] = useState(false);
  const [painelDuplicatas, setPainelDuplicatas] = useState(false);
  const [painelAnalytics, setPainelAnalytics] = useState(false);
  const [filtroAvancado, setFiltroAvancado] = useState(false);
  const [mostrarTemplates, setMostrarTemplates] = useState(false);
  const [buscaTemplate, setBuscaTemplate] = useState("");
  const [modoVisualizacao, setModoVisualizacao] = useState("helpdesk");
  const [filtroInbox, setFiltroInbox] = useState("abertos_novos");
  const [filtros, setFiltros] = useState({
    prioridade: "todas",
    categoria: "todas",
    responsavel: "todos",
    canal: "todos"
  });
  const [painelContato, setPainelContato] = useState(false);
  const [contatoDetalhes, setContatoDetalhes] = useState(null);
  const [tipoNovo, setTipoNovo] = useState("ticket");
  const [anexos, setAnexos] = useState([]);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [sugestaoIA, setSugestaoIA] = useState(null);
  const [logIAId, setLogIAId] = useState(null);
  const [form, setForm] = useState({
    tipo: "ticket",
    contato_id: "",
    assunto: "",
    solicitante_nome: "",
    solicitante_email: "",
    solicitante_telefone: "",
    canal: "email",
    prioridade: "media",
    categoria: "duvida",
    descricao: "",
    criar_novo_contato: false
  });

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: atendimentoData } = useAtendimentoData(user?.clinica_id, !!user?.clinica_id);
  
  const contatos = atendimentoData?.pacientes || [];
  const agendamentos = atendimentoData?.agendamentos || [];
  const prontuarios = atendimentoData?.prontuarios || [];
  const vendas = atendimentoData?.vendas || [];

  const { data: equipe = [] } = useQuery({
    queryKey: ["equipe", user?.clinica_id],
    queryFn: async () => {
      const todosUsuarios = await base44.entities.User.list();
      return todosUsuarios.filter(u => u.clinica_id === user.clinica_id);
    },
    enabled: !!user?.clinica_id,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets", user?.clinica_id, user?.role],
    queryFn: async () => {
      if (user?.role === 'admin' && !user?.clinica_id) {
        return await base44.entities.Ticket.list('-created_date', 100);
      }
      return await secureEntities.Ticket.filter({ clinica_id: user.clinica_id }, '-created_date', 100);
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: false
  });

  const { data: mensagens = [] } = useQuery({
    queryKey: ["mensagens-ticket", ticketSelecionado?.id],
    queryFn: async () => {
      return await base44.entities.MensagemTicket.filter({ ticket_id: ticketSelecionado.id }, 'created_date');
    },
    enabled: !!ticketSelecionado,
    staleTime: 30 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: true
  });

  const { data: statusEmails = [] } = useQuery({
    queryKey: ["status-email", ticketSelecionado?.id],
    queryFn: async () => {
      return await base44.entities.StatusEntregaEmail.filter({ ticket_id: ticketSelecionado.id }, '-created_date');
    },
    enabled: !!ticketSelecionado,
    staleTime: 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false
  });

  const { data: notasInternas = [] } = useQuery({
    queryKey: ["notas-internas", ticketSelecionado?.id],
    queryFn: async () => {
      return await base44.entities.NotaInterna.filter({ ticket_id: ticketSelecionado.id }, 'created_date');
    },
    enabled: !!ticketSelecionado,
    staleTime: 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates-resposta", user?.clinica_id],
    queryFn: async () => {
      return await base44.entities.TemplateResposta.filter({ clinica_id: user.clinica_id, ativo: true }, '-uso_count');
    },
    enabled: !!user?.clinica_id,
    staleTime: 5 * 60 * 1000
  });

  const handleSubmitNovoTicket = (data) => {
    criarTicketMutation.mutate(data);
  };

  const [anexosNovoTicket, setAnexosNovoTicket] = useState([]);
  const [formNovoTicket, setFormNovoTicket] = useState({
    tipo: "ticket",
    contato_id: "",
    assunto: "",
    solicitante_nome: "",
    solicitante_email: "",
    solicitante_telefone: "",
    canal: "email",
    prioridade: "media",
    categoria: "duvida",
    descricao: "",
    criar_novo_contato: false
  });

  const criarTicketMutation = useMutation({
    mutationFn: async (data) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emailValido = data.solicitante_email ? emailRegex.test(data.solicitante_email) : false;
      
      if (data.solicitante_email && !emailValido) {
        throw new Error('Email inválido. Verifique o formato.');
      }

      let contatoId = data.contato_id;
      
      // CRITICAL: Buscar em TODAS as entities de contato (Paciente, Contato, Medico)
      if (!contatoId && data.solicitante_email) {
        const emailLower = data.solicitante_email.toLowerCase();
        
        const contatoExistente = contatos.find(c => 
          c.emails?.some(e => e.email.toLowerCase() === emailLower) ||
          c.email?.toLowerCase() === emailLower
        );
        
        if (contatoExistente) {
          contatoId = contatoExistente.id;
        } else if (data.criar_novo_contato) {
          const novoContato = await base44.entities.Contato.create({
            clinica_id: user.clinica_id,
            nome_completo: data.solicitante_nome,
            emails: [{ email: data.solicitante_email, tipo: 'pessoal', principal: true }],
            telefones: data.solicitante_telefone ? [{ numero: data.solicitante_telefone, tipo: 'celular', principal: true }] : [],
            tipo_contato: data.tipo === 'email' ? 'lead' : 'paciente',
            status: "prospecto",
            origem_lead: "ticket"
          });
          contatoId = novoContato.id;
        }
      }

      const contato = contatoId ? contatos.find(c => c.id === contatoId) : null;

      const ano = new Date().getFullYear();
      const ticketsExistentes = await base44.entities.Ticket.filter({ clinica_id: user.clinica_id });
      const numeroSequencial = String(ticketsExistentes.length + 1).padStart(4, '0');

      const emailPrincipal = contato?.emails?.find(e => e.principal)?.email || 
                            contato?.emails?.[0]?.email || 
                            contato?.email;
      const telefonePrincipal = contato?.telefones?.find(t => t.principal)?.numero || 
                                contato?.telefones?.[0]?.numero || 
                                contato?.telefone;
      
      const ticket = await base44.entities.Ticket.create({
        clinica_id: user.clinica_id,
        numero_ticket: `#${ano}-${numeroSequencial}`,
        assunto: data.assunto,
        solicitante_nome: contato?.nome_completo || data.solicitante_nome,
        solicitante_email: emailPrincipal || data.solicitante_email,
        solicitante_telefone: telefonePrincipal || data.solicitante_telefone,
        canal: data.canal,
        prioridade: data.prioridade,
        categoria: data.categoria,
        status: "aberto",
        ultima_interacao: new Date().toISOString()
      });

      if (ticket.atribuido_a) {
        await base44.entities.Notificacao.create({
          clinica_id: user.clinica_id,
          user_id: ticket.atribuido_a,
          tipo: 'novo_ticket',
          titulo: '🎫 Novo ticket criado',
          mensagem: `${data.assunto} - atribuído a você`,
          ticket_id: ticket.id,
          link: `/Helpdesk?ticket=${ticket.id}`,
          prioridade: data.prioridade
        });
      }

      if (data.descricao) {
        const mensagem = await base44.entities.MensagemTicket.create({
          ticket_id: ticket.id,
          clinica_id: user.clinica_id,
          remetente_tipo: 'equipe',
          remetente_nome: user.full_name,
          remetente_email: user.email,
          conteudo: data.descricao,
          anexos: anexos
        });

        if (data.solicitante_email && data.tipo === 'email') {
          try {
            const responseEmail = await base44.functions.invoke('enviarEmailTicket', {
              ticket_id: ticket.id,
              tipo: 'confirmacao_criacao',
              destinatario: data.solicitante_email
            });
            
            await base44.entities.StatusEntregaEmail.create({
              ticket_id: ticket.id,
              clinica_id: user.clinica_id,
              mensagem_id: mensagem.id,
              destinatario_email: data.solicitante_email,
              assunto: `Ticket ${ticket.numero_ticket} recebido`,
              status_envio: 'enviado',
              data_envio: new Date().toISOString(),
              sendgrid_message_id: responseEmail.data.message_id,
              provedor: 'sendgrid'
            });
            
          } catch (emailError) {
            await base44.entities.StatusEntregaEmail.create({
              ticket_id: ticket.id,
              clinica_id: user.clinica_id,
              mensagem_id: mensagem.id,
              destinatario_email: data.solicitante_email,
              assunto: `Ticket ${ticket.numero_ticket} recebido`,
              status_envio: 'falha',
              data_envio: new Date().toISOString(),
              erro_descricao: emailError.message
            });
            
            throw new Error(`Ticket criado mas email falhou: ${emailError.message}`);
          }
        }
      }

      return ticket;
    },
    onSuccess: (ticket) => {
      queryClient.invalidateQueries(["tickets"]);
      queryClient.invalidateQueries(["contatos"]);
      queryClient.invalidateQueries(['notificacoes']);
      queryClient.invalidateQueries(["atendimento-data"]);
      
      // TOAST ANTES de fechar
      toast.success(`✅ ${formNovoTicket.tipo === 'email' ? 'Email enviado com sucesso' : 'Ticket criado'} - ${ticket.numero_ticket}`);
      
      // Fechar após pequeno delay para ver toast
      setTimeout(() => {
        setPainelNovoTicket(false);
        setTicketSelecionado(ticket);
        setAnexosNovoTicket([]);
        setBuscaContato("");
        setFormNovoTicket({
          tipo: "ticket",
          contato_id: "",
          assunto: "",
          solicitante_nome: "",
          solicitante_email: "",
          solicitante_telefone: "",
          canal: "email",
          prioridade: "media",
          categoria: "duvida",
          descricao: "",
          criar_novo_contato: false
        });
      }, 800);
    },
    onError: (error) => {
      toast.error(`❌ Erro: ${error.message}`);
    }
  });

  const adicionarNotaMutation = useMutation({
    mutationFn: async ({ conteudo, tipo }) => {
      return await base44.entities.NotaInterna.create({
        clinica_id: user.clinica_id,
        ticket_id: ticketSelecionado.id,
        autor_id: user.id,
        autor_nome: user.full_name,
        conteudo,
        tipo,
        visivel_apenas_equipe: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["notas-internas"]);
      setNotaInterna("");
      setTipoNota("observacao");
      toast.success("📝 Nota interna adicionada");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const usarTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      await base44.entities.TemplateResposta.update(templateId, {
        uso_count: (templates.find(t => t.id === templateId)?.uso_count || 0) + 1
      });
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["templates-resposta"]);
    }
  });

  const enviarRespostaMutation = useMutation({
    mutationFn: async ({ conteudo }) => {
      const mensagem = await base44.entities.MensagemTicket.create({
        ticket_id: ticketSelecionado.id,
        clinica_id: user.clinica_id,
        remetente_tipo: "equipe",
        remetente_id: user.id,
        remetente_nome: user.full_name,
        remetente_email: user.email,
        conteudo
      });

      const updates = { 
        status: "em_andamento",
        ultima_interacao: new Date().toISOString()
      };
      
      if (!ticketSelecionado.tempo_primeira_resposta) {
        const minutos = Math.floor((Date.now() - new Date(ticketSelecionado.created_date).getTime()) / 60000);
        updates.tempo_primeira_resposta = minutos;
      }
      
      await base44.entities.Ticket.update(ticketSelecionado.id, updates);

      const contatoSolicitante = contatos.find(c => 
        c.emails?.some(e => e.email === ticketSelecionado.solicitante_email) ||
        c.email === ticketSelecionado.solicitante_email
      );
      if (contatoSolicitante?.user_id) {
        await base44.entities.Notificacao.create({
          clinica_id: user.clinica_id,
          user_id: contatoSolicitante.user_id,
          tipo: 'resposta_ticket',
          titulo: '💬 Nova resposta no seu ticket',
          mensagem: `${user.full_name} respondeu: ${conteudo.substring(0, 80)}...`,
          ticket_id: ticketSelecionado.id,
          link: `/PortalCliente?ticket=${ticketSelecionado.id}`,
          prioridade: 'media'
        });
      }

      if (ticketSelecionado.solicitante_email) {
        try {
          // Salvar resposta como mensagem IA antes de enviar email
          await base44.entities.MensagemTicket.create({
            ticket_id: ticketSelecionado.id,
            clinica_id: user.clinica_id,
            remetente_tipo: 'sistema_ia',
            remetente_nome: 'Sistema',
            conteudo: conteudo
          });

          const responseEmail = await base44.functions.invoke('enviarEmailTicket', {
            ticket_id: ticketSelecionado.id,
            tipo: 'resposta_ia',
            destinatario: ticketSelecionado.solicitante_email
          });
          
          await base44.entities.StatusEntregaEmail.create({
            ticket_id: ticketSelecionado.id,
            clinica_id: user.clinica_id,
            mensagem_id: mensagem.id,
            destinatario_email: ticketSelecionado.solicitante_email,
            assunto: `Re: ${ticketSelecionado.assunto}`,
            status_envio: 'enviado',
            data_envio: new Date().toISOString(),
            sendgrid_message_id: responseEmail.data.message_id,
            provedor: 'sendgrid'
          });
          
        } catch (emailError) {
          await base44.entities.StatusEntregaEmail.create({
            ticket_id: ticketSelecionado.id,
            clinica_id: user.clinica_id,
            mensagem_id: mensagem.id,
            destinatario_email: ticketSelecionado.solicitante_email,
            assunto: `Re: ${ticketSelecionado.assunto}`,
            status_envio: 'falha',
            data_envio: new Date().toISOString(),
            erro_descricao: emailError.message
          });
          
          throw new Error(`Resposta salva mas email falhou: ${emailError.message}`);
        }
      }
    },
    onSuccess: () => {
      setResposta("");
      queryClient.invalidateQueries(["mensagens-ticket"]);
      queryClient.invalidateQueries(["tickets"]);
      queryClient.invalidateQueries(["status-email"]);
      queryClient.invalidateQueries(['notificacoes']);
      toast.success("✅ Resposta enviada e email entregue");
    },
    onError: (error) => {
      toast.error(`❌ Falha no envio: ${error.message}`);
    }
  });

  const acoesEmMassaMutation = useMutation({
    mutationFn: async ({ acao, ticket_ids, dados }) => {
      if (acao === 'arquivar') {
        for (const id of ticket_ids) {
          await base44.entities.Ticket.update(id, { status: 'fechado' });
        }
      } else if (acao === 'deletar') {
        for (const id of ticket_ids) {
          await base44.entities.Ticket.delete(id);
        }
      } else if (acao === 'atribuir') {
        for (const id of ticket_ids) {
          await base44.entities.Ticket.update(id, { 
            atribuido_a: dados.atribuido_a, 
            atribuido_nome: dados.atribuido_nome 
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["tickets"]);
      setSelecionados([]);
      toast.success("✅ Ação aplicada");
    }
  });

  const statusArray = filtroStatus ? filtroStatus.split(',') : [];
  const ticketsFiltrados = useMemo(() => {
    if (!tickets || !Array.isArray(tickets)) return [];
    
    const searchTerm = typeof busca === 'string' ? busca.toLowerCase() : "";
    
    return tickets.filter(t => {
      if (modoVisualizacao === 'inbox') {
        if (filtroInbox === 'abertos_novos') {
          if (!(t.status === 'aberto' || t.status === 'em_andamento') || (t.atribuido_a && t.atribuido_a !== user?.id)) {
            return false;
          }
        } else if (filtroInbox === 'criados_por_mim') {
          if (t.created_by !== user?.email) return false;
        } else if (filtroInbox === 'nao_resolvidos') {
          if (t.status === 'resolvido' || t.status === 'fechado') return false;
        } else if (filtroInbox === 'aguardando') {
          if (t.status !== 'aguardando_cliente') return false;
        } else if (filtroInbox === 'resolvido') {
          if (t.status !== 'resolvido') return false;
        } else if (filtroInbox === 'arquivado') {
          if (t.status !== 'fechado') return false;
        }
      } else {
        const matchStatus = filtroStatus === "todos" || statusArray.includes(t?.status);
        if (!matchStatus) return false;
      }
      
      const matchBusca = !searchTerm || 
        String(t?.assunto || "").toLowerCase().includes(searchTerm) ||
        String(t?.solicitante_nome || "").toLowerCase().includes(searchTerm) ||
        String(t?.numero_ticket || "").toLowerCase().includes(searchTerm);
      
      const matchPrioridade = filtros.prioridade === "todas" || t?.prioridade === filtros.prioridade;
      const matchCategoria = filtros.categoria === "todas" || t?.categoria === filtros.categoria;
      const matchResponsavel = filtros.responsavel === "todos" || t?.atribuido_a === filtros.responsavel;
      const matchCanal = filtros.canal === "todos" || t?.canal === filtros.canal;
      
      return matchBusca && matchPrioridade && matchCategoria && matchResponsavel && matchCanal;
    });
  }, [tickets, filtroStatus, busca, filtros, modoVisualizacao, filtroInbox, user]);

  const stats = {
    abertos: tickets.filter(t => t.status === 'aberto').length,
    andamento: tickets.filter(t => t.status === 'em_andamento').length,
    resolvidos: tickets.filter(t => t.status === 'resolvido').length,
    total: tickets.length,
    meusAbertosNovos: tickets.filter(t => 
      (t.status === 'aberto' || t.status === 'em_andamento') && 
      (!t.atribuido_a || t.atribuido_a === user?.id)
    ).length,
    criadosPorMim: tickets.filter(t => t.created_by === user?.email).length,
    naoResolvidos: tickets.filter(t => t.status !== 'resolvido' && t.status !== 'fechado').length,
    aguardando: tickets.filter(t => t.status === 'aguardando_cliente').length,
    arquivados: tickets.filter(t => t.status === 'fechado').length,
    todos: tickets.length
  };

  const contatoAssociado = ticketSelecionado ? contatos.find(c => 
    c.emails?.some(e => e.email === ticketSelecionado.solicitante_email) ||
    c.email === ticketSelecionado.solicitante_email
  ) : null;
  const contatoSelecionado = form.contato_id ? contatos.find(c => c.id === form.contato_id) : null;

  return (
    <PermissionGuard modulo="atendimento">
      <div className="space-y-6">
        {user?.role === 'admin' && <AlertaSenderNaoVerificado user={user} />}
        
        <PageHeader
        title={user?.role === 'admin' ? "Helpdesk SuperAdmin" : "Helpdesk"}
        description={user?.role === 'admin' ? "Suporte ConectaClínica • Todos tickets" : "Central de tickets e suporte ao cliente"}
        breadcrumbs={user?.role === 'admin' ? [
          { label: "SuperAdmin", url: "/SuperAdmin" },
          { label: "Helpdesk" }
        ] : undefined}
        action={
          <HeaderActions
            selecionados={selecionados}
            onArquivarSelecionados={() => acoesEmMassaMutation.mutate({ acao: 'arquivar', ticket_ids: selecionados })}
            onExcluirSelecionados={() => acoesEmMassaMutation.mutate({ acao: 'deletar', ticket_ids: selecionados })}
            modoVisualizacao={modoVisualizacao}
            setModoVisualizacao={setModoVisualizacao}
            onNovoTicket={() => setPainelNovoTicket(true)}
            onAbrirTemplates={() => setPainelTemplates(true)}
            onAbrirDuplicatas={() => setPainelDuplicatas(true)}
            onAbrirAnalytics={() => setPainelAnalytics(true)}
            onAbrirEmailDebug={() => setPainelEmailDebug(true)}
          />
        }
      />

      <MemoizedTicketStatsBar 
        stats={stats} 
        filtroAtivo={filtroStatus} 
        onFiltroChange={setFiltroStatus} 
      />

      <MemoizedAtendimentoSearchBar
        busca={busca}
        setBusca={setBusca}
        filtroAvancado={filtroAvancado}
        setFiltroAvancado={setFiltroAvancado}
        filtros={filtros}
        setFiltros={setFiltros}
        equipe={equipe}
        onRefresh={() => queryClient.invalidateQueries(["tickets"])}
      />

      <div className="hidden lg:grid lg:grid-cols-12 gap-6">
        {modoVisualizacao === 'inbox' && (
          <>
            <div className="lg:col-span-2">
              <div className="sticky top-20">
                <MemoizedFiltrosInbox 
                  filtroAtivo={filtroInbox} 
                  setFiltroAtivo={setFiltroInbox} 
                  stats={stats}
                  user={user}
                />
              </div>
            </div>

            <div className="lg:col-span-10">
              <MemoizedTicketListInbox
                tickets={ticketsFiltrados}
                ticketSelecionado={ticketSelecionado}
                setTicketSelecionado={setTicketSelecionado}
                selecionados={selecionados}
                setSelecionados={setSelecionados}
                user={user}
                timezone={timezone}
              />
            </div>
          </>
        )}

        {modoVisualizacao === 'helpdesk' && (
          <>
            <MemoizedTicketListPanel
              tickets={ticketsFiltrados}
              ticketSelecionado={ticketSelecionado}
              selecionados={selecionados}
              contatos={contatos}
              onSelectTicket={setTicketSelecionado}
              onCheckTicket={(ticketId, checked) => {
                setSelecionados(checked 
                  ? [...selecionados, ticketId]
                  : selecionados.filter(id => id !== ticketId)
                );
              }}
              isSuperAdmin={user?.role === 'admin' && !user?.clinica_id}
              timezone={timezone}
            />

            {!ticketSelecionado ? (
              <div className="lg:col-span-8">
                <div className="rounded-2xl bg-white flex items-center justify-center" style={{ border: '1px solid #e8eaed', height: '600px' }}>
                  <EmptyTicketState />
                </div>
              </div>
            ) : (
              <>
                <TicketChatWindow
                  ticket={ticketSelecionado}
                  mensagens={mensagens}
                  resposta={resposta}
                  setResposta={setResposta}
                  onEnviarResposta={() => enviarRespostaMutation.mutate({ conteudo: resposta })}
                  enviando={enviarRespostaMutation.isPending}
                  sugestaoIA={sugestaoIA}
                  setSugestaoIA={setSugestaoIA}
                  logIAId={logIAId}
                  onAceitarSugestao={async (texto, logId) => {
                    setResposta(texto);
                    setSugestaoIA(null);
                    if (logId) {
                      await base44.entities.LogUsageIA.update(logId, { aceito: true, status: 'aceito' });
                    }
                    toast.success('✅ Sugestão aceita');
                  }}
                  onRejeitarSugestao={async (logId) => {
                    setSugestaoIA(null);
                    if (logId) {
                      const motivo = prompt('Por que rejeitou? (opcional)');
                      await base44.entities.LogUsageIA.update(logId, { 
                        aceito: false, 
                        status: 'rejeitado',
                        motivo_rejeicao: motivo 
                      });
                    }
                    toast.info('Sugestão rejeitada');
                  }}
                  onPedirSugestaoIA={async () => {
                    toast.loading('Consultando IA...');
                    try {
                      const resp = await base44.functions.invoke('processarTicketComIA', {
                        ticket_id: ticketSelecionado.id,
                        modo: 'sugestao'
                      });
                      toast.dismiss();
                      if (resp.data.success) {
                        setSugestaoIA(resp.data.resposta);
                        setLogIAId(resp.data.log_id);
                        toast.success('✨ Sugestão IA gerada');
                      }
                    } catch (error) {
                      toast.dismiss();
                      toast.error('IA indisponível');
                    }
                  }}
                  mostrarTemplates={mostrarTemplates}
                  setMostrarTemplates={setMostrarTemplates}
                  buscaTemplate={buscaTemplate}
                  setBuscaTemplate={setBuscaTemplate}
                  templates={templates}
                  onUsarTemplate={(template) => {
                    setResposta(template.conteudo);
                    setMostrarTemplates(false);
                    setBuscaTemplate("");
                    usarTemplateMutation.mutate(template.id);
                  }}
                  onAbrirTemplates={() => setPainelTemplates(true)}
                  user={user}
                  onAtualizarTickets={() => queryClient.invalidateQueries(["tickets"])}
                  timezone={timezone}
                />

                <TicketDetailsSidebar
                  ticket={ticketSelecionado}
                  contato={contatoAssociado}
                  equipe={equipe}
                  notasInternas={notasInternas}
                  statusEmails={statusEmails}
                  mensagens={mensagens}
                  notaInterna={notaInterna}
                  setNotaInterna={setNotaInterna}
                  tipoNota={tipoNota}
                  setTipoNota={setTipoNota}
                  timezone={timezone}
                  onStatusChange={async (v) => {
                    const updates = { status: v };
                    if ((v === 'resolvido' || v === 'fechado') && !ticketSelecionado.tempo_resolucao) {
                      const minutosResolucao = Math.floor(
                        (Date.now() - new Date(ticketSelecionado.created_date).getTime()) / 60000
                      );
                      updates.tempo_resolucao = minutosResolucao;
                      updates.data_fechamento = new Date().toISOString();
                    }
                    await base44.entities.Ticket.update(ticketSelecionado.id, updates);
                    setTicketSelecionado({ ...ticketSelecionado, ...updates });
                    queryClient.invalidateQueries(["tickets"]);
                    if (updates.tempo_resolucao) {
                      toast.success(`✅ Resolvido em ${Math.round(updates.tempo_resolucao / 60)}h`);
                    }
                  }}
                  onPrioridadeChange={(v) => {
                    base44.entities.Ticket.update(ticketSelecionado.id, { prioridade: v });
                    setTicketSelecionado({ ...ticketSelecionado, prioridade: v });
                    queryClient.invalidateQueries(["tickets"]);
                  }}
                  onResponsavelChange={(v) => {
                    if (v === "ninguem") {
                      base44.entities.Ticket.update(ticketSelecionado.id, { atribuido_a: null, atribuido_nome: null });
                      setTicketSelecionado({ ...ticketSelecionado, atribuido_a: null, atribuido_nome: null });
                    } else {
                      const membro = equipe.find(e => e.id === v);
                      base44.entities.Ticket.update(ticketSelecionado.id, { 
                        atribuido_a: v, 
                        atribuido_nome: membro?.full_name 
                      });
                      setTicketSelecionado({ ...ticketSelecionado, atribuido_a: v, atribuido_nome: membro?.full_name });
                    }
                    queryClient.invalidateQueries(["tickets"]);
                  }}
                  onAdicionarNota={() => adicionarNotaMutation.mutate({ conteudo: notaInterna, tipo: tipoNota })}
                  onAbrirContato={() => {
                    setContatoDetalhes(contatoAssociado);
                    setPainelContato(true);
                  }}
                  adicionandoNota={adicionarNotaMutation.isPending}
                />
              </>
            )}
          </>
        )}
      </div>

      <MobileTicketView
        ticketSelecionado={ticketSelecionado}
        setTicketSelecionado={setTicketSelecionado}
        ticketsFiltrados={ticketsFiltrados}
        selecionados={selecionados}
        setSelecionados={setSelecionados}
        mensagens={mensagens}
        resposta={resposta}
        setResposta={setResposta}
        onEnviarResposta={() => enviarRespostaMutation.mutate({ conteudo: resposta })}
        enviando={enviarRespostaMutation.isPending}
        notasInternas={notasInternas}
        notaInterna={notaInterna}
        setNotaInterna={setNotaInterna}
        tipoNota={tipoNota}
        setTipoNota={setTipoNota}
        onAdicionarNota={() => adicionarNotaMutation.mutate({ conteudo: notaInterna, tipo: tipoNota })}
        adicionandoNota={adicionarNotaMutation.isPending}
        user={user}
        timezone={timezone}
      />

      {/* CRITICAL: Lazy load SlideInPanels (below fold) */}
      <SlideInPanel
        open={painelContato}
        onClose={() => {
          setPainelContato(false);
          setContatoDetalhes(null);
        }}
        title="Detalhes do Contato"
      >
        <Suspense fallback={<LoadingSpinner />}>
          <ContatoDetalhesPanel contato={contatoDetalhes} />
        </Suspense>
      </SlideInPanel>

      <SlideInPanel
        open={painelEmailDebug}
        onClose={() => setPainelEmailDebug(false)}
        title="Debug de Entregas de Email"
      >
        <Suspense fallback={<LoadingSpinner />}>
          <EmailDebugPanel />
        </Suspense>
      </SlideInPanel>

      <SlideInPanel
        open={painelTemplates}
        onClose={() => setPainelTemplates(false)}
        title="Templates de Resposta"
      >
        <Suspense fallback={<LoadingSpinner />}>
          <GestaoTemplates clinicaId={user?.clinica_id} />
        </Suspense>
      </SlideInPanel>

      <SlideInPanel
        open={painelDuplicatas}
        onClose={() => setPainelDuplicatas(false)}
        title="Tickets Duplicados"
      >
        <Suspense fallback={<LoadingSpinner />}>
          <DetectorDuplicatas 
            clinicaId={user?.clinica_id} 
            onMergeSuccess={() => {
              setPainelDuplicatas(false);
              queryClient.invalidateQueries(["tickets"]);
            }} 
          />
        </Suspense>
      </SlideInPanel>

      <SlideInPanel
        open={painelAnalytics}
        onClose={() => setPainelAnalytics(false)}
        title="Analytics & Métricas"
      >
        <Suspense fallback={<LoadingSpinner />}>
          <DashboardMetricas clinicaId={user?.clinica_id} />
        </Suspense>
      </SlideInPanel>

      <SlideInPanel
        open={painelNovoTicket}
        onClose={() => setPainelNovoTicket(false)}
        title="Novo Atendimento"
      >
        <NovoTicketForm
          form={formNovoTicket}
          setForm={setFormNovoTicket}
          contatos={contatos}
          anexos={anexosNovoTicket}
          setAnexos={setAnexosNovoTicket}
          onSubmit={handleSubmitNovoTicket}
          onCancel={() => setPainelNovoTicket(false)}
          isLoading={criarTicketMutation.isPending}
        />
      </SlideInPanel>
      </div>
    </PermissionGuard>
  );
}