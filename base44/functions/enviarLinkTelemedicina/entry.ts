import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmailSendGrid } from './services/emailService.js';

/**
 * Envia link sala telemedicina 15min antes consulta
 * Input: { agendamento_id }
 * Chamado por: Cron ou trigger manual
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { agendamento_id } = await req.json();

    if (!agendamento_id) {
      return Response.json({ error: 'agendamento_id obrigatório' }, { status: 400 });
    }

    // 1. Buscar agendamento
    const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({ 
      id: agendamento_id 
    });

    if (agendamentos.length === 0) {
      return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const agend = agendamentos[0];

    if (agend.tipo_consulta !== 'telemedicina') {
      return Response.json({ error: 'Agendamento não é telemedicina' }, { status: 400 });
    }

    // 2. Buscar paciente
    const contatos = await base44.asServiceRole.entities.Contato.filter({
      id: agend.paciente_id,
      clinica_id: agend.clinica_id
    });

    let emailPaciente = null;
    let nomePaciente = agend.paciente_nome;

    if (contatos.length > 0) {
      emailPaciente = contatos[0].emails?.[0]?.email || contatos[0].email;
    } else {
      // Fallback Paciente
      const pacientes = await base44.asServiceRole.entities.Paciente.filter({ id: agend.paciente_id });
      if (pacientes.length > 0) {
        emailPaciente = pacientes[0].email;
      }
    }

    if (!emailPaciente) {
      return Response.json({ error: 'Email paciente não encontrado' }, { status: 404 });
    }

    // 3. Gerar/buscar link sala (se não existe, criar)
    let linkSala = agend.link_telemedicina;
    
    if (!linkSala) {
      // Gerar link único (exemplo - integrar com sua plataforma de vídeo)
      const salaId = crypto.randomUUID();
      linkSala = `https://meet.conectaclinica.com.br/${salaId}`;
      
      await base44.asServiceRole.entities.Agendamento.update(agend.id, {
        link_telemedicina: linkSala
      });
    }

    // 4. Buscar clínica
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: agend.clinica_id });
    const clinica = clinicas[0] || { nome: 'Clínica' };

    // 5. Enviar email via SendGrid
    await enviarEmailSendGrid({
      base44,
      clinica_id: agend.clinica_id,
      template_tipo: 'link_telemedicina',
      destinatario: emailPaciente,
      vars: {
        paciente_nome: nomePaciente,
        data: new Date(agend.data).toLocaleDateString('pt-BR'),
        horario: agend.horario,
        medico: agend.medico || 'Não definido',
        especialidade: agend.especialidade || '',
        link_sala: linkSala,
        clinica_nome: clinica.nome,
        instrucoes: 'Clique no botão abaixo 5 minutos antes do horário marcado'
      }
    });

    console.log(`[Telemedicina] Link enviado para ${emailPaciente}, agendamento: ${agend.id}`);

    return Response.json({ 
      success: true,
      link_sala: linkSala,
      destinatario: emailPaciente
    });

  } catch (error) {
    console.error('[Telemedicina] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});