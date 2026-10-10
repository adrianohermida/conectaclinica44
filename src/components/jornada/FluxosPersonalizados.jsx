import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Save, X, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FluxosPersonalizados({ onSelecionar }) {
  const [fluxos, setFluxos] = useState([
    {
      id: "ortopedia",
      nome: "Ortopedia - Tratamento Conservador",
      especialidade: "Ortopedia",
      etapas: [
        { nome: "Consulta Inicial", duracao_dias: 1 },
        { nome: "Avaliação e Exames", duracao_dias: 7 },
        { nome: "Início Fisioterapia", duracao_dias: 2 },
        { nome: "Acompanhamento Semanal", duracao_dias: 21 },
        { nome: "Revisão Mensal", duracao_dias: 30 },
        { nome: "Alta Médica", duracao_dias: 1 }
      ]
    },
    {
      id: "fisioterapia",
      nome: "Fisioterapia - Reabilitação Pós-Cirurgia",
      especialidade: "Fisioterapia",
      etapas: [
        { nome: "Avaliação Pós-Operatória", duracao_dias: 1 },
        { nome: "Fase 1: Mobilização Passiva", duracao_dias: 14 },
        { nome: "Fase 2: Mobilização Ativa", duracao_dias: 21 },
        { nome: "Fase 3: Fortalecimento", duracao_dias: 30 },
        { nome: "Fase 4: Retorno às Atividades", duracao_dias: 30 },
        { nome: "Alta Fisioterapêutica", duracao_dias: 1 }
      ]
    },
    {
      id: "cardiologia",
      nome: "Cardiologia - Acompanhamento Hipertensão",
      especialidade: "Cardiologia",
      etapas: [
        { nome: "Consulta e Diagnóstico", duracao_dias: 1 },
        { nome: "Exames Basais", duracao_dias: 7 },
        { nome: "Ajuste de Medicação", duracao_dias: 15 },
        { nome: "Retorno 1º Mês", duracao_dias: 30 },
        { nome: "Retorno Trimestral", duracao_dias: 90 },
        { nome: "Manutenção Semestral", duracao_dias: 180 }
      ]
    }
  ]);

  const [editando, setEditando] = useState(false);
  const [novoFluxo, setNovoFluxo] = useState({
    nome: "",
    especialidade: "",
    etapas: [{ nome: "", duracao_dias: 1 }]
  });

  const adicionarEtapa = () => {
    setNovoFluxo({
      ...novoFluxo,
      etapas: [...novoFluxo.etapas, { nome: "", duracao_dias: 1 }]
    });
  };

  const removerEtapa = (index) => {
    const etapas = novoFluxo.etapas.filter((_, i) => i !== index);
    setNovoFluxo({ ...novoFluxo, etapas });
  };

  const salvarFluxo = () => {
    if (!novoFluxo.nome || !novoFluxo.especialidade) {
      alert("Preencha nome e especialidade");
      return;
    }

    const id = novoFluxo.nome.toLowerCase().replace(/\s+/g, "_");
    setFluxos([...fluxos, { id, ...novoFluxo }]);
    setEditando(false);
    setNovoFluxo({
      nome: "",
      especialidade: "",
      etapas: [{ nome: "", duracao_dias: 1 }]
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">Fluxos Personalizados por Especialidade</h3>
        <button
          onClick={() => setEditando(!editando)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Fluxo
        </button>
      </div>

      {editando && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-bold text-gray-800 mb-4">Criar Novo Fluxo</h4>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Fluxo</label>
              <Input
                value={novoFluxo.nome}
                onChange={(e) => setNovoFluxo({ ...novoFluxo, nome: e.target.value })}
                placeholder="Ex: Tratamento de Diabetes Tipo 2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Especialidade</label>
              <Input
                value={novoFluxo.especialidade}
                onChange={(e) => setNovoFluxo({ ...novoFluxo, especialidade: e.target.value })}
                placeholder="Ex: Endocrinologia"
              />
            </div>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">Etapas do Fluxo</label>
          {novoFluxo.etapas.map((etapa, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                value={etapa.nome}
                onChange={(e) => {
                  const etapas = [...novoFluxo.etapas];
                  etapas[index].nome = e.target.value;
                  setNovoFluxo({ ...novoFluxo, etapas });
                }}
                placeholder="Nome da etapa"
                className="flex-1"
              />
              <Input
                type="number"
                value={etapa.duracao_dias}
                onChange={(e) => {
                  const etapas = [...novoFluxo.etapas];
                  etapas[index].duracao_dias = parseInt(e.target.value);
                  setNovoFluxo({ ...novoFluxo, etapas });
                }}
                placeholder="Dias"
                className="w-24"
              />
              <button
                onClick={() => removerEtapa(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={adicionarEtapa}
            className="text-sm text-blue-600 hover:underline mb-4"
          >
            + Adicionar Etapa
          </button>

          <div className="flex gap-2">
            <button
              onClick={salvarFluxo}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar Fluxo
            </button>
            <button
              onClick={() => setEditando(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fluxos.map((fluxo) => (
          <div key={fluxo.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <GitBranch className="w-6 h-6 text-purple-600 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-bold text-gray-800">{fluxo.nome}</h4>
                <p className="text-xs text-gray-500">{fluxo.especialidade}</p>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs font-medium text-gray-600 mb-2">Etapas ({fluxo.etapas.length}):</p>
              <div className="space-y-1">
                {fluxo.etapas.slice(0, 3).map((etapa, idx) => (
                  <p key={idx} className="text-xs text-gray-700 flex items-center gap-2">
                    <span className="w-1 h-1 bg-purple-600 rounded-full"></span>
                    {etapa.nome}
                  </p>
                ))}
                {fluxo.etapas.length > 3 && (
                  <p className="text-xs text-gray-500">+{fluxo.etapas.length - 3} etapas</p>
                )}
              </div>
            </div>

            <button
              onClick={() => onSelecionar && onSelecionar(fluxo)}
              className="w-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-medium py-2 rounded-lg text-sm"
            >
              Usar este Fluxo
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}