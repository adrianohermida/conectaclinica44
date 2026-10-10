import React from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, MoreVertical, Edit, Share2, Trash2, UserPlus, Clock } from "lucide-react";
import FolderDropZone from "./FolderDropZone";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FolderItem = React.memo(({ pasta, nivel, pastaAtual, onSelectPasta, onCreateSubpasta, isExpanded, toggleFolder, buildTree, expandedFolders, onContextAction, onDropOnFolder }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const isActive = pastaAtual === pasta.id;
  const children = buildTree(pasta.id);
  const hasChildren = children.length > 0;

  return (
    <div key={pasta.id}>
      <FolderDropZone
        pasta={pasta}
        onDrop={onDropOnFolder}
        className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 relative ${
          isActive ? 'bg-purple-50 text-purple-700 font-medium' : ''
        }`}
        style={{ paddingLeft: `${8 + nivel * 16}px` }}
        onClick={() => onSelectPasta(pasta.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(pasta.id);
            }}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}
        {isExpanded && hasChildren ? (
          <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: pasta.cor || '#7E57FF' }} />
        ) : (
          <Folder className="w-4 h-4 flex-shrink-0" style={{ color: pasta.cor || '#7E57FF' }} />
        )}
        <span className="text-xs truncate flex-1" title={`ID: ${pasta.id}`}>{pasta.nome}</span>
        {isHovered && (
          <div className="flex items-center gap-1">
            {onCreateSubpasta && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateSubpasta(pasta.id);
                }}
                className="p-1 hover:bg-purple-200 rounded bg-purple-100"
                title="Nova subpasta"
              >
                <Plus className="w-3 h-3 text-purple-700" />
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Mais opções"
                >
                  <MoreVertical className="w-3 h-3 text-gray-600" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onContextAction('renomear', pasta)}>
                  <Edit className="w-3.5 h-3.5 mr-2" />
                  Renomear
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onContextAction('compartilhar', { ...pasta, tipo: 'pasta' });
                }}>
                  <Share2 className="w-3.5 h-3.5 mr-2" />
                  Compartilhar
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-gray-400">
                  <UserPlus className="w-3.5 h-3.5 mr-2" />
                  Conceder acesso... <span className="ml-auto text-[9px] bg-gray-100 px-1.5 py-0.5 rounded">Em breve</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-gray-400">
                  <Clock className="w-3.5 h-3.5 mr-2" />
                  Histórico <span className="ml-auto text-[9px] bg-gray-100 px-1.5 py-0.5 rounded">Em breve</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onContextAction('excluir', pasta)}
                  className="text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </FolderDropZone>
      {isExpanded && hasChildren && (
        <div>
          {children.map(child => (
            <FolderItem
              key={child.id}
              pasta={child}
              nivel={nivel + 1}
              pastaAtual={pastaAtual}
              onSelectPasta={onSelectPasta}
              onCreateSubpasta={onCreateSubpasta}
              isExpanded={expandedFolders.has(child.id)}
              toggleFolder={toggleFolder}
              buildTree={buildTree}
              expandedFolders={expandedFolders}
              onContextAction={onContextAction}
              onDropOnFolder={onDropOnFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default function FolderTree({ pastas, pastaAtual, onSelectPasta, onCreateSubpasta, onContextAction, onDropOnFolder }) {
  const [expandedFolders, setExpandedFolders] = React.useState(new Set(['root']));
  const [raizHovered, setRaizHovered] = React.useState(false);

  const toggleFolder = (id) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const buildTree = (pastaId = null) => {
    return pastas.filter(p => p.pasta_pai_id === pastaId).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  };

  const rootFolders = buildTree(null);

  return (
    <div className="h-full overflow-y-auto pc-scrollbar">
      <div
        onClick={() => onSelectPasta(null)}
        onMouseEnter={() => setRaizHovered(true)}
        onMouseLeave={() => setRaizHovered(false)}
        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 mb-1 relative ${
          pastaAtual === null ? 'bg-purple-50 text-purple-700 font-medium' : ''
        }`}
      >
        <Folder className="w-4 h-4 text-purple-600 flex-shrink-0" />
        <span className="text-sm font-medium flex-1">Raiz</span>
        {raizHovered && onCreateSubpasta && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateSubpasta(null);
            }}
            className="p-1 hover:bg-purple-200 rounded bg-purple-100"
            title="Nova pasta na raiz"
          >
            <Plus className="w-3 h-3 text-purple-700" />
          </button>
        )}
      </div>
      {rootFolders.map(pasta => (
        <FolderItem
          key={pasta.id}
          pasta={pasta}
          nivel={0}
          pastaAtual={pastaAtual}
          onSelectPasta={onSelectPasta}
          onCreateSubpasta={onCreateSubpasta}
          isExpanded={expandedFolders.has(pasta.id)}
          toggleFolder={toggleFolder}
          buildTree={buildTree}
          expandedFolders={expandedFolders}
          onContextAction={onContextAction}
        />
      ))}
    </div>
  );
}