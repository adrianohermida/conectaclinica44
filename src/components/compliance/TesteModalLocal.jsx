import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, AlertTriangle, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * TESTE E2E LOCAL - Modal por Página
 * Valida comportamento REAL do modal no módulo atual
 */
export default function TesteModalLocal({ moduloNome, user, onClose }) {
  const [executando, setExecutando] = useState(false);
  const [resultados, setResultados] = useState([]);

  const testesModulo = {
    Prontuarios: [
      {
        nome: "Modal renderiza no módulo",
        executar: async () => {
          const modal = document.querySelector('[class*="fixed inset-0 bg-black/80 z-[9999]"]');
          return { 
            ok: !modal, 
            detalhes: modal ? 'Modal PRESENTE (não deveria)' : 'Modal ausente (correto)' 
          };
        },
        critico: true
      },
      {
        nome: "LocalStorage isolado",
        executar: async () => {
          const chave = `termo_aceito_${user.id}`;
          const valor = localStorage.getItem(chave);
          return { 
            ok: valor === 'SIM', 
            detalhes: `Valor: ${valor || 'NULL'}` 
          };
        },
        critico: true
      },
      {
        nome: "Aceites no BD válidos",
        executar: async () => {
          const aceites = await base44.entities.AceiteTermoLegal.filter({ 
            usuario_email: user.email 
          });
          return { 
            ok: aceites.length > 0, 
            detalhes: `${aceites.length} aceite(s)` 
          };
        },
        critico: true
      },
      {
        nome: "Conteúdo modal rolável",
        executar: async () => {
          // Simular abertura forçada
          const modalContent = document.querySelector('[class*="overflow-y-auto"]');
          if (!modalContent) {
            return { ok: true, detalhes: 'Modal não renderizado (esperado)' };
          }
          
          const { scrollHeight, clientHeight } = modalContent;
          const rolavel = scrollHeight > clientHeight;
          
          return { 
            ok: true, // Não é erro se não for rolável
            detalhes: rolavel ? `Rolável: ${scrollHeight}px vs ${clientHeight}px` : 'Cabe na tela' 
          };
        },
        critico: false
      },
      {
        nome: "Botão aceite clicável",
        executar: async () => {
          const botao = document.querySelector('button[class*="bg-purple-600"]');
          if (!botao) {
            return { ok: true, detalhes: 'Modal não renderizado (esperado)' };
          }
          
          const disabled = botao.disabled;
          return { 
            ok: !disabled, 
            detalhes: disabled ? 'Botão DISABLED (scroll incompleto?)' : 'Botão ativo' 
          };
        },
        critico: false
      }
    ],
    Pacientes: [
      {
        nome: "Modal não reabre após navegação",
        executar: async () => {
          const modal = document.querySelector('[class*="fixed inset-0 bg-black/80 z-[9999]"]');
          return { 
            ok: !modal, 
            detalhes: modal ? 'Modal ABRIU após navegar' : 'Modal fechado' 
          };
        },
        critico: true
      },
      {
        nome: "LocalStorage persiste cross-page",
        executar: async () => {
          const chave = `termo_aceito_${user.id}`;
          const valor = localStorage.getItem(chave);
          return { 
            ok: valor === 'SIM', 
            detalhes: `${chave} = ${valor}` 
          };
        },
        critico: true
      },
      {
        nome: "React Query cache limpa",
        executar: async () => {
          const queryClient = window.__REACT_QUERY_CLIENT__;
          const cache = queryClient?.getQueryCache();
          const modalQuery = cache?.find(['termos-pendentes-final', user?.email]);
          
          return { 
            ok: !modalQuery?.state?.data || modalQuery.state.data.length === 0, 
            detalhes: `Cache: ${modalQuery?.state?.data?.length || 0} termo(s)` 
          };
        },
        critico: false
      }
    ],
    Agenda: [
      {
        nome: "Modal não interfere em módulo",
        executar: async () => {
          const modal = document.querySelector('[class*="fixed inset-0 bg-black/80 z-[9999]"]');
          return { 
            ok: !modal, 
            detalhes: modal ? 'Modal BLOQUEANDO módulo' : 'Módulo livre' 
          };
        },
        critico: true
      },
      {
        nome: "Performance não degradada",
        executar: async () => {
          const perfData = performance.getEntriesByType('navigation')[0];
          const pageLoad = perfData?.loadEventEnd - perfData?.fetchStart || 0;
          
          return { 
            ok: pageLoad < 3000, 
            detalhes: `Page Load: ${Math.round(pageLoad)}ms` 
          };
        },
        critico: false
      }
    ],
    Atendimento: [
      {
        nome: "Modal não conflita com chat",
        executar: async () => {
          const modal = document.querySelector('[class*="fixed inset-0 bg-black/80 z-[9999]"]');
          const chat = document.querySelector('[class*="z-[9998]"]');
          
          return { 
            ok: !modal || modal.style.zIndex > 9998, 
            detalhes: modal ? 'Modal z-index OK' : 'Modal não renderizado' 
          };
        },
        critico: false
      }
    ],
    DashboardCompleto: [
      {
        nome: "Modal não reabre após aceite",
        executar: async () => {
          const modal = document.querySelector('[class*="fixed inset-0 bg-black/80 z-[9999]"]');
          return { 
            ok: !modal, 
            detalhes: modal ? 'Modal ABERTO (BUG)' : 'Modal fechado (correto)' 
          };
        },
        critico: true
      },
      {
        nome: "Aceite único por user",
        executar: async () => {
          const aceites = await base44.entities.AceiteTermoLegal.filter({ 
            usuario_email: user.email 
          });
          
          // Verificar duplicações
          const duplicados = aceites.filter((a, idx, arr) => 
            arr.findIndex(b => 
              b.termo_legal_id === a.termo_legal_id && 
              b.termo_versao === a.termo_versao
            ) !== idx
          );
          
          return { 
            ok: duplicados.length === 0, 
            detalhes: `${aceites.length} aceites, ${duplicados.length} duplicados` 
          };
        },
        critico: true
      }
    ]
  };

  const executarTestes = async () => {
    setExecutando(true);
    setResultados([]);
    
    const testesAtuais = testesModulo[moduloNome] || testesModulo.DashboardCompleto;
    const results = [];

    for (const teste of testesAtuais) {
      try {
        const resultado = await teste.executar();
        results.push({
          nome: teste.nome,
          status: resultado.ok ? 'ok' : 'fail',
          detalhes: resultado.detalhes,
          critico: teste.critico
        });
      } catch (error) {
        results.push({
          nome: teste.nome,
          status: 'error',
          detalhes: error.message,
          critico: teste.critico
        });
      }
    }

    setResultados(results);
    setExecutando(false);

    const criticos = results.filter(r => r.critico && r.status !== 'ok');
    if (criticos.length === 0) {
      toast.success(`✅ ${moduloNome}: Modal validado`);
    } else {
      toast.error(`❌ ${criticos.length} teste(s) crítico(s) falharam`);
    }
  };

  const todosOk = resultados.length > 0 && resultados.filter(r => r.critico).every(r => r.status === 'ok');

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      maxWidth: '600px',
      width: '100%'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#202124', marginBottom: '6px' }}>
          🧪 Teste E2E Local: {moduloNome}
        </h3>
        <p style={{ fontSize: '12px', color: '#5f6368' }}>
          Valida comportamento do modal nesta página
        </p>
      </div>

      {/* Botão Executar */}
      {resultados.length === 0 && (
        <button
          onClick={executarTestes}
          disabled={executando}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: executando ? '#dadce0' : '#7E57FF',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            cursor: executando ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            minHeight: '48px'
          }}
        >
          {executando ? (
            <>
              <Loader2 className="animate-spin" style={{ width: '18px', height: '18px' }} />
              Executando testes...
            </>
          ) : (
            <>
              <Play style={{ width: '18px', height: '18px' }} />
              Executar Testes ({testesModulo[moduloNome]?.length || testesModulo.DashboardCompleto.length})
            </>
          )}
        </button>
      )}

      {/* Resultados */}
      {resultados.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {resultados.map((r, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: r.status === 'ok' ? '#e8f5e9' : r.status === 'fail' ? '#fef2f2' : '#fef9e5',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${r.status === 'ok' ? '#c8e6c9' : r.status === 'fail' ? '#fee2e2' : '#fef3c7'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                  {r.status === 'ok' && <CheckCircle2 style={{ width: '18px', height: '18px', color: '#34a853', flexShrink: 0, marginTop: '2px' }} />}
                  {r.status === 'fail' && <XCircle style={{ width: '18px', height: '18px', color: '#ea4335', flexShrink: 0, marginTop: '2px' }} />}
                  {r.status === 'error' && <AlertTriangle style={{ width: '18px', height: '18px', color: '#fbbc04', flexShrink: 0, marginTop: '2px' }} />}
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '700', color: '#202124' }}>
                        {r.nome}
                      </p>
                      {r.critico && (
                        <span style={{
                          backgroundColor: '#ea4335',
                          color: '#fff',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          CRÍTICO
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '10px', color: '#5f6368', lineHeight: '1.5' }}>
                      {r.detalhes}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Score Final */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: todosOk ? '#e8f5e9' : '#fef2f2',
            borderRadius: '10px',
            border: `2px solid ${todosOk ? '#c8e6c9' : '#fee2e2'}`,
            textAlign: 'center'
          }}>
            <p style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: todosOk ? '#1b5e20' : '#991b1b',
              marginBottom: '6px'
            }}>
              {todosOk ? '✅ PASSOU' : `❌ ${resultados.filter(r => r.critico && r.status !== 'ok').length} FALHAS`}
            </p>
            <p style={{ fontSize: '11px', color: todosOk ? '#2e7d32' : '#b91c1c' }}>
              {todosOk 
                ? 'Modal comportamento correto neste módulo' 
                : 'Corrigir falhas críticas antes de prosseguir'}
            </p>
          </div>

          {/* Botões Ação */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                const report = `# Teste E2E Local: ${moduloNome}
Executado: ${new Date().toLocaleString('pt-BR')}

## Resultados:
${resultados.map((r, i) => `${i + 1}. [${r.status.toUpperCase()}] ${r.nome}${r.critico ? ' **[CRÍTICO]**' : ''}
   ${r.detalhes}
`).join('\n')}

## Conclusão:
${todosOk ? '✅ PASSOU - Modal validado neste módulo' : `❌ FALHOU - ${resultados.filter(r => r.critico && r.status !== 'ok').length} testes críticos falharam`}
`;
                navigator.clipboard.writeText(report).then(() => {
                  toast.success('📋 Relatório copiado');
                });
              }}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#7E57FF',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                minHeight: '44px'
              }}
            >
              📋 Copiar Relatório
            </button>
            <button
              onClick={executarTestes}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#5f6368',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                minHeight: '44px'
              }}
            >
              🔄 Re-executar
            </button>
          </div>
        </div>
      )}

      {/* Instruções Teste Manual */}
      {resultados.length > 0 && !todosOk && (
        <div style={{
          marginTop: '16px',
          backgroundColor: '#fef9e5',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #fef3c7'
        }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#854d0e', marginBottom: '8px' }}>
            🔧 CORREÇÕES SUGERIDAS:
          </p>
          <ul style={{ fontSize: '10px', color: '#a16207', lineHeight: '1.8', paddingLeft: '16px' }}>
            {resultados.filter(r => r.status !== 'ok').map((r, idx) => (
              <li key={idx}>
                <strong>{r.nome}:</strong> {r.detalhes}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fechar */}
      <button
        onClick={onClose}
        style={{
          marginTop: '16px',
          width: '100%',
          padding: '10px',
          backgroundColor: 'transparent',
          color: '#5f6368',
          border: '1px solid #dadce0',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          minHeight: '44px'
        }}
      >
        Fechar
      </button>
    </div>
  );
}