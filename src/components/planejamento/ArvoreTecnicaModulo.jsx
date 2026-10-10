import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/Button";
import { 
  Database, Zap, FileCode, Code, Brain, 
  ChevronRight, ChevronDown, AlertTriangle, 
  CheckCircle2, Package, Loader2, Copy, Download
} from "lucide-react";
import { toast } from "sonner";

/**
 * ÁRVORE TÉCNICA PROFISSIONAL DO MÓDULO
 * 
 * Mostra estrutura completa:
 * - Entities (schemas, índices, débitos)
 * - Functions (I/O, integrações, performance)
 * - Pages/Components (reuso, lazy loading, débitos)
 * - Débitos técnicos (tech debt)
 * - Componentes reutilizáveis
 * - Export MD completo
 */
export default function ArvoreTecnicaModulo({ item }) {
  const [carregando, setCarregando] = useState(false);
  const [arvore, setArvore] = useState(item?.ultima_arvore_tecnica || null);
  const [expandido, setExpandido] = useState({});

  React.useEffect(() => {
    if (item?.ultima_arvore_tecnica && JSON.stringify(item.ultima_arvore_tecnica) !== JSON.stringify(arvore)) {
      setArvore(item.ultima_arvore_tecnica);
      setExpandido({ entities: true, functions: true, pages: true, components: true, debitos: true });
    }
  }, [item?.ultima_arvore_tecnica]);

  const gerarArvore = async () => {
    setCarregando(true);
    try {
      toast.loading('Gerando árvore técnica...', { id: 'arvore' });

      // Invocar LLM para análise profissional (SEM scan - usar evidências)
      const analise = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um arquiteto sênior. Analise este módulo e gere ÁRVORE TÉCNICA PROFISSIONAL.

MÓDULO: ${item.modulo}
FUNCIONALIDADE: ${item.funcionalidade}
EVIDÊNCIAS DECLARADAS: ${JSON.stringify(item.evidencias || [])}
OBSERVAÇÕES: ${item.observacoes || 'Nenhuma'}

GERE JSON com estrutura:

{
  "entities": [{
    "nome": "NomeEntity",
    "existe": true/false,
    "schema_completo": true/false,
    "indices_otimizados": true/false,
    "debitos_tecnicos": ["descrição do débito"],
    "campos_principais": ["campo1", "campo2"],
    "recomendacao": "texto"
  }],
  "functions": [{
    "nome": "nomeFunction",
    "existe": true/false,
    "input_schema": "string descrevendo input esperado",
    "output_schema": "string descrevendo output",
    "integracoes_externas": ["API X", "API Y"],
    "performance_ok": true/false,
    "error_handling_ok": true/false,
    "debitos_tecnicos": ["descrição"],
    "recomendacao": "texto"
  }],
  "pages": [{
    "nome": "NomePage",
    "existe": true/false,
    "componentes_usados": ["Component1", "Component2"],
    "lazy_loaded": true/false,
    "responsive": true/false,
    "acessivel": true/false,
    "debitos_tecnicos": ["descrição"],
    "recomendacao": "texto"
  }],
  "components": [{
    "nome": "NomeComponent",
    "existe": true/false,
    "reutilizavel": true/false,
    "usado_em_quantos_modulos": 0,
    "lazy_loadable": true/false,
    "debitos_tecnicos": ["descrição"],
    "ganho_reuso_estimado_horas": 0,
    "recomendacao": "texto"
  }],
  "debitos_tecnicos_gerais": [{
    "categoria": "performance|segurança|manutenibilidade|escalabilidade",
    "descricao": "texto",
    "severidade": "critica|alta|media|baixa",
    "custo_resolucao_horas": 0,
    "ganho_resolucao": "texto"
  }],
  "componentes_reutilizaveis": [{
    "componente": "nome",
    "usado_em": ["modulo1", "modulo2"],
    "ganho_reuso": "X horas economizadas se extrair"
  }],
  "resumo_executivo": {
    "score_completude": 0-100,
    "score_qualidade": 0-100,
    "total_debitos": 0,
    "horas_estimadas_resolucao": 0,
    "recomendacao_geral": "texto direto"
  }
}

Seja TÉCNICO e HONESTO. Use dados reais do scan.`,
        response_json_schema: {
          type: "object",
          properties: {
            entities: { 
              type: "array",
              items: { type: "object" }
            },
            functions: { 
              type: "array",
              items: { type: "object" }
            },
            pages: { 
              type: "array",
              items: { type: "object" }
            },
            components: { 
              type: "array",
              items: { type: "object" }
            },
            debitos_tecnicos_gerais: { 
              type: "array",
              items: { type: "object" }
            },
            componentes_reutilizaveis: { 
              type: "array",
              items: { type: "object" }
            },
            resumo_executivo: { type: "object" }
          }
        }
      });

      setArvore(analise);
      
      // SALVAR NO ITEM (memória)
      const historicoAnalises = item.historico_analises || [];
      historicoAnalises.push({
        timestamp: new Date().toISOString(),
        tipo: 'arvore_tecnica',
        resultado: {
          score_completude: analise.resumo_executivo.score_completude,
          score_qualidade: analise.resumo_executivo.score_qualidade,
          total_debitos: analise.resumo_executivo.total_debitos,
          entities_faltando: analise.entities?.filter(e => !e.existe).length || 0,
          functions_faltando: analise.functions?.filter(f => !f.existe).length || 0
        }
      });
      
      await base44.entities.ChecklistProjeto.update(item.id, {
        historico_analises: historicoAnalises,
        ultima_arvore_tecnica: analise
      });
      
      toast.success('Árvore técnica gerada e salva', { id: 'arvore' });
    } catch (error) {
      toast.error('Erro: ' + error.message, { id: 'arvore' });
    } finally {
      setCarregando(false);
    }
  };

  const exportarMarkdown = () => {
    if (!arvore) return;

    const md = `# 📋 Árvore Técnica - ${item.modulo}

## 🎯 Resumo Executivo
- **Completude:** ${arvore.resumo_executivo.score_completude}%
- **Qualidade:** ${arvore.resumo_executivo.score_qualidade}%
- **Débitos Técnicos:** ${arvore.resumo_executivo.total_debitos}
- **Horas para Resolução:** ${arvore.resumo_executivo.horas_estimadas_resolucao}h

**Recomendação:** ${arvore.resumo_executivo.recomendacao_geral}

---

## 📊 Entities (${arvore.entities?.length || 0})

${arvore.entities?.map(e => `
### ${e.existe ? '✅' : '❌'} ${e.nome}

- **Schema Completo:** ${e.schema_completo ? 'Sim' : 'Não'}
- **Índices Otimizados:** ${e.indices_otimizados ? 'Sim' : 'Não'}
- **Campos:** ${e.campos_principais?.join(', ')}

${e.debitos_tecnicos?.length > 0 ? `**Débitos:**\n${e.debitos_tecnicos.map(d => `- ⚠️ ${d}`).join('\n')}` : ''}

**Recomendação:** ${e.recomendacao}
`).join('\n---\n') || 'Nenhuma entity'}

---

## ⚡ Functions (${arvore.functions?.length || 0})

${arvore.functions?.map(f => `
### ${f.existe ? '✅' : '❌'} ${f.nome}

- **Input:** ${f.input_schema}
- **Output:** ${f.output_schema}
- **Integrações:** ${f.integracoes_externas?.join(', ') || 'Nenhuma'}
- **Performance OK:** ${f.performance_ok ? 'Sim' : 'Não'}
- **Error Handling:** ${f.error_handling_ok ? 'Sim' : 'Não'}

${f.debitos_tecnicos?.length > 0 ? `**Débitos:**\n${f.debitos_tecnicos.map(d => `- ⚠️ ${d}`).join('\n')}` : ''}

**Recomendação:** ${f.recomendacao}
`).join('\n---\n') || 'Nenhuma function'}

---

## 📄 Pages (${arvore.pages?.length || 0})

${arvore.pages?.map(p => `
### ${p.existe ? '✅' : '❌'} ${p.nome}

- **Componentes:** ${p.componentes_usados?.join(', ')}
- **Lazy Loaded:** ${p.lazy_loaded ? 'Sim' : 'Não'}
- **Responsive:** ${p.responsive ? 'Sim' : 'Não'}
- **Acessível:** ${p.acessivel ? 'Sim' : 'Não'}

${p.debitos_tecnicos?.length > 0 ? `**Débitos:**\n${p.debitos_tecnicos.map(d => `- ⚠️ ${d}`).join('\n')}` : ''}

**Recomendação:** ${p.recomendacao}
`).join('\n---\n') || 'Nenhuma page'}

---

## 🧩 Components (${arvore.components?.length || 0})

${arvore.components?.map(c => `
### ${c.existe ? '✅' : '❌'} ${c.nome}

- **Reutilizável:** ${c.reutilizavel ? 'Sim' : 'Não'}
- **Usado em:** ${c.usado_em_quantos_modulos} módulo(s)
- **Lazy Loadable:** ${c.lazy_loadable ? 'Sim' : 'Não'}
- **Ganho Reuso:** ${c.ganho_reuso_estimado_horas}h

${c.debitos_tecnicos?.length > 0 ? `**Débitos:**\n${c.debitos_tecnicos.map(d => `- ⚠️ ${d}`).join('\n')}` : ''}

**Recomendação:** ${c.recomendacao}
`).join('\n---\n') || 'Nenhum component'}

---

## 🚨 Débitos Técnicos Gerais (${arvore.debitos_tecnicos_gerais?.length || 0})

${arvore.debitos_tecnicos_gerais?.map(d => `
### ${d.severidade === 'critica' ? '🔴' : d.severidade === 'alta' ? '🟠' : '🟡'} ${d.categoria.toUpperCase()}

**Problema:** ${d.descricao}
**Severidade:** ${d.severidade}
**Custo Resolução:** ${d.custo_resolucao_horas}h
**Ganho:** ${d.ganho_resolucao}
`).join('\n---\n') || 'Nenhum débito identificado'}

---

## ♻️ Componentes Reutilizáveis (${arvore.componentes_reutilizaveis?.length || 0})

${arvore.componentes_reutilizaveis?.map(c => `
- **${c.componente}**
  - Usado em: ${c.usado_em.join(', ')}
  - Ganho: ${c.ganho_reuso}
`).join('\n') || 'Nenhum componente identificado para reuso'}

---

**Gerado em:** ${new Date().toISOString()}
`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.modulo.replace(/\s/g, '_')}_arvore_tecnica.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Markdown exportado');
  };

  const copiarJSON = () => {
    if (!arvore) return;
    navigator.clipboard.writeText(JSON.stringify(arvore, null, 2));
    toast.success('JSON copiado');
  };

  const toggle = (key) => {
    setExpandido(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!arvore) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg mb-1">🌳 Árvore Técnica Profissional</h3>
            <p className="text-sm text-gray-600">Estrutura completa: entities, functions, pages, débitos técnicos</p>
          </div>
          <Button onClick={gerarArvore} disabled={carregando} className="bg-indigo-600">
            {carregando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Package className="w-4 h-4 mr-2" />}
            {carregando ? 'Gerando...' : 'Gerar Árvore'}
          </Button>
        </div>
        <div className="pc-card p-8 text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-600">Clique para gerar análise técnica completa</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* HEADER + EXPORT */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg mb-1">🌳 Árvore Técnica</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">Completude: <strong>{arvore.resumo_executivo.score_completude}%</strong></span>
            <span className="text-gray-600">Qualidade: <strong>{arvore.resumo_executivo.score_qualidade}%</strong></span>
            <span className="text-red-600">Débitos: <strong>{arvore.resumo_executivo.total_debitos}</strong></span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={copiarJSON} variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Copiar JSON
          </Button>
          <Button onClick={exportarMarkdown} className="bg-green-600">
            <Download className="w-4 h-4 mr-2" />
            Baixar MD
          </Button>
        </div>
      </div>

      {/* RESUMO EXECUTIVO */}
      <div className="p-4 rounded-lg bg-blue-50 border-2 border-blue-300">
        <p className="font-bold text-sm mb-2">📌 Resumo Executivo</p>
        <p className="text-sm text-gray-900">{arvore.resumo_executivo.recomendacao_geral}</p>
        <p className="text-xs text-gray-600 mt-2">Resolução: ~{arvore.resumo_executivo.horas_estimadas_resolucao}h</p>
      </div>

      {/* ENTITIES */}
      <Secao 
        titulo={`📊 Entities (${arvore.entities?.length || 0})`}
        expandido={expandido.entities}
        onToggle={() => toggle('entities')}
      >
        {arvore.entities?.map((e, i) => (
          <ItemArvore key={i} item={e} tipo="entity" />
        ))}
      </Secao>

      {/* FUNCTIONS */}
      <Secao 
        titulo={`⚡ Functions (${arvore.functions?.length || 0})`}
        expandido={expandido.functions}
        onToggle={() => toggle('functions')}
      >
        {arvore.functions?.map((f, i) => (
          <ItemArvore key={i} item={f} tipo="function" />
        ))}
      </Secao>

      {/* PAGES */}
      <Secao 
        titulo={`📄 Pages (${arvore.pages?.length || 0})`}
        expandido={expandido.pages}
        onToggle={() => toggle('pages')}
      >
        {arvore.pages?.map((p, i) => (
          <ItemArvore key={i} item={p} tipo="page" />
        ))}
      </Secao>

      {/* COMPONENTS */}
      <Secao 
        titulo={`🧩 Components (${arvore.components?.length || 0})`}
        expandido={expandido.components}
        onToggle={() => toggle('components')}
      >
        {arvore.components?.map((c, i) => (
          <ItemArvore key={i} item={c} tipo="component" />
        ))}
      </Secao>

      {/* DÉBITOS TÉCNICOS */}
      {arvore.debitos_tecnicos_gerais?.length > 0 && (
        <Secao 
          titulo={`🚨 Débitos Técnicos (${arvore.debitos_tecnicos_gerais.length})`}
          expandido={expandido.debitos}
          onToggle={() => toggle('debitos')}
        >
          {arvore.debitos_tecnicos_gerais.map((d, i) => (
            <div key={i} className={`p-3 rounded border ${
              d.severidade === 'critica' ? 'bg-red-50 border-red-300' :
              d.severidade === 'alta' ? 'bg-orange-50 border-orange-300' :
              'bg-yellow-50 border-yellow-300'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <span className="text-xs font-bold uppercase">{d.categoria}</span>
                  <p className="text-sm mt-1">{d.descricao}</p>
                  <p className="text-xs text-green-700 mt-1">💡 {d.ganho_resolucao}</p>
                </div>
                <div className="text-right ml-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    d.severidade === 'critica' ? 'bg-red-100 text-red-700' :
                    d.severidade === 'alta' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {d.severidade}
                  </span>
                  <p className="text-xs text-gray-600 mt-1">{d.custo_resolucao_horas}h</p>
                </div>
              </div>
            </div>
          ))}
        </Secao>
      )}

      {/* COMPONENTES REUTILIZÁVEIS */}
      {arvore.componentes_reutilizaveis?.length > 0 && (
        <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
          <p className="font-bold text-sm mb-3">♻️ Componentes Reutilizáveis</p>
          {arvore.componentes_reutilizaveis.map((c, i) => (
            <div key={i} className="p-2 bg-white rounded border mb-2">
              <p className="text-sm font-mono font-bold">{c.componente}</p>
              <p className="text-xs text-gray-600">Usado em: {c.usado_em.join(', ')}</p>
              <p className="text-xs text-green-600">💰 {c.ganho_reuso}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Secao({ titulo, expandido, onToggle, children }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-all"
      >
        <span className="font-bold text-sm">{titulo}</span>
        {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {expandido && (
        <div className="p-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

function ItemArvore({ item, tipo }) {
  const icons = {
    entity: <Database className="w-4 h-4" />,
    function: <Zap className="w-4 h-4" />,
    page: <FileCode className="w-4 h-4" />,
    component: <Code className="w-4 h-4" />
  };

  return (
    <div className={`p-3 rounded border ${
      item.existe ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          {item.existe ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
          {icons[tipo]}
          <span className="font-bold text-sm font-mono">{item.nome}</span>
          {item.reutilizavel && <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700">REUTILIZÁVEL</span>}
        </div>
      </div>

      {/* DETAILS POR TIPO */}
      {tipo === 'entity' && (
        <div className="text-xs space-y-1 mt-2">
          <div className="flex gap-4">
            <span>Schema: {item.schema_completo ? '✅' : '❌'}</span>
            <span>Índices: {item.indices_otimizados ? '✅' : '❌'}</span>
          </div>
          {item.campos_principais?.length > 0 && (
            <p className="text-gray-600">Campos: {item.campos_principais.join(', ')}</p>
          )}
        </div>
      )}

      {tipo === 'function' && (
        <div className="text-xs space-y-1 mt-2">
          <p><strong>Input:</strong> {item.input_schema}</p>
          <p><strong>Output:</strong> {item.output_schema}</p>
          {item.integracoes_externas?.length > 0 && (
            <p className="text-purple-600">Integrações: {item.integracoes_externas.join(', ')}</p>
          )}
          <div className="flex gap-4">
            <span>Performance: {item.performance_ok ? '✅' : '❌'}</span>
            <span>Error Handling: {item.error_handling_ok ? '✅' : '❌'}</span>
          </div>
        </div>
      )}

      {tipo === 'page' && (
        <div className="text-xs space-y-1 mt-2">
          {item.componentes_usados?.length > 0 && (
            <p>Componentes: {item.componentes_usados.join(', ')}</p>
          )}
          <div className="flex gap-4">
            <span>Lazy: {item.lazy_loaded ? '✅' : '❌'}</span>
            <span>Responsive: {item.responsive ? '✅' : '❌'}</span>
            <span>A11y: {item.acessivel ? '✅' : '❌'}</span>
          </div>
        </div>
      )}

      {tipo === 'component' && (
        <div className="text-xs space-y-1 mt-2">
          <div className="flex gap-4">
            <span>Reutilizável: {item.reutilizavel ? '✅' : '❌'}</span>
            <span>Usado em: {item.usado_em_quantos_modulos} módulo(s)</span>
            {item.ganho_reuso_estimado_horas > 0 && (
              <span className="text-green-600 font-bold">Ganho: {item.ganho_reuso_estimado_horas}h</span>
            )}
          </div>
        </div>
      )}

      {/* DÉBITOS */}
      {item.debitos_tecnicos?.length > 0 && (
        <div className="mt-2 p-2 bg-white rounded border">
          <p className="text-xs font-bold text-red-700 mb-1">⚠️ Débitos Técnicos:</p>
          <ul className="space-y-1">
            {item.debitos_tecnicos.map((d, i) => (
              <li key={i} className="text-xs text-red-600">• {d}</li>
            ))}
          </ul>
        </div>
      )}

      {/* RECOMENDAÇÃO */}
      {item.recomendacao && (
        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs text-blue-700"><strong>💡 Recomendação:</strong> {item.recomendacao}</p>
        </div>
      )}
    </div>
  );
}