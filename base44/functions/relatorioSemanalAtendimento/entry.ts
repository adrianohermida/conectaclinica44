import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmail } from './services/emailService.js';

/**
 * SPRINT 3: Relatório semanal atendimento
 * MANUAL: Admin clica "Enviar Relatório Semana" (vs CRON segunda 09h)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin' }, { status: 401 });
    }

    const { clinica_id } = await req.json();
    const targetClinica = clinica_id || user.clinica_id;

    const hoje = new Date();
    const semanaAtras = new Date(hoje);
    semanaAtras.setDate(hoje.getDate() - 7);

    // Buscar tickets da semana
    const tickets = await base44.entities.Ticket.filter({
      clinica_id: targetClinica,
      created_date: { $gte: semanaAtras.toISOString() }
    });

    const metricas = {
      total: tickets.length,
      resolvidos: tickets.filter(t => t.status === 'resolvido').length,
      tempo_medio: tickets.reduce((acc, t) => acc + (t.tempo_resolucao || 0), 0) / tickets.length || 0,
      csat_medio: tickets.filter(t => t.csat_score).reduce((acc, t) => acc + t.csat_score, 0) / tickets.filter(t => t.csat_score).length || 0
    };

    const clinica = await base44.entities.Clinica.filter({ id: targetClinica })[0];
    const admins = await base44.entities.User.filter({ clinica_id: targetClinica, role: 'admin' });

    for (const admin of admins) {
      await enviarEmail({
        tipo: 'relatorio_semanal',
        para: admin.email,
        assunto: `Relatório Semanal Atendimento - ${clinica.nome}`,
        variaveis: {
          admin_nome: admin.full_name,
          clinica_nome: clinica.nome,
          periodo: `${semanaAtras.toLocaleDateString('pt-BR')} - ${hoje.toLocaleDateString('pt-BR')}`,
          total_tickets: metricas.total,
          resolvidos: metricas.resolvidos,
          taxa_resolucao: Math.round((metricas.resolvidos / metricas.total) * 100) + '%',
          tempo_medio: Math.round(metricas.tempo_medio) + ' min',
          csat_medio: metricas.csat_medio.toFixed(1)
        }
      });
    }

    return Response.json({
      success: true,
      admins_notificados: admins.length,
      metricas
    });

  } catch (error) {
    console.error('[RelatorioSemanal] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});