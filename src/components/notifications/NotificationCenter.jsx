import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Calendar, FileText, Users, DollarSign, Package, Brain, Shield, CheckCheck, Archive, Trash2, MailOpen, Tag, Route, History, MessageSquare, Clock, Flame, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const NotificationItem = ({ notif, iconMap, colorMap, onMarcarLida, onArquivar, onMarcarNaoLida, onExcluir, onClicar, queryClient }) => {
  const [showActions, setShowActions] = useState(false);
  const Icon = iconMap[notif.tipo] || Bell;
  const color = colorMap[notif.tipo] || '#5f6368';

  return (
    <div 
      className={`px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
        !notif.lida ? 'bg-blue-50/30' : ''
      }`}
    >
      <div className="flex gap-3">
        <div 
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" 
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 
              className={`text-sm text-gray-900 cursor-pointer flex-1 ${!notif.lida ? 'font-semibold' : 'font-normal'}`}
              onClick={() => {
                if (!notif.lida) onMarcarLida(notif.id);
                if (notif.acao_url) onClicar(notif);
              }}
            >
              {notif.titulo}
            </h4>
            {!notif.lida && (
              <div className="w-2 h-2 rounded-full bg-[#7E57FF] flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">{notif.corpo}</p>
          
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true, locale: ptBR })}
              </span>
              {notif.prioridade === 'urgente' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                  <Flame className="w-2.5 h-2.5" />
                  URGENTE
                </span>
              )}
              {notif.prioridade === 'alta' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px]">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Alta
                </span>
              )}
            </div>
            
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              aria-label="Ações da notificação"
            >
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="3" r="1.5"/>
                <circle cx="8" cy="8" r="1.5"/>
                <circle cx="8" cy="13" r="1.5"/>
              </svg>
            </button>
          </div>

          {showActions && (
            <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-1 animate-fadeIn">
              <button
                onClick={() => {
                  onMarcarNaoLida(notif.id);
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50 rounded transition-colors"
                disabled={!notif.lida}
              >
                <MailOpen className="w-3.5 h-3.5 text-gray-600" />
                Marcar como não lida
              </button>
              <button
                onClick={() => {
                  onArquivar(notif.id);
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50 rounded transition-colors"
              >
                <Archive className="w-3.5 h-3.5 text-gray-600" />
                Arquivar
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Excluir esta notificação?')) {
                    onExcluir(notif.id);
                  }
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-red-50 text-red-600 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
              <div className="border-t border-gray-200 my-1" />
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50 rounded transition-colors"
                onClick={() => setShowActions(false)}
              >
                <Route className="w-3.5 h-3.5 text-gray-600" />
                Ver rota
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50 rounded transition-colors"
                onClick={() => setShowActions(false)}
              >
                <History className="w-3.5 h-3.5 text-gray-600" />
                Auditoria
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function NotificationCenter({ user }) {
  const [aberto, setAberto] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [filtros, setFiltros] = useState({
    tipo: 'todos',
    status: 'todos',
    periodo: 'todos',
    search: ''
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [aberto]);

  // Buscar notificações + tickets
  const { data: notificacoes = [] } = useQuery({
    queryKey: ['notificacoes', user?.id, user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return [];
      try {
        // CRÍTICO: Filtrar por destinatario_id E clinica_id (multi-tenant)
        const todas = await base44.entities.NotificacaoSistema.filter(
          { 
            destinatario_id: user.id,
            clinica_id: user.clinica_id,
            arquivada: false
          },
          '-created_date',
          50
        );
        return todas || [];
      } catch (e) {
        return [];
      }
    },
    refetchInterval: 30000,
    enabled: !!user?.id && !!user?.clinica_id,
    initialData: []
  });

  // DEDUPE: Usar mesma query do TicketsCounter
  const { data: ticketsAbertos = [] } = useQuery({
    queryKey: ['tickets-header-count', user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return [];
      try {
        return await base44.entities.Ticket.filter({ 
          clinica_id: user.clinica_id,
          status: 'aberto'
        });
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
    enabled: !!user?.clinica_id,
    initialData: [],
    staleTime: 25000 // Cache compartilhado
  });

  const marcarLida = useMutation({
    mutationFn: async (notifId) => {
      // VALIDAÇÃO: notificação pertence à clínica do user
      const notif = notificacoes.find(n => n.id === notifId);
      if (!notif || (notif.clinica_id !== user.clinica_id && user.role !== 'admin')) {
        throw new Error('Acesso negado - notificação de outra clínica');
      }

      return await base44.entities.NotificacaoSistema.update(notifId, { 
        lida: true,
        lida_em: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notificacoes']);
    }
  });

  const marcarTodasLidas = useMutation({
    mutationFn: async () => {
      const naoLidas = (notificacoes || []).filter(n => !n.lida);
      await Promise.all(naoLidas.map(n => 
        base44.entities.NotificacaoSistema.update(n.id, { 
          lida: true,
          lida_em: new Date().toISOString()
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notificacoes']);
    }
  });

  const arquivarNotificacao = useMutation({
    mutationFn: async (notifId) => {
      const notif = notificacoes.find(n => n.id === notifId);
      if (!notif || (notif.clinica_id !== user.clinica_id && user.role !== 'admin')) {
        throw new Error('Acesso negado');
      }
      return await base44.entities.NotificacaoSistema.update(notifId, { 
        arquivada: true 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notificacoes']);
    }
  });

  const limparTodasNotificacoes = useMutation({
    mutationFn: async () => {
      await Promise.all((notificacoes || []).map(n => 
        base44.entities.NotificacaoSistema.delete(n.id)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notificacoes']);
      setAberto(false);
    }
  });

  const marcarComoNaoLida = useMutation({
    mutationFn: async (notifId) => {
      return await base44.entities.NotificacaoSistema.update(notifId, { 
        lida: false,
        lida_em: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notificacoes']);
    }
  });

  // FILTROS APLICADOS
  const notificacoesFiltradas = (notificacoes || []).filter(notif => {
    // Filtro tipo
    if (filtros.tipo !== 'todos' && notif.tipo !== filtros.tipo) return false;

    // Filtro status
    if (filtros.status === 'nao_lidas' && notif.lida) return false;
    if (filtros.status === 'lidas' && !notif.lida) return false;

    // Filtro período
    const agora = new Date();
    const dataNotif = new Date(notif.created_date);
    if (filtros.periodo === '7dias') {
      const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (dataNotif < seteDiasAtras) return false;
    }
    if (filtros.periodo === '30dias') {
      const trintaDiasAtras = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (dataNotif < trintaDiasAtras) return false;
    }

    // Search fuzzy
    if (filtros.search) {
      const searchLower = filtros.search.toLowerCase();
      const titulo = (notif.titulo || '').toLowerCase();
      const corpo = (notif.corpo || '').toLowerCase();
      if (!titulo.includes(searchLower) && !corpo.includes(searchLower)) return false;
    }

    return true;
  });

  const naoLidas = (notificacoes || []).filter(n => !n.lida).length;
  const totalAlertas = naoLidas + (ticketsAbertos?.length || 0);

  const iconMap = {
    aprovacao_prontuario: Shield,
    ticket_novo: MessageSquare,
    ticket_respondido: MessageSquare,
    agendamento_confirmado: Calendar,
    agendamento_cancelado: Calendar,
    termo_pendente: FileText,
    prontuario_pronto: FileText,
    exame_anexado: FileText,
    receita_digital: FileText,
    colaboracao_mencionado: Users,
    cobranca_vencendo: DollarSign,
    pagamento_falhou: DollarSign,
    credito_baixo: DollarSign,
    trial_expirando: Clock,
    sistema_alerta: Shield
  };

  const colorMap = {
    aprovacao_prontuario: "#ea4335",
    ticket_novo: "#7E57FF",
    ticket_respondido: "#34a853",
    agendamento_confirmado: "#7E57FF",
    agendamento_cancelado: "#f59e0b",
    termo_pendente: "#ea4335",
    prontuario_pronto: "#34a853",
    exame_anexado: "#0B7A9E",
    receita_digital: "#9334e9",
    colaboracao_mencionado: "#7E57FF",
    cobranca_vencendo: "#f59e0b",
    pagamento_falhou: "#ea4335",
    credito_baixo: "#f59e0b",
    trial_expirando: "#ea4335",
    sistema_alerta: "#5f6368"
  };

  return (
    <div className="relative">
      <button
        onClick={() => setAberto(!aberto)}
        className="w-10 h-10 md:w-11 md:h-11 rounded-full hover:opacity-80 flex items-center justify-center transition-all relative"
        style={{ backgroundColor: '#f5f3ff' }}
        aria-label="Notificações e Tickets"
      >
        <Bell className="w-4.5 h-4.5 md:w-5 md:h-5" style={{ color: '#7E57FF' }} />
        {totalAlertas > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {totalAlertas > 9 ? "9+" : totalAlertas}
          </span>
        )}
      </button>

      <AnimatePresence>
        {aberto && (
          <>
            {/* Overlay com blur total */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]" 
              onClick={() => setAberto(false)}
              role="presentation"
              aria-hidden="true"
              style={{ top: 0, left: 0, right: 0, bottom: 0 }}
            />
            
            {/* Desktop: Dropdown / Mobile: Bottom Sheet - TAMANHO FIXO */}
            <motion.div 
              initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
              animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
              exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`bg-white shadow-2xl border overflow-hidden z-[9999] ${
                isMobile 
                  ? "fixed bottom-0 left-0 right-0 rounded-t-3xl" 
                  : "absolute right-0 top-14 w-96 max-w-[calc(100vw-2rem)] rounded-2xl"
              }`}
              style={{ 
                borderColor: '#e8eaed',
                height: isMobile ? '70vh' : 'auto',
                maxHeight: isMobile ? '70vh' : '600px'
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Central de notificações"
            >
            {/* Mobile: Indicador de arrasto */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-gray-300" />
              </div>
            )}

            {/* Header */}
            <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 z-10 bg-white" style={{ 
              borderColor: '#e8eaed' 
            }}>
              <div className="flex-1">
                <h3 className="text-base font-bold" style={{ 
                  color: '#081828',
                  fontFamily: 'DM Sans, system-ui, sans-serif'
                }}>
                  Notificações
                </h3>
                {ticketsAbertos.length > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: '#ea4335' }}>
                    {ticketsAbertos.length} ticket{ticketsAbertos.length > 1 ? 's' : ''} aberto{ticketsAbertos.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notificacoes.length > 0 && (
                  <button 
                    onClick={() => {
                      if (window.confirm('Limpar todas as notificações?')) {
                        limparTodasNotificacoes.mutate();
                      }
                    }}
                    className="p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-red-100"
                    aria-label="Limpar todas as notificações"
                    title="Limpar todas"
                  >
                    <Trash2 className="w-4 h-4" style={{ color: '#ea4335' }} />
                  </button>
                )}
                <button 
                  onClick={() => setAberto(false)} 
                  className="p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Fechar notificações"
                >
                  <X className="w-5 h-5" style={{ color: '#5f6368' }} />
                </button>
              </div>
            </div>

            {/* Filtros + Search */}
            <div className="px-5 py-3 border-b bg-gray-50 sticky top-16 z-10 space-y-3" style={{ borderColor: '#e8eaed' }}>
              <input
                type="text"
                placeholder="Buscar notificações..."
                value={filtros.search}
                onChange={e => setFiltros({...filtros, search: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ borderColor: '#e8eaed' }}
              />
              <div className="flex gap-2 overflow-x-auto pb-1">
                <select
                  value={filtros.status}
                  onChange={e => setFiltros({...filtros, status: e.target.value})}
                  className="px-3 py-1.5 border rounded-lg text-xs bg-white"
                  style={{ borderColor: '#e8eaed' }}
                >
                  <option value="todos">Todas</option>
                  <option value="nao_lidas">Não lidas</option>
                  <option value="lidas">Lidas</option>
                </select>
                <select
                  value={filtros.tipo}
                  onChange={e => setFiltros({...filtros, tipo: e.target.value})}
                  className="px-3 py-1.5 border rounded-lg text-xs bg-white"
                  style={{ borderColor: '#e8eaed' }}
                >
                  <option value="todos">Todos tipos</option>
                  <option value="aprovacao_prontuario">Aprovações</option>
                  <option value="ticket_novo">Tickets novos</option>
                  <option value="agendamento_confirmado">Agendamentos</option>
                  <option value="termo_pendente">Termos</option>
                </select>
                <select
                  value={filtros.periodo}
                  onChange={e => setFiltros({...filtros, periodo: e.target.value})}
                  className="px-3 py-1.5 border rounded-lg text-xs bg-white"
                  style={{ borderColor: '#e8eaed' }}
                >
                  <option value="todos">Todo período</option>
                  <option value="7dias">Últimos 7 dias</option>
                  <option value="30dias">Últimos 30 dias</option>
                </select>
              </div>
              {notificacoesFiltradas.length !== notificacoes.length && (
                <p className="text-xs text-gray-500">
                  Mostrando {notificacoesFiltradas.length} de {notificacoes.length} notificações
                </p>
              )}
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1" style={{ 
              maxHeight: isMobile ? 'calc(70vh - 180px)' : '400px' 
            }}>
              {notificacoesFiltradas.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">
                    {notificacoes.length === 0 ? 'Nenhuma notificação' : 'Nenhuma notificação com esses filtros'}
                  </p>
                </div>
              ) : (
                <>
                  {naoLidas > 0 && (
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">
                        {naoLidas} não lida{naoLidas > 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => marcarTodasLidas.mutate()}
                        disabled={marcarTodasLidas.isPending}
                        className="text-xs font-medium text-[#7E57FF] hover:underline flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Marcar todas como lidas
                      </button>
                    </div>
                  )}
                  {notificacoesFiltradas.map(notif => (
                    <NotificationItem
                      key={notif.id}
                      notif={notif}
                      iconMap={iconMap}
                      colorMap={colorMap}
                      onMarcarLida={(id) => marcarLida.mutate(id)}
                      onArquivar={(id) => arquivarNotificacao.mutate(id)}
                      onMarcarNaoLida={(id) => marcarComoNaoLida.mutate(id)}
                      onExcluir={(id) => {
                        base44.entities.NotificacaoSistema.delete(id).then(() => {
                          queryClient.invalidateQueries(['notificacoes']);
                        });
                      }}
                      onClicar={async (notif) => {
                        // TRACKING: Registrar clique
                        await base44.entities.NotificacaoSistema.update(notif.id, {
                          clicada: true,
                          clicada_em: new Date().toISOString()
                        });
                        // Navegar para ação
                        if (notif.acao_url) {
                          window.location.href = notif.acao_url;
                        }
                      }}
                      queryClient={queryClient}
                    />
                  ))}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>
    </div>
  );
}