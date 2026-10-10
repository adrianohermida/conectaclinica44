import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { FileText, Eye, Lock } from "lucide-react";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import ModalJustificativaAcesso from "@/components/prontuario/ModalJustificativaAcesso";
import { toast } from "sonner";

export default function ProntuariosPaciente({ pacienteId, isMedico, isAdmin }) {
  const [showJustificativaModal, setShowJustificativaModal] = useState(false);
  const [prontuarioParaAcessar, setProntuarioParaAcessar] = useState(null);
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000
  });

  const { data: medicos = [] } = useQuery({
    queryKey: ["medicos", user?.clinica_id],
    queryFn: () => base44.entities.Medico.filter({ clinica_id: user.clinica_id }),
    enabled: !!user?.clinica_id,
    staleTime: 10 * 60 * 1000
  });

  const { data: prontuarios = [], isLoading } = useQuery({
    queryKey: ["prontuarios", pacienteId],
    queryFn: () => base44.entities.Prontuario.filter({ paciente_id: pacienteId }, "-data_atendimento", 50),
    enabled: !!pacienteId
  });

  if (isLoading) return <div className="pc-body-sm">Carregando prontuários...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="pc-heading-4">Prontuários do Paciente</h3>
      </div>

      {prontuarios.length === 0 ? (
        <div className="pc-card p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-3" style={{ color: 'var(--pc-gray-300)' }} />
          <p className="pc-body-sm">Nenhum prontuário registrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prontuarios.map(p => (
            <div key={p.id} className="pc-card p-5 hover:pc-card-elevated transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5" style={{ color: 'var(--pc-primary)' }} />
                    <span className="pc-body font-bold">{p.tipo_atendimento || "Consulta"}</span>
                    <span className="pc-body-sm">• {format(new Date(p.data_atendimento), "dd/MM/yyyy")}</span>
                  </div>
                  <p className="pc-body-sm mb-1"><strong>Médico:</strong> {p.medico_nome} - CRM {p.medico_crm}</p>
                  <p className="pc-body-sm"><strong>Queixa:</strong> {p.queixa_principal}</p>
                </div>
                {(isMedico || isAdmin) && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => {
                      // CFM 2.314/2022: Verificar se é médico responsável
                      const isSuperAdmin = user?.role === 'admin' || user?.email === 'contato@aetherlab.com.br';
                      const crmMedicoLogado = medicos.find(m => m.email === user?.email);
                      const crmFormatado = crmMedicoLogado?.crm || (crmMedicoLogado?.crms?.[0] ? `${crmMedicoLogado.crms[0].numero}/${crmMedicoLogado.crms[0].estado}` : null);
                      const isMedicoResponsavel = crmFormatado === p.medico_crm;
                      
                      if (isMedicoResponsavel || isSuperAdmin) {
                        window.location.href = `${createPageUrl("Prontuarios")}?view=${p.id}`;
                      } else {
                        setProntuarioParaAcessar(p);
                        setShowJustificativaModal(true);
                      }
                    }}
                  >
                    {(() => {
                      const isSuperAdmin = user?.role === 'admin' || user?.email === 'contato@aetherlab.com.br';
                      const crmMedicoLogado = medicos.find(m => m.email === user?.email);
                      const crmFormatado = crmMedicoLogado?.crm || (crmMedicoLogado?.crms?.[0] ? `${crmMedicoLogado.crms[0].numero}/${crmMedicoLogado.crms[0].estado}` : null);
                      const isMedicoResponsavel = crmFormatado === p.medico_crm;
                      return (isMedicoResponsavel || isSuperAdmin) ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />;
                    })()}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Justificativa CFM */}
      {showJustificativaModal && prontuarioParaAcessar && user && (
        <ModalJustificativaAcesso
          prontuario={prontuarioParaAcessar}
          user={user}
          onAutorizado={() => {
            window.location.href = `${createPageUrl("Prontuarios")}?view=${prontuarioParaAcessar.id}`;
            setShowJustificativaModal(false);
            setProntuarioParaAcessar(null);
          }}
          onNegado={() => {
            setShowJustificativaModal(false);
            setProntuarioParaAcessar(null);
            toast.info("Acesso negado - justificativa insuficiente.");
          }}
        />
      )}
    </div>
  );
}