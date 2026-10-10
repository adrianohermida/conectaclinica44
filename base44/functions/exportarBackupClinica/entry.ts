import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { format } from 'npm:date-fns@3.6.0';

/**
 * LGPD Art. 18: Direito à Portabilidade
 * Exporta TODOS os dados da clínica em JSON
 * Gera SignedURL temporário (24h) + envia email
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { clinica_id } = await req.json();

    // VALIDAÇÃO: Apenas admin da clínica pode exportar
    if (!clinica_id) {
      return Response.json({ error: 'clinica_id obrigatório' }, { status: 400 });
    }

    const admins = await base44.asServiceRole.entities.UsuarioClinica.filter({
      clinica_id,
      user_id: user.id,
      perfil: 'admin',
      ativo: true
    });

    if (admins.length === 0 && user.role !== 'admin') {
      return Response.json({ 
        error: 'Acesso negado - apenas admin pode exportar backup' 
      }, { status: 403 });
    }

    console.log('[BACKUP] Iniciando export clínica:', clinica_id);

    // COLETAR TODOS OS DADOS (PARALELO para speed)
    const [
      clinica,
      pacientes,
      agendamentos,
      prontuarios,
      documentos,
      tickets,
      vendas,
      produtos,
      equipe
    ] = await Promise.all([
      base44.asServiceRole.entities.Clinica.filter({ id: clinica_id }),
      base44.asServiceRole.entities.Contato.filter({ clinica_id }),
      base44.asServiceRole.entities.Agendamento.filter({ clinica_id }),
      base44.asServiceRole.entities.Prontuario.filter({ clinica_id }),
      base44.asServiceRole.entities.DocumentoCompliance.filter({ clinica_id }),
      base44.asServiceRole.entities.Ticket.filter({ clinica_id }),
      base44.asServiceRole.entities.Venda.filter({ clinica_id }),
      base44.asServiceRole.entities.Produto.filter({ clinica_id }),
      base44.asServiceRole.entities.UsuarioClinica.filter({ clinica_id })
    ]);

    // MANIFEST
    const backup = {
      metadata: {
        clinica_id,
        clinica_nome: clinica[0]?.nome,
        data_export: new Date().toISOString(),
        exportado_por: user.email,
        versao_backup: '1.0',
        total_registros: pacientes.length + agendamentos.length + prontuarios.length + documentos.length + tickets.length + vendas.length
      },
      clinica: clinica[0],
      pacientes,
      agendamentos,
      prontuarios,
      documentos,
      tickets,
      vendas,
      produtos,
      equipe
    };

    // GERAR JSON (compactado)
    const jsonString = JSON.stringify(backup, null, 2);
    const jsonBlob = new TextEncoder().encode(jsonString);

    // UPLOAD como PRIVATE file
    const fileName = `backup_${clinica_id}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
    
    const uploadResponse = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
      file: jsonBlob
    });

    const file_uri = uploadResponse.file_uri;

    // GERAR SIGNED URL (24h)
    const signedUrlResponse = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 86400 // 24h
    });

    const signed_url = signedUrlResponse.signed_url;

    // REGISTRAR LOG AUDITORIA
    await base44.asServiceRole.entities.LogAcessoDado.create({
      clinica_id,
      usuario_id: user.id,
      usuario_email: user.email,
      entidade: 'Backup',
      registro_id: file_uri,
      tipo_acesso: 'exportacao',
      finalidade: 'Portabilidade LGPD Art. 18',
      base_legal: 'obrigacao_legal',
      dados_acessados: ['clinica', 'pacientes', 'prontuarios', 'documentos', 'tickets', 'vendas'],
      contexto: `Export completo - ${backup.metadata.total_registros} registros`,
      ip_origem: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      user_agent: req.headers.get('user-agent'),
      sucesso: true
    });

    // ENVIAR EMAIL COM LINK
    const tamanho_mb = (jsonBlob.length / (1024 * 1024)).toFixed(2);
    
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: `✅ Backup ConectaClínica - ${clinica[0]?.nome}`,
      body: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #7E57FF; margin-bottom: 20px;">📦 Backup Pronto!</h2>
          
          <p style="color: #202124; font-size: 16px; line-height: 1.6;">
            Olá <strong>${user.full_name || user.email}</strong>,
          </p>
          
          <p style="color: #5f6368; font-size: 14px; line-height: 1.6;">
            Seu backup completo da <strong>${clinica[0]?.nome}</strong> foi gerado com sucesso.
          </p>
          
          <div style="background: #f5f3ff; border-left: 4px solid #7E57FF; padding: 16px; margin: 24px 0; border-radius: 8px;">
            <p style="margin: 0; color: #202124; font-size: 14px;">
              📊 <strong>Tamanho:</strong> ${tamanho_mb} MB<br>
              🗓️ <strong>Gerado em:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}<br>
              📁 <strong>Registros:</strong> ${backup.metadata.total_registros} itens<br>
              ⏰ <strong>Validade:</strong> 24 horas
            </p>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${signed_url}" 
               style="display: inline-block; background: #7E57FF; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">
              ⬇️ Baixar Backup
            </a>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #fbbc04; padding: 12px; margin: 24px 0; border-radius: 8px;">
            <p style="margin: 0; color: #202124; font-size: 12px;">
              ⚠️ <strong>Importante:</strong> Este link expira em 24 horas por segurança. 
              Baixe o arquivo agora e armazene localmente.
            </p>
          </div>
          
          <p style="color: #80868b; font-size: 12px; margin-top: 32px;">
            🔒 Conformidade LGPD Art. 18 - Direito à Portabilidade<br>
            ConectaClínica © ${new Date().getFullYear()}
          </p>
        </div>
      `
    });

    return Response.json({ 
      success: true,
      file_uri,
      signed_url,
      tamanho_mb: parseFloat(tamanho_mb),
      total_registros: backup.metadata.total_registros,
      expires_in: '24h'
    });

  } catch (error) {
    console.error('[BACKUP] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});