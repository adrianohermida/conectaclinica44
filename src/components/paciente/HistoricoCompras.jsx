import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  ShoppingCart,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/Badge";

/**
 * HISTÓRICO DE COMPRAS - Tab no painel lateral do paciente
 * 
 * Exibe vendas filtradas por paciente_id
 * Mostra status pagamento, itens, total
 */

export default function HistoricoCompras({ paciente }) {
  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["vendas-paciente", paciente.id],
    queryFn: () => base44.entities.Venda.filter({ paciente_id: paciente.id }, "-data_venda", 50),
    staleTime: 60000
  });

  const totalGasto = useMemo(() => {
    return vendas.reduce((acc, v) => acc + (v.valor_final || 0), 0);
  }, [vendas]);

  const totalPendente = useMemo(() => {
    return vendas
      .filter(v => v.status_pagamento === "pendente")
      .reduce((acc, v) => acc + (v.valor_final || 0), 0);
  }, [vendas]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 border animate-pulse" style={{ borderColor: '#e8eaed' }}>
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (vendas.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">Nenhuma compra registrada</p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pago':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pendente':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'cancelado':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pago: { variant: 'success', label: 'Pago' },
      pendente: { variant: 'warning', label: 'Pendente' },
      cancelado: { variant: 'error', label: 'Cancelado' }
    };
    return config[status] || { variant: 'default', label: status };
  };

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-700 mb-1">Total Gasto</p>
          <p className="text-2xl font-bold text-green-600">
            R$ {totalGasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <p className="text-sm text-yellow-700 mb-1">Pendente</p>
          <p className="text-2xl font-bold text-yellow-600">
            R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Lista de Vendas */}
      <div className="space-y-3">
        {vendas.map(venda => {
          const statusBadge = getStatusBadge(venda.status_pagamento);
          return (
            <div
              key={venda.id}
              className="bg-white rounded-xl border p-4 hover:shadow-md transition-all"
              style={{ borderColor: '#e8eaed' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2">
                  {getStatusIcon(venda.status_pagamento)}
                  <div>
                    <p className="font-bold" style={{ color: '#202124' }}>
                      Venda #{venda.id.slice(-6)}
                    </p>
                    <p className="text-sm" style={{ color: '#5f6368' }}>
                      {format(new Date(venda.data_venda), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Badge variant={statusBadge.variant}>
                  {statusBadge.label}
                </Badge>
              </div>

              {/* Itens */}
              <div className="space-y-2 mb-3">
                {(venda.itens || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span style={{ color: '#5f6368' }}>
                        {item.produto} × {item.quantidade}
                      </span>
                    </div>
                    <span className="font-medium" style={{ color: '#202124' }}>
                      R$ {item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="font-bold" style={{ color: '#5f6368' }}>Total</span>
                <span className="text-xl font-bold" style={{ color: '#34a853' }}>
                  R$ {venda.valor_final.toFixed(2)}
                </span>
              </div>

              {/* Info Adicional */}
              <div className="flex flex-wrap gap-2 mt-3 text-xs" style={{ color: '#80868b' }}>
                <span>💳 {venda.forma_pagamento}</span>
                {venda.vendedor_nome && <span>👤 {venda.vendedor_nome}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}