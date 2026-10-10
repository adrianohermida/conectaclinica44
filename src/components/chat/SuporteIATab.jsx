import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function SuporteIATab({ user, onClose }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!conversation && user) {
      initConversation();
    }
  }, [user]);

  useEffect(() => {
    if (!conversation) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: "suporte_ia",
        metadata: {
          usuario_nome: user.full_name,
          usuario_email: user.email,
          clinica_id: user.clinica_id
        }
      });
      setConversation(conv);
      setMessages([]);
    } catch (error) {
      console.error("Erro ao iniciar suporte:", error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !conversation || sending) return;

    setSending(true);
    try {
      await base44.agents.addMessage(conversation, {
        role: "user",
        content: input
      });
      setInput("");
    } catch (error) {
      console.error("Erro ao enviar:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!conversation ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
              <MessageCircle className="w-8 h-8" style={{ color: '#7E57FF' }} />
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-2">Suporte Técnico ConectaClínica</p>
            <p className="text-xs text-gray-600">Como posso ajudar você?</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.role === "user";
            return (
              <div key={idx} className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {!isMine && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7E57FF' }}>
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                )}
                <div 
                  className={`max-w-[85%] rounded-lg p-3 ${isMine ? 'text-white' : 'bg-gray-100'}`}
                  style={isMine ? { backgroundColor: '#7E57FF' } : {}}
                >
                  {isMine ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                    <ReactMarkdown className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua dúvida..."
            disabled={sending || !conversation}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 outline-none text-sm disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={sending || !conversation || !input.trim()}
            className="px-4 py-2 rounded-xl text-white font-medium text-sm disabled:opacity-50"
            style={{ backgroundColor: '#7E57FF' }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}