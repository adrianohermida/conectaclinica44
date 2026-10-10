import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.clinica_id) {
      return Response.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { convite_id } = await req.json();

    if (!convite_id) {
      return Response.json({ error: 'convite_id obrigatório' }, { status: 400 });
    }

    // Buscar convite
    const convites = await base44.entities.ConviteUsuario.filter({ 
      id: convite_id,
      clinica_id: user.clinica_id
    });

    if (convites.length === 0) {
      return Response.json({ error: 'Convite não encontrado' }, { status: 404 });
    }

    const convite = convites[0];

    // Só pode cancelar se pendente
    if (convite.status !== 'pendente') {
      return Response.json({ error: 'Só é possível cancelar convites pendentes' }, { status: 400 });
    }

    // Atualizar para cancelado
    await base44.entities.ConviteUsuario.update(convite_id, {
      status: 'cancelado'
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Erro ao cancelar convite:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});