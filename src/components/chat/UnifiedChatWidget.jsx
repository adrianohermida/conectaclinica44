import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, X, Send, ChevronLeft, Paperclip, Users, User, Headphones, Search, FileText, Image as ImageIcon, Bot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import SuporteIATab from "./SuporteIATab";

export default function UnifiedChatWidget({ userType = "staff", contatoId = null, autoOpen = false }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(autoOpen);
  const [view, setView] = useState("lista");
  const [tab, setTab] = useState("equipe");
  const [conversaAtiva, setConversaAtiva] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [busca, setBusca] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imagemPreview, setImagemPreview] = useState(null);
  const [anexoSelecionado, setAnexoSelecionado] = useState(null);
  const [conversaTemporaria, setConversaTemporaria] = useState([]);
  const [mostrarBotaoConverter, setMostrarBotaoConverter] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me(),
  });

  // Buscar dados do contato se contatoId fornecido
  const { data: contato } = useQuery({
    queryKey: ["contato-widget", contatoId],
    queryFn: async () => {
      if (!contatoId) return null;
      return await base44.entities.Contato.get(contatoId);
    },
    enabled: !!contatoId && !!user,
    staleTime: 5 * 60 * 1000
  });

  // Auto-abrir conversa com paciente
  useEffect(() => {
    if (contatoId && contato && user && !conversaAtiva) {
      setConversaAtiva({
        id: null, // Sem ticket ainda - conversa temporária
        paciente_id: contatoId,
        nome: contato.nome_completo,
        email: contato.email,
        assunto: `Atendimento ${contato.nome_completo}`,
        tipo: 'paciente',
        temporaria: true
      });
      setView("chat");
      setMostrarBotaoConverter(true);
    }
  }, [contatoId, contato, user]);

  const { data: config } = useQuery({
    queryKey: ["widget-config", user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return null;
      const configs = await base44.entities.ConfiguracaoWidget.filter({ clinica_id: user.clinica_id });
      return configs.length > 0 ? configs[0] : null;
    },
    enabled: !!user?.clinica_id,
    staleTime: 5 * 60 * 1000
  });

  const { data: planoClinica } = useQuery({
    queryKey: ["plano-clinica", user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return null;
      const assinaturas = await base44.entities.AssinaturaClinica.filter({ clinica_id: user.clinica_id });
      if (assinaturas.length === 0) return null;
      const planos = await base44.entities.PlanoModulo.list();
      return planos.find(p => p.nome.toLowerCase() === assinaturas[0].plano_slug);
    },
    enabled: !!user?.clinica_id && userType === "staff"
  });

  const { data: equipe = [] } = useQuery({
    queryKey: ["equipe", user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return [];
      
      // CRÍTICO: Usar backend function (User entity bloqueia list entre users)
      const response = await base44.functions.invoke('listarEquipeClinica', { clinica_id: user.clinica_id });
      // Filtrar: remover user atual + remover role:admin (Admin Plataforma não aparece em Equipe)
      const equipeReal = (response.data?.equipe || []).filter(u => 
        u.id !== user.id && u.role !== 'admin'
      );
      
      // Adicionar Secretária IA se plano permite
      if (planoClinica?.modulos_inclusos?.includes('ia') || planoClinica?.modulos_inclusos?.includes('*')) {
        equipeReal.push({
          id: 'secretaria_ia',
          full_name: '🤖 Secretária IA',
          email: 'secretaria@ia.conectaclinica.com.br',
          avatar_url: null,
          status_online: true,
          tipo_especial: 'agente_ia'
        });
      }
      
      return equipeReal;
    },
    enabled: !!user?.clinica_id && open && userType === "staff",
    refetchInterval: 30000
  });

  const { data: pacientes = [] } = useQuery({
    queryKey: ["pacientes-widget", user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return [];
      // CRÍTICO: Multi-tenant - filtrar por clinica_id
      const todosPacientes = await base44.entities.Paciente.list();
      return todosPacientes.filter(p => p.clinica_id === user.clinica_id && p.status === 'ativo');
    },
    enabled: !!user?.clinica_id && open && userType === "staff",
  });

  const { data: conversasEquipe = [] } = useQuery({
    queryKey: ["conversas-equipe", user?.id],
    queryFn: async () => {
      if (!user?.id || !user?.clinica_id) return [];
      
      const todasMsgs = await base44.entities.MensagemInterna.filter({ 
        clinica_id: user.clinica_id,
        tipo_conversa: 'equipe_equipe'
      }, '-created_date');
      
      const minhasMsgs = todasMsgs.filter(m => 
        m.remetente_id === user.id || m.destinatario_id === user.id
      );
      
      const conversasMap = new Map();
      minhasMsgs.forEach(msg => {
        const outroId = msg.remetente_id === user.id ? msg.destinatario_id : msg.remetente_id;
        if (!conversasMap.has(outroId)) {
          conversasMap.set(outroId, { mensagens: [], ultima_msg: msg });
        }
        conversasMap.get(outroId).mensagens.push(msg);
      });
      
      return Array.from(conversasMap.entries()).map(([id, data]) => ({
        usuario_id: id,
        usuario_nome: data.ultima_msg.remetente_id === id ? data.ultima_msg.remetente_nome : data.ultima_msg.destinatario_nome,
        mensagens: data.mensagens,
        ultima_msg: data.ultima_msg,
        nao_lidas: data.mensagens.filter(m => !m.lida && m.destinatario_id === user.id).length
      }));
    },
    enabled: !!user?.id && open && userType === "staff" && tab === "equipe",
    refetchInterval: 5000
  });

  const { data: conversasPacientes = [] } = useQuery({
    queryKey: ["conversas-pacientes", user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return [];
      const allTickets = await base44.entities.Ticket.filter({ clinica_id: user.clinica_id }, '-updated_date');
      
      const ticketsPacientes = allTickets.filter(t => 
        t.canal === 'portal_paciente' || t.canal === 'portal_medico' || t.canal === 'widget'
      );
      
      return ticketsPacientes.map(ticket => ({
        ticket_id: ticket.id,
        paciente_nome: ticket.solicitante_nome,
        paciente_email: ticket.solicitante_email,
        assunto: ticket.assunto,
        status: ticket.status,
        ultima_msg_data: ticket.updated_date
      }));
    },
    enabled: !!user?.clinica_id && open && userType === "staff" && tab === "pacientes",
    refetchInterval: 5000
  });

  const { data: ticketsSuporteInterno = [] } = useQuery({
    queryKey: ["tickets-suporte", user?.email, user?.clinica_id],
    queryFn: async () => {
      if (!user?.email || !user?.clinica_id) return [];
      // Buscar tickets INTERNOS da clínica (contato com Admin Plataforma)
      const allTickets = await base44.entities.Ticket.filter({ 
        clinica_id: user.clinica_id,
        canal: 'interno'
      }, '-created_date');
      // Filtrar: tickets onde user é solicitante OU há mensagens do user
      return allTickets.filter(t => 
        t.solicitante_email === user.email || 
        t.tags?.includes(`user_${user.id}`)
      );
    },
    enabled: !!user?.email && !!user?.clinica_id && open && userType === "staff" && tab === "suporte",
    refetchInterval: 10000
  });

  const { data: ticketsClinica = [] } = useQuery({
    queryKey: ["tickets-clinica", user?.email, user?.clinica_id],
    queryFn: async () => {
      if (!user?.email || !user?.clinica_id) return [];
      const allTickets = await base44.entities.Ticket.filter({ 
        solicitante_email: user.email,
        clinica_id: user.clinica_id
      }, '-created_date');
      
      return allTickets.filter(t => 
        t.canal === 'portal_paciente' || 
        t.canal === 'portal_medico' || 
        t.canal === 'portal_cliente'
      );
    },
    enabled: !!user?.email && !!user?.clinica_id && open && userType !== "staff",
    refetchInterval: 10000
  });

  const { data: mensagens = [] } = useQuery({
    queryKey: ["mensagens-ativas", conversaAtiva?.id, conversaAtiva?.tipo, user?.clinica_id],
    queryFn: async () => {
      if (!conversaAtiva || !user?.clinica_id) return [];
      
      // Conversa temporária = usar state local
      if (conversaAtiva.temporaria) {
        return conversaTemporaria;
      }
      
      if (conversaAtiva.tipo === 'equipe') {
        const todasMsgs = await base44.entities.MensagemInterna.filter({ 
          clinica_id: user.clinica_id,
          tipo_conversa: 'equipe_equipe'
        });
        const conversaMsgs = todasMsgs.filter(m =>
          (m.remetente_id === user.id && m.destinatario_id === conversaAtiva.id) ||
          (m.remetente_id === conversaAtiva.id && m.destinatario_id === user.id)
        );
        return conversaMsgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      } else if (conversaAtiva.tipo === 'paciente' || conversaAtiva.tipo === 'suporte' || conversaAtiva.tipo === 'clinica') {
        if (!conversaAtiva.id) return [];
        // CRÍTICO: Filtrar mensagens por clinica_id
        const todasMsgs = await base44.entities.MensagemTicket.filter({ ticket_id: conversaAtiva.id });
        const msgsFiltradas = todasMsgs.filter(m => m.clinica_id === user.clinica_id);
        return msgsFiltradas.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      }
      return [];
    },
    enabled: !!conversaAtiva && !!user?.clinica_id && open && !conversaAtiva.temporaria,
    refetchInterval: 5000
  });

  // Marcar mensagens como lidas quando abrir conversa
  useEffect(() => {
    if (conversaAtiva && mensagens.length > 0) {
      const marcarComoLidas = async () => {
        if (conversaAtiva.tipo === 'equipe') {
          const naoLidas = mensagens.filter(m => !m.lida && m.destinatario_id === user.id);
          for (const msg of naoLidas) {
            await base44.entities.MensagemInterna.update(msg.id, { lida: true });
          }
        }
        // Ticket já marca como lido ao abrir
      };
      marcarComoLidas();
    }
  }, [conversaAtiva, mensagens.length]);

  useEffect(() => {
    if (mensagens.length > 0) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [mensagens]);

  // Atualizar status online periodicamente
  useEffect(() => {
    if (!user?.id) return;
    
    const atualizarOnline = async () => {
      await base44.auth.updateMe({ 
        status_online: true,
        ultima_atividade: new Date().toISOString()
      });
    };
    
    atualizarOnline();
    const interval = setInterval(atualizarOnline, 60000); // 1min
    
    return () => {
      clearInterval(interval);
      base44.auth.updateMe({ status_online: false }).catch(() => {});
    };
  }, [user?.id]);

  const enviarEquipeMutation = useMutation({
    mutationFn: async (data) => {
      console.log('📤 Enviando mensagem equipe:', data);
      return await base44.entities.MensagemInterna.create(data);
    },
    onSuccess: () => {
      console.log('✅ Mensagem equipe enviada');
      setMensagem("");
      setImagemPreview(null);
      setAnexoSelecionado(null);
      queryClient.invalidateQueries(["mensagens-ativas"]);
      queryClient.invalidateQueries(["conversas-equipe"]);
      toast.success("Mensagem enviada");
    },
    onError: (error) => {
      console.error('❌ Erro enviar equipe:', error);
      toast.error("Erro ao enviar: " + error.message);
    }
  });

  const enviarTicketMutation = useMutation({
    mutationFn: async (payload) => {
      console.log('📤 Enviando mensagem ticket:', payload);
      
      if (!conversaAtiva.id) {
        // Criar ticket novo
        const ano = new Date().getFullYear();
        const ticketsExistentes = await base44.entities.Ticket.filter({ clinica_id: user.clinica_id });
        const numeroSequencial = String(ticketsExistentes.length + 1).padStart(4, '0');

        const ticket = await base44.entities.Ticket.create({
          clinica_id: user.clinica_id,
          numero_ticket: `#${ano}-${numeroSequencial}`,
          assunto: payload.assunto || 'Atendimento',
          status: 'aberto',
          prioridade: 'media',
          canal: payload.canal,
          solicitante_nome: payload.nome,
          solicitante_email: payload.email,
          categoria: 'duvida',
          paciente_id: conversaAtiva.paciente_id || null
        });

        const msg = await base44.entities.MensagemTicket.create({
          ticket_id: ticket.id,
          clinica_id: user.clinica_id,
          remetente_tipo: 'cliente',
          remetente_nome: payload.nome,
          remetente_email: payload.email,
          conteudo: payload.conteudo,
          anexos: payload.anexo_url ? [{ url: payload.anexo_url, nome: 'Anexo', tipo: payload.anexo_tipo }] : []
        });

        // ROTEAMENTO INTELIGENTE: IA primeiro
        try {
          await base44.functions.invoke('roteamentoInteligente', {
            ticket_id: ticket.id,
            conteudo_inicial: payload.conteudo
          });
        } catch (e) {
          console.warn('⚠️ Roteamento falhou, ticket aguarda triagem manual');
        }

        // NOTIFICAR EQUIPE: Novo ticket criado
        try {
          await base44.functions.invoke('notificarNovoTicket', {
            ticket_id: ticket.id,
            clinica_id: user.clinica_id
          });
        } catch (e) {
          console.warn('⚠️ Notificação falhou:', e);
        }

        setConversaAtiva({ ...conversaAtiva, id: ticket.id });
        return { ticket_id: ticket.id, mensagem_id: msg.id };
      } else {
        // Adicionar mensagem ao ticket existente
        const msg = await base44.entities.MensagemTicket.create({
          ticket_id: conversaAtiva.id,
          clinica_id: user.clinica_id,
          remetente_tipo: userType === 'staff' ? 'equipe' : 'cliente',
          remetente_nome: payload.nome,
          remetente_email: payload.email,
          conteudo: payload.conteudo,
          anexos: payload.anexo_url ? [{ url: payload.anexo_url, nome: 'Anexo', tipo: payload.anexo_tipo }] : []
        });
        return { mensagem_id: msg.id };
      }
    },
    onSuccess: () => {
      console.log('✅ Mensagem ticket enviada');
      setMensagem("");
      setImagemPreview(null);
      setAnexoSelecionado(null);
      queryClient.invalidateQueries(["mensagens-ativas"]);
      queryClient.invalidateQueries(["conversas-pacientes"]);
      queryClient.invalidateQueries(["tickets-suporte"]);
      queryClient.invalidateQueries(["tickets-clinica"]);
      toast.success("Mensagem enviada");
    },
    onError: (error) => {
      console.error('❌ Erro enviar ticket:', error);
      toast.error("Erro ao enviar: " + error.message);
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const result = await base44.integrations.Core.UploadFile({ file });
      return { file_url: result.file_url, tipo: file.type };
    },
    onSuccess: ({ file_url, tipo }) => {
      setAnexoSelecionado({ url: file_url, tipo });
      
      if (tipo.startsWith('image/')) {
        setImagemPreview(file_url);
      }
      
      setUploading(false);
      toast.success("Arquivo carregado - pronto para enviar");
    },
    onError: (error) => {
      console.error('❌ Upload falhou:', error);
      toast.error("Erro ao enviar arquivo: " + error.message);
      setUploading(false);
    }
  });

  const handleEnviar = () => {
    if (!user || !conversaAtiva) {
      console.error('❌ handleEnviar: user ou conversaAtiva inválido');
      toast.error("Erro: contexto inválido");
      return;
    }

    const conteudoFinal = mensagem.trim();
    const temAnexo = !!anexoSelecionado;

    if (!conteudoFinal && !temAnexo) {
      toast.error("Digite uma mensagem ou selecione um arquivo");
      return;
    }

    console.log('📨 handleEnviar:', { conversaAtiva, conteudoFinal, temAnexo });
    
    // CONVERSA TEMPORÁRIA: adicionar ao state local
    if (conversaAtiva.temporaria) {
      const novaMensagem = {
        id: Date.now().toString(),
        remetente_tipo: 'equipe',
        remetente_nome: user.full_name || user.email,
        remetente_email: user.email,
        conteudo: conteudoFinal || '📎 Anexo',
        anexo_url: anexoSelecionado?.url || null,
        created_date: new Date().toISOString()
      };
      setConversaTemporaria([...conversaTemporaria, novaMensagem]);
      setMensagem("");
      setImagemPreview(null);
      setAnexoSelecionado(null);
      toast.success("Mensagem adicionada - converta em ticket para salvar");
      return;
    }
    
    if (conversaAtiva.tipo === 'equipe') {
      const payload = {
        clinica_id: user.clinica_id,
        remetente_id: user.id,
        remetente_nome: user.full_name || user.email,
        destinatario_id: conversaAtiva.id,
        destinatario_nome: conversaAtiva.nome,
        tipo_conversa: 'equipe_equipe',
        conteudo: conteudoFinal || '📎 Anexo',
        anexo_url: anexoSelecionado?.url || null,
        lida: false
      };
      
      console.log('📤 Mutation equipe:', payload);
      enviarEquipeMutation.mutate(payload);
    } else {
      const canal = conversaAtiva.tipo === 'suporte' ? 'interno' : 
                    conversaAtiva.tipo === 'clinica' && userType === 'medico' ? 'portal_medico' :
                    conversaAtiva.tipo === 'clinica' ? 'portal_paciente' : 'widget';
      
      const payload = {
        nome: user.full_name || user.email,
        email: user.email,
        conteudo: conteudoFinal || '📎 Anexo',
        assunto: conversaAtiva.assunto || 'Atendimento',
        canal,
        clinica_id: user.clinica_id,
        anexo_url: anexoSelecionado?.url || null,
        anexo_tipo: anexoSelecionado?.tipo || null
      };
      
      console.log('📤 Mutation ticket:', payload);
      enviarTicketMutation.mutate(payload);
    }
  };

  const converterEmTicket = useMutation({
    mutationFn: async () => {
      if (!conversaAtiva?.temporaria || conversaTemporaria.length === 0) {
        throw new Error("Nenhuma conversa para converter");
      }

      const ano = new Date().getFullYear();
      const ticketsExistentes = await base44.entities.Ticket.filter({ clinica_id: user.clinica_id });
      const numeroSequencial = String(ticketsExistentes.length + 1).padStart(4, '0');

      // Criar ticket
      const ticket = await base44.entities.Ticket.create({
        clinica_id: user.clinica_id,
        contato_id: conversaAtiva.paciente_id,
        numero_ticket: `#${ano}-${numeroSequencial}`,
        assunto: conversaAtiva.assunto || 'Atendimento',
        status: 'aberto',
        prioridade: 'media',
        canal: 'widget',
        solicitante_nome: conversaAtiva.nome,
        solicitante_email: conversaAtiva.email || contato?.email,
        categoria: 'duvida'
      });

      // Consolidar histórico com separador
      const historicoCompleto = conversaTemporaria
        .map(msg => `[${format(new Date(msg.created_date), 'dd/MM/yyyy HH:mm')}] ${msg.remetente_nome}: ${msg.conteudo}`)
        .join('\n');

      const conteudoFinal = `${historicoCompleto}\n\n------\n\nConversa convertida em ticket em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;

      // Criar mensagem com histórico
      await base44.entities.MensagemTicket.create({
        ticket_id: ticket.id,
        clinica_id: user.clinica_id,
        remetente_tipo: 'sistema',
        remetente_nome: 'Sistema',
        remetente_email: 'sistema@conectaclinica.com.br',
        conteudo: conteudoFinal
      });

      return ticket;
    },
    onSuccess: (ticket) => {
      setConversaTemporaria([]);
      setMostrarBotaoConverter(false);
      setConversaAtiva({
        ...conversaAtiva,
        id: ticket.id,
        temporaria: false
      });
      queryClient.invalidateQueries(["mensagens-ativas"]);
      queryClient.invalidateQueries(["conversas-pacientes"]);
      toast.success("Conversa convertida em ticket!");
    },
    onError: (error) => {
      toast.error("Erro ao converter: " + error.message);
    }
  });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 10MB)");
      return;
    }
    
    console.log('📎 Iniciando upload:', file.name, file.type);
    setUploading(true);
    uploadMutation.mutate(file);
  };

  const adicionarAProntuario = async (anexoUrl) => {
    if (!conversaAtiva.paciente_id) {
      toast.error("Paciente não identificado");
      return;
    }

    try {
      await base44.entities.DocumentoPaciente.create({
        clinica_id: user.clinica_id,
        paciente_id: conversaAtiva.paciente_id,
        nome: `Anexo do Chat - ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        tipo: 'exame',
        arquivo_url: anexoUrl,
        data_documento: new Date().toISOString()
      });
      toast.success("Anexo adicionado aos documentos do paciente");
    } catch (error) {
      toast.error("Erro ao adicionar ao prontuário: " + error.message);
    }
  };

  const corPrimaria = userType === "staff" ? "#7E57FF" : (config?.cor_primaria || "#0B7A9E");
  const corSecundaria = userType === "staff" ? "#f5f3ff" : (config?.cor_secundaria || "#e8f4f8");

  const naoLidasEquipe = conversasEquipe.reduce((acc, c) => acc + c.nao_lidas, 0);
  const naoLidasPacientes = conversasPacientes.filter(c => c.status !== 'resolvido' && c.status !== 'fechado').length;
  const naoLidasSuporte = ticketsSuporteInterno.filter(t => t.status !== 'resolvido' && t.status !== 'fechado').length;
  const naoLidasClinica = ticketsClinica.filter(t => t.status !== 'resolvido' && t.status !== 'fechado').length;
  const totalNaoLidas = userType === "staff" 
    ? naoLidasEquipe + naoLidasPacientes + naoLidasSuporte
    : naoLidasClinica;

  if (!user) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        style={{ backgroundColor: corPrimaria }}
        aria-label="Chat"
      >
        <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        {totalNaoLidas > 0 && (
          <span className="absolute -top-1 -left-1 min-w-[20px] h-[20px] rounded-full flex items-center justify-center text-[11px] font-bold bg-red-500 text-white">
            {totalNaoLidas > 9 ? "9+" : totalNaoLidas}
          </span>
        )}
      </button>
    );
  }

  const contatosFiltrados = {
    equipe: busca 
      ? equipe.filter(m => (m.full_name || m.email).toLowerCase().includes(busca.toLowerCase()))
      : equipe,
    pacientes: busca 
      ? pacientes.filter(p => p.nome_completo.toLowerCase().includes(busca.toLowerCase()))
      : []
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-white shadow-2xl border-t-4 w-full h-full sm:w-[420px] sm:h-[680px] sm:rounded-2xl flex flex-col"
      style={{ borderTopColor: corPrimaria }}>
      
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          {view === "chat" && (
            <button onClick={() => {
              setView("lista");
              setConversaAtiva(null);
              setImagemPreview(null);
              setAnexoSelecionado(null);
            }} className="hover:opacity-70">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <MessageSquare className="w-6 h-6" style={{ color: corPrimaria }} />
          <div>
            <p className="font-semibold text-sm">
              {view === "lista" ? "Mensagens" : conversaAtiva?.nome || "Chat"}
            </p>
            <p className="text-xs text-gray-500">
              {totalNaoLidas > 0 ? `${totalNaoLidas} não lidas` : 'Todas lidas'}
            </p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="hover:opacity-70">
          <X className="w-5 h-5" />
        </button>
      </div>

      {userType === "staff" && view === "lista" && (
        <div className="flex border-b">
          <button
            onClick={() => setTab("equipe")}
            className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${
              tab === "equipe" ? '' : 'border-transparent text-gray-500'
            }`}
            style={tab === "equipe" ? { borderColor: corPrimaria, color: corPrimaria } : {}}
          >
            <Users className="w-4 h-4 inline mr-1" />
            Equipe {naoLidasEquipe > 0 && `(${naoLidasEquipe})`}
          </button>
          <button
            onClick={() => setTab("pacientes")}
            className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${
              tab === "pacientes" ? '' : 'border-transparent text-gray-500'
            }`}
            style={tab === "pacientes" ? { borderColor: corPrimaria, color: corPrimaria } : {}}
          >
            <User className="w-4 h-4 inline mr-1" />
            Pacientes {naoLidasPacientes > 0 && `(${naoLidasPacientes})`}
          </button>
          <button
            onClick={() => setTab("suporte")}
            className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${
              tab === "suporte" ? '' : 'border-transparent text-gray-500'
            }`}
            style={tab === "suporte" ? { borderColor: corPrimaria, color: corPrimaria } : {}}
          >
            <Headphones className="w-4 h-4 inline mr-1" />
            Suporte {naoLidasSuporte > 0 && `(${naoLidasSuporte})`}
          </button>
        </div>
      )}

      {view === "lista" && (
        <div className="flex-1 overflow-y-auto">
          {userType === "staff" && (tab === "equipe" || tab === "pacientes") && (
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={tab === 'equipe' ? 'Buscar membros...' : 'Buscar pacientes...'}
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>
          )}

          <div className="p-4 space-y-3">
            {userType === "staff" && tab === "equipe" && (
              contatosFiltrados.equipe.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-600">
                    {busca ? 'Nenhum membro encontrado' : 'Nenhum membro disponível'}
                  </p>
                </div>
              ) : (
                contatosFiltrados.equipe.map(membro => {
                  const conversa = conversasEquipe.find(c => c.usuario_id === membro.id);
                  const isOnline = membro.status_online || membro.tipo_especial;
                  
                  return (
                    <div
                      key={membro.id}
                      onClick={() => {
                        setConversaAtiva({ 
                          id: membro.id, 
                          nome: membro.full_name || membro.email, 
                          tipo: 'equipe',
                          paciente_id: null
                        });
                        setView("chat");
                        setBusca("");
                      }}
                      className="p-3 rounded-xl border hover:shadow-sm cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative">
                            {membro.avatar_url ? (
                              <img src={membro.avatar_url} alt={membro.full_name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#e8f1fb] flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-bold text-[#1a73e8]">
                                  {(membro.full_name || membro.email).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                              isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{membro.full_name || membro.email}</p>
                            {conversa && (
                              <p className="text-xs text-gray-500 truncate">{conversa.ultima_msg.conteudo}</p>
                            )}
                            {membro.tipo_especial && (
                              <span className="text-xs text-purple-600">
                                {membro.tipo_especial === 'agente_ia' ? 'Agente IA' : 'Suporte Técnico'}
                              </span>
                            )}
                          </div>
                        </div>
                        {conversa && conversa.nao_lidas > 0 && (
                          <span className="ml-2 min-w-[20px] h-[20px] rounded-full flex items-center justify-center text-[10px] font-bold bg-red-500 text-white">
                            {conversa.nao_lidas}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            )}

            {userType === "staff" && tab === "pacientes" && (
              <>
                {conversasPacientes.map(conv => (
                  <div
                    key={conv.ticket_id}
                    onClick={() => {
                      setConversaAtiva({ 
                        id: conv.ticket_id, 
                        nome: conv.paciente_nome, 
                        assunto: conv.assunto,
                        tipo: 'paciente',
                        paciente_email: conv.paciente_email
                      });
                      setView("chat");
                    }}
                    className="p-3 rounded-xl border hover:shadow-sm cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-sm">{conv.paciente_nome}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        conv.status === 'aberto' ? 'bg-yellow-100 text-yellow-800' :
                        conv.status === 'resolvido' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {conv.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{conv.assunto}</p>
                  </div>
                ))}

                {busca && contatosFiltrados.pacientes.filter(p => 
                  !conversasPacientes.find(c => c.paciente_email === p.email)
                ).map(paciente => (
                  <div
                    key={paciente.id}
                    onClick={() => {
                      setConversaAtiva({ 
                        id: null,
                        paciente_id: paciente.id,
                        nome: paciente.nome_completo,
                        email: paciente.email,
                        assunto: `Atendimento ${paciente.nome_completo}`,
                        tipo: 'paciente'
                      });
                      setView("chat");
                      setBusca("");
                    }}
                    className="p-3 rounded-xl border-2 border-dashed hover:bg-gray-50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{paciente.nome_completo}</p>
                        <p className="text-xs text-purple-600">Clique para iniciar conversa</p>
                      </div>
                    </div>
                  </div>
                ))}

                {!busca && contatosFiltrados.pacientes.length === 0 && conversasPacientes.length === 0 && (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-600 mb-2">Busque um paciente</p>
                    <p className="text-xs text-gray-500">Use a busca acima para iniciar</p>
                  </div>
                )}
              </>
            )}

            {userType === "staff" && tab === "suporte" && (
              <SuporteIATab user={user} onClose={() => setOpen(false)} />
            )}

            {userType !== "staff" && (
              ticketsClinica.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-600 mb-4">Nenhuma conversa</p>
                  <button
                    onClick={async () => {
                      const ano = new Date().getFullYear();
                      const ticketsExistentes = await base44.entities.Ticket.filter({ clinica_id: user.clinica_id });
                      const numeroSequencial = String(ticketsExistentes.length + 1).padStart(4, '0');

                      const ticket = await base44.entities.Ticket.create({
                        clinica_id: user.clinica_id,
                        numero_ticket: `#${ano}-${numeroSequencial}`,
                        assunto: 'Atendimento',
                        status: 'aberto',
                        prioridade: 'media',
                        canal: userType === 'medico' ? 'portal_medico' : 'portal_paciente',
                        solicitante_nome: user.full_name || user.email,
                        solicitante_email: user.email,
                        categoria: 'duvida'
                      });

                      setConversaAtiva({ 
                        id: ticket.id, 
                        nome: 'Atendimento',
                        assunto: ticket.assunto,
                        tipo: 'clinica'
                      });
                      setView("chat");
                      queryClient.invalidateQueries(["tickets-clinica"]);
                    }}
                    className="px-6 py-3 rounded-xl font-semibold text-white"
                    style={{ backgroundColor: corPrimaria }}
                  >
                    Iniciar Conversa
                  </button>
                </div>
              ) : (
                ticketsClinica.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => {
                      setConversaAtiva({ 
                        id: ticket.id, 
                        nome: 'Atendimento',
                        assunto: ticket.assunto,
                        tipo: 'clinica'
                      });
                      setView("chat");
                    }}
                    className="p-4 rounded-xl border hover:shadow-sm cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-sm">{ticket.assunto}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        ticket.status === 'aberto' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.status === 'resolvido' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {format(new Date(ticket.created_date), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}

      {view === "chat" && conversaAtiva && (
        <>
          {/* BOTÃO CONVERTER EM TICKET */}
          {mostrarBotaoConverter && conversaTemporaria.length > 0 && (
            <div className="p-3 bg-yellow-50 border-b border-yellow-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-yellow-800">Conversa Temporária</p>
                  <p className="text-xs text-yellow-600">{conversaTemporaria.length} mensagens não salvas</p>
                </div>
                <button
                  onClick={() => converterEmTicket.mutate()}
                  disabled={converterEmTicket.isPending}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 disabled:opacity-50"
                >
                  {converterEmTicket.isPending ? 'Convertendo...' : '🎫 Converter em Ticket'}
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(conversaAtiva.temporaria ? conversaTemporaria : mensagens).length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-600">Inicie a conversa</p>
              </div>
            ) : (
              (conversaAtiva.temporaria ? conversaTemporaria : mensagens).map((msg, idx) => {
                const isMine = conversaAtiva.tipo === 'equipe' 
                  ? msg.remetente_id === user.id 
                  : (msg.remetente_tipo === 'equipe' && msg.remetente_email === user.email) ||
                    (msg.remetente_tipo === 'cliente' && msg.remetente_email === user.email) ||
                    (conversaAtiva.temporaria && msg.remetente_email === user.email);
                
                const temAnexo = msg.anexo_url || (msg.anexos && msg.anexos.length > 0);
                const anexoUrl = msg.anexo_url || msg.anexos?.[0]?.url;
                const eImagem = anexoUrl && (
                  anexoUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                  msg.anexos?.[0]?.tipo?.startsWith('image/')
                );

                return (
                  <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="max-w-[85%] rounded-lg p-3"
                      style={{
                        backgroundColor: isMine ? corPrimaria : '#f1f3f4',
                        color: isMine ? '#ffffff' : '#202124'
                      }}
                    >
                      {temAnexo && eImagem && (
                        <img 
                          src={anexoUrl} 
                          alt="Imagem" 
                          className="max-w-full rounded-lg mb-2 cursor-pointer"
                          onClick={() => window.open(anexoUrl, '_blank')}
                        />
                      )}
                      {temAnexo && !eImagem && (
                        <a 
                          href={anexoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 mb-2 hover:underline"
                        >
                          <FileText className="w-4 h-4" />
                          <span className="text-xs">Anexo</span>
                        </a>
                      )}
                      <p className="text-sm break-words whitespace-pre-wrap">{msg.conteudo}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {format(new Date(msg.created_date), "HH:mm")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4 space-y-3">
            {imagemPreview && (
              <div className="relative">
                <img src={imagemPreview} alt="Preview" className="max-w-full h-32 rounded-lg object-cover" />
                <button
                  onClick={() => {
                    setImagemPreview(null);
                    setAnexoSelecionado(null);
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
                {conversaAtiva.paciente_id && (
                  <button
                    onClick={() => adicionarAProntuario(anexoSelecionado.url)}
                    className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                  >
                    + Adicionar ao Prontuário
                  </button>
                )}
              </div>
            )}

            {anexoSelecionado && !imagemPreview && (
              <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-xs flex-1 truncate">Arquivo pronto</span>
                <button
                  onClick={() => {
                    setAnexoSelecionado(null);
                  }}
                  className="text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-3 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-all"
                title="Anexar arquivo"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Paperclip className="w-5 h-5 text-gray-600" />
                )}
              </button>
              <Input
                placeholder="Digite..."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleEnviar();
                  }
                }}
                className="flex-1 rounded-xl"
              />
              <button
                onClick={handleEnviar}
                disabled={(!mensagem.trim() && !anexoSelecionado) || enviarEquipeMutation.isPending || enviarTicketMutation.isPending}
                className="px-4 py-3 rounded-xl disabled:opacity-50 text-white transition-all"
                style={{ backgroundColor: corPrimaria }}
              >
                {enviarEquipeMutation.isPending || enviarTicketMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}