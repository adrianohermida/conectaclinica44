import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, Save } from "lucide-react";

/**
 * TEMPLATE ESTRUTURADO FORÇADO - ANTI-AMADORISMO
 * 
 * FORÇA preenchimento completo de:
 * - Entities (JSON schemas)
 * - Functions (input/output)
 * - Pages/Components
 * - Testes obrigatórios
 * - Métricas de sucesso
 */
export default function TemplateModuloEstruturado({ initialData, onSave, onCancel }) {
  const [template, setTemplate] = useState(initialData || {
    modulo: "",
    funcionalidade: "",
    entities: [],
    functions: [],
    pages: [],
    components: [],
    testes_obrigatorios: {
      e2e_scenarios: [],
      performance_targets: { p95_latency_ms: 200, bundle_size_kb: 50 }
    },
    metricas_sucesso: {
      queries_esperadas: [],
      bundle_impact_kb: 0,
      latencia_esperada_ms: 0
    },
    recursos_base44: {
      usa_visual_edit: false,
      usa_ai_controls: false,
      styling_options: false,
      responsivo: false,
      acessibilidade: false,
      animacoes: false,
      lazy_load: false
    }
  });

  const adicionarEntity = () => {
    setTemplate({
      ...template,
      entities: [...template.entities, { name: "", schema: "" }]
    });
  };

  const adicionarFunction = () => {
    setTemplate({
      ...template,
      functions: [...template.functions, { name: "", descricao: "", input: "", output: "" }]
    });
  };

  const adicionarPage = () => {
    setTemplate({
      ...template,
      pages: [...template.pages, { name: "", componentes_usados: [], hooks_usados: [] }]
    });
  };

  const adicionarE2EScenario = () => {
    setTemplate({
      ...template,
      testes_obrigatorios: {
        ...template.testes_obrigatorios,
        e2e_scenarios: [...template.testes_obrigatorios.e2e_scenarios, ""]
      }
    });
  };

  const gerarObservacoes = () => {
    const obs = `
═══════════════════════════════════════════
 MÓDULO: ${template.modulo}
 FUNCIONALIDADE: ${template.funcionalidade}
═══════════════════════════════════════════

━━━ 1. ENTITIES (JSON Schemas) ━━━
${template.entities.map(e => `
📦 ${e.name}
Schema:
${e.schema}
`).join('\n')}

━━━ 2. BACKEND FUNCTIONS ━━━
${template.functions.map(f => `
⚡ ${f.name}.js
Descrição: ${f.descricao}
Input: ${f.input}
Output: ${f.output}
`).join('\n')}

━━━ 3. FRONTEND ━━━
Pages:
${template.pages.map(p => `- pages/${p.name}.jsx (componentes: ${p.componentes_usados.join(', ')})`).join('\n')}

Components:
${template.components.map(c => `- components/${c}`).join('\n')}

━━━ 4. TESTES OBRIGATÓRIOS ━━━
E2E Scenarios:
${template.testes_obrigatorios.e2e_scenarios.map(s => `✓ ${s}`).join('\n')}

Performance Targets:
- P95 Latency: < ${template.testes_obrigatorios.performance_targets.p95_latency_ms}ms
- Bundle Size: < ${template.testes_obrigatorios.performance_targets.bundle_size_kb}kb

━━━ 5. MÉTRICAS DE SUCESSO ━━━
- Queries SQL: ${template.metricas_sucesso.queries_esperadas.join(', ')}
- Bundle Impact: +${template.metricas_sucesso.bundle_impact_kb}kb
- Latência Esperada: ${template.metricas_sucesso.latencia_esperada_ms}ms

━━━ 6. RECURSOS BASE44 UTILIZADOS ━━━
${Object.entries(template.recursos_base44).map(([k, v]) => `${v ? '✅' : '❌'} ${k.replace(/_/g, ' ')}`).join('\n')}
`;
    return obs;
  };

  const handleSave = () => {
    const observacoes = gerarObservacoes();
    const evidencias = [
      ...template.entities.map(e => `entities/${e.name}.json`),
      ...template.functions.map(f => `functions/${f.name}.js`),
      ...template.pages.map(p => `pages/${p.name}.jsx`),
      ...template.components.map(c => `components/${c}`)
    ];

    onSave({
      modulo: template.modulo,
      funcionalidade: template.funcionalidade,
      observacoes,
      evidencias,
      definition_of_done: template.testes_obrigatorios.e2e_scenarios
    });
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto p-6">
      <div className="sticky top-0 bg-white z-10 pb-4 border-b">
        <h2 className="text-2xl font-bold mb-2">📝 Template Estruturado</h2>
        <p className="text-sm text-gray-600">Preenchimento completo obrigatório - ANTI-AMADORISMO</p>
      </div>

      {/* BÁSICO */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-2">Módulo *</label>
          <Input 
            value={template.modulo} 
            onChange={(e) => setTemplate({...template, modulo: e.target.value})}
            placeholder="Ex: Prescrição Eletrônica"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-2">Funcionalidade *</label>
          <Input 
            value={template.funcionalidade} 
            onChange={(e) => setTemplate({...template, funcionalidade: e.target.value})}
            placeholder="Ex: CRUD com validação CFM"
          />
        </div>
      </div>

      {/* ENTITIES */}
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">📦 Entities (JSON Schemas Completos)</h3>
          <Button size="sm" onClick={adicionarEntity}>
            <Plus className="w-4 h-4 mr-1" /> Entity
          </Button>
        </div>
        <div className="space-y-3">
          {template.entities.map((entity, idx) => (
            <div key={idx} className="p-3 bg-white rounded border">
              <div className="flex items-center gap-2 mb-2">
                <Input
                  placeholder="Nome da Entity"
                  value={entity.name}
                  onChange={(e) => {
                    const newEntities = [...template.entities];
                    newEntities[idx].name = e.target.value;
                    setTemplate({...template, entities: newEntities});
                  }}
                  className="flex-1"
                />
                <button
                  onClick={() => {
                    const newEntities = template.entities.filter((_, i) => i !== idx);
                    setTemplate({...template, entities: newEntities});
                  }}
                  className="p-2 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
              <textarea
                placeholder='{"type": "object", "properties": {...}}'
                value={entity.schema}
                onChange={(e) => {
                  const newEntities = [...template.entities];
                  newEntities[idx].schema = e.target.value;
                  setTemplate({...template, entities: newEntities});
                }}
                className="w-full border rounded px-3 py-2 font-mono text-xs"
                rows="4"
              />
            </div>
          ))}
        </div>
      </div>

      {/* FUNCTIONS */}
      <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">⚡ Backend Functions</h3>
          <Button size="sm" onClick={adicionarFunction}>
            <Plus className="w-4 h-4 mr-1" /> Function
          </Button>
        </div>
        <div className="space-y-3">
          {template.functions.map((func, idx) => (
            <div key={idx} className="p-3 bg-white rounded border">
              <div className="flex items-center gap-2 mb-2">
                <Input
                  placeholder="Nome da function"
                  value={func.name}
                  onChange={(e) => {
                    const newFuncs = [...template.functions];
                    newFuncs[idx].name = e.target.value;
                    setTemplate({...template, functions: newFuncs});
                  }}
                  className="flex-1"
                />
                <button
                  onClick={() => {
                    const newFuncs = template.functions.filter((_, i) => i !== idx);
                    setTemplate({...template, functions: newFuncs});
                  }}
                  className="p-2 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
              <Input
                placeholder="Descrição"
                value={func.descricao}
                onChange={(e) => {
                  const newFuncs = [...template.functions];
                  newFuncs[idx].descricao = e.target.value;
                  setTemplate({...template, functions: newFuncs});
                }}
                className="mb-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Input: {param: type}"
                  value={func.input}
                  onChange={(e) => {
                    const newFuncs = [...template.functions];
                    newFuncs[idx].input = e.target.value;
                    setTemplate({...template, functions: newFuncs});
                  }}
                />
                <Input
                  placeholder="Output: {field: type}"
                  value={func.output}
                  onChange={(e) => {
                    const newFuncs = [...template.functions];
                    newFuncs[idx].output = e.target.value;
                    setTemplate({...template, functions: newFuncs});
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PAGES */}
      <div className="p-4 rounded-lg bg-green-50 border border-green-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">📄 Pages</h3>
          <Button size="sm" onClick={adicionarPage}>
            <Plus className="w-4 h-4 mr-1" /> Page
          </Button>
        </div>
        <div className="space-y-3">
          {template.pages.map((page, idx) => (
            <div key={idx} className="p-3 bg-white rounded border">
              <div className="flex items-center gap-2 mb-2">
                <Input
                  placeholder="Nome da page (ex: Prescricoes)"
                  value={page.name}
                  onChange={(e) => {
                    const newPages = [...template.pages];
                    newPages[idx].name = e.target.value;
                    setTemplate({...template, pages: newPages});
                  }}
                  className="flex-1"
                />
                <button
                  onClick={() => {
                    const newPages = template.pages.filter((_, i) => i !== idx);
                    setTemplate({...template, pages: newPages});
                  }}
                  className="p-2 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
              <Input
                placeholder="Componentes usados (separados por vírgula)"
                value={page.componentes_usados.join(', ')}
                onChange={(e) => {
                  const newPages = [...template.pages];
                  newPages[idx].componentes_usados = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  setTemplate({...template, pages: newPages});
                }}
                className="mb-2"
              />
              <Input
                placeholder="Hooks usados (ex: useQuery, useMutation)"
                value={page.hooks_usados.join(', ')}
                onChange={(e) => {
                  const newPages = [...template.pages];
                  newPages[idx].hooks_usados = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  setTemplate({...template, pages: newPages});
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* RECURSOS BASE44 */}
      <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
        <h3 className="font-bold mb-3">🎨 Recursos Base44 Utilizados</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(template.recursos_base44).map(([key, value]) => (
            <label key={key} className="flex items-center gap-2 p-2 bg-white rounded border cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setTemplate({
                  ...template,
                  recursos_base44: {
                    ...template.recursos_base44,
                    [key]: e.target.checked
                  }
                })}
                className="w-4 h-4"
              />
              <span className="text-sm">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            </label>
          ))}
        </div>
      </div>

      {/* TESTES E2E */}
      <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">🧪 Testes E2E Obrigatórios</h3>
          <Button size="sm" onClick={adicionarE2EScenario}>
            <Plus className="w-4 h-4 mr-1" /> Scenario
          </Button>
        </div>
        <div className="space-y-2">
          {template.testes_obrigatorios.e2e_scenarios.map((scenario, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                placeholder="Ex: Criar prescrição completa + validar CFM"
                value={scenario}
                onChange={(e) => {
                  const newScenarios = [...template.testes_obrigatorios.e2e_scenarios];
                  newScenarios[idx] = e.target.value;
                  setTemplate({
                    ...template,
                    testes_obrigatorios: {
                      ...template.testes_obrigatorios,
                      e2e_scenarios: newScenarios
                    }
                  });
                }}
                className="flex-1"
              />
              <button
                onClick={() => {
                  const newScenarios = template.testes_obrigatorios.e2e_scenarios.filter((_, i) => i !== idx);
                  setTemplate({
                    ...template,
                    testes_obrigatorios: {
                      ...template.testes_obrigatorios,
                      e2e_scenarios: newScenarios
                    }
                  });
                }}
                className="p-2 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ))}
        </div>

        {/* TARGETS PERFORMANCE */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-bold mb-1">P95 Latency (ms)</label>
            <Input
              type="number"
              value={template.testes_obrigatorios.performance_targets.p95_latency_ms}
              onChange={(e) => setTemplate({
                ...template,
                testes_obrigatorios: {
                  ...template.testes_obrigatorios,
                  performance_targets: {
                    ...template.testes_obrigatorios.performance_targets,
                    p95_latency_ms: parseInt(e.target.value) || 0
                  }
                }
              })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Max Bundle Size (kb)</label>
            <Input
              type="number"
              value={template.testes_obrigatorios.performance_targets.bundle_size_kb}
              onChange={(e) => setTemplate({
                ...template,
                testes_obrigatorios: {
                  ...template.testes_obrigatorios,
                  performance_targets: {
                    ...template.testes_obrigatorios.performance_targets,
                    bundle_size_kb: parseInt(e.target.value) || 0
                  }
                }
              })}
            />
          </div>
        </div>
      </div>

      {/* AÇÕES */}
      <div className="flex gap-3 sticky bottom-0 bg-white pt-4 border-t">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={!template.modulo || !template.funcionalidade || template.entities.length === 0}
          className="flex-1 bg-purple-600"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Template Completo
        </Button>
      </div>
    </div>
  );
}