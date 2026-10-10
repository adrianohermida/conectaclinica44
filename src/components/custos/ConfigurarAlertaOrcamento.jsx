import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Save } from "lucide-react";

export default function ConfigurarAlertaOrcamento({ conector, precificacao }) {
  const queryClient = useQueryClient();
  const [limiteOrcamento, setLimiteOrcamento] = useState(precificacao?.limite_orcamento || 0);
  const [percentualAlerta, setPercentualAlerta] = useState(80);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (precificacao?.id) {
        await base44.entities.PrecificacaoAPI.update(precificacao.id, {
          ...precificacao,
          limite_orcamento: parseFloat(limiteOrcamento)
        });
      } else {
        await base44.entities.PrecificacaoAPI.create({
          conector_id: conector.id,
          conector_nome: conector.nome,
          periodo: new Date().toISOString().slice(0, 7),
          total_consultas: 0,
          consultas_sucesso: 0,
          consultas_erro: 0,
          preco_unitario: conector.preco_consulta || 0,
          custo_total: 0,
          limite_orcamento: parseFloat(limiteOrcamento)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["precificacoes"]);
    }
  });

  return (
    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
      <h4 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
        <Bell className="w-4 h-4" />
        Configurar Alertas de Orçamento
      </h4>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-yellow-900 mb-2">
            Limite Mensal (R$)
          </label>
          <Input
            type="number"
            step="0.01"
            value={limiteOrcamento}
            onChange={(e) => setLimiteOrcamento(e.target.value)}
            className="bg-white"
            placeholder="Ex: 500.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-yellow-900 mb-2">
            Alertar ao atingir (%)
          </label>
          <Input
            type="number"
            value={percentualAlerta}
            onChange={(e) => setPercentualAlerta(e.target.value)}
            className="bg-white"
            placeholder="Ex: 80"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => updateMutation.mutate()}
        className="mt-3 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
        disabled={updateMutation.isPending}
      >
        <Save className="w-4 h-4" />
        {updateMutation.isPending ? "Salvando..." : "Salvar Configuração"}
      </button>
    </div>
  );
}