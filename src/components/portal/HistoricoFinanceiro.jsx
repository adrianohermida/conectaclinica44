import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Receipt,
  Download,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Upload
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";
import SlideInPanel from "@/components/ui/SlideInPanel";
import MinhasCompras from "@/components/portal/MinhasCompras";

/**
 * HISTÓRICO FINANCEIRO - Portal Paciente
 * 
 * - Faturas emitidas (download PDF)
 * - Notas fiscais (upload manual)
 * - Comprovantes pagamento
 * - Assinaturas/recorrências
 */

export default function HistoricoFinanceiro({ pacienteId }) {
  const [faturaDetalhes, setFaturaDetalhes] = useState(null);
  const [uploadingNF, setUploadingNF] = useState(null);
  const [showComprasPanel, setShowComprasPanel] = useState(false);

  const { data: faturas = [] } = useQuery({
    queryKey: ["faturas-paciente", pacienteId],
    queryFn: () => base44.entities.Fatura.filter({ paciente_id: pacienteId }, "-data_emissao", 100),
    enabled: !!pacienteId,
    staleTime: 60000
  });

  const downloadFatura = async (faturaId) => {
    try {
      const response = await base44.functions.invoke('gerarFaturaPDF', { fatura_id: faturaId });
      window.open(response.data.pdf_url, '_blank');
    } catch (error) {
      toast.error("Erro ao baixar fatura");
    }
  };

  const uploadNotaFiscal = async (faturaId, file) => {
    try {
      setUploadingNF(faturaId);
      const { data } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.Fatura.update(faturaId, {
        nota_fiscal_url: data.file_url
      });

      toast.success("Nota fiscal anexada");
      setUploadingNF(null);
    } catch (error) {
      toast.error("Erro ao anexar nota fiscal");
      setUploadingNF(null);
    }
  };

  const statusConfig = {
    'pendente': { icon: Clock, color: 'yellow', label: 'Pendente' },
    'pago': { icon: CheckCircle, color: 'green', label: 'Pago' },
    'vencido': { icon: AlertCircle, color: 'red', label: 'Vencido' },
    'cancelado': { icon: AlertCircle, color: 'gray', label: 'Cancelado' }
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Pago</p>
                <p className="text-xl font-bold">
                  R$ {faturas.filter(f => f.status === 'pago').reduce((acc, f) => acc + f.valor_total, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Em Aberto</p>
                <p className="text-xl font-bold">
                  R$ {faturas.filter(f => f.status === 'pendente').reduce((acc, f) => acc + f.valor_total, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Receipt className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Total Faturas</p>
                <p className="text-xl font-bold">{faturas.length}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista Faturas */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Minhas Faturas</h3>
          <div className="space-y-3">
            {faturas.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Nenhuma fatura encontrada</p>
              </div>
            ) : (
              faturas.map(fatura => {
                const config = statusConfig[fatura.status];
                const StatusIcon = config.icon;

                return (
                  <div
                    key={fatura.id}
                    className="bg-white rounded-xl border-2 p-4 hover:border-purple-300 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-5 h-5 text-purple-600" />
                          <span className="font-bold">{fatura.numero_fatura}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(fatura.data_emissao), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold bg-${config.color}-100 text-${config.color}-700`}>
                            <StatusIcon className="w-3 h-3 inline mr-1" />
                            {config.label}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-600">
                          R$ {fatura.valor_total.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setFaturaDetalhes(fatura)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Detalhes
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadFatura(fatura.id)}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Baixar PDF
                      </Button>
                      {fatura.nota_fiscal_url ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.open(fatura.nota_fiscal_url, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Nota Fiscal
                        </Button>
                      ) : (
                        <>
                          <input
                            type="file"
                            id={`nf-${fatura.id}`}
                            accept="application/pdf,image/*"
                            onChange={(e) => uploadNotaFiscal(fatura.id, e.target.files[0])}
                            className="hidden"
                          />
                          <label htmlFor={`nf-${fatura.id}`}>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={uploadingNF === fatura.id}
                              className="flex items-center gap-2"
                              as="span"
                            >
                              <Upload className="w-4 h-4" />
                              {uploadingNF === fatura.id ? "Enviando..." : "Anexar NF"}
                            </Button>
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      {/* Modal Detalhes */}
      {faturaDetalhes && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setFaturaDetalhes(null)}>
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{faturaDetalhes.numero_fatura}</h3>
                <button onClick={() => setFaturaDetalhes(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Emissão</span>
                  <span className="font-medium">{format(new Date(faturaDetalhes.data_emissao), "dd/MM/yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vencimento</span>
                  <span className="font-medium">{format(new Date(faturaDetalhes.data_vencimento), "dd/MM/yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Forma Pagamento</span>
                  <span className="font-medium capitalize">{faturaDetalhes.forma_pagamento}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold mb-3">Itens</h4>
                <div className="space-y-2">
                  {faturaDetalhes.itens.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.produto} x{item.quantidade}</span>
                      <span className="font-medium">R$ {(item.preco_unitario * item.quantidade).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>R$ {faturaDetalhes.subtotal.toFixed(2)}</span>
                </div>
                {faturaDetalhes.desconto > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto</span>
                    <span>- R$ {faturaDetalhes.desconto.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-purple-600">
                  <span>Total</span>
                  <span>R$ {faturaDetalhes.valor_total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Panel - Minhas Compras */}
      <SlideInPanel
        open={showComprasPanel}
        onClose={() => setShowComprasPanel(false)}
        title="Minhas Compras"
        maxWidth="900px"
      >
        <MinhasCompras pacienteId={pacienteId} />
      </SlideInPanel>
    </div>
  );
}