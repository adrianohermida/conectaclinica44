import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * MIDDLEWARE DE VALIDAÇÃO DE PERMISSÕES - LGPD COMPLIANT
 * Valida acesso granular antes de permitir operações
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { item_id, item_type, operacao } = await req.json();

    // Admin bypass
    if (user.role === 'admin') {
      return Response.json({ 
        permitido: true, 
        motivo: 'Admin tem acesso total' 
      });
    }

    // Buscar permissões
    const query = item_type === 'pasta' 
      ? { pasta_id: item_id }
      : { documento_id: item_id };

    const permissoes = await base44.entities.PermissaoCompliance.filter(query);

    // Verificar se é proprietário
    const isOwner = permissoes.some(p => p.created_by === user.email);
    if (isOwner) {
      return Response.json({ 
        permitido: true, 
        motivo: 'Proprietário do recurso' 
      });
    }

    // Buscar permissão do usuário
    const minhaPermissao = permissoes.find(p => p.usuario_email === user.email);

    if (!minhaPermissao) {
      // Verificar herança (se for documento, checar pasta pai)
      if (item_type === 'documento') {
        const documento = await base44.entities.DocumentoCompliance.get(item_id);
        if (documento?.pasta_id) {
          const permissoesPasta = await base44.entities.PermissaoCompliance.filter({
            pasta_id: documento.pasta_id,
            herdar_subpastas: true
          });
          
          const permissaoHerdada = permissoesPasta.find(p => p.usuario_email === user.email);
          if (permissaoHerdada && validarOperacao(permissaoHerdada, operacao)) {
            return Response.json({ 
              permitido: true, 
              motivo: 'Permissão herdada da pasta pai' 
            });
          }
        }
      }

      return Response.json({ 
        permitido: false, 
        motivo: 'Sem permissão de acesso' 
      }, { status: 403 });
    }

    // Validar operação específica
    const permitido = validarOperacao(minhaPermissao, operacao);

    if (permitido) {
      // Registrar log de auditoria (LGPD Art. 46)
      await base44.entities.LogAuditoria.create({
        usuario_email: user.email,
        usuario_id: user.id,
        acao: operacao,
        recurso_tipo: item_type,
        recurso_id: item_id,
        resultado: 'permitido',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      });
    }

    return Response.json({ 
      permitido, 
      motivo: permitido ? 'Permissão concedida' : `Sem permissão para ${operacao}` 
    }, { status: permitido ? 200 : 403 });

  } catch (error) {
    console.error('[PermissaoMiddleware] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function validarOperacao(permissao, operacao) {
  const mapa = {
    'visualizar': permissao.visualizar,
    'editar': permissao.editar,
    'excluir': permissao.excluir,
    'download': permissao.visualizar,
    'compartilhar': permissao.editar
  };
  return mapa[operacao] || false;
}