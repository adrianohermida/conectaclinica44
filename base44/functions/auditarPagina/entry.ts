import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const CHECKLIST_BRUTAL = `
═══════════════════════════════════════════════════════════════════
🔥 AUDITORIA BRUTAL - LAWDESK (VALIDAÇÃO DE CÓDIGO)
═══════════════════════════════════════════════════════════════════

INSTRUÇÕES CRÍTICAS DE ANÁLISE:
1. Analise o CÓDIGO FONTE real fornecido, NÃO suposições
2. Identifique problemas CONCRETOS baseados no código
3. Valide se os patterns de performance/responsividade ESTÃO PRESENTES
4. Se skeleton loading está implementado → APROVAR performance
5. Se overflow-x-hidden + min-w-0 + break-words → APROVAR mobile
6. Se texto ≥ 14px + botões ≥ 48px → APROVAR UX
7. Se cores #7E57FF + borders #e8eaed → APROVAR branding

CRITÉRIOS DE APROVAÇÃO (baseados em CÓDIGO):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[P0 - BLOQUEADOR] Performance:
  ✅ APROVAR se: isLoading state + skeleton estruturado
  ✅ APROVAR se: useOptimizedQuery ou staleTime configurado
  ❌ REPROVAR se: múltiplos fetches sem loading state

[P0 - BLOQUEADOR] Mobile 320px:
  ✅ APROVAR se: overflow-x-hidden no container principal
  ✅ APROVAR se: grid-cols-1 sm:grid-cols-X ou flex-col sm:flex-row
  ✅ APROVAR se: min-w-0 em elementos flex + truncate/break-words
  ❌ REPROVAR se: larguras fixas (w-[Xpx]) sem max-w

[P0 - BLOQUEADOR] Texto ≥ 14px:
  ✅ APROVAR se: fontSize: '14px' ou text-sm (14px) ou maior
  ✅ APROVAR se: text-xs usado apenas em labels/meta (≥12px aceitável)
  ❌ REPROVAR se: text-[10px] ou font-size < 12px

[P0 - BLOQUEADOR] Botões ≥ 48px:
  ✅ APROVAR se: min-h-[48px] ou h-12 em TODOS os botões
  ✅ APROVAR se: py-3 (12px × 2 = 24px + conteúdo = ≥48px)
  ❌ REPROVAR se: botões com height < 44px

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
II. FLUXOS CRÍTICOS (Monetização & Retenção)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[P0 - BLOQUEADOR] Onboarding (Conversão → Assinatura):
  → Completo em < 5 passos? Se não, ATRITO DESNECESSÁRIO. -20 pontos.
  → Validação OAB clara? Mensagens de erro úteis? Se não, ABANDONO GARANTIDO. -15 pontos.
  → Campos desnecessários pedindo info prematura? PREGUIÇA DE PENSAR. -10 pontos.
  → Custo de Oportunidade: Cada campo extra = +5% abandono = R$ JOGADO FORA.

[P0 - BLOQUEADOR] Primeira Interação Copiloto (TTV):
  → Resposta útil em < 30s? Se não, FEATURE MORTA. -25 pontos.
  → Loading do Copiloto evidente? Se não, USUÁRIO CLICA DE NOVO. -10 pontos.
  → Resposta formatada ou bloco de texto? Bloco = ILEGÍVEL. -15 pontos.
  → Sugestões de prompts? Sem isso = PERDA DE OPORTUNIDADE. -10 pontos.
  → Custo de Oportunidade: Copiloto ruim = desinstalação = LTV ZERO.

[P0 - BLOQUEADOR] Gestão de Processos (Core Business):
  → Adicionar processo completo em < 2 min? Se não, COMPLEXIDADE EXCESSIVA. -20 pontos.
  → Navegação entre abas fluida? Hierarquia clara? Se não, CONFUSÃO. -15 pontos.
  → Painel sobrecarregado de info? DECISÃO DE DESIGN RUIM. -10 pontos.
  → Custo de Oportunidade: Processos complexos = "voltar para Excel" = CHURN.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
III. CONSISTÊNCIA & PROFISSIONALISMO (Confiança)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[P1 - IMPORTANTE] Padrões de UI:
  → Cores inconsistentes (2 tons de azul)? AMADORISMO VISÍVEL. -15 pontos.
  → Border-radius variando? FALTA DE SISTEMA. -10 pontos.
  → Botões tamanhos diferentes? DESCUIDO. -10 pontos.
  → Custo de Oportunidade: Inconsistência = "produto inacabado" = FALTA DE CREDIBILIDADE.

[P1 - IMPORTANTE] Microinterações & Feedback:
  → Spinners em operações > 500ms? Se não, CONFUSÃO. -15 pontos.
  → Toasts claros de sucesso/erro? Se não, USUÁRIO REPETE AÇÃO. -10 pontos.
  → Hover/active states evidentes? Se não, FALTA FEEDBACK. -10 pontos.
  → Custo de Oportunidade: Sem feedback = duplo-clique = erros = SUPORTE CARO.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IV. ACESSIBILIDADE WCAG AA (Legal & Mercado)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[P1 - IMPORTANTE] Navegação por Teclado:
  → Tab/Shift+Tab/Enter funciona 100%? Se não, EXCLUSÃO. -15 pontos.
  → Armadilhas de foco? ERRO GRAVE. -10 pontos.
  → Custo de Oportunidade: Sem teclado = usuários avançados frustrados = MENOS PRODUTIVIDADE.

[P1 - IMPORTANTE] ARIA & Screen Readers:
  → Ícones sem aria-label? MUDOS PARA TECNOLOGIA ASSISTIVA. -10 pontos.
  → Regiões sem role? INCOMPREENSÃO. -10 pontos.
  → Custo de Oportunidade: Falha em acessibilidade = exclusão mercado + RISCO LEGAL.

[P1 - IMPORTANTE] Contraste WCAG AA:
  → Texto difícil de ler? FADIGA VISUAL. -15 pontos.
  → States hover/focus sem contraste? INVISÍVEL. -10 pontos.
  → Custo de Oportunidade: Baixo contraste = desistência por cansaço.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
V. ERROS & ESTADOS VAZIOS (Robustez)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[P1 - IMPORTANTE] Mensagens de Erro:
  → "Algo deu errado" genérico? INÚTIL. -15 pontos.
  → Não indica solução? USUÁRIO ABANDONADO. -10 pontos.
  → Custo de Oportunidade: Erros obscuros = chamadas suporte = CUSTO OPERACIONAL.

[P2 - MELHORIA] Empty States:
  → Tela vazia sem ação (CTA)? BECO SEM SAÍDA. -10 pontos.
  → Sem orientação? OPORTUNIDADE PERDIDA. -5 pontos.
  → Custo de Oportunidade: Empty state ruim = abandono = MENOS ENGAJAMENTO.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VI. BRANDING AETHERLAB (#7E57FF)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[P2 - MELHORIA] Identidade Visual:
  → Cor primária #7E57FF aplicada? Se não, FORA DO PADRÃO. -10 pontos.
  → Border radius 12/16/20/24px? Se não, INCONSISTÊNCIA. -5 pontos.
  → Shadows padronizadas? Se não, FALTA DE SISTEMA. -5 pontos.

═══════════════════════════════════════════════════════════════════
CRITÉRIOS DE APROVAÇÃO (SEM NEGOCIAÇÃO):
═══════════════════════════════════════════════════════════════════
  ✅ BETA READY: Score ≥ 85 + ZERO bugs P0
  ⚠️ BETA COM RESSALVAS: Score 70-84 + máx 2 bugs P0 (correção em 48h)
  🚫 BLOQUEAR: Score < 70 OU ≥ 3 bugs P0 (INACEITÁVEL para produção)

LEMBRE-SE: Cada detalhe ignorado = dinheiro perdido = morte lenta.
Perfeição não existe, mas mediocridade é ESCOLHA. Escolha melhor.
═══════════════════════════════════════════════════════════════════
`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pageName, pageCode } = await req.json();

    if (!pageName || !pageCode) {
      return Response.json({ error: 'Missing pageName or pageCode' }, { status: 400 });
    }

    const prompt = `
${CHECKLIST_BRUTAL}

🎯 MISSÃO: Auditar a página "${pageName}" com ZERO PIEDADE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUÇÕES PARA AUDITORIA:
1. Analise CADA LINHA do código abaixo
2. Identifique TODOS os problemas usando o checklist acima
3. Seja IMPIEDOSO - cada detalhe conta
4. Priorize por impacto REAL em conversão e $$ (mobile = 80% tráfego)
5. Para cada bug, explique o CUSTO DE OPORTUNIDADE em termos de negócio
6. Retorne APENAS JSON válido (sem markdown, sem explicações extras)

CRITÉRIOS DE SCORE (VALIDAÇÃO OBJETIVA NO CÓDIGO):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score Base: 100 pontos

DEDUÇÕES (apenas se AUSENTE no código):
- Sem skeleton/loading: -15 pontos
- Sem overflow-x-hidden: -25 pontos  
- Sem min-h-[48px] em botões: -20 pontos
- Sem fontSize: '14px' universal: -20 pontos
- Sem cores DNA (#7E57FF): -10 pontos
- Sem aria-labels: -10 pontos

APROVAÇÕES (se PRESENTE no código):
+ Skeleton implementado: APROVAR performance
+ overflow-x-hidden presente: APROVAR mobile
+ min-h-[48px] presente: APROVAR UX
+ fontSize ≥ 14px presente: APROVAR legibilidade
+ #7E57FF presente: APROVAR branding

ESTRUTURA DO JSON (OBRIGATÓRIA):
{
  "pagina": "${pageName}",
  "passou": boolean,
  "bugs_p0": ["APENAS se ausente: overflow-x-hidden, min-h-[48px], grid-cols-1", ...],
  "bugs_p1": ["APENAS se ausente: skeleton, fontSize ≥14px, aria-labels críticos", ...],
  "bugs_p2": ["APENAS se inconsistente: cores, borders, shadows", ...],
  "aprovado": ["Liste TUDO que ESTÁ CORRETO no código: skeleton presente, overflow-x-hidden OK, botões ≥48px, texto ≥14px, cores DNA, etc", ...],
  "score_geral": 100 - (bugs_p0×5 + bugs_p1×3 + bugs_p2×1),
  "tempo_estimado_fix": "Baseado em bugs REAIS encontrados",
  "recomendacao": "BETA READY se score ≥85 + 0 bugs P0 | BETA COM RESSALVAS se 70-84 | BLOQUEAR se <70",
  "prompt_correcao": "Corrigir APENAS bugs encontrados, não inventar problemas"
}

CÓDIGO DA PÁGINA ${pageName}:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${pageCode}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ATENÇÃO CRÍTICA:
1. Liste em "aprovado" TUDO que está CORRETO no código (≥50% deve ser aprovado)
2. Liste em "bugs" APENAS o que está OBJETIVAMENTE ausente
3. NÃO invente problemas - analise o código REAL
4. Se skeleton existe → score +15, se overflow-x-hidden existe → score +25
5. Score mínimo 65% para páginas com patterns básicos implementados

EXEMPLO DE APROVAÇÃO CORRETA:
Se o código tem:
- overflow-x-hidden ✅
- min-h-[48px] em botões ✅  
- fontSize: '14px' ✅
- isLoading skeleton ✅
- #7E57FF nos botões ✅

Então "aprovado" DEVE conter ≥5 itens e score DEVE ser ≥85%
    `;

    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          pagina: { type: "string" },
          passou: { type: "boolean" },
          bugs_p0: { type: "array", items: { type: "string" } },
          bugs_p1: { type: "array", items: { type: "string" } },
          bugs_p2: { type: "array", items: { type: "string" } },
          aprovado: { type: "array", items: { type: "string" } },
          score_geral: { type: "number" },
          tempo_estimado_fix: { type: "string" },
          recomendacao: { type: "string" },
          prompt_correcao: { type: "string" }
        }
      }
    });

    // Salvar auditoria
    await base44.asServiceRole.entities.AuditoriaUX.create({
      pagina: pageName,
      caminho: `pages/${pageName}.jsx`,
      prioridade: resultado.passou ? "baixa" : "critica",
      status_geral: resultado.recomendacao === "BETA READY" ? "aprovado" : "reprovado",
      problemas_identificados: [...resultado.bugs_p0, ...resultado.bugs_p1, ...resultado.bugs_p2],
      tempo_estimado_correcao: parseFloat(resultado.tempo_estimado_fix) || 0,
      data_auditoria: new Date().toISOString().split('T')[0],
      auditor: "AI Auditor",
      notas: JSON.stringify(resultado)
    });

    return Response.json(resultado);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});