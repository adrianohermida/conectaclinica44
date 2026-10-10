import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Fix Broken Links - Corrige automaticamente links quebrados
 * Analisa código e aplica correções via prompts executáveis
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('[fixBrokenLinks] Iniciando correção automática...');

    // 1. BUSCAR LINKS QUEBRADOS
    const issues = await base44.asServiceRole.entities.RouteIssue.filter({ 
      type: 'rota_quebrada', 
      status: 'open' 
    });

    if (issues.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'Nenhum link quebrado detectado',
        fixes: []
      });
    }

    // 2. FETCH CÓDIGO DAS PÁGINAS COM LINKS QUEBRADOS
    const APP_ID = '6933153160425a5bbedbcb87';
    const API_KEY = Deno.env.get('BASE44_API_KEY');
    const baseUrl = `https://api.base44.com/v1/apps/${APP_ID}`;
    const headers = {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    };

    const fixes = [];

    for (const issue of issues.slice(0, 10)) {
      const pageName = issue.node_path?.replace('/', '');
      if (!pageName) continue;

      try {
        // Fetch código
        const fileRes = await fetch(`${baseUrl}/files/pages/${pageName}.jsx`, { headers });
        if (!fileRes.ok) continue;
        
        const code = await fileRes.text();

        // Extrair destino quebrado
        const brokenPath = issue.description.match(/para "([^"]+)"/)?.[1];
        if (!brokenPath) continue;

        // Detectar tipo de link (Link, navigate, createPageUrl)
        const linkPatterns = [
          { pattern: new RegExp(`to=\\{createPageUrl\\(["']${brokenPath.replace('/', '')}["']\\)\\}`, 'g'), type: 'Link' },
          { pattern: new RegExp(`navigate\\(createPageUrl\\(["']${brokenPath.replace('/', '')}["']\\)\\)`, 'g'), type: 'navigate' },
          { pattern: new RegExp(`href=["']${brokenPath}["']`, 'g'), type: 'href' }
        ];

        let foundPattern = null;
        for (const { pattern, type } of linkPatterns) {
          if (pattern.test(code)) {
            foundPattern = { pattern, type };
            break;
          }
        }

        if (!foundPattern) continue;

        // Gerar prompt de correção
        const fixPrompt = `Arquivo: pages/${pageName}.jsx
Problema: Link quebrado para "${brokenPath}"
Ação: Remover link ou atualizar para rota válida
Tipo: ${foundPattern.type}

Prompt Base44: 
"Em pages/${pageName}.jsx, localize e remova ou atualize o link para '${brokenPath}'. Se a funcionalidade for crítica, crie a página de destino. Caso contrário, remova o link."`;

        fixes.push({
          page: pageName,
          broken_link: brokenPath,
          link_type: foundPattern.type,
          fix_prompt: fixPrompt,
          issue_id: issue.id
        });

        // Atualizar issue com prompt
        await base44.asServiceRole.entities.RouteIssue.update(issue.id, {
          ai_prompt: fixPrompt,
          status: 'in_progress'
        });

      } catch (e) {
        console.warn(`[fixBrokenLinks] Erro ao processar ${pageName}:`, e.message);
      }
    }

    console.log(`[fixBrokenLinks] ✅ ${fixes.length} correções geradas`);

    return Response.json({
      success: true,
      fixes_generated: fixes.length,
      fixes,
      message: `${fixes.length} prompts de correção gerados. Execute manualmente ou via Base44.`
    });

  } catch (error) {
    console.error('[fixBrokenLinks] Erro:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});