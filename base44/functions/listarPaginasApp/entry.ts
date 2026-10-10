import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * LISTAR PÁGINAS DO APP - Auto-discovery para GestaoMenu
 * Retorna todas páginas existentes no codebase
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // PÁGINAS PÚBLICAS (sem auth)
    const paginasPublicas = [
      { nome: 'Home', path: 'Home', tipo: 'publica' },
      { nome: 'Index', path: 'Index', tipo: 'publica' },
      { nome: 'Home', path: 'Home', tipo: 'publica' },
      { nome: 'PlanosPrecos', path: 'PlanosPrecos', tipo: 'publica' },
      { nome: 'SobreNos', path: 'SobreNos', tipo: 'publica' },
      { nome: 'Blog', path: 'Blog', tipo: 'publica' },
      { nome: 'BlogPost', path: 'BlogPost', tipo: 'publica' },
      { nome: 'Contato', path: 'Contato', tipo: 'publica' },
      { nome: 'CentralAjuda', path: 'CentralAjuda', tipo: 'publica' },
      { nome: 'StatusSistema', path: 'StatusSistema', tipo: 'publica' },
      { nome: 'TermosUso', path: 'TermosUso', tipo: 'publica' },
      { nome: 'PoliticaPrivacidade', path: 'PoliticaPrivacidade', tipo: 'publica' },
      { nome: 'ComplianceLGPD', path: 'ComplianceLGPD', tipo: 'publica' },
      { nome: 'ConteudoLegalPublico', path: 'ConteudoLegalPublico', tipo: 'publica' },
      { nome: 'Checkout', path: 'Checkout', tipo: 'publica' },
      { nome: 'CheckoutSuccess', path: 'CheckoutSuccess', tipo: 'publica' }
    ];

    // PÁGINAS CLÍNICA (auth + clinica_id)
    const paginasClinica = [
      { nome: 'Dashboard', path: 'Dashboard', tipo: 'clinica', modulo: 'dashboard' },
      { nome: 'Agenda', path: 'Agenda', tipo: 'clinica', modulo: 'agenda' },
      { nome: 'Pacientes', path: 'Pacientes', tipo: 'clinica', modulo: 'pacientes' },
      { nome: 'PacienteDetalhes', path: 'PacienteDetalhes', tipo: 'clinica', modulo: 'pacientes' },
      { nome: 'Prontuarios', path: 'Prontuarios', tipo: 'clinica', modulo: 'prontuarios' },
      { nome: 'PrescricoesEletronicas', path: 'PrescricoesEletronicas', tipo: 'clinica', modulo: 'prontuarios' },
      { nome: 'Produtos', path: 'Produtos', tipo: 'clinica', modulo: 'produtos' },
      { nome: 'JornadaPaciente', path: 'JornadaPaciente', tipo: 'clinica', modulo: 'jornada' },
      { nome: 'Tratamentos', path: 'Tratamentos', tipo: 'clinica', modulo: 'planos_tratamento' },
      { nome: 'AnaliseDocumentosIA', path: 'AnaliseDocumentosIA', tipo: 'clinica', modulo: 'analise_ia' },
      { nome: 'ColaboracaoMedica', path: 'ColaboracaoMedica', tipo: 'clinica', modulo: 'colaboracao' },
      { nome: 'Telemedicina', path: 'Telemedicina', tipo: 'clinica', modulo: 'telemedicina' },
      { nome: 'Helpdesk', path: 'Helpdesk', tipo: 'clinica', modulo: 'atendimento' },
      { nome: 'Administracao', path: 'Administracao', tipo: 'clinica', modulo: 'administracao' },
      { nome: 'Financeiro', path: 'Financeiro', tipo: 'clinica', modulo: 'financeiro' },
      { nome: 'Estoque', path: 'Estoque', tipo: 'clinica', modulo: 'estoque' },
      { nome: 'Relatorios', path: 'Relatorios', tipo: 'clinica', modulo: 'relatorios' }
    ];

    // PÁGINAS SUPERADMIN
    const paginasSuperAdmin = [
      { nome: 'SuperAdmin', path: 'SuperAdmin', tipo: 'superadmin' },
      { nome: 'GestaoClinicas', path: 'GestaoClinicas', tipo: 'superadmin' },
      { nome: 'Repositorio', path: 'Repositorio', tipo: 'superadmin' },
      { nome: 'Planos', path: 'Planos', tipo: 'superadmin' },
      { nome: 'GestaoPlanos', path: 'GestaoPlanos', tipo: 'superadmin' },
      { nome: 'GerenciarProdutosStripe', path: 'GerenciarProdutosStripe', tipo: 'superadmin' },
      { nome: 'GerenciamentoPrecos', path: 'GerenciamentoPrecos', tipo: 'superadmin' },
      { nome: 'FinanceiroPlataforma', path: 'FinanceiroPlataforma', tipo: 'superadmin' },
      { nome: 'HubMonetizacao', path: 'HubMonetizacao', tipo: 'superadmin' },
      { nome: 'SuperAdminBilling', path: 'SuperAdminBilling', tipo: 'superadmin' },
      { nome: 'TestesE2E', path: 'TestesE2E', tipo: 'superadmin' },
      { nome: 'TestesCompliance', path: 'TestesCompliance', tipo: 'superadmin' },
      { nome: 'PlanejamentoEstrategico', path: 'PlanejamentoEstrategico', tipo: 'superadmin' },
      { nome: 'StyleGuide', path: 'StyleGuide', tipo: 'superadmin' },
      { nome: 'RoadmapSidebarApps', path: 'RoadmapSidebarApps', tipo: 'superadmin' },
      { nome: 'DashboardPerformance', path: 'DashboardPerformance', tipo: 'superadmin' },
      { nome: 'MapaRotas', path: 'MapaRotas', tipo: 'superadmin' },
      { nome: 'MetricasAssinaturas', path: 'MetricasAssinaturas', tipo: 'superadmin' },
      { nome: 'HubEmail', path: 'HubEmail', tipo: 'superadmin' },
      { nome: 'HubIntegracoes', path: 'HubIntegracoes', tipo: 'superadmin' },
      { nome: 'HubPortais', path: 'HubPortais', tipo: 'superadmin' },
      { nome: 'GerenciadorConectores', path: 'GerenciadorConectores', tipo: 'superadmin' },
      { nome: 'GerenciamentoSecrets', path: 'GerenciamentoSecrets', tipo: 'superadmin' },
      { nome: 'SuperAdminAutentique', path: 'SuperAdminAutentique', tipo: 'superadmin' },
      { nome: 'HubCompliance', path: 'HubCompliance', tipo: 'superadmin' },
      { nome: 'GestaoEquipe', path: 'GestaoEquipe', tipo: 'superadmin' },
      { nome: 'GestaoMenu', path: 'GestaoMenu', tipo: 'superadmin' },
      { nome: 'GerenciarImportacoes', path: 'GerenciarImportacoes', tipo: 'superadmin' },
      { nome: 'GestaoArmazenamento', path: 'GestaoArmazenamento', tipo: 'superadmin' },
      { nome: 'MinhasAssinaturas', path: 'MinhasAssinaturas', tipo: 'superadmin' },
      { nome: 'GestaoBlog', path: 'GestaoBlog', tipo: 'superadmin' },
      { nome: 'GestaoPublico', path: 'GestaoPublico', tipo: 'superadmin' },
      { nome: 'GestaoConteudoLegal', path: 'GestaoConteudoLegal', tipo: 'superadmin' },
      { nome: 'GestaoNewsletter', path: 'GestaoNewsletter', tipo: 'superadmin' },
      { nome: 'GestaoLeads', path: 'GestaoLeads', tipo: 'superadmin' },
      { nome: 'MarketingOutbound', path: 'MarketingOutbound', tipo: 'superadmin' },
      { nome: 'MonitoramentoWidget', path: 'MonitoramentoWidget', tipo: 'superadmin' },
      { nome: 'AnalyticsWidget', path: 'AnalyticsWidget', tipo: 'superadmin' }
    ];

    // PÁGINAS PORTAIS
    const paginasPortais = [
      { nome: 'PortalPaciente', path: 'PortalPaciente', tipo: 'portal_paciente' },
      { nome: 'PortalMedico', path: 'PortalMedico', tipo: 'portal_medico' }
    ];

    const todasPaginas = [...paginasPublicas, ...paginasClinica, ...paginasSuperAdmin, ...paginasPortais];

    return Response.json({ 
      paginas: todasPaginas,
      total: todasPaginas.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});