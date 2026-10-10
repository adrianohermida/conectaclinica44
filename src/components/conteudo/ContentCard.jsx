import React from "react";
import { Eye, ThumbsUp, Calendar, User } from "lucide-react";
import { format } from "date-fns";

/**
 * CONTENT CARD - Genérico para Blog, FAQ, Ajuda
 */
export default function ContentCard({ item, onClick, showStats = true }) {
  const titulo = item.titulo || item.pergunta || "Sem título";
  const resumo = item.resumo || item.resposta_curta || item.resposta?.substring(0, 100);
  
  return (
    <button
      onClick={() => onClick(item)}
      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-5 text-left w-full border"
      style={{ borderColor: 'var(--brand-border-primary)', minHeight: '140px' }}
    >
      <h3 className="font-bold mb-2 line-clamp-2" style={{ color: 'var(--brand-text-primary)', fontSize: '16px' }}>
        {titulo}
      </h3>
      {resumo && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{resumo}</p>
      )}
      
      {showStats && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {item.visualizacoes !== undefined && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {item.visualizacoes || 0}
            </span>
          )}
          {(item.util || item.util_count) !== undefined && (
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" /> {item.util || item.util_count || 0}
            </span>
          )}
          {item.created_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {format(new Date(item.created_date), 'dd/MM/yy')}
            </span>
          )}
        </div>
      )}
    </button>
  );
}