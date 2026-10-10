import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle, XCircle, RefreshCw, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input.jsx";
import { format } from "date-fns";

export default function ConciliacaoBancaria() {
  const queryClient = useQueryClient();
  const [extratoFile, setExtratoFile] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [periodo, setPeriodo] = useState({
    inicio: format(new Date(new Date().setDate(1)), "yyyy-MM-dd"),
    fim: format(new Date(), "yyyy-MM-dd")
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ["vendas"],
    queryFn: () => base44.entities.Venda.list(),
    staleTime: 2 * 60 * 1000
  });

  const { data: contasReceber = [] } = useQuery({
    queryKey: ["contasReceber"],
    queryFn: () => base44.entities.ContaReceber.list(),
    staleTime: 2 * 60 * 1000
  });

  const { data: contasPagar = [] } = useQuery({
    queryKey: ["contasPagar"],
    queryFn: () => base44.entities.ContaPagar.list(),
    staleTime: 2 * 60 * 1000
  });

  const transacoesPeriodo = useMemo(() => {
    const lista = [];

    vendas
      .filter(v => v.status_pagamento === "pago" && v.data_venda >= periodo.inicio && v.data_venda <= periodo.fim)
      .forEach(v => {
        lista.push({
          tipo: "entrada",
          data: v.data_venda,
          descricao: `Venda - ${v.paciente_nome}`,
          valor: v.valor_final,
          forma: v.forma_pagamento,
          id: v.id,
          entidade: "Venda",
          conciliado: false
        });
      });

    contasReceber
      .filter(c => c.status === "recebido" && c.data_recebimento >= periodo.inicio && c.data_recebimento <= periodo.fim)
      .forEach(c => {
        lista.push({
          tipo: "entrada",
          data: c.data_recebimento,
          descricao: c.descricao,
          valor: c.valor,
          forma: c.forma_recebimento,
          id: c.id,
          entidade: "ContaReceber",
          conciliado: false
        });
      });

    contasPagar
      .filter(c => c.status === "pago" && c.data_pagamento >= periodo.inicio && c.data_pagamento <= periodo.fim)
      .forEach(c => {
        lista.push({
          tipo: "saida",
          data: c.data_pagamento,
          descricao: c.descricao,
          valor: c.valor,
          forma: c.forma_pagamento,
          id: c.id,
          entidade: "ContaPagar",
          conciliado: false
        });
      });

    return lista.sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [vendas, contasReceber, contasPagar, periodo]);

  const totais = useMemo(() => ({
    entradas: transacoesPeriodo.filter(t => t.tipo === "entrada").reduce((acc, t) => acc + t.valor, 0),
    saidas: transacoesPeriodo.filter(t => t.tipo === "saida").reduce((acc, t) => acc + t.valor, 0)
  }), [transacoesPeriodo]);

  const processarExtrato = async () => {
    if (!extratoFile) {
      alert("Selecione um arquivo de extrato");
      return;
    }

    setProcessando(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: extratoFile });

      const dados = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              data: { type: "string" },
              descricao: { type: "string" },
              valor: { type: "number" },
              tipo: { type: "string" }
            }
          }
        }
      });

      if (dados.status === "success") {
        alert(`✅ Extrato processado!\n${dados.output.length} transações identificadas.\n\nRevise e reconcilie manualmente.`);
      }
    } catch (error) {
      alert("Erro ao processar extrato. Use conciliação manual.");
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload de Extrato */}
      <div className="pc-card p-6">
        <h3 className="pc-heading-4 mb-4">Importar Extrato Bancário</h3>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-[var(--pc-border-primary)] rounded-xl p-6 text-center">
            <input
              type="file"
              onChange={(e) => setExtratoFile(e.target.files[0])}
              accept=".pdf,.csv,.ofx"
              className="hidden"
              id="extrato-upload"
            />
            <label htmlFor="extrato-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 text-[var(--pc-text-disabled)] mx-auto mb-2" />
              <p className="pc-body-sm text-[var(--pc-text-secondary)]">
                {extratoFile ? extratoFile.name : "Extrato PDF, CSV ou OFX"}
              </p>
            </label>
          </div>
          <button
            onClick={processarExtrato}
            disabled={!extratoFile || processando}
            className="pc-btn-primary w-full py-3 disabled:opacity-50"
          >
            {processando ? "Processando..." : "Processar Extrato"}
          </button>
        </div>
      </div>

      {/* Filtro de Período */}
      <div className="pc-card p-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="pc-body-sm font-medium text-[var(--pc-text-secondary)] mb-2 block">Data Início</label>
            <Input
              type="date"
              value={periodo.inicio}
              onChange={(e) => setPeriodo({ ...periodo, inicio: e.target.value })}
            />
          </div>
          <div>
            <label className="pc-body-sm font-medium text-[var(--pc-text-secondary)] mb-2 block">Data Fim</label>
            <Input
              type="date"
              value={periodo.fim}
              onChange={(e) => setPeriodo({ ...periodo, fim: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="pc-card p-6">
          <DollarSign className="w-8 h-8 text-[var(--pc-success-600)] mb-2" />
          <p className="pc-caption">Entradas</p>
          <p className="pc-heading-2 text-[var(--pc-success-600)]">
            R$ {totais.entradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="pc-card p-6">
          <DollarSign className="w-8 h-8 text-[var(--pc-error-600)] mb-2" />
          <p className="pc-caption">Saídas</p>
          <p className="pc-heading-2 text-[var(--pc-error-600)]">
            R$ {totais.saidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="pc-card p-6">
          <DollarSign className="w-8 h-8 text-[var(--pc-primary)] mb-2" />
          <p className="pc-caption">Saldo</p>
          <p className="pc-heading-2">
            R$ {(totais.entradas - totais.saidas).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Lista de Transações */}
      <div className="pc-card">
        <div className="p-4 border-b border-[var(--pc-border-primary)]">
          <h3 className="pc-heading-4">Transações do Período ({transacoesPeriodo.length})</h3>
        </div>
        <div className="divide-y divide-[var(--pc-border-primary)] max-h-96 overflow-y-auto">
          {transacoesPeriodo.map((trans, idx) => (
            <div key={idx} className="p-4 hover:bg-[var(--pc-surface-variant)] pc-transition">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {trans.tipo === "entrada" ? (
                      <CheckCircle className="w-4 h-4 text-[var(--pc-success-600)]" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[var(--pc-error-600)]" />
                    )}
                    <p className="pc-body font-medium">{trans.descricao}</p>
                  </div>
                  <p className="pc-caption">
                    {format(new Date(trans.data), "dd/MM/yyyy")} • {trans.forma}
                  </p>
                </div>
                <p className={`pc-body-lg font-bold ${
                  trans.tipo === "entrada" ? "text-[var(--pc-success-600)]" : "text-[var(--pc-error-600)]"
                }`}>
                  {trans.tipo === "entrada" ? "+" : "-"}R$ {trans.valor.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[var(--pc-info-50)] rounded-xl p-4 border border-[var(--pc-info-200)]">
        <p className="pc-body-sm text-[var(--pc-info-800)]">
          <strong>💡 Dica:</strong> Importe seu extrato bancário para conciliação automática ou revise as transações manualmente.
        </p>
      </div>
    </div>
  );
}