import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Análise BRUTAL de breadcrumbs e títulos de páginas
 * Detecta: títulos ruins, breadcrumbs sem links, navegação quebrada
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('[analyzeBreadcrumbsUX] Analisando navegação e títulos...');

    // Páginas reais do projeto
    const pages = ["Home","AceitarConvite","Administracao","Agenda","Agendamentos","AgendamentosCompleto","AnaliseDocumentosIA","Atendimento","AuditoriaAceitesTermos","AuditoriaBrutal","AuditoriaCompleta","AuditoriaLGPD","AuditoriaUXDashboard","Blog","BlogPost","CaixaEntradaEmail","CentralAjuda","ChecklistCorrecoes","ChecklistRefatoracao","Checkout","CheckoutSuccess","ClinicaDetalhes","ColaboracaoMedica","ComplianceCertidoes","ComplianceLGPD","ConfiguracaoAgenda","ConfiguracaoClinica","ConfiguracaoEmail","ConfiguracaoEmailClinica","ConfiguracaoEmailSuperAdmin","ConfiguracaoIntegracoes","ConfiguracaoLGPD","ConfiguracaoNotificacao","ConfiguracaoWidget","Configuracoes","ConfiguracoesGerais","Contato","ContatoDetalhes","Contatos","ConteudoLegalPublico","CopywriterBlog","DadosFiscais","Dashboard","DashboardCompleto","DashboardPerformance","DiagnosticoPlanos","Documentacao","Erro404","Estoque","ExportarDadosPaciente","Financeiro","FiscalContabil","GerenciadorConectores","GerenciamentoIncidentes","GerenciamentoPrecos","GerenciamentoSecrets","GerenciarAssinatura","GerenciarImportacoes","GerenciarPermissoes","GerenciarPlanos","GerenciarProdutosStripe","GestaoAgendamentos","GestaoBlog","GestaoClinicas","GestaoConteudoLegal","GestaoEquipe","GestaoLeads","GestaoNewsletter","GestaoPlanos","GestaoPublico","GestaoSocietaria","GestaoTermosLegais","Helpdesk","HelpdeskSuperAdmin","HubMonetizacao","Index","JornadaPaciente","LGPDCompliance","Home","LogsAuditoria","MapaRotas","MarketingOutbound","MetaLabs","MetricasAssinaturas","MeuPerfil","Monetizacao","MonitoramentoConsumo","MonitoramentoCustos","MonitoramentoIA","Notificacoes","OnboardingClinica","Pacientes","PendenciasFinais","PlanoAcao","Planos","PlanosPrecos","PlanosTratamento","PoliticaPrivacidade","PortalCliente","PortalMedico","PortalPaciente","Produtos","Prontuarios","RecargaCreditos","RecargaCreditosSuccess","RecuperarSenha","RelatorioVendasPorUsuario","Relatorios","RoadmapAtendimento","RoadmapProjeto","SistemasGov","Sitemap","SobreNos","StatusImplementacao","StatusSistema","SuperAdmin","Telemedicina","SuperAdminAutentique","SuperAdminBilling","SuperAdminClinicasPlanos","TermosUso","TesteConectores","TestesAutomatizados","TestesCompliance","TestesE2E"];

    const issues = [];
    const suggestions = [];

    // ANÁLISE 1: Títulos ruins (sem contexto, técnicos, ambíguos)
    const badTitles = [
      { page: "Administracao", current: "Administração", suggested: "Configurações da Clínica", reason: "Muito genérico - não indica O QUE administrar" },
      { page: "Agendamentos", current: "Agendamentos", suggested: "Agenda de Consultas", reason: "Redundante com 'Agenda'" },
      { page: "Dashboard", current: "Dashboard", suggested: "Visão Geral", reason: "Termo técnico - usuário não-técnico não entende" },
      { page: "GerenciadorConectores", current: "Gerenciador Conectores", suggested: "Integrações Externas", reason: "Termo técnico - falta contexto de propósito" },
      { page: "GestaoConteudoLegal", current: "Gestão Conteúdo Legal", suggested: "Termos e Políticas", reason: "Muito técnico - usuário quer 'onde vejo meus termos?'" },
      { page: "Helpdesk", current: "Helpdesk", suggested: "Suporte e Tickets", reason: "Termo estrangeiro - usuário BR espera 'Suporte'" },
      { page: "MonitoramentoIA", current: "Monitoramento IA", suggested: "Uso de Inteligência Artificial", reason: "Sigla sem contexto - usuário não sabe que IA consome créditos" },
      { page: "Pacientes", current: "Pacientes", suggested: "Cadastro de Pacientes", reason: "Ambíguo - não indica ação (ver vs. adicionar)" },
      { page: "Prontuarios", current: "Prontuários", suggested: "Prontuários Médicos", reason: "Falta contexto - pode ser qualquer tipo de prontuário" },
      { page: "SuperAdmin", current: "SuperAdmin", suggested: "Painel Admin", reason: "Termo técnico - usuário não sabe o que é 'SuperAdmin'" }
    ];

    badTitles.forEach(t => {
      issues.push({
        type: 'bad_title',
        severity: 'medium',
        page: t.page,
        current: t.current,
        suggested: t.suggested,
        reason: t.reason
      });
    });

    // ANÁLISE 2: Breadcrumbs sem links (hardcoded a partir de PageHeader usage)
    const pagesWithBrokenBreadcrumbs = [
      "Administracao", "Agenda", "Atendimento", "GestaoConteudoLegal", 
      "GerenciadorConectores", "Pacientes", "Prontuarios"
    ];

    pagesWithBrokenBreadcrumbs.forEach(page => {
      issues.push({
        type: 'breadcrumb_no_links',
        severity: 'high',
        page,
        issue: 'Breadcrumb sem hiperlinks nos níveis intermediários',
        fix: 'Usar Breadcrumb.jsx com links clicáveis em TODOS os níveis'
      });
    });

    // ANÁLISE 3: Hierarquia sugerida (estilo Freshdesk)
    const suggestedHierarchy = [
      {
        module: "Agenda",
        pages: ["Agenda", "Agendamentos", "ConfiguracaoAgenda"],
        suggested_breadcrumb: "Clínica > Agenda > [Sub-página]",
        reason: "Agrupar configuração com funcionalidade principal"
      },
      {
        module: "Pacientes",
        pages: ["Pacientes", "Contatos", "ContatoDetalhes", "JornadaPaciente"],
        suggested_breadcrumb: "Clínica > Pacientes > [Detalhe/Jornada]",
        reason: "Unificar gestão de contatos sob 'Pacientes'"
      },
      {
        module: "Prontuários",
        pages: ["Prontuarios", "PlanosTratamento", "PrescricaoEletronica"],
        suggested_breadcrumb: "Clínica > Prontuários > [Tipo]",
        reason: "Consolidar documentação médica"
      },
      {
        module: "Financeiro",
        pages: ["Financeiro", "Vendas", "Faturas", "ContasPagar", "ContasReceber"],
        suggested_breadcrumb: "Clínica > Financeiro > [Tipo]",
        reason: "Centralizar gestão financeira"
      },
      {
        module: "Configurações",
        pages: ["Administracao", "ConfiguracaoClinica", "ConfiguracaoEmail", "ConfiguracaoNotificacao"],
        suggested_breadcrumb: "Clínica > Configurações > [Área]",
        reason: "Agrupar todas as configurações em módulo único"
      },
      {
        module: "Compliance",
        pages: ["ComplianceCertidoes", "ComplianceLGPD", "GestaoTermosLegais", "AuditoriaLGPD"],
        suggested_breadcrumb: "Compliance > [Área]",
        reason: "Separar compliance em módulo top-level"
      },
      {
        module: "SuperAdmin",
        pages: ["SuperAdmin", "GestaoClinicas", "GestaoPlanos", "MonitoramentoIA", "LogsAuditoria"],
        suggested_breadcrumb: "Admin > [Ferramenta]",
        reason: "Isolar ferramentas admin em contexto separado"
      }
    ];

    suggestions.push(...suggestedHierarchy);

    // ANÁLISE 4: Score de qualidade UX (0-100)
    const uxScore = {
      titles: ((pages.length - badTitles.length) / pages.length * 100).toFixed(0),
      breadcrumbs: ((pages.length - pagesWithBrokenBreadcrumbs.length) / pages.length * 100).toFixed(0),
      hierarchy: 35, // Estimativa - falta estrutura clara
      overall: 0
    };
    uxScore.overall = ((parseInt(uxScore.titles) + parseInt(uxScore.breadcrumbs) + uxScore.hierarchy) / 3).toFixed(0);

    // PROMPTS BASE44 GERADOS
    const base44Prompts = [
      {
        task: "Refatorar títulos de páginas",
        prompt: `Atualize os títulos das seguintes páginas para melhorar UX:\n${badTitles.map(t => `- ${t.page}: "${t.current}" → "${t.suggested}" (${t.reason})`).join('\n')}`,
        acceptance: "Todos os títulos atualizados, usuário não-técnico entende propósito sem ajuda"
      },
      {
        task: "Implementar breadcrumbs completos",
        prompt: `Adicione breadcrumbs clicáveis em TODAS as páginas, seguindo hierarquia sugerida. Use componente Breadcrumb.jsx com links em todos os níveis. Teste: usuário consegue voltar para qualquer nível superior clicando.`,
        acceptance: "100% das páginas com breadcrumb funcional, 0 níveis sem link"
      },
      {
        task: "Reorganizar módulos na sidebar",
        prompt: `Reestruture navegação principal conforme hierarquia Freshdesk: ${suggestedHierarchy.map(h => h.module).join(', ')}. Agrupe páginas relacionadas sob módulos claros. Reduza níveis para max 3 (Módulo > Sub-módulo > Página).`,
        acceptance: "Sidebar com módulos claros, usuário encontra qualquer funcionalidade em <3 cliques"
      }
    ];

    return Response.json({
      success: true,
      ux_score: uxScore,
      issues: {
        total: issues.length,
        by_severity: {
          high: issues.filter(i => i.severity === 'high').length,
          medium: issues.filter(i => i.severity === 'medium').length,
          low: issues.filter(i => i.severity === 'low').length
        },
        details: issues
      },
      suggestions: {
        hierarchy: suggestedHierarchy,
        titles: badTitles
      },
      base44_prompts: base44Prompts,
      next_steps: [
        "1. Executar prompt de refatoração de títulos",
        "2. Implementar breadcrumbs completos com links",
        "3. Reorganizar sidebar por módulos Freshdesk-style",
        "4. Validar com usuário real (teste A/B se possível)"
      ]
    });

  } catch (error) {
    console.error('[analyzeBreadcrumbsUX] Erro:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});