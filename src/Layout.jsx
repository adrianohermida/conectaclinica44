import React, { useState, useEffect, Suspense, lazy } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import "./globals.css";
import UserMenu from "@/components/ui/UserMenu";
import ErrorBoundary from "@/components/error/ErrorBoundary";
import ModalTermoObrigatorio from "@/components/compliance/ModalTermoObrigatorio";
import NavigationTracer from "@/components/rotas/NavigationTracer";
import LazySidebar from "@/components/layout/LazySidebar";
import InboxUnificado from "@/components/layout/InboxUnificado";
import BuscaGlobal from "@/components/layout/BuscaGlobal";
const NotificationCenter = lazy(() => import("@/components/notifications/NotificationCenter"));
const ServiceWorkerRegistration = lazy(() => import("@/components/pwa/ServiceWorkerRegistration"));
import ErrorLogger from "@/components/debug/ErrorLogger";
import NotificationStack from "@/components/notifications/NotificationStack";
const UnifiedChatWidget = lazy(() => import("@/components/chat/UnifiedChatWidget"));
import {
    LayoutDashboard,
    Calendar,
    Users as UsersIcon,
    FileText,
    Video,
    Package,
    DollarSign,
    ShoppingCart,
    MessageSquare,
    UserCircle,
    Menu,
    X,
    GitBranch,
    BarChart3,
    Stethoscope,
    Activity,
    Brain,
    UsersRound,
    HelpCircle,
    Settings,
    Bell,
    Target,
    Search,
    Grid3x3,
    Building2,
    ChevronRight,
    Eye,
    Shield,
    Zap,
    AlertCircle,
    TrendingUp,
    Globe,
    Mail,
    Headphones,
    Upload,
    CheckCircle2,
    Clock,
    Loader2,
    Database,
    FileSignature,
    HardDrive,
    Cloud,
    Inbox,
    Pill,
    Palette
  } from "lucide-react";
const Select = lazy(() => import("@/components/ui/select").then(m => ({ default: m.Select })));
const SelectContent = lazy(() => import("@/components/ui/select").then(m => ({ default: m.SelectContent })));
const SelectItem = lazy(() => import("@/components/ui/select").then(m => ({ default: m.SelectItem })));
const SelectTrigger = lazy(() => import("@/components/ui/select").then(m => ({ default: m.SelectTrigger })));
const SelectValue = lazy(() => import("@/components/ui/select").then(m => ({ default: m.SelectValue })));
import { base44 } from "@/api/base44Client";
import { usePermissions } from "@/components/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { usePrefetch } from "@/components/hooks/usePrefetch";
import { usePrefetchOnHover } from "@/components/hooks/usePrefetchOnHover";
import { useQueryClient } from "@tanstack/react-query";
import { PlanoProvider, usePlano } from "@/components/providers/PlanoProvider";

const clinicNavigationItems = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, color: "#7E57FF", modulo: "dashboard" },
  { title: "Agenda", url: createPageUrl("Agenda"), icon: Calendar, color: "#7E57FF", modulo: "agenda" },
  { title: "Pacientes", url: createPageUrl("Pacientes"), icon: UsersIcon, color: "#7E57FF", modulo: "pacientes" },
  { title: "Prontuários", url: createPageUrl("Prontuarios"), icon: FileText, color: "#7E57FF", modulo: "prontuarios" },
  { title: "Prescrições", url: createPageUrl("PrescricoesEletronicas"), icon: Pill, color: "#0B7A9E", modulo: "prontuarios" },
  { title: "Produtos", url: createPageUrl("Produtos"), icon: Package, color: "#7E57FF", modulo: "produtos" },
  { title: "Jornada", url: createPageUrl("JornadaPaciente"), icon: Target, color: "#9334e9", modulo: "jornada" },
  { title: "Tratamentos", url: createPageUrl("Tratamentos"), icon: Stethoscope, color: "#0B7A9E", modulo: "planos_tratamento" },
  { title: "Análise IA", url: createPageUrl("AnaliseDocumentosIA"), icon: Brain, color: "#9334e9", modulo: "analise_ia" },
  { title: "Colaboração", url: createPageUrl("ColaboracaoMedica"), icon: UsersRound, color: "#7E57FF", modulo: "colaboracao" },
  { title: "Telemedicina", url: createPageUrl("Telemedicina"), icon: Video, color: "#ea4335", modulo: "telemedicina" },
  { title: "Helpdesk", url: createPageUrl("Helpdesk"), icon: Headphones, color: "#0B7A9E", modulo: "atendimento" },

  { title: "Gestão Clínica", url: createPageUrl("Administracao"), icon: Settings, color: "#5f6368", modulo: "administracao" }
];

const superAdminNavigationItems = [
  { title: "Visão", url: createPageUrl("SuperAdmin"), icon: LayoutDashboard, color: "#7E57FF" },
  
  { title: "Clínicas", url: createPageUrl("GestaoClinicas"), icon: Building2, color: "#7E57FF" },
  
  { title: "Repositório", url: createPageUrl("Repositorio"), icon: HardDrive, color: "#0B7A9E" },
  
  { title: "Planos", url: null, icon: Grid3x3, color: "#7E57FF", submenu: [
    { title: "Catálogo", url: createPageUrl("Planos"), icon: Grid3x3, color: "#7E57FF" },
    { title: "Gestão", url: createPageUrl("GestaoPlanos"), icon: Settings, color: "#7E57FF" },
    { title: "Stripe", url: createPageUrl("GerenciarProdutosStripe"), icon: Package, color: "#7E57FF" },
    { title: "Preços", url: createPageUrl("GerenciamentoPrecos"), icon: DollarSign, color: "#0B7A9E" }
  ]},

  { title: "Financeiro", url: null, icon: DollarSign, color: "#34a853", submenu: [
    { title: "Plataforma", url: createPageUrl("FinanceiroPlataforma"), icon: TrendingUp, color: "#7E57FF" },
    { title: "Hub", url: createPageUrl("HubMonetizacao"), icon: TrendingUp, color: "#34a853" },
    { title: "Billing", url: createPageUrl("SuperAdminBilling"), icon: DollarSign, color: "#34a853" }
  ]},

  { title: "Testes", url: createPageUrl("HubTestes"), icon: Shield, color: "#ea4335", submenu: [
    { title: "E2E", url: createPageUrl("TestesE2E"), icon: Shield, color: "#ea4335" },
    { title: "Compliance", url: createPageUrl("TestesCompliance"), icon: Shield, color: "#ea4335" },
    { title: "CI/CD Backend", url: createPageUrl("PipelineQualidade"), icon: Activity, color: "#7E57FF" }
  ]},

  { title: "Planejamento", url: createPageUrl("PlanejamentoEstrategico"), icon: GitBranch, color: "#9334e9" },

  { title: "🎨 StyleGuide", url: createPageUrl("StyleGuide"), icon: Palette, color: "#7E57FF" },

  { title: "Arquitetura", url: createPageUrl("RoadmapSidebarApps"), icon: Grid3x3, color: "#ea4335" },

  { title: "Monitorar", url: createPageUrl("HubMonitoramento"), icon: Activity, color: "#f59e0b", submenu: [
    { title: "Performance", url: createPageUrl("DashboardPerformance"), icon: Zap, color: "#f59e0b" },
    { title: "Rotas", url: createPageUrl("MapaRotas"), icon: GitBranch, color: "#9334e9" },
    { title: "Métricas", url: createPageUrl("MetricasAssinaturas"), icon: TrendingUp, color: "#0B7A9E" }
  ]},

  { title: "Email", url: createPageUrl("HubEmail"), icon: Mail, color: "#0B7A9E" },
  
  { title: "Integrações", url: createPageUrl("HubIntegracoes"), icon: Zap, color: "#7E57FF" },
  
  { title: "Portais", url: createPageUrl("HubPortais"), icon: UsersIcon, color: "#7E57FF" },

  { title: "Conectores", url: null, icon: Zap, color: "#7E57FF", submenu: [
    { title: "Gestão", url: createPageUrl("GerenciadorConectores"), icon: Grid3x3, color: "#7E57FF" },
    { title: "Secrets", url: createPageUrl("GerenciamentoSecrets"), icon: Shield, color: "#ea4335" },
    { title: "Autentique", url: createPageUrl("SuperAdminAutentique"), icon: FileSignature, color: "#7E57FF" }
  ]},

  { title: "Compliance", url: createPageUrl("HubCompliance"), icon: Shield, color: "#ea4335" },
  
  { title: "Gestão", url: null, icon: Settings, color: "#5f6368", submenu: [
    { title: "Equipe Global", url: createPageUrl("GestaoEquipe"), icon: UsersIcon, color: "#0B7A9E" },
    { title: "Menu Sidebar", url: createPageUrl("GestaoMenu"), icon: Menu, color: "#7E57FF" },
    { title: "Importações", url: createPageUrl("GerenciarImportacoes"), icon: Upload, color: "#7E57FF" },
    { title: "Armazenamento", url: createPageUrl("GestaoArmazenamento"), icon: HardDrive, color: "#34a853" },
    { title: "Assinaturas", url: createPageUrl("MinhasAssinaturas"), icon: FileSignature, color: "#7E57FF" }
  ]},

  { title: "Conteúdo", url: null, icon: Globe, color: "#0B7A9E", submenu: [
    { title: "Hub Conteúdo", url: createPageUrl("GestaoConteudo"), icon: Globe, color: "#7E57FF" },
    { title: "Blog", url: createPageUrl("GestaoBlog"), icon: FileText, color: "#0B7A9E" },
    { title: "Inteligência FAQ", url: createPageUrl("DashboardInteligenciaFAQ"), icon: Brain, color: "#9334e9" },
    { title: "Legal", url: createPageUrl("GestaoConteudoLegal"), icon: Shield, color: "#ea4335" },
    { title: "Newsletter", url: createPageUrl("GestaoNewsletter"), icon: Mail, color: "#0B7A9E" }
  ]},

  { title: "Growth", url: null, icon: TrendingUp, color: "#34a853", submenu: [
    { title: "Leads", url: createPageUrl("GestaoLeads"), icon: Target, color: "#ea4335" },
    { title: "Marketing", url: createPageUrl("MarketingOutbound"), icon: Mail, color: "#fbbc04" },
    { title: "Widget", url: createPageUrl("MonitoramentoWidget"), icon: Activity, color: "#9334e9" },
    { title: "Analytics", url: createPageUrl("AnalyticsWidget"), icon: BarChart3, color: "#0B7A9E" },
    { title: "🧠 Aprendizado IA", url: createPageUrl("DashboardAprendizadoIA"), icon: Brain, color: "#9334e9" }
  ]}
];

const defaultNavigationItems = clinicNavigationItems;

const NavItem = React.memo(({ item, isActive, onClick, badge, submenusAbertos, setSubmenusAbertos, userPermissions, user, medicos = [], pacientes = [], prefetch, temAcessoModulo, planoLoading, depth = 0 }) => {
    const iconBgColor = '#f5f3ff';
    const iconColor = '#7E57FF';

    // FILTRO PORTAIS
    if (item.portalType === 'medico') {
      const isMedico = medicos.some(m => m.email === user?.email);
      if (!isMedico && user?.role !== 'admin') return null;
    }
    if (item.portalType === 'paciente') {
      const isPaciente = pacientes.some(p => p.user_id === user?.id);
      if (!isPaciente && user?.role !== 'admin') return null;
    }

    // ISOLAMENTO DE PLANOS
    const isAdminTotal = user?.role === 'admin';

    // Admin = acesso total SEMPRE | Sem módulo = público | Com módulo = verificar plano
    const moduloDisponivel = isAdminTotal || !item.modulo || temAcessoModulo(item.modulo);

    if (!moduloDisponivel) {
      return null; // Bloqueia silenciosamente
    }
  
  if (item.submenu) {
    const hasSubActive = item.submenu.some(sub => {
      if (sub.url) return location.pathname === sub.url;
      if (sub.submenu) return sub.submenu.some(nested => location.pathname === nested.url);
      return false;
    });
    const itemKey = `${item.title}-${depth}`;
    const isOpen = submenusAbertos.includes(itemKey);
    
    const toggleSubmenu = () => {
      if (isOpen) {
        setSubmenusAbertos(submenusAbertos.filter(key => key !== itemKey));
      } else {
        setSubmenusAbertos([...submenusAbertos, itemKey]);
      }
    };
    
    return (
      <div>
        <button
            onClick={toggleSubmenu}
            className={`group flex items-center gap-2.5 md:gap-3 px-3 py-2.5 md:py-3 rounded-xl transition-all w-full min-h-[48px] ${
              hasSubActive ? "" : "hover:bg-gray-50"
            } ${!moduloDisponivel ? 'opacity-40 cursor-not-allowed' : ''}`}
            style={hasSubActive ? { backgroundColor: depth > 0 ? 'transparent' : '#f5f3ff' } : {}}
          disabled={!moduloDisponivel}
        >
          <div 
            className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 pc-transition"
            style={{ backgroundColor: hasSubActive && depth === 0 ? iconColor : iconBgColor }}
          >
            <item.icon 
              className="w-4.5 h-4.5 md:w-5 md:h-5" 
              style={{ color: hasSubActive && depth === 0 ? '#ffffff' : iconColor }}
            />
          </div>
          <span className={`font-normal text-sm md:text-[14.5px] pc-transition-fast flex-1 text-left truncate ${
            hasSubActive && depth === 0 ? 'text-[var(--pc-text-primary)] font-medium' : 'text-[var(--pc-text-secondary)]'
          }`}>
            {item.title}
          </span>
          <ChevronRight className={`w-3.5 h-3.5 md:w-4 md:h-4 pc-transition flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
        </button>
        {isOpen && (
            <div className="ml-5 md:ml-6 mt-1 space-y-1">
              {item.submenu.map(subItem => {
                const subActive = subItem.url ? location.pathname === subItem.url : false;
                // SIMPLIFICADO: só usa PlanoProvider
                const subAdminTotal = user?.role === 'admin';
                const subDisponivel = subAdminTotal || !subItem.modulo || temAcessoModulo(subItem.modulo);

                // Recursão para submenus aninhados
                if (subItem.submenu) {
                  return (
                    <NavItem
                      key={subItem.title}
                      item={subItem}
                      isActive={false}
                      onClick={onClick}
                      badge={0}
                      submenusAbertos={submenusAbertos}
                      setSubmenusAbertos={setSubmenusAbertos}
                      userPermissions={userPermissions}
                      user={user}
                      medicos={medicos}
                      pacientes={pacientes}
                      prefetch={prefetch}
                      temAcessoModulo={temAcessoModulo}
                      planoLoading={planoLoading}
                      depth={depth + 1}
                    />
                  );
                }

                if (!subDisponivel) return null;

                return (
                  <Link
                    key={subItem.title}
                    to={subItem.url}
                    onClick={onClick}
                    className={`flex items-center gap-2.5 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg transition-all min-h-[44px] ${
                      subActive ? "" : "hover:bg-gray-50"
                    }`}
                    style={subActive ? { backgroundColor: '#f5f3ff' } : {}}
                  >
                    <subItem.icon className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" style={{ color: '#7E57FF' }} />
                    <span className="text-xs md:text-sm truncate">{subItem.title}</span>
                  </Link>
                );
              })}
            </div>
          )}
      </div>
    );
  }
  
  if (!moduloDisponivel) {
    return null; // Ocultar completamente módulos não disponíveis
  }

  return (
    <Link
      to={item.url}
      onClick={onClick}
      onMouseEnter={() => {
        // DIA 1: Prefetch on hover
        if (item.title === "Agenda" && user?.clinica_id) {
          prefetch.agenda?.(user.clinica_id);
        } else if (item.title === "Prontuários" && user?.clinica_id) {
          prefetch.prontuarios?.(user.clinica_id);
        } else if (item.title === "Contatos" && user?.clinica_id) {
            prefetch.pacientes?.(user.clinica_id);
          } else if (item.title === "Helpdesk" && user?.clinica_id) {
            prefetch.atendimento?.(user.clinica_id);
          }
      }}
      className={`group flex items-center gap-2.5 md:gap-3 px-3 py-2.5 md:py-3 rounded-xl transition-all min-h-[48px] ${
        isActive ? "" : "hover:bg-gray-50"
      }`}
      style={isActive ? { backgroundColor: 'var(--pc-primary-50)' } : {}}
      aria-current={isActive ? "page" : undefined}
    >
      <div 
        className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 pc-transition"
        style={{ backgroundColor: isActive ? '#7E57FF' : '#f5f3ff' }}
      >
        <item.icon 
          className="w-4.5 h-4.5 md:w-5 md:h-5" 
          style={{ color: isActive ? 'var(--pc-text-on-primary)' : 'var(--pc-primary)' }}
        />
      </div>
      <span className={`font-normal text-sm md:text-[14.5px] pc-transition-fast truncate ${
        isActive ? 'text-[var(--pc-text-primary)] font-medium' : 'text-[var(--pc-text-secondary)]'
      }`}>
        {item.title}
      </span>
      {item.beta && (
        <span className="ml-auto pc-badge pc-badge-warning text-[9px] md:text-[10px] whitespace-nowrap">Beta</span>
      )}
      {badge > 0 && (
        <span className="ml-auto bg-[var(--pc-error)] text-white text-[9px] md:text-[10px] font-bold rounded-full min-w-[16px] md:min-w-[18px] h-[16px] md:h-[18px] px-1 md:px-1.5 flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
});

function LayoutContent({ children }) {
  const location = useLocation();
  // Páginas autenticadas - sem detecção de público aqui (já feita no wrapper)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [navigationItems, setNavigationItems] = useState(defaultNavigationItems);
  const [isSuperAdminView, setIsSuperAdminView] = useState(false);
  const [submenusAbertos, setSubmenusAbertos] = useState([]);
  const [planosDisponiveis, setPlanosDisponiveis] = useState([]);
  const [planoVisualizacao, setPlanoVisualizacao] = useState(null);
  const [superAdminModeActive, setSuperAdminModeActive] = useState(false);
  const [clinicaSwitcher, setClinicaSwitcher] = useState(null);
  const [clinicasDisponiveis, setClinicasDisponiveis] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  
  // FONTE ÚNICA DE VERDADE PARA PLANOS
  const { planoAtivo, isLoading: planoLoading, temAcessoModulo, user } = usePlano();
  const userPermissions = usePermissions();
  const queryClient = useQueryClient();

  // DEBUG: Log do plano após user estar disponível
  useEffect(() => {
    if (user) {
      console.log('[Layout] Plano:', { planoLoading, planoAtivo: planoAtivo?.plano_slug, user: user.email });
    }
  }, [planoLoading, planoAtivo, user?.email]);

  // Debug plano (remover depois)
  useEffect(() => {
    if (planoAtivo && user?.clinica_id) {
      console.log('[Layout] Plano ativo:', planoAtivo);
    }
  }, [planoAtivo, user?.clinica_id]);
  
  // DIA 1: Prefetch estratégico (não bloqueia render)
  usePrefetch(user?.clinica_id);
  const prefetch = usePrefetchOnHover();

  // TODOS OS HOOKS DEVEM SER CHAMADOS ANTES DE QUALQUER EARLY RETURN
  // Carregar médicos e pacientes para filtro de portais
  useEffect(() => {
    if (!user?.clinica_id) return;
    
    setTimeout(() => {
      Promise.all([
        base44.entities.Medico.filter({ clinica_id: user.clinica_id }).catch(() => []),
        base44.entities.Contato.filter({ clinica_id: user.clinica_id, tipo_contato: 'paciente' }).catch(() => [])
      ]).then(([medicosData, pacientesData]) => {
        setMedicos(medicosData);
        setPacientes(pacientesData);
      });
    }, 1000);
  }, [user?.clinica_id]);

  useEffect(() => {
    if (!user) return;

    // Debug removido (performance)

    // Check if SuperAdmin
    const isSuperAdmin = user?.role === 'admin' || user?.email === 'contato@aetherlab.com.br';
    const isSuperAdminPath = location.pathname.includes('SuperAdmin') || 
                         location.pathname.includes('MetaLabs') ||
                         location.pathname.includes('PlanoAcao') ||
                         location.pathname.includes('Planos') ||
                         location.pathname.includes('Monetizacao') ||
                         location.pathname.includes('GerenciarProdutosStripe') ||
                         location.pathname.includes('SuperAdminBilling') ||
                         location.pathname.includes('GerenciadorConectores');

    // FIX: Persistir modo SuperAdmin - ativar se estiver em path SuperAdmin ou já estava ativo
    if (isSuperAdmin) {
      if (isSuperAdminPath) {
        setSuperAdminModeActive(true);
      }
      
      // Manter modo SuperAdmin ativo mesmo ao navegar para outras páginas
      const useSuperAdminNav = superAdminModeActive || isSuperAdminPath;
      setIsSuperAdminView(useSuperAdminNav);
      setNavigationItems(useSuperAdminNav ? superAdminNavigationItems : clinicNavigationItems);

      // SuperAdmin tem acesso total via PlanoProvider (já configurado)

      // Defer: Load planos for SuperAdmin switcher após 2s
      if (planosDisponiveis.length === 0) {
        setTimeout(() => {
          base44.entities.PlanoModulo.list()
            .then(todosPlanos => setPlanosDisponiveis(todosPlanos.filter(p => p.ativo)))
            .catch(() => {});
        }, 2000);
      }

      // Load clínicas disponíveis para switcher via backend function
      if (clinicasDisponiveis.length === 0) {
        setTimeout(async () => {
          try {
            const response = await base44.functions.invoke('listarClinicas', {});
            setClinicasDisponiveis(response.data.clinicas || []);
          } catch (error) {
            console.error('Erro ao carregar clínicas:', error);
          }
        }, 2000);
      }
    } else {
      // Não é SuperAdmin
      setSuperAdminModeActive(false);
      setNavigationItems(clinicNavigationItems);
    }
    }, [user, location.pathname, superAdminModeActive]);

  // REMOVIDO: Contagem de notificações (delegado para componentes específicos)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // REMOVIDO: Critical CSS já está no globals.css

  // REMOVIDO: Service Worker já gerenciado pelo ServiceWorkerRegistration component

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Early exit já foi executado acima - este bloco é redundante e foi removido

  // DIA 2: Loading simplificado (sem texto - reduz FCP)
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--pc-bg-secondary)'
      }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          border: '4px solid var(--pc-primary-50)',
          borderTop: '4px solid var(--pc-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
            {/* COMPLIANCE LGPD: Modal bloqueante - APENAS se user autenticado */}
            {user && (
              <Suspense fallback={null}>
                <ModalTermoObrigatorio />
              </Suspense>
            )}

            <div className="min-h-screen" style={{ backgroundColor: 'var(--pc-bg-secondary)' }}>
                  {/* Service Worker - PWA */}
                  <Suspense fallback={null}>
                    <ServiceWorkerRegistration />
                  </Suspense>

                  {/* NavigationTracer */}
                  <Suspense fallback={null}>
                    <NavigationTracer />
                  </Suspense>

                  {/* ErrorLogger - APENAS ADMIN */}
                  {user?.role === 'admin' && <ErrorLogger userRole={user.role} />}

        <a href="#main-content" className="skip-to-content">
          Pular para conteúdo principal
        </a>




      {/* Top Header - Mobile Optimized */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white h-14 md:h-16 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" style={{ borderBottom: '1px solid var(--pc-border-primary)' }}>
        <div className="flex items-center justify-between h-full px-3 md:px-4">
          {/* Left: Logo + Menu */}
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden rounded-full hover:opacity-80 flex items-center justify-center pc-transition-fast"
              style={{ backgroundColor: 'var(--brand-primary-50)', width: '44px', height: '44px', minWidth: '44px', minHeight: '44px' }}
              aria-label={sidebarOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
              aria-expanded={sidebarOpen}
              >
              {sidebarOpen ? <X className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} aria-hidden="true" /> : <Menu className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} aria-hidden="true" />}
            </button>
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2 md:gap-3 min-w-0">
              <Building2 className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
              <span className="text-base md:text-xl font-semibold truncate" style={{ color: 'var(--brand-text-primary)' }}>ConectaClínica</span>
            </Link>
          </div>

          {/* Center: Barra de Busca Global */}
          <BuscaGlobal user={user} />

          {/* Right: Actions + Profile */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {/* Switcher Clínicas (Dev Mode) - Lazy */}
            {user?.role === 'admin' && !superAdminModeActive && clinicasDisponiveis.length > 0 && (
              <div className="mr-1 md:mr-2 hidden sm:block">
                <Suspense fallback={<div className="w-[140px] h-9 bg-gray-100 rounded-full animate-pulse" />}>
                  <Select 
                    value={clinicaSwitcher || user.clinica_id || "global"} 
                    onValueChange={async (value) => {
                      if (value === "global") {
                        setClinicaSwitcher(null);
                        await base44.auth.updateMe({ clinica_id: null });
                        window.location.reload();
                      } else {
                        setClinicaSwitcher(value);
                        await base44.auth.updateMe({ clinica_id: value });
                        window.location.reload();
                      }
                    }}
                  >
                    <SelectTrigger className="w-[140px] md:w-[200px] h-9 md:h-10 bg-[var(--pc-info-50)] border border-[var(--pc-info-200)] rounded-full text-[var(--pc-info-800)] text-xs md:text-sm font-medium">
                      <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
                      <SelectValue placeholder="Ver Clínica" />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 999999 }}>
                      <SelectItem value="global">🌐 Modo Global (Dev)</SelectItem>
                      {clinicasDisponiveis.map(clinica => (
                        <SelectItem key={clinica.id} value={clinica.id}>
                          🏥 {clinica.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Suspense>
              </div>
            )}
            <Suspense fallback={<div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />}>
              <InboxUnificado user={user} />
            </Suspense>
            <Suspense fallback={<div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />}>
              <NotificationCenter user={user} />
            </Suspense>
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      {/* Sidebar - Lazy Loaded for LCP */}
      <LazySidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        navigationItems={navigationItems}
        user={user}
        submenusAbertos={submenusAbertos}
        setSubmenusAbertos={setSubmenusAbertos}
        userPermissions={userPermissions}
        medicos={medicos}
        pacientes={pacientes}
        prefetch={prefetch}
        temAcessoModulo={temAcessoModulo}
        planoLoading={planoLoading}
      />

      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 top-14 md:top-16 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content - Full Width (Google Workspace Style) */}
      <main 
        id="main-content"
        className="lg:ml-64 pt-16 md:pt-20 px-4 md:px-8 pb-24 md:pb-20 min-h-screen"
        style={{ backgroundColor: 'var(--pc-bg-secondary)' }}
        role="main"
        aria-label="Conteúdo principal"
      >
        {children}
      </main>



      {/* Chat Widget - App Autenticado */}
      {user && (
        <Suspense fallback={null}>
          <UnifiedChatWidget user={user} />
        </Suspense>
      )}

      {/* Toast Notification Stack */}
      {user && (
        <Suspense fallback={null}>
          <NotificationStack user={user} />
        </Suspense>
      )}

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 lg:hidden">
          <div className="grid grid-cols-5 h-16">
            {[
              { title: "Início", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
              { title: "Agenda", url: createPageUrl("Agenda"), icon: Calendar },
              { title: "Pacientes", url: createPageUrl("Pacientes"), icon: UsersIcon },
              { title: "Helpdesk", url: createPageUrl("Helpdesk"), icon: Headphones },
              { title: "Gestão", url: createPageUrl("Administracao"), icon: Settings }
            ].map(item => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className="flex flex-col items-center justify-center gap-1"
                  style={isActive ? { backgroundColor: 'var(--pc-primary-50)' } : {}}
                >
                  <item.icon className="w-5 h-5" style={{ color: isActive ? '#7E57FF' : '#80868b' }} />
                  <span className="text-[10px] font-medium" style={{ color: isActive ? '#7E57FF' : '#80868b' }}>
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
      </div>
      </ErrorBoundary>
      );
      }

      export default function Layout({ children }) {
      const location = useLocation();

      // CRITICAL: Detectar páginas públicas ANTES de qualquer hook/query/provider
      const currentPath = location.pathname;
      const publicPaths = [
        '/',
        '/Home',
        '/OnboardingClinica',
        '/AceitarConvite',
        '/Home',
        '/PlanosPrecos',
        '/Checkout',
        '/CheckoutSuccess',
        '/SobreNos',
        '/Blog',
        '/BlogPost',
        '/Contato',
        '/Erro404',
        '/TermosUso',
        '/PoliticaPrivacidade',
        '/ComplianceLGPD',
        '/StatusSistema',
        '/CentralAjuda',
        '/CentralAjudaPublica',
        '/Index'
      ];

      const isPublicPage = publicPaths.some(path => 
        currentPath === path || currentPath === `${path}/` || currentPath.startsWith(`${path}/`)
      );

      // Hook sempre chamado na mesma ordem; desabilitado em páginas públicas
      const { data: user } = useQuery({
        queryKey: ["auth-user"],
        queryFn: () => base44.auth.me(),
        enabled: !isPublicPage,
        staleTime: 15 * 60 * 1000,
        gcTime: 20 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false
      });

      return (
      <PlanoProvider user={user}>
      <LayoutContent>{children}</LayoutContent>
      </PlanoProvider>
      );
      }