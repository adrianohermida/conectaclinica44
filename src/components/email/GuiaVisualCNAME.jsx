import React from "react";
import { Copy, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

/**
 * Guia visual step-by-step para configurar CNAMEs do SendGrid
 * Modelo Freshdesk - explicação cristalina
 */
export default function GuiaVisualCNAME({ dominio }) {
  const copiar = (texto) => {
    navigator.clipboard.writeText(texto);
    toast.success("✅ Copiado");
  };

  // VALORES REAIS que SendGrid gera - cliente substitui números únicos
  const exemploCNAMEs = [
    {
      tipo: "CNAME 1 (Email Tracking)",
      nome: `em2299.${dominio}`,
      valor: "u57983869.wl120.sendgrid.net",
      cor: "purple",
      instrucao: "Substitua 'em2299' e 'u57983869' pelos valores do seu SendGrid"
    },
    {
      tipo: "CNAME 2 (DKIM Signature 1)",
      nome: `s1._domainkey.${dominio}`,
      valor: "s1.domainkey.u57983869.wl120.sendgrid.net",
      cor: "blue",
      instrucao: "Copie EXATAMENTE do SendGrid Domain Authentication"
    },
    {
      tipo: "CNAME 3 (DKIM Signature 2)",
      nome: `s2._domainkey.${dominio}`,
      valor: "s2.domainkey.u57983869.wl120.sendgrid.net",
      cor: "green",
      instrucao: "Valores únicos gerados pelo SendGrid"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-5 flex gap-4">
        <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />
        <div>
          <p className="font-bold text-amber-900 text-lg">⚠️ Erro Comum - CNAMEs Incompletos</p>
          <p className="text-sm text-amber-800 mt-2">
            Muitos usuários esquecem de incluir o domínio base (<strong>{dominio}</strong>) após o subdomínio.
          </p>
          <div className="mt-3 space-y-1 text-xs">
            <p className="text-red-700 font-bold">❌ ERRADO: <code className="bg-white px-2 py-1 rounded">em1234</code></p>
            <p className="text-green-700 font-bold">✅ CORRETO: <code className="bg-white px-2 py-1 rounded">em1234.{dominio}</code></p>
          </div>
        </div>
      </div>

      {/* Guia Visual CNAMEs */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <h3 className="font-bold text-white text-lg">📋 Template de CNAMEs SendGrid</h3>
          <p className="text-purple-100 text-sm mt-1">Copie esta estrutura e substitua pelos valores do seu SendGrid</p>
        </div>

        <div className="p-6 space-y-4">
          {exemploCNAMEs.map((cname, idx) => (
            <div key={idx} className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg bg-${cname.cor}-100 flex items-center justify-center`}>
                    <span className={`text-${cname.cor}-700 font-bold text-sm`}>{idx + 1}</span>
                  </div>
                  <p className="font-bold text-gray-900">{cname.tipo}</p>
                </div>
                <button
                  onClick={() => copiar(`${cname.nome} CNAME ${cname.valor}`)}
                  className="pc-btn-secondary px-3 py-1 text-xs"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-16">Tipo:</span>
                  <code className="bg-white px-3 py-2 rounded border flex-1">CNAME</code>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-500 w-16">Nome:</span>
                    <code className="bg-purple-50 px-3 py-2 rounded border-2 border-purple-300 flex-1 text-purple-900 font-bold">
                      {cname.nome}
                    </code>
                  </div>
                  <p className="text-[10px] text-purple-700 ml-[68px] italic">{cname.instrucao}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-16">Valor:</span>
                  <code className="bg-white px-3 py-2 rounded border flex-1">
                    {cname.valor}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-t-2 border-blue-300">
          <p className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Como usar este template:
          </p>
          <ol className="text-xs text-blue-800 space-y-2 ml-5">
            <li className="font-bold">1. Abra SendGrid Domain Authentication e digite: <span className="bg-white px-2 py-1 rounded border-2 border-blue-400">{dominio}</span></li>
            <li className="font-bold">2. Copie os 3 CNAMEs gerados (EXATOS, não use os exemplos acima)</li>
            <li className="font-bold">3. No painel DNS, crie 3 registros CNAME com Nome + Valor copiados</li>
            <li className="font-bold">4. SEMPRE inclua <span className="bg-white px-2 py-1 rounded border-2 border-blue-400">.{dominio}</span> no final do Nome</li>
          </ol>
        </div>
      </div>

      {/* Link Documentação */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200 p-5">
        <p className="font-bold text-purple-900 mb-3">📚 Precisa de ajuda detalhada?</p>
        <a
          href="https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-purple-700 font-bold text-sm hover:underline"
        >
          Ver documentação oficial SendGrid
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}