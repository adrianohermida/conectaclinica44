import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, X, Send, Paperclip, Loader2, User, Bot, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";

/**
 * WIDGET CHAT UNIVERSAL - Multi-tenant unificado
 * mode='public' → SDR vendas (site)
 * mode='clinic' → Tickets multi-tenant (clientes da clínica)
 * mode='superadmin' → TODOS tickets (SuperAdmin)
 */
export default function WidgetChatUniversal({ 
  mode = 'public', 
  clinicaId, 
  agentConfig 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mensagens, setMensagens] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [contatoForm, setContatoForm] = useState({ nome: "", email: "", telefone: "" });
  const [contatoColetado, setContatoColetado] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  // Mensagem inicial baseada no mode
  useEffect(() => {
    if (isOpen && mensagens.length === 0) {
      const msgInicial = mode === 'public' 
        ? "👋 Olá! Sou o assistente virtual do ConectaClínica. Como posso ajudar você hoje?"
        : "👋 Olá! Como podemos ajudar?";
      
      setMensagens([{ role: 'assistant', content: msgInicial }]);
    }
  }, [isOpen, mode]);

  const handleEnviarMensagem = async () => {
    if (!inputMsg.trim() || loading) return;

    // Se mode=public e contato não coletado, coletar primeiro
    if (mode === 'public' && !contatoColetado) {
      if (!contatoForm.nome || !contatoForm.email) {
        return;
      }
      setContatoColetado(true);
    }

    const novaMensagem = { role: 'user', content: inputMsg };
    setMensagens(prev => [...prev, novaMensagem]);
    setInputMsg("");
    setLoading(true);

    try {
      if (mode === 'public') {
        // Mode público: Auto-resposta IA via widget
        const response = await base44.functions.invoke('autoRespostaIA', {
          session_id: sessionId,
          clinica_id: clinicaId || 'demo',
          mensagem: inputMsg,
          visitante_id: contatoForm.email
        });

        setMensagens(prev => [...prev, { 
          role: 'assistant', 
          content: response.data.auto_resposta,
          tokens: response.data.tokens_consumidos
        }]);

        // Registrar sessão
        try {
          await base44.entities.SessaoWidget.create({
            clinica_id: clinicaId || 'demo',
            session_id: sessionId,
            visitante_nome: contatoForm.nome,
            visitante_email: contatoForm.email,
            visitante_telefone: contatoForm.telefone,
            origem_url: window.location.href,
            total_mensagens: mensagens.length + 1,
            ia_ativa: true,
            tokens_consumidos: response.data.tokens_consumidos || 0,
            status: 'ativa'
          });
        } catch (sessaoError) {
          console.error('Erro criar sessão:', sessaoError);
        }

      } else if (mode === 'clinic') {
        // Mode clínica: Criar ticket multi-tenant
        const response = await base44.functions.invoke('criarTicketPortal', {
          clinica_id: clinicaId,
          assunto: inputMsg.substring(0, 100),
          mensagem: inputMsg,
          solicitante_nome: contatoForm.nome,
          solicitante_email: contatoForm.email
        });

        setMensagens(prev => [...prev, { 
          role: 'assistant', 
          content: `✅ Ticket #${response.data.numero_ticket} criado! Nossa equipe irá responder em breve.`
        }]);

      } else if (mode === 'superadmin') {
        // Mode SuperAdmin: Acesso global
        setMensagens(prev => [...prev, { 
          role: 'assistant', 
          content: `[SuperAdmin] Acesso a TODOS os tickets. Funcionalidade em desenvolvimento.`
        }]);
      }

    } catch (error) {
      console.error('Erro enviar mensagem:', error);
      setMensagens(prev => [...prev, { 
        role: 'assistant', 
        content: 'Desculpe, ocorreu um erro. Tente novamente.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const corPrimaria = agentConfig?.cor_primaria || '#7E57FF';
  const corSecundaria = agentConfig?.cor_secundaria || '#f5f3ff';

  return (
    <>
      {/* Botão Launcher */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center z-50"
            style={{ backgroundColor: corPrimaria }}
          >
            <MessageSquare className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-[min(380px,calc(100vw-48px))] h-[min(600px,calc(100vh-48px))] bg-white rounded-2xl shadow-2xl flex flex-col z-50"
          >
            {/* Header */}
            <div className="p-4 rounded-t-2xl flex items-center justify-between" style={{ backgroundColor: corPrimaria }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">
                      {mode === 'public' ? 'ConectaClínica' : 'Atendimento'}
                    </p>
                    {mode !== 'superadmin' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400 text-yellow-900 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        IA Ativa
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/80">Online agora</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundColor: '#F4F7FA' }}>
              {/* Formulário Contato (mode=public) */}
              {mode === 'public' && !contatoColetado && (
                <div className="bg-white p-4 rounded-xl border" style={{ borderColor: '#e8eaed' }}>
                  <p className="text-sm font-semibold mb-3" style={{ color: '#202124' }}>
                    Para começar, precisamos de algumas informações:
                  </p>
                  <div className="space-y-2">
                    <Input
                      placeholder="Seu nome"
                      value={contatoForm.nome}
                      onChange={(e) => setContatoForm({ ...contatoForm, nome: e.target.value })}
                      className="rounded-lg"
                    />
                    <Input
                      type="email"
                      placeholder="Seu email"
                      value={contatoForm.email}
                      onChange={(e) => setContatoForm({ ...contatoForm, email: e.target.value })}
                      className="rounded-lg"
                    />
                    <Input
                      placeholder="Telefone (opcional)"
                      value={contatoForm.telefone}
                      onChange={(e) => setContatoForm({ ...contatoForm, telefone: e.target.value })}
                      className="rounded-lg"
                    />
                  </div>
                </div>
              )}

              {mensagens.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="flex items-start gap-2 max-w-[80%]">
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: corSecundaria }}>
                        <Bot className="w-4 h-4" style={{ color: corPrimaria }} />
                      </div>
                    )}
                    <div 
                      className="px-4 py-2.5 rounded-2xl"
                      style={msg.role === 'user' 
                        ? { backgroundColor: corPrimaria, color: 'white' }
                        : { backgroundColor: 'white', border: '1px solid #e8eaed' }
                      }
                    >
                      <p className="text-sm">{msg.content}</p>
                      {msg.tokens && (
                        <p className="text-xs mt-1 opacity-60">
                          {msg.tokens} tokens
                        </p>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e8eaed' }}>
                        <User className="w-4 h-4" style={{ color: '#5f6368' }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border" style={{ borderColor: '#e8eaed' }}>
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: corPrimaria }} />
                    <p className="text-sm" style={{ color: '#5f6368' }}>Digitando...</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: '#e8eaed' }}>
              <div className="flex items-center gap-2">
                <Input
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleEnviarMensagem()}
                  placeholder="Digite sua mensagem..."
                  className="rounded-full flex-1"
                  disabled={loading || (mode === 'public' && !contatoColetado)}
                />
                <button
                  onClick={handleEnviarMensagem}
                  disabled={loading || !inputMsg.trim() || (mode === 'public' && !contatoColetado)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{ backgroundColor: corPrimaria, opacity: loading ? 0.5 : 1 }}
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}