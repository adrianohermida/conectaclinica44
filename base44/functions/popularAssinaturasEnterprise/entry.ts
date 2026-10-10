import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 1. Buscar TODAS as clínicas
    const clinicas = await base44.asServiceRole.entities.Clinica.list();
    console.log(`[popularAssinaturasEnterprise] ${clinicas.length} clínicas encontradas`);

    // 2. Buscar assinaturas existentes
    const assinaturasExistentes = await base44.asServiceRole.entities.AssinaturaClinica.list();
    const clinicasComAssinatura = new Set(assinaturasExistentes.map(a => a.clinica_id));
    
    console.log(`[popularAssinaturasEnterprise] ${assinaturasExistentes.length} assinaturas existentes`);

    // 3. Identificar clínicas SEM assinatura
    const clinicasSemAssinatura = clinicas.filter(c => !clinicasComAssinatura.has(c.id));
    console.log(`[popularAssinaturasEnterprise] ${clinicasSemAssinatura.length} clínicas SEM assinatura`);

    // 4. Criar assinaturas Enterprise para todas
    const criadas = [];
    for (const clinica of clinicasSemAssinatura) {
      const assinatura = {
        clinica_id: clinica.id,
        clinica_nome: clinica.nome,
        clinica_email: clinica.email || clinica.responsavel_financeiro_email || 'sem-email@conectaclinica.com.br',
        plano_slug: 'enterprise',
        modulos_inclusos: ['*'], // WILDCARD = TUDO
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
      };

      const result = await base44.asServiceRole.entities.AssinaturaClinica.create(assinatura);
      criadas.push(result);
      console.log(`[popularAssinaturasEnterprise] ✅ Criada assinatura Enterprise para ${clinica.nome}`);
    }

    return Response.json({
      success: true,
      total_clinicas: clinicas.length,
      com_assinatura_antes: assinaturasExistentes.length,
      criadas_agora: criadas.length,
      assinaturas: criadas
    });

  } catch (error) {
    console.error('[popularAssinaturasEnterprise] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});