import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FORÇA criação de AssinaturaClinica Enterprise para clínica específica
 * USO: Quando popularAssinaturasEnterprise falha silenciosamente
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { clinica_id } = await req.json();

    if (!clinica_id) {
      return Response.json({ error: 'clinica_id obrigatório' }, { status: 400 });
    }

    console.log(`[forceCreateEnterpriseSubscription] Forçando criação para ${clinica_id}`);

    // 1. Buscar clínica
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: clinica_id });
    
    if (clinicas.length === 0) {
      return Response.json({ error: 'Clínica não encontrada' }, { status: 404 });
    }

    const clinica = clinicas[0];

    // 2. Deletar assinatura existente (se houver)
    const existentes = await base44.asServiceRole.entities.AssinaturaClinica.filter({ clinica_id });
    for (const ass of existentes) {
      await base44.asServiceRole.entities.AssinaturaClinica.delete({ id: ass.id });
      console.log(`[forceCreateEnterpriseSubscription] Deletada assinatura antiga ${ass.id}`);
    }

    // 3. Criar nova assinatura Enterprise com wildcard
    const assinatura = await base44.asServiceRole.entities.AssinaturaClinica.create({
      clinica_id: clinica.id,
      clinica_nome: clinica.nome,
      clinica_email: clinica.email || 'sem-email@conectaclinica.com.br',
      plano_slug: 'enterprise',
      modulos_inclusos: ['*'], // WILDCARD TOTAL
      status: 'ativa',
      data_inicio: new Date().toISOString().split('T')[0],
      limites: {
        max_usuarios: 999,
        max_pacientes: 999999,
        max_agendamentos_mes: 999999,
        creditos_ia_mes: 10000,
        creditos_consulta_mes: 10000,
        storage_gb: 500
      },
      uso_atual: {
        usuarios: 0,
        pacientes: 0,
        agendamentos_mes: 0,
        creditos_ia_usados: 0,
        creditos_consulta_usados: 0,
        storage_usado_gb: 0
      }
    });

    console.log(`[forceCreateEnterpriseSubscription] ✅ Criada: ${assinatura.id}`);

    // 4. Validar criação
    const validacao = await base44.asServiceRole.entities.AssinaturaClinica.filter({ clinica_id });

    return Response.json({
      success: true,
      clinica: { id: clinica.id, nome: clinica.nome },
      assinatura_criada: assinatura,
      validacao: validacao.length > 0 ? 'OK' : 'FALHOU',
      total_assinaturas_clinica: validacao.length
    });

  } catch (error) {
    console.error('[forceCreateEnterpriseSubscription] Erro:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});