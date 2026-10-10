import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, X, Send, Minimize2, Maximize2, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function PublicChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const [timeOnPage, setTimeOnPage] = useState(0);
  const [hasEngaged, setHasEngaged] = useState(false);

  // Configurações fixas para público
  const widgetColor = '#7E57FF';
  const greeting = 'Olá! Sou a Clara 👋';

  // IA Proativa - Monitorar tempo na página
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeOnPage(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // IA Proativa - Engajamento automático após 30s
  useEffect(() => {
    if (timeOnPage === 30 && !hasEngaged && !isOpen) {
      setIsOpen(true);
      setHasEngaged(true);
      // Widget abre automaticamente com mensagem proativa
    }
  }, [timeOnPage, hasEngaged, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!currentConversation) return;

    const unsubscribe = base44.agents.subscribeToConversation(
      currentConversation.id,
      (data) => {
        setMessages(data.messages || []);
      }
    );

    return () => unsubscribe();
  }, [currentConversation?.id]);

  const loadOrCreateConversation = async () => {
    try {
      const newConv = await base44.agents.createConversation({
        agent_name: "triagem_paciente",
        metadata: {
          name: `Chat Público ${new Date().toLocaleDateString()}`,
          origem: "site_publico",
          url: window.location.href,
          tipo: "publico"
        }
      });
      setCurrentConversation(newConv);
      setMessages([]);
    } catch (error) {
      console.error("Erro ao iniciar conversa:", error);
    }
  };



  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentConversation || isSending) return;

    setIsSending(true);
    try {
      await base44.agents.addMessage(currentConversation, {
        role: "user",
        content: inputMessage
      });
      setInputMessage("");
    } catch (error) {
      console.error("Erro ao enviar:", error);
    } finally {
      setIsSending(false);
    }
  };



  useEffect(() => {
    if (isOpen && !currentConversation) {
      loadOrCreateConversation();
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center z-50 transition-all hover:scale-110"
        style={{ 
          background: `linear-gradient(135deg, ${widgetColor} 0%, ${widgetColor}dd 100%)`,
          animation: 'pulse 2s infinite'
        }}
        aria-label="Abrir chat com Clara"
      >
        <MessageCircle className="w-7 h-7 text-white" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl flex flex-col transition-all ${
        isMinimized ? "w-80 h-16" : "w-96 h-[600px]"
      }`}
      style={{ maxWidth: "calc(100vw - 3rem)", border: `2px solid ${widgetColor}40` }}
    >
      {/* Header */}
      <div 
        className="text-white p-4 rounded-t-2xl flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${widgetColor} 0%, ${widgetColor}dd 100%)` }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base">Clara - IA</h3>
            <div className="flex items-center gap-1.5 text-xs text-white/90">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Online agora
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label={isMinimized ? "Maximizar" : "Minimizar"}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                {!currentConversation ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: widgetColor }} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div
                      className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${widgetColor} 0%, ${widgetColor}dd 100%)` }}
                    >
                      <MessageCircle className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-base font-semibold text-gray-800 mb-2">{greeting}</p>
                    <p className="text-sm text-gray-600">Como posso ajudar você hoje?</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${widgetColor} 0%, ${widgetColor}dd 100%)` }}
                        >
                          <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                          msg.role === "user"
                            ? "text-white"
                            : "bg-gray-50 border border-gray-200"
                        }`}
                        style={msg.role === "user" ? { background: `linear-gradient(135deg, ${widgetColor} 0%, ${widgetColor}dd 100%)` } : {}}
                      >
                        {msg.role === "user" ? (
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        ) : (
                          <ReactMarkdown
                            className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-700 leading-relaxed">{children}</p>,
                              ul: ({ children }) => <ul className="ml-4 list-disc text-gray-700 my-2">{children}</ul>,
                              ol: ({ children }) => <ol className="ml-4 list-decimal text-gray-700 my-2">{children}</ol>,
                              li: ({ children }) => <li className="mb-1 text-gray-700">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                              code: ({ inline, children }) =>
                                inline ? (
                                  <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: `${widgetColor}20`, color: widgetColor }}>{children}</code>
                                ) : (
                                  <code className="block p-3 rounded-lg bg-gray-100 text-xs font-mono my-2 overflow-x-auto">{children}</code>
                                ),
                              a: ({ children, href }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: widgetColor }}>
                                  {children}
                                </a>
                              )
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    disabled={isSending || !currentConversation}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 outline-none text-sm disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                    style={{ 
                      borderColor: inputMessage ? `${widgetColor}40` : '#e5e7eb',
                      ':focus': { borderColor: widgetColor, boxShadow: `0 0 0 3px ${widgetColor}20` }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSending || !currentConversation || !inputMessage.trim()}
                    className="px-5 py-3 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${widgetColor} 0%, ${widgetColor}dd 100%)` }}
                    aria-label="Enviar mensagem"
                  >
                    {isSending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
                <p className="text-xs text-center text-gray-400 mt-3">
                  Clara é uma IA - pode cometer erros ocasionalmente
                </p>
              </div>
        </>
      )}

      {/* Pulse Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 ${widgetColor}b3;
          }
          50% {
            box-shadow: 0 0 0 15px ${widgetColor}00;
          }
        }
      `}</style>
    </div>
  );
}