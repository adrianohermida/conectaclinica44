import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileSpreadsheet, Download, Edit2, Save, TrendingDown, AlertTriangle, Calendar } from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function RelatorioInventario({ medicamentos, movimentacoes = [], onAjusteEstoque }) {
  const [editando, setEditando] = useState({});
  const [ajustes, setAjustes] = useState({});
  const [diasPrevisao, setDiasPrevisao] = useState(30);
  const [limiteAlertaEstoque, setLimiteAlertaEstoque] = useState(20);
  const [diasAlertaValidade, setDiasAlertaValidade] = useState(60);

  // Carregar e salvar configurações
  React.useEffect(() => {
    const loadConfig = async () => {
      try {
        const user = await base44.auth.me();
        const configs = await base44.entities.ConfiguracaoAlertaEstoque.filter({ usuario_email: user.email });
        if (configs.length > 0) {
          const config = configs[0];
          setLimiteAlertaEstoque(config.limite_estoque_baixo_percentual || 20);
          setDiasAlertaValidade(config.dias_alerta_validade || 60);
          setDiasPrevisao(config.dias_previsao_ruptura || 30);
        }
      } catch (e) {
        // User not logged in
      }
    };
    loadConfig();
  }, []);

  const saveConfig = async () => {
    try {
      const user = await base44.auth.me();
      const configs = await base44.entities.ConfiguracaoAlertaEstoque.filter({ usuario_email: user.email });
      
      const configData = {
        usuario_email: user.email,
        limite_estoque_baixo_percentual: limiteAlertaEstoque,
        dias_alerta_validade: diasAlertaValidade,
        dias_previsao_ruptura: diasPrevisao,
        notificar_email: true,
        notificar_sistema: true,
        ativo: true
      };

      if (configs.length > 0) {
        await base44.entities.ConfiguracaoAlertaEstoque.update(configs[0].id, configData);
      } else {
        await base44.entities.ConfiguracaoAlertaEstoque.create(configData);
      }
    } catch (e) {
      console.error("Erro ao salvar config:", e);
    }
  };

  const valorTotal = useMemo(() => {
    return medicamentos.reduce((acc, m) => 
      acc + (m.quantidade_estoque || 0) * (m.preco_custo || 0), 0
    );
  }, [medicamentos]);

  // Histórico de ajustes
  const ajustesHistorico = useMemo(() => {
    return movimentacoes
      .filter(m => m.tipo_movimentacao === "ajuste")
      .sort((a, b) => new Date(b.data_movimentacao) - new Date(a.data_movimentacao))
      .slice(0, 20);
  }, [movimentacoes]);

  // Predição de ruptura baseado em média de saídas
  const predicaoRuptura = useMemo(() => {
    return medicamentos.map(med => {
      const saidas = movimentacoes.filter(m => 
        m.medicamento_id === med.id && m.tipo_movimentacao === "saida"
      );

      if (saidas.length === 0) return null;

      const ultimasSaidas = saidas.slice(0, 10);
      const mediaDiaria = ultimasSaidas.reduce((acc, s) => acc + s.quantidade, 0) / ultimasSaidas.length;
      const diasParaRuptura = mediaDiaria > 0 ? Math.floor(med.quantidade_estoque / mediaDiaria) : 999;

      if (diasParaRuptura <= diasPrevisao && diasParaRuptura > 0) {
        return {
          medicamento: med.nome,
          estoque_atual: med.quantidade_estoque,
          media_saida_diaria: mediaDiaria.toFixed(2),
          dias_ate_ruptura: diasParaRuptura,
          data_ruptura_prevista: format(new Date(Date.now() + diasParaRuptura * 24 * 60 * 60 * 1000), "dd/MM/yyyy")
        };
      }
      return null;
    }).filter(Boolean).sort((a, b) => a.dias_ate_ruptura - b.dias_ate_ruptura);
  }, [medicamentos, movimentacoes, diasPrevisao]);

  // Alertas configuráveis
  const alertasEstoqueBaixo = useMemo(() => {
    return medicamentos.filter(m => {
      const percentual = m.estoque_minimo > 0 
        ? (m.quantidade_estoque / m.estoque_minimo) * 100 
        : 100;
      return percentual <= limiteAlertaEstoque;
    });
  }, [medicamentos, limiteAlertaEstoque]);

  const alertasVencimento = useMemo(() => {
    const hoje = new Date();
    return medicamentos.filter(m => {
      if (!m.validade) return false;
      const dias = differenceInDays(new Date(m.validade), hoje);
      return dias <= diasAlertaValidade && dias >= 0;
    }).sort((a, b) => new Date(a.validade) - new Date(b.validade));
  }, [medicamentos, diasAlertaValidade]);

  // Gráfico de tendência de estoque
  const dadosTendencia = useMemo(() => {
    const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
      const dia = subDays(new Date(), 6 - i);
      const diaStr = format(dia, "yyyy-MM-dd");
      
      const entradas = movimentacoes
        .filter(m => m.data_movimentacao === diaStr && m.tipo_movimentacao === "entrada")
        .reduce((acc, m) => acc + m.quantidade, 0);
      
      const saidas = movimentacoes
        .filter(m => m.data_movimentacao === diaStr && m.tipo_movimentacao === "saida")
        .reduce((acc, m) => acc + m.quantidade, 0);

      return {
        data: format(dia, "dd/MM"),
        entradas,
        saidas
      };
    });
    return ultimos7Dias;
  }, [movimentacoes]);

  const handleEditar = (medicamentoId, quantidadeAtual) => {
    setEditando({ ...editando, [medicamentoId]: true });
    setAjustes({ ...ajustes, [medicamentoId]: quantidadeAtual });
  };

  const handleSalvar = (medicamento) => {
    const novaQuantidade = parseInt(ajustes[medicamento.id]);
    const diferenca = novaQuantidade - medicamento.quantidade_estoque;
    
    if (diferenca !== 0) {
      onAjusteEstoque(medicamento, novaQuantidade, diferenca);
    }
    
    setEditando({ ...editando, [medicamento.id]: false });
  };

  const exportarCSV = () => {
    const headers = "Nome;Princípio Ativo;Fabricante;Categoria;Estoque;Estoque Mínimo;Lote;Validade;Preço Custo;Preço Venda;Valor Total";
    const rows = medicamentos.map(m => 
      `${m.nome};${m.principio_ativo || ''};${m.fabricante || ''};${m.categoria};${m.quantidade_estoque};${m.estoque_minimo};${m.lote || ''};${m.validade ? format(new Date(m.validade), 'dd/MM/yyyy') : ''};${m.preco_custo?.toFixed(2)};${m.preco_venda?.toFixed(2)};${(m.quantidade_estoque * m.preco_custo).toFixed(2)}`
    ).join("\n");
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventario_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Configurações de Alertas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">⚙️ Configuração de Alertas</h3>
          <Button onClick={saveConfig} variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Salvar Config
          </Button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Limite Estoque Baixo (%)
            </label>
            <Input
              type="number"
              value={limiteAlertaEstoque}
              onChange={(e) => setLimiteAlertaEstoque(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Alerta quando estoque &lt; {limiteAlertaEstoque}% do mínimo</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alerta Vencimento (dias)
            </label>
            <Input
              type="number"
              value={diasAlertaValidade}
              onChange={(e) => setDiasAlertaValidade(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Alertar {diasAlertaValidade} dias antes</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Previsão Ruptura (dias)
            </label>
            <Input
              type="number"
              value={diasPrevisao}
              onChange={(e) => setDiasPrevisao(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Prever ruptura em {diasPrevisao} dias</p>
          </div>
        </div>
      </div>

      {/* Alertas Ativos */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Predição de Ruptura */}
        {predicaoRuptura.length > 0 && (
          <div className="bg-red-50 rounded-lg p-6 border border-red-200">
            <h3 className="font-bold text-red-900 mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              ⚠️ Previsão de Ruptura ({predicaoRuptura.length})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {predicaoRuptura.map((pred, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-red-300">
                  <p className="font-medium text-gray-800 text-sm">{pred.medicamento}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <span className="text-gray-600">Estoque: <strong>{pred.estoque_atual}</strong></span>
                    <span className="text-gray-600">Média/dia: <strong>{pred.media_saida_diaria}</strong></span>
                    <span className="text-red-600 col-span-2">
                      Ruptura em <strong>{pred.dias_ate_ruptura} dias</strong> ({pred.data_ruptura_prevista})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alertas de Estoque Baixo */}
        {alertasEstoqueBaixo.length > 0 && (
          <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
            <h3 className="font-bold text-orange-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Estoque Crítico ({alertasEstoqueBaixo.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {alertasEstoqueBaixo.map((med) => (
                <div key={med.id} className="bg-white rounded-lg p-3 border border-orange-300">
                  <p className="font-medium text-gray-800 text-sm">{med.nome}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Atual: <strong>{med.quantidade_estoque}</strong> | Mínimo: {med.estoque_minimo}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Medicamentos Vencendo */}
      {alertasVencimento.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
          <h3 className="font-bold text-yellow-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Vencendo em {diasAlertaValidade} dias ({alertasVencimento.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {alertasVencimento.map((med) => (
              <div key={med.id} className="bg-white rounded-lg p-3 border border-yellow-300">
                <p className="font-medium text-gray-800 text-sm">{med.nome}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Lote: {med.lote} | Validade: <strong className="text-yellow-700">
                    {format(new Date(med.validade), "dd/MM/yyyy")}
                  </strong>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tendência de Movimentação */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">📊 Tendência de Movimentação (7 dias)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dadosTendencia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="data" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="entradas" stroke="#10B981" strokeWidth={2} name="Entradas" />
            <Line type="monotone" dataKey="saidas" stroke="#EF4444" strokeWidth={2} name="Saídas" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Histórico de Ajustes */}
      {ajustesHistorico.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4">📝 Histórico de Ajustes Manuais</h3>
          <div className="space-y-2">
            {ajustesHistorico.map((ajuste) => (
              <div key={ajuste.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{ajuste.medicamento_nome}</p>
                  <p className="text-xs text-gray-600">
                    {format(new Date(ajuste.data_movimentacao), "dd/MM/yyyy")} - {ajuste.motivo}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-700">
                    {ajuste.estoque_anterior} → <strong>{ajuste.estoque_atual}</strong>
                  </p>
                  <p className={`text-xs font-medium ${
                    ajuste.estoque_atual > ajuste.estoque_anterior ? "text-green-600" : "text-red-600"
                  }`}>
                    {ajuste.estoque_atual > ajuste.estoque_anterior ? "+" : ""}
                    {ajuste.estoque_atual - ajuste.estoque_anterior}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventário Completo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Inventário Completo</h2>
              <p className="text-sm text-gray-600">
                Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
              </p>
            </div>
            <Button onClick={exportarCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-800 mb-1">Total de Itens</p>
              <p className="text-2xl font-bold text-blue-900">{medicamentos.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-800 mb-1">Valor Total Estoque</p>
              <p className="text-2xl font-bold text-green-900">
                R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm text-purple-800 mb-1">Unidades Totais</p>
              <p className="text-2xl font-bold text-purple-900">
                {medicamentos.reduce((acc, m) => acc + (m.quantidade_estoque || 0), 0)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-3 text-sm font-medium text-gray-700">Medicamento</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">Lote</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-700">Estoque</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-700">Mín/Máx</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-700">Valor Total</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {medicamentos.map((med) => (
                  <tr key={med.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <p className="font-medium text-gray-800">{med.nome}</p>
                      <p className="text-xs text-gray-500">{med.apresentacao}</p>
                    </td>
                    <td className="p-3">
                      <p className="text-sm text-gray-600">{med.lote || '-'}</p>
                      {med.validade && (
                        <p className="text-xs text-gray-500">{format(new Date(med.validade), 'dd/MM/yy')}</p>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {editando[med.id] ? (
                        <Input
                          type="number"
                          value={ajustes[med.id]}
                          onChange={(e) => setAjustes({ ...ajustes, [med.id]: e.target.value })}
                          className="w-20 text-center"
                        />
                      ) : (
                        <span className={`font-bold ${
                          med.quantidade_estoque <= med.estoque_minimo ? 'text-orange-600' : 'text-gray-800'
                        }`}>
                          {med.quantidade_estoque}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center text-sm text-gray-600">
                      {med.estoque_minimo}/{med.estoque_maximo || '-'}
                    </td>
                    <td className="p-3 text-right font-medium text-gray-800">
                      R$ {((med.quantidade_estoque || 0) * (med.preco_custo || 0)).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      {editando[med.id] ? (
                        <button
                          onClick={() => handleSalvar(med)}
                          className="text-green-600 hover:text-green-700 p-2"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEditar(med.id, med.quantidade_estoque)}
                          className="text-blue-600 hover:text-blue-700 p-2"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}