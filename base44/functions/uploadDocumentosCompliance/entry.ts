import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Upload batch de documentos compliance
 * Otimizado para grandes volumes (até 50 arquivos/vez)
 * Retorna progresso real + erros específicos
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll('files');
    const categorias = formData.getAll('categorias'); // Array paralelo
    const titulos = formData.getAll('titulos'); // Array paralelo
    
    if (files.length === 0) {
      return Response.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }
    
    if (files.length > 50) {
      return Response.json({ error: 'Máximo 50 arquivos por lote' }, { status: 400 });
    }

    const resultados = [];
    const erros = [];

    // Processar batch (paralelo para performance)
    const promises = files.map(async (file, idx) => {
      try {
        const categoria = categorias[idx] || 'outros';
        const titulo = titulos[idx] || file.name;

        // Validar tipo
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['pdf', 'docx', 'html', 'csv', 'txt'].includes(ext)) {
          throw new Error(`Tipo inválido: ${ext}`);
        }

        // Upload Core
        const { data } = await base44.integrations.Core.UploadFile({ file });
        
        if (!data?.file_url) {
          throw new Error('Falha no upload');
        }

        // Criar registro
        const doc = await base44.entities.DocumentoCompliance.create({
          titulo,
          categoria,
          arquivo_url: data.file_url,
          tipo_arquivo: ext,
          tamanho_bytes: file.size,
          tags: [],
          descricao: '',
          indexado: false
        });

        return {
          success: true,
          arquivo: file.name,
          doc_id: doc.id,
          categoria,
          tamanho: file.size
        };
      } catch (error) {
        return {
          success: false,
          arquivo: file.name,
          erro: error.message
        };
      }
    });

    const results = await Promise.all(promises);
    
    const sucessos = results.filter(r => r.success);
    const falhas = results.filter(r => !r.success);

    return Response.json({
      success: true,
      total: files.length,
      sucessos: sucessos.length,
      falhas: falhas.length,
      resultados: results,
      tempo_processamento: Date.now()
    });

  } catch (error) {
    console.error('[uploadDocumentosCompliance] ERRO:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});