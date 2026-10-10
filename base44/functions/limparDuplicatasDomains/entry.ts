import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🔥 CORREÇÃO BRUTAL - LIMPA DUPLICATAS DE DOMAINS
 * Remove configs duplicadas, mantendo apenas a mais antiga por domain_id
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'SuperAdmin only' }, { status: 401 });
    }

    const { dry_run = true } = await req.json();

    // 1. Buscar TODAS configs de domínio próprio
    const allConfigs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      provedor: 'dominio_proprio'
    });

    // 2. Agrupar por domain_id
    const domainIdToConfigs = {};
    allConfigs.forEach(config => {
      if (!config.dkim_domain_id) return;
      const id = String(config.dkim_domain_id);
      if (!domainIdToConfigs[id]) {
        domainIdToConfigs[id] = [];
      }
      domainIdToConfigs[id].push(config);
    });

    // 3. Identificar duplicatas
    const duplicatas = [];
    const configsParaRemover = [];

    Object.entries(domainIdToConfigs).forEach(([domainId, configs]) => {
      if (configs.length > 1) {
        // Ordenar por created_date (mais antigo primeiro)
        configs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        
        const legitimo = configs[0]; // Mais antigo
        const ilegitimos = configs.slice(1); // Resto
        
        duplicatas.push({
          domain_id: domainId,
          domain_name: legitimo.dkim_domain,
          clinica_legitima: legitimo.clinica_id,
          clinicas_invasoras: ilegitimos.map(c => c.clinica_id),
          total_violacoes: ilegitimos.length
        });

        configsParaRemover.push(...ilegitimos);
      }
    });

    // 4. EXECUTAR LIMPEZA (se não for dry_run)
    let removidos = 0;
    if (!dry_run) {
      for (const config of configsParaRemover) {
        await base44.asServiceRole.entities.ConfiguracaoEmail.delete(config.id);
        removidos++;
      }
    }

    return Response.json({
      success: true,
      dry_run,
      total_configs: allConfigs.length,
      duplicatas_detectadas: duplicatas.length,
      configs_para_remover: configsParaRemover.length,
      configs_removidos: removidos,
      duplicatas,
      mensagem: dry_run 
        ? `⚠️ DRY RUN - ${configsParaRemover.length} configs seriam removidos`
        : `✅ ${removidos} configs duplicados removidos`
    });
  } catch (error) {
    console.error('[limparDuplicatasDomains] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});