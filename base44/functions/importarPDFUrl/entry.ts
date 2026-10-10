import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, titulo, pasta_id } = await req.json();

    if (!url) {
      return Response.json({ error: 'URL obrigatória' }, { status: 400 });
    }

    // Validar URL
    try {
      new URL(url);
    } catch {
      return Response.json({ error: 'URL inválida' }, { status: 400 });
    }

    // Fazer download do arquivo
    const response = await fetch(url);
    if (!response.ok) {
      return Response.json({ error: 'Erro ao baixar arquivo' }, { status: 400 });
    }

    const contentType = response.headers.get('content-type');
    const blob = await response.blob();
    
    // Detectar extensão
    let ext = 'pdf';
    if (contentType?.includes('pdf')) ext = 'pdf';
    else if (contentType?.includes('html')) ext = 'html';
    else if (contentType?.includes('csv')) ext = 'csv';
    else if (contentType?.includes('text')) ext = 'txt';
    
    // Criar file a partir do blob
    const file = new File([blob], `${titulo || 'documento'}.${ext}`, { type: contentType || 'application/pdf' });

    // Upload para storage
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Criar documento
    const documento = await base44.entities.DocumentoCompliance.create({
      titulo: titulo || new URL(url).pathname.split('/').pop().replace(/\.[^/.]+$/, ""),
      pasta_id: pasta_id || null,
      categoria: 'outros',
      arquivo_url: file_url,
      tipo_arquivo: ext,
      tamanho_bytes: blob.size,
      tags: ['importado_url'],
      indexado: false,
      versao: 1,
      url_origem: url
    });

    // Indexar em background
    setTimeout(() => {
      base44.functions.invoke('indexarDocumentoIA', { documento_id: documento.id }).catch(() => {});
    }, 1000);

    return Response.json({
      success: true,
      documento_id: documento.id,
      titulo: documento.titulo,
      arquivo_url: file_url
    });
  } catch (error) {
    console.error('Erro ao importar PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});