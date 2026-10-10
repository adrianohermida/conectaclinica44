import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link2, DollarSign, CheckCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function VincularProcedimento({ venda, onVinculado }) {
  const [criando, setCriando] = useState(false);
  const [formConta, setFormConta] = useState({
    descricao: venda?.observacoes || `Venda #${venda?.id?.substring(0, 8)}`,
    categoria: "venda_produtos",
    paciente_nome: venda?.paciente_nome || "",
    valor: venda?.valor_final || 0,
    data_vencimento: venda?.data_venda || "",
    forma_recebimento: venda?.forma_pagamento || "dinheiro",
    status: venda?.status_pagamento === "pago" ? "recebido" : "pendente"
  });

  const vincularContaReceber = async () => {
    setCriando(true);
    try {
      const conta = await base44.entities.ContaReceber.create({
        ...formConta,
        venda_id: venda.id,
        data_recebimento: venda.status_pagamento === "pago" ? venda.data_venda : "",
        observacoes: `Vinculado à venda #${venda.id} - Itens: ${venda.itens?.map(i => i.produto).join(", ")}`
      });

      // Atualizar venda com link
      await base44.entities.Venda.update(venda.id, {
        ...venda,
        conta_receber_id: conta.id,
        vinculada_financeiro: true
      });

      alert("✅ Conta a receber criada e vinculada!");
      if (onVinculado) onVinculado();
    } catch (error) {
      console.error("Erro ao vincular:", error);
      alert("Erro ao criar conta a receber");
    } finally {
      setCriando(false);
    }
  };

  if (venda?.vinculada_financeiro) {
    return (
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-800 font-medium">
            Já vinculado ao financeiro
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <Link2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-blue-900 mb-1">Vincular ao Contas a Receber</h4>
            <p className="text-sm text-blue-800">
              Crie uma conta a receber automaticamente vinculada a esta venda
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <Input
            value={formConta.descricao}
            onChange={(e) => setFormConta({ ...formConta, descricao: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
          <Input
            type="number"
            step="0.01"
            value={formConta.valor}
            onChange={(e) => setFormConta({ ...formConta, valor: parseFloat(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento</label>
        <Input
          type="date"
          value={formConta.data_vencimento}
          onChange={(e) => setFormConta({ ...formConta, data_vencimento: e.target.value })}
        />
      </div>

      <button
        onClick={vincularContaReceber}
        disabled={criando}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {criando ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Criando...
          </>
        ) : (
          <>
            <DollarSign className="w-4 h-4" />
            Criar Conta a Receber
          </>
        )}
      </button>
    </div>
  );
}