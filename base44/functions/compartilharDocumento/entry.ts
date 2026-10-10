import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('[compartilharDocumento] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documento_id, justificativa } = await req.json();
    console.log('[compartilharDocumento] Request:', { documento_id, user: user.email });

    if (!documento_id) {
      return Response.json({ error: 'documento_id obrigatório' }, { status: 400 });
    }

    // CRITICAL: Query com clinica_id para forçar isolamento multi-tenant
    const docs = await base44.entities.DocumentoCompliance.filter({ 
      id: documento_id,
      clinica_id: user.clinica_id 
    });
    console.log('[compartilharDocumento] Doc:', docs.length > 0 ? 'encontrado' : 'não encontrado');

    if (docs.length === 0) {
      console.error('[compartilharDocumento] BLOQUEIO LGPD:', {
        user_clinica: user.clinica_id,
        doc_id: documento_id,
        user_email: user.email
      });
      return Response.json({ 
        error: 'Documento não encontrado ou acesso negado' 
      }, { status: 403 });
    }

    const documento = docs[0];

    // LGPD: REMOVER BYPASS ADMIN - validação ownership obrigatória
    const isCrossTenant = documento.clinica_id !== user.clinica_id;
    
    if (isCrossTenant) {
      // Admin NÃO bypassa mais - precisa justificar acesso cross-tenant (LGPD Art. 9)
      if (!justificativa || justificativa.length < 20) {
        console.error('[compartilharDocumento] BLOQUEIO: justificativa obrigatória', {
          user: user.email,
          role: user.role,
          cross_tenant: true
        });
        return Response.json({ 
          error: 'Justificativa obrigatória para acesso cross-tenant (mín. 20 caracteres)',
          required_by: 'LGPD Art. 9 - Base Legal de Tratamento'
        }, { status: 400 });
      }

      // LOG AUDITORIA LGPD OBRIGATÓRIA
      await base44.asServiceRole.entities.LogAcessoDado.create({
        usuario_email: user.email,
        usuario_role: user.role,
        acao: 'compartilhar_documento_cross_tenant',
        entidade: 'DocumentoCompliance',
        entidade_id: documento_id,
        justificativa,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent'),
        cross_tenant: true,
        clinica_origem: documento.clinica_id,
        clinica_acesso: user.clinica_id
      });

      console.log('[compartilharDocumento] ⚠️ ACESSO CROSS-TENANT AUTORIZADO:', {
        user: user.email,
        doc_clinica: documento.clinica_id,
        user_clinica: user.clinica_id,
        justificativa: justificativa.substring(0, 50)
      });
    }

    const shareToken = crypto.randomUUID();
    const APP_BASE_URL = 'https://conectaclinica.com.br';
    const linkCompartilhamento = `${APP_BASE_URL}/CompartilhamentoPublico?tipo=documento&token=${shareToken}`;
    
    console.log('[compartilharDocumento] Gerando:', { token: shareToken, link: linkCompartilhamento });

    await base44.asServiceRole.entities.DocumentoCompliance.update(documento_id, {
      compartilhamento_publico: true,
      token_compartilhamento: shareToken,
      link_compartilhamento: linkCompartilhamento,
      compartilhado_por: user.email,
      compartilhado_em: new Date().toISOString()
    });

    console.log('[compartilharDocumento] ✅ Success');

    return Response.json({
      success: true,
      link_compartilhamento: linkCompartilhamento,
      token: shareToken
    });
  } catch (error) {
    console.error('[compartilharDocumento] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});