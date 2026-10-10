import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmailSendGrid } from './services/emailService.js';

/**
 * SPRINT 3: Alerta estoque baixo
 * MANUAL: Admin clica "Verificar Estoque" (vs CRON diário 10h)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin' }, { status: 401 });
    }

    const { clinica_id } = await req.json();
    const targetClinica = clinica_id || user.clinica_id;

    // Buscar produtos com estoque baixo
    const produtos = await base44.entities.Produto.filter({
      clinica_id: targetClinica,
      controla_estoque: true
    });

    const produtosBaixos = produtos.filter(p => {
      const estoque = p.quantidade_estoque || 0;
      const minimo = p.estoque_minimo || 10;
      return estoque <= minimo && estoque > 0;
    });

    const produtosZerados = produtos.filter(p => 
      (p.quantidade_estoque || 0) === 0 && p.controla_estoque
    );

    if (produtosBaixos.length === 0 && produtosZerados.length === 0) {
      return Response.json({ 
        success: true, 
        alertas: 0,
        detalhes: 'Estoque OK'
      });
    }

    const clinica = await base44.entities.Clinica.filter({ id: targetClinica })[0];
    const admins = await base44.entities.User.filter({ 
      clinica_id: targetClinica, 
      role: 'admin' 
    });

    const listaHTML = [
      ...produtosBaixos.map(p => 
        `<li style="color: #fbbc04;"><strong>${p.nome}</strong>: ${p.quantidade_estoque} unidades (mínimo: ${p.estoque_minimo})</li>`
      ),
      ...produtosZerados.map(p => 
        `<li style="color: #ea4335;"><strong>${p.nome}</strong>: ZERADO ⚠️</li>`
      )
    ].join('');

    for (const admin of admins) {
      await enviarEmailSendGrid({
        base44,
        clinica_id: targetClinica,
        template_tipo: 'alerta_estoque',
        destinatario: admin.email,
        vars: {
          admin_nome: admin.full_name,
          clinica_nome: clinica.nome,
          total_produtos_baixos: produtosBaixos.length,
          total_produtos_zerados: produtosZerados.length,
          lista_produtos: listaHTML,
          data: new Date().toLocaleDateString('pt-BR')
        }
      });
    }

    return Response.json({
      success: true,
      total_alertas: produtosBaixos.length + produtosZerados.length,
      admins_notificados: admins.length,
      detalhes: {
        produtos_baixos: produtosBaixos.length,
        produtos_zerados: produtosZerados.length
      }
    });

  } catch (error) {
    console.error('[AlertarEstoque] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});