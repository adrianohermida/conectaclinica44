import { lazy } from 'react';

// === MÓDULOS PRINCIPAIS (lazy load) ===
export const Agenda = lazy(() => import('@/pages/Agenda'));
export const Prontuarios = lazy(() => import('@/pages/Prontuarios'));
export const Pacientes = lazy(() => import('@/pages/Pacientes'));
export const Atendimento = lazy(() => import('@/pages/Atendimento'));
export const Administracao = lazy(() => import('@/pages/Administracao'));

// === MÓDULOS SECUNDÁRIOS ===
export const Financeiro = lazy(() => import('@/pages/Financeiro'));
export const Produtos = lazy(() => import('@/pages/Produtos'));
export const Relatorios = lazy(() => import('@/pages/Relatorios'));
export const PlanosTratamento = lazy(() => import('@/pages/PlanosTratamento'));
export const JornadaPaciente = lazy(() => import('@/pages/JornadaPaciente'));
export const ColaboracaoMedica = lazy(() => import('@/pages/ColaboracaoMedica'));
export const Telemedicina = lazy(() => import('@/pages/Telemedicina'));
export const Estoque = lazy(() => import('@/pages/Estoque'));
export const GestaoEquipe = lazy(() => import('@/pages/GestaoEquipe'));

// === SUPER ADMIN ===
export const SuperAdmin = lazy(() => import('@/pages/SuperAdmin'));
export const GestaoClinicas = lazy(() => import('@/pages/GestaoClinicas'));
export const MetricasAssinaturas = lazy(() => import('@/pages/MetricasAssinaturas'));
export const GestaoPlanos = lazy(() => import('@/pages/GestaoPlanos'));
export const HubMonetizacao = lazy(() => import('@/pages/HubMonetizacao'));
export const GerenciadorConectores = lazy(() => import('@/pages/GerenciadorConectores'));
export const MonitoramentoIA = lazy(() => import('@/pages/MonitoramentoIA'));
export const DashboardPerformance = lazy(() => import('@/pages/DashboardPerformance'));

// === COMPLIANCE ===
export const LGPDCompliance = lazy(() => import('@/pages/LGPDCompliance'));
export const AuditoriaLGPD = lazy(() => import('@/pages/AuditoriaLGPD'));
export const ComplianceCertidoes = lazy(() => import('@/pages/ComplianceCertidoes'));
export const GestaoTermosLegais = lazy(() => import('@/pages/GestaoTermosLegais'));
export const TestesCompliance = lazy(() => import('@/pages/TestesCompliance'));
export const AuditoriaAceitesTermos = lazy(() => import('@/pages/AuditoriaAceitesTermos'));

// === PORTAIS ===
export const PortalPaciente = lazy(() => import('@/pages/PortalPaciente'));
export const PortalMedico = lazy(() => import('@/pages/PortalMedico'));

// === DETALHES ===
export const ContatoDetalhes = lazy(() => import('@/pages/ContatoDetalhes'));
export const ClinicaDetalhes = lazy(() => import('@/pages/ClinicaDetalhes'));

// === CONFIGURAÇÕES ===
export const ConfiguracaoClinica = lazy(() => import('@/pages/ConfiguracaoClinica'));
export const ConfiguracaoEmail = lazy(() => import('@/pages/ConfiguracaoEmail'));
export const ConfiguracaoWidget = lazy(() => import('@/pages/ConfiguracaoWidget'));
export const ConfiguracaoNotificacao = lazy(() => import('@/pages/ConfiguracaoNotificacao'));

// === MARKETING & PÚBLICO ===
export const Home = lazy(() => import('@/pages/Home'));
export const PlanosPrecos = lazy(() => import('@/pages/PlanosPrecos'));
export const Blog = lazy(() => import('@/pages/Blog'));
export const BlogPost = lazy(() => import('@/pages/BlogPost'));
export const StatusSistema = lazy(() => import('@/pages/StatusSistema'));