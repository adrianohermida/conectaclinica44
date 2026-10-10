import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Search, Paperclip, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

export default function CaixaEntrada({ userId, userName }) {
  const [busca, setBusca] = useState("");
  const [mensagemSelecionada, setMensagemSelecionada] = useState(null);
  const [resposta, setResposta] = useState("");
  const queryClient = useQueryClient();

  const { data: mensagensRecebidas = [] } = useQuery({
    queryKey: ["mensagens-recebidas", userId],
    queryFn: () => base44.entities.MensagemInterna.filter({ destinatario_id: userId }, "-created_date"),
    staleTime: 30 * 1000
  });

  const { data: mensagensEnviadas = [] } = useQuery({
    queryKey: ["mensagens-enviadas", userId],
    queryFn: () => base44.entities.MensagemInterna.filter({ remetente_id: userId }, "-created_date"),
    staleTime: 30 * 1000
  });

  const marcarLidaMutation = useMutation({
    mutationFn: (id) => base44.entities.MensagemInterna.update(id, { lida: true, data_leitura: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries(["mensagens-recebidas"]);
    }
  });

  const responderMutation = useMutation({
    mutationFn: (data) => base44.entities.MensagemInterna.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["mensagens-enviadas"]);
      setResposta("");
      setMensagemSelecionada(null);
    }
  });

  const handleSelecionarMensagem = (msg) => {
    setMensagemSelecionada(msg);
    if (!msg.lida && msg.destinatario_id === userId) {
      marcarLidaMutation.mutate(msg.id);
    }
  };

  const handleResponder = () => {
    if (!resposta.trim()) return;

    responderMutation.mutate({
      remetente_id: userId,
      remetente_nome: userName,
      destinatario_id: mensagemSelecionada.remetente_id,
      destinatario_nome: mensagemSelecionada.remetente_nome,
      assunto: `Re: ${mensagemSelecionada.assunto}`,
      mensagem: resposta,
      em_resposta_a: mensagemSelecionada.id
    });
  };

  const todasMensagens = [...mensagensRecebidas, ...mensagensEnviadas]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .filter(m => 
      !busca || 
      m.assunto?.toLowerCase().includes(busca.toLowerCase()) ||
      m.mensagem?.toLowerCase().includes(busca.toLowerCase()) ||
      m.remetente_nome?.toLowerCase().includes(busca.toLowerCase())
    );

  const naoLidas = mensagensRecebidas.filter(m => !m.lida).length;

  return (
    <div className="grid md:grid-cols-3 gap-4 h-[600px]">
      {/* Lista de Mensagens */}
      <div className="md:col-span-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">Mensagens</h3>
            {naoLidas > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {naoLidas}
              </span>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {todasMensagens.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Nenhuma mensagem</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {todasMensagens.map((msg) => {
                const isRecebida = msg.destinatario_id === userId;
                const selecionada = mensagemSelecionada?.id === msg.id;

                return (
                  <button
                    key={msg.id}
                    onClick={() => handleSelecionarMensagem(msg)}
                    className={`w-full p-3 text-left hover:bg-gray-50 ${selecionada ? "bg-blue-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className={`text-sm font-medium ${!msg.lida && isRecebida ? "text-gray-900" : "text-gray-700"}`}>
                        {isRecebida ? msg.remetente_nome : msg.destinatario_nome}
                      </p>
                      {!msg.lida && isRecebida && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className={`text-xs mb-1 truncate ${!msg.lida && isRecebida ? "font-medium text-gray-800" : "text-gray-600"}`}>
                      {msg.assunto}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(msg.created_date), "dd/MM HH:mm")}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo da Mensagem */}
      <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        {!mensagemSelecionada ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Selecione uma mensagem</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 mb-2">{mensagemSelecionada.assunto}</h3>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  <p>De: {mensagemSelecionada.remetente_nome}</p>
                  <p>Para: {mensagemSelecionada.destinatario_nome}</p>
                </div>
                <p>{format(new Date(mensagemSelecionada.created_date), "dd/MM/yyyy HH:mm")}</p>
              </div>
            </div>

            {/* Corpo */}
            <div className="flex-1 p-4 overflow-y-auto">
              <p className="text-gray-700 whitespace-pre-wrap">{mensagemSelecionada.mensagem}</p>
            </div>

            {/* Responder */}
            {mensagemSelecionada.destinatario_id === userId && (
              <div className="p-4 border-t border-gray-200">
                <Textarea
                  placeholder="Digite sua resposta..."
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  rows={3}
                  className="mb-3"
                />
                <button
                  onClick={handleResponder}
                  disabled={!resposta.trim() || responderMutation.isPending}
                  className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Responder
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}