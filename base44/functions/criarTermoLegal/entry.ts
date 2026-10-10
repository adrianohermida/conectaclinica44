import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRIAR TERMO LEGAL - SERVER-SIDE HASH
 * 
 * COMPLIANCE: Hash SHA-256 gerado em ambiente controlado
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const data = await req.json();

    if (!data.conteudo_html) {
      return Response.json({ error: 'conteudo_html required' }, { status: 400 });
    }

    // CRITICAL: Gerar hash SHA-256 SERVER-SIDE
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data.conteudo_html);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Criar termo com hash server-side
    const termo = await base44.asServiceRole.entities.TermoLegal.create({
      ...data,
      hash_sha256: hashHex
    });

    return Response.json({
      success: true,
      termo
    });

  } catch (error) {
    console.error('Erro ao criar termo:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});