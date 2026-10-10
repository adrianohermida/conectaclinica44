import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, documento_id, versao_target, mudancas } = await req.json();

    if (action === 'criar_versao') {
      const doc = await base44.asServiceRole.entities.ConteudoLegal.get(documento_id);
      
      const [major, minor, patch] = doc.versao.split('.').map(Number);
      const novaVersao = `${major}.${minor}.${patch + 1}`;

      const novoDoc = await base44.asServiceRole.entities.ConteudoLegal.create({
        tipo_documento: doc.tipo_documento,
        versao: novaVersao,
        ativo: false,
        blocos: doc.blocos,
        metadata: {
          autor_id: user.id,
          autor_nome: user.full_name,
          data_criacao: new Date().toISOString(),
          changelog: [
            ...(doc.metadata?.changelog || []),
            {
              versao: novaVersao,
              data: new Date().toISOString(),
              mudancas: mudancas || "Nova versão"
            }
          ]
        },
        integracao_esign: doc.integracao_esign
      });

      return Response.json({ success: true, documento: novoDoc });
    }

    if (action === 'rollback') {
      const docs = await base44.asServiceRole.entities.ConteudoLegal.filter({
        tipo_documento: await base44.asServiceRole.entities.ConteudoLegal.get(documento_id).then(d => d.tipo_documento),
        versao: versao_target
      });

      if (docs.length === 0) {
        return Response.json({ error: 'Versão não encontrada' }, { status: 404 });
      }

      const docAntigo = docs[0];

      // Desativar todas as versões
      const todasVersoes = await base44.asServiceRole.entities.ConteudoLegal.filter({
        tipo_documento: docAntigo.tipo_documento,
        ativo: true
      });

      await Promise.all(
        todasVersoes.map(d => 
          base44.asServiceRole.entities.ConteudoLegal.update(d.id, { ativo: false })
        )
      );

      // Ativar versão target
      await base44.asServiceRole.entities.ConteudoLegal.update(docAntigo.id, { ativo: true });

      return Response.json({ success: true, documento: docAntigo });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});