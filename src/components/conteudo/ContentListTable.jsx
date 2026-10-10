import React from "react";
import { Edit, Trash2, Eye, CheckCircle, XCircle } from "lucide-react";

/**
 * LISTA TABELA GENÉRICA - Blog, FAQ, Ajuda, Legal
 */
export default function ContentListTable({ items, onEdit, onDelete, columns = [] }) {
  const defaultColumns = [
    { key: 'titulo', label: 'Título', render: (item) => item.titulo || item.pergunta || '-' },
    { key: 'categoria', label: 'Categoria', render: (item) => item.categoria || item.secao || '-' },
    { key: 'status', label: 'Status', render: (item) => (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
        item.publicado || item.ativo || item.aprovado ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}>
        {item.publicado || item.ativo || item.aprovado ? 'Ativo' : 'Inativo'}
      </span>
    )},
    { key: 'views', label: 'Views', render: (item) => (
      <span className="flex items-center gap-1">
        <Eye className="w-3 h-3" /> {item.visualizacoes || 0}
      </span>
    )}
  ];

  const cols = columns.length > 0 ? columns : defaultColumns;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead style={{ borderBottom: '1px solid #f1f3f4' }}>
          <tr>
            {(cols || []).map(col => (
              <th key={col.key} className="text-left p-4 font-bold text-gray-600 text-sm">
                {col.label}
              </th>
            ))}
            <th className="text-right p-4 font-bold text-gray-600 text-sm">Ações</th>
          </tr>
        </thead>
        <tbody>
          {(items || []).map(item => (
            <tr key={item.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#f8f9fa' }}>
              {(cols || []).map(col => (
                <td key={col.key} className="p-4 text-sm" style={{ color: '#5f6368' }}>
                  {col.render(item)}
                </td>
              ))}
              <td className="p-4 text-right">
                <button onClick={() => onEdit(item)} className="p-2 hover:bg-purple-50 rounded-lg mr-2 min-h-[44px] min-w-[44px]">
                  <Edit className="w-4 h-4" style={{ color: '#7E57FF' }} />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-2 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px]">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}