import { lazy } from 'react';

/**
 * Lazy-loaded Dashboard Components
 * CRÍTICO: Code splitting para reduzir bundle inicial
 * Economia estimada: 3-5s no FCP
 */

// Charts e visualizações (PESADOS - 200kb+)
export const RechartsComponents = lazy(() => 
  import('recharts').then(module => ({
    default: {
      LineChart: module.LineChart,
      BarChart: module.BarChart,
      PieChart: module.PieChart,
      AreaChart: module.AreaChart,
      Line: module.Line,
      Bar: module.Bar,
      Pie: module.Pie,
      Area: module.Area,
      XAxis: module.XAxis,
      YAxis: module.YAxis,
      CartesianGrid: module.CartesianGrid,
      Tooltip: module.Tooltip,
      Legend: module.Legend,
      ResponsiveContainer: module.ResponsiveContainer,
      Cell: module.Cell
    }
  }))
);

// Stats cards podem ser lazy (abaixo do fold)
export const StatCards = lazy(() => 
  import('@/components/ui/StatCard').then(module => ({ default: module.default }))
);

// Modais e panels (não críticos para FCP)
export const SlideInPanel = lazy(() => import('@/components/ui/SlideInPanel'));
export const Modal = lazy(() => import('@/components/ui/Modal'));
export const ConfirmDialog = lazy(() => import('@/components/ui/ConfirmDialog'));

// Componentes complexos do dashboard
export const AlertaManutencao = lazy(() => import('@/components/dashboard/AlertaManutencao'));
export const NotificationCenter = lazy(() => import('@/components/notifications/NotificationCenter'));
export const UnifiedChatWidget = lazy(() => import('@/components/chat/UnifiedChatWidget'));

// Agenda e prontuários (módulos pesados)
export const CalendarioDisponibilidade = lazy(() => import('@/components/agendamento/CalendarioDisponibilidade'));
export const ProntuarioForm = lazy(() => import('@/components/prontuario/ProntuarioForm'));
export const FormularioPacienteCompleto = lazy(() => import('@/components/contato/FormularioPacienteCompleto'));

// Ferramentas de análise (peso médio-alto)
export const DashboardMetricas = lazy(() => import('@/components/atendimento/DashboardMetricas'));
export const GestaoTemplates = lazy(() => import('@/components/atendimento/GestaoTemplates'));
export const IADiagnostico = lazy(() => import('@/components/prontuario/IADiagnostico'));

// Import utilities (abaixo do fold)
export const ImportadorContatosAvancado = lazy(() => import('@/components/contato/ImportadorContatosAvancado'));
export const ImportadorCSV = lazy(() => import('@/components/importacao/ImportadorCSV'));

// Marketplace (não crítico)
export const MarketplaceKiosk = lazy(() => import('@/components/marketplace/MarketplaceKiosk'));

// Editor de texto (PESADO - 150kb)
export const ReactQuill = lazy(() => 
  import('react-quill').then(module => ({ default: module.default }))
);