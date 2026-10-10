import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function PendenciasCard({ contatoId }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novaPendencia, setNovaPendencia] = useState("");
  const queryClient = useQueryClient();

  // Mock data - substituir por query real quando entity Pendencia for criada
  const [pendencias, setPendencias] = useState([
    { id: 1, descricao: "Retorno em 7 dias", concluida: false },
    { id: 2, descricao: "Solicitar exames", concluida: false }
  ]);

  const togglePendencia = (id) => {
    setPendencias(pendencias.map(p => 
      p.id === id ? { ...p, concluida: !p.concluida } : p
    ));
  };

  const adicionarPendencia = () => {
    if (!novaPendencia.trim()) return;
    
    setPendencias([...pendencias, {
      id: Date.now(),
      descricao: novaPendencia,
      concluida: false
    }]);
    setNovaPendencia("");
    setMostrarForm(false);
    toast.success("Pendência adicionada");
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold flex items-center gap-2 uppercase" style={{ color: '#80868b', letterSpacing: '0.5px' }}>
          <Clock className="w-3.5 h-3.5" />
          Pendências
        </h3>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="p-1 hover:bg-gray-100 rounded-full transition-all"
          title="Adicionar pendência"
        >
          <Plus className="w-4 h-4" style={{ color: '#7E57FF' }} />
        </button>
      </div>

      {mostrarForm && (
        <div className="mb-3 space-y-2">
          <Input
            value={novaPendencia}
            onChange={(e) => setNovaPendencia(e.target.value)}
            placeholder="Digite a pendência..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') adicionarPendencia();
            }}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={adicionarPendencia} className="min-h-[48px]">Adicionar</Button>
            <Button size="sm" variant="outline" onClick={() => setMostrarForm(false)} className="min-h-[48px]">Cancelar</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {pendencias.length === 0 ? (
          <p className="text-xs" style={{ color: '#80868b' }}>Nenhuma pendência</p>
        ) : (
          pendencias.map(pend => (
            <div key={pend.id} className="flex items-center gap-2">
              <button
                onClick={() => togglePendencia(pend.id)}
                className="flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                style={{
                  borderColor: pend.concluida ? '#34a853' : '#e8eaed',
                  backgroundColor: pend.concluida ? '#34a853' : 'transparent'
                }}
              >
                {pend.concluida && <Check className="w-3 h-3 text-white" />}
              </button>
              <span 
                className={`text-sm flex-1 ${pend.concluida ? 'line-through' : ''}`}
                style={{ color: pend.concluida ? '#80868b' : '#202124' }}
              >
                {pend.descricao}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}