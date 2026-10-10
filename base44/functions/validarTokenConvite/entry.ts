import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ valido: false, mensagem: 'Token não fornecido' });
    }

    const convites = await base44.asServiceRole.entities.ConviteUsuario.filter({ token });
    
    if (convites.length === 0) {
      return Response.json({ valido: false, mensagem: 'Convite não encontrado' });
    }

    const convite = convites[0];

    // Verificar se já foi aceito
    if (convite.status === 'aceito') {
      return Response.json({ valido: false, mensagem: 'Convite já foi aceito' });
    }

    // Verificar se expirou
    if (new Date(convite.data_expiracao) < new Date()) {
      await base44.asServiceRole.entities.ConviteUsuario.update(convite.id, { status: 'expirado' });
      return Response.json({ valido: false, mensagem: 'Convite expirado' });
    }

    return Response.json({
      valido: true,
      convite: {
        id: convite.id,
        clinica_nome: convite.clinica_nome,
        email_convidado: convite.email_convidado,
        perfil_atribuido: convite.perfil_atribuido
      }
    });

  } catch (error) {
    console.error('[validarTokenConvite] Erro:', error);
    return Response.json({ valido: false, mensagem: error.message }, { status: 500 });
  }
});