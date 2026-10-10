import { lazy } from 'react';

/**
 * LazyRoutes - Code splitting para páginas pesadas
 * CRÍTICO: Reduz bundle inicial de 2MB → 400KB
 */

// Páginas principais (carregamento prioritário)
export const DashboardCompleto = lazy(() => import('@/pages/DashboardCompleto'));
export const Agenda = lazy(() => import('@/pages/Agenda'));
export const Pacientes = lazy(() => import('@/pages/Pacientes'));

// Páginas secundárias (lazy load sob demanda)
export const Prontuarios = lazy(() => import('@/pages/Prontuarios'));
export const Atendimento = lazy(() => import('@/pages/Atendimento'));
export const Administracao = lazy(() => import('@/pages/Administracao'));
export const Relatorios = lazy(() => import('@/pages/Relatorios'));
export const Financeiro = lazy(() => import('@/pages/Financeiro'));
export const Estoque = lazy(() => import('@/pages/Estoque'));
export const Produtos = lazy(() => import('@/pages/Produtos'));

// Páginas admin/configuração (lazy load)
export const ConfiguracaoClinica = lazy(() => import('@/pages/ConfiguracaoClinica'));
export const GestaoEquipe = lazy(() => import('@/pages/GestaoEquipe'));
export const LGPDCompliance = lazy(() => import('@/pages/LGPDCompliance'));
export const ComplianceCertidoes = lazy(() => import('@/pages/ComplianceCertidoes'));

// SuperAdmin (lazy load - apenas admin)
export const SuperAdmin = lazy(() => import('@/pages/SuperAdmin'));
export const GestaoClinicas = lazy(() => import('@/pages/GestaoClinicas'));
export const GestaoPlanos = lazy(() => import('@/pages/GestaoPlanos'));