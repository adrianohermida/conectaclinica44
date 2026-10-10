import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, Mail, CheckCircle, XCircle, MousePointer, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Email Debug Panel - Busca email específico + histórico completo
 * ENRIQUECIDO: Sender, template, destinatário, status entrega
 */
export default function EmailDebugPanel() {
  const [emailBusca, setEmailBusca] = useState('');
  const [searching, setSearching] = useState(false);

  const { data: emailsHoje, isLoading: loadingHoje } = useQuery({
    queryKey: ['status-emails-hoje'],
    queryFn: async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const emails = await base44.entities.StatusEntregaEmail.filter({
        created_date: { $gte: hoje.toISOString() }
      }, '-created_date', 50);
      
      return emails;
    },
    refetchInterval: 30000
  });

  const { data: activityResult, refetch: searchActivity } = useQuery({
    queryKey: ['sendgrid-activity', emailBusca],
    queryFn: async () => {
      if (!emailBusca) return null;
      const res = await base44.functions.invoke('searchSendGridActivity', { email: emailBusca });
      return res.data;
    },
    enabled: false
  });

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!emailBusca) return;
    
    setSearching(true);
    await searchActivity();
    setSearching(false);
  };

  return (
    <div className="space-y-4">
      {/* Busca email específico */}
      <div className="pc-card p-4">
        <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
          <Search className="w-4 h-4" />
          Buscar Email Específico
        </h4>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="email"
            placeholder="email@paciente.com"
            value={emailBusca}
            onChange={(e) => setEmailBusca(e.target.value)}
            className="flex-1"
          />
          <button
            type="submit"
            disabled={searching || !emailBusca}
            className="px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: '#7E57FF', color: 'white' }}
          >
            {searching ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Buscando...</>
            ) : (
              <><Search className="w-4 h-4" /> Buscar</>
            )}
          </button>
        </form>

        {activityResult && (
          <div className="mt-4 space-y-2">
            {activityResult.messages?.length > 0 ? (
              activityResult.messages.map((msg, idx) => (
                <div key={idx} className="p-3 rounded-lg border text-xs" style={{ borderColor: '#e8eaed' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{msg.subject}</span>
                    <StatusBadge status={msg.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
                    <div>
                      <strong>Para:</strong> {msg.to_email}
                    </div>
                    <div>
                      <strong>De:</strong> {msg.from_email}
                    </div>
                    <div>
                      <strong>Enviado:</strong> {new Date(msg.last_event_time).toLocaleString('pt-BR')}
                    </div>
                    <div>
                      <strong>Template:</strong> {msg.template_id || 'N/A'}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {msg.opens_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                        👁 {msg.opens_count} abertura(s)
                      </span>
                    )}
                    {msg.clicks_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
                        🖱 {msg.clicks_count} clique(s)
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhum email encontrado para {emailBusca}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Lista emails de hoje */}
      <div className="pc-card p-4">
        <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Emails Enviados Hoje ({emailsHoje?.length || 0})
        </h4>

        {loadingHoje ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: '#7E57FF' }} />
          </div>
        ) : emailsHoje && emailsHoje.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {emailsHoje.map((email) => (
              <div key={email.id} className="p-3 rounded-lg border hover:bg-gray-50 transition-all" style={{ borderColor: '#e8eaed' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{email.assunto || 'Sem assunto'}</p>
                    <p className="text-xs text-gray-600 truncate mt-0.5">
                      Para: {email.destinatario}
                    </p>
                  </div>
                  <StatusBadge status={email.status} />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <strong>De:</strong> {email.sender_nome || email.sender_email || 'N/A'}
                  </div>
                  <div>
                    <strong>Enviado:</strong> {new Date(email.created_date).toLocaleTimeString('pt-BR')}
                  </div>
                  {email.template_usado && (
                    <div className="col-span-2">
                      <strong>Template:</strong> <code className="px-1 bg-gray-100 rounded">{email.template_usado}</code>
                    </div>
                  )}
                </div>

                {email.sendgrid_message_id && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {email.foi_aberto && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                        👁 {email.total_aberturas || 1}× aberto
                      </span>
                    )}
                    {email.foi_clicado && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                        🖱 {email.total_cliques || 1}× clicado
                      </span>
                    )}
                    {email.bounce_reason && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">
                        ⚠️ {email.bounce_reason}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">
            Nenhum email enviado hoje
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const configs = {
    'delivered': { icon: CheckCircle, label: 'Entregue', color: '#34a853', bg: '#e6f7ed' },
    'processed': { icon: Mail, label: 'Processando', color: '#7E57FF', bg: '#f5f3ff' },
    'bounce': { icon: XCircle, label: 'Bounce', color: '#ea4335', bg: '#fde7e7' },
    'dropped': { icon: AlertCircle, label: 'Descartado', color: '#fbbc04', bg: '#fef9e5' },
    'spam_report': { icon: AlertCircle, label: 'Spam', color: '#ea4335', bg: '#fde7e7' },
    'pending': { icon: Mail, label: 'Pendente', color: '#80868b', bg: '#f8f9fa' }
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <div 
      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </div>
  );
}