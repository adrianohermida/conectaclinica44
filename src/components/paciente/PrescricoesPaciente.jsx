import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Stethoscope, Download } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";

export default function PrescricoesPaciente({ pacienteId }) {
  const { data: prescricoes = [], isLoading } = useQuery({
    queryKey: ["prescricoes", pacienteId],
    queryFn: () => base44.entities.PrescricaoEletronica.filter({ paciente_id: pacienteId }, "-data_prescricao", 50),
    enabled: !!pacienteId
  });

  if (isLoading) return <div className="pc-body-sm">Carregando prescrições...</div>;

  return (
    <div className="space-y-4">
      <h3 className="pc-heading-4">Prescrições Eletrônicas</h3>

      {prescricoes.length === 0 ? (
        <div className="pc-card p-12 text-center">
          <Stethoscope className="w-16 h-16 mx-auto mb-3" style={{ color: 'var(--pc-gray-300)' }} />
          <p className="pc-body-sm">Nenhuma prescrição registrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescricoes.map(p => (
            <div key={p.id} className="pc-card p-4 hover:pc-card-elevated pc-transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope className="w-5 h-5" style={{ color: 'var(--pc-success)' }} />
                    <span className="pc-body font-bold">Prescrição #{p.numero_prescricao}</span>
                    <span className="pc-body-sm">• {format(new Date(p.data_prescricao), "dd/MM/yyyy")}</span>
                  </div>
                  <p className="pc-body-sm mb-2"><strong>Médico:</strong> {p.medico_nome} - CRM {p.medico_crm}</p>
                  <div className="pc-body-sm">
                    <strong>Medicamentos:</strong>
                    <ul className="mt-1 space-y-1">
                      {p.medicamentos?.map((m, i) => (
                        <li key={i}>• {m.nome} - {m.dosagem} - {m.modo_uso}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {p.pdf_url && (
                  <Button variant="secondary" size="sm" onClick={() => window.open(p.pdf_url, "_blank")}>
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}