import React, { useState, useMemo } from "react";
import { Search, Calendar, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function BuscaAvancada({ prontuarios, onResultados }) {
  const [filtros, setFiltros] = useState({
    texto: "",
    dataInicio: "",
    dataFim: "",
    medico: "",
    diagnostico: "",
    tipo: "todos"
  });

  const resultadosBusca = useMemo(() => {
    let resultados = prontuarios;

    if (filtros.texto) {
      const termo = filtros.texto.toLowerCase();
      resultados = resultados.filter(p =>
        p.paciente_nome?.toLowerCase().includes(termo) ||
        p.queixa_principal?.toLowerCase().includes(termo) ||
        p.hipotese_diagnostica?.toLowerCase().includes(termo) ||
        p.historia_doenca_atual?.toLowerCase().includes(termo) ||
        p.conduta?.toLowerCase().includes(termo)
      );
    }

    if (filtros.dataInicio) {
      resultados = resultados.filter(p => p.data_atendimento >= filtros.dataInicio);
    }

    if (filtros.dataFim) {
      resultados = resultados.filter(p => p.data_atendimento <= filtros.dataFim);
    }

    if (filtros.medico) {
      resultados = resultados.filter(p =>
        p.medico_nome?.toLowerCase().includes(filtros.medico.toLowerCase())
      );
    }

    if (filtros.diagnostico) {
      resultados = resultados.filter(p =>
        p.hipotese_diagnostica?.toLowerCase().includes(filtros.diagnostico.toLowerCase())
      );
    }

    if (filtros.tipo !== "todos") {
      resultados = resultados.filter(p => p.tipo_atendimento === filtros.tipo);
    }

    onResultados(resultados);
    return resultados;
  }, [prontuarios, filtros]);

  const limparFiltros = () => {
    setFiltros({
      texto: "",
      dataInicio: "",
      dataFim: "",
      medico: "",
      diagnostico: "",
      tipo: "todos"
    });
  };

  const filtrosAtivos = Object.values(filtros).filter(v => v && v !== "todos").length;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-blue-900">Busca Avançada</h3>
          </div>
          {filtrosAtivos > 0 && (
            <button
              onClick={limparFiltros}
              className="text-sm text-blue-700 hover:text-blue-800 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Limpar ({filtrosAtivos})
            </button>
          )}
        </div>
        <p className="text-sm text-blue-800">
          {resultadosBusca.length} resultado(s) encontrado(s)
        </p>
      </div>

      {/* Busca de Texto Livre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Busca em Todo o Conteúdo
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={filtros.texto}
            onChange={(e) => setFiltros({ ...filtros, texto: e.target.value })}
            placeholder="Buscar em queixas, diagnósticos, condutas..."
            className="pl-10 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Filtros de Data */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Início
          </label>
          <Input
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
            className="border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Fim
          </label>
          <Input
            type="date"
            value={filtros.dataFim}
            onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
            className="border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Filtros Adicionais */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Médico
          </label>
          <Input
            value={filtros.medico}
            onChange={(e) => setFiltros({ ...filtros, medico: e.target.value })}
            placeholder="Nome do médico"
            className="border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Diagnóstico (CID)
          </label>
          <Input
            value={filtros.diagnostico}
            onChange={(e) => setFiltros({ ...filtros, diagnostico: e.target.value })}
            placeholder="Buscar por diagnóstico"
            className="border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Tipo de Atendimento */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Atendimento
        </label>
        <select
          value={filtros.tipo}
          onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
          className="w-full border border-gray-300 rounded-lg p-2"
        >
          <option value="todos">Todos os tipos</option>
          <option value="consulta">Consulta</option>
          <option value="retorno">Retorno</option>
          <option value="procedimento">Procedimento</option>
          <option value="exame">Exame</option>
          <option value="teleconsulta">Teleconsulta</option>
        </select>
      </div>

    </div>
  );
}