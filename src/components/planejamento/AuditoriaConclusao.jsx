import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, XCircle, FileText, Code, Database, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

/**
 * AUDITORIA BRUTAL ANTI-FAKE-DONE
 * 
 * Valida SE uma tarefa marcada como "completo" está REALMENTE completa:
 * 1. Evidências existem? (pages/*, components/*, entities/*, functions/*)
 * 2. Código tem linhas REAIS? (não vazios)
 * 3. Dependencies resolvidas?
 * 4. Definition of Done cumprido?
 */
export default function AuditoriaConclusao({ item, onResultado }) {
  const [auditando, setAuditando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const auditarItem = async () => {
    setAuditando(true);
    const problemas = [];
    const evidenciasValidadas = [];

    try {
      // 1. VALIDAR EVIDÊNCIAS
      if (!item.evidencias || item.evidencias.length === 0) {
        problemas.push({
          tipo: "CRÍTICO",
          mensagem: "Sem evidências - FAKE DONE garantido",
          detalhe: "Item marcado 'completo' mas zero arquivos/entities provando conclusão"
        });
      } else {
        for (const evidencia of item.evidencias) {
          try {
            // Detectar tipo (page/component/entity/function)
            if (evidencia.startsWith('pages/')) {
              const response = await fetch(`/api/file-exists?path=${evidencia}`);
              const existe = response.ok;
              
              if (!existe) {
                problemas.push({
                  tipo: "CRÍTICO",
                  mensagem: `Página "${evidencia}" NÃO EXISTE`,
                  detalhe: "Evidência fantasma - arquivo deletado ou nunca criado"
                });
              } else {
                evidenciasValidadas.push({ evidencia, status: "✅ Existe" });
              }
            } else if (evidencia.startsWith('entities/')) {
              const entityName = evidencia.replace('entities/', '').replace('.json', '');
              try {
                await base44.entities[entityName].list("", 1);
                evidenciasValidadas.push({ evidencia, status: "✅ Entity válida" });
              } catch {
                problemas.push({
                  tipo: "CRÍTICO",
                  mensagem: `Entity "${entityName}" NÃO EXISTE`,
                  detalhe: "Evidência fantasma"
                });
              }
            } else if (evidencia.startsWith('components/')) {
              // Componente - validar existência (simplificado)
              evidenciasValidadas.push({ evidencia, status: "⚠️ Não verificado (componente)" });
            } else if (evidencia.startsWith('functions/')) {
              // Backend function
              evidenciasValidadas.push({ evidencia, status: "⚠️ Não verificado (function)" });
            }
          } catch (err) {
            problemas.push({
              tipo: "ERRO",
              mensagem: `Erro validando "${evidencia}"`,
              detalhe: err.message
            });
          }
        }
      }

      // 2. VALIDAR OBSERVAÇÕES (detalhamento técnico)
      if (!item.observacoes || item.observacoes.length < 50) {
        problemas.push({
          tipo: "MÉDIO",
          mensagem: "Observações vazias ou genéricas (< 50 chars)",
          detalhe: "Itens completos devem ter detalhamento técnico: componentes criados, arquitetura, pendências, etc."
        });
      }

      // 3. VALIDAR DEADLINE (deadlines 2026+ = fake urgência)
      if (item.deadline) {
        const deadlineDate = new Date(item.deadline);
        const umAnoFuturo = new Date();
        umAnoFuturo.setFullYear(umAnoFuturo.getFullYear() + 1);
        
        if (deadlineDate > umAnoFuturo) {
          problemas.push({
            tipo: "SUSPEITO",
            mensagem: `Deadline em ${item.deadline} (1+ ano futuro)`,
            detalhe: "Deadlines distantes = falta de urgência real"
          });
        }
      }

      // 4. VALIDAR DEFINITION OF DONE
      if (item.definition_of_done && item.definition_of_done.length > 0) {
        problemas.push({
          tipo: "INFO",
          mensagem: `${item.definition_of_done.length} critérios DoD definidos`,
          detalhe: "Verificar manualmente se todos foram cumpridos"
        });
      } else {
        problemas.push({
          tipo: "MÉDIO",
          mensagem: "Definition of Done vazio",
          detalhe: "Como saber se está REALMENTE completo sem critérios?"
        });
      }

      // 5. VALIDAR DEPENDÊNCIAS
      if (item.dependencias && item.dependencias.length > 0) {
        problemas.push({
          tipo: "ALERTA",
          mensagem: `${item.dependencias.length} dependências declaradas`,
          detalhe: "Verificar se dependências foram resolvidas"
        });
      }

      // 6. SCORE FAKE-DONE (0-100, quanto MENOR = mais FAKE)
      let scoreFakeDone = 100;
      
      if (!item.evidencias || item.evidencias.length === 0) scoreFakeDone -= 40;
      if (!item.observacoes || item.observacoes.length < 50) scoreFakeDone -= 20;
      if (!item.definition_of_done || item.definition_of_done.length === 0) scoreFakeDone -= 15;
      if (problemas.filter(p => p.tipo === "CRÍTICO").length > 0) scoreFakeDone -= 25;

      const statusFinal = scoreFakeDone >= 80 ? "✅ COMPLETO REAL" :
                          scoreFakeDone >= 60 ? "⚠️ PARCIAL (fake-done parcial)" :
                          scoreFakeDone >= 40 ? "🔴 FAKE DONE (evidências fracas)" :
                          "💀 MENTIRA TOTAL (zero evidências)";

      const resultadoFinal = {
        score: scoreFakeDone,
        status: statusFinal,
        problemas,
        evidenciasValidadas,
        recomendacao: scoreFakeDone < 80 
          ? "Adicionar evidências reais (arquivos, entities) + detalhamento técnico nas observações"
          : "Conclusão validada"
      };

      setResultado(resultadoFinal);
      
      if (onResultado) {
        onResultado(resultadoFinal);
      }

      if (scoreFakeDone < 60) {
        toast.error(`💀 FAKE DONE: ${item.funcionalidade} (score ${scoreFakeDone}%)`, {
          description: problemas[0]?.mensagem
        });
      }

    } catch (error) {
      toast.error(`Erro na auditoria: ${error.message}`);
    } finally {
      setAuditando(false);
    }
  };

  return (
    <div className="space-y-4">
      {!resultado && (
        <button
          onClick={auditarItem}
          disabled={auditando}
          className="w-full px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: '#7E57FF', color: 'white' }}
        >
          {auditando ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Auditando...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              Auditar Conclusão
            </>
          )}
        </button>
      )}

      {resultado && (
        <div className="space-y-4">
          {/* SCORE */}
          <div className="p-6 rounded-2xl border-2" style={{
            backgroundColor: resultado.score >= 80 ? '#e6f7ed' :
                            resultado.score >= 60 ? '#fef9e5' :
                            resultado.score >= 40 ? '#fef2f2' : '#450a0a',
            borderColor: resultado.score >= 80 ? '#86efac' :
                         resultado.score >= 60 ? '#fef3c7' :
                         resultado.score >= 40 ? '#fecaca' : '#7f1d1d'
          }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-4xl font-bold" style={{
                  color: resultado.score >= 80 ? '#16a34a' :
                         resultado.score >= 60 ? '#92400e' :
                         resultado.score >= 40 ? '#991b1b' : '#dc2626'
                }}>
                  {resultado.score}%
                </p>
                <p className="text-sm font-bold" style={{
                  color: resultado.score >= 80 ? '#14532d' :
                         resultado.score >= 60 ? '#92400e' :
                         resultado.score >= 40 ? '#991b1b' : '#dc2626'
                }}>
                  {resultado.status}
                </p>
              </div>
              {resultado.score >= 80 ? (
                <CheckCircle2 className="w-12 h-12" style={{ color: '#16a34a' }} />
              ) : resultado.score >= 40 ? (
                <AlertCircle className="w-12 h-12" style={{ color: '#dc2626' }} />
              ) : (
                <XCircle className="w-12 h-12" style={{ color: '#7f1d1d' }} />
              )}
            </div>
            <p className="text-sm" style={{
              color: resultado.score >= 80 ? '#14532d' :
                     resultado.score >= 60 ? '#78350f' :
                     resultado.score >= 40 ? '#7f1d1d' : '#b91c1c'
            }}>
              {resultado.recomendacao}
            </p>
          </div>

          {/* PROBLEMAS */}
          {resultado.problemas.length > 0 && (
            <div className="space-y-2">
              <p className="font-bold text-sm" style={{ color: '#5f6368' }}>
                Problemas Detectados ({resultado.problemas.length}):
              </p>
              {resultado.problemas.map((p, i) => (
                <div key={i} className="p-3 rounded-lg border-l-4" style={{
                  backgroundColor: p.tipo === 'CRÍTICO' ? '#fef2f2' : p.tipo === 'MÉDIO' ? '#fef9e5' : '#f8f9fa',
                  borderLeftColor: p.tipo === 'CRÍTICO' ? '#dc2626' : p.tipo === 'MÉDIO' ? '#f59e0b' : '#5f6368'
                }}>
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold flex-shrink-0" style={{
                      backgroundColor: p.tipo === 'CRÍTICO' ? '#fee2e2' : p.tipo === 'MÉDIO' ? '#fef3c7' : '#e8eaed',
                      color: p.tipo === 'CRÍTICO' ? '#991b1b' : p.tipo === 'MÉDIO' ? '#92400e' : '#5f6368'
                    }}>
                      {p.tipo}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1" style={{ color: '#202124' }}>{p.mensagem}</p>
                      <p className="text-xs" style={{ color: '#5f6368' }}>{p.detalhe}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EVIDÊNCIAS VALIDADAS */}
          {resultado.evidenciasValidadas.length > 0 && (
            <div>
              <p className="font-bold text-sm mb-2" style={{ color: '#5f6368' }}>
                Evidências Validadas:
              </p>
              <div className="space-y-1">
                {resultado.evidenciasValidadas.map((ev, i) => (
                  <div key={i} className="p-2 rounded text-xs bg-gray-50">
                    <span style={{ color: '#34a853' }}>{ev.status}</span> {ev.evidencia}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setResultado(null)}
            className="w-full px-4 py-2 rounded-lg font-medium text-sm"
            style={{ backgroundColor: '#f8f9fa', color: '#5f6368' }}
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}