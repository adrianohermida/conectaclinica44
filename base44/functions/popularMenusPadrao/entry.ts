import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * POPULAR MENUS PADRÃO - Seed data para MenuSidebar
 * Cria estrutura completa baseada no layout atual
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // VERIFICAR SE JÁ EXISTE
    const existentes = await base44.asServiceRole.entities.MenuSidebar.list();
    if (existentes.length > 0) {
      return Response.json({ 
        message: 'Menus já existem', 
        count: existentes.length,
        action: 'skipped' 
      });
    }

    // ESTRUTURA COMPLETA DO LAYOUT (clinica)
    const menusClinica = [
      { tipo_menu: 'clinica', tipo_item: 'pagina', titulo: 'Dashboard', icone_lucide: 'LayoutDashboard', rota_pagina: 'DashboardCompleto', ordem: 1, modulo_slug: 'dashboard', visivel: true },
      { tipo_menu: 'clinica', tipo_item: 'pagina', titulo: 'Agenda', icone_lucide: 'Calendar', rota_pagina: 'Agenda', ordem: 2, modulo_slug: 'agenda', visivel: true },
      { tipo_menu: 'clinica', tipo_item: 'pagina', titulo: 'Pacientes', icone_lucide: 'Users', rota_pagina: 'Pacientes', ordem: 3, modulo_slug: 'pacientes', visivel: true },
      { tipo_menu: 'clinica', tipo_item: 'pagina', titulo: 'Prontuários', icone_lucide: 'FileText', rota_pagina: 'Prontuarios', ordem: 4, modulo_slug: 'prontuarios', visivel: true },
      { tipo_menu: 'clinica', tipo_item: 'pagina', titulo: 'Prescrições', icone_lucide: 'Pill', rota_pagina: 'PrescricoesEletronicas', ordem: 5, modulo_slug: 'prontuarios', visivel: true },
      { tipo_menu: 'clinica', tipo_item: 'pagina', titulo: 'Produtos', icone_lucide: 'Package', rota_pagina: 'Produtos', ordem: 6, modulo_slug: 'produtos', visivel: true },
      { tipo_menu: 'clinica', tipo_item: 'pagina', titulo: 'Jornada', icone_lucide: 'Target', rota_pagina: 'JornadaPaciente', ordem: 7, modulo_slug: 'jornada', visivel: true },
      { tipo_menu: 'clinica', tipo_item: 'pagina', titulo: 'Tratamentos', icone_lucide: 'Stethoscope', rota_pagina: 'Tratamentos', ordem: 8, modulo_slug: 'planos_tratamento', visivel: true },
      { tipo_menu: 'clinica', tipo_item: 'pagina', titulo: 'Análise IA', icone_lucide: 'Brain', rota_pagina: 'AnaliseDocumentosIA', ordem: 9, modulo_slug: 'analise_ia', visivel: true },
      { tipo_menu: 'clinica', tipo_item: 'pagina', titulo: 'Colaboração', icone_lucide: 'UsersRound', rota_pagina: 'ColaboracaoMedica', ordem: 10, modulo_slug: 'colaboracao', visivel: true },
      { tipo_menu: 'clinica', tipo_item: 'pagina', titulo: 'Telemedicina', icone_lucide: 'Video', rota_pagina: 'Telemedicina', ordem: 11, modulo_slug: 'telemedicina', visivel: true },
      { tipo_menu: 'clinica', tipo_item: 'pagina', titulo: 'Helpdesk', icone_lucide: 'Headphones', rota_pagina: 'Helpdesk', ordem: 12, modulo_slug: 'atendimento', visivel: true },
      { tipo_menu: 'clinica', tipo_item: 'pagina', titulo: 'Admin', icone_lucide: 'Settings', rota_pagina: 'Administracao', ordem: 13, modulo_slug: 'administracao', visivel: true }
    ];

    // ESTRUTURA SUPERADMIN
    const menusSuperAdmin = [
      { tipo_menu: 'superadmin', tipo_item: 'pagina', titulo: 'Visão', icone_lucide: 'LayoutDashboard', rota_pagina: 'SuperAdmin', ordem: 1, visivel: true },
      { tipo_menu: 'superadmin', tipo_item: 'pagina', titulo: 'Clínicas', icone_lucide: 'Building2', rota_pagina: 'GestaoClinicas', ordem: 2, visivel: true },
      { tipo_menu: 'superadmin', tipo_item: 'pagina', titulo: 'Repositório', icone_lucide: 'HardDrive', rota_pagina: 'Repositorio', ordem: 3, visivel: true },
      
      // PASTA: Planos
      { tipo_menu: 'superadmin', tipo_item: 'pasta', titulo: 'Planos', icone_lucide: 'Grid3x3', ordem: 4, visivel: true },
      
      // PASTA: Financeiro
      { tipo_menu: 'superadmin', tipo_item: 'pasta', titulo: 'Financeiro', icone_lucide: 'DollarSign', ordem: 5, visivel: true },
      
      // PASTA: Testes
      { tipo_menu: 'superadmin', tipo_item: 'pasta', titulo: 'Testes', icone_lucide: 'Shield', ordem: 6, visivel: true },
      
      { tipo_menu: 'superadmin', tipo_item: 'pagina', titulo: 'Planejamento', icone_lucide: 'GitBranch', rota_pagina: 'PlanejamentoEstrategico', ordem: 7, visivel: true },
      { tipo_menu: 'superadmin', tipo_item: 'pagina', titulo: '🎨 Tokens CSS', icone_lucide: 'Palette', rota_pagina: 'PaletaTokensCSS', ordem: 8, visivel: true },
      { tipo_menu: 'superadmin', tipo_item: 'pagina', titulo: 'Arquitetura', icone_lucide: 'Grid3x3', rota_pagina: 'RoadmapSidebarApps', ordem: 9, visivel: true },
      
      // PASTA: Monitorar
      { tipo_menu: 'superadmin', tipo_item: 'pasta', titulo: 'Monitorar', icone_lucide: 'Activity', ordem: 10, visivel: true },
      
      { tipo_menu: 'superadmin', tipo_item: 'pagina', titulo: 'Email', icone_lucide: 'Mail', rota_pagina: 'HubEmail', ordem: 11, visivel: true },
      { tipo_menu: 'superadmin', tipo_item: 'pagina', titulo: 'Integrações', icone_lucide: 'Zap', rota_pagina: 'HubIntegracoes', ordem: 12, visivel: true },
      { tipo_menu: 'superadmin', tipo_item: 'pagina', titulo: 'Portais', icone_lucide: 'Users', rota_pagina: 'HubPortais', ordem: 13, visivel: true },
      
      // PASTA: Conectores
      { tipo_menu: 'superadmin', tipo_item: 'pasta', titulo: 'Conectores', icone_lucide: 'Zap', ordem: 14, visivel: true },
      
      { tipo_menu: 'superadmin', tipo_item: 'pagina', titulo: 'Compliance', icone_lucide: 'Shield', rota_pagina: 'HubCompliance', ordem: 15, visivel: true },
      
      // PASTA: Gestão
      { tipo_menu: 'superadmin', tipo_item: 'pasta', titulo: 'Gestão', icone_lucide: 'Settings', ordem: 16, visivel: true },
      
      // PASTA: Conteúdo
      { tipo_menu: 'superadmin', tipo_item: 'pasta', titulo: 'Conteúdo', icone_lucide: 'Globe', ordem: 17, visivel: true },
      
      // PASTA: Growth
      { tipo_menu: 'superadmin', tipo_item: 'pasta', titulo: 'Growth', icone_lucide: 'TrendingUp', ordem: 18, visivel: true }
    ];

    // INSERIR TODOS
    const allMenus = [...menusClinica, ...menusSuperAdmin];
    const created = [];

    for (const menu of allMenus) {
      const result = await base44.asServiceRole.entities.MenuSidebar.create(menu);
      created.push(result.id);
    }

    // AGORA CRIAR SUBMENUS (parent_id)
    const menusComId = await base44.asServiceRole.entities.MenuSidebar.list();
    
    // SUBMENUS PLANOS
    const pastaPlanos = menusComId.find(m => m.titulo === 'Planos' && m.tipo_item === 'pasta');
    if (pastaPlanos) {
      const subPlanos = [
        { tipo_menu: 'superadmin', parent_id: pastaPlanos.id, tipo_item: 'pagina', titulo: 'Catálogo', icone_lucide: 'Grid3x3', rota_pagina: 'Planos', ordem: 1, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaPlanos.id, tipo_item: 'pagina', titulo: 'Gestão', icone_lucide: 'Settings', rota_pagina: 'GestaoPlanos', ordem: 2, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaPlanos.id, tipo_item: 'pagina', titulo: 'Stripe', icone_lucide: 'Package', rota_pagina: 'GerenciarProdutosStripe', ordem: 3, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaPlanos.id, tipo_item: 'pagina', titulo: 'Preços', icone_lucide: 'DollarSign', rota_pagina: 'GerenciamentoPrecos', ordem: 4, visivel: true }
      ];
      for (const sub of subPlanos) await base44.asServiceRole.entities.MenuSidebar.create(sub);
    }

    // SUBMENUS FINANCEIRO
    const pastaFinanceiro = menusComId.find(m => m.titulo === 'Financeiro' && m.tipo_item === 'pasta');
    if (pastaFinanceiro) {
      const subFinanceiro = [
        { tipo_menu: 'superadmin', parent_id: pastaFinanceiro.id, tipo_item: 'pagina', titulo: 'Plataforma', icone_lucide: 'TrendingUp', rota_pagina: 'FinanceiroPlataforma', ordem: 1, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaFinanceiro.id, tipo_item: 'pagina', titulo: 'Hub', icone_lucide: 'TrendingUp', rota_pagina: 'HubMonetizacao', ordem: 2, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaFinanceiro.id, tipo_item: 'pagina', titulo: 'Billing', icone_lucide: 'DollarSign', rota_pagina: 'SuperAdminBilling', ordem: 3, visivel: true }
      ];
      for (const sub of subFinanceiro) await base44.asServiceRole.entities.MenuSidebar.create(sub);
    }

    // SUBMENUS TESTES
    const pastaTestes = menusComId.find(m => m.titulo === 'Testes' && m.tipo_item === 'pasta');
    if (pastaTestes) {
      const subTestes = [
        { tipo_menu: 'superadmin', parent_id: pastaTestes.id, tipo_item: 'pagina', titulo: 'E2E', icone_lucide: 'Shield', rota_pagina: 'TestesE2E', ordem: 1, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaTestes.id, tipo_item: 'pagina', titulo: 'Compliance', icone_lucide: 'Shield', rota_pagina: 'TestesCompliance', ordem: 2, visivel: true }
      ];
      for (const sub of subTestes) await base44.asServiceRole.entities.MenuSidebar.create(sub);
    }

    // SUBMENUS MONITORAR
    const pastaMonitorar = menusComId.find(m => m.titulo === 'Monitorar' && m.tipo_item === 'pasta');
    if (pastaMonitorar) {
      const subMonitorar = [
        { tipo_menu: 'superadmin', parent_id: pastaMonitorar.id, tipo_item: 'pagina', titulo: 'Performance', icone_lucide: 'Zap', rota_pagina: 'DashboardPerformance', ordem: 1, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaMonitorar.id, tipo_item: 'pagina', titulo: 'Rotas', icone_lucide: 'GitBranch', rota_pagina: 'MapaRotas', ordem: 2, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaMonitorar.id, tipo_item: 'pagina', titulo: 'Métricas', icone_lucide: 'TrendingUp', rota_pagina: 'MetricasAssinaturas', ordem: 3, visivel: true }
      ];
      for (const sub of subMonitorar) await base44.asServiceRole.entities.MenuSidebar.create(sub);
    }

    // SUBMENUS CONECTORES
    const pastaConectores = menusComId.find(m => m.titulo === 'Conectores' && m.tipo_item === 'pasta');
    if (pastaConectores) {
      const subConectores = [
        { tipo_menu: 'superadmin', parent_id: pastaConectores.id, tipo_item: 'pagina', titulo: 'Gestão', icone_lucide: 'Grid3x3', rota_pagina: 'GerenciadorConectores', ordem: 1, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaConectores.id, tipo_item: 'pagina', titulo: 'Secrets', icone_lucide: 'Shield', rota_pagina: 'GerenciamentoSecrets', ordem: 2, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaConectores.id, tipo_item: 'pagina', titulo: 'Autentique', icone_lucide: 'FileSignature', rota_pagina: 'SuperAdminAutentique', ordem: 3, visivel: true }
      ];
      for (const sub of subConectores) await base44.asServiceRole.entities.MenuSidebar.create(sub);
    }

    // SUBMENUS GESTÃO
    const pastaGestao = menusComId.find(m => m.titulo === 'Gestão' && m.tipo_item === 'pasta');
    if (pastaGestao) {
      const subGestao = [
        { tipo_menu: 'superadmin', parent_id: pastaGestao.id, tipo_item: 'pagina', titulo: 'Equipe Global', icone_lucide: 'Users', rota_pagina: 'GestaoEquipe', ordem: 1, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaGestao.id, tipo_item: 'pagina', titulo: 'Menu Sidebar', icone_lucide: 'Menu', rota_pagina: 'GestaoMenu', ordem: 2, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaGestao.id, tipo_item: 'pagina', titulo: 'Importações', icone_lucide: 'Upload', rota_pagina: 'GerenciarImportacoes', ordem: 3, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaGestao.id, tipo_item: 'pagina', titulo: 'Armazenamento', icone_lucide: 'HardDrive', rota_pagina: 'GestaoArmazenamento', ordem: 4, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaGestao.id, tipo_item: 'pagina', titulo: 'Assinaturas', icone_lucide: 'FileSignature', rota_pagina: 'MinhasAssinaturas', ordem: 5, visivel: true }
      ];
      for (const sub of subGestao) await base44.asServiceRole.entities.MenuSidebar.create(sub);
    }

    // SUBMENUS CONTEÚDO
    const pastaConteudo = menusComId.find(m => m.titulo === 'Conteúdo' && m.tipo_item === 'pasta');
    if (pastaConteudo) {
      const subConteudo = [
        { tipo_menu: 'superadmin', parent_id: pastaConteudo.id, tipo_item: 'pagina', titulo: 'Blog', icone_lucide: 'FileText', rota_pagina: 'GestaoBlog', ordem: 1, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaConteudo.id, tipo_item: 'pagina', titulo: 'Público', icone_lucide: 'UsersRound', rota_pagina: 'GestaoPublico', ordem: 2, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaConteudo.id, tipo_item: 'pagina', titulo: 'Legal', icone_lucide: 'Shield', rota_pagina: 'GestaoConteudoLegal', ordem: 3, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaConteudo.id, tipo_item: 'pagina', titulo: 'Newsletter', icone_lucide: 'Mail', rota_pagina: 'GestaoNewsletter', ordem: 4, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaConteudo.id, tipo_item: 'pagina', titulo: 'Ajuda', icone_lucide: 'HelpCircle', rota_pagina: 'CentralAjuda', ordem: 5, visivel: true }
      ];
      for (const sub of subConteudo) await base44.asServiceRole.entities.MenuSidebar.create(sub);
    }

    // SUBMENUS GROWTH
    const pastaGrowth = menusComId.find(m => m.titulo === 'Growth' && m.tipo_item === 'pasta');
    if (pastaGrowth) {
      const subGrowth = [
        { tipo_menu: 'superadmin', parent_id: pastaGrowth.id, tipo_item: 'pagina', titulo: 'Leads', icone_lucide: 'Target', rota_pagina: 'GestaoLeads', ordem: 1, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaGrowth.id, tipo_item: 'pagina', titulo: 'Marketing', icone_lucide: 'Mail', rota_pagina: 'MarketingOutbound', ordem: 2, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaGrowth.id, tipo_item: 'pagina', titulo: 'Widget', icone_lucide: 'Activity', rota_pagina: 'MonitoramentoWidget', ordem: 3, visivel: true },
        { tipo_menu: 'superadmin', parent_id: pastaGrowth.id, tipo_item: 'pagina', titulo: 'Analytics', icone_lucide: 'BarChart3', rota_pagina: 'AnalyticsWidget', ordem: 4, visivel: true }
      ];
      for (const sub of subGrowth) await base44.asServiceRole.entities.MenuSidebar.create(sub);
    }

    return Response.json({ 
      success: true, 
      menus_criados: created.length,
      message: 'Menus padrão populados com sucesso (100% completo)'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});