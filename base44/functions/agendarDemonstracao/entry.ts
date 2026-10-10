import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { 
      nome, 
      email, 
      telefone, 
      empresa, 
      data_preferencia, 
      horario_preferencia, 
      observacoes 
    } = await req.json();

    // Validação
    if (!nome || !email || !data_preferencia || !horario_preferencia) {
      return Response.json({ 
        error: 'Campos obrigatórios: nome, email, data_preferencia, horario_preferencia' 
      }, { status: 400 });
    }

    // 1. Criar/atualizar lead
    const leadsExistentes = await base44.asServiceRole.entities.LeadSite.filter({ email });
    let lead_id;
    
    if (leadsExistentes.length > 0) {
      await base44.asServiceRole.entities.LeadSite.update(leadsExistentes[0].id, {
        nome,
        telefone: telefone || leadsExistentes[0].telefone,
        empresa: empresa || leadsExistentes[0].empresa,
        status: 'agendamento_confirmado',
        data_agendamento: `${data_preferencia}T${horario_preferencia}:00`
      });
      lead_id = leadsExistentes[0].id;
    } else {
      const novoLead = await base44.asServiceRole.entities.LeadSite.create({
        origem: 'widget_chat_ia',
        status: 'agendamento_confirmado',
        nome,
        email,
        telefone,
        empresa,
        data_agendamento: `${data_preferencia}T${horario_preferencia}:00`
      });
      lead_id = novoLead.id;
    }

    // 2. Criar agendamento
    const agendamento = await base44.asServiceRole.entities.AgendamentoOnline.create({
      nome_completo: nome,
      email,
      telefone,
      empresa,
      data_preferencia,
      horario_preferencia,
      tipo_agendamento: 'demonstracao',
      observacoes,
      status: 'confirmado',
      origem: 'widget_chat_ia'
    });

    // 3. Email confirmação cliente
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: '🎉 Demonstração Agendada - ConectaClínica',
        body: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7E57FF;">Olá, ${nome}!</h2>
            <p>Sua demonstração foi agendada com sucesso:</p>
            <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>📅 Data:</strong> ${new Date(data_preferencia).toLocaleDateString('pt-BR')}</p>
              <p style="margin: 10px 0;"><strong>🕐 Horário:</strong> ${horario_preferencia}</p>
              ${empresa ? `<p style="margin: 0;"><strong>🏥 Clínica:</strong> ${empresa}</p>` : ''}
            </div>
            <p>Nossa equipe entrará em contato nos próximos minutos para confirmar e enviar o link da reunião.</p>
            <p style="color: #666; font-size: 14px;">Até breve! 🚀</p>
          </div>
        `
      });
    } catch (e) {
      console.error('Email cliente falhou:', e);
    }

    // 4. Notificar equipe vendas
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'vendas@conectaclinica.com.br',
        subject: `🔥 Nova Demo Agendada - ${nome}`,
        body: `
          <h2>Nova Demonstração Agendada via IA</h2>
          <ul>
            <li><strong>Nome:</strong> ${nome}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Telefone:</strong> ${telefone || 'Não informado'}</li>
            <li><strong>Empresa:</strong> ${empresa || 'Não informado'}</li>
            <li><strong>Data:</strong> ${new Date(data_preferencia).toLocaleDateString('pt-BR')} às ${horario_preferencia}</li>
            <li><strong>Observações:</strong> ${observacoes || 'Nenhuma'}</li>
            <li><strong>Lead ID:</strong> ${lead_id}</li>
          </ul>
          <p><strong>Ação:</strong> Enviar link Google Meet/Zoom e confirmar presença.</p>
        `
      });
    } catch (e) {
      console.error('Notificação vendas falhou:', e);
    }

    return Response.json({ 
      success: true, 
      agendamento_id: agendamento.id,
      lead_id,
      mensagem: `✅ Demo agendada para ${new Date(data_preferencia).toLocaleDateString('pt-BR')} às ${horario_preferencia}! Você receberá email de confirmação agora.`
    });

  } catch (error) {
    console.error('Erro agendarDemonstracao:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});