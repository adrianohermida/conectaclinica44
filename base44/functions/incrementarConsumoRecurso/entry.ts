import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recurso, entidade_vinculada_id, quantidade = 1 } = await req.json();

    if (!recurso) {
      return Response.json({ error: 'recurso obrigatório' }, { status: 400 });
    }

    const clinicaId = user.clinica_id;
    const mesReferencia = new Date().toISOString().slice(0, 7);

    // Buscar consumo existente
    const consumos = await base44.entities.ConsumoRecurso.filter({
      clinica_id: clinicaId,
      mes_referencia: mesReferencia,
      recurso
    });

    let consumo = consumos[0];

    if (!consumo) {
      // Criar se não existe (com limite baseado no plano)
      const assinaturas = await base44.entities.AssinaturaClinica.filter({
        clinica_id: clinicaId,
        status: 'ativa'
      });

      const planoSlug = assinaturas?.[0]?.plano_slug || 'starter';

      const limitesPorPlano = {
        'starter': { 'prescricao_eletronica': 10, 'secretaria_ia': 100, 'assinatura_digital': 5, 'storage_gb': 5 },
        'profissional': { 'prescricao_eletronica': null, 'secretaria_ia': 300, 'assinatura_digital': null, 'storage_gb': 50 },
        'enterprise': { 'prescricao_eletronica': null, 'secretaria_ia': null, 'assinatura_digital': null, 'storage_gb': 500 }
      };

      const limite = limitesPorPlano[planoSlug]?.[recurso] ?? null;

      consumo = await base44.entities.ConsumoRecurso.create({
        clinica_id: clinicaId,
        mes_referencia: mesReferencia,
        recurso,
        quantidade_usada: 0,
        limite_plano: limite,
        percentual_uso: 0,
        bloqueado: false,
        ultima_atualizacao: new Date().toISOString(),
        historico_uso: []
      });
    }

    // Incrementar uso
    const novaQuantidade = consumo.quantidade_usada + quantidade;
    const novoPercentual = consumo.limite_plano !== null 
      ? Math.round((novaQuantidade / consumo.limite_plano) * 100) 
      : 0;

    const novoBloqueado = consumo.limite_plano !== null && novaQuantidade >= consumo.limite_plano;

    // Registrar no histórico
    const novoHistorico = [
      ...(consumo.historico_uso || []).slice(-99), // Manter últimos 99
      {
        data: new Date().toISOString(),
        quantidade_incrementada: quantidade,
        usuario_email: user.email,
        entidade_vinculada_id
      }
    ];

    // Atualizar consumo
    await base44.entities.ConsumoRecurso.update(consumo.id, {
      quantidade_usada: novaQuantidade,
      percentual_uso: novoPercentual,
      bloqueado: novoBloqueado,
      ultima_atualizacao: new Date().toISOString(),
      historico_uso: novoHistorico,
      // Marcar alertas
      alerta_80_enviado: novoPercentual >= 80 ? true : consumo.alerta_80_enviado,
      alerta_100_enviado: novoBloqueado ? true : consumo.alerta_100_enviado
    });

    // Enviar alertas se necessário
    if (novoPercentual >= 80 && !consumo.alerta_80_enviado) {
      try {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: '⚠️ Limite de uso atingindo 80%',
          body: `Você usou ${novoPercentual}% do limite mensal de ${recurso.replace('_', ' ')}. Considere fazer upgrade do plano.`
        });
      } catch (emailError) {
        console.error('Erro ao enviar alerta:', emailError);
      }
    }

    if (novoBloqueado && !consumo.alerta_100_enviado) {
      try {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: '🚫 Limite mensal atingido',
          body: `Você atingiu o limite de ${consumo.limite_plano} ${recurso.replace('_', ' ')} neste mês. Faça upgrade para continuar usando.`
        });
      } catch (emailError) {
        console.error('Erro ao enviar alerta 100%:', emailError);
      }
    }

    return Response.json({
      success: true,
      quantidade_usada: novaQuantidade,
      limite: consumo.limite_plano || 'ilimitado',
      percentual: novoPercentual,
      bloqueado: novoBloqueado,
      alerta_enviado: novoPercentual >= 80
    });

  } catch (error) {
    console.error('Erro ao incrementar consumo:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});