import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, ExternalLink } from "lucide-react";

export default function PageSelector({ value, onChange }) {
  const [search, setSearch] = useState('');

  const { data: paginas = [], isLoading } = useQuery({
    queryKey: ['paginas-app'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listarPaginasApp', {});
      return res.data.paginas || [];
    },
    staleTime: 5 * 60 * 1000
  });

  const filtered = paginas.filter(p => 
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.path.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = {
    publica: filtered.filter(p => p.tipo === 'publica'),
    clinica: filtered.filter(p => p.tipo === 'clinica'),
    superadmin: filtered.filter(p => p.tipo === 'superadmin'),
    portal: filtered.filter(p => p.tipo.startsWith('portal_'))
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar página..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
        />
      </div>

      <div className="max-h-80 overflow-y-auto border rounded-lg">
        {Object.entries(grouped).map(([tipo, pages]) => {
          if (pages.length === 0) return null;
          return (
            <div key={tipo}>
              <div className="px-3 py-2 bg-gray-50 border-b sticky top-0">
                <p className="text-xs font-bold text-gray-600 uppercase">{tipo}</p>
              </div>
              <div className="divide-y">
                {pages.map(p => (
                  <button
                    key={p.path}
                    onClick={() => onChange(p.path)}
                    className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                      value === p.path ? 'bg-purple-50 border-l-4 border-purple-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{p.nome}</p>
                        <code className="text-xs text-gray-500">{p.path}</code>
                      </div>
                      {p.modulo && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {p.modulo}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}