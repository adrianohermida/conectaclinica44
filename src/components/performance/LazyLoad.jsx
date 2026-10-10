import React, { Suspense, lazy } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

/**
 * LazyLoad - Wrapper para lazy loading com fallback
 * Reduz bundle inicial e melhora performance
 */
export function LazyLoad({ 
  children, 
  fallback = <LoadingSpinner />,
  minLoadTime = 300 // Evita flash de loading
}) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

/**
 * lazyWithPreload - Lazy load com capacidade de preload
 * Permite precarregar componentes antes de renderizar
 */
export function lazyWithPreload(importFunc) {
  const LazyComponent = lazy(importFunc);
  LazyComponent.preload = importFunc;
  return LazyComponent;
}

/**
 * Lazy pages - Exportar páginas pesadas
 */
export const LazyMetaLabs = lazyWithPreload(() => import("@/pages/MetaLabs"));
export const LazyRelatorios = lazyWithPreload(() => import("@/pages/Relatorios"));
export const LazyJornadaPaciente = lazyWithPreload(() => import("@/pages/JornadaPaciente"));
export const LazyAnaliseDocumentosIA = lazyWithPreload(() => import("@/pages/AnaliseDocumentosIA"));
export const LazyColaboracaoMedica = lazyWithPreload(() => import("@/pages/ColaboracaoMedica"));
export const LazyPlanosTratamento = lazyWithPreload(() => import("@/pages/PlanosTratamento"));

export default LazyLoad;