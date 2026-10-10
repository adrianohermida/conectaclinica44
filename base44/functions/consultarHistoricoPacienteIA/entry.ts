import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FASE 4: IA CONSULTA HISTÓRICO PRONTUÁRIOS
 * Permissão: apenas médico/admin
 * LGPD: log auditoria obrigatório
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // PERMISSÃO: apenas médico/admin (FASE 4 - requisito)
    const medicos = await base44.entities.Medico.filter({ email: user.email, clinica_id: user.clinica_id });
    const isMedico = medicos.length > 0;
    const isAdmin = user.role === 'admin';

    if (!isMedico && !isAdmin) {
      return Response.json({ error: 'Acesso negado. Apenas médicos/admins.' }, { status: 403 });
    }

    const { contato_id, pergunta, conversation_id } = await req.json();

    if (!contato_id || !pergunta) {
      return Response.json({ error: 'contato_id e pergunta obrigatórios' }, { status: 400 });
    }

    console.log(`[HistoricoIA] Consultando: "${pergunta}" para contato ${contato_id}`);

    // Buscar contato
    const contatos = await base44.entities.Contato.filter({ id: contato_id });
    if (!contatos.length) {
      return Response.json({ error: 'Contato não encontrado' }, { status: 404 });
    }
    const contato = contatos[0];

    // Buscar prontuários do paciente
    const prontuarios = await base44.entities.Prontuario.filter({
      clinica_id: user.clinica_id,
      contato_id: contato_id
    }, '-created_date', 10);

    // Buscar agendamentos
    const agendamentos = await base44.entities.Agendamento.filter({
      clinica_id: user.clinica_id,
      contato_id: contato_id
    }, '-data_consulta', 5);

    // Contexto para IA
    const contexto = `
PACIENTE: ${contato.nome_completo}
CPF: ${contato.cpf || 'N/A'}
Data Nascimento: ${contato.data_nascimento || 'N/A'}
Convênio: ${contato.convenio || 'Particular'}

HISTÓRICO DE CONSULTAS (${agendamentos.length}):
${agendamentos.map((a, i) => 
  `${i+1}. ${new Date(a.data_consulta).toLocaleDateString('pt-BR')} - ${a.tipo_consulta || 'Consulta'} - Status: ${a.status}`
).join('\n')}

PRONTUÁRIOS (${prontuarios.length}):
${prontuarios.map((p, i) => 
  `${i+1}. ${new Date(p.created_date).toLocaleDateString('pt-BR')}
   Médico: ${p.medico_nome || 'N/A'}
   Queixa: ${p.queixa_principal || 'N/A'}
   Diagnóstico: ${p.diagnostico || 'N/A'}
   Conduta: ${p.conduta || 'N/A'}
   ${p.observacoes ? `Obs: ${p.observacoes}` : ''}`
).join('\n\n')}

ALERGIAS: ${contato.alergias?.join(', ') || 'Nenhuma registrada'}
MEDICAMENTOS EM USO: ${contato.medicamentos_uso?.join(', ') || 'Nenhum'}
`;

    // IA processa pergunta
    const resposta = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é assistente médico. Responda a pergunta abaixo usando APENAS o histórico fornecido.

HISTÓRICO CLÍNICO:
${contexto}

PERGUNTA: ${pergunta}

REGRAS:
1. Use apenas dados do histórico acima
2. Se não souber, diga "não encontrei essa informação no histórico"
3. Seja preciso e objetivo (máximo 3 parágrafos)
4. Inclua datas quando relevante
5. NUNCA invente informações médicas

RESPOSTA:`,
      add_context_from_internet: false
    });

    // LOG LGPD OBRIGATÓRIO (FASE 4 - auditoria)
    await base44.entities.LogAcessoDado.create({
      clinica_id: user.clinica_id,
      usuario_id: user.id,
      usuario_email: user.email,
      entidade: 'Prontuario',
      registro_id: contato_id,
      tipo_acesso: 'consulta_ia',
      finalidade: 'assistencia_clinica_ia',
      base_legal: 'execucao_contrato',
      dados_acessados: ['prontuarios', 'agendamentos', 'historico_medico'],
      contexto: `IA consultou histórico via pergunta: ${pergunta.slice(0, 100)}`,
      ip_origem: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent')
    });

    console.log('[HistoricoIA] Resposta gerada + log LGPD criado');

    return Response.json({
      success: true,
      resposta: resposta,
      contexto_usado: {
        total_prontuarios: prontuarios.length,
        total_consultas: agendamentos.length,
        paciente: contato.nome_completo
      }
    });

  } catch (error) {
    console.error('[HistoricoIA] Erro:', error);
    return Response.json({ 
      error: error.message,
      resposta: 'Erro ao consultar histórico. Tente novamente.'
    }, { status: 500 });
  }
});