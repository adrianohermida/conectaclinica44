import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, AlertCircle, CheckCircle2, RefreshCw, Trash2, Eye, Filter } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { toast } from "sonner";
import RouteGuard from "@/components/auth/RouteGuard";

function EmailsRecebidosContent() {
  const [filtroProcessed, setFiltroProcessed] = useState('todos');
  const [filtroClinica, setFiltroClinica] = useState('todas');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['emails-recebidos', filtroProcessed, filtroClinica],
    queryFn: async () => {
      let query = {};
      
      if (filtroProcessed !== 'todos') {
        query.processed = filtroProcessed === 'processados';
      }
      
      if (filtroClinica !== 'todas' && filtroClinica) {
        query.clinica_id = filtroClinica;
      }
      
      const result = await base44.entities.EmailRecebido.filter(query);
      return result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    refetchInterval: 10000 // Atualizar a cada 10s
  });

  const { data: clinicas = [] } = useQuery({
    queryKey: ['clinicas'],
    queryFn: () => base44.entities.Clinica.list(),
    enabled: user?.role === 'admin'
  });

  const reprocessarMutation = useMutation({
    mutationFn: async (email) => {
      // Simular POST webhook
      const res = await base44.functions.invoke('testarRecebimentoEmail', {
        to: email.to_email,
        from: email.from_email,
        subject: email.subject,
        text: email.body_text,
        html: email.body_html
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['emails-recebidos']);
      toast.success('Email reprocessado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao reprocessar: ' + error.message);
    }
  });

  const deletarMutation = useMutation({
    mutationFn: (emailId) => base44.entities.EmailRecebido.delete(emailId),
    onSuccess: () => {
      queryClient.invalidateQueries(['emails-recebidos']);
      toast.success('Email deletado');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: '#7E57FF' }} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Emails Recebidos (Debug)"
        description="Monitor de emails recebidos via SendGrid Inbound Parse"
        breadcrumbs={[
          { label: 'Admin', url: '/SuperAdmin' },
          { label: 'Emails Recebidos' }
        ]}
      />

      {/* Filtros */}
      <div className="pc-card p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5" style={{ color: '#7E57FF' }} />
          
          <select
            value={filtroProcessed}
            onChange={(e) => setFiltroProcessed(e.target.value)}
            className="px-3 py-2 rounded-lg border"
            style={{ borderColor: '#e8eaed' }}
          >
            <option value="todos">Todos</option>
            <option value="processados">✅ Processados</option>
            <option value="nao_processados">❌ Falharam</option>
          </select>

          {user?.role === 'admin' && (
            <select
              value={filtroClinica}
              onChange={(e) => setFiltroClinica(e.target.value)}
              className="px-3 py-2 rounded-lg border"
              style={{ borderColor: '#e8eaed' }}
            >
              <option value="todas">Todas Clínicas</option>
              {clinicas.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          )}

          <div className="ml-auto text-sm" style={{ color: '#5f6368' }}>
            {emails.length} email(s)
          </div>
        </div>
      </div>

      {/* Lista de Emails */}
      <div className="space-y-4">
        {emails.map(email => (
          <div key={email.id} className="pc-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                {email.processed ? (
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: '#34a853' }} />
                ) : (
                  <AlertCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#ea4335' }} />
                )}
                <div>
                  <h3 className="font-medium text-lg" style={{ color: '#202124' }}>
                    {email.subject}
                  </h3>
                  <div className="text-sm mt-1" style={{ color: '#5f6368' }}>
                    <span className="font-medium">De:</span> {email.from_email}
                    <span className="mx-2">→</span>
                    <span className="font-medium">Para:</span> {email.to_email}
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#80868b' }}>
                    {new Date(email.created_date).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!email.processed && (
                  <button
                    onClick={() => reprocessarMutation.mutate(email)}
                    disabled={reprocessarMutation.isPending}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: '#7E57FF', color: 'white' }}
                  >
                    {reprocessarMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 inline mr-1" />
                        Reprocessar
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm('Deletar este email?')) {
                      deletarMutation.mutate(email.id);
                    }
                  }}
                  className="p-2 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" style={{ color: '#ea4335' }} />
                </button>
              </div>
            </div>

            {/* Status e Erro */}
            {email.processed ? (
              <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: '#e6f7ed', border: '1px solid #34a853' }}>
                <div className="text-sm font-medium" style={{ color: '#1f6332' }}>
                  ✅ Processado com sucesso
                </div>
                {email.ticket_id && (
                  <div className="text-xs mt-1" style={{ color: '#34a853' }}>
                    Ticket criado: {email.ticket_id}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                <div className="text-sm font-medium" style={{ color: '#991b1b' }}>
                  ❌ Erro ao processar
                </div>
                {email.error_message && (
                  <div className="text-xs mt-1" style={{ color: '#dc2626' }}>
                    {email.error_message}
                  </div>
                )}
              </div>
            )}

            {/* Preview do corpo */}
            <details className="cursor-pointer">
              <summary className="text-sm font-medium" style={{ color: '#5f6368' }}>
                <Eye className="w-4 h-4 inline mr-2" />
                Ver conteúdo
              </summary>
              <div className="mt-3 p-4 rounded-lg" style={{ backgroundColor: '#f8f9fa' }}>
                <pre className="text-xs whitespace-pre-wrap" style={{ color: '#202124' }}>
                  {email.body_text || 'Sem conteúdo texto'}
                </pre>
              </div>
            </details>
          </div>
        ))}

        {emails.length === 0 && (
          <div className="pc-card p-12 text-center">
            <Mail className="w-16 h-16 mx-auto mb-4" style={{ color: '#e8eaed' }} />
            <p className="text-lg font-medium mb-2" style={{ color: '#5f6368' }}>
              Nenhum email recebido
            </p>
            <p className="text-sm" style={{ color: '#80868b' }}>
              Emails recebidos via Inbound Parse aparecerão aqui
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmailsRecebidos() {
  return (
    <RouteGuard>
      <EmailsRecebidosContent />
    </RouteGuard>
  );
}