/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AceitarConvite from './pages/AceitarConvite';
import AceitesTermosLegais from './pages/AceitesTermosLegais';
import Administracao from './pages/Administracao';
import Agenda from './pages/Agenda';
import AgendaOnline from './pages/AgendaOnline';
import AgendaPublica from './pages/AgendaPublica';
import AnaliseDocumentosIA from './pages/AnaliseDocumentosIA';
import AnalyticsWidget from './pages/AnalyticsWidget';
import AuditoriaAceitesTermos from './pages/AuditoriaAceitesTermos';
import AuditoriaCompliance from './pages/AuditoriaCompliance';
import AuditoriaEmailMultitenant from './pages/AuditoriaEmailMultitenant';
import AuditoriaSeguranca from './pages/AuditoriaSeguranca';
import AuditoriaStyleGuide from './pages/AuditoriaStyleGuide';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import CaixaEntradaEmail from './pages/CaixaEntradaEmail';
import CentralAjuda from './pages/CentralAjuda';
import CentralAjudaPublica from './pages/CentralAjudaPublica';
import Checkout from './pages/Checkout';
import CheckoutSuccess from './pages/CheckoutSuccess';
import ClinicaDetalhes from './pages/ClinicaDetalhes';
import ColaboracaoMedica from './pages/ColaboracaoMedica';
import CompartilhamentoPublico from './pages/CompartilhamentoPublico';
import ComplianceCertidoes from './pages/ComplianceCertidoes';
import ComplianceLGPD from './pages/ComplianceLGPD';
import ConfiguracaoClinica from './pages/ConfiguracaoClinica';
import ConfiguracaoEmail from './pages/ConfiguracaoEmail';
import ConfiguracaoUsuario from './pages/ConfiguracaoUsuario';
import Contato from './pages/Contato';
import ConteudoLegalPublico from './pages/ConteudoLegalPublico';
import ConvitePublico from './pages/ConvitePublico';
import CopywriterBlog from './pages/CopywriterBlog';
import DadosFiscais from './pages/DadosFiscais';
import Dashboard from './pages/Dashboard';
import DashboardAprendizadoIA from './pages/DashboardAprendizadoIA';
import DashboardInteligenciaFAQ from './pages/DashboardInteligenciaFAQ';
import DashboardNotificacoes from './pages/DashboardNotificacoes';
import DashboardPerformance from './pages/DashboardPerformance';
import Documentacao from './pages/Documentacao';
import EmailsRecebidos from './pages/EmailsRecebidos';
import Erro404 from './pages/Erro404';
import Estoque from './pages/Estoque';
import ExportarDadosPaciente from './pages/ExportarDadosPaciente';
import Financeiro from './pages/Financeiro';
import FinanceiroPlataforma from './pages/FinanceiroPlataforma';
import FiscalContabil from './pages/FiscalContabil';
import GerenciadorConectores from './pages/GerenciadorConectores';
import GerenciamentoPrecos from './pages/GerenciamentoPrecos';
import GerenciamentoSecrets from './pages/GerenciamentoSecrets';
import GerenciarAssinatura from './pages/GerenciarAssinatura';
import GerenciarImportacoes from './pages/GerenciarImportacoes';
import GerenciarPermissoes from './pages/GerenciarPermissoes';
import GerenciarProdutosStripe from './pages/GerenciarProdutosStripe';
import GestaoArmazenamento from './pages/GestaoArmazenamento';
import GestaoBlog from './pages/GestaoBlog';
import GestaoClinicas from './pages/GestaoClinicas';
import GestaoConteudo from './pages/GestaoConteudo';
import GestaoConteudoLegal from './pages/GestaoConteudoLegal';
import GestaoEquipe from './pages/GestaoEquipe';
import GestaoFAQ from './pages/GestaoFAQ';
import GestaoLeads from './pages/GestaoLeads';
import GestaoMenu from './pages/GestaoMenu';
import GestaoNewsletter from './pages/GestaoNewsletter';
import GestaoPlanos from './pages/GestaoPlanos';
import GestaoPublico from './pages/GestaoPublico';
import GestaoSendGrid from './pages/GestaoSendGrid';
import GestaoSocietaria from './pages/GestaoSocietaria';
import GestaoTermosLegais from './pages/GestaoTermosLegais';
import Helpdesk from './pages/Helpdesk';
import Home from './pages/Home';
import HubCompliance from './pages/HubCompliance';
import HubConfiguracao from './pages/HubConfiguracao';
import HubDiagnosticos from './pages/HubDiagnosticos';
import HubEmail from './pages/HubEmail';
import HubIntegracoes from './pages/HubIntegracoes';
import HubMonetizacao from './pages/HubMonetizacao';
import HubMonitoramento from './pages/HubMonitoramento';
import HubPortais from './pages/HubPortais';
import HubTestes from './pages/HubTestes';
import Index from './pages/Index';
import JornadaPaciente from './pages/JornadaPaciente';
import LogsAuditoria from './pages/LogsAuditoria';
import MapaRotas from './pages/MapaRotas';
import MarketingOutbound from './pages/MarketingOutbound';
import MetricasAssinaturas from './pages/MetricasAssinaturas';
import MeuConsumoWidget from './pages/MeuConsumoWidget';
import MeuPerfil from './pages/MeuPerfil';
import MinhasAssinaturas from './pages/MinhasAssinaturas';
import MonitoramentoIA from './pages/MonitoramentoIA';
import MonitoramentoWidget from './pages/MonitoramentoWidget';
import OnboardingClinica from './pages/OnboardingClinica';
import OnboardingSecretariaIA from './pages/OnboardingSecretariaIA';
import PacienteDetalhes from './pages/PacienteDetalhes';
import Pacientes from './pages/Pacientes';
import PaletaTokensCSS from './pages/PaletaTokensCSS';
import PipelineQualidade from './pages/PipelineQualidade';
import PlanejamentoEstrategico from './pages/PlanejamentoEstrategico';
import Planos from './pages/Planos';
import PlanosPrecos from './pages/PlanosPrecos';
import PlanosTratamento from './pages/PlanosTratamento';
import PoliticaPrivacidade from './pages/PoliticaPrivacidade';
import PortalMedico from './pages/PortalMedico';
import PortalPaciente from './pages/PortalPaciente';
import PrescricoesEletronicas from './pages/PrescricoesEletronicas';
import Produtos from './pages/Produtos';
import Prontuarios from './pages/Prontuarios';
import RecargaCreditos from './pages/RecargaCreditos';
import RecargaCreditosSuccess from './pages/RecargaCreditosSuccess';
import RecuperarSenha from './pages/RecuperarSenha';
import RelatorioVendasPorUsuario from './pages/RelatorioVendasPorUsuario';
import Relatorios from './pages/Relatorios';
import Repositorio from './pages/Repositorio';
import RoadmapSidebarApps from './pages/RoadmapSidebarApps';
import SetupWebhookSendGrid from './pages/SetupWebhookSendGrid';
import SistemasGov from './pages/SistemasGov';
import Sitemap from './pages/Sitemap';
import SobreNos from './pages/SobreNos';
import StatusSistema from './pages/StatusSistema';
import StyleGuide from './pages/StyleGuide';
import SuperAdmin from './pages/SuperAdmin';
import SuperAdminAutentique from './pages/SuperAdminAutentique';
import SuperAdminBilling from './pages/SuperAdminBilling';
import SuperAdminSendGrid from './pages/SuperAdminSendGrid';
import Telemedicina from './pages/Telemedicina';
import TermosUso from './pages/TermosUso';
import TesteModalTermoBrutal from './pages/TesteModalTermoBrutal';
import TestesCompliance from './pages/TestesCompliance';
import TestesE2E from './pages/TestesE2E';
import Tratamentos from './pages/Tratamentos';
import gestaosendgrid from './pages/_GestaoSendGrid';
import monitoramentoia from './pages/_MonitoramentoIA';
import monitoramentowidget from './pages/_MonitoramentoWidget';
import superadminsendgrid from './pages/_SuperAdminSendGrid';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AceitarConvite": AceitarConvite,
    "AceitesTermosLegais": AceitesTermosLegais,
    "Administracao": Administracao,
    "Agenda": Agenda,
    "AgendaOnline": AgendaOnline,
    "AgendaPublica": AgendaPublica,
    "AnaliseDocumentosIA": AnaliseDocumentosIA,
    "AnalyticsWidget": AnalyticsWidget,
    "AuditoriaAceitesTermos": AuditoriaAceitesTermos,
    "AuditoriaCompliance": AuditoriaCompliance,
    "AuditoriaEmailMultitenant": AuditoriaEmailMultitenant,
    "AuditoriaSeguranca": AuditoriaSeguranca,
    "AuditoriaStyleGuide": AuditoriaStyleGuide,
    "Blog": Blog,
    "BlogPost": BlogPost,
    "CaixaEntradaEmail": CaixaEntradaEmail,
    "CentralAjuda": CentralAjuda,
    "CentralAjudaPublica": CentralAjudaPublica,
    "Checkout": Checkout,
    "CheckoutSuccess": CheckoutSuccess,
    "ClinicaDetalhes": ClinicaDetalhes,
    "ColaboracaoMedica": ColaboracaoMedica,
    "CompartilhamentoPublico": CompartilhamentoPublico,
    "ComplianceCertidoes": ComplianceCertidoes,
    "ComplianceLGPD": ComplianceLGPD,
    "ConfiguracaoClinica": ConfiguracaoClinica,
    "ConfiguracaoEmail": ConfiguracaoEmail,
    "ConfiguracaoUsuario": ConfiguracaoUsuario,
    "Contato": Contato,
    "ConteudoLegalPublico": ConteudoLegalPublico,
    "ConvitePublico": ConvitePublico,
    "CopywriterBlog": CopywriterBlog,
    "DadosFiscais": DadosFiscais,
    "Dashboard": Dashboard,
    "DashboardAprendizadoIA": DashboardAprendizadoIA,
    "DashboardInteligenciaFAQ": DashboardInteligenciaFAQ,
    "DashboardNotificacoes": DashboardNotificacoes,
    "DashboardPerformance": DashboardPerformance,
    "Documentacao": Documentacao,
    "EmailsRecebidos": EmailsRecebidos,
    "Erro404": Erro404,
    "Estoque": Estoque,
    "ExportarDadosPaciente": ExportarDadosPaciente,
    "Financeiro": Financeiro,
    "FinanceiroPlataforma": FinanceiroPlataforma,
    "FiscalContabil": FiscalContabil,
    "GerenciadorConectores": GerenciadorConectores,
    "GerenciamentoPrecos": GerenciamentoPrecos,
    "GerenciamentoSecrets": GerenciamentoSecrets,
    "GerenciarAssinatura": GerenciarAssinatura,
    "GerenciarImportacoes": GerenciarImportacoes,
    "GerenciarPermissoes": GerenciarPermissoes,
    "GerenciarProdutosStripe": GerenciarProdutosStripe,
    "GestaoArmazenamento": GestaoArmazenamento,
    "GestaoBlog": GestaoBlog,
    "GestaoClinicas": GestaoClinicas,
    "GestaoConteudo": GestaoConteudo,
    "GestaoConteudoLegal": GestaoConteudoLegal,
    "GestaoEquipe": GestaoEquipe,
    "GestaoFAQ": GestaoFAQ,
    "GestaoLeads": GestaoLeads,
    "GestaoMenu": GestaoMenu,
    "GestaoNewsletter": GestaoNewsletter,
    "GestaoPlanos": GestaoPlanos,
    "GestaoPublico": GestaoPublico,
    "GestaoSendGrid": GestaoSendGrid,
    "GestaoSocietaria": GestaoSocietaria,
    "GestaoTermosLegais": GestaoTermosLegais,
    "Helpdesk": Helpdesk,
    "Home": Home,
    "HubCompliance": HubCompliance,
    "HubConfiguracao": HubConfiguracao,
    "HubDiagnosticos": HubDiagnosticos,
    "HubEmail": HubEmail,
    "HubIntegracoes": HubIntegracoes,
    "HubMonetizacao": HubMonetizacao,
    "HubMonitoramento": HubMonitoramento,
    "HubPortais": HubPortais,
    "HubTestes": HubTestes,
    "Index": Index,
    "JornadaPaciente": JornadaPaciente,
    "LogsAuditoria": LogsAuditoria,
    "MapaRotas": MapaRotas,
    "MarketingOutbound": MarketingOutbound,
    "MetricasAssinaturas": MetricasAssinaturas,
    "MeuConsumoWidget": MeuConsumoWidget,
    "MeuPerfil": MeuPerfil,
    "MinhasAssinaturas": MinhasAssinaturas,
    "MonitoramentoIA": MonitoramentoIA,
    "MonitoramentoWidget": MonitoramentoWidget,
    "OnboardingClinica": OnboardingClinica,
    "OnboardingSecretariaIA": OnboardingSecretariaIA,
    "PacienteDetalhes": PacienteDetalhes,
    "Pacientes": Pacientes,
    "PaletaTokensCSS": PaletaTokensCSS,
    "PipelineQualidade": PipelineQualidade,
    "PlanejamentoEstrategico": PlanejamentoEstrategico,
    "Planos": Planos,
    "PlanosPrecos": PlanosPrecos,
    "PlanosTratamento": PlanosTratamento,
    "PoliticaPrivacidade": PoliticaPrivacidade,
    "PortalMedico": PortalMedico,
    "PortalPaciente": PortalPaciente,
    "PrescricoesEletronicas": PrescricoesEletronicas,
    "Produtos": Produtos,
    "Prontuarios": Prontuarios,
    "RecargaCreditos": RecargaCreditos,
    "RecargaCreditosSuccess": RecargaCreditosSuccess,
    "RecuperarSenha": RecuperarSenha,
    "RelatorioVendasPorUsuario": RelatorioVendasPorUsuario,
    "Relatorios": Relatorios,
    "Repositorio": Repositorio,
    "RoadmapSidebarApps": RoadmapSidebarApps,
    "SetupWebhookSendGrid": SetupWebhookSendGrid,
    "SistemasGov": SistemasGov,
    "Sitemap": Sitemap,
    "SobreNos": SobreNos,
    "StatusSistema": StatusSistema,
    "StyleGuide": StyleGuide,
    "SuperAdmin": SuperAdmin,
    "SuperAdminAutentique": SuperAdminAutentique,
    "SuperAdminBilling": SuperAdminBilling,
    "SuperAdminSendGrid": SuperAdminSendGrid,
    "Telemedicina": Telemedicina,
    "TermosUso": TermosUso,
    "TesteModalTermoBrutal": TesteModalTermoBrutal,
    "TestesCompliance": TestesCompliance,
    "TestesE2E": TestesE2E,
    "Tratamentos": Tratamentos,
    "_GestaoSendGrid": gestaosendgrid,
    "_MonitoramentoIA": monitoramentoia,
    "_MonitoramentoWidget": monitoramentowidget,
    "_SuperAdminSendGrid": superadminsendgrid,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};