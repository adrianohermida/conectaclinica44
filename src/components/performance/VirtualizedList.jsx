import React from "react";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

/**
 * VirtualizedList - Lista virtualizada para performance
 * Renderiza apenas itens visíveis na viewport
 * 
 * USO CRÍTICO para listas > 50 itens (pacientes, prontuários, etc)
 */
export default function VirtualizedList({
  items = [],
  renderItem,
  itemHeight = 72,
  overscanCount = 5,
  className = "",
  emptyMessage = "Nenhum item encontrado"
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--pc-text-tertiary)]">
        {emptyMessage}
      </div>
    );
  }

  const Row = ({ index, style }) => (
    <div style={style} className="px-2">
      {renderItem(items[index], index)}
    </div>
  );

  return (
    <div className={`w-full ${className}`} style={{ height: "calc(100vh - 300px)", minHeight: "400px" }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={items.length}
            itemSize={itemHeight}
            width={width}
            overscanCount={overscanCount}
            className="pc-scrollbar"
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}

/**
 * VirtualizedGrid - Grid virtualizado para cards
 */
export function VirtualizedGrid({
  items = [],
  renderItem,
  itemHeight = 200,
  columns = 3,
  gap = 16,
  className = ""
}) {
  const rows = Math.ceil(items.length / columns);

  const Row = ({ index, style }) => {
    const startIndex = index * columns;
    const rowItems = items.slice(startIndex, startIndex + columns);
    
    return (
      <div style={style} className="flex gap-4 px-2">
        {rowItems.map((item, idx) => (
          <div key={startIndex + idx} className="flex-1">
            {renderItem(item, startIndex + idx)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`} style={{ height: "calc(100vh - 300px)" }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={rows}
            itemSize={itemHeight + gap}
            width={width}
            overscanCount={2}
            className="pc-scrollbar"
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}