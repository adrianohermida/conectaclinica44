import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SPRINT 4: Criar 3 Unsubscribe Groups LGPD-compliant
 * Marketing, Transacional, Alertas (opt-out granular)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin' }, { status: 401 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

    const groups = [
      {
        name: 'Marketing e Campanhas',
        description: 'Emails promocionais, newsletters e campanhas comerciais',
        is_default: false
      },
      {
        name: 'Alertas Operacionais',
        description: 'Lembretes de consultas, vencimentos e alertas de sistema',
        is_default: false
      },
      {
        name: 'Compliance e Segurança',
        description: 'Termos LGPD, certidões, auditoria (opt-out limitado)',
        is_default: false
      }
    ];

    const criados = [];
    const erros = [];

    for (const group of groups) {
      try {
        const response = await fetch('https://api.sendgrid.com/v3/asm/groups', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(group)
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const result = await response.json();
        criados.push({ nome: group.name, id: result.id });

      } catch (error) {
        erros.push({ nome: group.name, error: error.message });
      }
    }

    return Response.json({
      success: true,
      criados: criados.length,
      erros: erros.length,
      detalhes: { criados, erros },
      instrucoes: 'Salvar IDs dos grupos como env vars: SENDGRID_MARKETING_UNSUBSCRIBE_GROUP, SENDGRID_ALERTAS_UNSUBSCRIBE_GROUP, SENDGRID_COMPLIANCE_UNSUBSCRIBE_GROUP'
    });

  } catch (error) {
    console.error('[UnsubscribeGroups] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});