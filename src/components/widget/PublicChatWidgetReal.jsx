import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";

export default function PublicChatWidgetReal() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const inicioConversaRef = useRef(null);
  const leadIdRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (open && !conversationId) {
      iniciarConversa();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      
      // CRITICAL: Salvar conversa ao fechar/sair
      if (conversationId && messages.length > 1) {
        salvarConversaFinal();
      }
    };
  }, [conversationId, messages]);

  const salvarConversaFinal = async () => {
    if (!conversationId || messages.length <= 1) return;

    try {
      const tempoTotal = Math.round((Date.now() - inicioConversaRef.current) / 1000);
      
      // Detectar resultado
      const resultado = detectarResultado();
      const converteEm = detectarConversao();

      await base44.functions.invoke('salvarConversaWidget', {
        sessao_id: conversationId,
        mensagens: messages,
        lead_id: leadIdRef.current,
        resultado,
        converteu_em: converteEm,
        tempo_total_conversa_seg: tempoTotal,
        tempo_resposta_media_ms: calcularLatenciaMedia(),
        custo_openai_usd: (messages.filter(m => m.role === 'assistant').length * 0.002)
      });
    } catch (error) {
      console.error('Erro ao salvar conversa:', error);
    }
  };

  const detectarResultado = () => {
    const ultimasMensagens = messages.slice(-5);
    const textoFinal = ultimasMensagens.map(m => m.content.toLowerCase()).join(' ');

    // Verificar tool calls de conversão
    const temAgendamento = messages.some(m => 
      m.tool_calls?.some(tc => tc.name === 'agendarDemonstracao' && tc.status === 'completed')
    );
    const temTicket = messages.some(m => 
      m.tool_calls?.some(tc => tc.name === 'criarTicketSuporte' && tc.status === 'completed')
    );
    const temEscalacao = messages.some(m => 
      m.tool_calls?.some(tc => tc.name === 'escalarParaHumano' && tc.status === 'completed')
    );

    if (temAgendamento || temTicket) return 'converteu';
    if (temEscalacao) return 'escalou';
    if (textoFinal.includes('obrigad') || textoFinal.includes('resolvido')) return 'resolvido';
    
    return messages.length < 4 ? 'abandonou' : 'em_andamento';
  };

  const detectarConversao = () => {
    const temAgendamento = messages.some(m => 
      m.tool_calls?.some(tc => tc.name === 'agendarDemonstracao' && tc.status === 'completed')
    );
    const temTicket = messages.some(m => 
      m.tool_calls?.some(tc => tc.name === 'criarTicketSuporte' && tc.status === 'completed')
    );

    if (temAgendamento) return 'agendamento';
    if (temTicket) return 'ticket';
    
    // Lead qualificado = tem email/nome coletados
    const temDados = messages.some(m => 
      m.content.toLowerCase().includes('@') || 
      (m.role === 'user' && m.content.split(' ').length >= 2)
    );
    
    return temDados ? 'lead_qualificado' : null;
  };

  const calcularLatenciaMedia = () => {
    // Simplificado - em prod seria tracking real de timestamps
    return 1500;
  };

  const iniciarConversa = async () => {
    try {
      setLoading(true);
      inicioConversaRef.current = Date.now();

      console.log('[Widget] Criando conversa via backend (service role)...');

      // Criar conversa via BACKEND (sem auth)
      const { data } = await base44.functions.invoke('iniciarConversaPublica', {});
      
      console.log('[Widget] Conversa criada:', data.conversation_id);
      setConversationId(data.conversation_id);

      // SUBSCRIPTION
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      console.log('[Widget] Iniciando subscription...');
      unsubscribeRef.current = base44.agents.subscribeToConversation(data.conversation_id, (conversationData) => {
        console.log('[Widget] Update recebido:', conversationData.messages.length, 'mensagens');
        setMessages(conversationData.messages);
        setLoading(false);
      });

      setLoading(false);

    } catch (error) {
      console.error('[Widget] Erro ao iniciar conversa:', error);
      setMessages([{
        role: "assistant",
        content: "Desculpe, estou com dificuldades técnicas. Por favor, entre em contato por email: contato@conectaclinica.com.br"
      }]);
      setLoading(false);
    }
  };

  const enviarMensagem = async () => {
    if (!input.trim() || !conversationId || loading) return;

    const mensagemTexto = input;
    const userMessage = { role: "user", content: mensagemTexto };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      console.log('[Widget] Enviando mensagem via backend:', mensagemTexto);

      // Enviar via BACKEND (service role)
      await base44.functions.invoke('enviarMensagemPublica', {
        conversation_id: conversationId,
        mensagem: mensagemTexto
      });

      console.log('[Widget] Mensagem enviada. Aguardando resposta via subscription...');

      // Detectar lead_id se agendamento foi criado
      const checkLeadCreation = () => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.tool_calls) {
          const agendamentoTool = lastMsg.tool_calls.find(tc => 
            tc.name === 'agendarDemonstracao' && tc.status === 'success'
          );
          if (agendamentoTool && agendamentoTool.results) {
            try {
              const result = JSON.parse(agendamentoTool.results);
              if (result.lead_id) leadIdRef.current = result.lead_id;
            } catch {}
          }
        }
      };
      setTimeout(checkLeadCreation, 2000);

      // CRÍTICO: Salvar após CADA mensagem (backup incremental)
      setTimeout(() => {
        if (messages.length > 2) {
          salvarConversaIncremental();
        }
      }, 3000);

    } catch (error) {
      console.error('[Widget] Erro ao enviar:', error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Desculpe, houve um erro. Tente novamente."
      }]);
      setLoading(false);
    }
  };

  const salvarConversaIncremental = async () => {
    if (!conversationId || messages.length <= 1) return;

    try {
      const tempoTotal = Math.round((Date.now() - inicioConversaRef.current) / 1000);
      const resultado = detectarResultado();
      const converteEm = detectarConversao();

      // Upsert (create ou update)
      const conversaExistente = await base44.entities.ConversaWidget.filter({ sessao_id: conversationId }).catch(() => []);
      
      const dados = {
        sessao_id: conversationId,
        mensagens: messages,
        lead_id: leadIdRef.current,
        resultado,
        converteu_em: converteEm,
        tempo_total_conversa_seg: tempoTotal,
        tempo_resposta_media_ms: 1500,
        custo_openai_usd: (messages.filter(m => m.role === 'assistant').length * 0.002)
      };

      if (conversaExistente.length > 0) {
        await base44.entities.ConversaWidget.update(conversaExistente[0].id, dados);
      } else {
        await base44.functions.invoke('salvarConversaWidget', dados);
      }
    } catch (error) {
      console.error('Erro ao salvar incremental:', error);
    }
  };

  const FunctionDisplay = ({ toolCall }) => {
    if (!toolCall || !toolCall.name) return null;

    // OCULTAR buscarFAQParaIA - é interno, não deve aparecer
    if (toolCall.name === 'buscarFAQParaIA') return null;

    const statusIcons = {
      pending: { icon: Loader2, color: 'text-gray-400', text: '', spin: true },
      running: { icon: Loader2, color: 'text-blue-500', text: '', spin: true },
      in_progress: { icon: Loader2, color: 'text-blue-500', text: '', spin: true },
      success: { icon: Sparkles, color: 'text-green-600', text: 'Concluído', spin: false },
      completed: { icon: Sparkles, color: 'text-green-600', text: 'Concluído', spin: false },
      error: { icon: X, color: 'text-red-500', text: 'Erro', spin: false },
      failed: { icon: X, color: 'text-red-500', text: 'Erro', spin: false }
    };

    const config = statusIcons[toolCall.status] || statusIcons.in_progress;
    const Icon = config.icon;

    const functionNames = {
      agendarDemonstracao: '📅 Agendando...',
      criarTicketSuporte: '🎫 Abrindo ticket...',
      escalarParaHumano: '👤 Transferindo...'
    };

    const displayName = functionNames[toolCall.name] || toolCall.name;

    // Mostrar todos os status (debug)
    return (
      <div className="my-1 flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs" style={{ backgroundColor: 'var(--brand-primary-50)', color: 'var(--brand-primary)' }}>
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${config.spin ? 'animate-spin' : ''}`} />
        <span className="font-medium">{displayName}</span>
        {config.text && <span className="text-[10px] opacity-70">• {config.text}</span>}
      </div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 md:right-6 w-[min(420px,90vw)] bg-white rounded-3xl z-50 flex flex-col overflow-hidden"
            style={{ 
              height: '600px',
              maxHeight: 'calc(100vh - 100px)',
              boxShadow: '0 20px 60px rgba(126,87,255,0.3), 0 0 0 1px rgba(126,87,255,0.1)'
            }}
          >
            {/* Header */}
            <div className="p-5 flex items-center justify-between flex-shrink-0" style={{ 
              background: 'linear-gradient(135deg, #7E57FF 0%, #9333ea 100%)'
            }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Clara - IA</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-xs text-white/90">Online agora</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  salvarConversaFinal();
                  setOpen(false);
                }} 
                className="text-white/80 hover:text-white transition-all"
                aria-label="Fechar chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pc-scrollbar" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
              {messages.map((msg, idx) => (
                <div key={idx}>
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary-50)' }}>
                        <Sparkles className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                      </div>
                    )}
                    <div
                      className="max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed"
                      style={{
                        backgroundColor: msg.role === 'user' ? 'var(--brand-primary)' : 'white',
                        color: msg.role === 'user' ? 'white' : 'var(--brand-text-primary)',
                        border: msg.role === 'assistant' ? '1px solid var(--brand-border-primary)' : 'none',
                        boxShadow: msg.role === 'assistant' ? 'var(--pc-shadow-sm)' : 'none'
                      }}
                    >
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown 
                          className="prose prose-sm max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>li]:my-0.5"
                          components={{
                            p: ({children}) => <p className="text-sm leading-relaxed">{children}</p>,
                            ul: ({children}) => <ul className="list-disc ml-4">{children}</ul>,
                            li: ({children}) => <li className="text-sm">{children}</li>
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>

                  {/* Tool Calls Display */}
                  {msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="ml-10 space-y-1 mt-1">
                      {msg.tool_calls.map((toolCall, tcIdx) => (
                        <FunctionDisplay key={tcIdx} toolCall={toolCall} />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--brand-primary-50)' }}>
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                  </div>
                  <div className="bg-white p-3 rounded-2xl" style={{ border: '1px solid var(--brand-border-primary)' }}>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--brand-primary)', animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--brand-primary)', animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--brand-primary)', animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white flex-shrink-0" style={{ borderTop: '1px solid var(--brand-border-primary)' }}>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                  placeholder="Digite sua mensagem..."
                  disabled={loading || !conversationId}
                  className="flex-1 px-4 py-3 rounded-full text-sm focus:outline-none focus:ring-2 min-h-[48px] disabled:opacity-50"
                  style={{ 
                    backgroundColor: 'var(--brand-bg-tertiary)', 
                    border: '1px solid var(--brand-border-primary)',
                    color: 'var(--brand-text-primary)',
                    outlineColor: 'var(--brand-primary)'
                  }}
                />
                <button
                  onClick={enviarMensagem}
                  disabled={!input.trim() || loading || !conversationId}
                  className="w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                  aria-label="Enviar mensagem"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
              <p className="text-xs text-center mt-2" style={{ color: 'var(--brand-text-tertiary)' }}>
                Clara é uma IA - pode cometer erros ocasionalmente
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-16 h-16 rounded-full flex items-center justify-center z-40"
        style={{ 
          background: 'linear-gradient(135deg, #7E57FF 0%, #9333ea 100%)',
          boxShadow: '0 8px 24px rgba(126,87,255,0.4)'
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={open ? {} : { scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        aria-label={open ? "Fechar chat" : "Abrir chat"}
      >
        {open ? <X className="w-7 h-7 text-white" /> : <MessageCircle className="w-7 h-7 text-white" />}
      </motion.button>

      {/* Pulse Notification */}
      {!open && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-16 right-16 md:bottom-18 md:right-18 w-6 h-6 rounded-full flex items-center justify-center z-40"
          style={{ backgroundColor: 'var(--brand-success)' }}
        >
          <span className="text-white text-xs font-bold">1</span>
        </motion.div>
      )}
    </>
  );
}