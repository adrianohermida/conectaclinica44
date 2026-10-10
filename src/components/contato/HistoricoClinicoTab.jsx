import React, { Suspense, lazy } from "react";
import { FileText, Stethoscope, Calendar } from "lucide-react";
import { usePlano } from "@/components/providers/PlanoProvider";

const ProntuariosPaciente = lazy(() => import("@/components/paciente/ProntuariosPaciente"));
const PrescricoesPaciente = lazy(() => import("@/components/paciente/PrescricoesPaciente"));
const AgendaPaciente = lazy(() => import("@/components/paciente/AgendaPaciente"));
const TratamentosPaciente = lazy(() => import("@/components/paciente/TratamentosPaciente"));

export default function HistoricoClinicoTab({ contato, isMedico, isAdmin }) {
  const { temAcessoModulo } = usePlano();
  return (
    <div className="space-y-6">
      {/* PRONTUÁRIOS */}
      {temAcessoModulo('prontuarios') && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: '#e8eaed' }}>
            <FileText className="w-5 h-5" style={{ color: '#7E57FF' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#202124' }}>Prontuários</h3>
          </div>
          <Suspense fallback={<div className="pc-body-sm">Carregando...</div>}>
            <ProntuariosPaciente 
              pacienteId={contato?.id} 
              paciente={contato}
              isMedico={isMedico}
              isAdmin={isAdmin}
            />
          </Suspense>
        </div>
      )}

      {/* PRESCRIÇÕES */}
      {temAcessoModulo('prontuarios') && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: '#e8eaed' }}>
            <Stethoscope className="w-5 h-5" style={{ color: '#34a853' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#202124' }}>Prescrições</h3>
          </div>
          <Suspense fallback={<div className="pc-body-sm">Carregando...</div>}>
            <PrescricoesPaciente pacienteId={contato?.id} />
          </Suspense>
        </div>
      )}

      {/* AGENDA */}
      {temAcessoModulo('agenda') && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: '#e8eaed' }}>
            <Calendar className="w-5 h-5" style={{ color: '#0B7A9E' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#202124' }}>Consultas</h3>
          </div>
          <Suspense fallback={<div className="pc-body-sm">Carregando...</div>}>
            <AgendaPaciente 
              pacienteId={contato?.id} 
              paciente={contato}
            />
          </Suspense>
        </div>
      )}

      {/* TRATAMENTOS */}
      {temAcessoModulo('planos_tratamento') && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: '#e8eaed' }}>
            <Stethoscope className="w-5 h-5" style={{ color: '#fbbc04' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#202124' }}>Tratamentos</h3>
          </div>
          <Suspense fallback={<div className="pc-body-sm">Carregando...</div>}>
            <TratamentosPaciente 
              pacienteId={contato?.id}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}