import React, { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { 
  identificarAgendamentosAntigos, 
  detectarDuplicadosSuspeitos 
} from "../utils/validacoesFase4";

export default function AlertaManutencao() {
  const [alertas, setAlertas] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    const verificarProblemas = async () => {
      try {
        const [agendamentos, pacientes] = await Promise.all([
          base44.entities.Agendamento.list(),
          base44.entities.Paciente.list()
        ]);

        const novosAlertas = [];

        // Agendamentos antigos pendentes
        const agendamentosAntigos = identificarAgendamentosAntigos(agendamentos);
        if (agendamentosAntigos.length > 0) {
          novosAlertas.push({
            id: 'agend_antigos',
            tipo: 'warning',
            titulo: `${agendamentosAntigos.length} agendamento(s) antigo(s) pendente(s)`,
            descricao: 'Existem agendamentos com mais de 30 dias sem conclusão ou cancelamento',
            acao: 'Revisar Agenda'
          });
        }

        // Duplicados suspeitos
        const duplicados = detectarDuplicadosSuspeitos(pacientes);
        if (duplicados.length > 0) {
          novosAlertas.push({
            id: 'pacientes_dup',
            tipo: 'warning',
            titulo: `${duplicados.length} possível(is) duplicação(ões) de paciente`,
            descricao: 'Encontrados pacientes com CPF/email idênticos',
            acao: 'Revisar Pacientes'
          });
        }

        setAlertas(novosAlertas.filter(a => !dismissed.includes(a.id)));
      } catch (e) {
        console.error("Erro ao verificar alertas:", e);
      }
    };

    verificarProblemas();
    const interval = setInterval(verificarProblemas, 5 * 60 * 1000); // 5min
    return () => clearInterval(interval);
  }, [dismissed]);

  const dispensarAlerta = (id) => {
    setDismissed([...dismissed, id]);
    setAlertas(alertas.filter(a => a.id !== id));
  };

  if (alertas.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {alertas.map(alerta => (
        <div 
          key={alerta.id}
          className="pc-card p-4 border-l-4 border-[var(--pc-warning)] bg-[var(--pc-warning-50)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <AlertTriangle className="w-5 h-5 text-[var(--pc-warning)] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-[var(--pc-warning-700)]">{alerta.titulo}</h4>
                <p className="pc-body-sm text-[var(--pc-warning-600)] mt-1">{alerta.descricao}</p>
                {alerta.acao && (
                  <button 
                    className="pc-btn-secondary mt-2 text-xs"
                    onClick={() => toast.info("Navegue até " + alerta.acao)}
                  >
                    {alerta.acao}
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => dispensarAlerta(alerta.id)}
              className="text-[var(--pc-warning-600)] hover:text-[var(--pc-warning-700)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}