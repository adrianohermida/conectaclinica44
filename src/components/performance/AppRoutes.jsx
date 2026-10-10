import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import PageSkeleton from "@/components/ui/PageSkeleton";

// CRITICAL: Dashboard é o único eager (primeira página)
import Dashboard from "@/pages/Dashboard";

// LAZY: Todas as outras páginas
const Agenda = lazy(() => import("@/pages/Agenda"));
const Prontuarios = lazy(() => import("@/pages/Prontuarios"));
const Pacientes = lazy(() => import("@/pages/Pacientes"));
const Atendimento = lazy(() => import("@/pages/Atendimento"));
const Administracao = lazy(() => import("@/pages/Administracao"));
const Financeiro = lazy(() => import("@/pages/Financeiro"));
const Produtos = lazy(() => import("@/pages/Produtos"));
const Relatorios = lazy(() => import("@/pages/Relatorios"));
const PlanosTratamento = lazy(() => import("@/pages/PlanosTratamento"));
const JornadaPaciente = lazy(() => import("@/pages/JornadaPaciente"));
const ColaboracaoMedica = lazy(() => import("@/pages/ColaboracaoMedica"));
const Telemedicina = lazy(() => import("@/pages/Telemedicina"));
const Estoque = lazy(() => import("@/pages/Estoque"));
const GestaoEquipe = lazy(() => import("@/pages/GestaoEquipe"));
const ContatoDetalhes = lazy(() => import("@/pages/ContatoDetalhes"));
const ConfiguracaoClinica = lazy(() => import("@/pages/ConfiguracaoClinica"));
const ConfiguracaoEmail = lazy(() => import("@/pages/ConfiguracaoEmail"));
const ConfiguracaoWidget = lazy(() => import("@/pages/ConfiguracaoWidget"));
const ConfiguracaoNotificacao = lazy(() => import("@/pages/ConfiguracaoNotificacao"));

// SuperAdmin
const SuperAdmin = lazy(() => import("@/pages/SuperAdmin"));
const GestaoClinicas = lazy(() => import("@/pages/GestaoClinicas"));
const MetricasAssinaturas = lazy(() => import("@/pages/MetricasAssinaturas"));
const GestaoPlanos = lazy(() => import("@/pages/GestaoPlanos"));
const HubMonetizacao = lazy(() => import("@/pages/HubMonetizacao"));
const GerenciadorConectores = lazy(() => import("@/pages/GerenciadorConectores"));
const MonitoramentoIA = lazy(() => import("@/pages/MonitoramentoIA"));
const DashboardPerformance = lazy(() => import("@/pages/DashboardPerformance"));
const ClinicaDetalhes = lazy(() => import("@/pages/ClinicaDetalhes"));

// Compliance
const LGPDCompliance = lazy(() => import("@/pages/LGPDCompliance"));
const AuditoriaLGPD = lazy(() => import("@/pages/AuditoriaLGPD"));
const ComplianceCertidoes = lazy(() => import("@/pages/ComplianceCertidoes"));
const GestaoTermosLegais = lazy(() => import("@/pages/GestaoTermosLegais"));
const TestesCompliance = lazy(() => import("@/pages/TestesCompliance"));
const AuditoriaAceitesTermos = lazy(() => import("@/pages/AuditoriaAceitesTermos"));

// Portais
const PortalPaciente = lazy(() => import("@/pages/PortalPaciente"));
const PortalMedico = lazy(() => import("@/pages/PortalMedico"));

// Público
const Home = lazy(() => import("@/pages/Home"));
const PlanosPrecos = lazy(() => import("@/pages/PlanosPrecos"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const StatusSistema = lazy(() => import("@/pages/StatusSistema"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        {/* Dashboard eager (FCP crítico) */}
        <Route path="/Dashboard" element={<Dashboard />} />
        
        {/* Módulos principais (lazy) */}
        <Route path="/Agenda" element={<Agenda />} />
        <Route path="/Prontuarios" element={<Prontuarios />} />
        <Route path="/Pacientes" element={<Pacientes />} />
        <Route path="/Atendimento" element={<Atendimento />} />
        <Route path="/Administracao" element={<Administracao />} />
        
        {/* Módulos secundários */}
        <Route path="/Financeiro" element={<Financeiro />} />
        <Route path="/Produtos" element={<Produtos />} />
        <Route path="/Relatorios" element={<Relatorios />} />
        <Route path="/PlanosTratamento" element={<PlanosTratamento />} />
        <Route path="/JornadaPaciente" element={<JornadaPaciente />} />
        <Route path="/ColaboracaoMedica" element={<ColaboracaoMedica />} />
        <Route path="/Telemedicina" element={<Telemedicina />} />
        <Route path="/Estoque" element={<Estoque />} />
        <Route path="/GestaoEquipe" element={<GestaoEquipe />} />
        <Route path="/ContatoDetalhes" element={<ContatoDetalhes />} />
        
        {/* Config */}
        <Route path="/ConfiguracaoClinica" element={<ConfiguracaoClinica />} />
        <Route path="/ConfiguracaoEmail" element={<ConfiguracaoEmail />} />
        <Route path="/ConfiguracaoWidget" element={<ConfiguracaoWidget />} />
        <Route path="/ConfiguracaoNotificacao" element={<ConfiguracaoNotificacao />} />
        
        {/* SuperAdmin */}
        <Route path="/SuperAdmin" element={<SuperAdmin />} />
        <Route path="/GestaoClinicas" element={<GestaoClinicas />} />
        <Route path="/MetricasAssinaturas" element={<MetricasAssinaturas />} />
        <Route path="/GestaoPlanos" element={<GestaoPlanos />} />
        <Route path="/HubMonetizacao" element={<HubMonetizacao />} />
        <Route path="/GerenciadorConectores" element={<GerenciadorConectores />} />
        <Route path="/MonitoramentoIA" element={<MonitoramentoIA />} />
        <Route path="/DashboardPerformance" element={<DashboardPerformance />} />
        <Route path="/ClinicaDetalhes" element={<ClinicaDetalhes />} />
        
        {/* Compliance */}
        <Route path="/LGPDCompliance" element={<LGPDCompliance />} />
        <Route path="/AuditoriaLGPD" element={<AuditoriaLGPD />} />
        <Route path="/ComplianceCertidoes" element={<ComplianceCertidoes />} />
        <Route path="/GestaoTermosLegais" element={<GestaoTermosLegais />} />
        <Route path="/TestesCompliance" element={<TestesCompliance />} />
        <Route path="/AuditoriaAceitesTermos" element={<AuditoriaAceitesTermos />} />
        
        {/* Portais */}
        <Route path="/PortalPaciente" element={<PortalPaciente />} />
        <Route path="/PortalMedico" element={<PortalMedico />} />
        
        {/* Público */}
        <Route path="/" element={<Home />} />
        <Route path="/PlanosPrecos" element={<PlanosPrecos />} />
        <Route path="/Blog" element={<Blog />} />
        <Route path="/BlogPost" element={<BlogPost />} />
        <Route path="/StatusSistema" element={<StatusSistema />} />
      </Routes>
    </Suspense>
  );
}