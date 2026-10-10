import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * P2.11 - IMUTABILIDADE: Criar nova versão de termo (nunca editar)
 * 
 * Quando termo é atualizado:
 * 1. Desativar versão anterior
 * 2. Criar nova versão (incrementar versão)
 * 3. Registrar no log de auditoria
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { termo_id_anterior, conteudo_html, conteudo_markdown, motivo_atualizacao } = await req.json();

    // Buscar termo anterior
    const termosAntigos = await base44.entities.TermoLegal.filter({ id: termo_id_anterior });
    if (termosAntigos.length === 0) {
      return Response.json({ error: 'Termo anterior not found' }, { status: 404 });
    }
    const termoAntigo = termosAntigos[0];

    // CRÍTICO: Desativar termo anterior (imutabilidade)
    await base44.asServiceRole.entities.TermoLegal.update(termo_id_anterior, {
      ativo: false,
      data_fim_vigencia: new Date().toISOString().split('T')[0]
    });

    // Calcular nova versão
    const versaoAtual = parseFloat(termoAntigo.versao || "1.0");
    const novaVersao = (versaoAtual + 0.1).toFixed(1);

    // Gerar hash do novo conteúdo
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(conteudo_html);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Criar nova versão do termo
    const novoTermo = await base44.asServiceRole.entities.TermoLegal.create({
      tipo: termoAntigo.tipo,
      titulo: termoAntigo.titulo,
      conteudo_html: conteudo_html,
      conteudo_markdown: conteudo_markdown, // P2.14: Salvar markdown
      versao: novaVersao,
      hash_sha256: hashHex,
      modulo_aplicacao: termoAntigo.modulo_aplicacao,
      obrigatorio: termoAntigo.obrigatorio,
      ativo: true,
      data_vigencia: new Date().toISOString().split('T')[0],
      autor_criacao: user.email,
      metadata: {
        versao_anterior_id: termo_id_anterior,
        motivo_atualizacao: motivo_atualizacao,
        atualizado_por: user.email,
        data_atualizacao: new Date().toISOString()
      }
    });

    // P2.12: Log de auditoria
    await base44.asServiceRole.entities.LogAuditoria.create({
      modulo: 'compliance',
      tipo: 'termo_legal_versionamento',
      acao: 'criar_nova_versao',
      usuario_email: user.email,
      usuario_nome: user.full_name || user.email,
      dados_antes: {
        termo_id: termo_id_anterior,
        versao: termoAntigo.versao,
        hash: termoAntigo.hash_sha256
      },
      dados_depois: {
        termo_id: novoTermo.id,
        versao: novaVersao,
        hash: hashHex,
        motivo: motivo_atualizacao
      },
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown'
    });

    return Response.json({
      success: true,
      termo_anterior: {
        id: termo_id_anterior,
        versao: termoAntigo.versao,
        desativado: true
      },
      termo_novo: {
        id: novoTermo.id,
        versao: novaVersao,
        hash: hashHex
      }
    });

  } catch (error) {
    console.error('Erro ao versionar termo:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});