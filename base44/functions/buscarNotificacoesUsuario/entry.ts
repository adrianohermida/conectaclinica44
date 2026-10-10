import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * BUSCAR NOTIFICAÇÕES DO USUÁRIO
 * - Filtra por clinica_id E destinatario_id
 * - Paginação e ordenação
 * - Multi-tenant seguro
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { apenas_nao_lidas, limit } = await req.json();

    // QUERY SEGURA: clinica_id AND destinatario_id
    const todasMsgs = await base44.entities.MensagemInterna.filter({
      clinica_id: user.clinica_id,
      destinatario_id: user.id
    }, '-created_date', limit || 50);

    let notificacoes = todasMsgs;
    
    if (apenas_nao_lidas) {
      notificacoes = notificacoes.filter(n => !n.lida);
    }

    return Response.json({
      success: true,
      notificacoes,
      total: notificacoes.length,
      nao_lidas: notificacoes.filter(n => !n.lida).length
    });

  } catch (error) {
    console.error('❌ Erro buscar notificações:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});