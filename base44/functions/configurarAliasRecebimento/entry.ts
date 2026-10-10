import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { config_id, email_institucional } = await req.json();

    // Buscar configuração
    const configs = await base44.entities.ConfiguracaoEmail.filter({ id: config_id });
    const config = configs[0];
    if (!config || config.clinica_id !== user.clinica_id) {
      return Response.json({ error: 'Configuração não encontrada' }, { status: 404 });
    }

    // Buscar clínica para slug
    const clinicas = await base44.entities.Clinica.filter({ id: user.clinica_id });
    const clinica = clinicas[0];
    if (!clinica) {
      return Response.json({ error: 'Clínica não encontrada' }, { status: 404 });
    }

    // Gerar slug se não existir
    let slug = clinica.slug;
    if (!slug) {
      slug = clinica.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 20);
      
      // Atualizar clínica com slug
      await base44.asServiceRole.entities.Clinica.update(clinica.id, { slug });
    }

    // ALIAS SEMPRE baseado no slug (não no email institucional)
    const aliasRecebimento = `${slug}@conectaclinica.com.br`;
    let redirectCriado = false;

    // Configurar Inbound Parse SendGrid (CRÍTICO)
    try {
      const parseRes = await base44.asServiceRole.functions.invoke('configurarInboundParse', {
        hostname: 'conectaclinica.com.br'
      });
      
      if (parseRes.data.success) {
        redirectCriado = true;
      } else {
        console.warn('Inbound Parse não configurado:', parseRes.data.error);
      }
    } catch (error) {
      console.error('Erro ao configurar Inbound Parse:', error);
    }

    // Atualizar configuração
    await base44.entities.ConfiguracaoEmail.update(config_id, {
      alias_recebimento: aliasRecebimento,
      email_remetente: email_institucional,
      inbound_parse_configurado: redirectCriado
    });

    return Response.json({
      success: true,
      alias_recebimento: aliasRecebimento,
      email_remetente: email_institucional,
      redirect_criado: redirectCriado,
      mensagem: `✅ Alias: ${aliasRecebimento} | FROM: ${email_institucional}`
    });
  } catch (error) {
    console.error('Erro ao configurar alias:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});