import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clinicaId = user.clinica_id;
    const mesReferencia = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Buscar consumo atual
    const consumos = await base44.entities.ConsumoRecurso.filter({
      clinica_id: clinicaId,
      mes_referencia: mesReferencia,
      recurso: 'prescricao_eletronica'
    });

    let consumo = consumos[0];

    // Se não existe, criar
    if (!consumo) {
      // Buscar plano da clínica
      const assinaturas = await base44.entities.AssinaturaClinica.filter({
        clinica_id: clinicaId,
        status: 'ativa'
      });

      if (!assinaturas || assinaturas.length === 0) {
        return Response.json({
          permitido: false,
          motivo: 'Clínica sem plano ativo',
          limite: 0,
          usado: 0
        });
      }

      const planoSlug = assinaturas[0].plano_slug;

      // Definir limites por plano
      const limitesPorPlano = {
        'starter': 10,
        'profissional': null, // ilimitado
        'enterprise': null    // ilimitado
      };

      const limite = limitesPorPlano[planoSlug];

      consumo = await base44.entities.ConsumoRecurso.create({
        clinica_id: clinicaId,
        mes_referencia: mesReferencia,
        recurso: 'prescricao_eletronica',
        quantidade_usada: 0,
        limite_plano: limite,
        percentual_uso: 0,
        bloqueado: false,
        ultima_atualizacao: new Date().toISOString(),
        historico_uso: []
      });
    }

    // Verificar se atingiu limite
    const limite = consumo.limite_plano;
    const usado = consumo.quantidade_usada;

    if (limite !== null && usado >= limite) {
      return Response.json({
        permitido: false,
        bloqueado: true,
        motivo: 'Limite mensal atingido',
        limite,
        usado,
        percentual: 100,
        upgrade_necessario: true
      });
    }

    // Calcular percentual
    const percentual = limite !== null ? Math.round((usado / limite) * 100) : 0;

    // Alerta 80%
    const alerta80 = limite !== null && percentual >= 80 && !consumo.alerta_80_enviado;

    return Response.json({
      permitido: true,
      bloqueado: false,
      limite: limite || 'ilimitado',
      usado,
      disponivel: limite !== null ? limite - usado : 'ilimitado',
      percentual,
      alerta_80: alerta80,
      mes_referencia: mesReferencia
    });

  } catch (error) {
    console.error('Erro ao verificar limites:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});