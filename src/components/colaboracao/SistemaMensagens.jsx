import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Paperclip, X, Eye, Download, CheckCheck, Circle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SistemaMensagens({ colaboracaoId, medicoAtual }) {
  const [mensagem, setMensagem] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [arquivos, setArquivos] = useState([]);
  const mensagensRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: mensagens = [] } = useQuery({
    queryKey: ["mensagens", colaboracaoId],
    queryFn: () => base44.entities.Mensagem.filter({ colaboracao_id: colaboracaoId }),
    refetchInterval: 3000, // Atualiza a cada 3 segundos
    staleTime: 1000
  });

  const createMensagemMutation = useMutation({
    mutationFn: (data) => base44.entities.Mensagem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["mensagens", colaboracaoId]);
      setMensagem("");
      setArquivos([]);
    }
  });

  const marcarComoLida = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Mensagem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["mensagens", colaboracaoId]);
    }
  });

  useEffect(() => {
    // Auto-scroll para última mensagem
    if (mensagensRef.current) {
      mensagensRef.current.scrollTop = mensagensRef.current.scrollHeight;
    }

    // Marcar mensagens não lidas como lidas
    mensagens.forEach(msg => {
      if (!msg.lida && msg.destinatario_nome === medicoAtual) {
        marcarComoLida.mutate({ id: msg.id, data: { ...msg, lida: true } });
      }
    });
  }, [mensagens]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo: 10MB");
      return;
    }

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setArquivos([...arquivos, { nome: file.name, url: file_url }]);
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      alert("Erro ao anexar arquivo");
    } finally {
      setUploadingFile(false);
      e.target.value = null;
    }
  };

  const enviarMensagem = () => {
    if (!mensagem.trim() && arquivos.length === 0) return;

    createMensagemMutation.mutate({
      colaboracao_id: colaboracaoId,
      remetente_nome: medicoAtual || "Sistema",
      destinatario_nome: "Equipe Médica",
      mensagem: mensagem,
      tipo: "interna",
      prioridade: "normal",
      lida: false,
      arquivos: arquivos.map(a => a.url)
    });
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg border border-gray-200">
      {/* Cabeçalho */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-bold text-gray-800">💬 Discussão do Caso</h3>
        <p className="text-xs text-gray-600 mt-1">
          {mensagens.length} mensagem(ns) • Atualização em tempo real
        </p>
      </div>

      {/* Área de Mensagens */}
      <div ref={mensagensRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {mensagens.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">Nenhuma mensagem ainda. Inicie a discussão!</p>
          </div>
        ) : (
          mensagens.map((msg) => {
            const isOwn = msg.remetente_nome === medicoAtual;
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  isOwn ? "bg-[#0B7A9E] text-white" : "bg-gray-100 text-gray-800"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-xs font-medium ${isOwn ? "text-blue-100" : "text-gray-600"}`}>
                      {msg.remetente_nome}
                    </p>
                    <p className={`text-xs ${isOwn ? "text-blue-200" : "text-gray-500"}`}>
                      {format(new Date(msg.created_date), "HH:mm", { locale: ptBR })}
                    </p>
                    {isOwn && (
                      msg.lida ? <CheckCheck className="w-3 h-3 text-blue-200" /> : <Circle className="w-3 h-3 text-blue-200" />
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-line">{msg.mensagem}</p>
                  
                  {msg.arquivos?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.arquivos.map((arq, idx) => (
                        <a
                          key={idx}
                          href={arq}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs flex items-center gap-1 ${
                            isOwn ? "text-blue-100 hover:text-white" : "text-blue-600 hover:text-blue-800"
                          }`}
                        >
                          <Paperclip className="w-3 h-3" />
                          Anexo {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Anexos Pendentes */}
      {arquivos.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {arquivos.map((arq, idx) => (
              <div key={idx} className="bg-blue-50 border border-blue-200 rounded px-3 py-1 flex items-center gap-2">
                <Paperclip className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-blue-800">{arq.nome}</span>
                <button
                  onClick={() => setArquivos(arquivos.filter((_, i) => i !== idx))}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input de Mensagem */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
            id={`file-upload-${colaboracaoId}`}
            disabled={uploadingFile}
          />
          <label
            htmlFor={`file-upload-${colaboracaoId}`}
            className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg cursor-pointer flex items-center justify-center"
          >
            <Paperclip className="w-5 h-5 text-gray-600" />
          </label>
          <input
            type="text"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && enviarMensagem()}
            placeholder="Digite sua mensagem..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B7A9E]"
          />
          <button
            onClick={enviarMensagem}
            disabled={!mensagem.trim() && arquivos.length === 0}
            className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white p-2 rounded-lg disabled:opacity-50 flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}