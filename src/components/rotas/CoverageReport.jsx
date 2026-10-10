import React from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export default function CoverageReport({ stats, modules }) {
  const totalExpected = 130; // Pages reais do projeto
  const coverage = ((stats.routes_mapped / totalExpected) * 100).toFixed(1);
  
  return (
    <div className="pc-card p-6 bg-yellow-50 border-2 border-yellow-200">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-yellow-600" />
        <h3 className="text-lg font-bold">Relatório de Cobertura REAL</h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-3 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Rotas Mapeadas</div>
          <div className="text-2xl font-bold">{stats.routes_mapped}</div>
          <div className="text-xs text-gray-500">de {totalExpected} total</div>
        </div>
        <div className="bg-white p-3 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Cobertura</div>
          <div className={`text-2xl font-bold ${coverage < 50 ? 'text-red-600' : coverage < 80 ? 'text-yellow-600' : 'text-green-600'}`}>
            {coverage}%
          </div>
          <div className="text-xs text-gray-500">meta: 95%+</div>
        </div>
        <div className="bg-white p-3 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Módulos</div>
          <div className="text-2xl font-bold">{Object.keys(modules || {}).length}</div>
          <div className="text-xs text-gray-500">mapeados</div>
        </div>
      </div>

      {coverage < 95 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <div className="font-bold text-red-800">AÇÃO NECESSÁRIA</div>
          </div>
          <p className="text-sm text-red-700">
            Cobertura abaixo da meta (95%). Faltam <strong>{totalExpected - stats.routes_mapped} rotas</strong> para mapear.
            Execute "Coletar Rotas" para atualizar com scan real via Base44 API.
          </p>
        </div>
      )}

      {coverage >= 95 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div className="font-bold text-green-800">✅ Cobertura Excelente</div>
          </div>
        </div>
      )}
    </div>
  );
}