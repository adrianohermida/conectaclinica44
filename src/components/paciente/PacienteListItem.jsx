import React from "react";
import { User, Phone, Mail, Edit, Archive, Trash2, MoreVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function PacienteListItem({ 
  contato, 
  isSelected, 
  onSelect, 
  onEdit, 
  onArquivar, 
  onExcluir,
  onClick 
}) {
  return (
    <div 
      className="p-4 hover:bg-gray-50 flex items-center gap-4" 
      style={{ 
        borderColor: isSelected ? '#7E57FF' : 'transparent',
        borderWidth: isSelected ? '2px' : '0px',
        contain: 'layout',
        willChange: isSelected ? 'border-color' : 'auto',
        transition: 'background-color 0.15s ease'
      }}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelect}
      />
      <div 
        className="rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 cursor-pointer"
        style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px' }}
        onClick={onClick}
      >
        <User style={{ width: '24px', height: '24px' }} className="text-purple-600" />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <p className="font-bold truncate">{contato.nome_completo}</p>
        <div className="flex flex-wrap gap-3 text-xs text-gray-600 mt-1">
          {(contato.telefones?.[0]?.numero || contato.telefone) && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {contato.telefones?.find(t => t.principal)?.numero || 
               contato.telefones?.[0]?.numero || 
               contato.telefone}
            </span>
          )}
          {(contato.emails?.[0]?.email || contato.email) && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {contato.emails?.find(e => e.principal)?.email || 
               contato.emails?.[0]?.email || 
               contato.email}
            </span>
          )}
        </div>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
        contato.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}>
        {contato.status}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="p-2 hover:bg-gray-100 rounded" 
            style={{ 
              transition: 'background-color 0.15s ease',
              willChange: 'background-color',
              minHeight: '44px',
              minWidth: '44px'
            }}
            aria-label={`Opções do paciente ${contato.nome_completo}`}
          >
            <MoreVertical className="w-4 h-4 text-gray-600" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" style={{ zIndex: 999999 }}>
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onArquivar}>
            <Archive className="w-4 h-4 mr-2" />
            Arquivar
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-600" onClick={onExcluir}>
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}