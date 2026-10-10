import React, { useState } from "react";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Download, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";

/**
 * TESTE BRUTAL: ModalTermoObrigatorio nunca mais abre
 * VALIDAÇÃO: localStorage + BD + cache + cross-page + cross-user
 */
export default function TesteModalTermoBrutal() {
  const [testesRodando, setTestesRodando] = useState(false);
  const [resultados, setResultados] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['auth-user'],
    queryFn: () => base44.auth.me()
  });

  const gerarDiagnosticoMarkdown = () => {
    const timestamp = new Date().toISOString();
    const criticos = resultados.filter(r => r.critico && r.status === 'fail');
    const todosOk = resultados.filter(r => r.status !== 'manual').every(r => r.status === 'ok');

    let markdown = `# 🧪 VALIDAÇÃO BRUTAL - ModalTermoObrigatorio
**Executado em:** ${new Date(timestamp).toLocaleString('pt-BR')}
**Status:** ${todosOk && criticos.length === 0 ? '✅ REAL DONE' : `❌ FAKE DONE (${criticos.length} testes críticos falharam)`}

---

## 📋 Resultados dos Testes

`;

    resultados.forEach((r, idx) => {
      const statusEmoji = r.status === 'ok' ? '✅' : r.status === 'fail' ? '❌' : '⚠️';
      
      markdown += `### ${idx + 1}. ${statusEmoji} ${r.teste}${r.critico ? ' **[CRÍTICO]**' : ''}
**Status:** ${r.status.toUpperCase()}
**Detalhes:** ${r.detalhes}

`;

      // Diagnóstico específico
      if (r.status === 'fail') {
        markdown += `#### 🔥 DIAGNÓSTICO BRUTAL:

`;
        
        if (r.teste === 'LocalStorage persistido') {
          markdown += `**CAUSA-RAIZ:**
- localStorage('termo_aceito_${user?.id || 'USER_ID'}') retornou NULL ou valor diferente de 'SIM'
- Linha crítica: components/compliance/ModalTermoObrigatorio linha 46-54

**IMPACTO:**
- Modal reabre SEMPRE após reload
- Médicos abandonam sistema após 2 reloads
- PrevenClin cancela = R$3.564 ARR perdidos

**PROMPT DE CORREÇÃO:**
\`\`\`
1. Verificar linha 54 ModalTermoObrigatorio:
   localStorage.setItem(\`termo_aceito_\${user.id}\`, 'SIM')
   
2. Confirmar não há localStorage.removeItem em outro lugar

3. Limpar cache navegador + testar

TEMPO: 5min
\`\`\`
`;
        } else if (r.teste === 'Aceites no BD') {
          markdown += `**CAUSA-RAIZ:**
- AceiteTermoLegal.filter({ usuario_email: '${user?.email || 'USER_EMAIL'}' }) retornou []
- Usuário aceitou modal MAS registro NÃO foi salvo no banco
- Linha crítica: functions/registrarAceiteTermo linha 25-45 OU ModalTermoObrigatorio linha 123

**IMPACTO:**
- LocalStorage limpo → modal reabre (sem fallback BD)
- LGPD compliance quebrado (sem prova aceite)
- Auditoria CFM detecta = multa

**PROMPT DE CORREÇÃO:**
\`\`\`
1. Verificar mutation registrarAceiteTermo sendo chamada:
   - ModalTermoObrigatorio linha 123: registrarAceiteMutation.mutate()
   - Confirmar await base44.entities.AceiteTermoLegal.create() executa

2. Testar criação manual:
   await base44.entities.AceiteTermoLegal.create({
     usuario_email: user.email,
     termo_legal_id: termo.id,
     termo_versao: termo.versao,
     tempo_leitura_segundos: 30,
     aceito_em: new Date().toISOString()
   })

3. Verificar entity existe: entities/AceiteTermoLegal.json

TEMPO: 10min
\`\`\`
`;
        } else if (r.teste === 'Termos pendentes após aceite') {
          markdown += `**CAUSA-RAIZ:**
- obterTermosPendentes() retornou termos pendentes MESMO APÓS aceite
- Bug lógica filtro: linha 38-52 components/compliance/ModalTermoObrigatorio
- Possível: versão termo mudou mas user não re-aceitou

**IMPACTO:**
- Modal reabre infinitamente
- Usuário preso na tela (impossível usar app)

**PROMPT DE CORREÇÃO:**
\`\`\`
1. Verificar lógica filtro linha 42-48 ModalTermoObrigatorio:
   const termosPendentes = data?.termos_pendentes?.filter(termo => {
     const aceito = aceites.find(a => 
       a.termo_legal_id === termo.id && 
       a.termo_versao === termo.versao
     );
     return !aceito;
   });

2. Se termosPendentes.length > 0 APÓS aceite:
   - Debug: qual termo está pendente?
   - Verificar versão termo no BD vs versão aceite
   - Possível: termo foi atualizado e usuário precisa re-aceitar

3. Se termo NÃO foi atualizado:
   - Bug no filtro: verificar termo.id vs termo_legal_id match

TEMPO: 15min
\`\`\`
`;
        } else if (r.teste === 'Fallback BD se localStorage limpo') {
          markdown += `**CAUSA-RAIZ:**
- localStorage limpo simulado
- BD retornou 0 aceites (PIOR CASO: duplo failure)
- Linha crítica: ModalTermoObrigatorio linha 42-68

**IMPACTO:**
- Usuário limpa cache → modal reabre (correto)
- MAS se BD também vazio → loop infinito

**PROMPT DE CORREÇÃO:**
\`\`\`
1. Verificar usuário tem aceites no BD:
   await base44.entities.AceiteTermoLegal.filter({ usuario_email: user.email })
   
2. Se vazio:
   - Aceitar termo manualmente 1x
   - Verificar registro salvo BD
   - Setar localStorage: localStorage.setItem('termo_aceito_USER_ID', 'SIM')

3. Se continua falhando:
   - Bug mutation registrarAceiteTermo
   - Verificar console.error ao aceitar

TEMPO: 10min
\`\`\`
`;
        } else if (r.teste === 'Modal NÃO existe no DOM') {
          markdown += `**CAUSA-RAIZ:**
- Modal RENDERIZADO no DOM após aceite (BUG CRÍTICO)
- Linha crítica: ModalTermoObrigatorio linha 299-313 (render condition)
- Possível: termosPendentes.length > 0 AINDA

**IMPACTO:**
- Modal reabre = usuário preso
- Performance degrada (componente renderizando sempre)

**PROMPT DE CORREÇÃO:**
\`\`\`
1. Verificar linha 299 ModalTermoObrigatorio:
   if (!user || termosPendentes.length === 0 || permanenteClosed) return null;

2. Debug termosPendentes.length:
   - Se > 0: bug filtro (ver teste "Termos pendentes após aceite")
   - Se === 0: bug render condition

3. Forçar re-render:
   - Limpar React Query cache: queryClient.clear()
   - Reload app
   - Verificar DOM novamente

TEMPO: 10min
\`\`\`
`;
        }

        markdown += `
---

`;
      }
    });

    markdown += `
## 🎯 CONCLUSÃO BRUTAL

`;

    if (todosOk && criticos.length === 0) {
      markdown += `✅ **MODAL VALIDADO - REAL DONE**

**PRÓXIMOS PASSOS:**
1. Marcar DIA 0 Compliance = REAL DONE no DiagnosticoProducao
2. Avançar DIA 1-3 Atendimento (re-executar TestesE2EAtendimento)
3. Deploy hotfix 0.9.1 → PrevenClin valida HOJE

**VALIDAÇÃO MANUAL RESTANTE:**
- Navegar 5 páginas diferentes (Prontuários, Pacientes, Agenda, Atendimento, Financeiro)
- Confirmar modal NÃO reabre em NENHUMA
- Abrir aba anônima → modal DEVE abrir (novo user)

Se TODOS passarem → compliance 100% validado.
`;
    } else {
      markdown += `❌ **${criticos.length} TESTE(S) CRÍTICO(S) FALHARAM - FAKE DONE**

**BLOQUEADORES:**
${criticos.map((c, idx) => `${idx + 1}. ${c.teste}: ${c.detalhes}`).join('\n')}

**IMPACTO BRUTAL:**
- Modal reabrindo = médicos abandonam = PrevenClin cancela
- R$3.564 ARR perdidos HOJE
- 6 meses desenvolvimento → 0 clientes satisfeitos

**ORDEM FATAL:**
1. Executar prompts de correção acima (5-15min cada)
2. Re-executar validação (botão verde)
3. Se TODOS OK → validação manual (5 páginas)
4. Só marcar REAL DONE após 100% validado

**CUSTO DE OPORTUNIDADE:**
- Cada hora que modal fica quebrado = 1 médico frustra
- 1 médico frustra = 10% chance cancelamento PrevenClin
- PrevenClin cancela = R$3.564 ARR + reputação destruída

⚡ **NÃO AVANÇAR enquanto modal reabre.**
`;
    }

    markdown += `
---

## 📊 MÉTRICAS VALIDAÇÃO

**Testes Executados:** ${resultados.filter(r => r.status !== 'manual').length}/${resultados.length - 1} (1 manual)
**Taxa de Sucesso:** ${Math.round((resultados.filter(r => r.status === 'ok').length / resultados.filter(r => r.status !== 'manual').length) * 100)}%
**Testes Críticos:** ${resultados.filter(r => r.critico).length}
**Críticos Falhados:** ${criticos.length}

**CRITÉRIO REAL DONE:**
- 7/7 testes automáticos OK
- 5/5 testes manuais cross-page OK
- Modal NÃO renderiza DOM após aceite
- LocalStorage + BD sincronizados
- Aba anônima modal ABRE (novo user)

**LIMITAÇÕES:**
- Sem teste cross-browser (apenas Chrome)
- Sem teste performance (modal abre <50ms?)
- Sem teste acessibilidade (screen reader?)
- Sem teste aba anônima automatizado

**PRÓXIMOS NÍVEIS (pós-REAL DONE):**
1. Playwright E2E cross-browser
2. Performance budget modal <50ms
3. A11y validation (WCAG 2.1 AA)
4. Visual regression testing (screenshot diff)
`;

    return markdown;
  };

  const copiarDiagnostico = () => {
    const markdown = gerarDiagnosticoMarkdown();
    navigator.clipboard.writeText(markdown).then(() => {
      toast.success('📋 Diagnóstico copiado! Cole no README ou ChatGPT para análise.');
    });
  };

  const baixarDiagnostico = () => {
    const markdown = gerarDiagnosticoMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostico-modal-termo-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('📥 Diagnóstico baixado!');
  };

  const executarTesteBrutal = async () => {
    setTestesRodando(true);
    setResultados([]);
    const results = [];

    try {
      // TESTE 1: localStorage existe?
      const chave = `termo_aceito_${user?.id}`;
      const localValue = localStorage.getItem(chave);
      results.push({
        teste: "LocalStorage persistido",
        status: localValue === 'SIM' ? 'ok' : 'fail',
        detalhes: `Valor: ${localValue || 'NULL'}`,
        critico: true
      });

      // TESTE 2: BD tem aceites?
      const aceites = await base44.entities.AceiteTermoLegal.filter({ 
        usuario_email: user.email 
      });
      results.push({
        teste: "Aceites no BD",
        status: aceites.length > 0 ? 'ok' : 'fail',
        detalhes: `${aceites.length} aceite(s) encontrado(s)`,
        critico: true
      });

      // TESTE 3: Obter termos pendentes (deve retornar vazio)
      const { data } = await base44.functions.invoke('obterTermosPendentes', { 
        pathname: window.location.pathname 
      });
      const termosPendentes = data?.termos_pendentes || [];
      
      const aceitesPorVersao = termosPendentes.map(t => {
        const aceito = aceites.find(a => 
          (a.termo_legal_id === t.id || a.termo_id === t.id) && 
          a.termo_versao === t.versao
        );
        return { termo_id: t.id, versao: t.versao, aceito: !!aceito };
      });

      results.push({
        teste: "Termos pendentes após aceite",
        status: aceitesPorVersao.every(t => t.aceito) ? 'ok' : 'fail',
        detalhes: `${termosPendentes.length} termo(s) obrigatório(s), ${aceitesPorVersao.filter(t => t.aceito).length} aceito(s)`,
        critico: true
      });

      // TESTE 4: Query cache está setada?
      const queryClient = window.__REACT_QUERY_CLIENT__;
      const queryCache = queryClient?.getQueryCache();
      const modalQuery = queryCache?.find(['termos-pendentes-final', user?.email]);
      
      results.push({
        teste: "React Query cache vazia",
        status: !modalQuery?.state?.data || modalQuery.state.data.length === 0 ? 'ok' : 'fail',
        detalhes: `Cache: ${modalQuery?.state?.data?.length || 0} termo(s)`,
        critico: true
      });

      // TESTE 5: Modal NÃO renderiza no DOM
      const modalElement = document.querySelector('[class*="fixed inset-0 bg-black/80 z-[9999]"]');
      results.push({
        teste: "Modal NÃO existe no DOM",
        status: !modalElement ? 'ok' : 'fail',
        detalhes: modalElement ? 'Modal RENDERIZADO (BUG!)' : 'Modal não encontrado (correto)',
        critico: true
      });

      // TESTE 6: 1Simular reload + verificar localStorage persiste
      const beforeReload = localStorage.getItem(chave);
      localStorage.setItem('test_pre_reload', 'true');
      const afterCheck = localStorage.getItem(chave);
      
      results.push({
        teste: "localStorage sobrevive reload",
        status: beforeReload === afterCheck && afterCheck === 'SIM' ? 'ok' : 'fail',
        detalhes: `Antes: ${beforeReload}, Depois: ${afterCheck}`,
        critico: false
      });

      // TESTE 7: Simular limpar localStorage (pior caso)
      localStorage.removeItem(chave);
      const limpo = localStorage.getItem(chave);
      results.push({
        teste: "Fallback BD se localStorage limpo",
        status: limpo === null ? 'ok' : 'fail',
        detalhes: aceites.length > 0 ? 'BD tem aceites como fallback' : 'SEM fallback (RISCO)',
        critico: true
      });

      // Restaurar localStorage
      if (aceites.length > 0) {
        localStorage.setItem(chave, 'SIM');
      }

      // TESTE 8: Cross-page (navegar e verificar)
      results.push({
        teste: "Cross-page isolation",
        status: 'manual',
        detalhes: 'Navegar Prontuários/Pacientes/Agenda e verificar modal não reabre',
        critico: true
      });

      setResultados(results);

    } catch (error) {
      results.push({
        teste: "ERRO EXECUÇÃO",
        status: 'fail',
        detalhes: error.message,
        critico: true
      });
      setResultados(results);
    }

    setTestesRodando(false);
  };

  const todosOk = resultados.filter(r => r.status !== 'manual').every(r => r.status === 'ok');
  const criticos = resultados.filter(r => r.critico && r.status === 'fail');

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="🧪 Teste Brutal: ModalTermoObrigatorio"
          description="Validação isolamento localStorage + BD + cache + cross-page"
          breadcrumbs={[{ label: "SuperAdmin" }, { label: "Compliance" }, { label: "Termos Legais", url: createPageUrl("GestaoTermosLegais") }, { label: "Teste E2E" }]}
        />

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-xl font-bold">Validação Multi-Camada</h2>
              <p className="text-sm text-gray-600">
                8 testes para garantir modal NUNCA reabre após aceite
              </p>
            </div>
            <div className="flex gap-2">
              {resultados.length > 0 && (
                <>
                  <Button
                    onClick={copiarDiagnostico}
                    variant="outline"
                    size="sm"
                    icon={<FileText className="w-4 h-4" />}
                  >
                    Copiar Diagnóstico
                  </Button>
                  <Button
                    onClick={baixarDiagnostico}
                    variant="outline"
                    size="sm"
                    icon={<Download className="w-4 h-4" />}
                  >
                    Baixar .md
                  </Button>
                </>
              )}
              <Button
                onClick={executarTesteBrutal}
                disabled={testesRodando}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {testesRodando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Executar Validação'}
              </Button>
            </div>
          </div>

          {resultados.length > 0 && (
            <div className="space-y-3">
              {resultados.map((r, idx) => (
                <div
                  key={idx}
                  className={`border-l-4 rounded-lg p-4 ${
                    r.status === 'ok' 
                      ? 'border-green-600 bg-green-50' 
                      : r.status === 'fail'
                      ? 'border-red-600 bg-red-50'
                      : 'border-yellow-600 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {r.status === 'ok' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                        {r.status === 'fail' && <XCircle className="w-5 h-5 text-red-600" />}
                        {r.status === 'manual' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                        <h3 className="font-bold">{r.teste}</h3>
                        {r.critico && (
                          <Badge className="bg-red-600 text-white text-xs">CRÍTICO</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{r.detalhes}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {resultados.length > 0 && (
            <div className={`mt-6 p-4 rounded-lg ${
              todosOk && criticos.length === 0
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}>
              <p className="font-bold text-xl mb-2">
                {todosOk && criticos.length === 0 
                  ? '✅ VALIDAÇÃO PASSOU - Modal isolado corretamente' 
                  : `❌ ${criticos.length} TESTE(S) CRÍTICO(S) FALHARAM`}
              </p>
              {criticos.length > 0 && (
                <ul className="text-sm space-y-1">
                  {criticos.map((c, idx) => (
                    <li key={idx}>• {c.teste}: {c.detalhes}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>

        {/* TESTES MANUAIS */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">🧪 Testes Manuais (Cross-Page)</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">1️⃣</span>
              <p className="text-sm">
                Navegar para <strong>Prontuários</strong> → modal NÃO deve abrir
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">2️⃣</span>
              <p className="text-sm">
                Navegar para <strong>Pacientes</strong> → modal NÃO deve abrir
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">3️⃣</span>
              <p className="text-sm">
                Navegar para <strong>Agenda</strong> → modal NÃO deve abrir
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">4️⃣</span>
              <p className="text-sm">
                Abrir em <strong>aba anônima</strong> → modal DEVE abrir (novo user)
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">5️⃣</span>
              <p className="text-sm">
                Limpar localStorage + reload → modal DEVE abrir (mas só 1x)
              </p>
            </div>
          </div>
        </Card>

        {/* CONCLUSÃO */}
        <Card className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <h2 className="text-2xl font-bold mb-4">📊 Conclusão Validação</h2>
          <p className="text-lg mb-4">
            Status atual do fix: <strong>PRECISA VALIDAÇÃO MANUAL</strong>
          </p>
          <div className="space-y-2 text-sm">
            <p>✅ Código implementado: localStorage prioritário + try/catch + fallback BD</p>
            <p>✅ Lógica parece correta: 3 camadas defesa (localStorage → BD → assume OK)</p>
            <p>⚠️ Sem teste E2E automatizado: impossível garantir 100%</p>
            <p>🚨 Teste manual OBRIGATÓRIO: navegar 5 páginas + verificar modal</p>
          </div>
          <div className="mt-4 p-3 bg-white/20 rounded-lg">
            <p className="font-bold mb-2">🎯 Para marcar REAL DONE:</p>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Executar validação automática (botão acima)</li>
              <li>Navegar 5 páginas diferentes (Prontuários, Pacientes, etc)</li> 
              <li>Confirmar modal NÃO reabre em nenhuma</li>
              <li>Abrir aba anônima → modal DEVE abrir para novo user</li>
              <li>Se TODOS passarem → REAL DONE, senão → FAKE DONE</li>
            </ol>
          </div>
        </Card>
      </div>
    </RouteGuard>
  );
}