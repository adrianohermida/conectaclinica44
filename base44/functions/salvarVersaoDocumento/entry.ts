import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * VERSIONAMENTO CFM: Salva histórico edições prontuário
 * AUDITORIA: Garante rastreabilidade alterações (CFM 1.821/07 Art. 8º)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prontuario_id, versao_anterior } = await req.json();

    if (!prontuario_id || !versao_anterior) {
      return Response.json({ error: 'prontuario_id e versao_anterior obrigatórios' }, { status: 400 });
    }

    // SECURITY: Validar ownership
    if (versao_anterior.clinica_id !== user.clinica_id && user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Salvar versão histórica
    const versao = await base44.asServiceRole.entities.HistoricoVersaoDocumento.create({
      prontuario_id,
      clinica_id: versao_anterior.clinica_id,
      versao_numero: versao_anterior.versao || 1,
      conteudo_completo: versao_anterior,
      hash_sha256: versao_anterior.hash_sha256,
      modificado_por: user.email,
      modificado_em: new Date().toISOString(),
      tipo_alteracao: 'edicao',
      campos_alterados: [] // TODO: diff automático
    });

    return Response.json({ 
      success: true, 
      versao_id: versao.id 
    });

  } catch (error) {
    console.error('[salvarVersaoDocumento] Erro:', error);
    return Response.json({ 
      error: 'Erro ao salvar versão',
      details: error.message 
    }, { status: 500 });
  }
});