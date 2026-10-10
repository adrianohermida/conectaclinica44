import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FASE 4: BUSCA SEMÂNTICA EM PRONTUÁRIOS
 * Usa embeddings para busca contextual
 * Exemplo: "pacientes com diabetes" → busca em diagnósticos
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar permissão médico/admin
    const medicos = await base44.entities.Medico.filter({ email: user.email, clinica_id: user.clinica_id });
    if (medicos.length === 0 && user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas médicos/admins.' }, { status: 403 });
    }

    const { query_texto, limite = 10 } = await req.json();

    if (!query_texto) {
      return Response.json({ error: 'query_texto obrigatório' }, { status: 400 });
    }

    console.log(`[BuscaSemantica] Query: "${query_texto}"`);

    // FASE 4: Busca simples via LLM (embeddings seria ideal, mas InvokeLLM resolve)
    // Buscar todos prontuários da clínica
    const todosProntuarios = await base44.entities.Prontuario.filter({
      clinica_id: user.clinica_id
    }, '-created_date', 100);

    // IA extrai prontuários relevantes
    const contextoCompleto = todosProntuarios.map(p => 
      `ID: ${p.id}
Paciente: ${p.paciente_nome}
Data: ${new Date(p.created_date).toLocaleDateString('pt-BR')}
Queixa: ${p.queixa_principal || 'N/A'}
Diagnóstico: ${p.diagnostico || 'N/A'}
Conduta: ${p.conduta || 'N/A'}
---`
    ).join('\n\n');

    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é um assistente de busca médica. Analise os prontuários abaixo e retorne os IDs dos mais relevantes para a query.

QUERY: "${query_texto}"

PRONTUÁRIOS:
${contextoCompleto}

INSTRUÇÕES:
1. Retorne apenas os IDs dos prontuários mais relevantes (máximo ${limite})
2. Ordene por relevância (mais relevante primeiro)
3. Se nenhum for relevante, retorne array vazio

Retorne JSON:`,
      response_json_schema: {
        type: "object",
        properties: {
          prontuario_ids: { 
            type: "array", 
            items: { type: "string" },
            description: "IDs dos prontuários relevantes"
          },
          resumo: {
            type: "string",
            description: "Resumo dos achados"
          }
        }
      }
    });

    const prontuariosRelevantes = todosProntuarios.filter(p => 
      resultado.prontuario_ids.includes(p.id)
    );

    // LOG LGPD
    await base44.entities.LogAcessoDado.create({
      clinica_id: user.clinica_id,
      usuario_id: user.id,
      usuario_email: user.email,
      entidade: 'Prontuario',
      tipo_acesso: 'busca_semantica_ia',
      finalidade: 'assistencia_clinica_ia',
      base_legal: 'interesse_legitimo',
      dados_acessados: ['prontuarios_multiplos'],
      contexto: `Busca semântica: ${query_texto}`,
      ip_origem: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent')
    });

    return Response.json({
      success: true,
      total_encontrados: prontuariosRelevantes.length,
      prontuarios: prontuariosRelevantes.map(p => ({
        id: p.id,
        paciente_nome: p.paciente_nome,
        data: p.created_date,
        queixa: p.queixa_principal,
        diagnostico: p.diagnostico
      })),
      resumo: resultado.resumo
    });

  } catch (error) {
    console.error('[BuscaSemantica] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});