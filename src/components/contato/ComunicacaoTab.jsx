import React, { Suspense, lazy } from "react";
import { MessageSquare, FileCheck } from "lucide-react";
import TermosAceites from "@/components/contato/TermosAceites";

const TicketsList = lazy(() => import("@/components/contato/TicketsList"));
const AcessoPortalPaciente = lazy(() => import("@/components/paciente/AcessoPortalPaciente"));

export default function ComunicacaoTab({ contato }) {
  return (
    <div className="space-y-6">
      {/* TICKETS */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: '#e8eaed' }}>
          <MessageSquare className="w-5 h-5" style={{ color: '#7E57FF' }} />
          <h3 className="text-lg font-semibold" style={{ color: '#202124' }}>Atendimento & Tickets</h3>
        </div>
        <Suspense fallback={<div className="pc-body-sm">Carregando...</div>}>
          <TicketsList contatoId={contato.id} contato={contato} />
        </Suspense>
      </div>

      {/* TERMOS ACEITOS */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: '#e8eaed' }}>
          <FileCheck className="w-5 h-5" style={{ color: '#0B7A9E' }} />
          <h3 className="text-lg font-semibold" style={{ color: '#202124' }}>Termos & Consentimentos</h3>
        </div>
        <TermosAceites contato={contato} />
      </div>

      {/* ACESSO PORTAL */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: '#e8eaed' }}>
          <FileCheck className="w-5 h-5" style={{ color: '#34a853' }} />
          <h3 className="text-lg font-semibold" style={{ color: '#202124' }}>Portal do Paciente</h3>
        </div>
        <Suspense fallback={<div className="pc-body-sm">Carregando...</div>}>
          <AcessoPortalPaciente contato={contato} />
        </Suspense>
      </div>
    </div>
  );
}