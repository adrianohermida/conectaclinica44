import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documento_id } = await req.json();
    const doc = await base44.asServiceRole.entities.ConteudoLegal.get(documento_id);

    const htmlCompleto = doc.blocos
      .filter(b => b.visivel)
      .sort((a, b) => a.ordem - b.ordem)
      .map(bloco => `<h2>${bloco.titulo}</h2>${bloco.conteudo_html}`)
      .join('\n');

    const nomeDocumento = doc.titulo_custom || doc.categoria_custom || 'Documento Legal';

    const htmlFinal = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${nomeDocumento}</title>
<style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto}
h1{color:#081828;font-size:28px;margin-bottom:20px}
h2{color:#202124;font-size:20px;margin-top:30px;margin-bottom:15px}
p,li{color:#5f6368;line-height:1.6}</style></head><body>
<h1>${nomeDocumento}</h1>
<p><strong>Versão:</strong> ${doc.versao} | <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
<hr style="margin:30px 0;border:none;border-top:2px solid #e8eaed">
${htmlCompleto}</body></html>`;

    const apiKey = Deno.env.get('AUTHENTIQUE_API_KEY');
    
    const signers = doc.integracao_esign?.tipo_aceite === 'esign_bilateral' 
      ? [
          { email: user.email, action: 'SIGN' },
          ...(doc.integracao_esign?.signatarios_fixos || []).map(email => ({ email, action: 'SIGN' }))
        ]
      : [{ email: user.email, action: 'SIGN' }];

    const operations = {
      query: `mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
        createDocument(document: $document, signers: $signers, file: $file) {
          id name signatures { public_id email link { short_link } }
        }
      }`,
      variables: {
        document: { name: `${nomeDocumento} - v${doc.versao}` },
        signers,
        file: null
      }
    };

    const formData = new FormData();
    formData.append('operations', JSON.stringify(operations));
    formData.append('map', JSON.stringify({ file: ['variables.file'] }));
    formData.append('file', new Blob([htmlFinal], { type: 'text/html' }), 'documento.html');

    const response = await fetch('https://api.autentique.com.br/v2/graphql', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Autentique API error: ${error}`);
    }

    const result = await response.json();
    const documentData = result.data?.createDocument;

    if (!documentData) {
      throw new Error('Falha ao criar documento no Autentique');
    }

    await base44.asServiceRole.entities.ConteudoLegal.update(documento_id, {
      integracao_esign: {
        ...doc.integracao_esign,
        autentique_document_id: documentData.id,
        autentique_status: 'pending'
      }
    });

    await base44.asServiceRole.entities.AssinaturaDigitalLog.create({
      clinica_id: user.clinica_id || 'global',
      documento_tipo: 'termo_legal',
      documento_nome: nomeDocumento,
      provider: 'autentique',
      autentique_document_id: documentData.id,
      signatarios: documentData.signatures.map(s => ({
        email: s.email,
        status: 'pendente'
      })),
      status: 'enviado'
    });

    return Response.json({ 
      success: true, 
      document_id: documentData.id,
      signatures: documentData.signatures
    });
  } catch (error) {
    console.error('[Autentique Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});