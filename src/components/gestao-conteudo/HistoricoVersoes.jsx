import React from "react";
import { History, RotateCcw, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";

export default function HistoricoVersoes({ documentos, documentoAtivo, onRollback }) {
  const versoes = documentos
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-[#202124] mb-4 flex items-center gap-2">
        <History className="w-5 h-5" />
        Histórico de Versões
      </h3>

      <div className="space-y-3">
        {versoes.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Nenhuma versão criada ainda</p>
        ) : (
          versoes.map(doc => (
            <div
              key={doc.id}
              className={`p-4 rounded-lg border ${
                doc.ativo 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-[#202124]">v{doc.versao}</span>
                    {doc.ativo && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                        <CheckCircle className="w-3 h-3" />
                        Publicado
                      </span>
                    )}
                  </div>

                  {doc.metadata?.changelog && doc.metadata.changelog.length > 0 && (
                    <p className="text-sm text-gray-600 mb-1">
                      {doc.metadata.changelog[doc.metadata.changelog.length - 1].mudancas}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {doc.metadata?.autor_nome && (
                      <span>Por: {doc.metadata.autor_nome}</span>
                    )}
                    {doc.created_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(doc.created_date), "dd/MM/yyyy HH:mm")}
                      </span>
                    )}
                  </div>
                </div>

                {!doc.ativo && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRollback(doc.versao)}
                    className="border-[#7E57FF] text-[#7E57FF] hover:bg-[#f5f3ff]"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Restaurar
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}