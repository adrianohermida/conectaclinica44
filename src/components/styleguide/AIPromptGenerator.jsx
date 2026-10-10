import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Copy, Check, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIPromptGenerator() {
  const [moduloNome, setModuloNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const gerarPrompt = async () => {
    if (!moduloNome || !descricao) {
      toast.error('Preencha módulo e descrição');
      return;
    }

    setGenerating(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em gerar prompts técnicos para desenvolvimento de módulos em aplicações médicas/clínicas.

CONTEXTO DO APP:
- Plataforma: ConectaClínica (gestão de clínicas médicas)
- Stack: React + Base44 (BaaS) + Tailwind CSS
- Multi-tenant: isolamento por clinica_id OBRIGATÓRIO
- LGPD: compliance total, auditoria de acesso, consentimento

REQUISITOS OBRIGATÓRIOS (COMPLIANCE):
1. Multi-tenant: SEMPRE filtrar por clinica_id em queries
2. Performance: P95 < 200ms, índices otimizados
3. Security: RouteGuard, PermissionGuard, validação backend
4. LGPD: registro de acesso (LogAuditoria), minimização de dados
5. Atomicidade: componentes < 50 linhas, responsabilidade única
6. Design System: usar tokens CSS (--brand-*), não hardcode
7. Acessibilidade: WCAG AA, touch targets 44px, ARIA labels
8. SEO: meta tags, schema.org, performance 100/100
9. Mobile-first: responsive, PWA-ready
10. Observabilidade: logs estruturados, error tracking

MÓDULO SOLICITADO:
Nome: ${moduloNome}
Descrição: ${descricao}

GERAR PROMPT TÉCNICO COMPLETO:
- Incluir estrutura de arquivos (entities, pages, components, functions)
- Especificar contratos de performance e segurança
- Detalhar validações LGPD e multi-tenant
- Definir índices de banco de dados
- Incluir testes e métricas de sucesso
- Seguir 100% StyleGuide e AI Control

Formato: Markdown estruturado, direto, técnico, sem enrolação.`,
        response_json_schema: null
      });

      setPrompt(res);
    } catch (error) {
      toast.error('Erro ao gerar: ' + error.message);
    }
    setGenerating(false);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Prompt copiado!');
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border-2 border-purple-500 bg-purple-50">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-purple-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-purple-800">GERADOR DE PROMPTS TÉCNICOS:</p>
            <p className="text-sm text-purple-700 mt-1">
              Cria prompts completos seguindo StyleGuide + AI Control + Base44 + PageSpeed + LGPD
            </p>
          </div>
        </div>
      </div>

      <div className="pc-card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Nome do Módulo</label>
          <input
            type="text"
            value={moduloNome}
            onChange={(e) => setModuloNome(e.target.value)}
            placeholder="Ex: GestaoContratos, PrazosProcessuais"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Descrição Funcional</label>
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Módulo para gerenciar contratos médicos, com versionamento, assinatura digital, alertas de vencimento e integração com Authentique"
            rows={4}
          />
        </div>

        <Button onClick={gerarPrompt} disabled={generating || !moduloNome || !descricao} className="w-full">
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
          Gerar Prompt Técnico
        </Button>
      </div>

      {prompt && (
        <div className="pc-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Prompt Gerado:</h3>
            <button onClick={copyPrompt} className="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2">
              {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
              Copiar
            </button>
          </div>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap max-h-96">
            {prompt}
          </pre>
        </div>
      )}
    </div>
  );
}