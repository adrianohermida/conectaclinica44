import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRÍTICO: Adiciona domínio próprio para clínica específica
 * Isolamento: cada clínica tem SEU domínio, não compartilhado
 */
Deno.serve(async (req) => {
  console.log('[adicionarDominioClinica] 🚀 INICIANDO');
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    console.log('[adicionarDominioClinica] 👤 User:', user?.email);
    
    if (!user) {
      console.error('[adicionarDominioClinica] ❌ Unauthorized');
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { domain, clinica_id } = body;
    
    console.log('[adicionarDominioClinica] 📥 Domain:', domain, 'Clínica:', clinica_id);
    
    if (!domain || !clinica_id) {
      console.error('[adicionarDominioClinica] ❌ Params faltando');
      return Response.json({ success: false, error: 'domain e clinica_id obrigatórios' }, { status: 400 });
    }

    // 🔒 CRÍTICO: Bloquear domain já usado por OUTRA clínica (isolamento multi-tenant)
    const configsExistentes = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      dkim_domain: domain
    });
    
    const dominioOutraClinica = configsExistentes.find(c => c.clinica_id !== clinica_id);
    if (dominioOutraClinica) {
      console.error('[adicionarDominioClinica] 🚨 VIOLAÇÃO: Domain já usado por clínica', dominioOutraClinica.clinica_id);
      return Response.json({ 
        success: false, 
        error: 'Domain já está sendo usado por outra clínica',
        violacao_multitenant: true,
        clinica_conflito: dominioOutraClinica.clinica_id
      }, { status: 409 });
    }
    
    // CRÍTICO: Validar formato do domínio
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i.test(domain)) {
      console.error('[adicionarDominioClinica] ❌ Formato inválido:', domain);
      return Response.json({ success: false, error: 'Formato de domínio inválido' }, { status: 400 });
    }

    // Validar acesso à clínica
    if (user.role !== 'admin' && user.clinica_id !== clinica_id) {
      console.error('[adicionarDominioClinica] ❌ Sem permissão');
      return Response.json({ success: false, error: 'Sem permissão' }, { status: 403 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      console.error('[adicionarDominioClinica] ❌ SENDGRID_API_KEY não configurada');
      return Response.json({ success: false, error: 'SENDGRID_API_KEY não configurada' }, { status: 500 });
    }

    console.log('[adicionarDominioClinica] ✅ Validações OK, iniciando integração SendGrid');

    // CRÍTICO: Verificar se domínio já existe no SendGrid
    let existingDomains = [];
    try {
      const listRes = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`
        }
      });

      if (listRes.ok) {
        existingDomains = await listRes.json();
        console.log('[adicionarDominioClinica] 📋 Domínios existentes:', existingDomains.length);
        
        const domainExists = existingDomains.find(d => d.domain === domain);
        
        if (domainExists) {
          console.log('[adicionarDominioClinica] ℹ️ Domínio já existe:', domainExists.id);
          
          // Buscar clínica
          const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: clinica_id });
          const clinica = clinicas[0];
          
          if (!clinica) {
            return Response.json({ success: false, error: 'Clínica não encontrada' }, { status: 404 });
          }
          
          // CRÍTICO: Verificar se domain JÁ vinculado a OUTRA clínica
          const allConfigs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
            dkim_domain_id: String(domainExists.id),
            provedor: 'dominio_proprio'
          });

          const configOutraClinica = allConfigs.find(c => c.clinica_id !== clinica_id);
          
          if (configOutraClinica) {
            console.error('[adicionarDominioClinica] ❌ Domain já vinculado:', configOutraClinica.clinica_id);
            
            // AUDIT: Tentativa de reatribuir domain BLOQUEADA
            await base44.asServiceRole.entities.LogAuditoria.create({
              clinica_id: clinica_id,
              tipo_operacao: 'tentar_reatribuir_domain',
              usuario_id: user.id,
              usuario_email: user.email,
              entidade_afetada: 'ConfiguracaoEmail',
              entidade_id: configOutraClinica.id,
              detalhes: {
                domain: domain,
                domain_id: domainExists.id,
                clinica_tentou: clinica_id,
                clinica_atual: configOutraClinica.clinica_id,
                acao: 'bloqueado_conflito'
              },
              sucesso: false,
              erro: 'Domain já vinculado a outra clínica'
            });
            
            return Response.json({ 
              success: false, 
              error: `Domain já vinculado à outra clínica. Use "Sincronizar" para reatribuir.`,
              clinica_atual: configOutraClinica.clinica_id
            });
          }

          // CRÍTICO: Extrair slug da clínica para alias
          const aliasPrefix = clinica.slug || clinica.nome?.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          const configData = {
            dkim_domain: domain,
            dkim_domain_id: String(domainExists.id),
            dkim_status: domainExists.valid ? 'verificado' : 'pendente',
            email_remetente: `contato@${domain}`,
            nome_remetente: clinica.nome,
            alias_recebimento: `${aliasPrefix}@conectaclinica.com.br` // AUTO-GERAR ALIAS
          };

          // Buscar config DESTA clínica
          const configEstaClinica = allConfigs.find(c => c.clinica_id === clinica_id);

          if (configEstaClinica) {
            await base44.asServiceRole.entities.ConfiguracaoEmail.update(configEstaClinica.id, configData);
            
            // AUDIT: Atualização de config existente
            await base44.asServiceRole.entities.LogAuditoria.create({
              clinica_id,
              tipo_operacao: 'atualizar_domain_config',
              usuario_id: user.id,
              usuario_email: user.email,
              entidade_afetada: 'ConfiguracaoEmail',
              entidade_id: configEstaClinica.id,
              detalhes: {
                domain: domain,
                domain_id: domainExists.id,
                verificado: domainExists.valid,
                acao: 'config_atualizada'
              },
              sucesso: true
            });
          } else {
            const newConfig = await base44.asServiceRole.entities.ConfiguracaoEmail.create({
              clinica_id,
              provedor: 'dominio_proprio',
              ...configData,
              ativo: domainExists.valid
            });
            
            // AUDIT: Vinculação de domain existente (órfão)
            await base44.asServiceRole.entities.LogAuditoria.create({
              clinica_id,
              tipo_operacao: 'vincular_domain_existente',
              usuario_id: user.id,
              usuario_email: user.email,
              entidade_afetada: 'ConfiguracaoEmail',
              entidade_id: newConfig.id,
              detalhes: {
                domain: domain,
                domain_id: domainExists.id,
                verificado: domainExists.valid,
                acao: 'domain_orfao_vinculado'
              },
              sucesso: true
            });
          }

          console.log('[adicionarDominioClinica] ✅ Config atualizada para domínio existente');

          return Response.json({
            success: true,
            domain_id: String(domainExists.id),
            domain,
            dns_records: domainExists.dns,
            already_exists: true,
            verified: domainExists.valid
          });
        }
      } else {
        const error = await listRes.text();
        console.error('[adicionarDominioClinica] ❌ Erro ao listar domínios:', error);
      }
    } catch (listError) {
      console.error('[adicionarDominioClinica] ⚠️ Erro ao verificar domínios existentes:', listError.message);
      // Continua para criar novo
    }

    // Adicionar novo domínio no SendGrid
    const res = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain,
        subdomain: 'mail',
        automatic_security: false,
        default: false,
        custom_spf: true
      })
    });

    let sendgridDomain;
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[adicionarDominioClinica] ❌ SendGrid error:', errorText);
      
      // CRITICAL: Se erro de duplicata, buscar domínio existente
      let errorObj;
      try {
        errorObj = JSON.parse(errorText);
      } catch {
        throw new Error(`SendGrid API error: ${errorText}`);
      }
      
      const isDuplicate = errorObj.errors?.some(e => 
        e.message?.toLowerCase().includes('already exists') ||
        e.message?.toLowerCase().includes('unique subdomain')
      );
      
      if (isDuplicate) {
        console.log('[adicionarDominioClinica] 🔄 Domínio duplicado, buscando...');
        
        const retryList = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
          headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}` }
        });
        
        if (retryList.ok) {
          const domains = await retryList.json();
          const found = domains.find(d => d.domain === domain);
          
          if (found) {
            console.log('[adicionarDominioClinica] ✅ Encontrado:', found.id);
            sendgridDomain = found;
          } else {
            throw new Error('Domínio já existe mas não foi encontrado');
          }
        } else {
          throw new Error('Domínio existe mas busca falhou');
        }
      } else {
        throw new Error(`SendGrid API error: ${errorText}`);
      }
    } else {
      sendgridDomain = await res.json();
    }
    
    console.log('[adicionarDominioClinica] ✅ Domínio OK:', sendgridDomain.id);
    console.log('[adicionarDominioClinica] ✅ Domínio criado:', sendgridDomain.id);

    // Buscar dados da clínica para campos obrigatórios
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: clinica_id });
    const clinica = clinicas[0];
    
    if (!clinica) {
      throw new Error('Clínica não encontrada');
    }

    // CRÍTICO: Verificar se domain JÁ vinculado a OUTRA clínica ANTES de criar
    const allConfigs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      dkim_domain_id: String(sendgridDomain.id),
      provedor: 'dominio_proprio'
    });

    const configOutraClinica = allConfigs.find(c => c.clinica_id !== clinica_id);
    
    if (configOutraClinica) {
      console.log('[adicionarDominioClinica] ❌ Conflito - domain já vinculado:', configOutraClinica.clinica_id);
      return Response.json({ 
        success: false, 
        error: `Domain já vinculado à outra clínica. Remova primeiro ou use função de reatribuição.`,
        clinica_atual: configOutraClinica.clinica_id
      });
    }

    // CRÍTICO: Extrair slug da clínica para alias
    const aliasPrefix = clinica.slug || clinica.nome?.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const configData = {
      dkim_domain: domain,
      dkim_domain_id: String(sendgridDomain.id),
      dkim_status: 'pendente',
      email_remetente: `contato@${domain}`,
      nome_remetente: clinica.nome || 'Clínica',
      alias_recebimento: `${aliasPrefix}@conectaclinica.com.br` // AUTO-GERAR ALIAS
    };

    // Buscar config DESTA clínica para este domain_id
    const configEstaClinica = allConfigs.find(c => c.clinica_id === clinica_id);

    if (configEstaClinica) {
      // Atualizar existente
      await base44.asServiceRole.entities.ConfiguracaoEmail.update(configEstaClinica.id, configData);
      
      // AUDIT: Atualizar domain
      await base44.asServiceRole.entities.LogAuditoria.create({
        clinica_id,
        tipo_operacao: 'atualizar_domain_novo',
        usuario_id: user.id,
        usuario_email: user.email,
        entidade_afetada: 'ConfiguracaoEmail',
        entidade_id: configEstaClinica.id,
        detalhes: {
          domain,
          domain_id: String(sendgridDomain.id),
          acao: 'domain_criado_no_sendgrid_config_atualizada'
        },
        sucesso: true
      });
    } else {
      // Criar novo
      const newConfig = await base44.asServiceRole.entities.ConfiguracaoEmail.create({
        clinica_id,
        provedor: 'dominio_proprio',
        ...configData,
        ativo: false
      });
      
      // AUDIT: Criar config para novo domain
      await base44.asServiceRole.entities.LogAuditoria.create({
        clinica_id,
        tipo_operacao: 'criar_domain_config',
        usuario_id: user.id,
        usuario_email: user.email,
        entidade_afetada: 'ConfiguracaoEmail',
        entidade_id: newConfig.id,
        detalhes: {
          domain,
          domain_id: String(sendgridDomain.id),
          acao: 'domain_criado_no_sendgrid_config_nova'
        },
        sucesso: true
      });
    }

    // AUTO-CONFIGURAR INBOUND PARSE direto na API SendGrid
    try {
      const subdomain = `mail.${domain}`;
      console.log('[adicionarDominioClinica] 📥 Auto-config Inbound Parse:', subdomain);
      
      const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
      const token = Deno.env.get('SENDGRID_WEBHOOK_VALIDATION_TOKEN');
      const baseUrl = Deno.env.get('BASE44_BASE_URL');
      const appId = Deno.env.get('BASE44_APP_ID');
      const webhookUrl = `${baseUrl}/api/apps/${appId}/functions/webhookReceberEmail?token=${token}`;
      
      // Verificar se já existe
      const checkRes = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
        headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}` }
      });
      
      if (checkRes.ok) {
        const existing = await checkRes.json();
        const alreadyExists = existing.result?.some(s => s.hostname === subdomain);
        
        if (!alreadyExists) {
          const createRes = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              hostname: subdomain,
              url: webhookUrl,
              spam_check: true,
              send_raw: false
            })
          });
          
          if (createRes.ok) {
            console.log('[adicionarDominioClinica] ✅ Inbound Parse configurado');
            
            const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
              clinica_id,
              dkim_domain_id: String(sendgridDomain.id)
            });
            
            if (configs[0]) {
              await base44.asServiceRole.entities.ConfiguracaoEmail.update(configs[0].id, {
                inbound_parse_configurado: true
              });
            }
          }
        }
      }
    } catch (inboundError) {
      console.warn('[adicionarDominioClinica] ⚠️ Skip Inbound Parse:', inboundError.message);
    }

    return Response.json({
      success: true,
      domain_id: String(sendgridDomain.id),
      domain,
      dns_records: sendgridDomain.dns,
      inbound_parse_auto_configured: true
    });
  } catch (error) {
    console.error('[adicionarDominioClinica] ❌ ERRO CRÍTICO:', error);
    console.error('[adicionarDominioClinica] Stack:', error.stack);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro desconhecido'
    }, { status: 500 });
  }
});