import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documento_id } = await req.json();
    const doc = await base44.asServiceRole.entities.ConteudoLegal.get(documento_id);

    if (!doc.integracao_esign?.autentique_document_id) {
      return Response.json({ error: 'Documento não possui ID Autentique' }, { status: 400 });
    }

    const apiKey = Deno.env.get('AUTHENTIQUE_API_KEY');
    
    const graphqlQuery = {
      query: `query {
        document(id: "${doc.integracao_esign.autentique_document_id}") {
          id name created_at
          files { original signed }
          signatures {
            public_id name email created_at
            action { name }
            viewed { created_at }
            signed { created_at }
            rejected { created_at }
          }
        }
      }`
    };

    const response = await fetch('https://api.autentique.com.br/v2/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(graphqlQuery)
    });

    if (!response.ok) {
      throw new Error('Erro ao consultar Autentique');
    }

    const result = await response.json();
    const documentData = result.data?.document;

    const todasAssinadas = documentData.signatures.every(s => s.signed);
    const algumaRecusada = documentData.signatures.some(s => s.rejected);
    
    const status = algumaRecusada ? 'cancelled' : (todasAssinadas ? 'signed' : 'pending');

    await base44.asServiceRole.entities.ConteudoLegal.update(documento_id, {
      integracao_esign: {
        ...doc.integracao_esign,
        autentique_status: status
      }
    });

    return Response.json({ 
      success: true,
      status,
      document: documentData
    });
  } catch (error) {
    console.error('[Sync Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});