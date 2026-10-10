import React from "react";
import { FileText, Copy, Trash2, Eye, Edit } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";

export default function ListaDocumentos({ documentos, onSelect, onDuplicate, onDelete, documentoAtivo }) {
  const getTipoLabel = (doc) => {
    if (doc.titulo_custom) return doc.titulo_custom;
    if (doc.categoria_custom) return doc.categoria_custom;
    
    switch(doc.tipo_documento) {
      case 'termos_uso': return 'Termos de Uso';
      case 'politica_privacidade': return 'Privacidade';
      case 'lgpd': return 'LGPD';
      case 'contrato_custom': return 'Contrato';
      default: return 'Documento';
    }
  };

  return (
    <div className="space-y-2">
      {documentos.map(doc => (
        <div
          key={doc.id}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            documentoAtivo?.id === doc.id
              ? 'border-[#7E57FF] bg-[#f5f3ff]'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onSelect(doc)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-[#7E57FF] flex-shrink-0" />
                <h4 className="font-bold text-[#202124] truncate">{getTipoLabel(doc)}</h4>
                {doc.ativo && (
                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                    Publicado
                  </span>
                )}
                {doc.template_padrao && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                    Template
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>v{doc.versao}</span>
                <span>•</span>
                <span className="capitalize">{doc.uso_tipo}</span>
                {doc.created_date && (
                  <>
                    <span>•</span>
                    <span>{format(new Date(doc.created_date), "dd/MM/yy")}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(doc);
                }}
                title="Duplicar"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(doc);
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}