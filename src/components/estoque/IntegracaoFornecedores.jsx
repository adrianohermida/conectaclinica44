import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Trash2, Phone, Mail, MapPin, ShoppingCart, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function IntegracaoFornecedores({ medicamentosSugeridos, previsao }) {
  const getCorUrgencia = (urgencia) => {
    if (urgencia === 'alta') return 'bg-red-50 text-red-700 border-red-200';
    if (urgencia === 'media') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-green-50 text-green-700 border-green-200';
  };

  const [fornecedorForm, setFornecedorForm] = useState({
    nome: "",
    cnpj: "",
    contato: "",
    email: "",
    telefone: "",
    endereco: "",
    categorias_produtos: [],
    prazo_entrega_dias: 7,
    valor_minimo_pedido: 0,
    ativo: true
  });
  const [pedido, setPedido] = useState({
    fornecedor: "",
    itens: [],
    observacoes: ""
  });

  const queryClient = useQueryClient();

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      // Como não temos entidade Fornecedor, vamos simular ou criar uma
      return [];
    },
    staleTime: 5 * 60 * 1000
  });

  const enviarPedido = async () => {
    if (!pedido.fornecedor || pedido.itens.length === 0) {
      alert("Selecione um fornecedor e adicione itens ao pedido");
      return;
    }

    try {
      const fornecedor = fornecedores.find(f => f.nome === pedido.fornecedor);
      
      const corpoPedido = `Prezado(a) ${fornecedor?.nome},

Solicitamos orçamento/pedido dos seguintes itens:

${pedido.itens.map((item, idx) => 
  `${idx + 1}. ${item.medicamento} - ${item.quantidade} unidades`
).join('\n')}

Observações: ${pedido.observacoes || "Nenhuma"}

Aguardamos retorno.

Atenciosamente,
PrevenClin - Ponta Negra, Manaus/AM`;

      await base44.integrations.Core.SendEmail({
        to: fornecedor?.email || "fornecedor@exemplo.com",
        subject: `Pedido de Medicamentos - ${format(new Date(), "dd/MM/yyyy")}`,
        body: corpoPedido
      });

      alert("✅ Pedido enviado ao fornecedor por e-mail!");
      setPedido({ fornecedor: "", itens: [], observacoes: "" });
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      alert("Erro ao enviar pedido");
    }
  };

  const adicionarItemPedido = (medicamento) => {
    if (pedido.itens.find(i => i.medicamento === medicamento.nome)) {
      alert("Este medicamento já está no pedido");
      return;
    }

    setPedido({
      ...pedido,
      itens: [
        ...pedido.itens,
        {
          medicamento: medicamento.nome,
          quantidade: medicamento.quantidade_sugerida || medicamento.estoque_minimo * 2,
          preco_referencia: medicamento.preco_custo
        }
      ]
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-blue-900">Integração com Fornecedores</h3>
        </div>
        <p className="text-sm text-blue-800">
          Gere pedidos automáticos baseados nas previsões de demanda
        </p>
      </div>

      {/* Lista de Fornecedores Fictícia (pode ser expandido) */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h4 className="font-bold text-gray-800 mb-3">Fornecedores Cadastrados</h4>
        {fornecedores.length === 0 ? (
          <div className="space-y-3">
            {/* Fornecedores exemplo/demo */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-start gap-3">
                <Building2 className="w-10 h-10 bg-blue-100 text-blue-600 p-2 rounded-lg" />
                <div className="flex-1">
                  <h5 className="font-bold text-gray-800">FarmaDistribuidora AM</h5>
                  <p className="text-sm text-gray-600">fornecedor1@exemplo.com</p>
                  <p className="text-xs text-gray-500 mt-1">Prazo: 7 dias • Min: R$ 500</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-start gap-3">
                <Building2 className="w-10 h-10 bg-green-100 text-green-600 p-2 rounded-lg" />
                <div className="flex-1">
                  <h5 className="font-bold text-gray-800">MediSupply Norte</h5>
                  <p className="text-sm text-gray-600">fornecedor2@exemplo.com</p>
                  <p className="text-xs text-gray-500 mt-1">Prazo: 10 dias • Min: R$ 800</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Cadastre fornecedores no sistema</p>
        )}
      </div>

      {/* Gerar Pedido Baseado em Previsão */}
      {medicamentosSugeridos?.length > 0 && (
        <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
          <h4 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Itens Sugeridos para Pedido
          </h4>
          <div className="space-y-2">
            {medicamentosSugeridos.slice(0, 5).map((med, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 border border-orange-200 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{med.nome}</p>
                  <p className="text-xs text-gray-600">
                    Estoque atual: {med.quantidade_estoque} • Sugerido: {med.estoque_minimo * 3}
                  </p>
                </div>
                <button
                  onClick={() => adicionarItemPedido(med)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm"
                >
                  Adicionar
                </button>
              </div>
            ))}
          </div>

          {pedido.itens.length > 0 && (
            <div className="mt-4 pt-4 border-t border-orange-200">
              <h5 className="font-bold text-orange-900 mb-2">Itens do Pedido ({pedido.itens.length})</h5>
              <div className="space-y-2 mb-3">
                {pedido.itens.map((item, idx) => (
                  <div key={idx} className="bg-white rounded p-2 border border-gray-200 flex justify-between items-center">
                    <span className="text-sm text-gray-800">{item.medicamento} - {item.quantidade} un</span>
                    <button
                      onClick={() => setPedido({ ...pedido, itens: pedido.itens.filter((_, i) => i !== idx) })}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <select
                value={pedido.fornecedor}
                onChange={(e) => setPedido({ ...pedido, fornecedor: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 mb-2 text-sm"
              >
                <option value="">Selecione o fornecedor</option>
                <option value="FarmaDistribuidora AM">FarmaDistribuidora AM</option>
                <option value="MediSupply Norte">MediSupply Norte</option>
              </select>

              <textarea
                placeholder="Observações do pedido..."
                value={pedido.observacoes}
                onChange={(e) => setPedido({ ...pedido, observacoes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm mb-2"
                rows="2"
              />

              <button
                onClick={enviarPedido}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Enviar Pedido ao Fornecedor
              </button>
            </div>
          )}
        </div>
      )}

      {/* Análise de Previsão */}
      {previsao && (
        <div className="space-y-3">
          {previsao.previsoes?.map((prev, idx) => (
            <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <h5 className="font-bold text-gray-800">{prev.medicamento}</h5>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getCorUrgencia(prev.urgencia)}`}>
                  {prev.urgencia}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <span className="text-gray-600">Consumo previsto:</span>
                  <p className="font-medium text-gray-800">{prev.consumo_previsto_30d} un/mês</p>
                </div>
                <div>
                  <span className="text-gray-600">Comprar:</span>
                  <p className="font-medium text-green-700">{prev.quantidade_comprar} unidades</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                💡 {prev.recomendacao}
              </p>
            </div>
          ))}

          {previsao.sugestoes_gerais?.length > 0 && (
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <h4 className="font-bold text-green-900 mb-2">✅ Recomendações Gerais</h4>
              <ul className="space-y-1">
                {previsao.sugestoes_gerais.map((sug, idx) => (
                  <li key={idx} className="text-sm text-green-800">• {sug}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}