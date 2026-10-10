import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, X, Send, Minimize2, Maximize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me()
  });

  useEffect(() => {
    if (isOpen && !currentConversation) {
      loadOrCreateConversation();
    }
  }, [isOpen]);

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
      const conversations = await base44.agents.listConversations({
        agent_name: "assistente_prevenclin"
      });

      if (conversations.length > 0) {
        const conv = await base44.agents.getConversation(conversations[0].id);
        setCurrentConversation(conv);
        setMessages(conv.messages || []);
      } else {
        const newConv = await base44.agents.createConversation({
          agent_name: "assistente_prevenclin",
          metadata: {
            name: `Chat ${new Date().toLocaleDateString()}`,
            usuario: user?.full_name || "Usuário"
          }
        });
        setCurrentConversation(newConv);
        setMessages([]);
      }
    } catch (error) {
      console.error("Erro ao carregar conversa:", error);
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#0B7A9E] hover:bg-[#0a6582] text-white rounded-full shadow-lg flex items-center justify-center z-50"
        aria-label="Abrir chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col ${
        isMinimized ? "w-80 h-16" : "w-96 h-[600px]"
      }`}
      style={{ maxWidth: "calc(100vw - 3rem)" }}
    >
      {/* Header */}
      <div className="bg-[#0B7A9E] text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Assistente PrevenClin</h3>
            <p className="text-xs text-white/80">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/10 rounded"
            aria-label={isMinimized ? "Maximizar" : "Minimizar"}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/10 rounded"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Como posso ajudar?</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-[#0B7A9E] flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-[#0B7A9E] text-white"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm">{msg.content}</p>
                    ) : (
                      <ReactMarkdown
                        className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-700">{children}</p>,
                          ul: ({ children }) => <ul className="ml-4 list-disc text-gray-700">{children}</ul>,
                          ol: ({ children }) => <ol className="ml-4 list-decimal text-gray-700">{children}</ol>,
                          li: ({ children }) => <li className="mb-1 text-gray-700">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
                          code: ({ inline, children }) =>
                            inline ? (
                              <code className="px-1 py-0.5 rounded bg-gray-100 text-xs">{children}</code>
                            ) : (
                              <code className="block p-2 rounded bg-gray-100 text-xs">{children}</code>
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

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B7A9E]"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={isSending || !inputMessage.trim()}
                className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white p-2 rounded-lg disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}