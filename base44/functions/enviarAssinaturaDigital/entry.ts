import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ENVIAR DOCUMENTO PARA ASSINATURA DIGITAL ICP-BRASIL (Authentique)
 * 
 * Workflow:
 * 1. Validar créditos disponíveis
 * 2. Upload documento para Authentique
 * 3. Criar assinatura com signatários
 * 4. Consumir créditos
 * 5. Retornar link de assinatura
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      documento_compliance_id, // ID do DocumentoCompliance (repositório)
      documento_nome, 
      documento_tipo = 'documento_generico', // CRITICAL: usar 'prescricao_eletronica' quando for prescrição
      arquivo_url, 
      signatarios, // [{ nome, email, action: 'SIGN' }]
      aceite_termo_id 
    } = await req.json();

    // CRITICAL: Validar créditos disponíveis
    const creditos = await base44.asServiceRole.entities.CreditoAssinaturaDigital.filter({
      clinica_id: user.clinica_id,
      ativo: true
    });

    const totalDisponivel = creditos.reduce((sum, c) => {
      return sum + (c.quantidade_adquirida - c.quantidade_utilizada);
    }, 0);

    if (totalDisponivel < 1) {
      return Response.json({ 
        error: 'Créditos insuficientes', 
        creditos_disponiveis: totalDisponivel,
        upgrade_url: '/recarga-creditos'
      }, { status: 402 });
    }

    // Baixar arquivo para upload na Authentique
    const fileResponse = await fetch(arquivo_url);
    const fileBlob = await fileResponse.blob();
    const fileBuffer = await fileBlob.arrayBuffer();

    // Preparar GraphQL mutation para Authentique
    const operations = {
      query: `mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
        createDocument(document: $document, signers: $signers, file: $file) {
          id name created_at
          signatures {
            public_id name email action { name }
            link { short_link }
          }
        }
      }`,
      variables: {
        document: { name: documento_nome },
        signers: signatarios.map(s => ({ email: s.email, action: s.action || 'SIGN' })),
        file: null
      }
    };

    // Criar FormData para Authentique
    const formData = new FormData();
    formData.append('operations', JSON.stringify(operations));
    formData.append('map', JSON.stringify({ file: ['variables.file'] }));
    formData.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), `${documento_nome}.pdf`);

    // Enviar para Authentique
    const authentiqueResponse = await fetch('https://api.autentique.com.br/v2/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('AUTHENTIQUE_API_KEY')}`
      },
      body: formData
    });

    if (!authentiqueResponse.ok) {
      const errorText = await authentiqueResponse.text();
      throw new Error(`Authentique API error: ${errorText}`);
    }

    const result = await authentiqueResponse.json();
    const documento = result.data.createDocument;

    // Consumir créditos (FIFO - First In, First Out)
    const creditoParaUso = creditos.find(c => (c.quantidade_adquirida - c.quantidade_utilizada) > 0);
    if (creditoParaUso) {
      await base44.asServiceRole.entities.CreditoAssinaturaDigital.update(creditoParaUso.id, {
        quantidade_utilizada: creditoParaUso.quantidade_utilizada + 1,
        quantidade_disponivel: creditoParaUso.quantidade_adquirida - creditoParaUso.quantidade_utilizada - 1
      });
    }

    // Registrar log de assinatura
    const log = await base44.asServiceRole.entities.AssinaturaDigitalLog.create({
      clinica_id: user.clinica_id,
      documento_compliance_id: documento_compliance_id || null,
      aceite_termo_id: aceite_termo_id || null,
      documento_tipo,
      documento_nome,
      provider: 'autentique',
      authentique_document_id: documento.id,
      signatarios: documento.signatures.map(sig => ({
        nome: sig.name,
        email: sig.email,
        status: 'pendente',
        link_assinatura: sig.link.short_link
      })),
      arquivo_original_url: arquivo_url,
      credito_utilizado: 1,
      status: 'enviado'
    });

    // Se for aceite de termo, atualizar com assinatura Authentique
    if (aceite_termo_id) {
      await base44.asServiceRole.entities.AceiteTermoLegal.update(aceite_termo_id, {
        timestamp_icp_brasil: {
          provider: 'Authentique',
          document_id: documento.id,
          created_at: documento.created_at,
          signatures: documento.signatures.map(s => ({ email: s.email, link: s.link.short_link }))
        }
      });
    }

    return Response.json({
      success: true,
      documento_id: documento.id,
      log_id: log.id,
      signatarios: documento.signatures.map(sig => ({
        email: sig.email,
        link_assinatura: sig.link.short_link
      })),
      creditos_restantes: totalDisponivel - 1
    });

  } catch (error) {
    console.error('Erro ao enviar assinatura:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});