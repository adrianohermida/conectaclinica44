import { lazy } from 'react';

/**
 * Lazy Loading de Páginas Beta - Performance Critical
 * Reduz bundle inicial em ~40%
 */

// Beta modules - heavy, load on demand
export const LazyJornadaPaciente = lazy(() => import('@/pages/JornadaPaciente'));
export const LazyPlanosTratamento = lazy(() => import('@/pages/PlanosTratamento'));
export const LazyAnaliseDocumentosIA = lazy(() => import('@/pages/AnaliseDocumentosIA'));
export const LazyColaboracaoMedica = lazy(() => import('@/pages/ColaboracaoMedica'));
export const LazyTelemedicina = lazy(() => import('@/pages/Telemedicina'));
export const LazyGestaoEquipe = lazy(() => import('@/pages/GestaoEquipe'));

// Heavy admin pages
export const LazyMetaLabs = lazy(() => import('@/pages/MetaLabs'));
export const LazyRelatorios = lazy(() => import('@/pages/Relatorios'));
export const LazyDashboardPerformance = lazy(() => import('@/pages/DashboardPerformance'));
export const LazyAuditoriaLGPD = lazy(() => import('@/pages/AuditoriaLGPD'));
export const LazyAuditoriaUXDashboard = lazy(() => import('@/pages/AuditoriaUXDashboard'));

// Preload on hover for instant navigation
export const preloadPage = (PageComponent) => {
  if (PageComponent.preload) {
    PageComponent.preload();
  }
};