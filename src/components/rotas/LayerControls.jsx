import React from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * LayerControls - Sistema de camadas para toggle de visualização
 * 
 * Permite ocultar/mostrar:
 * - Módulos específicos
 * - Tipos de nós (entities, functions, components)
 * - Rotas públicas vs. auth
 */
export default function LayerControls({ layers, onLayersChange, modules = [] }) {
  const toggleLayer = (key) => {
    onLayersChange({ ...layers, [key]: !layers[key] });
  };

  const moduleList = [...new Set(modules)].filter(Boolean);

  return (
    <div className="pc-card p-4">
      <h3 className="font-bold mb-3 text-sm">🎚️ Camadas de Visualização</h3>
      
      {/* Tipos de Conteúdo */}
      <div className="mb-4">
        <div className="text-xs font-bold text-gray-600 mb-2">Tipos de Nós:</div>
        <div className="space-y-1">
          {['entities', 'functions', 'components'].map(type => (
            <button
              key={type}
              onClick={() => toggleLayer(type)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-all ${
                layers[type] ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span>{type}</span>
              {layers[type] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* Módulos */}
      {moduleList.length > 0 && (
        <div>
          <div className="text-xs font-bold text-gray-600 mb-2">Módulos:</div>
          <div className="space-y-1 max-h-48 overflow-auto">
            {moduleList.map(mod => (
              <button
                key={mod}
                onClick={() => toggleLayer(`module_${mod}`)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-all ${
                  layers[`module_${mod}`] !== false ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span>{mod}</span>
                {layers[`module_${mod}`] !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}