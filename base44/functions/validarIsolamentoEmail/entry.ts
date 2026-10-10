import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * VALIDAR ISOLAMENTO EMAIL - PREVENIR vazamentos multi-tenant
 * Verifica: configs duplicadas, alias órfãos, emails cross-tenant
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role === 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const testes = [];
    let status = 'pass';

    // TESTE 1: Configs duplicadas por alias
    const todasConfigs = await base44.asServiceRole.entities.ConfiguracaoEmail.list();
    const aliasMap = {};
    
    todasConfigs.forEach(config => {
      if (config.alias_recebimento) {
        if (!aliasMap[config.alias_recebimento]) {
          aliasMap[config.alias_recebimento] = [];
        }
        aliasMap[config.alias_recebimento].push(config);
      }
    });

    const duplicatas = Object.entries(aliasMap).filter(([alias, configs]) => configs.length > 1);
    
    testes.push({
      nome: 'Alias Únicos',
      passou: duplicatas.length === 0,
      detalhes: duplicatas.length === 0 
        ? 'Nenhum alias duplicado' 
        : `${duplicatas.length} alias duplicados detectados`
    });

    if (duplicatas.length > 0) status = 'fail';

    // TESTE 2: Emails enviados sem clinica_id
    const emailsSemClinica = await base44.asServiceRole.entities.SendGridAuditoria.filter({
      clinica_id: { $in: [null, '', 'global'] }
    });

    testes.push({
      nome: 'Emails com clinica_id',
      passou: emailsSemClinica.length === 0,
      detalhes: emailsSemClinica.length === 0 
        ? 'Todos emails têm clinica_id' 
        : `${emailsSemClinica.length} emails sem tenant`
    });

    if (emailsSemClinica.length > 0) status = 'fail';

    // TESTE 3: Tickets sem clinica_id
    const ticketsSemClinica = await base44.asServiceRole.entities.Ticket.filter({
      clinica_id: { $in: [null, ''] }
    });

    testes.push({
      nome: 'Tickets com clinica_id',
      passou: ticketsSemClinica.length === 0,
      detalhes: ticketsSemClinica.length === 0 
        ? 'Todos tickets têm clinica_id' 
        : `${ticketsSemClinica.length} tickets sem tenant`
    });

    if (ticketsSemClinica.length > 0) status = 'fail';

    // TESTE 4: Configs órfãs (clinica_id inexistente)
    const clinicas = await base44.asServiceRole.entities.Clinica.list();
    const clinicaIds = clinicas.map(c => c.id);
    const configsOrfas = todasConfigs.filter(c => 
      c.clinica_id && !clinicaIds.includes(c.clinica_id)
    );

    testes.push({
      nome: 'Configs sem clínica órfã',
      passou: configsOrfas.length === 0,
      detalhes: configsOrfas.length === 0 
        ? 'Nenhuma config órfã' 
        : `${configsOrfas.length} configs com clinica_id inexistente`
    });

    if (configsOrfas.length > 0) status = 'fail';

    // TESTE 5: Cross-tenant (email enviado de clinica A para alias de clinica B)
    const ultimosEmails = await base44.asServiceRole.entities.SendGridAuditoria.list('-created_date', 100);
    const crossTenant = [];

    for (const email of ultimosEmails) {
      if (email.destinatario) {
        const alias = email.destinatario.split('@')[0];
        const configsDestino = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
          alias_recebimento: alias
        });

        if (configsDestino.length > 0 && configsDestino[0].clinica_id !== email.clinica_id) {
          crossTenant.push(email);
        }
      }
    }

    testes.push({
      nome: 'Isolamento Cross-Tenant',
      passou: crossTenant.length === 0,
      detalhes: crossTenant.length === 0 
        ? 'Nenhum vazamento cross-tenant' 
        : `${crossTenant.length} emails entre clínicas diferentes`
    });

    if (crossTenant.length > 0) status = 'fail';

    return Response.json({ status, testes, timestamp: new Date().toISOString() });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});