import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ENVIAR EMAIL CONFIRMAÇÃO AGENDAMENTO
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, nome, data, horario } = await req.json();

    await base44.asServiceRole.functions.invoke('enviarEmailTeste', {
      to: email,
      subject: '✅ Agendamento Confirmado',
      body: `
        <h2>Olá ${nome}!</h2>
        <p>Seu agendamento foi confirmado com sucesso:</p>
        <p><strong>Data:</strong> ${new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')}<br>
        <strong>Horário:</strong> ${horario}</p>
        <p>Aguardamos você!</p>
      `
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[enviarEmailConfirmacaoAgendamento] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});