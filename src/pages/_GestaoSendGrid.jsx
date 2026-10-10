import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Globe, CheckCircle, XCircle, Loader2, Plus, RefreshCw, AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";

export default function GestaoSendGrid() {
  const queryClient = useQueryClient();
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [addingSender, setAddingSender] = useState(false);
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("");

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: domains = [], isLoading: loadingDomains } = useQuery({
    queryKey: ["sendgrid-domains"],
    queryFn: async () => {
      const res = await base44.functions.invoke('getSendGridDomains', {});
      return res.data.domains || [];
    },
    enabled: !!user
  });

  const { data: senders = [], isLoading: loadingSenders } = useQuery({
    queryKey: ["sendgrid-senders"],
    queryFn: async () => {
      const res = await base44.functions.invoke('getSendGridSenders', {});
      return res.data.senders || [];
    },
    enabled: !!user
  });

  const addDomainMutation = useMutation({
    mutationFn: async (domain) => {
      const res = await base44.functions.invoke('adicionarDominioClinica', {
        domain,
        clinica_id: user.clinica_id
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["sendgrid-domains"]);
      setAddingDomain(false);
      setDomainInput("");
      toast.success("Domínio adicionado ao SendGrid", {
        description: "Configure os registros DNS abaixo"
      });
    },
    onError: (error) => {
      toast.error("Erro ao adicionar domínio", { description: error.message });
    }
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId) => {
      const res = await base44.functions.invoke('verificarDNSDominio', {
        domain_id: domainId
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["sendgrid-domains"]);
      if (data.verified) {
        toast.success("✅ Domínio verificado!");
      } else {
        toast.warning("DNS ainda não propagado", {
          description: "Aguarde até 48h para propagação"
        });
      }
    }
  });

  const addSenderMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('addSendGridSender', {
        from_email: senderEmail,
        from_name: senderName,
        reply_to_email: senderEmail
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["sendgrid-senders"]);
      setAddingSender(false);
      setSenderEmail("");
      setSenderName("");
      
      if (data.already_exists) {
        toast.info("Sender já existe", {
          description: data.verified ? "Verificado ✓" : "Pendente verificação"
        });
      } else {
        toast.success("Email de verificação enviado", {
          description: `Verifique ${senderEmail} e clique no link`,
          duration: 10000
        });
      }
    },
    onError: (error) => {
      toast.error("Erro ao adicionar sender", { description: error.message });
    }
  });

  if (loadingDomains || loadingSenders) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: '#5f6368' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="pc-card">
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: '#f1f3f4' }}>
          <div>
            <h2 className="text-lg font-normal" style={{ color: '#202124' }}>Domínios Autenticados</h2>
            <p className="text-sm mt-0.5" style={{ color: '#5f6368' }}>
              Configure DKIM/SPF para autenticar seu domínio
            </p>
          </div>
          <button
            onClick={() => setAddingDomain(true)}
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            style={{ backgroundColor: '#7E57FF', color: 'white' }}
          >
            <Plus className="w-4 h-4" />
            Adicionar Domínio
          </button>
        </div>

        <div className="divide-y" style={{ borderColor: '#f1f3f4' }}>
          {domains.length === 0 ? (
            <div className="p-12 text-center">
              <Globe className="w-12 h-12 mx-auto mb-4" style={{ color: '#7E57FF', opacity: 0.3 }} />
              <p className="text-base font-medium" style={{ color: '#202124' }}>
                Nenhum domínio autenticado
              </p>
            </div>
          ) : (
            domains.map((domain) => (
              <DomainCard
                key={domain.id}
                domain={domain}
                onVerify={() => verifyDomainMutation.mutate(domain.id)}
                isVerifying={verifyDomainMutation.isPending}
              />
            ))
          )}
        </div>
      </div>

      <div className="pc-card">
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: '#f1f3f4' }}>
          <div>
            <h2 className="text-lg font-normal" style={{ color: '#202124' }}>Senders Verificados</h2>
            <p className="text-sm mt-0.5" style={{ color: '#5f6368' }}>
              Emails que podem ser usados como remetentes
            </p>
          </div>
          <button
            onClick={() => setAddingSender(true)}
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            style={{ backgroundColor: '#7E57FF', color: 'white' }}
          >
            <Plus className="w-4 h-4" />
            Adicionar Sender
          </button>
        </div>

        <div className="divide-y" style={{ borderColor: '#f1f3f4' }}>
          {senders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm" style={{ color: '#5f6368' }}>Nenhum sender configurado</p>
            </div>
          ) : (
            senders.map((sender) => (
              <div key={sender.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {sender.verified ? (
                    <CheckCircle className="w-5 h-5" style={{ color: '#34a853' }} />
                  ) : (
                    <AlertTriangle className="w-5 h-5" style={{ color: '#fbbc04' }} />
                  )}
                  <div>
                    <p className="font-medium" style={{ color: '#202124' }}>{sender.from_name}</p>
                    <p className="text-sm font-mono" style={{ color: '#5f6368' }}>{sender.from_email}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  sender.verified 
                    ? 'bg-green-50 text-green-700'
                    : 'bg-yellow-50 text-yellow-700'
                }`}>
                  {sender.verified ? 'Verificado' : 'Pendente'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {addingDomain && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-normal mb-4" style={{ color: '#202124' }}>
              Adicionar Domínio
            </h3>
            <Input
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="suaempresa.com.br"
              className="mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setAddingDomain(false)}
                className="flex-1 px-4 py-2 rounded-lg border font-medium"
                style={{ borderColor: '#e8eaed' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => domainInput && addDomainMutation.mutate(domainInput)}
                disabled={!domainInput || addDomainMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: '#7E57FF', color: 'white' }}
              >
                {addDomainMutation.isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {addingSender && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-normal mb-4" style={{ color: '#202124' }}>
              Adicionar Sender
            </h3>
            <Input
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="contato@suaempresa.com.br"
              className="mb-3"
            />
            <Input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Nome Exibição"
              className="mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setAddingSender(false)}
                className="flex-1 px-4 py-2 rounded-lg border font-medium"
                style={{ borderColor: '#e8eaed' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => addSenderMutation.mutate()}
                disabled={!senderEmail || addSenderMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: '#7E57FF', color: 'white' }}
              >
                {addSenderMutation.isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DomainCard({ domain, onVerify, isVerifying }) {
  const [showDNS, setShowDNS] = useState(false);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 flex items-center gap-3">
          {domain.valid ? (
            <CheckCircle className="w-5 h-5" style={{ color: '#34a853' }} />
          ) : (
            <XCircle className="w-5 h-5" style={{ color: '#ea4335' }} />
          )}
          <div>
            <p className="font-medium" style={{ color: '#202124' }}>{domain.domain}</p>
            <p className="text-xs" style={{ color: domain.valid ? '#34a853' : '#5f6368' }}>
              {domain.valid ? '✓ Verificado e ativo' : '⚠ Aguardando configuração DNS'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowDNS(!showDNS)}
            className="px-3 py-1.5 rounded-lg border text-sm font-medium"
            style={{ borderColor: '#e8eaed' }}
          >
            {showDNS ? 'Ocultar' : 'Ver'} DNS
          </button>
          {!domain.valid && (
            <button
              onClick={onVerify}
              disabled={isVerifying}
              className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"
              style={{ backgroundColor: '#7E57FF', color: 'white' }}
            >
              <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
              Verificar
            </button>
          )}
        </div>
      </div>

      {showDNS && domain.dns && (
        <div className="space-y-3 mt-4">
          {Object.entries(domain.dns).map(([type, record]) => (
            <div key={type} className="p-4 rounded-lg" style={{ backgroundColor: '#f8f9fa' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium uppercase" style={{ color: '#5f6368' }}>
                  {type}
                </span>
                {record.valid ? (
                  <CheckCircle className="w-4 h-4" style={{ color: '#34a853' }} />
                ) : (
                  <XCircle className="w-4 h-4" style={{ color: '#ea4335' }} />
                )}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: '#5f6368' }}>Host:</span>
                  <code className="font-mono" style={{ color: '#202124' }}>{record.host}</code>
                </div>
                <div className="flex justify-between items-start">
                  <span style={{ color: '#5f6368' }}>Valor:</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-right break-all" style={{ color: '#202124' }}>
                      {record.data}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(record.data);
                        toast.success("Copiado");
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}