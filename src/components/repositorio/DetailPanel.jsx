import React from "react";
import { X, FileText, Calendar, User, HardDrive, Tag, Folder, Sparkles } from "lucide-react";
import { format } from "date-fns";

export default function DetailPanel({ item, onClose }) {
  if (!item) return null;

  const isPasta = item.tipo === 'pasta';

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto pc-scrollbar">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Detalhes</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Thumbnail */}
        <div className="w-full h-32 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg flex items-center justify-center">
          {isPasta ? (
            <Folder className="w-16 h-16 text-purple-400" />
          ) : (
            <FileText className="w-16 h-16 text-blue-400" />
          )}
        </div>

        {/* Nome */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Nome</p>
          <p className="font-medium text-gray-900">{item.titulo || item.nome}</p>
        </div>

        {/* Tipo */}
        {!isPasta && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Tipo</p>
            <p className="text-sm text-gray-900 uppercase">{item.tipo_arquivo}</p>
          </div>
        )}

        {/* Tamanho */}
        {!isPasta && item.tamanho_bytes && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Tamanho</p>
            <p className="text-sm text-gray-900">{(item.tamanho_bytes / 1024).toFixed(2)} KB</p>
          </div>
        )}

        {/* Categoria */}
        {!isPasta && item.categoria && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Categoria</p>
            <p className="text-sm text-gray-900">{item.categoria.replace(/_/g, ' ')}</p>
          </div>
        )}

        {/* Descrição */}
        {!isPasta && item.descricao && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Descrição</p>
            <p className="text-sm text-gray-900">{item.descricao}</p>
          </div>
        )}

        {/* Resumo IA */}
        {!isPasta && item.resumo_ia && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <p className="text-xs text-gray-500">Resumo IA</p>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{item.resumo_ia}</p>
          </div>
        )}

        {/* Tags */}
        {!isPasta && item.tags && item.tags.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Versão */}
        {!isPasta && item.versao && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Versão</p>
            <p className="text-sm text-gray-900">v{item.versao}</p>
          </div>
        )}

        {/* Datas */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Criado em</p>
          <p className="text-sm text-gray-900">
            {item.created_date ? format(new Date(item.created_date), 'dd/MM/yyyy HH:mm') : 'N/A'}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Modificado em</p>
          <p className="text-sm text-gray-900">
            {item.updated_date ? format(new Date(item.updated_date), 'dd/MM/yyyy HH:mm') : 'N/A'}
          </p>
        </div>

        {/* Indexado */}
        {!isPasta && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Indexado IA</p>
            <p className="text-sm">{item.indexado ? '✅ Sim' : '❌ Não'}</p>
          </div>
        )}
      </div>
    </div>
  );
}