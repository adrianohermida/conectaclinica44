import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SISTEMA UNIVERSAL DE COMPARTILHAMENTO
 * Gera links públicos para:
 * - Documentos (DocumentoCompliance)
 * - Prontuários (Prontuario)
 * - Pastas inteiras (PastaCompliance)
 * - Qualquer entidade que precise de compartilhamento externo
 * 
 * COMPLIANCE: Log obrigatório em LogAcessoDado
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.clinica_id) {
      return Response.json({ error: 'Não autenticado' }, { status: 403 });
    }

    const { 
      tipo_recurso, // 'documento' | 'prontuario' | 'pasta'
      recurso_id,
      validade_horas = 24,
      requer_senha = false,
      senha = null
    } = await req.json();

    if (!tipo_recurso || !recurso_id) {
      return Response.json({ error: 'tipo_recurso e recurso_id obrigatórios' }, { status: 400 });
    }

    // CRITICAL: Validar ownership do recurso
    let recurso = null;
    let titulo = '';
    
    if (tipo_recurso === 'documento') {
      const docs = await base44.entities.DocumentoCompliance.filter({ 
        id: recurso_id, 
        clinica_id: user.clinica_id 
      });
      
      if (docs.length === 0) {
        return Response.json({ error: 'Documento não encontrado ou você não tem acesso' }, { status: 404 });
      }
      
      recurso = docs[0];
      titulo = recurso.titulo;
    } else if (tipo_recurso === 'prontuario') {
      const pronts = await base44.entities.Prontuario.filter({ 
        id: recurso_id, 
        clinica_id: user.clinica_id 
      });
      
      if (pronts.length === 0) {
        return Response.json({ error: 'Prontuário não encontrado ou você não tem acesso' }, { status: 404 });
      }
      
      recurso = pronts[0];
      titulo = `Prontuário - ${recurso.paciente_nome}`;
    } else if (tipo_recurso === 'pasta') {
      const pastas = await base44.entities.PastaCompliance.filter({ 
        id: recurso_id 
      });
      
      if (pastas.length === 0) {
        return Response.json({ error: 'Pasta não encontrada' }, { status: 404 });
      }
      
      recurso = pastas[0];
      titulo = recurso.nome;
    } else {
      return Response.json({ error: 'tipo_recurso inválido' }, { status: 400 });
    }

    // Gerar token único
    const token = crypto.randomUUID();
    const dataExpiracao = new Date();
    dataExpiracao.setHours(dataExpiracao.getHours() + validade_horas);

    // Criar registro de compartilhamento
    const compartilhamento = await base44.entities.DocumentoCompliance.create({
      titulo: `[LINK_COMPARTILHAMENTO] ${titulo}`,
      tipo_documento: 'link_externo',
      categoria: 'outros',
      token_compartilhamento: token,
      compartilhamento_publico: true,
      compartilhado_por: user.email,
      compartilhado_em: new Date().toISOString(),
      vinculado_a: {
        tipo: tipo_recurso,
        id: recurso_id,
        nome: titulo
      },
      // Metadados do compartilhamento
      tags: ['compartilhamento_publico', tipo_recurso],
      conteudo_extraido: JSON.stringify({
        tipo_recurso,
        recurso_id,
        validade_horas,
        data_expiracao: dataExpiracao.toISOString(),
        requer_senha,
        senha_hash: requer_senha && senha ? await hashSenha(senha) : null
      })
    });

    const appHost = new URL(req.url).origin;
    const linkPublico = `${appHost}/CompartilhamentoPublico?token=${token}`;

    // Log LGPD
    await base44.entities.LogAcessoDado.create({
      clinica_id: user.clinica_id,
      usuario_id: user.id,
      usuario_email: user.email,
      entidade: tipo_recurso,
      registro_id: recurso_id,
      tipo_acesso: 'exportacao',
      base_legal: 'consentimento',
      finalidade: `Geração de link público de compartilhamento com validade de ${validade_horas}h`,
      contexto: `Link: ${linkPublico}, Senha: ${requer_senha ? 'SIM' : 'NÃO'}`,
      ip_origem: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      sucesso: true
    });

    console.log('✅ Link compartilhamento gerado:', {
      tipo: tipo_recurso,
      id: recurso_id,
      token: token.substring(0, 8) + '...',
      validade: validade_horas + 'h',
      senha: requer_senha
    });

    return Response.json({
      success: true,
      link_publico: linkPublico,
      token,
      validade_ate: dataExpiracao.toISOString(),
      requer_senha,
      tipo_recurso,
      titulo
    });

  } catch (error) {
    console.error('Erro ao gerar link:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});

// Helper: Hash de senha simples (não é auth principal, só proteção extra)
async function hashSenha(senha) {
  const encoder = new TextEncoder();
  const data = encoder.encode(senha);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}