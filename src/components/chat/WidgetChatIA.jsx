import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { MessageCircle, X, Send, Headphones, Users, Building2 } from "lucide-react";

export default function WidgetChatIA({ user }) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState("suporte"); // suporte, equipe, paciente
  const [mensagens, setMensagens] = useState([]);
  const [input, setInput] = useState("");

  const modos = [
    { id: "suporte", label: "Suporte Plataforma", icon: Headphones, color: "#7E57FF" },
    { id: "equipe", label: "Equipe Interna", icon: Users, color: "#0B7A9E" },
    { id: "paciente", label: "Paciente", icon: Building2, color: "#34a853" }
  ];

  const abrirTicketSuporte = useMutation({
    mutationFn: async () => {
      const historico = mensagens.map(m => `${m.role}: ${m.content}`).join("\n\n");
      await base44.entities.Ticket.create({
        clinica_id: user.clinica_id,
        paciente_nome: user.full_name,
        assunto: "Conversa transferida do chat",
        categoria: "duvida_tecnica",
        descricao: historico || "Solicitação de suporte via chat",
        status: "aberto"
      });

      await base44.integrations.Core.SendEmail({
        to: "suporte@conectaclinica.com.br",
        subject: `[Ticket Chat] ${user.full_name}`,
        body: historico || "Novo ticket"
      });

      setMensagens(prev => [...prev, {
        role: "system",
        content: "✅ Ticket criado! Nossa equipe responderá em breve."
      }]);
    }
  });

  const enviarMensagem = () => {
    if (!input.trim()) return;

    const novaMensagem = { role: "user", content: input };
    setMensagens(prev => [...prev, novaMensagem]);
    setInput("");

    // Simulação de resposta (integrar com agente depois)
    setTimeout(() => {
      if (modo === "suporte") {
        setMensagens(prev => [...prev, {
          role: "assistant",
          content: "Entendido! Vou ajudar com isso. Se precisar de ajuda humana, clique em 'Abrir Ticket' acima."
        }]);
      }
    }, 1000);
  };

  return (
    <>
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="fixed bottom-20 lg:bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50"
          style={{ backgroundColor: '#7E57FF' }}
          aria-label="Chat"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
      )}

      {aberto && (
        <div className="fixed bottom-20 lg:bottom-6 right-6 w-full lg:w-96 h-[600px] max-w-md bg-white rounded-2xl shadow-2xl z-50 flex flex-col mx-4 lg:mx-0">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between" style={{ backgroundColor: '#7E57FF' }}>
            <span className="font-bold text-white">ConectaClínica Chat</span>
            <button onClick={() => setAberto(false)} className="text-white hover:opacity-80">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modos */}
          <div className="p-3 border-b bg-gray-50 flex gap-2">
            {modos.map(m => (
              <button
                key={m.id}
                onClick={() => setModo(m.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  modo === m.id ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={modo === m.id ? { backgroundColor: m.color } : {}}
              >
                <m.icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mensagens.length === 0 && (
              <div className="text-center text-gray-500 text-sm mt-8">
                {modo === "suporte" && "Chat com suporte da plataforma"}
                {modo === "equipe" && "Chat com sua equipe interna"}
                {modo === "paciente" && "Chat com pacientes"}
              </div>
            )}
            {mensagens.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === 'user' ? 'text-white' : msg.role === 'system' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-800'
                }`}
                style={msg.role === 'user' ? { backgroundColor: '#7E57FF' } : {}}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          {modo === "suporte" && mensagens.length > 0 && (
            <div className="px-3 pb-2">
              <button
                onClick={() => abrirTicketSuporte.mutate()}
                disabled={abrirTicketSuporte.isPending}
                className="w-full text-xs font-medium py-2 rounded-lg hover:opacity-80"
                style={{ backgroundColor: '#f5f3ff', color: '#7E57FF' }}
              >
                📩 Abrir Ticket Suporte
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
                placeholder="Digite sua mensagem..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7E57FF]"
              />
              <button
                onClick={enviarMensagem}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#7E57FF' }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}