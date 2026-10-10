import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, X, Send, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ProspectChatWidget - Chat para visitantes da Home
 * Integra com agente IA + transferência para suporte humano
 */
export default function ProspectChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && !conversationId) {
      initConversation();
    }
  }, [open]);

  const initConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: "sdr_vendas",
        metadata: { tipo: "prospect", origem: "landing_page" }
      });
      setConversationId(conv.id);
      
      // Mensagem inicial humanizada
      setMessages([{
        role: "assistant",
        content: "Olá! 👋 Sou Clara, da ConectaClínica. Prazer em conhecê-lo! Estou aqui para tirar suas dúvidas e mostrar como podemos simplificar a gestão da sua clínica. Me conte, qual o maior desafio que você enfrenta hoje?"
      }]);
    } catch (error) {
      console.error("Erro ao iniciar conversa:", error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversationId) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const conv = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conv, userMessage);

      // Subscribe para resposta
      const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
        const lastMsg = data.messages[data.messages.length - 1];
        if (lastMsg.role === "assistant") {
          setMessages(data.messages);
          setLoading(false);
          unsubscribe();
        }
      });
    } catch (error) {
      console.error("Erro ao enviar:", error);
      setLoading(false);
    }
  };

  const transferirParaHumano = async () => {
    try {
      await base44.entities.Ticket.create({
        assunto: "Transferência de Chat - Prospect",
        categoria: "comercial",
        descricao: `Histórico da conversa:\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`,
        status: "aberto",
        prioridade: "alta",
        origem: "chat_widget"
      });

      setMessages(prev => [...prev, {
        role: "assistant",
        content: "✅ Ticket criado! Nossa equipe entrará em contato em breve. Deixe seu email no formulário de contato."
      }]);
    } catch (error) {
      console.error("Erro ao criar ticket:", error);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-4 md:right-6 w-[90vw] md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col"
            style={{ border: '1px solid var(--pc-border-primary)' }}
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between" style={{ 
              backgroundColor: 'var(--pc-primary)', 
              borderRadius: '16px 16px 0 0' 
            }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Clara - ConectaClínica</h3>
                  <p className="text-xs text-white/80 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    Online agora
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pc-scrollbar" style={{ backgroundColor: 'var(--pc-bg-secondary)' }}>
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[80%] p-3 rounded-xl text-sm"
                    style={{
                      backgroundColor: msg.role === 'user' ? 'var(--pc-primary)' : 'white',
                      color: msg.role === 'user' ? 'white' : 'var(--pc-text-primary)',
                      border: msg.role === 'assistant' ? '1px solid var(--pc-border-secondary)' : 'none'
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-xl border" style={{ borderColor: 'var(--pc-border-secondary)' }}>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: 'var(--pc-border-primary)' }}>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-4 py-3 rounded-full text-sm focus:outline-none"
                  style={{ 
                    backgroundColor: 'var(--pc-gray-100)', 
                    border: '1px solid var(--pc-border-secondary)',
                    color: 'var(--pc-text-primary)'
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-50 transition-all"
                  style={{ backgroundColor: 'var(--pc-primary)' }}
                  aria-label="Enviar mensagem"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40"
        style={{ backgroundColor: 'var(--pc-primary)' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </motion.button>
    </>
  );
}