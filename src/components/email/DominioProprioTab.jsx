import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Info, CheckCircle, AlertCircle, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DominioProprioTab({ formData, setFormData, clinica }) {
  const [verificandoDNS, setVerificandoDNS] = useState(false);
  const [dnsRecords, setDnsRecords] = useState(null);

  const adicionarDominio = async () => {
    const domain = formData.dkim_domain || formData.email_remetente?.split('@')[1];
    
    if (!domain) {
      toast.error('Digite o email da clínica primeiro');
      return;
    }

    const toastId = toast.loading('➕ Autenticando domínio no SendGrid...');

    try {
      const res = await base44.functions.invoke('adicionarDominioClinica', {
        domain: domain,
        clinica_id: clinica.id
      });

      toast.dismiss(toastId);

      if (res.data.success) {
        setDnsRecords(res.data.dns_records);
        setFormData({
          ...formData,
          dkim_domain: domain,
          dkim_domain_id: res.data.domain_id,
          dkim_status: 'pendente'
        });
        
        toast.success('✅ Domínio adicionado ao SendGrid!', {
          description: 'Agora configure os registros DNS abaixo',
          duration: 8000
        });
      } else {
        toast.error('❌ Erro ao adicionar', { description: res.data.error });
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('❌ Erro', { description: error.message });
    }
  };

  const verificarDNS = async () => {
    if (!formData.dkim_domain_id) {
      toast.error('Adicione o domínio primeiro');
      return;
    }

    setVerificandoDNS(true);
    try {
      const res = await base44.functions.invoke('verificarDNSDominio', {
        domain_id: formData.dkim_domain_id,
        config_id: formData.id
      });

      if (res.data.valid) {
        setFormData({
          ...formData,
          dkim_status: 'verificado',
          ativo: true
        });
        toast.success('✅ DNS verificado!', {
          description: 'Email pode ser usado agora'
        });
      } else {
        toast.warning('⏳ DNS ainda não propagado', {
          description: res.data.message
        });
      }
    } catch (error) {
      toast.error('❌ Erro ao verificar', { description: error.message });
    } finally {
      setVerificandoDNS(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl" style={{ backgroundColor: '#e0f2fe', border: '1px solid #0284c7' }}>
        <div className="flex gap-2">
          <Info className="w-5 h-5 flex-shrink-0" style={{ color: '#0284c7' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#075985' }}>
              🌐 Email profissional da sua clínica
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#0c4a6e' }}>
              Use seu email institucional (ex: <strong>contato@prevenclin.med.br</strong>). 
              Você configurará registros DNS para autenticar o domínio.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#5f6368' }}>
          Email da sua clínica *
        </label>
        <Input
          value={formData.email_remetente || ''}
          onChange={(e) => setFormData({ ...formData, email_remetente: e.target.value })}
          placeholder="contato@prevenclin.med.br"
          className="font-mono text-sm"
        />
        <p className="text-xs mt-1" style={{ color: '#9aa0a6' }}>
          Use o email institucional da sua clínica
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#5f6368' }}>
          Domínio (extraído automaticamente)
        </label>
        <div className="flex gap-2">
          <Input
            value={formData.dkim_domain || formData.email_remetente?.split('@')[1] || ''}
            onChange={(e) => setFormData({ ...formData, dkim_domain: e.target.value })}
            placeholder="prevenclin.med.br"
            className="flex-1 font-mono text-sm"
            disabled={!!formData.email_remetente}
          />
          <button
            onClick={adicionarDominio}
            disabled={!formData.email_remetente && !formData.dkim_domain}
            className="px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
            style={{ backgroundColor: '#7E57FF', color: 'white' }}
          >
            ➕ Adicionar Domínio
          </button>
        </div>
      </div>

      {/* DNS Records */}
      {dnsRecords && (
        <div className="p-4 rounded-xl border-2" style={{ borderColor: '#fbbc04', backgroundColor: '#fef9e5' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5" style={{ color: '#fbbc04' }} />
            <p className="font-bold text-sm">⚙️ Configure estes registros DNS:</p>
          </div>

          <div className="space-y-3 text-xs">
            {dnsRecords.dkim?.map((record, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold">CNAME {idx + 1}</p>
                  <button
                    onClick={() => {
                      const texto = `${record.host} → ${record.data}`;
                      navigator.clipboard.writeText(texto);
                      toast.success('Copiado');
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <p className="mb-1"><strong>Host:</strong> <code className="bg-gray-100 px-1">{record.host}</code></p>
                <p className="break-all"><strong>Valor:</strong> <code className="bg-gray-100 px-1">{record.data}</code></p>
              </div>
            ))}

            {dnsRecords.mail_cname && (
              <div className="p-3 bg-white rounded-lg border">
                <p className="font-bold mb-2">CNAME Mail Server</p>
                <p><strong>Host:</strong> <code className="bg-gray-100 px-1">{dnsRecords.mail_cname.host}</code></p>
                <p className="break-all"><strong>Valor:</strong> <code className="bg-gray-100 px-1">{dnsRecords.mail_cname.data}</code></p>
              </div>
            )}

            {dnsRecords.dmarc_suggested && (
              <div className="p-3 bg-white rounded-lg border">
                <p className="font-bold mb-2">TXT _dmarc (Recomendado)</p>
                <p><strong>Host:</strong> <code className="bg-gray-100 px-1">_dmarc.{formData.dkim_domain}</code></p>
                <p className="break-all"><strong>Valor:</strong> <code className="bg-gray-100 px-1">{dnsRecords.dmarc_suggested}</code></p>
              </div>
            )}
          </div>

          <button
            onClick={verificarDNS}
            disabled={verificandoDNS}
            className="mt-4 w-full px-4 py-3 rounded-lg font-bold text-sm disabled:opacity-50"
            style={{ backgroundColor: '#34a853', color: 'white' }}
          >
            {verificandoDNS ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando...
              </span>
            ) : '🔍 Verificar DNS Agora'}
          </button>
        </div>
      )}

      {formData.dkim_status === 'verificado' && (
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#e6f7ed', border: '2px solid #34a853' }}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" style={{ color: '#34a853' }} />
            <p className="font-bold text-sm" style={{ color: '#137333' }}>
              ✅ Domínio verificado! Email pronto para uso.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}