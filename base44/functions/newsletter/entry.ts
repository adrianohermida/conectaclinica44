import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, nome, origem } = await req.json();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return Response.json({ error: 'Email inválido' }, { status: 400 });
    }

    // Check duplicates
    const existe = await base44.asServiceRole.entities.Newsletter.filter({ email });
    if (existe.length > 0) {
      return Response.json({ success: true, message: 'Email já cadastrado' });
    }

    // Create subscription
    await base44.asServiceRole.entities.Newsletter.create({
      email,
      nome: nome || null,
      origem: origem || 'footer',
      ativo: true,
      data_inscricao: new Date().toISOString()
    });

    // Send confirmation
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: 'Bem-vindo à Newsletter ConectaClínica',
      body: `
Olá${nome ? ' ' + nome : ''}!

Você se inscreveu na newsletter da ConectaClínica. 🎉

Você receberá:
- Dicas de gestão clínica
- Novidades sobre IA em saúde
- Updates de funcionalidades
- Conteúdo exclusivo

Para cancelar, responda este email com "Cancelar".

Equipe ConectaClínica
      `.trim()
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});