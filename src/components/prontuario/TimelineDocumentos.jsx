import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Image, File, Calendar } from "lucide-react";
import { format } from "date-fns";

/**
 * Timeline de documentos vinculados ao prontuário
 * VITAL: Exames/laudos aparecem junto ao prontuário (linha clínica completa)
 * ATENÇÃO: Depende de Widget validado (não testado ainda)
 */
export default function TimelineDocumentos({ prontuarioId }) {
  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['documentos-prontuario', prontuarioId],
    queryFn: async () => {
      const docs = await base44.entities.DocumentoCompliance.filter({
        'vinculado_a.tipo': 'prontuario',
        'vinculado_a.id': prontuarioId
      });
      return docs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!prontuarioId
  });

  const getIcon = (tipo) => {
    if (tipo?.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (tipo === 'application/pdf') return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded" />
        ))}
      </div>
    );
  }

  if (documentos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhum documento vinculado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Documentos Anexados ({documentos.length})
      </h3>

      <div className="space-y-2">
        {documentos.map(doc => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              {getIcon(doc.tipo_arquivo)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {doc.titulo}
              </p>
              <p className="text-xs text-gray-500">
                {format(new Date(doc.created_date), 'dd/MM/yyyy HH:mm')}
                {doc.categoria && ` • ${doc.categoria}`}
              </p>
            </div>

            <a
              href={doc.arquivo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-[#7E57FF] hover:bg-[#f5f3ff] rounded-lg transition-all"
            >
              Abrir
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}