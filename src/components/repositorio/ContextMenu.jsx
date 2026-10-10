import React, { useEffect, useRef } from "react";
import { 
  Eye, Edit, Trash2, Copy, FolderInput, Download, 
  FileText, Share2, Clock, Info, UserPlus, Shield, FileSignature, Unlink 
} from "lucide-react";

import { useItemPermissions } from "@/components/hooks/useItemPermissions";

export default function ContextMenu({ x, y, item, onClose, onAction }) {
  const { canView, canEdit, canDelete } = useItemPermissions(item);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const isLinkExterno = item.tipo_documento === 'link_externo';

  const isConectado = !!item.conexao_id;

  const actions = item.tipo === 'pasta' ? [
    { id: 'abrir', label: 'Abrir', icon: FolderInput },
    { id: 'compartilhar', label: 'Compartilhar', icon: Share2 },
    { id: 'permissions', label: 'Permissões', icon: UserPlus },
    { id: 'audit', label: 'Logs de auditoria', icon: Shield },
    { id: 'renomear', label: 'Renomear', icon: Edit },
    { id: 'propriedades', label: 'Propriedades', icon: Info },
    { id: 'excluir', label: 'Excluir', icon: Trash2, danger: true }
  ] : isLinkExterno ? [
    { id: 'visualizar', label: 'Abrir link', icon: Eye },
    { id: 'editar', label: 'Editar', icon: Edit },
    { id: 'compartilhar', label: 'Compartilhar', icon: Share2 },
    { id: 'permissions', label: 'Permissões', icon: UserPlus },
    { id: 'versoes', label: 'Histórico de versões', icon: Clock },
    { id: 'audit', label: 'Logs de auditoria', icon: Shield },
    { id: 'excluir', label: 'Excluir', icon: Trash2, danger: true }
  ] : [
    { id: 'visualizar', label: 'Visualizar', icon: Eye },
    { id: 'editar', label: 'Editar metadados', icon: Edit },
    { id: 'download', label: 'Download', icon: Download },
    { id: 'assinar', label: 'Enviar para assinatura', icon: FileSignature },
    { id: 'mover', label: 'Mover para...', icon: FolderInput },
    ...(isConectado ? [{ id: 'desconectar', label: 'Desconectar', icon: Unlink, danger: true }] : []),
    { id: 'compartilhar', label: 'Compartilhar', icon: Share2 },
    { id: 'permissions', label: 'Permissões', icon: UserPlus },
    { id: 'versoes', label: 'Histórico de versões', icon: Clock },
    { id: 'audit', label: 'Logs de auditoria', icon: Shield },
    { id: 'propriedades', label: 'Propriedades', icon: Info },
    { id: 'excluir', label: 'Excluir', icon: Trash2, danger: true }
  ];

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 py-1 z-[9999] min-w-[200px]"
      style={{ 
        left: `${x}px`, 
        top: `${y}px`,
        maxHeight: '400px',
        overflowY: 'auto'
      }}
    >
      {actions.map(action => (
        <button
          key={action.id}
          onClick={() => {
            onAction(action.id, item);
            onClose();
          }}
          className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
            action.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
          }`}
        >
          <action.icon className="w-4 h-4" />
          {action.label}
        </button>
      ))}
    </div>
  );
}