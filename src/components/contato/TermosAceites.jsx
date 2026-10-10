import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function TermosAceites({ contato }) {
  const { data: aceites = [], isLoading } = useQuery({
    queryKey: ["aceites-termos", contato?.email],
    queryFn: () => base44.entities.AceiteTermoLegal.filter({ usuario_email: contato.email }, "-timestamp_aceite"),
    enabled: !!contato?.email,
    staleTime: 15 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--pc-primary)' }} />
      </div>
    );
  }

  if (aceites.length === 0) {
    return (
      <div className="pc-card p-12 text-center">
        <FileText className="w-16 h-16 mx-auto mb-3" style={{ color: 'var(--pc-gray-400)' }} />
        <h3 className="pc-heading-4 mb-2">
          Nenhum termo aceito
        </h3>
        <p className="pc-body-sm">
          Este contato ainda não aceitou nenhum termo legal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="pc-heading-4">
        Termos Legais Aceitos
      </h2>

      <div className="space-y-3">
        {aceites.map((aceite) => (
          <div key={aceite.id} className="pc-card p-4">
            <div className="flex items-start gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: aceite.aceito ? 'var(--pc-success-50)' : 'var(--pc-warning-50)' }}
              >
                {aceite.aceito ? (
                  <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--pc-success)' }} />
                ) : (
                  <Clock className="w-5 h-5" style={{ color: 'var(--pc-warning)' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="pc-body font-bold">
                    {aceite.termo_legal_id?.replace(/_/g, ' ').toUpperCase() || "Termo Legal"}
                  </h3>
                  <span className={`pc-badge ${
                    aceite.aceito ? 'pc-badge-success' : 'pc-badge-warning'
                  }`}>
                    {aceite.aceito ? 'Aceito' : 'Pendente'}
                  </span>
                </div>
                <div className="space-y-1 pc-body-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Versão:</span>
                    <span>{aceite.termo_versao}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Data:</span>
                    <span>{format(new Date(aceite.timestamp_aceite), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                  {aceite.ip_address && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">IP:</span>
                      <span className="font-mono pc-caption">{aceite.ip_address}</span>
                    </div>
                  )}
                  {aceite.hash_aceite && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Hash:</span>
                      <span className="font-mono pc-caption truncate">{aceite.hash_aceite.substring(0, 16)}...</span>
                    </div>
                  )}
                  {aceite.revogado && (
                    <div className="mt-2 px-3 py-2 rounded-lg pc-caption font-medium" style={{ 
                      backgroundColor: 'var(--pc-error-50)', 
                      color: 'var(--pc-error)' 
                    }}>
                      ⚠️ Revogado em {format(new Date(aceite.data_revogacao), "dd/MM/yyyy")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}