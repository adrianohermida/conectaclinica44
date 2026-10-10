import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assunto, corpo } = await req.json();

    const inscritos = await base44.asServiceRole.entities.Newsletter.filter({ ativo: true });
    
    let enviados = 0;
    for (const inscrito of inscritos) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: inscrito.email,
          subject: assunto,
          body: corpo
        });
        enviados++;
      } catch (e) {
        console.error(`Erro ao enviar para ${inscrito.email}:`, e.message);
      }
    }

    return Response.json({ 
      success: true, 
      total: inscritos.length, 
      enviados 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});