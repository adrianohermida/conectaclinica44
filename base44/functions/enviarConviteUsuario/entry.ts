import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import sgMail from 'npm:@sendgrid/mail';

sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.clinica_id) {
      return Response.json({ error: 'Usuário sem clínica' }, { status: 403 });
    }

    // CRITICAL: Validar SendGrid API Key ANTES de continuar
    const sendgridKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendgridKey) {
      console.error('❌ SENDGRID_API_KEY não configurada');
      return Response.json({ 
        error: 'SendGrid não configurado - contate o administrador',
        debug: 'SENDGRID_API_KEY ausente nas variáveis de ambiente'
      }, { status: 500 });
    }

    console.log('✅ SendGrid API Key presente:', sendgridKey.substring(0, 10) + '...');

    const { email_convidado, perfil_atribuido } = await req.json();

    if (!email_convidado || !perfil_atribuido) {
      return Response.json({ error: 'email_convidado e perfil_atribuido obrigatórios' }, { status: 400 });
    }

    // Verificar se já existe convite pendente
    const convitesExistentes = await base44.entities.ConviteUsuario.filter({
      email_convidado,
      clinica_id: user.clinica_id,
      status: 'pendente'
    });

    if (convitesExistentes.length > 0) {
      return Response.json({ error: 'Convite pendente já existe para este email nesta clínica' }, { status: 400 });
    }

    // Verificar se user já está na equipe
    const vinculoExistente = await base44.entities.UsuarioClinica.filter({
      user_email: email_convidado,
      clinica_id: user.clinica_id,
      ativo: true
    });

    if (vinculoExistente.length > 0) {
      return Response.json({ error: 'Usuário já faz parte desta clínica' }, { status: 400 });
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
    dataExpiracao.setDate(dataExpiracao.getDate() + 7); // 7 dias

    // Criar convite
    const convite = await base44.entities.ConviteUsuario.create({
      clinica_id: user.clinica_id,
      clinica_nome: clinica.nome,
      email_convidado,
      perfil_atribuido,
      token,
      status: 'pendente',
      status_email: 'enviando',
      data_envio: new Date().toISOString(),
      data_expiracao: dataExpiracao.toISOString(),
      convidado_por_email: user.email,
      tentativas_envio: 1
    });

    // CRITICAL: Usar origin do frontend (header Origin/Referer), NÃO do Deno function
    const appHost = req.headers.get('origin') || 
                    req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 
                    'https://conectaclinica.com.br';
    const linkAceite = `${appHost}/AceitarConvite?token=${token}`;

    // FROM: usar email institucional da clínica se configurado, senão noreply
    let fromEmail = 'noreply@conectaclinica.com.br';
    let fromName = 'ConectaClínica';
    
    // Buscar config de email da clínica
    const configsEmail = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      clinica_id: user.clinica_id,
      ativo: true
    });
    
    if (configsEmail.length > 0) {
      const config = configsEmail.find(c => c.provedor_padrao) || configsEmail[0];
      if (config.email_remetente) {
        fromEmail = config.email_remetente;
        fromName = config.nome_remetente || clinica.nome;
      }
    }
    
    console.log('📧 Enviando email:', {
      to: email_convidado,
      from: fromEmail,
      fromName,
      linkAceite: linkAceite.substring(0, 50) + '...',
      conviteId: convite.id
    });

    const msg = {
      to: email_convidado,
      from: { 
        email: fromEmail, 
        name: fromName 
      },
      reply_to: user.email,
      subject: `Convite para ${clinica.nome} - ConectaClínica`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #7E57FF; font-size: 32px; margin: 0;">ConectaClínica</h1>
          </div>
          
          <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #202124; font-size: 24px; margin-bottom: 16px;">Você foi convidado!</h2>
            
            <p style="color: #5f6368; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
              <strong>${user.full_name || user.email}</strong> convidou você para fazer parte da equipe de 
              <strong>${clinica.nome}</strong> como <strong>${perfil_atribuido}</strong>.
            </p>

            <div style="background: #f5f3ff; border-left: 4px solid #7E57FF; padding: 16px; margin-bottom: 24px;">
              <p style="color: #202124; font-size: 14px; margin: 0;">
                <strong>Perfil:</strong> ${perfil_atribuido}<br>
                <strong>Clínica:</strong> ${clinica.nome}<br>
                <strong>Válido até:</strong> ${new Date(dataExpiracao).toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${linkAceite}" style="display: inline-block; background: #7E57FF; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Aceitar Convite
              </a>
            </div>

            <p style="color: #9aa0a6; font-size: 13px; line-height: 1.5; margin-top: 24px;">
              Se você não esperava este convite, pode ignorar este email. O convite expira em 7 dias.
            </p>
          </div>

          <div style="text-align: center; margin-top: 32px; color: #9aa0a6; font-size: 12px;">
            <p>ConectaClínica - Gestão Inteligente de Clínicas</p>
          </div>
        </div>
      `,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      },
      customArgs: {
        convite_id: convite.id,
        clinica_id: user.clinica_id
      }
    };

    const [response] = await sgMail.send(msg);
    
    console.log('✅ SendGrid response:', {
      statusCode: response.statusCode,
      headers: response.headers
    });

    // Extrair message_id do SendGrid
    const messageId = response.headers['x-message-id'];

    if (!messageId) {
      console.warn('⚠️ SendGrid não retornou message_id - possível problema de autenticação');
    }

    // Atualizar convite com message_id
    await base44.entities.ConviteUsuario.update(convite.id, {
      sendgrid_message_id: messageId || 'sem-message-id',
      status_email: 'enviado'
    });

    console.log('✅ Convite registrado:', convite.id);

    return Response.json({
      success: true,
      convite_id: convite.id,
      message_id: messageId,
      link_aceite: linkAceite,
      link_publico: `${appHost}/ConvitePublico?token=${token}`,
      debug: {
        fromEmail,
        toEmail: email_convidado,
        sendgridStatus: response.statusCode
      }
    });

  } catch (error) {
    console.error('❌ ERRO BRUTAL ao enviar convite:', error);
    console.error('Stack:', error.stack);
    console.error('Response body:', error.response?.body);
    console.error('Response code:', error.response?.statusCode);
    
    // CRITICAL: Log incidente para diagnóstico
    const incidenteCode = `INC-EMAIL-${Date.now()}`;
    console.error(`INCIDENTE REGISTRADO: ${incidenteCode}`);
    
    return Response.json({
      success: false,
      error: error.message,
      incidente_code: incidenteCode,
      sendgrid_error: error.response?.body?.errors || null,
      sendgrid_status: error.response?.statusCode || null,
      detalhes_completos: {
        message: error.message,
        code: error.code,
        response: error.response?.body
      }
    }, { status: 500 });
  }
});