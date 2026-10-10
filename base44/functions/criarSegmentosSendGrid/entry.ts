import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SPRINT 3: Criar 3 segmentos inteligentes SendGrid
 * Hot leads, inativos 30d, sem consulta 60d
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin' }, { status: 401 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

    const segmentos = [
      {
        name: 'Hot Leads - Alta Conversão',
        query_dsl: 'interesse = "agendamento" AND origem = "website" AND DAYS_SINCE(created_at) <= 7'
      },
      {
        name: 'Pacientes Inativos 30d',
        query_dsl: 'tipo = "paciente" AND DAYS_SINCE(ultima_consulta) >= 30'
      },
      {
        name: 'Leads Sem Retorno 60d',
        query_dsl: 'tipo = "lead" AND DAYS_SINCE(created_at) >= 60 AND status = "novo"'
      }
    ];

    const criados = [];
    const erros = [];

    for (const seg of segmentos) {
      try {
        const response = await fetch('https://api.sendgrid.com/v3/marketing/segments/2.0', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: seg.name,
            query_dsl: seg.query_dsl
          })
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const result = await response.json();
        criados.push({ nome: seg.name, id: result.id });

      } catch (error) {
        erros.push({ nome: seg.name, error: error.message });
      }
    }

    return Response.json({
      success: true,
      criados: criados.length,
      erros: erros.length,
      detalhes: { criados, erros }
    });

  } catch (error) {
    console.error('[CriarSegmentos] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});