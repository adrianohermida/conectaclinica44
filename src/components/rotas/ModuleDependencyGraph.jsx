import React, { useMemo } from 'react';
import { Card } from '@/components/ui/Card';

/**
 * Module Journey Visualização - Grafo de dependências entre módulos
 */
export default function ModuleDependencyGraph({ modules }) {
  const graph = useMemo(() => {
    if (!modules || modules.length === 0) return { nodes: [], edges: [] };

    const nodes = modules.map(m => ({
      id: m.name,
      label: m.name,
      pages: m.pages?.length || 0,
      entities: m.entities?.length || 0,
      functions: m.functions?.length || 0
    }));

    const edges = [];
    modules.forEach(m => {
      (m.dependencies || []).forEach(dep => {
        edges.push({
          from: m.name,
          to: dep,
          type: 'depends'
        });
      });
    });

    return { nodes, edges };
  }, [modules]);

  if (graph.nodes.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-500">
        <p>Nenhum módulo detectado</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {graph.nodes.map(node => (
          <Card key={node.id} className="p-4 hover:shadow-md transition-shadow">
            <h4 className="font-bold text-lg mb-2">{node.label}</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>📄 {node.pages} páginas</p>
              <p>🗄️ {node.entities} entidades</p>
              <p>⚡ {node.functions} funções</p>
            </div>
            
            {graph.edges.filter(e => e.from === node.id).length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-500 mb-1">Dependências:</p>
                <div className="flex flex-wrap gap-1">
                  {graph.edges
                    .filter(e => e.from === node.id)
                    .map(e => (
                      <span key={e.to} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        → {e.to}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <h4 className="font-bold mb-2">📊 Resumo de Dependências</h4>
        <div className="text-sm space-y-1">
          <p>• Total módulos: {graph.nodes.length}</p>
          <p>• Total dependências: {graph.edges.length}</p>
          <p>• Módulo mais acoplado: {getMostCoupled(graph).name} ({getMostCoupled(graph).count} deps)</p>
        </div>
      </Card>
    </div>
  );
}

function getMostCoupled(graph) {
  const counts = {};
  graph.edges.forEach(e => {
    counts[e.from] = (counts[e.from] || 0) + 1;
  });
  
  const max = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { name: max?.[0] || 'N/A', count: max?.[1] || 0 };
}