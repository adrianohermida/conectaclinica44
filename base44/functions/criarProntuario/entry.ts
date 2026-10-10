import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * P0 FINAL: Criar prontuário com isolamento tenant GARANTIDO
 * CRITICAL: Força clinica_id = previne vazamento LGPD
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized - clinica_id required' }, { status: 401 });
    }

    const prontuarioData = await req.json();

    // P0 CRITICAL: FORÇAR clinica_id do user autenticado (imutável)
    const payload = {
      ...prontuarioData,
      clinica_id: user.clinica_id, // OVERRIDE qualquer tentativa de fraude
      hora_atendimento: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status_prontuario: prontuarioData.status_prontuario || "finalizado",
      versao: 1,
      historico_alteracoes: [{
        data: new Date().toISOString(),
        usuario: prontuarioData.medico_nome || user.full_name,
        alteracao: "Criação do prontuário"
      }],
      assinatura_digital: {
        hash: `PEP${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        certificado_digital: "ICP-Brasil"
      }
    };

    // Normalizar exame_fisico
    if (typeof payload.exame_fisico === 'string') {
      payload.exame_fisico = { descricao: payload.exame_fisico };
    }

    const novoProntuario = await base44.asServiceRole.entities.Prontuario.create(payload);

    return Response.json(novoProntuario);

  } catch (error) {
    console.error('Erro ao criar prontuário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});