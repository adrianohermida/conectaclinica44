import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRIAR ASSINATURAS PARA CLÍNICAS SEM PLANO
 * Garante que TODA clínica tem AssinaturaClinica (evita bloqueio total)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();

    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: 'Apenas admins' }, { status: 403 });
    }

    // BUSCAR TODAS CLÍNICAS
    const clinicas = await base44.asServiceRole.entities.Clinica.list('-created_date', 1000);
    
    // BUSCAR TODAS ASSINATURAS
    const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.list('-created_date', 1000);
    
    // IDENTIFICAR CLÍNICAS SEM ASSINATURA
    const clinicasComAssinatura = new Set(assinaturas.map(a => a.clinica_id));
    const clinicasSemAssinatura = clinicas.filter(c => !clinicasComAssinatura.has(c.id));

    if (clinicasSemAssinatura.length === 0) {
      return Response.json({
        success: true,
        mensagem: '✅ Todas as clínicas já têm assinatura',
        total_clinicas: clinicas.length,
        total_assinaturas: assinaturas.length
      });
    }

    // CRIAR ASSINATURA ENTERPRISE PARA CLÍNICAS SEM PLANO
    const novasAssinaturas = clinicasSemAssinatura.map(clinica => ({
      clinica_id: clinica.id,
      clinica_nome: clinica.nome,
      clinica_email: clinica.email || `${clinica.id}@demo.com`,
      plano_slug: 'enterprise', // ACESSO TOTAL
      modulos_inclusos: [
        'dashboard', 'agenda', 'pacientes', 'prontuarios', 
        'produtos', 'atendimento', 'administracao', 'relatorios', 
        'financeiro', 'estoque', 'jornada', 'planos_tratamento', 'analise_ia'
      ],
      status: 'ativa',
      data_inicio: new Date().toISOString().split('T')[0],
      valor_mensal_centavos: 49700,
      limites: {
        max_usuarios: 999,
        max_pacientes: 99999,
        max_agendamentos_mes: 99999,
        creditos_ia_mes: 10000,
        creditos_consulta_mes: 10000,
        storage_gb: 1000
      }
    }));

    await base44.asServiceRole.entities.AssinaturaClinica.bulkCreate(novasAssinaturas);

    return Response.json({
      success: true,
      mensagem: `✅ ${novasAssinaturas.length} assinaturas Enterprise criadas`,
      clinicas_corrigidas: clinicasSemAssinatura.map(c => ({
        id: c.id,
        nome: c.nome
      })),
      total_antes: assinaturas.length,
      total_depois: assinaturas.length + novasAssinaturas.length
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});