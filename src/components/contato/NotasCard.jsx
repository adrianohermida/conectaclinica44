import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NotasCard({ contato }) {
  const [notas, setNotas] = useState(contato?.observacoes || "");
  const [salvando, setSalvando] = useState(false);
  const queryClient = useQueryClient();

  // Autosave após 2s de inatividade
  useEffect(() => {
    if (notas === contato?.observacoes) return;

    const timer = setTimeout(() => {
      salvarNotas();
    }, 2000);

    return () => clearTimeout(timer);
  }, [notas]);

  const salvarNotas = async () => {
    if (notas === contato?.observacoes) return;
    
    setSalvando(true);
    try {
      await base44.entities.Contato.update(contato.id, { observacoes: notas });
      queryClient.invalidateQueries({ queryKey: ["contato-completo", contato.id] });
      toast.success("Notas salvas");
    } catch (error) {
      toast.error("Erro ao salvar notas");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold flex items-center gap-2 uppercase" style={{ color: '#80868b', letterSpacing: '0.5px' }}>
          <FileText className="w-3.5 h-3.5" />
          Notas
        </h3>
        {salvando && (
          <div className="flex items-center gap-1 text-xs" style={{ color: '#80868b' }}>
            <Loader2 className="w-3 h-3 animate-spin" />
            Salvando...
          </div>
        )}
      </div>
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder="Anotações rápidas sobre o paciente..."
        className="w-full text-sm md:text-base border rounded-lg p-3 min-h-[100px] resize-none focus:outline-none focus:border-[#7E57FF] transition-colors"
        style={{ borderColor: '#e8eaed', fontSize: '16px' }}
      />
      <p className="text-xs mt-2" style={{ color: '#80868b' }}>
        Salva automaticamente após 2s
      </p>
    </div>
  );
}