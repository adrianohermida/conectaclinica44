import React from "react";
import { Package, Database, Zap } from "lucide-react";

export default function ModuleJourneyLayer({ modules, selectedModule, onSelectModule }) {
  return (
    <div className="pc-card p-4">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        <Package className="w-4 h-4" />
        Module Journey
      </h3>
      
      <div className="space-y-2">
        {Object.entries(modules).map(([name, data]) => (
          <button
            key={name}
            onClick={() => onSelectModule(name)}
            className={`w-full text-left p-3 rounded-lg transition-all ${
              selectedModule === name ? 'bg-purple-100 border-2 border-purple-400' : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="font-bold text-sm mb-1">{name}</div>
            <div className="flex gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {data.pages?.length || 0} páginas
              </span>
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                {data.entities?.length || 0} entities
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {data.queries?.length || 0} queries
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}