import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * EMERGENCY: Limpar configurações duplicadas de email
 * Garante que cada alias é único e pertence a apenas 1 clínica
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // SOMENTE SUPERADMIN
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado - SuperAdmin only' }, { status: 403 });
    }

    const todasConfigs = await base44.asServiceRole.entities.ConfiguracaoEmail.list();
    
    // Agrupar por alias
    const aliasMap = new Map();
    for (const config of todasConfigs) {
      if (!config.alias_recebimento) continue;
      
      if (!aliasMap.has(config.alias_recebimento)) {
        aliasMap.set(config.alias_recebimento, []);
      }
      aliasMap.get(config.alias_recebimento).push(config);
    }

    const duplicatas = [];
    const acao = [];

    // Encontrar duplicatas
    for (const [alias, configs] of aliasMap.entries()) {
      if (configs.length > 1) {
        duplicatas.push({ alias, configs: configs.map(c => ({ id: c.id, clinica_id: c.clinica_id, ativo: c.ativo })) });
        
        // DECISÃO: Manter apenas a config ATIVA mais antiga
        const ativas = configs.filter(c => c.ativo);
        const configManter = ativas.length > 0 ? ativas[0] : configs[0];
        
        // Deletar as outras
        for (const config of configs) {
          if (config.id !== configManter.id) {
            await base44.asServiceRole.entities.ConfiguracaoEmail.delete(config.id);
            acao.push(`❌ Deletado: ${config.id} (clinica: ${config.clinica_id})`);
          }
        }
        
        acao.push(`✅ Mantido: ${configManter.id} (clinica: ${configManter.clinica_id}) para alias ${alias}`);
      }
    }

    return Response.json({ 
      duplicatas,
      acoes: acao,
      total_deletados: acao.filter(a => a.includes('Deletado')).length
    });

  } catch (error) {
    console.error('[LIMPAR_CONFIGS] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});