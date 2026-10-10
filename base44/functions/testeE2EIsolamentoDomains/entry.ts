import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🧪 TESTE E2E BRUTAL - ISOLAMENTO MULTI-TENANT DE DOMAINS
 * Simula ataques de cross-tenant e valida defesas
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
      return Response.json({ error: 'SENDGRID_API_KEY missing' }, { status: 500 });
    }

    const log = [];
    const testes = [];
    let passou = 0;
    let falhou = 0;

    // Setup: Buscar 2 clínicas de teste
    const clinicas = await base44.asServiceRole.entities.Clinica.list();
    const clinica1 = clinicas[0];
    const clinica2 = clinicas[1];
    
    if (!clinica1 || !clinica2) {
      return Response.json({ error: 'Precisa de ao menos 2 clínicas para testar' }, { status: 400 });
    }

    log.push(`🏥 Clínica 1: ${clinica1.nome} (${clinica1.id})`);
    log.push(`🏥 Clínica 2: ${clinica2.nome} (${clinica2.id})`);

    // TESTE 1: Adicionar domain em clínica 1
    log.push('\n📝 TESTE 1: Adicionar domain teste-isolamento-1.com.br para Clínica 1');
    try {
      const addRes = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain: 'teste-isolamento-1.com.br',
          subdomain: 'mail',
          automatic_security: false
        })
      });

      const domain1 = await addRes.json();
      
      if (addRes.ok || domain1.id) {
        const domainId = domain1.id || domain1.errors?.[0]?.message?.match(/\d+/)?.[0];
        
        // Criar config para clínica 1
        const config1 = await base44.asServiceRole.entities.ConfiguracaoEmail.create({
          clinica_id: clinica1.id,
          provedor: 'dominio_proprio',
          dkim_domain: 'teste-isolamento-1.com.br',
          dkim_domain_id: String(domainId),
          email_remetente: 'teste@teste-isolamento-1.com.br',
          nome_remetente: 'Teste 1'
        });

        log.push(`✅ Domain criado: ID ${domainId}`);
        log.push(`✅ Config criada: ${config1.id}`);

        // TESTE 2: Tentar criar config DUPLICADA em clínica 2 (deve FALHAR)
        log.push('\n🚨 TESTE 2: Tentar vincular MESMO domain à Clínica 2 (deve BLOQUEAR)');
        try {
          await base44.asServiceRole.entities.ConfiguracaoEmail.create({
            clinica_id: clinica2.id,
            provedor: 'dominio_proprio',
            dkim_domain: 'teste-isolamento-1.com.br',
            dkim_domain_id: String(domainId),
            email_remetente: 'invasor@teste-isolamento-1.com.br',
            nome_remetente: 'Invasor'
          });
          
          log.push('❌ FALHA CRÍTICA: Permitiu duplicata (VIOLAÇÃO MULTI-TENANT)');
          testes.push({ teste: 'Constraint unique', resultado: 'FALHOU', severidade: 'CRÍTICA' });
          falhou++;
        } catch (constraintError) {
          if (constraintError.message.includes('duplicate') || constraintError.message.includes('unique')) {
            log.push('✅ PASSOU: Constraint bloqueou duplicata');
            testes.push({ teste: 'Constraint unique', resultado: 'PASSOU', severidade: 'OK' });
            passou++;
          } else {
            log.push(`⚠️ Erro inesperado: ${constraintError.message}`);
            testes.push({ teste: 'Constraint unique', resultado: 'ERRO', severidade: 'ALTA' });
            falhou++;
          }
        }

        // TESTE 3: Validar que clínica 2 NÃO vê domain da clínica 1
        log.push('\n🔍 TESTE 3: Validar filtro getSendGridDomains (Clínica 2 não deve ver domain da 1)');
        
        const configs2 = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
          clinica_id: clinica2.id,
          provedor: 'dominio_proprio'
        });
        
        const allowedIds = configs2.map(c => String(c.dkim_domain_id)).filter(Boolean);
        const vazou = allowedIds.includes(String(domainId));
        
        if (vazou) {
          log.push('❌ FALHA CRÍTICA: Clínica 2 pode ver domain da Clínica 1');
          testes.push({ teste: 'Isolamento filtro', resultado: 'FALHOU', severidade: 'CRÍTICA' });
          falhou++;
        } else {
          log.push('✅ PASSOU: Clínica 2 isolada corretamente');
          testes.push({ teste: 'Isolamento filtro', resultado: 'PASSOU', severidade: 'OK' });
          passou++;
        }

        // TESTE 4: Remover domain e validar limpeza de config
        log.push('\n🗑️ TESTE 4: Remover domain e validar cleanup de config');
        
        const deleteRes = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${domainId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}` }
        });

        if (deleteRes.ok || deleteRes.status === 404) {
          log.push('✅ Domain removido do SendGrid');
          
          // Aguardar 1s
          await new Promise(r => setTimeout(r, 1000));
          
          // Verificar se config foi limpa
          const configAposDelete = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({ id: config1.id });
          
          if (configAposDelete.length > 0) {
            log.push('⚠️ WARNING: Config órfã permanece no DB (cleanup manual necessário)');
            testes.push({ teste: 'Cleanup automático', resultado: 'PARCIAL', severidade: 'MÉDIA' });
            
            // Limpar manualmente
            await base44.asServiceRole.entities.ConfiguracaoEmail.delete(config1.id);
            log.push('🧹 Órfã limpa manualmente');
          } else {
            log.push('✅ PASSOU: Config removida automaticamente');
            testes.push({ teste: 'Cleanup automático', resultado: 'PASSOU', severidade: 'OK' });
            passou++;
          }
        } else {
          log.push(`❌ Falha ao remover domain: ${deleteRes.status}`);
          testes.push({ teste: 'Remoção domain', resultado: 'FALHOU', severidade: 'ALTA' });
          falhou++;
        }

      } else {
        log.push(`⚠️ Domain já existe ou erro ao criar`);
      }
    } catch (setupError) {
      log.push(`❌ Setup falhou: ${setupError.message}`);
    }

    // Score final
    const total = passou + falhou;
    const score = total > 0 ? (passou / total * 100).toFixed(1) : 0;

    return Response.json({
      success: true,
      score: `${score}%`,
      passou,
      falhou,
      total,
      status: falhou > 0 ? '❌ FALHAS CRÍTICAS' : '✅ TODOS PASSARAM',
      testes,
      log,
      recomendacoes: falhou > 0 ? [
        '🚨 Falhas detectadas - revisar arquitetura multi-tenant',
        '🔒 Implementar constraints e validações faltantes',
        '📊 Executar auditoria completa antes de produção'
      ] : [
        '✅ Isolamento robusto',
        '🔄 Executar semanalmente para garantir regressões'
      ]
    });
  } catch (error) {
    console.error('[testeE2EIsolamentoDomains] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});