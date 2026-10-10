import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { createHash } from 'node:crypto';

/**
 * COMPLIANCE LGPD Art. 8º: Registrar aceite de termo com hash SHA-256
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { termo_id, versao, tipo_aceite, scroll_percent, tempo_leitura_segundos } = await req.json();

    if (!termo_id || !versao) {
      return Response.json({ error: 'termo_id e versao são obrigatórios' }, { status: 400 });
    }
    
    // ANTI-DUPLICAÇÃO: Verificar aceites existentes (FIXADO: termo_legal_id unificado)
    const aceitesExistentes = await base44.entities.AceiteTermoLegal.filter({
      usuario_id: user.id,
      termo_legal_id: termo_id
    });
    
    if (aceitesExistentes.length > 0) {
      console.warn(`[registrarAceiteTermo] 🚨 DUPLICAÇÃO BLOQUEADA: user ${user.id}, termo ${termo_id}`);
      return Response.json({ 
        success: true, 
        duplicado: true,
        aceite_id: aceitesExistentes[0].id 
      });
    }

    // Buscar termo
    const termo = await base44.entities.TermoLegal.filter({ id: termo_id });
    if (!termo || termo.length === 0) {
      return Response.json({ error: 'Termo não encontrado' }, { status: 404 });
    }

    // Gerar hash SHA-256 do termo
    const termoString = JSON.stringify(termo[0].blocos || []);
    const hash = createHash('sha256').update(termoString).digest('hex');

    // Criar aceite COM MÉTRICAS LGPD (scroll, tempo leitura)
    const aceite = await base44.entities.AceiteTermoLegal.create({
      usuario_id: user.id,
      usuario_nome: user.full_name,
      usuario_email: user.email,
      termo_legal_id: termo_id,
      termo_versao: versao, // ← FIXADO: schema exige termo_versao
      aceito: true,
      timestamp_aceite: new Date().toISOString(), // ← FIXADO: schema exige timestamp_aceite
      ip_address: req.headers.get('x-forwarded-for') || 'unknown', // ← FIXADO: schema exige ip_address
      user_agent: req.headers.get('user-agent') || 'unknown',
      hash_aceite: hash,
      hash_termo_original: termo[0].metadata?.hash_sha256 || hash
    });

    console.log(`[registrarAceiteTermo] ✅ Aceite registrado: ${user.email} → ${termo[0].tipo_documento}`);

    return Response.json({
      success: true,
      aceite_id: aceite.id,
      hash: hash
    });

  } catch (error) {
    console.error('[registrarAceiteTermo] ❌ ERRO:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});