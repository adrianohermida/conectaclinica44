import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // VALIDAÇÃO ASSINATURA HMAC SHA-256
    const signature = req.headers.get('x-autentique-signature');
    const secretKey = Deno.env.get('AUTENTIQUE_SECRET_KEY');
    const rawBody = await req.text();
    
    if (signature && secretKey) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secretKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
      const expectedHex = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (signature !== expectedHex) {
        console.error('[Webhook] ❌ Assinatura inválida');
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    const body = JSON.parse(rawBody);
    console.log('[Autentique Webhook] ✅', JSON.stringify(body, null, 2));

    const base44 = createClientFromRequest(req);
    const { event, data: eventData } = body;

    // Eventos suportados
    const supportedEvents = [
      'document.created',
      'document.updated',
      'document.deleted',
      'document.finished',
      'document.signed',
      'document.refused'
    ];

    if (!supportedEvents.includes(event)) {
      console.log('[Webhook] Evento não suportado:', event);
      return Response.json({ received: true, processed: false, reason: 'unsupported_event' });
    }

    // Registrar todos os eventos (auditoria)
    console.log(`[Webhook] Evento: ${event} | ID: ${eventData?.id}`);

    if (event === 'document.created' || event === 'document.updated') {
      // Log simples de auditoria
      return Response.json({ received: true, processed: true, event: 'logged' });
    }

    if (event === 'document.deleted') {
      // Log de exclusão
      return Response.json({ received: true, processed: true, event: 'deleted_logged' });
    }

    if (event === 'document.finished') {
      // Similar a signed - marcar como concluído
      const documentId = eventData.id;
      const docs = await base44.asServiceRole.entities.ConteudoLegal.list();
      const doc = docs.find(d => d.integracao_esign?.autentique_document_id === documentId);

      if (doc) {
        await base44.asServiceRole.entities.ConteudoLegal.update(doc.id, {
          integracao_esign: {
            ...doc.integracao_esign,
            autentique_status: 'signed'
          }
        });
      }

      return Response.json({ received: true, processed: true });
    }

    if (event === 'document.signed') {
      const documentId = eventData.id;

      // Buscar log de assinatura (compatível com AMBOS fluxos)
      const logs = await base44.asServiceRole.entities.AssinaturaDigitalLog.filter({
        authentique_document_id: documentId
      });
      
      const log = logs[0];
      
      if (!log) {
        console.log(`[Webhook] Log ${documentId} não encontrado`);
        return Response.json({ received: true, processed: false, reason: 'log_not_found' });
      }

      // Idempotência
      if (log.status === 'concluido') {
        console.log(`[Webhook] Evento duplicado ${documentId}`);
        return Response.json({ received: true, processed: false, reason: 'duplicate' });
      }

      // FLUXO 1: ConteudoLegal (termos legais)
      const docs = await base44.asServiceRole.entities.ConteudoLegal.list();
      const doc = docs.find(d => d.integracao_esign?.autentique_document_id === documentId);

      // FLUXO 2: DocumentoCompliance (repositório)
      const docsRepo = await base44.asServiceRole.entities.DocumentoCompliance.filter({
        id: log.documento_compliance_id
      });
      const docRepo = docsRepo[0];

      const apiKey = Deno.env.get('AUTHENTIQUE_API_KEY');
      
      const graphqlQuery = {
        query: `query { document(id: "${documentId}") { id files { signed } signatures { name email created_at } } }`
      };

      const docResponse = await fetch('https://api.autentique.com.br/v2/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(graphqlQuery)
      });

      const docData = await docResponse.json();
      const pdfUrl = docData.data?.document?.files?.signed;

      if (!pdfUrl) {
        throw new Error('PDF não disponível');
      }

      // Retry download (3x exponencial)
      let pdfBuffer;
      let tentativas = 0;
      while (tentativas < 3) {
        try {
          const pdfResponse = await fetch(pdfUrl, { signal: AbortSignal.timeout(30000) });
          if (!pdfResponse.ok) throw new Error('Download falhou');
          pdfBuffer = await pdfResponse.arrayBuffer();
          break;
        } catch (error) {
          tentativas++;
          if (tentativas === 3) throw error;
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, tentativas)));
        }
      }
      
      const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const file = new File([pdfBlob], `assinado_${documentId}.pdf`, { type: 'application/pdf' });
      const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

      // FLUXO 1: Atualizar ConteudoLegal se existir
      if (doc) {
        await base44.asServiceRole.entities.ConteudoLegal.update(doc.id, {
          integracao_esign: {
            ...doc.integracao_esign,
            autentique_status: 'signed',
            pdf_assinado_url: file_url
          }
        });
      }

      // FLUXO 2: Criar novo DocumentoCompliance com PDF assinado (REPOSITÓRIO)
      if (docRepo) {
        await base44.asServiceRole.entities.DocumentoCompliance.create({
          titulo: `${docRepo.titulo} (ASSINADO)`,
          pasta_id: docRepo.pasta_id,
          categoria: docRepo.categoria,
          arquivo_url: file_url,
          tipo_arquivo: 'pdf',
          tamanho_bytes: pdfBuffer.byteLength,
          tags: [...(docRepo.tags || []), 'assinado', 'icp-brasil'],
          versao: 1,
          vinculado_a: docRepo.vinculado_a
        });
      }

      // Atualizar log de assinatura
      await base44.asServiceRole.entities.AssinaturaDigitalLog.update(log.id, {
        signatarios: docData.data?.document?.signatures?.map(s => ({
          nome: s.name,
          email: s.email,
          status: 'assinado',
          data_assinatura: s.created_at
        })) || log.signatarios,
        arquivo_assinado_url: file_url,
        status: 'concluido'
      });

      // Notificar admins da clínica
      const clinicaId = log.clinica_id || doc?.clinica_id || 'global';
      const users = clinicaId === 'global' 
        ? await base44.asServiceRole.entities.User.filter({ role: 'admin' })
        : await base44.asServiceRole.entities.User.filter({ role: 'admin' }); // TODO: filtrar por clinica_id quando disponível

      const nomeDoc = docRepo?.titulo || doc?.titulo_custom || log.documento_nome;
      
      for (const admin of users) {
        await base44.asServiceRole.entities.MensagemInterna.create({
          clinica_id: clinicaId,
          remetente_id: 'system',
          remetente_nome: 'Sistema Autentique',
          destinatario_id: admin.id,
          destinatario_nome: admin.full_name,
          tipo_conversa: 'suporte_tecnico',
          conteudo: `✅ Documento "${nomeDoc}" foi assinado digitalmente e salvo no repositório!`,
          categoria: 'sistema',
          assunto: 'Assinatura Digital Concluída'
        });
      }

      console.log(`[Webhook] ✅ ${documentId} → PDF: ${file_url}`);
      return Response.json({ received: true, processed: true });
    }

    if (event === 'document.refused') {
      const documentId = eventData.id;
      const docs = await base44.asServiceRole.entities.ConteudoLegal.list();
      const doc = docs.find(d => d.integracao_esign?.autentique_document_id === documentId);

      if (doc) {
        await base44.asServiceRole.entities.ConteudoLegal.update(doc.id, {
          integracao_esign: {
            ...doc.integracao_esign,
            autentique_status: 'cancelled'
          }
        });
      }

      return Response.json({ received: true, processed: true });
    }

    return Response.json({ received: true, processed: false, event });
  } catch (error) {
    console.error('[Webhook Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});