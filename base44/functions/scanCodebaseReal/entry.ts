import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AST Collector REAL - Escaneia projeto via Base44 API
 * Mapeia TODAS pages, entities, functions e suas dependências
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('[scanCodebaseReal] Iniciando SCAN REAL via Base44 API...');

    const APP_ID = Deno.env.get('BASE44_APP_ID');
    const API_KEY = Deno.env.get('BASE44_API_KEY');

    if (!APP_ID) {
      throw new Error('BASE44_APP_ID não configurado');
    }

    if (!API_KEY) {
      throw new Error('BASE44_API_KEY não configurado');
    }

    // FETCH REAL DOS ARQUIVOS
    const baseUrl = `https://app.base44.com/api/apps/${APP_ID}`;
    const headers = {
      'api_key': API_KEY,
      'Content-Type': 'application/json'
    };

    // 1. LISTAR PAGES
    const pagesRes = await fetch(`${baseUrl}/files?path=pages`, { headers });
    if (!pagesRes.ok) throw new Error(`API pages: ${pagesRes.status}`);
    const pagesData = await pagesRes.json();
    const pages = (pagesData.files || []).map(f => f.name.replace(/\.(jsx?|tsx?)$/, ''));

    // 2. LISTAR ENTITIES
    const entitiesRes = await fetch(`${baseUrl}/files?path=entities`, { headers });
    if (!entitiesRes.ok) throw new Error(`API entities: ${entitiesRes.status}`);
    const entitiesData = await entitiesRes.json();
    const entities = (entitiesData.files || []).map(f => f.name.replace('.json', ''));

    // 3. LISTAR FUNCTIONS
    const functionsRes = await fetch(`${baseUrl}/files?path=functions`, { headers });
    if (!functionsRes.ok) throw new Error(`API functions: ${functionsRes.status}`);
    const functionsData = await functionsRes.json();
    const functions = (functionsData.files || []).map(f => f.name.replace('.js', ''));

    console.log(`[scanCodebaseReal] ✅ API: ${pages.length} pages, ${entities.length} entities, ${functions.length} functions`);

    // 4. FETCH CÓDIGO DAS PÁGINAS E EXTRAIR DEPENDÊNCIAS (REAL via API)
    const pageDetails = [];
    for (const pageName of pages.slice(0, 80)) { // Processar até 80 páginas
      try {
        const fileRes = await fetch(`${baseUrl}/files/pages/${pageName}.jsx`, { headers });
        if (!fileRes.ok) {
          // Tentar .js
          const fileResJs = await fetch(`${baseUrl}/files/pages/${pageName}.js`, { headers });
          if (!fileResJs.ok) continue;
          var code = await fileResJs.text();
        } else {
          var code = await fileRes.text();
        }
        
        // REGEX: extrair imports
        const importMatches = code.matchAll(/import\s+.*?\s+from\s+['"](.*?)['"]/g);
        const imports = Array.from(importMatches).map(m => m[1]);
        
        // REGEX: components usados
        const components = imports.filter(i => i.includes('components/')).map(i => i.split('/').pop());
        
        // REGEX: entities usadas (base44.entities.XXX)
        const entityMatches = code.matchAll(/base44\.(?:asServiceRole\.)?entities\.(\w+)/g);
        const entitiesUsed = Array.from(new Set(Array.from(entityMatches).map(m => m[1])));
        
        // REGEX: queries (queryKey: ['xxx'] ou ["xxx"])
        const queryMatches = code.matchAll(/queryKey:\s*\[['"](\w+(?:-\w+)*)['"]/g);
        const queries = Array.from(new Set(Array.from(queryMatches).map(m => m[1])));
        
        // REGEX: functions invocadas
        const functionMatches = code.matchAll(/base44\.(?:asServiceRole\.)?functions\.invoke\(['"](\w+)['"]/g);
        const functionsUsed = Array.from(new Set(Array.from(functionMatches).map(m => m[1])));
        
        pageDetails.push({ pageName, components, entities: entitiesUsed, queries, imports, functions: functionsUsed });
      } catch (e) {
        console.warn(`[scanCodebaseReal] Erro ao processar ${pageName}:`, e.message);
      }
    }
    
    console.log(`[scanCodebaseReal] ✅ Processadas ${pageDetails.length}/${pages.length} páginas com dependências REAIS`);

    // 5. MAPEAR ROTAS COM HEURÍSTICAS
    const routes = pages.map(pageName => {
      const details = pageDetails.find(p => p.pageName === pageName);
      
      let type = 'auth';
      let module = 'outro';
      let guards = ['RouteGuard'];

      // Públicas (TODAS)
      const publicPages = ['Home', 'Home', 'Blog', 'BlogPost', 'PlanosPrecos', 'Checkout', 'CheckoutSuccess', 
           'CentralAjuda', 'StatusSistema', 'ConteudoLegalPublico', 'TermosUso', 'PoliticaPrivacidade', 
           'ComplianceLGPD', 'SobreNos', 'Contato', 'Index', 'Sitemap', 'Erro404', 'RecuperarSenha'];
      if (publicPages.includes(pageName)) {
        type = 'public';
        guards = [];
      }

      // SuperAdmin
      if (pageName.startsWith('SuperAdmin') || pageName.startsWith('Gestao') || pageName.startsWith('Gerenci') ||
          pageName.includes('Diagnostico') || (pageName.includes('Dashboard') && pageName !== 'DashboardCompleto')) {
        type = 'superadmin';
        guards = ['RouteGuard', 'role:admin'];
      }

      // Módulos por nome (17 módulos principais)
      if (pageName.includes('Agenda')) module = 'agenda';
      else if (pageName.includes('Paciente') || pageName.includes('Contato')) module = 'pacientes';
      else if (pageName.includes('Prontuario')) module = 'prontuarios';
      else if (pageName.includes('Produto')) module = 'produtos';
      else if (pageName.includes('Estoque')) module = 'estoque';
      else if (pageName.includes('Financeiro') || pageName.includes('Fatura') || pageName.includes('Venda')) module = 'financeiro';
      else if (pageName.includes('Relatorio')) module = 'relatorios';
      else if (pageName.includes('Atendimento') || pageName.includes('Ticket') || pageName.includes('Helpdesk')) module = 'atendimento';
      else if (pageName.includes('Jornada')) module = 'jornada';
      else if (pageName.includes('PlanosTratamento') || pageName.includes('PlanoTratamento')) module = 'planos_tratamento';
      else if (pageName.includes('AnaliseDocumentosIA') || pageName.includes('DocumentoAnalise')) module = 'analise_ia';
      else if (pageName.includes('Colaboracao')) module = 'colaboracao';
      else if (pageName.includes('Telemedicina')) module = 'telemedicina';
      else if (pageName.includes('GestaoEquipe') || pageName.includes('Equipe')) module = 'gestao_equipe';
      else if (pageName.includes('Administracao') || pageName.includes('Configuracao')) module = 'administracao';
      else if (pageName.includes('Blog')) module = 'blog';
      else if (pageName.includes('LGPD') || pageName.includes('Compliance') || pageName.includes('Termo')) module = 'compliance';
      else if (pageName.includes('Plano') || pageName.includes('Monetiza') || pageName.includes('Checkout') || pageName.includes('Assinatura')) module = 'monetizacao';
      else if (pageName.includes('Conector') || pageName.includes('Mapa') || pageName.includes('Performance') || pageName.includes('Auditoria')) module = 'plataforma';

      return {
        path: `/${pageName}`,
        type,
        module,
        guards,
        entry_point: ['DashboardCompleto', 'Home', 'SuperAdmin', 'PlanosPrecos'].includes(pageName),
        components: details?.components || [],
        queries: details?.queries || [],
        entities: details?.entities || [],
        functions: details?.functions || []
      };
    });

    // 6. AGRUPAR POR MÓDULO
    const modules = {};
    routes.forEach(route => {
      if (!modules[route.module]) {
        modules[route.module] = { 
          pages: [], 
          entities: [], 
          functions: [], 
          queries: [],
          components: []
        };
      }
      modules[route.module].pages.push(route.path);
      
      // Agregar components, entities, queries
      route.components.forEach(c => {
        if (!modules[route.module].components.includes(c)) {
          modules[route.module].components.push(c);
        }
      });
      route.entities.forEach(e => {
        if (!modules[route.module].entities.includes(e)) {
          modules[route.module].entities.push(e);
        }
      });
      route.queries.forEach(q => {
        if (!modules[route.module].queries.includes(q)) {
          modules[route.module].queries.push(q);
        }
      });
      route.functions?.forEach(f => {
        if (!modules[route.module].functions.includes(f)) {
          modules[route.module].functions.push(f);
        }
      });
    });

    // Associar functions aos módulos (heurística por nome)
    functions.forEach(funcName => {
      if (funcName.includes('agenda') || funcName.includes('Agendamento')) modules.agenda?.functions.push(funcName);
      else if (funcName.includes('paciente') || funcName.includes('Contato') || funcName.includes('criarContato')) modules.pacientes?.functions.push(funcName);
      else if (funcName.includes('prontuario') || funcName.includes('criarProntuario')) modules.prontuarios?.functions.push(funcName);
      else if (funcName.includes('venda') || funcName.includes('fatura') || funcName.includes('gerarFatura')) modules.financeiro?.functions.push(funcName);
      else if (funcName.includes('ticket') || funcName.includes('email') || funcName.includes('atendimento')) modules.atendimento?.functions.push(funcName);
      else if (funcName.includes('stripe') || funcName.includes('checkout')) modules.monetizacao?.functions.push(funcName);
      else if (funcName.includes('conector') || funcName.includes('scan') || funcName.includes('analyze')) modules.plataforma?.functions.push(funcName);
    });

    return Response.json({
      success: true,
      stats: {
        total_pages: pages.length,
        total_entities: entities.length,
        total_functions: functions.length,
        total_routes: routes.length,
        modules_count: Object.keys(modules).length
      },
      routes,
      entities,
      functions,
      pages,
      modules,
      coverage: {
        routes_mapped: routes.length,
        routes_total: pages.length,
        coverage_percent: ((routes.length / pages.length) * 100).toFixed(1)
      }
    });

  } catch (error) {
    console.error('[scanCodebaseReal] Erro:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});