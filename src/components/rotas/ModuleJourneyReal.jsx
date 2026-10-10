import React, { useMemo } from 'react';
import { Database, Zap, Component, Package } from 'lucide-react';

/**
 * Module Journey REAL - Dados do scanCodebaseReal
 * Detecta dependências circulares, entity usage, function calls
 */
export default function ModuleJourneyReal({ modules }) {
  const analysis = useMemo(() => {
    const results = [];

    Object.entries(modules).forEach(([moduleName, data]) => {
      const complexity = 
        (data.pages?.length || 0) * 2 + 
        (data.entities?.length || 0) * 3 + 
        (data.functions?.length || 0) * 5 +
        (data.components?.length || 0);

      const maintainability = Math.max(0, 100 - complexity / 2);

      // Detectar deps circulares (heurística por imports)
      const circularRisk = (data.components || []).filter(comp => 
        Object.keys(modules).some(otherMod => 
          otherMod !== moduleName && comp.toLowerCase().includes(otherMod.substring(0, 5))
        )
      ).length;

      results.push({
        name: moduleName,
        pages: data.pages?.length || 0,
        entities: data.entities?.length || 0,
        functions: data.functions?.length || 0,
        components: data.components?.length || 0,
        queries: data.queries?.length || 0,
        complexity,
        maintainability,
        circularRisk,
        entitiesList: data.entities || [],
        functionsList: data.functions || [],
        componentsList: data.components || []
      });
    });

    return results.sort((a, b) => b.complexity - a.complexity);
  }, [modules]);

  const totalCircular = analysis.reduce((acc, m) => acc + m.circularRisk, 0);

  return (
    <div className="pc-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">📦 Module Journey (Dependências REAIS)</h3>
        <div className="flex gap-3 text-xs">
          <span className="pc-badge pc-badge-neutral">{analysis.length} módulos</span>
          {totalCircular > 0 && (
            <span className="pc-badge pc-badge-error">{totalCircular} deps circulares</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {analysis.slice(0, 9).map(mod => (
          <div key={mod.name} className="pc-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm">{mod.name}</h4>
              {mod.circularRisk > 0 && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
                  ⚠️ {mod.circularRisk}
                </span>
              )}
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Pages</span>
                <span className="font-bold">{mod.pages}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Components</span>
                <span className="font-bold">{mod.components}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Entities</span>
                <span className="font-bold">{mod.entities}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Functions</span>
                <span className="font-bold">{mod.functions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Queries</span>
                <span className="font-bold">{mod.queries}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Complexidade</span>
                <span className={`font-bold ${mod.complexity > 50 ? 'text-red-600' : 'text-green-600'}`}>
                  {mod.complexity}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Manutenibilidade</span>
                <span className={`font-bold ${mod.maintainability < 60 ? 'text-red-600' : 'text-green-600'}`}>
                  {Math.round(mod.maintainability)}/100
                </span>
              </div>
            </div>

            {/* Entities List */}
            {mod.entitiesList.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-gray-600 mb-1">Entities:</div>
                <div className="flex flex-wrap gap-1">
                  {mod.entitiesList.slice(0, 3).map(e => (
                    <span key={e} className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-800 rounded">
                      {e}
                    </span>
                  ))}
                  {mod.entitiesList.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                      +{mod.entitiesList.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Top 3 módulos mais complexos */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="text-sm font-bold text-orange-800 mb-2">⚠️ Módulos Mais Complexos (refatorar)</div>
        {analysis.slice(0, 3).map((mod, i) => (
          <div key={mod.name} className="text-xs text-orange-700 mb-1">
            {i + 1}. <strong>{mod.name}</strong>: {mod.complexity} pts (pages:{mod.pages}, entities:{mod.entities}, functions:{mod.functions})
          </div>
        ))}
      </div>
    </div>
  );
}