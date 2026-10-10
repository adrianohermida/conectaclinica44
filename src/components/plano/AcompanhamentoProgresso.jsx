import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, CheckCircle, Clock, AlertCircle, Plus, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AcompanhamentoProgresso({ plano, onAtualizar }) {
  const [novaEvolucao, setNovaEvolucao] = useState("");
  const [adicionandoEvolucao, setAdicionandoEvolucao] = useState(false);

  const adicionarEvolucao = async () => {
    if (!novaEvolucao.trim()) return;

    try {
      const user = await base44.auth.me();
      
      const evolucaoAtualizada = [
        ...(plano.evolucao || []),
        {
          data: format(new Date(), "yyyy-MM-dd"),
          observacao: novaEvolucao,
          profissional: user.full_name || plano.medico_responsavel
        }
      ];

      await base44.entities.PlanoTratamento.update(plano.id, {
        ...plano,
        evolucao: evolucaoAtualizada
      });

      setNovaEvolucao("");
      if (onAtualizar) onAtualizar();
    } catch (error) {
      console.error("Erro ao adicionar evolução:", error);
      alert("Erro ao adicionar evolução");
    }
  };

  const marcarMetaAlcancada = async (metaIndex, alcancada) => {
    const metasAtualizadas = [...(plano.metas || [])];
    metasAtualizadas[metaIndex] = {
      ...metasAtualizadas[metaIndex],
      alcancada: alcancada
    };

    const metasAlcancadas = metasAtualizadas.filter(m => m.alcancada).length;
    const novoProgresso = Math.round((metasAlcancadas / metasAtualizadas.length) * 100);

    await base44.entities.PlanoTratamento.update(plano.id, {
      ...plano,
      metas: metasAtualizadas,
      progresso_percentual: novoProgresso
    });

    if (onAtualizar) onAtualizar();
  };

  const atualizarStatusTratamento = async (tratIndex, novoStatus) => {
    const tratamentosAtualizados = [...(plano.tratamentos || [])];
    tratamentosAtualizados[tratIndex] = {
      ...tratamentosAtualizados[tratIndex],
      status: novoStatus
    };

    await base44.entities.PlanoTratamento.update(plano.id, {
      ...plano,
      tratamentos: tratamentosAtualizados
    });

    if (onAtualizar) onAtualizar();
  };

  const marcarExameRealizado = async (exameIndex, realizado) => {
    const examesAtualizados = [...(plano.exames_acompanhamento || [])];
    examesAtualizados[exameIndex] = {
      ...examesAtualizados[exameIndex],
      realizado: realizado
    };

    await base44.entities.PlanoTratamento.update(plano.id, {
      ...plano,
      exames_acompanhamento: examesAtualizados
    });

    if (onAtualizar) onAtualizar();
  };

  return (
    <div className="space-y-6">
      {/* Progresso Geral */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">Progresso Geral</h3>
          <span className="text-2xl font-bold text-[#0B7A9E]">
            {plano.progresso_percentual || 0}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#0B7A9E] to-[#58B4D4] h-full rounded-full transition-all"
            style={{ width: `${plano.progresso_percentual || 0}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Tratamentos</p>
            <p className="text-lg font-bold text-gray-800">
              {plano.tratamentos?.filter(t => t.status === "concluido").length || 0}/
              {plano.tratamentos?.length || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Exames</p>
            <p className="text-lg font-bold text-gray-800">
              {plano.exames_acompanhamento?.filter(e => e.realizado).length || 0}/
              {plano.exames_acompanhamento?.length || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Metas</p>
            <p className="text-lg font-bold text-gray-800">
              {plano.metas?.filter(m => m.alcancada).length || 0}/
              {plano.metas?.length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Tratamentos com Atualização de Status */}
      {plano.tratamentos && plano.tratamentos.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">Tratamentos</h3>
          <div className="space-y-3">
            {plano.tratamentos.map((trat, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{trat.tipo}</h4>
                    <p className="text-sm text-gray-600">{trat.descricao}</p>
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      {trat.frequencia && <span>📅 {trat.frequencia}</span>}
                      {trat.duracao && <span>⏱️ {trat.duracao}</span>}
                    </div>
                  </div>
                  <select
                    value={trat.status || "pendente"}
                    onChange={(e) => atualizarStatusTratamento(idx, e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metas com Checkbox */}
      {plano.metas && plano.metas.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">Metas Terapêuticas</h3>
          <div className="space-y-3">
            {plano.metas.map((meta, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <input
                  type="checkbox"
                  checked={meta.alcancada || false}
                  onChange={(e) => marcarMetaAlcancada(idx, e.target.checked)}
                  className="w-5 h-5 mt-0.5 cursor-pointer"
                />
                <div className="flex-1">
                  <p className={`font-medium ${meta.alcancada ? "text-green-700 line-through" : "text-gray-800"}`}>
                    {meta.descricao}
                  </p>
                  {meta.prazo && (
                    <p className="text-sm text-gray-600 mt-1">
                      Prazo: {format(new Date(meta.prazo), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exames com Checkbox */}
      {plano.exames_acompanhamento && plano.exames_acompanhamento.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">Exames de Acompanhamento</h3>
          <div className="space-y-3">
            {plano.exames_acompanhamento.map((exame, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <input
                  type="checkbox"
                  checked={exame.realizado || false}
                  onChange={(e) => marcarExameRealizado(idx, e.target.checked)}
                  className="w-5 h-5 mt-0.5 cursor-pointer"
                />
                <div className="flex-1">
                  <p className={`font-medium ${exame.realizado ? "text-green-700" : "text-gray-800"}`}>
                    {exame.exame}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Frequência: {exame.frequencia}</p>
                  {exame.proximo && (
                    <p className="text-xs text-blue-600 mt-1">
                      Próximo: {format(new Date(exame.proximo), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evolução do Tratamento */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-4">Evolução do Tratamento</h3>
        
        {/* Adicionar Nova Evolução */}
        <div className="mb-4 space-y-3">
          <textarea
            value={novaEvolucao}
            onChange={(e) => setNovaEvolucao(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 resize-none"
            rows="3"
            placeholder="Registre a evolução do paciente..."
          />
          <button
            onClick={adicionarEvolucao}
            disabled={!novaEvolucao.trim()}
            className="w-full bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Adicionar Evolução
          </button>
        </div>

        {/* Lista de Evoluções */}
        {plano.evolucao && plano.evolucao.length > 0 ? (
          <div className="space-y-3">
            {plano.evolucao.map((evo, idx) => (
              <div key={idx} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-gray-800">{evo.observacao}</p>
                </div>
                <div className="flex gap-3 text-xs text-blue-700">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(evo.data), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                  <span>👨‍⚕️ {evo.profissional}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4 text-sm">Nenhuma evolução registrada</p>
        )}
      </div>
    </div>
  );
}