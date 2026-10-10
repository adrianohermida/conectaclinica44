import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SOLUÇÃO ALTERNATIVA: Link público de convite
 * NÃO DEPENDE de email - admin copia e compartilha onde quiser
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.clinica_id) {
      return Response.json({ error: 'Usuário sem clínica' }, { status: 403 });
    }

    const { perfil_atribuido, validade_dias = 7 } = await req.json();

    if (!perfil_atribuido) {
      return Response.json({ error: 'perfil_atribuido obrigatório' }, { status: 400 });
    }

    // Buscar clínica
    const clinicas = await base44.entities.Clinica.filter({ id: user.clinica_id });
    const clinica = clinicas[0];

    if (!clinica) {
      return Response.json({ error: 'Clínica não encontrada' }, { status: 404 });
    }

    // Gerar token único
    const token = crypto.randomUUID();
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + validade_dias);

    // Criar convite PÚBLICO (sem email_convidado)
    const convite = await base44.entities.ConviteUsuario.create({
      clinica_id: user.clinica_id,
      clinica_nome: clinica.nome,
      email_convidado: '', // Vazio - será preenchido na hora do aceite
      perfil_atribuido,
      token,
      status: 'pendente',
      status_email: 'link_publico', // Flag especial
      data_envio: new Date().toISOString(),
      data_expiracao: dataExpiracao.toISOString(),
      convidado_por_email: user.email,
      tentativas_envio: 0
    });

    // CRITICAL: Usar domínio do app frontend (header Origin/Referer)
    const appHost = req.headers.get('origin') || 
                    req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 
                    'https://conectaclinica.com.br';
    const linkPublico = `${appHost}/ConvitePublico?token=${token}`;

    console.log('✅ Link público gerado:', {
      convite_id: convite.id,
      token: token.substring(0, 8) + '...',
      validade: validade_dias + ' dias',
      link: linkPublico
    });

    return Response.json({
      success: true,
      convite_id: convite.id,
      link_publico: linkPublico,
      token,
      validade_ate: dataExpiracao.toISOString(),
      instrucoes: 'Compartilhe este link com quem deseja convidar. Válido até ' + new Date(dataExpiracao).toLocaleDateString('pt-BR')
    });

  } catch (error) {
    console.error('Erro ao gerar link público:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});