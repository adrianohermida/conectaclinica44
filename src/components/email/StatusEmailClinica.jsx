import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Mail, CheckCircle, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function StatusEmailClinica({ clinica_id }) {
  const { data: configEmail } = useQuery({
    queryKey: ["config-email-status", clinica_id],
    queryFn: async () => {
      const configs = await base44.entities.ConfiguracaoEmail.filter({ clinica_id });
      
      if (configs.length > 0) {
        return configs[0];
      }
      
      // AUTO-CREATE alias se não existir
      const clinicas = await base44.entities.Clinica.list();
      const clinica = clinicas.find(c => c.id === clinica_id || c.clinica_id === clinica_id);
      
      if (clinica?.slug) {
        const aliasClinica = `${clinica.slug}@conectaclinica.com.br`;
        return await base44.entities.ConfiguracaoEmail.create({
          clinica_id,
          usar_email_builtin: true,
          provedor: 'base44_builtin',
          alias_recebimento: aliasClinica,
          email_remetente: aliasClinica,
          nome_remetente: clinica.nome,
          ativo: false
        });
      }
      
      return { usar_email_builtin: true, provedor: 'base44_builtin' };
    },
    enabled: !!clinica_id,
    staleTime: 60000
  });

  if (!configEmail) return null;

  const usandoBuiltin = configEmail.usar_email_builtin !== false;
  const smtpAtivo = configEmail.ativo && !usandoBuiltin;
  const temAlias = !!configEmail.alias_recebimento;

  return (
    <div className="pc-card p-4 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-5 h-5" style={{ color: '#7E57FF' }} />
        <h3 className="font-bold text-sm">Status do Email</h3>
      </div>

      {/* ENVIO */}
      <div className="flex items-start gap-3 p-3 rounded-lg" style={{ 
        backgroundColor: usandoBuiltin ? '#e6f7ed' : smtpAtivo ? '#e8f1fb' : '#fef9e5' 
      }}>
        {usandoBuiltin ? (
          <>
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#34a853' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold mb-0.5" style={{ color: '#1f6332' }}>✅ Envio Ativo (Base44 Built-in)</p>
              <p className="text-xs" style={{ color: '#5f6368' }}>
                Emails saem como: <code className="bg-white px-1 py-0.5 rounded">noreply@conectaclinica.com.br</code>
              </p>
            </div>
          </>
        ) : smtpAtivo ? (
          <>
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#1a73e8' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold mb-0.5" style={{ color: '#0e4082' }}>✅ SMTP Customizado Ativo</p>
              <p className="text-xs" style={{ color: '#5f6368' }}>
                Emails saem como: <code className="bg-white px-1 py-0.5 rounded">{configEmail.email_remetente}</code>
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#956802' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold mb-0.5" style={{ color: '#956802' }}>⚠️ SMTP Configurado mas Inativo</p>
              <p className="text-xs" style={{ color: '#5f6368' }}>Usando Base44 como fallback</p>
            </div>
          </>
        )}
      </div>

      {/* RECEBIMENTO */}
      <div className="flex items-start gap-3 p-3 rounded-lg" style={{ 
        backgroundColor: temAlias ? '#e6f7ed' : '#fde7e7' 
      }}>
        {temAlias ? (
          <>
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#34a853' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold mb-0.5" style={{ color: '#1f6332' }}>✅ Recebimento Configurado</p>
              <p className="text-xs" style={{ color: '#5f6368' }}>
                Alias: <code className="bg-white px-1 py-0.5 rounded">{configEmail.alias_recebimento}</code>
              </p>
            </div>
          </>
        ) : (
          <>
            <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#ea4335' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold mb-0.5" style={{ color: '#842820' }}>❌ Recebimento Não Configurado</p>
              <p className="text-xs" style={{ color: '#5f6368' }}>Configure alias para receber emails no sistema</p>
            </div>
          </>
        )}
      </div>

      <Link
        to={createPageUrl("ConfiguracaoEmail")}
        className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-medium transition-all hover:opacity-80"
        style={{ backgroundColor: '#7E57FF', color: '#ffffff' }}
      >
        <span>Configurar Email</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}