import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";

/**
 * DIA 2 - Wrapper Suspense com skeleton inteligente
 * Reduz perceived latency durante carregamento de chunks
 */

export function LazyLoadWrapper({ 
  children, 
  fallback = null,
  type = "spinner" // "spinner" | "skeleton" | "none"
}) {
  const renderFallback = () => {
    if (fallback) return fallback;

    if (type === "none") return null;

    if (type === "skeleton") {
      return (
        <div className="animate-pulse space-y-4 p-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      );
    }

    // Default: spinner
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  };

  return (
    <Suspense fallback={renderFallback()}>
      {children}
    </Suspense>
  );
}

// Variantes específicas
export function LazyChart({ children }) {
  return (
    <LazyLoadWrapper type="skeleton">
      {children}
    </LazyLoadWrapper>
  );
}

export function LazyModal({ children }) {
  return (
    <LazyLoadWrapper type="none">
      {children}
    </LazyLoadWrapper>
  );
}

export function LazyPanel({ children }) {
  return (
    <LazyLoadWrapper type="spinner">
      {children}
    </LazyLoadWrapper>
  );
}