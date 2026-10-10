import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * VERIFICAR STATUS DE ASSINATURA DIGITAL
 * 
 * Consulta Authentique para verificar se documento foi assinado
 * e baixar arquivo assinado com certificado ICP-Brasil
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { log_id } = await req.json();

    // Buscar log de assinatura
    const logs = await base44.asServiceRole.entities.AssinaturaDigitalLog.filter({ id: log_id });
    if (logs.length === 0) {
      return Response.json({ error: 'Log not found' }, { status: 404 });
    }

    const log = logs[0];

    // Consultar Authentique
    const query = {
      query: `query {
        document(id: "${log.authentique_document_id}") {
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

    const authentiqueResponse = await fetch('https://api.autentique.com.br/v2/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('AUTHENTIQUE_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    });

    if (!authentiqueResponse.ok) {
      throw new Error('Authentique API error');
    }

    const result = await authentiqueResponse.json();
    const documento = result.data.document;

    // Verificar status das assinaturas
    const todasAssinadas = documento.signatures.every(sig => sig.signed !== null);
    const algumaRecusada = documento.signatures.some(sig => sig.rejected !== null);

    let novoStatus = log.status;
    if (algumaRecusada) {
      novoStatus = 'cancelado';
    } else if (todasAssinadas) {
      novoStatus = 'concluido';
    } else if (documento.signatures.some(sig => sig.signed !== null)) {
      novoStatus = 'parcialmente_assinado';
    }

    // Atualizar log
    await base44.asServiceRole.entities.AssinaturaDigitalLog.update(log.id, {
      status: novoStatus,
      arquivo_assinado_url: documento.files.signed || null,
      signatarios: documento.signatures.map(sig => ({
        nome: sig.name,
        email: sig.email,
        status: sig.signed ? 'assinado' : sig.rejected ? 'recusado' : 'pendente',
        data_assinatura: sig.signed?.created_at || null
      })),
      metadata_icp: {
        documento_id: documento.id,
        arquivo_assinado: documento.files.signed,
        timestamp_conclusao: todasAssinadas ? new Date().toISOString() : null
      }
    });

    // Se concluído e for aceite de termo, atualizar
    if (todasAssinadas && log.aceite_termo_id) {
      await base44.asServiceRole.entities.AceiteTermoLegal.update(log.aceite_termo_id, {
        certificado_url: documento.files.signed,
        timestamp_icp_brasil: {
          ...log.timestamp_icp_brasil,
          arquivo_assinado: documento.files.signed,
          concluido_em: new Date().toISOString()
        }
      });
    }

    return Response.json({
      success: true,
      status: novoStatus,
      documento_assinado_url: documento.files.signed,
      signatarios: documento.signatures.map(sig => ({
        email: sig.email,
        status: sig.signed ? 'assinado' : sig.rejected ? 'recusado' : 'pendente',
        data_assinatura: sig.signed?.created_at
      }))
    });

  } catch (error) {
    console.error('Erro ao verificar assinatura:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});