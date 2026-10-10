import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, tipo } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token obrigatório' }, { status: 400 });
    }

    // PÚBLICO: Não requer autenticação - usar service role
    if (tipo === 'pasta') {
      const pastas = await base44.asServiceRole.entities.PastaCompliance.filter({ 
        token_compartilhamento: token,
        compartilhamento_publico: true
      });

      if (!pastas || pastas.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'Link inválido ou revogado' 
        }, { status: 404 });
      }

      const pasta = pastas[0];
      
      // Buscar documentos da pasta
      const documentos = await base44.asServiceRole.entities.DocumentoCompliance.filter({
        pasta_id: pasta.id
      });

      return Response.json({
        success: true,
        item: pasta,
        documentos: documentos || []
      });
    } else {
      // Documento
      const documentos = await base44.asServiceRole.entities.DocumentoCompliance.filter({
        token_compartilhamento: token,
        compartilhamento_publico: true
      });

      if (!documentos || documentos.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'Link inválido ou revogado' 
        }, { status: 404 });
      }

      return Response.json({
        success: true,
        item: documentos[0]
      });
    }
  } catch (error) {
    console.error('[Compartilhamento] Erro:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});