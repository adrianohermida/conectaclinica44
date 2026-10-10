import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ENVIAR LEMBRETES - Endpoint HTTP
 * Busca agendamentos de amanhã e envia lembretes por email
 * 
 * DEPLOY: Configurar CRON separado chamando este endpoint
 * Payload opcional: { data_alvo: "2025-01-10" } (default = amanhã)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Service role auth - não requer user logado
    let payload = {};
    try {
      payload = await req.json();
    } catch {
      // Payload vazio OK
    }

    // Data alvo (default = amanhã)
    let dataAlvo;
    if (payload.data_alvo) {
      dataAlvo = payload.data_alvo;
    } else {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      dataAlvo = amanha.toISOString().split('T')[0];
    }

    console.log(`📅 Buscando agendamentos para: ${dataAlvo}`);

    // Buscar agendamentos
    const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
      data: dataAlvo,
      status: { $in: ['agendado', 'confirmado'] }
    });

    console.log(`🔍 Encontrados ${agendamentos.length} agendamentos`);

    let enviados = 0;
    let erros = 0;
    let semEmail = 0;

    for (const agendamento of agendamentos) {
      try {
        // Buscar email paciente
        let pacienteEmail = null;
        if (agendamento.paciente_id) {
          const contatos = await base44.asServiceRole.entities.Contato.filter({
            id: agendamento.paciente_id
          });
          if (contatos.length > 0 && contatos[0].email) {
            pacienteEmail = contatos[0].email;
          }
        }

        if (!pacienteEmail) {
          console.log(`⚠️ Sem email: ${agendamento.paciente_nome}`);
          semEmail++;
          continue;
        }

        // Template padrão
        let corpo = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7E57FF;">🩺 Lembrete de Consulta</h2>
            <p>Olá, <strong>${agendamento.paciente_nome}</strong>!</p>
            <p>Lembrete da sua consulta <strong>amanhã</strong>:</p>
            <div style="background: #f5f3ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <p><strong>📅 Data:</strong> ${new Date(agendamento.data).toLocaleDateString('pt-BR')}</p>
              <p><strong>🕐 Horário:</strong> ${agendamento.horario}</p>
              ${agendamento.medico ? `<p><strong>👨‍⚕️ Médico:</strong> Dr(a). ${agendamento.medico}</p>` : ''}
              <p><strong>📍 Tipo:</strong> ${agendamento.tipo_consulta === 'presencial' ? 'Presencial' : 'Telemedicina'}</p>
            </div>
            <p>Chegue 10 minutos antes do horário.</p>
          </div>
        `;

        // Buscar template customizado (se existir)
        const templates = await base44.asServiceRole.entities.EmailTemplate.filter({
          clinica_id: agendamento.clinica_id,
          tipo: 'lembrete_consulta',
          ativo: true
        });

        if (templates.length > 0) {
          corpo = templates[0].corpo_html
            .replace(/\{\{paciente_nome\}\}/g, agendamento.paciente_nome)
            .replace(/\{\{medico_nome\}\}/g, agendamento.medico || '')
            .replace(/\{\{data\}\}/g, new Date(agendamento.data).toLocaleDateString('pt-BR'))
            .replace(/\{\{horario\}\}/g, agendamento.horario)
            .replace(/\{\{tipo_consulta\}\}/g, agendamento.tipo_consulta === 'presencial' ? 'Presencial' : 'Telemedicina')
            .replace(/\{\{especialidade\}\}/g, agendamento.especialidade || '');
        }

        // Enviar email
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: pacienteEmail,
          subject: "🩺 Lembrete: Consulta amanhã - ConectaClínica",
          body: corpo
        });

        console.log(`✅ Email enviado: ${pacienteEmail}`);
        enviados++;

      } catch (error) {
        console.error(`❌ Erro agendamento ${agendamento.id}:`, error.message);
        erros++;
      }
    }

    console.log(`📊 Resumo: ${enviados} enviados, ${semEmail} sem email, ${erros} erros`);

    return Response.json({
      success: true,
      data_alvo: dataAlvo,
      total_agendamentos: agendamentos.length,
      emails_enviados: enviados,
      sem_email: semEmail,
      erros
    });

  } catch (error) {
    console.error('💥 Erro crítico:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});