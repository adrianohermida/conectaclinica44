import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * WIDGET PÚBLICO MINIMALISTA - Arquitetura Base44 correta
 * Zero complexidade desnecessária
 */
export default function PublicChatWidgetSimple() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // STEP 1: Iniciar conversa
  const initConversation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[Widget] Criando conversa...');
      
      // Via backend function (service role)
      const response = await base44.functions.invoke('iniciarConversaPublica', {});
      
      console.log('[Widget] Resposta:', response.data);
      
      if (!response.data.success || !response.data.conversation_id) {
        throw new Error('Falha ao criar conversa');
      }

      const convId = response.data.conversation_id;
      setConversationId(convId);

      console.log('[Widget] Conversa criada:', convId);

      // Aguardar 1s e buscar mensagens iniciais
      setTimeout(() => loadMessages(convId), 1000);

    } catch (error) {
      console.error('[Widget] Erro ao iniciar:', error);
      setError('Não foi possível iniciar a conversa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Carregar mensagens
  const loadMessages = async (convId) => {
    try {
      console.log('[Widget] Carregando mensagens...');
      
      const response = await base44.functions.invoke('buscarMensagensPublica', {
        conversation_id: convId
      });

      console.log('[Widget] Mensagens:', response.data);

      if (response.data.messages) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('[Widget] Erro ao carregar mensagens:', error);
    }
  };

  // STEP 3: Enviar mensagem
  const sendMessage = async () => {
    if (!input.trim() || !conversationId || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    // Adicionar mensagem do usuário imediatamente
    const tempUserMsg = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      console.log('[Widget] Enviando mensagem...');

      await base44.functions.invoke('enviarMensagemPublica', {
        conversation_id: conversationId,
        message: userMessage
      });

      // Aguardar 2s e recarregar mensagens
      setTimeout(() => loadMessages(conversationId), 2000);

    } catch (error) {
      console.error('[Widget] Erro ao enviar:', error);
      setError('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  // Abrir widget
  const handleOpen = () => {
    setIsOpen(true);
    if (!conversationId) {
      initConversation();
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-50"
          style={{ backgroundColor: '#7E57FF' }}
          aria-label="Abrir chat"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Widget aberto */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b" style={{ backgroundColor: '#7E57FF' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-white font-semibold">Clara - ConectaClínica</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:opacity-80"
              aria-label="Fechar chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-[#7E57FF] text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Digite sua mensagem..."
                disabled={loading || !conversationId}
                className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-[#7E57FF] text-sm"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim() || !conversationId}
                className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50"
                style={{ backgroundColor: '#7E57FF' }}
                aria-label="Enviar mensagem"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}