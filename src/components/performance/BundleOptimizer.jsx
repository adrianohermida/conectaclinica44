/**
 * Bundle Optimizer - Estratégias de Code Splitting
 * 
 * PROBLEMA CRÍTICO (PageSpeed):
 * - 14.6s de JavaScript não utilizado
 * - 33.5s de JavaScript não minificado
 * = 48.1 SEGUNDOS de desperdício em mobile
 * 
 * SOLUÇÃO:
 * 1. Route-based splitting (cada página = chunk separado)
 * 2. Component-based splitting (lazy load pesados)
 * 3. Vendor splitting (React/libs separados)
 * 4. Dynamic imports estratégicos
 */

import { lazy } from 'react';

/**
 * TIER 1: CRITICAL PATH (inline no bundle principal)
 * - Layout shell
 * - Auth
 * - Router
 * Total: ~50kb gzipped
 */
export const criticalComponents = {
  // Apenas o essencial para FCP
  layout: 'inline',
  auth: 'inline',
  router: 'inline'
};

/**
 * TIER 2: ABOVE THE FOLD (priority lazy load)
 * - Header
 * - Sidebar
 * - Page header
 * Carregam em paralelo após critical path
 */
export const aboveFoldComponents = {
  Header: lazy(() => import('@/components/layout/LazySidebar')),
  PageHeader: lazy(() => import('@/components/ui/PageHeader')),
  Breadcrumb: lazy(() => import('@/components/ui/Breadcrumb'))
};

/**
 * TIER 3: BELOW THE FOLD (lazy on scroll/interaction)
 * - Charts (recharts = 200kb!)
 * - Forms complexos
 * - Modais
 * - Chat widgets
 */
export const belowFoldComponents = {
  // Charts (PESADO - 200kb)
  Charts: lazy(() => import('recharts')),
  
  // Rich text editor (PESADO - 150kb)
  ReactQuill: lazy(() => import('react-quill')),
  
  // Modais (não bloqueiam FCP)
  Modal: lazy(() => import('@/components/ui/Modal')),
  SlideInPanel: lazy(() => import('@/components/ui/SlideInPanel')),
  ConfirmDialog: lazy(() => import('@/components/ui/ConfirmDialog')),
  
  // Chat e notificações (não críticos)
  UnifiedChatWidget: lazy(() => import('@/components/chat/UnifiedChatWidget')),
  NotificationCenter: lazy(() => import('@/components/notifications/NotificationCenter')),
  
  // Forms complexos
  FormularioPacienteCompleto: lazy(() => import('@/components/contato/FormularioPacienteCompleto')),
  ProntuarioForm: lazy(() => import('@/components/prontuario/ProntuarioForm')),
  
  // Import tools
  ImportadorContatosAvancado: lazy(() => import('@/components/contato/ImportadorContatosAvancado'))
};

/**
 * TIER 4: ON DEMAND (apenas quando explicitamente requisitado)
 * - Admin tools
 * - Settings
 * - Analytics
 * - Debug tools
 */
export const onDemandComponents = {
  ErrorLogger: lazy(() => import('@/components/debug/ErrorLogger')),
  GestaoEquipe: lazy(() => import('@/pages/GestaoEquipe')),
  ConfiguracaoClinica: lazy(() => import('@/pages/ConfiguracaoClinica')),
  Relatorios: lazy(() => import('@/pages/Relatorios'))
};

/**
 * Route-based Code Splitting
 * CRÍTICO: Cada página = chunk separado
 */
export const lazyPages = {
  DashboardCompleto: lazy(() => import('@/pages/DashboardCompleto')),
  Agenda: lazy(() => import('@/pages/Agenda')),
  Pacientes: lazy(() => import('@/pages/Pacientes')),
  Prontuarios: lazy(() => import('@/pages/Prontuarios')),
  Atendimento: lazy(() => import('@/pages/Atendimento')),
  Produtos: lazy(() => import('@/pages/Produtos')),
  Administracao: lazy(() => import('@/pages/Administracao')),
  
  // Super Admin (PESADO - só carrega se necessário)
  SuperAdmin: lazy(() => import('@/pages/SuperAdmin')),
  GestaoClinicas: lazy(() => import('@/pages/GestaoClinicas')),
  
  // Públicas (separar do bundle autenticado)
  Home: lazy(() => import('@/pages/Home')),
  PlanosPrecos: lazy(() => import('@/pages/PlanosPrecos'))
};

/**
 * Prefetch Strategy
 * Carregar chunks prováveis ANTES do usuário clicar
 */
export const prefetchStrategies = {
  // Dashboard → provavelmente irá para Agenda ou Pacientes
  DashboardCompleto: ['Agenda', 'Pacientes'],
  
  // Pacientes → provavelmente criar/editar ou ver prontuários
  Pacientes: ['FormularioPacienteCompleto', 'Prontuarios'],
  
  // Agenda → provavelmente criar agendamento
  Agenda: ['CalendarioDisponibilidade'],
  
  // Atendimento → provavelmente usar templates ou IA
  Atendimento: ['GestaoTemplates', 'IADiagnostico']
};

/**
 * Webpack Magic Comments (se suportado)
 * Adiciona hints para o bundler
 */
export const webpackHints = {
  // Preload = alta prioridade (paralelo ao bundle principal)
  preload: '/* webpackPreload: true */',
  
  // Prefetch = baixa prioridade (quando browser estiver idle)
  prefetch: '/* webpackPrefetch: true */',
  
  // Chunk names para debug
  chunkName: (name) => `/* webpackChunkName: "${name}" */`
};