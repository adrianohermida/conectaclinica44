import React, { useState, useMemo } from "react";
import { AlertTriangle, Calendar, Package, Trash2, Eye } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";

export default function ControleLoteValidade({ medicamentos, onAtualizarMedicamento }) {
  const [expandido, setExpandido] = useState({});
  const hoje = new Date();

  const medicamentosComAlerta = useMemo(() => {
    return medicamentos.filter(med => {
      if (!med.validade) return false;
      const diasRestantes = differenceInDays(new Date(med.validade), hoje);
      return diasRestantes <= 90; // Alertar 90 dias antes
    });
  }, [medicamentos]);

  const medicamentosVencidos = useMemo(() => {
    return medicamentos.filter(med => med.validade && isPast(new Date(med.validade)));
  }, [medicamentos]);

  const medicamentosVencendo = useMemo(() => {
    return medicamentos.filter(med => {
      if (!med.validade) return false;
      const diasRestantes = differenceInDays(new Date(med.validade), hoje);
      return diasRestantes > 0 && diasRestantes <= 60;
    });
  }, [medicamentos]);

  const getCorAlerta = (validade) => {
    if (!validade) return "bg-gray-100 text-gray-600";
    const diasRestantes = differenceInDays(new Date(validade), hoje);
    
    if (diasRestantes < 0) return "bg-red-100 text-red-800 border-red-300";
    if (diasRestantes <= 30) return "bg-orange-100 text-orange-800 border-orange-300";
    if (diasRestantes <= 60) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-green-100 text-green-800 border-green-300";
  };

  const getStatusValidade = (validade) => {
    if (!validade) return "Sem data";
    const diasRestantes = differenceInDays(new Date(validade), hoje);
    
    if (diasRestantes < 0) return "VENCIDO";
    if (diasRestantes === 0) return "Vence hoje";
    if (diasRestantes <= 30) return `${diasRestantes} dias`;
    if (diasRestantes <= 60) return `${diasRestantes} dias`;
    return `${Math.floor(diasRestantes / 30)} meses`;
  };

  return (
    <div className="space-y-4">
      {/* Alertas Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-xs text-red-600 font-medium">VENCIDOS</span>
          </div>
          <p className="text-2xl font-bold text-red-800">{medicamentosVencidos.length}</p>
          <p className="text-xs text-red-700 mt-1">Remover urgentemente</p>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-5 h-5 text-orange-600" />
            <span className="text-xs text-orange-600 font-medium">VENCENDO</span>
          </div>
          <p className="text-2xl font-bold text-orange-800">{medicamentosVencendo.length}</p>
          <p className="text-xs text-orange-700 mt-1">Próximos 60 dias</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">MONITORADOS</span>
          </div>
          <p className="text-2xl font-bold text-blue-800">{medicamentosComAlerta.length}</p>
          <p className="text-xs text-blue-700 mt-1">Com alerta de validade</p>
        </div>
      </div>

      {/* Lista de Medicamentos com Alerta */}
      {medicamentosComAlerta.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum medicamento com alerta de validade</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="font-bold text-gray-800">Medicamentos Monitorados</h4>
          {medicamentosComAlerta
            .sort((a, b) => new Date(a.validade) - new Date(b.validade))
            .map((med) => {
              const diasRestantes = differenceInDays(new Date(med.validade), hoje);
              const vencido = diasRestantes < 0;
              
              return (
                <div key={med.id} className={`rounded-lg p-4 border-2 ${getCorAlerta(med.validade)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h5 className="font-bold text-gray-800">{med.nome}</h5>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div>
                          <span className="text-gray-600">Lote:</span>
                          <p className="font-medium text-gray-800">{med.lote || "Não informado"}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Validade:</span>
                          <p className="font-medium text-gray-800">
                            {format(new Date(med.validade), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Estoque:</span>
                          <p className="font-medium text-gray-800">{med.quantidade_estoque} {med.unidade_medida}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Localização:</span>
                          <p className="font-medium text-gray-800">{med.localizacao || "Não definida"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getCorAlerta(med.validade)}`}>
                        {getStatusValidade(med.validade)}
                      </span>
                    </div>
                  </div>

                  {vencido && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="text-sm text-red-800 font-medium mb-2">
                        ⚠️ AÇÃO NECESSÁRIA: Produto vencido deve ser removido do estoque
                      </p>
                      <button
                        onClick={() => {
                          if (confirm(`Confirmar remoção de ${med.nome} do estoque (lote ${med.lote})?`)) {
                            onAtualizarMedicamento(med.id, { quantidade_estoque: 0, ativo: false });
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remover do Estoque
                      </button>
                    </div>
                  )}

                  {!vencido && diasRestantes <= 30 && (
                    <div className="mt-3 pt-3 border-t border-orange-200">
                      <p className="text-sm text-orange-800">
                        💡 <strong>Recomendação:</strong> Priorizar uso deste lote ou considerar desconto para venda rápida
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Recomendações */}
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <h4 className="font-bold text-green-900 mb-2">✅ Boas Práticas de Controle de Validade</h4>
        <ul className="space-y-1 text-sm text-green-800">
          <li>• Usar FIFO (First In, First Out) - primeiro que entra, primeiro que sai</li>
          <li>• Registrar lote e validade na entrada de cada medicamento</li>
          <li>• Verificar validades semanalmente</li>
          <li>• Segregar medicamentos próximos do vencimento</li>
          <li>• Notificar fornecedor sobre produtos com problemas de qualidade</li>
        </ul>
      </div>
    </div>
  );
}