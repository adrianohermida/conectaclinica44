import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmail } from './services/emailService.js';

/**
 * SPRINT 2: Notificar paciente quando prontuário concluído
 * Trigger: status prontuário = "concluído"
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prontuario_id } = await req.json();
    const prontuario = await base44.entities.Prontuario.filter({ id: prontuario_id })[0];
    
    if (!prontuario) {
      return Response.json({ error: 'Prontuário não encontrado' }, { status: 404 });
    }

    const paciente = await base44.entities.Contato.filter({ id: prontuario.paciente_id })[0];
    const medico = await base44.entities.User.filter({ id: prontuario.created_by })[0];
    const clinica = await base44.entities.Clinica.filter({ id: user.clinica_id })[0];

    if (!paciente?.email) {
      return Response.json({ error: 'Paciente sem email' }, { status: 400 });
    }

    const resultado = await enviarEmail({
      tipo: 'prontuario_pronto',
      para: paciente.email,
      assunto: `Prontuário disponível - ${clinica.nome}`,
      variaveis: {
        paciente_nome: paciente.nome,
        clinica_nome: clinica.nome,
        medico_nome: medico?.full_name || 'Médico',
        data_consulta: new Date(prontuario.data_consulta || prontuario.created_date).toLocaleDateString('pt-BR'),
        resumo: prontuario.queixa_principal?.substring(0, 150) || 'Consulta concluída',
        link_portal: `https://app.conectaclinica.com.br/portal/prontuarios/${prontuario.id}`
      }
    });

    return Response.json(resultado);
  } catch (error) {
    console.error('[NotificarProntuario] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});