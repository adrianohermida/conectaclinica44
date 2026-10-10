import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.clinica_id) {
      return Response.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // BUSCAR USUÁRIOS POR VÍNCULOS (novo modelo)
    const vinculos = await base44.asServiceRole.entities.UsuarioClinica.filter({
      clinica_id: user.clinica_id,
      ativo: true
    });

    const usuariosVinculados = await Promise.all(
      vinculos.map(async (vinculo) => {
        const users = await base44.asServiceRole.entities.User.filter({ 
          email: vinculo.user_email 
        });
        
        const userData = users[0];
        if (!userData) return null;

        return {
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          cargo: vinculo.perfil,
          foto_url: userData.foto_url,
          vinculo_id: vinculo.id,
          data_entrada: vinculo.data_entrada
        };
      })
    );

    // BUSCAR USUÁRIOS PELO MODELO ANTIGO (clinica_id direto no User)
    const usuariosAntigos = await base44.asServiceRole.entities.User.filter({
      clinica_id: user.clinica_id
    });

    // Mapear usuários antigos
    const usuariosAntigosFormatados = usuariosAntigos.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      cargo: u.cargo || 'usuário',
      foto_url: u.foto_url,
      vinculo_id: null,
      data_entrada: u.created_date
    }));

    // MERGE: remover duplicatas (priorizar vínculo novo)
    const emailsComVinculo = usuariosVinculados.filter(u => u !== null).map(u => u.email);
    const usuariosFiltrados = usuariosAntigosFormatados.filter(
      u => !emailsComVinculo.includes(u.email)
    );

    const usuarios = [
      ...usuariosVinculados.filter(u => u !== null),
      ...usuariosFiltrados
    ];

    return Response.json({
      success: true,
      usuarios
    });

  } catch (error) {
    console.error('Erro ao listar equipe:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});