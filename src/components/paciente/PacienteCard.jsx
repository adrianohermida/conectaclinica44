import React from "react";
import { User, Phone, Mail, MapPin, Edit, Archive, Trash2, MoreVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function PacienteCard({ 
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
      className="bg-white rounded-2xl p-6 shadow-sm border-2 hover:border-purple-300 transition-all text-left relative"
      style={{ 
        borderColor: isSelected ? '#7E57FF' : '#e8eaed',
        contain: 'layout',
        willChange: isSelected ? 'border-color' : 'auto',
        transition: 'border-color 0.15s ease'
      }}
    >
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-gray-100 rounded transition-all">
              <MoreVertical className="w-4 h-4 text-gray-600" />
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

      <div onClick={onClick} className="cursor-pointer pr-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
            <User className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{contato.nome_completo}</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
              contato.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {contato.status || 'ativo'}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 text-sm text-gray-600">
          {(contato.telefones?.[0]?.numero || contato.telefone) && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" />
              {contato.telefones?.find(t => t.principal)?.numero || 
               contato.telefones?.[0]?.numero || 
               contato.telefone}
            </div>
          )}
          {(contato.emails?.[0]?.email || contato.email) && (
            <div className="flex items-center gap-2 truncate">
              <Mail className="w-3.5 h-3.5" />
              {contato.emails?.find(e => e.principal)?.email || 
               contato.emails?.[0]?.email || 
               contato.email}
            </div>
          )}
          {(contato.endereco?.cidade || contato.cidade) && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              {contato.endereco?.cidade || contato.cidade}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}