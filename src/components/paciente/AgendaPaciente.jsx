import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import AgendamentoQuickFormInline from "@/components/agendamento/AgendamentoQuickFormInline";
import { Calendar, Plus } from "lucide-react";

export default function AgendaPaciente({ pacienteId, contato, onAgendarClick }) {
  const [showAgendar, setShowAgendar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ["agendamentos", pacienteId],
    queryFn: () => base44.entities.Agendamento.filter({ paciente_id: pacienteId }, "-data", 100),
    enabled: !!pacienteId
  });

  if (isLoading) return <div className="pc-body-sm">Carregando agenda...</div>;

  const hoje = new Date();
  const futuros = agendamentos.filter(a => new Date(a.data) >= hoje && a.status !== "cancelado");
  const passados = agendamentos.filter(a => new Date(a.data) < hoje || a.status === "cancelado");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="pc-heading-4">Agenda do Paciente</h3>
        <Button onClick={onAgendarClick || (() => setShowAgendar(true))}>
          <Plus className="w-4 h-4 mr-2" /> Agendar Consulta
        </Button>
      </div>

      {/* SlideInPanel Agendar */}
      {!onAgendarClick && (
        <SlideInPanel
          open={showAgendar}
          onClose={() => setShowAgendar(false)}
          title="Agendar Consulta"
        >
          <AgendamentoQuickFormInline
            pacientePreSelecionado={contato}
            onSuccess={() => setShowAgendar(false)}
            onCancel={() => setShowAgendar(false)}
          />
        </SlideInPanel>
      )}

      <div>
        <h4 className="pc-body font-bold mb-3" style={{ color: 'var(--pc-success)' }}>Próximas Consultas ({futuros.length})</h4>
        {futuros.length === 0 ? (
          <p className="pc-body-sm">Nenhuma consulta agendada</p>
        ) : (
          <div className="space-y-2">
            {futuros.map(a => (
              <div key={a.id} className="pc-card p-3" style={{ backgroundColor: 'var(--pc-success-50)', borderColor: 'var(--pc-success-100)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4" style={{ color: 'var(--pc-success)' }} />
                  <span className="pc-body font-bold">{format(new Date(a.data), "dd/MM/yyyy")} às {a.horario}</span>
                </div>
                <p className="pc-body-sm">{a.especialidade} - Dr(a). {a.medico}</p>
                {a.tipo_consulta === "telemedicina" && (
                  <span className="pc-badge pc-badge-neutral mt-1">Telemedicina</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="pc-body font-bold mb-3" style={{ color: 'var(--pc-text-secondary)' }}>Histórico ({passados.length})</h4>
        {passados.length === 0 ? (
          <p className="pc-body-sm">Nenhuma consulta anterior</p>
        ) : (
          <div className="space-y-2">
            {passados.slice(0, 10).map(a => (
              <div key={a.id} className="pc-card p-3" style={{ backgroundColor: 'var(--pc-gray-50)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4" style={{ color: 'var(--pc-text-tertiary)' }} />
                  <span className="pc-body-sm font-medium">{format(new Date(a.data), "dd/MM/yyyy")} às {a.horario}</span>
                  <span className={`pc-badge ${a.status === "cancelado" ? "pc-badge-error" : "pc-badge-success"}`}>
                    {a.status}
                  </span>
                </div>
                <p className="pc-body-sm">{a.especialidade} - Dr(a). {a.medico}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}