import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { createPageUrl } from "@/utils";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Edit,
  History,
  TrendingUp,
  TrendingDown,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

export default function GerenciamentoPrecos() {
  usePerformanceTracker('/GerenciamentoPrecos');
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showHistoricoPanel, setShowHistoricoPanel] = useState(false);
  const [conectorSelecionado, setConectorSelecionado] = useState(null);
  const queryClient = useQueryClient();

  const { data: conectores = [] } = useOptimizedQuery({
    queryKey: ["conectores"],
    queryFn: () => base44.entities.Conector.list()
  });

  const { data: historico = [] } = useOptimizedQuery({
    queryKey: ["historicoPrecos"],
    queryFn: () => base44.entities.HistoricoPrecoConector.list("-created_date")
  });

  const [formPreco, setFormPreco] = useState({
    preco_consulta: 0,
    motivo_alteracao: "",
    data_vigencia: format(new Date(), "yyyy-MM-dd")
  });

  const updatePrecoMutation = useMutation({
    mutationFn: async ({ conector, novoPreco, motivo, dataVigencia }) => {
      const user = await base44.auth.me();
      
      // Registrar no histórico
      const variacao = conector.preco_consulta > 0
        ? ((novoPreco - conector.preco_consulta) / conector.preco_consulta * 100)
        : 0;

      await base44.entities.HistoricoPrecoConector.create({
        conector_id: conector.id,
        conector_nome: conector.nome,
        preco_anterior: conector.preco_consulta || 0,
        preco_novo: novoPreco,
        variacao_percentual: variacao,
        motivo_alteracao: motivo,
        usuario_responsavel: user.email,
        data_vigencia: dataVigencia,
        fonte: "manual"
      });

      // Atualizar conector
      await base44.entities.Conector.update(conector.id, {
        ...conector,
        preco_consulta: novoPreco
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["conectores"]);
      queryClient.invalidateQueries(["historicoPrecos"]);
      setShowEditPanel(false);
      setConectorSelecionado(null);
    }
  });

  const handleEditPreco = (conector) => {
    setConectorSelecionado(conector);
    setFormPreco({
      preco_consulta: conector.preco_consulta || 0,
      motivo_alteracao: "",
      data_vigencia: format(new Date(), "yyyy-MM-dd")
    });
    setShowEditPanel(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updatePrecoMutation.mutate({
      conector: conectorSelecionado,
      novoPreco: parseFloat(formPreco.preco_consulta),
      motivo: formPreco.motivo_alteracao,
      dataVigencia: formPreco.data_vigencia
    });
  };

  const verHistorico = (conector) => {
    setConectorSelecionado(conector);
    setShowHistoricoPanel(true);
  };

  const historicoConector = conectorSelecionado
    ? historico.filter(h => h.conector_id === conectorSelecionado.id)
    : [];

  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
      <PageHeader
        title="Preços API"
        description="Gestão de preços"
        breadcrumbs={[
          { label: "Administração", href: createPageUrl("Administracao") },
          { label: "Configuração APIs", href: createPageUrl("ConfiguracaoIntegracoes") },
          { label: "Preços" }
        ]}
      />

      {/* Estatísticas */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Conectores</p>
              <p className="text-2xl font-bold text-gray-800">{conectores.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Preço Médio</p>
              <p className="text-2xl font-bold text-green-700">
                R$ {conectores.length > 0 
                  ? (conectores.reduce((acc, c) => acc + (c.preco_consulta || 0), 0) / conectores.length).toFixed(4)
                  : "0.0000"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <History className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Alterações (30d)</p>
              <p className="text-2xl font-bold text-purple-700">{historico.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Maior Preço</p>
              <p className="text-2xl font-bold text-orange-700">
                R$ {Math.max(...conectores.map(c => c.preco_consulta || 0)).toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Conectores com Preços */}
      <div className="space-y-3">
        {conectores.map((conector) => {
          const historicoConector = historico.filter(h => h.conector_id === conector.id);
          const ultimaAlteracao = historicoConector[0];
          
          return (
            <div key={conector.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-gray-800">{conector.nome}</h3>
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                      {conector.codigo}
                    </span>
                  </div>
                  
                  <div className="flex items-baseline gap-3">
                    <p className="text-3xl font-bold text-[#0B7A9E]">
                      R$ {(conector.preco_consulta || 0).toFixed(4)}
                    </p>
                    <span className="text-sm text-gray-600">por consulta</span>
                  </div>

                  {ultimaAlteracao && (
                    <div className="mt-3 flex items-center gap-2">
                      {ultimaAlteracao.variacao_percentual > 0 ? (
                        <TrendingUp className="w-4 h-4 text-red-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-green-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        ultimaAlteracao.variacao_percentual > 0 ? "text-red-600" : "text-green-600"
                      }`}>
                        {ultimaAlteracao.variacao_percentual > 0 ? "+" : ""}
                        {ultimaAlteracao.variacao_percentual.toFixed(2)}%
                      </span>
                      <span className="text-xs text-gray-500">
                        última alteração em {format(new Date(ultimaAlteracao.created_date), "dd/MM/yyyy")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditPreco(conector)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Alterar Preço
                  </button>
                  <button
                    onClick={() => verHistorico(conector)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm flex items-center gap-1"
                  >
                    <History className="w-4 h-4" />
                    Histórico
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel Editar Preço */}
      <SlideInPanel
        open={showEditPanel}
        onClose={() => setShowEditPanel(false)}
        title={`Alterar Preço - ${conectorSelecionado?.nome}`}
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700">
              Preço atual: <strong className="text-[#0B7A9E]">R$ {(conectorSelecionado?.preco_consulta || 0).toFixed(4)}</strong>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Novo Preço por Consulta (R$) *
            </label>
            <Input
              type="number"
              step="0.0001"
              value={formPreco.preco_consulta}
              onChange={(e) => setFormPreco({ ...formPreco, preco_consulta: e.target.value })}
              className="border-gray-300"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Vigência *
            </label>
            <Input
              type="date"
              value={formPreco.data_vigencia}
              onChange={(e) => setFormPreco({ ...formPreco, data_vigencia: e.target.value })}
              className="border-gray-300"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo da Alteração *
            </label>
            <textarea
              value={formPreco.motivo_alteracao}
              onChange={(e) => setFormPreco({ ...formPreco, motivo_alteracao: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 resize-none"
              rows="3"
              required
            />
          </div>

          {formPreco.preco_consulta !== (conectorSelecionado?.preco_consulta || 0) && (
            <div className={`rounded-lg p-4 border ${
              formPreco.preco_consulta > (conectorSelecionado?.preco_consulta || 0)
                ? "bg-red-50 border-red-200"
                : "bg-green-50 border-green-200"
            }`}>
              <p className={`text-sm font-medium ${
                formPreco.preco_consulta > (conectorSelecionado?.preco_consulta || 0)
                  ? "text-red-800"
                  : "text-green-800"
              }`}>
                Variação: {formPreco.preco_consulta > (conectorSelecionado?.preco_consulta || 0) ? "+" : ""}
                {((formPreco.preco_consulta - (conectorSelecionado?.preco_consulta || 0)) / (conectorSelecionado?.preco_consulta || 1) * 100).toFixed(2)}%
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditPanel(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              className="flex-1 bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg"
              disabled={updatePrecoMutation.isPending}
            >
              {updatePrecoMutation.isPending ? "Salvando..." : "Salvar Alteração"}
            </button>
          </div>
        </form>
      </SlideInPanel>

      {/* Panel Histórico */}
      <SlideInPanel
        open={showHistoricoPanel}
        onClose={() => setShowHistoricoPanel(false)}
        title={`Histórico de Preços - ${conectorSelecionado?.nome}`}
        maxWidth="900px"
      >
        <div className="space-y-6">
          {/* Gráfico de Evolução de Preços */}
          {historicoConector.length > 1 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="font-bold text-gray-800 mb-4">Evolução do Preço</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={historicoConector.reverse().map(h => ({
                  data: format(new Date(h.data_vigencia), "dd/MM"),
                  preco: h.preco_novo
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${value.toFixed(4)}`} />
                  <Line type="monotone" dataKey="preco" stroke="#0B7A9E" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {historicoConector.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma alteração de preço registrada</p>
          ) : (
            historicoConector.reverse().map((hist) => (
              <div key={hist.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {hist.variacao_percentual > 0 ? (
                      <TrendingUp className="w-5 h-5 text-red-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-green-600" />
                    )}
                    <div>
                      <p className="text-sm text-gray-600">
                        R$ {hist.preco_anterior.toFixed(4)} → <strong className="text-gray-800">R$ {hist.preco_novo.toFixed(4)}</strong>
                      </p>
                      <p className={`text-xs font-medium ${
                        hist.variacao_percentual > 0 ? "text-red-600" : "text-green-600"
                      }`}>
                        {hist.variacao_percentual > 0 ? "+" : ""}{hist.variacao_percentual.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs capitalize">
                    {hist.fonte}
                  </span>
                </div>

                <div className="bg-white rounded p-3 border border-gray-200">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Motivo:</strong> {hist.motivo_alteracao}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Vigência: {format(new Date(hist.data_vigencia), "dd/MM/yyyy")}
                    </span>
                    <span>Por: {hist.usuario_responsavel}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Registrado em {format(new Date(hist.created_date), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              </div>
            ))
          )}
        </div>
      </SlideInPanel>
      </div>
    </RouteGuard>
  );
}