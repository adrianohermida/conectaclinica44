import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, ThumbsUp, AlertCircle, CheckCircle, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DiscussaoCaso({ colaboracao, onAtualizado }) {
  const [novaResposta, setNovaResposta] = useState({
    resposta: "",
    recomendacoes: [""]
  });
  const [respondendo, setRespondendo] = useState(false);

  const adicionarRecomendacao = () => {
    setNovaResposta({
      ...novaResposta,
      recomendacoes: [...novaResposta.recomendacoes, ""]
    });
  };

  const atualizarRecomendacao = (index, valor) => {
    const novas = [...novaResposta.recomendacoes];
    novas[index] = valor;
    setNovaResposta({ ...novaResposta, recomendacoes: novas });
  };

  const enviarResposta = async () => {
    if (!novaResposta.resposta.trim()) {
      alert("Digite uma resposta");
      return;
    }

    setRespondendo(true);
    try {
      const user = await base44.auth.me();
      const resposta = {
        medico: user.full_name || user.email,
        data: new Date().toISOString(),
        resposta: novaResposta.resposta,
        recomendacoes: novaResposta.recomendacoes.filter(r => r.trim()),
        referencias: [],
        votos: 0
      };

      const respostasAtualizadas = [...(colaboracao.respostas || []), resposta];

      await base44.entities.ColaboracaoMedica.update(colaboracao.id, {
        ...colaboracao,
        respostas: respostasAtualizadas,
        status: "em_discussao"
      });

      setNovaResposta({ resposta: "", recomendacoes: [""] });
      alert("✅ Resposta adicionada com sucesso!");
      if (onAtualizado) onAtualizado();
    } catch (error) {
      console.error("Erro ao enviar resposta:", error);
      alert("Erro ao enviar resposta");
    } finally {
      setRespondendo(false);
    }
  };

  const votarResposta = async (indexResposta) => {
    const respostas = [...colaboracao.respostas];
    respostas[indexResposta].votos = (respostas[indexResposta].votos || 0) + 1;

    await base44.entities.ColaboracaoMedica.update(colaboracao.id, {
      ...colaboracao,
      respostas
    });

    if (onAtualizado) onAtualizado();
  };

  const marcarComoConsenso = async (resposta) => {
    await base44.entities.ColaboracaoMedica.update(colaboracao.id, {
      ...colaboracao,
      consenso: resposta.resposta,
      status: "resolvido"
    });

    alert("✅ Marcado como consenso!");
    if (onAtualizado) onAtualizado();
  };

  return (
    <div className="space-y-4">
      {/* Respostas Existentes */}
      {colaboracao.respostas?.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-800">💬 Discussão ({colaboracao.respostas.length} resposta(s))</h3>
          {colaboracao.respostas
            .sort((a, b) => (b.votos || 0) - (a.votos || 0))
            .map((resp, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0B7A9E] flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{resp.medico}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(resp.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => votarResposta(idx)}
                      className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-3 py-1 rounded-lg"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-sm font-medium">{resp.votos || 0}</span>
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-700 whitespace-pre-line mb-3">{resp.resposta}</p>

                {resp.recomendacoes?.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200 mb-3">
                    <p className="text-xs font-medium text-green-900 mb-2">✅ Recomendações:</p>
                    <ul className="space-y-1">
                      {resp.recomendacoes.map((rec, i) => (
                        <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                          <span className="text-green-600">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {colaboracao.status !== "resolvido" && (
                  <button
                    onClick={() => marcarComoConsenso(resp)}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar como Consenso
                  </button>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Consenso Estabelecido */}
      {colaboracao.consenso && (
        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-500">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-green-900 mb-2">✅ Consenso Estabelecido</h3>
              <p className="text-sm text-green-800 whitespace-pre-line">{colaboracao.consenso}</p>
            </div>
          </div>
        </div>
      )}

      {/* Formulário Nova Resposta */}
      {colaboracao.status !== "fechado" && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-3">Adicionar Resposta</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sua Opinião *</label>
              <textarea
                value={novaResposta.resposta}
                onChange={(e) => setNovaResposta({ ...novaResposta, resposta: e.target.value })}
                placeholder="Descreva sua análise e opinião sobre o caso..."
                className="w-full border border-gray-300 rounded-lg p-3 resize-none"
                rows="5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recomendações Clínicas</label>
              {novaResposta.recomendacoes.map((rec, idx) => (
                <div key={idx} className="mb-2">
                  <input
                    type="text"
                    value={rec}
                    onChange={(e) => atualizarRecomendacao(idx, e.target.value)}
                    placeholder={`Recomendação ${idx + 1}`}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={adicionarRecomendacao}
                className="text-sm text-blue-600 hover:underline"
              >
                + Adicionar recomendação
              </button>
            </div>

            <button
              onClick={enviarResposta}
              disabled={respondendo || !novaResposta.resposta.trim()}
              className="w-full bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {respondendo ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  Enviar Resposta
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}