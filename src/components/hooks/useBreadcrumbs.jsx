import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * SISTEMA DINÂMICO DE BREADCRUMBS
 * Resolve confusão de navegação entre modo clínica e SuperAdmin
 * 
 * CRITICAL: Detecta contexto automaticamente e gera hierarquia correta
 */
export function useBreadcrumbs(user, customBreadcrumbs = null) {
  const location = useLocation();

  // Se breadcrumbs customizados foram passados, usar eles
  if (customBreadcrumbs && customBreadcrumbs.length > 0) {
    return customBreadcrumbs;
  }

  const pathname = location.pathname;
  const pageName = pathname.split('/').pop() || 'Dashboard';

  // Detectar se está em modo SuperAdmin
  const isSuperAdmin = user?.role === 'admin';
  const isSuperAdminPath = pathname.includes('SuperAdmin') || 
                          pathname.includes('MetaLabs') ||
                          pathname.includes('Planos') && isSuperAdmin ||
                          pathname.includes('Monetizacao') ||
                          pathname.includes('GerenciarProdutosStripe') ||
                          pathname.includes('GerenciadorConectores') ||
                          pathname.includes('Roadmap') && isSuperAdmin ||
                          pathname.includes('Diagnostico') && isSuperAdmin ||
                          pathname.includes('Auditoria') && isSuperAdmin;

  const baseInicio = isSuperAdminPath 
    ? { label: "SuperAdmin", url: createPageUrl("SuperAdmin") }
    : { label: "Início", url: createPageUrl("Dashboard") };

  // MAPEAMENTO DE PÁGINAS → HIERARQUIA
  const pageHierarchy = {
    // CLÍNICA (modo normal)
    'Pacientes': [baseInicio, { label: 'Pacientes' }],
    'PacienteDetalhes': [baseInicio, { label: 'Pacientes', url: createPageUrl('Pacientes') }, { label: 'Detalhes' }],
    'Agenda': [baseInicio, { label: 'Agenda' }],
    'Prontuarios': [baseInicio, { label: 'Prontuários' }],
    'Atendimento': [baseInicio, { label: 'Atendimento' }],
    'JornadaPaciente': [baseInicio, { label: 'Jornada' }],
    'PlanosTratamento': [baseInicio, { label: 'Tratamentos' }],
    'AnaliseDocumentosIA': [baseInicio, { label: 'Análise IA' }],
    'ColaboracaoMedica': [baseInicio, { label: 'Colaboração' }],
    'Telemedicina': [baseInicio, { label: 'Telemedicina' }],
    'Produtos': [baseInicio, { label: 'Produtos' }],
    
    // ADMINISTRAÇÃO
    'Administracao': [baseInicio, { label: 'Administração' }],
    'Repositorio': isSuperAdminPath 
      ? [baseInicio, { label: 'Repositório' }]
      : [baseInicio, { label: 'Administração', url: createPageUrl('Administracao') }, { label: 'Gerenciador de Arquivos' }],
    'GestaoEquipe': [baseInicio, { label: 'Administração', url: createPageUrl('Administracao') }, { label: 'Gestão de Equipe' }],
    'Estoque': [baseInicio, { label: 'Administração', url: createPageUrl('Administracao') }, { label: 'Estoque' }],
    'Financeiro': [baseInicio, { label: 'Administração', url: createPageUrl('Administracao') }, { label: 'Financeiro' }],
    'ConfiguracaoClinica': [baseInicio, { label: 'Administração', url: createPageUrl('Administracao') }, { label: 'Dados da Clínica' }],
    'ConfiguracaoEmail': [baseInicio, { label: 'Administração', url: createPageUrl('Administracao') }, { label: 'Configuração de Email' }],
    'ConfiguracaoWidget': [baseInicio, { label: 'Administração', url: createPageUrl('Administracao') }, { label: 'Widget' }],
    'ConfiguracaoNotificacao': [baseInicio, { label: 'Administração', url: createPageUrl('Administracao') }, { label: 'Notificações' }],
    'ConfiguracoesGerais': [baseInicio, { label: 'Administração', url: createPageUrl('Administracao') }, { label: 'Configurações Gerais' }],
    'Relatorios': [baseInicio, { label: 'Administração', url: createPageUrl('Administracao') }, { label: 'Relatórios' }],

    // SUPERADMIN
    'SuperAdmin': [{ label: 'SuperAdmin' }],
    'GestaoClinicas': [baseInicio, { label: 'Gestão de Clínicas' }],
    'RoadmapPaciente': [baseInicio, { label: 'Roadmaps', url: createPageUrl('SuperAdmin') }, { label: 'Roadmap Paciente' }],
    'RoadmapSecretariaIA': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Roadmap Secretária IA' }],
    'RoadmapSendGrid': [baseInicio, { label: 'Integrações', url: createPageUrl('SuperAdmin') }, { label: 'SendGrid', url: createPageUrl('SuperAdminSendGrid') }, { label: 'Roadmap API' }],
    'RoadmapWhatsApp': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Roadmap WhatsApp' }],
    'RoadmapArmazenamento': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Roadmap Storage' }],
    'RoadmapGerenciadorArquivos': [baseInicio, { label: 'Administração', url: createPageUrl('Administracao') }, { label: 'Gerenciador de Arquivos', url: createPageUrl('Repositorio') }, { label: 'Roadmap' }],
    'RoadmapPrescricaoEletronica': [baseInicio, { label: 'Prontuários', url: createPageUrl('Prontuarios') }, { label: 'Roadmap Prescrição' }],
    
    // MONETIZAÇÃO
    'HubMonetizacao': [baseInicio, { label: 'Monetização', url: createPageUrl('SuperAdmin') }, { label: 'Hub' }],
    'Planos': [baseInicio, { label: 'Monetização', url: createPageUrl('HubMonetizacao') }, { label: 'Planos & Módulos' }],
    'GestaoPlanos': [baseInicio, { label: 'Monetização', url: createPageUrl('HubMonetizacao') }, { label: 'Gestão Planos' }],
    'GerenciarProdutosStripe': [baseInicio, { label: 'Monetização', url: createPageUrl('HubMonetizacao') }, { label: 'Produtos Stripe' }],
    'MetricasAssinaturas': [baseInicio, { label: 'Monetização', url: createPageUrl('HubMonetizacao') }, { label: 'Métricas & Analytics' }],
    'SuperAdminBilling': [baseInicio, { label: 'Monetização', url: createPageUrl('HubMonetizacao') }, { label: 'Billing' }],
    'GerenciamentoPrecos': [baseInicio, { label: 'Monetização', url: createPageUrl('HubMonetizacao') }, { label: 'Preços' }],
    
    // PLATAFORMA
    'TestesE2E': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Testes E2E' }],
    'MetricasSecretariaIA': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Métricas IA' }],
    'MapaRotas': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Rotas' }],
    'GerenciadorConectores': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Integrações' }, { label: 'Conectores' }],
    'GerenciamentoSecrets': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Integrações' }, { label: 'Secrets' }],
    'TestesAutomatizados': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Integrações' }, { label: 'Testes Automatizados' }],
    'SuperAdminAutentique': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Playground' }, { label: 'Autentique' }],
    'SuperAdminSendGrid': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'SendGrid' }, { label: 'Dashboard' }],
    'SetupWebhookSendGrid': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'SendGrid' }, { label: 'Webhook Security' }],
    'SuperAdminClinicasPlanos': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Clínicas & Planos' }],
    'DiagnosticoPlanos': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Diagnóstico Planos' }],
    'DashboardPerformance': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Performance' }],
    'MonitoramentoIA': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Monitoramento IA' }],
    'LogsAuditoria': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Logs Auditoria' }],
    'MinhasAssinaturas': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Minhas Assinaturas' }],
    'GestaoArmazenamento': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Gestão Storage' }],
    'GestaoSendGrid': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Gestão SendGrid' }],
    'AuditoriaEmailMultitenant': [baseInicio, { label: 'Plataforma', url: createPageUrl('SuperAdmin') }, { label: 'Auditoria Email' }],
    
    // COMPLIANCE
    'ComplianceCertidoes': [baseInicio, { label: 'Compliance', url: createPageUrl('SuperAdmin') }, { label: 'Certidões' }],
    'FiscalContabil': [baseInicio, { label: 'Compliance', url: createPageUrl('SuperAdmin') }, { label: 'Fiscal & Contábil' }],
    'SistemasGov': [baseInicio, { label: 'Compliance', url: createPageUrl('SuperAdmin') }, { label: 'Sistemas Gov' }],
    'DadosFiscais': [baseInicio, { label: 'Compliance', url: createPageUrl('SuperAdmin') }, { label: 'Dados Fiscais' }],
    
    // CONTEÚDO
    'GestaoBlog': [baseInicio, { label: 'Conteúdo', url: createPageUrl('SuperAdmin') }, { label: 'Blog' }],
    'GestaoPublico': [baseInicio, { label: 'Conteúdo', url: createPageUrl('SuperAdmin') }, { label: 'Gestão Público' }],
    'CentralAjuda': [baseInicio, { label: 'Conteúdo', url: createPageUrl('SuperAdmin') }, { label: 'Central Ajuda' }],
    'GestaoNewsletter': [baseInicio, { label: 'Conteúdo', url: createPageUrl('SuperAdmin') }, { label: 'Newsletter' }],
    
    // GROWTH & SUPORTE
    'GestaoLeads': [baseInicio, { label: 'Growth & Suporte', url: createPageUrl('SuperAdmin') }, { label: 'Leads Site' }],
    'MarketingOutbound': [baseInicio, { label: 'Growth & Suporte', url: createPageUrl('SuperAdmin') }, { label: 'Marketing Outbound' }],
    'MonitoramentoWidget': [baseInicio, { label: 'Growth & Suporte', url: createPageUrl('SuperAdmin') }, { label: 'Monitoramento Widget' }],
    'AnalyticsWidget': [baseInicio, { label: 'Growth & Suporte', url: createPageUrl('SuperAdmin') }, { label: 'Analytics Widget' }],
    'StatusSistema': [baseInicio, { label: 'Growth & Suporte', url: createPageUrl('SuperAdmin') }, { label: 'Status Sistema' }],
    
    // SERVE EMAIL
    'EmailsRecebidos': [baseInicio, { label: 'Serve Email', url: createPageUrl('SuperAdmin') }, { label: 'Emails Recebidos' }],
    'ValidarEmailInbound': [baseInicio, { label: 'Serve Email', url: createPageUrl('SuperAdmin') }, { label: 'Validar Inbound' }],
    
    // DIAGNÓSTICOS
    'DiagnosticoProducao': [baseInicio, { label: 'Diagnósticos' }],
    'DiagnosticoMigracaoMedicoId': [baseInicio, { label: 'Diagnósticos' }, { label: 'Migration medico_id' }],
    'DiagnosticoEmailConvites': [baseInicio, { label: 'Diagnósticos' }, { label: 'Email Convites' }],
    'DiagnosticoIsolamentoPlanos': [baseInicio, { label: 'Diagnósticos' }, { label: 'Isolamento Planos' }]
  };

  // Retornar hierarquia mapeada ou fallback simples
  return pageHierarchy[pageName] || [baseInicio, { label: pageName }];
}