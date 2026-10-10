import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * EXECUTA TESTE AUTOMATIZADO DE MÓDULO POR AGENTE
 * Agente analisa módulo, gera relatório brutal, registra achados críticos
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { modulo, agente_id, escopo } = await req.json();
    
    if (!modulo || !agente_id) {
      return Response.json({ 
        error: 'Módulo e agente_id são obrigatórios' 
      }, { status: 400 });
    }

    // Módulos testáveis
    const modulosValidos = [
      'Pacientes', 'Agenda', 'Prontuarios', 'Financeiro', 'Estoque',
      'PlanosTratamento', 'AnaliseDocumentosIA', 'JornadaPaciente',
      'DashboardCompleto', 'Produtos', 'Relatorios'
    ];

    if (!modulosValidos.includes(modulo)) {
      return Response.json({ 
        error: `Módulo inválido. Válidos: ${modulosValidos.join(', ')}` 
      }, { status: 400 });
    }

    // Prompts brutais por agente
    const promptsAgente = {
      qa_tester: `AUDITORIA TÉCNICA BRUTAL - Módulo ${modulo}

MISSÃO: Encontrar TODOS os bugs, edge cases e falhas críticas.

CONTEXTO:
- App healthcare (dados clínicos sensíveis)
- Multi-tenant com limites de plano
- Stripe para pagamento
- LGPD obrigatória

ÁREAS CRÍTICAS A TESTAR:
1. CRUD completo: Criar → Editar → Deletar → Validações
2. Edge cases: Dados vazios, strings longas, caracteres especiais, SQL injection
3. Limites de plano: O que acontece ao atingir limite?
4. Permissões: Admin vs User vs outro tenant
5. Performance: Latência com 1k, 10k, 100k registros
6. Mobile: Touch targets ≥44px, responsivo 320px-1024px
7. Acessibilidade: Screen reader, navegação por teclado
8. Erros de rede: Timeout, 500, conexão perdida

FORMATO DE RELATÓRIO:
{
  "severidade_geral": "CRÍTICO|ALTO|MÉDIO|BAIXO",
  "bugs_criticos": [
    {
      "titulo": "...",
      "passos_reproducao": [...],
      "impacto": "...",
      "severidade": "...",
      "prioridade_correcao": 1-5
    }
  ],
  "edge_cases_faltantes": [...],
  "problemas_performance": [...],
  "gaps_seguranca": [...],
  "score_qualidade": 0-100,
  "recomendacoes": [...],
  "bloqueadores_producao": [...]
}

SEJA IMPLACÁVEL. Zero suavização. Se pode quebrar em produção, APONTE AGORA.`,

      ux_validator: `AUDITORIA UX BRUTAL - Módulo ${modulo}

MISSÃO: Identificar TODAS as fricções que fazem médicos abandonarem o app.

JORNADA DO MÉDICO:
1. Primeiro acesso: Quanto tempo até VALOR real? (meta: <5min)
2. Uso diário: Quantos cliques/telas para completar tarefa comum?
3. Mobile: Médico usa em visita domiciliar? Funciona em tablet?
4. Curva de aprendizado: Intuitivo sem treinamento?

CRITÉRIOS BRUTAIS:
- Nomenclatura médica incorreta = REPROVADO
- >3 cliques para tarefa comum = RUIM
- Não funciona em mobile = CRÍTICO
- TTV >5min = PROBLEMA DE NEGÓCIO
- Contrast ratio <4.5:1 = INACESSÍVEL

FORMATO DE RELATÓRIO:
{
  "ttv_estimado": "Xmin",
  "cliques_tarefa_comum": X,
  "mobile_ready": true|false,
  "problemas_ux": [
    {
      "area": "...",
      "problema": "...",
      "impacto_usuario": "...",
      "solucao": "...",
      "prioridade": 1-5
    }
  ],
  "gaps_acessibilidade": [...],
  "nomenclatura_incorreta": [...],
  "score_usabilidade": 0-100,
  "taxa_abandono_estimada": "X%",
  "recomendacoes_priorizadas": [...]
}

SEM PIEDADE. Se médico vai travar, diga ONDE e POR QUÊ.`,

      performance_auditor: `AUDITORIA PERFORMANCE BRUTAL - Módulo ${modulo}

MISSÃO: Garantir P95 <200ms, zero gargalos em produção.

MÉTRICAS OBRIGATÓRIAS:
- Latência P50/P95/P99
- TTI (Time to Interactive) <5s
- FCP (First Contentful Paint) <2.5s
- Throughput (req/s)
- Taxa de erro <0.1%
- Uso de memória
- Bundle size <500KB

CENÁRIOS DE CARGA:
1. 10 usuários simultâneos
2. 100 usuários simultâneos
3. 1k registros no DB
4. 10k registros no DB
5. Conexão 3G (médico em área rural)

FORMATO DE RELATÓRIO:
{
  "latencia_p95_ms": X,
  "latencia_p99_ms": X,
  "tti_segundos": X,
  "fcp_segundos": X,
  "taxa_erro": "X%",
  "gargalos_identificados": [
    {
      "endpoint": "...",
      "problema": "...",
      "latencia_atual": "Xms",
      "meta": "<200ms",
      "solucao": "..."
    }
  ],
  "queries_n_plus_1": [...],
  "indices_faltantes": [...],
  "cache_oportunidades": [...],
  "bundle_analysis": {...},
  "score_performance": 0-100,
  "bloqueadores_scale": [...]
}

SEM DESCULPAS. Se não escala para 1k usuários, aponte AGORA.`,

      compliance_guard: `AUDITORIA LGPD/COMPLIANCE BRUTAL - Módulo ${modulo}

MISSÃO: Zero tolerância a vazamentos ou não conformidade.

CHECKLIST OBRIGATÓRIO:
1. Dados clínicos criptografados em repouso?
2. Logs de acesso (quem, quando, o quê)?
3. Consentimento explícito coletado?
4. Base legal definida (Art. 7º LGPD)?
5. Minimização de dados aplicada?
6. Segregação por tenant (multi-tenant seguro)?
7. Retenção de dados com expurgo automático?
8. ROPA (Registro de Operações) documentado?
9. DPIA (quando aplicável) realizado?
10. Incidentes: plano de resposta existente?

GAPS DE SEGURANÇA:
- SQL injection testado?
- XSS testado?
- CSRF tokens implementados?
- Rate limiting ativo?
- Secrets em .env (não hardcoded)?

FORMATO DE RELATÓRIO:
{
  "status_geral": "CONFORME|NÃO_CONFORME|RISCO_ALTO",
  "gaps_criticos": [
    {
      "artigo_lgpd": "...",
      "problema": "...",
      "risco": "...",
      "multa_potencial": "até 2% faturamento",
      "acao_corretiva": "..."
    }
  ],
  "vulnerabilidades_seguranca": [...],
  "dados_expostos": [...],
  "logs_auditoria": "OK|FALTANTE",
  "segregacao_tenant": "OK|VAZAMENTO",
  "score_compliance": 0-100,
  "bloqueadores_producao": [...],
  "prazo_regularizacao": "Xdias"
}

PARANOIA TOTAL. Um vazamento = R$ 50M de multa + morte da empresa.`,

      business_validator: `VALIDAÇÃO DE NEGÓCIO BRUTAL - Módulo ${modulo}

MISSÃO: Validar se esse módulo REALMENTE move métricas core.

PERGUNTAS OBRIGATÓRIAS:
1. Esse módulo foi PEDIDO por cliente pagante?
2. Sem ele, cliente cancela assinatura?
3. Ele reduz CAC ou aumenta LTV?
4. Há EVIDÊNCIA de uso (analytics)?
5. ROI: Custo de construção vs. receita gerada?

MÉTRICAS DE NEGÓCIO:
- Usuários ativos usando este módulo: X
- Frequência de uso (daily/weekly/monthly)
- Correlação com retenção (cohort)
- Impacto em NPS
- Receita atribuível
- Custo de suporte

FORMATO DE RELATÓRIO:
{
  "criterio_pmo": "CORE|IMPORTANTE|NICE_TO_HAVE|WASTE",
  "usuarios_ativos": X,
  "frequencia_uso": "...",
  "correlacao_retencao": "+X% | -X%",
  "receita_atribuivel": "R$ X/mês",
  "custo_manutencao": "R$ X/mês",
  "roi": "X:1",
  "evidencia_demanda": [
    "Cliente Y pediu",
    "Analytics mostra Z% uso",
    "NPS aumentou +X pts"
  ],
  "recomendacao": "PRIORIZAR|MANTER|CORTAR",
  "custo_oportunidade": "X horas dev = R$ Y não vendidos",
  "score_valor": 0-100,
  "decisao_brutal": "..."
}

SEM PIEDADE. Se não move métrica core = CORTA. Cada feature = oportunidade de vender perdida.`
    };

    const promptAgente = promptsAgente[agente_id];
    
    if (!promptAgente) {
      return Response.json({ 
        error: 'Agente não suportado' 
      }, { status: 400 });
    }

    // Buscar dados do módulo para análise
    const dadosModulo = await coletarDadosModulo(base44, modulo);

    // Invocar LLM com prompt brutal
    const analise = await base44.integrations.Core.InvokeLLM({
      prompt: `${promptAgente}

DADOS DO MÓDULO PARA ANÁLISE:
${JSON.stringify(dadosModulo, null, 2)}

${escopo ? `\nESCOPO ADICIONAL: ${escopo}` : ''}

Gere o relatório completo em JSON seguindo o formato especificado. SEJA BRUTALMENTE HONESTO.`,
      response_json_schema: gerarSchemaResposta(agente_id)
    });

    // Registrar resultado
    await base44.entities.ChecklistProjeto.create({
      modulo: modulo,
      funcionalidade: `Teste ${agente_id}`,
      categoria: mapearCategoria(agente_id),
      prioridade: analise.severidade_geral === 'CRÍTICO' ? 'critica' : 
                  analise.severidade_geral === 'ALTO' ? 'alta' : 'media',
      status: analise.bloqueadores_producao?.length > 0 ? 'bloqueado' : 'completo',
      percentual_completo: analise.score_qualidade || analise.score_usabilidade || 
                           analise.score_performance || analise.score_compliance || 
                           analise.score_valor || 0,
      observacoes: JSON.stringify(analise, null, 2),
      responsavel: agente_id,
      data_conclusao: new Date().toISOString()
    });

    // Atualizar sessão do agente
    const sessoes = await base44.entities.AgenteSessao.filter({ agente_id });
    if (sessoes.length > 0) {
      await base44.entities.AgenteSessao.update(sessoes[0].id, {
        total_interacoes: (sessoes[0].total_interacoes || 0) + 1,
        achados_criticos: (sessoes[0].achados_criticos || 0) + 
          (analise.bugs_criticos?.length || analise.gaps_criticos?.length || 0)
      });
    }

    return Response.json({
      status: 'success',
      modulo,
      agente_id,
      analise,
      resumo: {
        severidade: analise.severidade_geral || analise.status_geral || analise.criterio_pmo,
        score: analise.score_qualidade || analise.score_usabilidade || 
               analise.score_performance || analise.score_compliance || analise.score_valor,
        bloqueadores: analise.bloqueadores_producao?.length || 0,
        recomendacao: analise.recomendacao || analise.decisao_brutal
      }
    });

  } catch (error) {
    console.error('Erro ao executar teste:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});

async function coletarDadosModulo(base44, modulo) {
  const mapeamento = {
    'Pacientes': 'Paciente',
    'Agenda': 'Agendamento',
    'Prontuarios': 'Prontuario',
    'Financeiro': 'Venda',
    'Estoque': 'Medicamento',
    'PlanosTratamento': 'PlanoTratamento',
    'AnaliseDocumentosIA': 'DocumentoAnaliseIA',
    'JornadaPaciente': 'JornadaPaciente',
    'Produtos': 'Produto'
  };

  const entidade = mapeamento[modulo];
  if (!entidade) return { error: 'Módulo sem entidade mapeada' };

  try {
    const dados = await base44.asServiceRole.entities[entidade].list('-created_date', 100);
    return {
      total_registros: dados.length,
      amostra: dados.slice(0, 5),
      campos: dados.length > 0 ? Object.keys(dados[0]) : [],
      estatisticas: {
        created_last_7d: dados.filter(d => {
          const diff = Date.now() - new Date(d.created_date).getTime();
          return diff < 7 * 24 * 60 * 60 * 1000;
        }).length
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}

function gerarSchemaResposta(agente_id) {
  const schemas = {
    qa_tester: {
      type: "object",
      properties: {
        severidade_geral: { type: "string" },
        bugs_criticos: { type: "array", items: { type: "object" } },
        edge_cases_faltantes: { type: "array", items: { type: "string" } },
        problemas_performance: { type: "array", items: { type: "string" } },
        gaps_seguranca: { type: "array", items: { type: "string" } },
        score_qualidade: { type: "number" },
        recomendacoes: { type: "array", items: { type: "string" } },
        bloqueadores_producao: { type: "array", items: { type: "string" } }
      }
    },
    ux_validator: {
      type: "object",
      properties: {
        ttv_estimado: { type: "string" },
        cliques_tarefa_comum: { type: "number" },
        mobile_ready: { type: "boolean" },
        problemas_ux: { type: "array", items: { type: "object" } },
        gaps_acessibilidade: { type: "array", items: { type: "string" } },
        nomenclatura_incorreta: { type: "array", items: { type: "string" } },
        score_usabilidade: { type: "number" },
        taxa_abandono_estimada: { type: "string" },
        recomendacoes_priorizadas: { type: "array", items: { type: "string" } }
      }
    },
    performance_auditor: {
      type: "object",
      properties: {
        latencia_p95_ms: { type: "number" },
        latencia_p99_ms: { type: "number" },
        tti_segundos: { type: "number" },
        fcp_segundos: { type: "number" },
        taxa_erro: { type: "string" },
        gargalos_identificados: { type: "array", items: { type: "object" } },
        queries_n_plus_1: { type: "array", items: { type: "string" } },
        indices_faltantes: { type: "array", items: { type: "string" } },
        cache_oportunidades: { type: "array", items: { type: "string" } },
        score_performance: { type: "number" },
        bloqueadores_scale: { type: "array", items: { type: "string" } }
      }
    },
    compliance_guard: {
      type: "object",
      properties: {
        status_geral: { type: "string" },
        gaps_criticos: { type: "array", items: { type: "object" } },
        vulnerabilidades_seguranca: { type: "array", items: { type: "string" } },
        dados_expostos: { type: "array", items: { type: "string" } },
        logs_auditoria: { type: "string" },
        segregacao_tenant: { type: "string" },
        score_compliance: { type: "number" },
        bloqueadores_producao: { type: "array", items: { type: "string" } },
        prazo_regularizacao: { type: "string" }
      }
    },
    business_validator: {
      type: "object",
      properties: {
        criterio_pmo: { type: "string" },
        usuarios_ativos: { type: "number" },
        frequencia_uso: { type: "string" },
        correlacao_retencao: { type: "string" },
        receita_atribuivel: { type: "string" },
        custo_manutencao: { type: "string" },
        roi: { type: "string" },
        evidencia_demanda: { type: "array", items: { type: "string" } },
        recomendacao: { type: "string" },
        custo_oportunidade: { type: "string" },
        score_valor: { type: "number" },
        decisao_brutal: { type: "string" }
      }
    }
  };

  return schemas[agente_id];
}

function mapearCategoria(agente_id) {
  const mapa = {
    qa_tester: 'core',
    ux_validator: 'ux',
    performance_auditor: 'performance',
    compliance_guard: 'compliance',
    business_validator: 'monetizacao'
  };
  return mapa[agente_id] || 'core';
}