import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SPRINT 3: Sync leads/contatos para SendGrid Marketing Contacts
 * Bulk upload GDPR-compliant
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

    if (!targetClinica) {
      return Response.json({ error: 'clinica_id obrigatório' }, { status: 400 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

    // Buscar leads + contatos opt-in
    const [leads, contatos] = await Promise.all([
      base44.entities.LeadSite.filter({ 
        clinica_id: targetClinica,
        aceite_comunicacao: true 
      }),
      base44.entities.Contato.filter({ 
        clinica_id: targetClinica,
        aceite_marketing: true 
      })
    ]);

    // Preparar payload SendGrid
    const contacts = [
      ...leads.map(l => ({
        email: l.email,
        first_name: l.nome?.split(' ')[0],
        last_name: l.nome?.split(' ').slice(1).join(' '),
        custom_fields: {
          origem: l.origem || 'website',
          interesse: l.interesse || 'geral',
          utm_source: l.utm_params?.source,
          clinica_id: targetClinica
        }
      })),
      ...contatos.map(c => ({
        email: c.email,
        first_name: c.nome?.split(' ')[0],
        last_name: c.nome?.split(' ').slice(1).join(' '),
        custom_fields: {
          tipo: c.tipo_contato || 'paciente',
          telefone: c.telefone,
          clinica_id: targetClinica
        }
      }))
    ].filter(c => c.email); // Remove sem email

    // Upload para SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contacts: contacts.slice(0, 1000) // Max 1000 por request
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid sync failed: ${error}`);
    }

    const result = await response.json();

    return Response.json({
      success: true,
      total_sincronizado: contacts.length,
      job_id: result.job_id,
      detalhes: result
    });

  } catch (error) {
    console.error('[SyncContacts] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});