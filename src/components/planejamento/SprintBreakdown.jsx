import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/Button";
import { Loader2, CheckSquare, Square, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * SPRINT BREAKDOWN - QUEBRA ITEM EM TAREFAS ATÔMICAS
 * 
 * Transforma módulo em checklist executável com estimativas
 */
export default function SprintBreakdown({ item }) {
  const [gerando, setGerando] = useState(false);
  const [tarefas, setTarefas] = useState(item?.ultimo_sprint_breakdown || null);

  React.useEffect(() => {
    if (item?.ultimo_sprint_breakdown && JSON.stringify(item.ultimo_sprint_breakdown) !== JSON.stringify(tarefas)) {
      setTarefas(item.ultimo_sprint_breakdown);
    }
  }, [item?.ultimo_sprint_breakdown]);

  const gerarBreakdown = async () => {
    setGerando(true);
    try {
      toast.loading('Gerando breakdown técnico...', { id: 'breakdown' });
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um arquiteto de software sênior. Quebre este módulo em tarefas atômicas EXECUTÁVEIS.

MÓDULO: ${item.modulo}
FUNCIONALIDADE: ${item.funcionalidade}
CATEGORIA: ${item.categoria}
EVIDÊNCIAS ESPERADAS: ${item.evidencias?.join(', ') || 'não definidas'}
OBSERVAÇÕES: ${item.observacoes || 'nenhuma'}

TAREFA: Gere um breakdown técnico com:
1. Tarefas atômicas (máx 4h cada)
2. Ordem de execução lógica
3. Critérios de aceite objetivos
4. Estimativa realista em horas
5. Riscos técnicos por tarefa

Seja BRUTAL e REALISTA. Inclua:
- Setup de infraestrutura (entities, índices)
- Backend functions (integrações, validações)
- Frontend (pages, components, hooks)
- Testes (unit, integration, E2E)
- Documentação técnica
- Performance tuning

Retorne JSON estruturado.`,
        response_json_schema: {
          type: "object",
          properties: {
            total_estimado_horas: { type: "number" },
            complexidade: { type: "string", enum: ["baixa", "media", "alta", "critica"] },
            riscos_principais: { type: "array", items: { type: "string" } },
            dependencias_externas: { type: "array", items: { type: "string" } },
            tarefas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  ordem: { type: "number" },
                  titulo: { type: "string" },
                  descricao: { type: "string" },
                  tipo: { type: "string", enum: ["infra", "backend", "frontend", "teste", "docs"] },
                  estimativa_horas: { type: "number" },
                  bloqueadores: { type: "array", items: { type: "string" } },
                  criterios_aceite: { type: "array", items: { type: "string" } },
                  arquivos_afetados: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      const breakdown = {
        estimativa_total_horas: response.total_estimado_horas,
        total_tarefas: response.tarefas.length,
        complexidade: response.complexidade,
        tarefas: response.tarefas,
        riscos_principais: response.riscos_principais,
        dependencias_principais: response.dependencias_externas
      };
      
      setTarefas(breakdown);
      
      // SALVAR NO ITEM (memória)
      const historicoAnalises = item.historico_analises || [];
      historicoAnalises.push({
        timestamp: new Date().toISOString(),
        tipo: 'sprint_breakdown',
        resultado: {
          total_estimado_horas: response.total_estimado_horas,
          total_tarefas: response.tarefas.length,
          complexidade: response.complexidade
        }
      });
      
      await base44.entities.ChecklistProjeto.update(item.id, {
        historico_analises: historicoAnalises,
        ultimo_sprint_breakdown: breakdown
      });
      
      toast.success(`${response.tarefas.length} tarefas salvas (${response.total_estimado_horas}h)`, { id: 'breakdown' });
    } catch (error) {
      toast.error('Erro: ' + error.message, { id: 'breakdown' });
    } finally {
      setGerando(false);
    }
  };

  const tipoColors = {
    infra: { bg: '#e8f1fb', text: '#0B7A9E' },
    backend: { bg: '#f3e8ff', text: '#7E57FF' },
    frontend: { bg: '#dcfce7', text: '#16a34a' },
    teste: { bg: '#fef3c7', text: '#92400e' },
    docs: { bg: '#f1f5f9', text: '#475569' }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg mb-1">📋 Sprint Breakdown</h3>
          <p className="text-sm text-gray-600">Tarefas atômicas executáveis</p>
        </div>
        <Button onClick={gerarBreakdown} disabled={gerando} className="bg-purple-600">
          {gerando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckSquare className="w-4 h-4 mr-2" />}
          {gerando ? 'Gerando...' : 'Gerar Breakdown'}
        </Button>
      </div>

      {tarefas && (
        <div className="space-y-4">
          {/* MÉTRICAS */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-2xl font-bold text-blue-700 mb-1">{tarefas.estimativa_total_horas}h</p>
              <p className="text-xs text-blue-600">Estimativa Total</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-2xl font-bold text-purple-700 mb-1">{tarefas.total_tarefas}</p>
              <p className="text-xs text-purple-600">Tarefas</p>
            </div>
            <div className={`p-4 rounded-lg border ${
              tarefas.complexidade === 'critica' ? 'bg-red-50 border-red-300' :
              tarefas.complexidade === 'alta' ? 'bg-orange-50 border-orange-300' :
              tarefas.complexidade === 'media' ? 'bg-yellow-50 border-yellow-300' :
              'bg-green-50 border-green-300'
            }`}>
              <p className={`text-2xl font-bold mb-1 ${
                tarefas.complexidade === 'critica' ? 'text-red-700' :
                tarefas.complexidade === 'alta' ? 'text-orange-700' :
                tarefas.complexidade === 'media' ? 'text-yellow-700' :
                'text-green-700'
              }`}>
                {tarefas.complexidade.toUpperCase()}
              </p>
              <p className="text-xs text-gray-600">Complexidade</p>
            </div>
          </div>

          {/* RISCOS */}
          {tarefas.riscos_principais?.length > 0 && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-700" />
                <p className="font-bold text-sm text-red-700">Riscos Principais</p>
              </div>
              <ul className="space-y-1">
                {tarefas.riscos_principais.map((risco, i) => (
                  <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                    <span>•</span>
                    <span>{risco}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* TAREFAS */}
          <div>
            <h4 className="font-bold text-sm mb-3">✅ Tarefas (Ordem de Execução)</h4>
            <div className="space-y-3">
              {tarefas.tarefas.map((tarefa) => {
                const colors = tipoColors[tarefa.tipo] || tipoColors.docs;
                return (
                  <div key={tarefa.ordem} className="p-4 rounded-lg border-l-4" style={{ borderLeftColor: colors.text, backgroundColor: colors.bg }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {tarefa.ordem}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm mb-1" style={{ color: colors.text }}>{tarefa.titulo}</p>
                          <p className="text-xs text-gray-700">{tarefa.descricao}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: colors.bg, color: colors.text }}>
                          {tarefa.tipo}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock className="w-3 h-3" />
                          {tarefa.estimativa_horas}h
                        </div>
                      </div>
                    </div>

                    {/* CRITÉRIOS DE ACEITE */}
                    {tarefa.criterios_aceite?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <p className="text-xs font-bold text-gray-700 mb-1">Critérios de Aceite:</p>
                        <ul className="space-y-0.5">
                          {tarefa.criterios_aceite.map((criterio, i) => (
                            <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                              <Square className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>{criterio}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* ARQUIVOS AFETADOS */}
                    {tarefa.arquivos_afetados?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-bold text-gray-700 mb-1">Arquivos:</p>
                        <div className="flex flex-wrap gap-1">
                          {tarefa.arquivos_afetados.map((arquivo, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-white text-xs font-mono text-gray-600">
                              {arquivo}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* BLOQUEADORES */}
                    {tarefa.bloqueadores?.length > 0 && (
                      <div className="mt-2 p-2 rounded bg-red-100 border border-red-200">
                        <p className="text-xs font-bold text-red-700 mb-1">⚠️ Bloqueadores:</p>
                        <ul className="space-y-0.5">
                          {tarefa.bloqueadores.map((bloq, i) => (
                            <li key={i} className="text-xs text-red-600">• {bloq}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!tarefas && (
        <div className="pc-card p-8 text-center">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-600">Gere breakdown para ver tarefas executáveis</p>
        </div>
      )}
    </div>
  );
}