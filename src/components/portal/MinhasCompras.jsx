import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  ShoppingCart,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  Download,
  FileText,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";

/**
 * MINHAS COMPRAS - Portal Paciente (LGPD Art. 18)
 * 
 * Lista vendas do paciente logado
 * Download fatura PDF via backend function
 * Compliance LGPD, transparência
 */

export default function MinhasCompras() {
  const [baixandoFatura, setBaixandoFatura] = useState(null);

  // Fetch user (paciente logado)
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  // Fetch vendas do paciente
  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["minhas-vendas", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Buscar contato vinculado ao user
      const contatos = await base44.entities.Contato.filter({ 
        user_id: user.id,
        tipo_contato: "paciente"
      });
      
      if (contatos.length === 0) return [];
      
      const contatoId = contatos[0].id;
      return base44.entities.Venda.filter({ paciente_id: contatoId }, "-data_venda", 100);
    },
    enabled: !!user?.id,
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

  const handleBaixarFatura = async (venda) => {
    setBaixandoFatura(venda.id);
    try {
      const response = await base44.functions.invoke('gerarFaturaPDF', {
        venda_id: venda.id
      });

      // Download PDF
      const pdfBlob = new Blob([new Uint8Array(response.data.pdfBytes)], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fatura_${venda.id.slice(-6)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("Fatura baixada!");
    } catch (error) {
      toast.error("Erro ao gerar fatura");
    } finally {
      setBaixandoFatura(null);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: '#202124' }}>
          Minhas Compras
        </h2>
        <p style={{ color: '#5f6368', fontSize: '16px' }}>
          Histórico completo de compras e faturas
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-xl p-5 border border-green-200">
          <p className="text-sm text-green-700 mb-1">Total Gasto</p>
          <p className="text-3xl font-bold text-green-600">
            R$ {totalGasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-200">
          <p className="text-sm text-yellow-700 mb-1">Pendente</p>
          <p className="text-3xl font-bold text-yellow-600">
            R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Lista de Compras */}
      {vendas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border" style={{ borderColor: '#e8eaed' }}>
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-4">Você ainda não realizou compras</p>
          <p className="text-sm text-gray-400">
            Consulte nosso catálogo de serviços acima
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {vendas.map(venda => {
            const statusBadge = getStatusBadge(venda.status_pagamento);
            return (
              <div
                key={venda.id}
                className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all p-5"
                style={{ borderColor: '#e8eaed' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(venda.status_pagamento)}
                    <div>
                      <p className="font-bold text-lg" style={{ color: '#202124' }}>
                        Compra #{venda.id.slice(-6)}
                      </p>
                      <p className="text-sm" style={{ color: '#5f6368' }}>
                        {format(new Date(venda.data_venda), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusBadge.variant}>
                    {statusBadge.label}
                  </Badge>
                </div>

                {/* Itens */}
                <div className="space-y-2 mb-4">
                  {(venda.itens || []).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 flex-1">
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

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm mb-1" style={{ color: '#5f6368' }}>Forma Pagamento</p>
                    <p className="font-medium capitalize" style={{ color: '#202124' }}>
                      {venda.forma_pagamento}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm mb-1" style={{ color: '#5f6368' }}>Total</p>
                    <p className="text-2xl font-bold" style={{ color: '#34a853' }}>
                      R$ {venda.valor_final.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* CTA Fatura */}
                <button
                  onClick={() => handleBaixarFatura(venda)}
                  disabled={baixandoFatura === venda.id}
                  className="w-full mt-4 py-3 rounded-xl font-bold border-2 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ borderColor: '#7E57FF', color: '#7E57FF' }}
                >
                  {baixandoFatura === venda.id ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Baixar Fatura (PDF)
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}