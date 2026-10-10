import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * COMPLIANCE: Limpar aceites órfãos (vinculados a termos deletados)
 * Integridade referencial LGPD
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // 1. Buscar todos os aceites
    const aceites = await base44.asServiceRole.entities.AceiteTermoLegal.list();
    
    // 2. Buscar todos os termos válidos
    const termos = await base44.asServiceRole.entities.ConteudoLegal.list();
    const termosValidos = new Set(termos.map(t => t.id));

    // 3. Identificar órfãos
    const orfaos = aceites.filter(aceite => !termosValidos.has(aceite.termo_id));

    if (orfaos.length === 0) {
      return Response.json({ 
        message: 'Nenhum aceite órfão encontrado',
        deleted: 0
      });
    }

    console.log(`[limparAceitesOrfaos] Encontrados ${orfaos.length} aceites órfãos`);

    // 4. Deletar órfãos
    for (const aceite of orfaos) {
      await base44.asServiceRole.entities.AceiteTermoLegal.delete(aceite.id);
      console.log(`[limparAceitesOrfaos] Deletado aceite órfão: ${aceite.id}`);
    }

    return Response.json({
      message: `${orfaos.length} aceites órfãos deletados`,
      deleted: orfaos.length,
      orfaos_ids: orfaos.map(a => a.id)
    });

  } catch (error) {
    console.error('[limparAceitesOrfaos] ❌ ERRO:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});