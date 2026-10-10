import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Globe, Code, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

/**
 * Código Embed + Aviso Honesto de Desenvolvimento
 */
export default function WidgetEmbedCode({ clinicaId, onClose }) {
  const [copied, setCopied] = useState(false);

  // NOTA: Este código requer widget.js standalone (em desenvolvimento)
  const embedCode = `<!-- ConectaClínica Widget (Em Desenvolvimento) -->
<!-- IMPORTANTE: Este código não funciona ainda em sites externos -->
<!-- O widget está disponível apenas dentro do app ConectaClínica -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['ConectaWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','cc','https://conectaclinica.com.br/widget.js'));
  cc('init', '${clinicaId}');
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Aviso Crítico */}
      <div className="flex items-start gap-4 p-4 rounded-xl border-2" style={{ backgroundColor: '#fde7e7', borderColor: '#ea4335' }}>
        <AlertTriangle className="w-6 h-6 flex-shrink-0" style={{ color: '#ea4335' }} />
        <div>
          <p className="font-bold text-sm mb-2" style={{ color: '#842820' }}>
            ⚠️ Recurso em Desenvolvimento
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#5f6368' }}>
            O widget standalone (<code className="bg-gray-100 px-2 py-1 rounded">widget.js</code>) ainda não foi criado.
            <br />
            <strong>Status atual:</strong> Widget funciona apenas dentro do app ConectaClínica.
            <br />
            <strong>Próximos passos:</strong> Criação do script standalone para sites externos (Fase 3).
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 pb-4 border-b" style={{ borderColor: '#e8eaed' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
          <Code className="w-6 h-6" style={{ color: '#7E57FF' }} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1" style={{ color: '#202124' }}>
            Código de Instalação (Futuro)
          </h3>
          <p className="text-sm" style={{ color: '#5f6368' }}>
            Código preparado para quando o widget standalone estiver pronto
          </p>
        </div>
      </div>

      {/* Código Embed */}
      <div className="relative">
        <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-xs leading-relaxed">
          <code>{embedCode}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all focus:outline-none focus:ring-2"
          style={{ focusRing: '#7E57FF40' }}
          aria-label="Copiar código"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* Roadmap Honesto */}
      <div className="p-4 rounded-xl border" style={{ borderColor: '#e8eaed', backgroundColor: '#f8f9fa' }}>
        <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#202124' }}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#7E57FF', color: 'white' }}>
            3
          </span>
          Fase 3: Widget Standalone
        </h4>
        <ul className="space-y-2 text-sm" style={{ color: '#5f6368' }}>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 font-bold">•</span>
            Criar <code className="bg-gray-100 px-2 py-1 rounded">widget.js</code> compilado (React bundle)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 font-bold">•</span>
            CDN hosting (Vercel/Cloudflare)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 font-bold">•</span>
            CORS configurado para domínios externos
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 font-bold">•</span>
            Autenticação por <code className="bg-gray-100 px-2 py-1 rounded">clinica_id</code>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 font-bold">•</span>
            Testes em WordPress, Wix, HubSpot
          </li>
        </ul>
      </div>

      {/* Instruções por Plataforma (Futuras) */}
      <div className="space-y-4 opacity-50">
        <h4 className="font-semibold flex items-center gap-2" style={{ color: '#202124' }}>
          <Globe className="w-5 h-5" style={{ color: '#7E57FF' }} />
          Guia de Instalação (Disponível na Fase 3)
        </h4>

        <div className="space-y-3">
          {/* WordPress */}
          <details className="group p-4 border rounded-xl" style={{ borderColor: '#e8eaed' }}>
            <summary className="font-semibold cursor-pointer list-none flex items-center justify-between" style={{ color: '#202124' }}>
              WordPress
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-3 text-sm space-y-2" style={{ color: '#5f6368' }}>
              <p><strong>1.</strong> Acesse <code className="bg-gray-100 px-2 py-1 rounded">Aparência → Editor de Temas</code></p>
              <p><strong>2.</strong> Localize o arquivo <code className="bg-gray-100 px-2 py-1 rounded">footer.php</code></p>
              <p><strong>3.</strong> Cole o código antes de <code className="bg-gray-100 px-2 py-1 rounded">&lt;/body&gt;</code></p>
              <p><strong>4.</strong> Salve e publique</p>
            </div>
          </details>

          {/* Wix */}
          <details className="group p-4 border rounded-xl" style={{ borderColor: '#e8eaed' }}>
            <summary className="font-semibold cursor-pointer list-none flex items-center justify-between" style={{ color: '#202124' }}>
              Wix
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-3 text-sm space-y-2" style={{ color: '#5f6368' }}>
              <p><strong>1.</strong> No painel do Wix, clique em <code className="bg-gray-100 px-2 py-1 rounded">Configurações</code></p>
              <p><strong>2.</strong> Vá em <code className="bg-gray-100 px-2 py-1 rounded">Rastreamento e Análise → Códigos Personalizados</code></p>
              <p><strong>3.</strong> Clique em <code className="bg-gray-100 px-2 py-1 rounded">+ Novo Código</code></p>
              <p><strong>4.</strong> Cole o código e defina local: <strong>Body - fim</strong></p>
            </div>
          </details>

          {/* HTML Puro */}
          <details className="group p-4 border rounded-xl" style={{ borderColor: '#e8eaed' }}>
            <summary className="font-semibold cursor-pointer list-none flex items-center justify-between" style={{ color: '#202124' }}>
              HTML Puro / GitHub Pages / Netlify
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-3 text-sm space-y-2" style={{ color: '#5f6368' }}>
              <p><strong>1.</strong> Abra seu arquivo <code className="bg-gray-100 px-2 py-1 rounded">index.html</code></p>
              <p><strong>2.</strong> Localize a tag <code className="bg-gray-100 px-2 py-1 rounded">&lt;/body&gt;</code></p>
              <p><strong>3.</strong> Cole o código imediatamente antes dela</p>
              <p><strong>4.</strong> Faça commit e deploy</p>
            </div>
          </details>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: '#e8eaed' }}>
        <p className="text-xs" style={{ color: '#80868b' }}>
          Widget funcional dentro do app • Standalone em breve
        </p>
        <Button onClick={onClose} className="pc-btn-primary min-h-[44px]">
          Fechar
        </Button>
      </div>
    </div>
  );
}