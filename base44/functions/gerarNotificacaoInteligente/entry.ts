import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { certidao_id, tipo_analise } = await req.json();

    if (!certidao_id) {
      return Response.json({ 
        error: 'certidao_id obrigatório' 
      }, { status: 400 });
    }

    // Buscar certidão e histórico
    const certidoes = await base44.asServiceRole.entities.CertidaoRegularidade.filter({ id: certidao_id });
    
    if (certidoes.length === 0) {
      return Response.json({ error: 'Certidão não encontrada' }, { status: 404 });
    }

    const certidao = certidoes[0];
    const historico = await base44.asServiceRole.entities.HistoricoCertidao.filter({ certidao_id: certidao_id });
    const agendamentos = await base44.asServiceRole.entities.AgendamentoConsulta.filter({ certidao_id: certidao_id });

    let prompt = '';
    let schema = {};

    switch (tipo_analise) {
      case 'prever_vencimento':
        prompt = `
          Analise o histórico de renovações desta certidão e preveja quando deve ser iniciado o processo de renovação.
          
          Certidão: ${certidao.titulo}
          Órgão: ${certidao.orgao_emissor}
          Última validade: ${certidao.data_validade}
          Histórico de renovações: ${JSON.stringify(historico)}
          
          Com base no histórico, determine:
          1. Quantos dias antes do vencimento deve iniciar o processo
          2. Se há algum padrão de atrasos ou dificuldades
          3. Recomendações específicas para este órgão emissor
        `;
        schema = {
          type: "object",
          properties: {
            dias_recomendados_antecedencia: { type: "number" },
            nivel_complexidade: { type: "string", enum: ["baixa", "media", "alta"] },
            recomendacao: { type: "string" },
            acoes_sugeridas: { type: "array", items: { type: "string" } }
          }
        };
        break;

      case 'resumir_observacoes':
        prompt = `
          Resuma e destaque os pontos mais importantes das observações desta certidão:
          
          ${certidao.observacoes}
          
          Destaque:
          1. Informações críticas ou alertas
          2. Prazos importantes
          3. Documentos ou processos mencionados
          4. Qualquer irregularidade ou pendência
        `;
        schema = {
          type: "object",
          properties: {
            resumo: { type: "string" },
            pontos_criticos: { type: "array", items: { type: "string" } },
            alertas: { type: "array", items: { type: "string" } },
            proximos_passos: { type: "array", items: { type: "string" } }
          }
        };
        break;

      case 'analise_risco':
        prompt = `
          Analise o risco de compliance desta certidão:
          
          Certidão: ${certidao.titulo}
          Categoria: ${certidao.categoria}
          Validade: ${certidao.data_validade}
          Status: ${certidao.status}
          Resultado: ${certidao.resultado}
          Histórico: ${historico.length} renovações
          Consulta automática: ${certidao.consulta_automatica ? 'Sim' : 'Não'}
          
          Avalie:
          1. Risco atual de não conformidade
          2. Impacto se esta certidão vencer
          3. Urgência de ação
        `;
        schema = {
          type: "object",
          properties: {
            nivel_risco: { type: "string", enum: ["baixo", "medio", "alto", "critico"] },
            impacto: { type: "string" },
            urgencia: { type: "string" },
            recomendacoes: { type: "array", items: { type: "string" } },
            prazo_acao: { type: "number" }
          }
        };
        break;

      default:
        return Response.json({ error: 'Tipo de análise inválido' }, { status: 400 });
    }

    // Invocar LLM
    const analise = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: schema
    });

    return Response.json({
      success: true,
      tipo_analise: tipo_analise,
      analise: analise,
      certidao_id: certidao_id
    });

  } catch (error) {
    console.error('Erro ao gerar notificação inteligente:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});