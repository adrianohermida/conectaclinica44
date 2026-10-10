import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🔥 DIAGNÓSTICO BRUTAL - ISOLAMENTO MULTI-TENANT
 * Detecta vazamentos de domains entre clínicas
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'SuperAdmin only' }, { status: 401 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      return Response.json({ error: 'SENDGRID_API_KEY não configurada' }, { status: 500 });
    }

    // 1. Buscar TODOS domains SendGrid
    const domainsRes = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}` }
    });
    
    if (!domainsRes.ok) {
      throw new Error('Falha ao buscar domains');
    }
    
    const allDomains = await domainsRes.json();

    // 2. Buscar TODAS configs
    const allConfigs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      provedor: 'dominio_proprio'
    });

    // 3. Buscar TODAS clínicas
    const allClinicas = await base44.asServiceRole.entities.Clinica.list();

    // 4. ANÁLISE DE VAZAMENTOS
    const violacoes = [];
    const orphans = [];
    const duplicatas = [];

    // Mapear domain_id -> configs
    const domainIdToConfigs = {};
    allConfigs.forEach(config => {
      if (!config.dkim_domain_id) return;
      const id = String(config.dkim_domain_id);
      if (!domainIdToConfigs[id]) {
        domainIdToConfigs[id] = [];
      }
      domainIdToConfigs[id].push(config);
    });

    // Detectar DUPLICATAS (domain vinculado a múltiplas clínicas)
    Object.entries(domainIdToConfigs).forEach(([domainId, configs]) => {
      if (configs.length > 1) {
        const domain = allDomains.find(d => String(d.id) === domainId);
        duplicatas.push({
          domain_id: domainId,
          domain_name: domain?.domain || 'unknown',
          clinicas_afetadas: configs.map(c => ({
            clinica_id: c.clinica_id,
            config_id: c.id,
            created_date: c.created_date
          })),
          total_violacoes: configs.length
        });
      }
    });

    // Detectar ÓRFÃOS (domain no SendGrid sem config)
    allDomains.forEach(domain => {
      if (!domainIdToConfigs[String(domain.id)]) {
        orphans.push({
          domain_id: domain.id,
          domain: domain.domain,
          valid: domain.valid
        });
      }
    });

    // Detectar CONFIGS ÓRFÃS (config aponta domain inexistente no SendGrid)
    const configsOrfas = [];
    allConfigs.forEach(config => {
      if (config.dkim_domain_id) {
        const domainExists = allDomains.find(d => String(d.id) === String(config.dkim_domain_id));
        if (!domainExists) {
          configsOrfas.push({
            config_id: config.id,
            clinica_id: config.clinica_id,
            domain_id_morto: config.dkim_domain_id,
            domain_name: config.dkim_domain,
            email_remetente: config.email_remetente
          });
          violacoes.push({
            tipo: 'config_orfã_domain_inexistente',
            config_id: config.id,
            clinica_id: config.clinica_id,
            domain_id_invalido: config.dkim_domain_id,
            domain_name: config.dkim_domain
          });
        }
      }
    });

    // 5. SCORE DE ISOLAMENTO
    const totalConfigs = allConfigs.length;
    const totalDuplicatas = duplicatas.reduce((sum, d) => sum + d.total_violacoes - 1, 0); // -1 pois 1 é legítimo
    const isolamentoScore = totalConfigs > 0 ? ((totalConfigs - totalDuplicatas) / totalConfigs * 100).toFixed(1) : 100;

    // Mapear clínicas para nomes legíveis
    const clinicaMap = {};
    allClinicas.forEach(c => {
      clinicaMap[c.id] = c.nome || c.slug || c.id;
    });

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      resumo: {
        total_domains_sendgrid: allDomains.length,
        total_configs: totalConfigs,
        total_clinicas: allClinicas.length,
        domains_orfaos_sendgrid: orphans.length,
        configs_orfas_db: configsOrfas.length,
        domains_duplicados: duplicatas.length,
        violacoes_criticas: violacoes.length,
        isolamento_score: `${isolamentoScore}%`
      },
      criticidade: (duplicatas.length > 0 || configsOrfas.length > 0) ? 'CRÍTICA - VAZAMENTO/LIXO ATIVO' : 'OK',
      duplicatas: duplicatas.map(d => ({
        ...d,
        clinicas_nomes: [
          clinicaMap[d.clinica_legitima],
          ...d.clinicas_invasoras.map(id => clinicaMap[id])
        ]
      })),
      orphans_sendgrid: orphans,
      configs_orfas: configsOrfas.map(c => ({
        ...c,
        clinica_nome: clinicaMap[c.clinica_id]
      })),
      violacoes,
      recomendacoes: (() => {
        const actions = [];
        if (duplicatas.length > 0) {
          actions.push('🚨 CRÍTICO: Executar limparDuplicatasDomains com dry_run:false');
        }
        if (configsOrfas.length > 0) {
          actions.push('🗑️ LIXO: Executar limparConfigsOrfas para remover fantasmas');
        }
        if (orphans.length > 0) {
          actions.push('🔗 VINCULAR: Domains órfãos no SendGrid - vincular ou remover');
        }
        if (actions.length === 0) {
          actions.push('✅ Isolamento perfeito', '📈 Monitorar semanalmente');
        }
        return actions;
      })()
    });
  } catch (error) {
    console.error('[diagnosticarIsolamentoDomains] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});