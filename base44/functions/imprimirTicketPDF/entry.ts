import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Gera PDF de ticket com thread completa
 * Para impressão, arquivo, ou envio ao cliente
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticket_id } = await req.json();

    if (!ticket_id) {
      return Response.json({ error: 'ticket_id obrigatório' }, { status: 400 });
    }

    // Buscar ticket
    const tickets = await base44.entities.Ticket.filter({ id: ticket_id });
    if (!tickets.length) {
      return Response.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }

    const ticket = tickets[0];

    // Multi-tenant validation
    if (user.role !== 'admin' && ticket.clinica_id !== user.clinica_id) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar mensagens
    const mensagens = await base44.entities.MensagemTicket.filter(
      { ticket_id: ticket.id },
      'created_date'
    );

    // Buscar notas internas
    const notas = await base44.entities.NotaInterna.filter(
      { ticket_id: ticket.id },
      'created_date'
    ).catch(() => []);

    // HTML para PDF (simples e legível)
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #202124; }
    .header { border-bottom: 3px solid #7E57FF; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; color: #202124; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; }
    .meta-item { font-size: 13px; }
    .meta-label { color: #5f6368; font-weight: 500; }
    .meta-value { color: #202124; margin-top: 3px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-right: 8px; }
    .badge-status { background: #e6f7ed; color: #137333; }
    .badge-priority { background: #fef9e5; color: #854d0e; }
    .mensagem { margin: 20px 0; padding: 15px; border-radius: 8px; background: #f8f9fa; border-left: 3px solid #e8eaed; }
    .mensagem-equipe { background: #f5f3ff; border-left-color: #7E57FF; }
    .mensagem-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .remetente { font-weight: 600; color: #202124; }
    .timestamp { font-size: 11px; color: #5f6368; }
    .conteudo { font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
    .nota-interna { background: #fff3cd; border-left-color: #fbbc04; margin: 15px 0; padding: 12px; border-radius: 6px; }
    .nota-header { font-weight: 600; color: #854d0e; margin-bottom: 8px; font-size: 12px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8eaed; font-size: 11px; color: #9aa0a6; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${ticket.assunto}</h1>
    <div style="margin: 10px 0;">
      <span class="badge badge-status">${ticket.status}</span>
      <span class="badge badge-priority">${ticket.prioridade}</span>
      ${ticket.categoria ? `<span class="badge" style="background:#e8f0fe;color:#1a73e8">${ticket.categoria}</span>` : ''}
    </div>
    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">Número</div>
        <div class="meta-value">${ticket.numero_ticket || ticket.id.slice(0, 8)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Solicitante</div>
        <div class="meta-value">${ticket.solicitante_nome}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Canal</div>
        <div class="meta-value">${ticket.canal}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Criado em</div>
        <div class="meta-value">${new Date(ticket.created_date).toLocaleString('pt-BR')}</div>
      </div>
      ${ticket.atribuido_nome ? `
      <div class="meta-item">
        <div class="meta-label">Responsável</div>
        <div class="meta-value">${ticket.atribuido_nome}</div>
      </div>` : ''}
      ${ticket.tempo_primeira_resposta ? `
      <div class="meta-item">
        <div class="meta-label">Tempo 1ª Resposta</div>
        <div class="meta-value">${ticket.tempo_primeira_resposta} min</div>
      </div>` : ''}
    </div>
  </div>

  <h2 style="font-size:16px;margin:30px 0 15px 0;color:#5f6368">Histórico de Mensagens</h2>
  ${mensagens.map(m => `
  <div class="mensagem ${m.remetente_tipo === 'equipe' ? 'mensagem-equipe' : ''}">
    <div class="mensagem-header">
      <span class="remetente">${m.remetente_nome}</span>
      <span class="timestamp">${new Date(m.created_date).toLocaleString('pt-BR')}</span>
    </div>
    <div class="conteudo">${m.conteudo}</div>
  </div>
  `).join('')}

  ${notas.length > 0 ? `
  <h2 style="font-size:16px;margin:30px 0 15px 0;color:#5f6368">Notas Internas</h2>
  ${notas.map(n => `
  <div class="nota-interna">
    <div class="nota-header">
      ${n.autor_nome} - ${new Date(n.created_date).toLocaleString('pt-BR')}
    </div>
    <div class="conteudo" style="font-size:13px">${n.conteudo}</div>
  </div>
  `).join('')}
  ` : ''}

  <div class="footer">
    Relatório gerado em ${new Date().toLocaleString('pt-BR')} via ConectaClínica
  </div>
</body>
</html>
    `.trim();

    // Retornar HTML (browser converte para PDF via print)
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="ticket-${ticket.numero_ticket || ticket.id.slice(0, 8)}.html"`
      }
    });

  } catch (error) {
    console.error('Erro imprimirTicketPDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});