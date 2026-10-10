import React from "react";

/**
 * Table + TableRow - PADRONIZA 8 tabelas inline
 * GestaoClinicas, Pacientes, Prontuarios, GestaoEquipe, Produtos, etc.
 */
export function Table({ 
  headers, 
  data, 
  renderRow, 
  onSelectAll, 
  selectedIds = [],
  showSelection = true,
  loading = false
}) {
  const allSelected = data.length > 0 && selectedIds.length === data.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b" style={{ borderColor: '#e8eaed', backgroundColor: '#f8f9fa' }}>
            {showSelection && onSelectAll && (
              <th className="p-3 w-12">
                <input 
                  type="checkbox" 
                  onChange={onSelectAll}
                  checked={allSelected}
                  className="rounded"
                  aria-label="Selecionar todos"
                />
              </th>
            )}
            {headers.map((h, i) => (
              <th key={i} className="text-left p-3 text-sm font-medium" style={{ color: '#5f6368' }}>
                {h}
              </th>
            ))}
            <th className="p-3 w-16 text-right text-sm font-medium" style={{ color: '#5f6368' }}>
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={headers.length + (showSelection ? 2 : 1)} className="p-8 text-center">
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-[#7E57FF] rounded-full animate-spin" />
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={headers.length + (showSelection ? 2 : 1)} className="p-8 text-center text-sm" style={{ color: '#5f6368' }}>
                Nenhum registro encontrado
              </td>
            </tr>
          ) : (
            data.map(row => renderRow(row))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TableRow({ 
  selected = false, 
  onSelect, 
  cells = [], 
  actions,
  onClick,
  showSelection = true
}) {
  return (
    <tr 
      className="border-b hover:bg-gray-50 transition-all cursor-pointer"
      style={{ borderColor: '#e8eaed' }}
      onClick={onClick}
    >
      {showSelection && onSelect && (
        <td className="p-3" onClick={(e) => e.stopPropagation()}>
          <input 
            type="checkbox" 
            checked={selected} 
            onChange={onSelect}
            className="rounded"
            aria-label="Selecionar item"
          />
        </td>
      )}
      {cells.map((cell, i) => (
        <td key={i} className="p-3 text-sm" style={{ color: '#202124' }}>
          {cell}
        </td>
      ))}
      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
        {actions}
      </td>
    </tr>
  );
}