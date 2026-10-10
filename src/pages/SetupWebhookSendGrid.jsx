import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Shield, Copy, CheckCircle, AlertCircle, ExternalLink, Zap, Lock } from "lucide-react";
import { toast } from "sonner";

export default function SetupWebhookSendGrid() {
  return (
    <RouteGuard requireAuth>
      <SetupContent />
    </RouteGuard>
  );
}

function SetupContent() {
  const [copiedItem, setCopiedItem] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  // URL do webhook (production) - COM token secreto
  const webhookUrl = `${window.location.origin}/api/apps/${import.meta.env.VITE_BASE44_APP_ID}/functions/webhookReceberEmail?token=SEU_TOKEN_AQUI`;
  
  const copy = (text, item) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(item);
    setTimeout(() => setCopiedItem(null), 2000);
    toast.success('Copiado!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="🔐 Setup Webhook SendGrid"
        description="Configure validação HMAC para segurança máxima"
        breadcrumbs={[
          { label: "SuperAdmin", url: "/SuperAdmin" },
          { label: "SendGrid", url: "/SuperAdminSendGrid" },
          { label: "Webhook Security" }
        ]}
      />

      {/* STEP 1: Gerar Token Secreto */}
      <div className="pc-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fef9e5' }}>
            <Lock className="w-6 h-6" style={{ color: '#fbbc04' }} />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#202124' }}>
              STEP 1: Gerar Token de Validação
            </h3>
            <p className="text-sm" style={{ color: '#5f6368' }}>
              UUID aleatório para autenticar webhook
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
              <div className="text-sm" style={{ color: '#991b1b' }}>
                <p className="font-bold mb-1">⚠️ LIMITAÇÃO DO SENDGRID</p>
                <p>Inbound Parse <strong>NÃO suporta HMAC/assinatura digital</strong>. Usaremos token secreto na URL + rate limiting + validação SPF/DKIM.</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
            <p className="text-sm font-medium mb-3" style={{ color: '#202124' }}>
              📋 Gerar token:
            </p>
            <ol className="text-sm space-y-2 ml-4 list-decimal" style={{ color: '#5f6368' }}>
              <li>Acesse <a href="https://www.uuidgenerator.net/" target="_blank" className="text-blue-600 hover:underline">UUID Generator</a></li>
              <li>Copie um UUID v4 (ex: f47ac10b-58cc-4372-a567-0e02b2c3d479)</li>
              <li>Guarde-o em segredo - será usado na URL do webhook</li>
            </ol>
          </div>
        </div>
      </div>

      {/* STEP 2: Adicionar ao Base44 */}
      <div className="pc-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
            <Shield className="w-6 h-6" style={{ color: '#7E57FF' }} />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#202124' }}>
              STEP 2: Adicionar Token ao Base44
            </h3>
            <p className="text-sm" style={{ color: '#5f6368' }}>
              Configure o secret SENDGRID_WEBHOOK_VALIDATION_TOKEN
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
            <p className="text-sm font-medium mb-3" style={{ color: '#202124' }}>
              📋 No Dashboard Base44:
            </p>
            <ol className="text-sm space-y-2 ml-4 list-decimal" style={{ color: '#5f6368' }}>
              <li>Vá em <strong>Settings → Environment Variables</strong></li>
              <li>Adicione: <code className="bg-white px-2 py-1 rounded">SENDGRID_WEBHOOK_VALIDATION_TOKEN</code></li>
              <li>Cole o UUID gerado no STEP 1</li>
              <li>Salve e aguarde deploy (~30s)</li>
            </ol>
          </div>
        </div>
      </div>

      {/* STEP 3: Configurar no SendGrid */}
      <div className="pc-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#e6f7ed' }}>
            <Zap className="w-6 h-6" style={{ color: '#34a853' }} />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#202124' }}>
              STEP 3: Configurar Webhook no SendGrid
            </h3>
            <p className="text-sm" style={{ color: '#5f6368' }}>
              Habilitar validação de assinatura
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#5f6368' }}>
              Webhook URL
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={webhookUrl}
                className="flex-1 px-4 py-3 rounded-lg border font-mono text-xs"
                style={{ borderColor: '#e8eaed', backgroundColor: '#f8f9fa', color: '#202124' }}
              />
              <button
                onClick={() => copy(webhookUrl, 'url')}
                className="px-4 py-3 rounded-lg border font-medium transition-all"
                style={{ borderColor: '#e8eaed', minWidth: '100px' }}
              >
                {copiedItem === 'url' ? (
                  <span className="flex items-center gap-2" style={{ color: '#34a853' }}>
                    <CheckCircle className="w-4 h-4" />
                    Copiado
                  </span>
                ) : (
                  <span className="flex items-center gap-2" style={{ color: '#5f6368' }}>
                    <Copy className="w-4 h-4" />
                    Copiar
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: '#fef9e5', border: '1px solid #fbbc04' }}>
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#fbbc04' }} />
              <p className="text-sm font-bold" style={{ color: '#956802' }}>
                ⚠️ ATENÇÃO: Substitua SEU_TOKEN_AQUI pelo UUID gerado
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
            <p className="text-sm font-medium mb-3" style={{ color: '#202124' }}>
              📋 No SendGrid:
            </p>
            <ol className="text-sm space-y-2 ml-4 list-decimal" style={{ color: '#5f6368' }}>
              <li>Acesse <a href="https://app.sendgrid.com/settings/parse" target="_blank" className="text-blue-600 hover:underline flex items-center gap-1">
                Settings → Inbound Parse <ExternalLink className="w-3 h-3 inline" />
              </a></li>
              <li>Clique em <strong>Add Host & URL</strong></li>
              <li>
                <strong>Domain:</strong> <code className="bg-white px-2 py-1 rounded">conectaclinica.com.br</code>
              </li>
              <li>
                <strong>Subdomain:</strong> <code className="bg-white px-2 py-1 rounded">mail</code> (ou deixe vazio para catch-all)
              </li>
              <li>
                <strong>Destination URL:</strong> Cole a URL acima <strong className="text-red-600">(lembre de substituir SEU_TOKEN_AQUI)</strong>
              </li>
              <li>
                ✅ Marque: <strong>Check incoming emails for spam</strong> (adiciona headers SPF/DKIM)
              </li>
              <li>
                ✅ Marque: <strong>POST the raw, full MIME message</strong>
              </li>
              <li>
                Clique em <strong>Add</strong>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Security Status */}
      <div className="pc-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6" style={{ color: '#34a853' }} />
          <h3 className="text-lg font-bold" style={{ color: '#202124' }}>
            Status de Segurança
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#e6f7ed', border: '1px solid #34a853' }}>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5" style={{ color: '#34a853' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#137333' }}>
                  ✅ Validação por token secreto (query param)
                </p>
                <p className="text-xs" style={{ color: '#1f6332' }}>
                  Apenas requests com token correto são aceitas
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#e6f7ed', border: '1px solid #34a853' }}>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5" style={{ color: '#34a853' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#137333' }}>
                  ✅ Rate limiting (20 req/min por IP)
                </p>
                <p className="text-xs" style={{ color: '#1f6332' }}>
                  Proteção contra spam e ataques de volume
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#e6f7ed', border: '1px solid #34a853' }}>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5" style={{ color: '#34a853' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#137333' }}>
                  ✅ Validação SPF/DKIM headers
                </p>
                <p className="text-xs" style={{ color: '#1f6332' }}>
                  Detecta emails com falha de autenticação
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#e6f7ed', border: '1px solid #34a853' }}>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5" style={{ color: '#34a853' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#137333' }}>
                  ✅ Multi-tenant isolation garantido
                </p>
                <p className="text-xs" style={{ color: '#1f6332' }}>
                  Alias validado antes de criar ticket
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testing */}
      <div className="pc-card p-6">
        <h3 className="text-lg font-bold mb-4" style={{ color: '#202124' }}>
          🧪 Testar Webhook
        </h3>
        
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#202124' }}>
            Para testar:
          </p>
          <ol className="text-sm space-y-2 ml-4 list-decimal" style={{ color: '#5f6368' }}>
            <li>Envie um email do seu Gmail para qualquer <code className="bg-white px-1 rounded">*@conectaclinica.com.br</code></li>
            <li>Aguarde 30 segundos</li>
            <li>Verifique se um ticket foi criado em <strong>Atendimento</strong></li>
            <li>Se não criou, verifique os logs da function <code className="bg-white px-1 rounded">webhookReceberEmail</code></li>
          </ol>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="pc-card p-6">
        <h3 className="text-lg font-bold mb-4" style={{ color: '#202124' }}>
          🔧 Troubleshooting
        </h3>
        
        <div className="space-y-3 text-sm">
          <details className="p-4 rounded-lg border" style={{ borderColor: '#e8eaed' }}>
            <summary className="cursor-pointer font-medium" style={{ color: '#202124' }}>
              ❌ Erro 401: Unauthorized (invalid token)
            </summary>
            <div className="mt-3 space-y-2 text-xs" style={{ color: '#5f6368' }}>
              <p><strong>Causa:</strong> Token na URL não corresponde ao secret configurado</p>
              <p><strong>Solução:</strong> Verifique se <code className="bg-gray-100 px-1 rounded">?token=SEU_UUID</code> está correto na URL do webhook no SendGrid</p>
            </div>
          </details>

          <details className="p-4 rounded-lg border" style={{ borderColor: '#e8eaed' }}>
            <summary className="cursor-pointer font-medium" style={{ color: '#202124' }}>
              ⚠️ Erro 429: Too many requests
            </summary>
            <div className="mt-3 space-y-2 text-xs" style={{ color: '#5f6368' }}>
              <p><strong>Causa:</strong> Rate limit excedido (20 emails/min pelo mesmo IP)</p>
              <p><strong>Solução:</strong> Aguarde 1 minuto ou verifique se é ataque de spam</p>
            </div>
          </details>

          <details className="p-4 rounded-lg border" style={{ borderColor: '#e8eaed' }}>
            <summary className="cursor-pointer font-medium" style={{ color: '#202124' }}>
              📧 Email não vira ticket
            </summary>
            <div className="mt-3 space-y-2 text-xs" style={{ color: '#5f6368' }}>
              <p><strong>Causa:</strong> Webhook não configurado ou alias inexistente</p>
              <p><strong>Solução:</strong> Verifique logs em Dashboard → Functions → webhookReceberEmail</p>
            </div>
          </details>
        </div>
      </div>

      {/* Comandos Úteis */}
      <div className="pc-card p-6">
        <h3 className="text-lg font-bold mb-4" style={{ color: '#202124' }}>
          💻 Comandos Úteis
        </h3>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: '#5f6368' }}>
              Testar webhook localmente (sem token = deve falhar):
            </p>
            <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto">
{`curl -X POST "${webhookUrl.replace('SEU_TOKEN_AQUI', 'token_errado')}" \\
  -F "to=test@conectaclinica.com.br" \\
  -F "from=paciente@gmail.com" \\
  -F "subject=Teste Segurança" \\
  -F "text=Corpo do email"
  
# Deve retornar 401: Unauthorized`}
            </pre>
          </div>

          <div>
            <p className="text-xs font-medium mb-2" style={{ color: '#5f6368' }}>
              Testar com token correto (deve funcionar):
            </p>
            <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto">
{`curl -X POST "${webhookUrl}" \\
  -F "to=clinica-abc@conectaclinica.com.br" \\
  -F "from=paciente@gmail.com" \\
  -F "subject=Teste OK" \\
  -F "text=Deve criar ticket"
  
# Deve retornar 200: success`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}