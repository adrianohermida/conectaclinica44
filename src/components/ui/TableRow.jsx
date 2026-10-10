import React from "react";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * TableRow - Design System ConectaClínica
 * 
 * Linha de tabela padronizada com:
 * - Hover state
 * - Checkbox opcional
 * - Actions dropdown
 * - Células customizáveis
 * 
 * Props:
 * - cells: array de { content, className?, align? }
 * - actions: array de { label, onClick, icon?, danger? }
 * - selected: boolean
 * - onSelect: (checked) => void
 * - onRowClick: () => void
 */
export default function TableRow({ 
  cells = [],
  actions = [],
  selected = false,
  onSelect,
  onRowClick
}) {
  return (
    <tr 
      className="border-b hover:bg-gray-50 transition-all cursor-pointer"
      style={{ borderColor: '#e8eaed' }}
      onClick={onRowClick}
    >
      {/* Checkbox */}
      {onSelect && (
        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="w-5 h-5 rounded"
            style={{ accentColor: '#7E57FF' }}
            aria-label="Selecionar item"
          />
        </td>
      )}

      {/* Células */}
      {cells.map((cell, idx) => (
        <td 
          key={idx}
          className={`py-4 px-4 ${cell.className || ''}`}
          style={{ 
            textAlign: cell.align || 'left',
            ...cell.style 
          }}
        >
          {cell.content}
        </td>
      ))}

      {/* Actions Dropdown */}
      {actions.length > 0 && (
        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 hover:bg-gray-100 rounded-full transition-all"
                aria-label="Ações"
              >
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action, idx) => (
                <DropdownMenuItem
                  key={idx}
                  onClick={action.onClick}
                  className={action.danger ? 'text-red-600' : ''}
                >
                  {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      )}
    </tr>
  );
}