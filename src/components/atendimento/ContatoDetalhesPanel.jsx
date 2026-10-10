import React from "react";
import { Mail, Phone, UserCircle, ExternalLink } from "lucide-react";

export default function ContatoDetalhesPanel({ contato }) {
  if (!contato) return null;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl" style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
        <h3 className="font-bold text-lg mb-1" style={{ color: '#4c1d95' }}>{contato.nome_completo}</h3>
        <p className="text-sm" style={{ color: '#6d28d9' }}>{contato.tipo_contato}</p>
      </div>

      <div className="grid gap-3">
        {(contato.emails?.[0]?.email || contato.email) && (
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#f8f9fa' }}>
            <Mail className="w-5 h-5 flex-shrink-0" style={{ color: '#5f6368' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: '#5f6368' }}>Email</p>
              <p className="text-sm truncate" style={{ color: '#202124' }}>
                {contato.emails?.find(e => e.principal)?.email || 
                 contato.emails?.[0]?.email || 
                 contato.email}
              </p>
            </div>
          </div>
        )}

        {contato.whatsapp && (
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#f8f9fa' }}>
            <Phone className="w-5 h-5 flex-shrink-0" style={{ color: '#5f6368' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: '#5f6368' }}>WhatsApp</p>
              <p className="text-sm truncate" style={{ color: '#202124' }}>{contato.whatsapp}</p>
            </div>
          </div>
        )}

        {contato.endereco_completo && (
          <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#f8f9fa' }}>
            <UserCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#5f6368' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: '#5f6368' }}>Endereço</p>
              <p className="text-sm" style={{ color: '#202124' }}>
                {contato.endereco_completo}
                {contato.cidade && `, ${contato.cidade}`}
                {contato.estado && ` - ${contato.estado}`}
              </p>
            </div>
          </div>
        )}

        {contato.observacoes && (
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#f8f9fa' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#5f6368' }}>Observações</p>
            <p className="text-sm" style={{ color: '#202124' }}>{contato.observacoes}</p>
          </div>
        )}
      </div>

      <button
        onClick={() => window.open(`/Pacientes?id=${contato.id}`, '_blank')}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
        style={{ backgroundColor: '#7E57FF', color: 'white' }}
      >
        <ExternalLink className="w-5 h-5" />
        Ver Perfil Completo
      </button>
    </div>
  );
}