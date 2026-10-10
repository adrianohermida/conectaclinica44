import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmailSendGrid } from './services/emailService.js';

/**
 * SPRINT 2: Notificar médicos @mencionados em discussão
 * Trigger: ColaboracaoMedica criada com campo "medicos_mencionados"
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { colaboracao_id } = await req.json();

    // Buscar colaboração
    const colaboracoes = await base44.entities.ColaboracaoMedica.filter({ id: colaboracao_id });
    if (colaboracoes.length === 0) {
      return Response.json({ error: 'Colaboração não encontrada' }, { status: 404 });
    }

    const colaboracao = colaboracoes[0];
    const mencionados = colaboracao.medicos_mencionados || [];

    if (mencionados.length === 0) {
      return Response.json({ success: true, enviados: 0, detalhes: 'Sem mencionados' });
    }

    // Buscar dados do autor
    const autor = await base44.entities.User.filter({ id: colaboracao.created_by })[0];
    const clinica = await base44.entities.Clinica.filter({ id: user.clinica_id })[0];

    // Buscar paciente relacionado
    const paciente = colaboracao.paciente_id ? 
      await base44.entities.Contato.filter({ id: colaboracao.paciente_id })[0] : null;

    const enviados = [];

    for (const medicoEmail of mencionados) {
      await enviarEmailSendGrid({
        base44,
        clinica_id: user.clinica_id,
        template_tipo: 'colaboracao_mencionado',
        destinatario: medicoEmail,
        vars: {
          medico_nome: medicoEmail.split('@')[0],
          autor_nome: autor?.full_name || 'Colega',
          tipo_colaboracao: colaboracao.tipo || 'Discussão de caso',
          paciente_nome: paciente?.nome || 'Paciente',
          mensagem_resumo: (colaboracao.mensagem || '').substring(0, 200) + '...',
          link_discussao: `https://app.conectaclinica.com.br/colaboracao/${colaboracao_id}`,
          clinica_nome: clinica?.nome || 'ConectaClínica'
        }
      });

      enviados.push(medicoEmail);
    }

    return Response.json({
      success: true,
      total_mencionados: mencionados.length,
      enviados: enviados.length,
      detalhes: enviados
    });

  } catch (error) {
    console.error('[NotificarColaboracao] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});