import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SECURITY AUDIT: Detecta vazamentos multitenant em tempo real
 * Testa se queries retornam dados de outras clínicas
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const MULTI_TENANT_ENTITIES = [
      'Contato', 'Agendamento', 'Prontuario', 'DocumentoPaciente',
      'Venda', 'Fatura', 'Produto', 'Ticket', 'MensagemInterna',
      'MovimentacaoEstoque', 'ContaReceber', 'ContaPagar'
    ];

    const vulnerabilities = [];
    let totalChecks = 0;
    let totalVulnerabilities = 0;

    // Buscar todas as clínicas
    const clinicas = await base44.asServiceRole.entities.Clinica.list();
    if (clinicas.length < 2) {
      return Response.json({
        message: 'Teste requer pelo menos 2 clínicas. Apenas 1 encontrada.',
        skipped: true
      });
    }

    // Para cada entidade, tentar ler dados de TODAS as clínicas
    for (const entityName of MULTI_TENANT_ENTITIES) {
      try {
        totalChecks++;

        // Teste 1: list() sem filtro (VULNERÁVEL se retornar dados)
        const allData = await base44.asServiceRole.entities[entityName].list();
        
        // Teste 2: Verificar se há mistura de clinicas
        const clinicasPresentes = new Set(allData.map(item => item.clinica_id).filter(Boolean));
        
        if (clinicasPresentes.size > 1) {
          totalVulnerabilities++;
          vulnerabilities.push({
            entity: entityName,
            severity: 'CRITICAL',
            issue: 'vazamento_multitenant',
            description: `${entityName}.list() retorna ${allData.length} registros de ${clinicasPresentes.size} clínicas diferentes`,
            clinicas_afetadas: Array.from(clinicasPresentes),
            count: allData.length,
            lgpd_impact: 'Art. 46 - Vazamento de dados pessoais entre tenants',
            fix: `Implementar Row-Level Security ou forçar filtro clinica_id em TODAS queries de ${entityName}`
          });
        }

      } catch (err) {
        // Entidade pode não existir - OK
        console.log(`[auditMultitenant] Skipped ${entityName}: ${err.message}`);
      }
    }

    return Response.json({
      total_checks: totalChecks,
      total_vulnerabilities: totalVulnerabilities,
      vulnerabilities,
      severity: totalVulnerabilities > 0 ? 'CRITICAL' : 'OK',
      lgpd_risk: totalVulnerabilities > 0 ? 'ALTO - Multa até R$50M (2% faturamento)' : 'Baixo'
    });

  } catch (error) {
    console.error('[auditMultitenant] ❌ ERRO:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});