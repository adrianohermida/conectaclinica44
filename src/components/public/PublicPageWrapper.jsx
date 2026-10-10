import React, { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ErrorBoundary from "@/components/error/ErrorBoundary";
import {
  ErrorLogger,
  ImportValidator,
  PerformanceMonitor,
  ServiceWorkerRegistration,
  GoogleAnalytics,
  InstallPrompt,
  PushNotificationManager,
  GlobalAriaLive
} from "@/components/performance/LazyComponents";
import RealFCPTest from "@/components/performance/RealFCPTest";
import QueryPerformanceMonitor from "@/components/performance/QueryPerformanceMonitor";

/**
 * PublicPageWrapper - Wrapper para páginas públicas
 * Injeta ferramentas de debug/monitoring para admin logado
 */
export default function PublicPageWrapper({ children }) {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 15 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    retry: false
  });

  return (
    <ErrorBoundary>
      {/* Ferramentas de debug/monitoring apenas para admin */}
      {user?.role === 'admin' && (
        <Suspense fallback={null}>
          <ErrorLogger userRole={user?.role} />
          <ImportValidator userRole={user?.role} />
          <PerformanceMonitor />
          <RealFCPTest />
          <QueryPerformanceMonitor />
        </Suspense>
      )}

      {/* PWA e analytics para todos */}
      <Suspense fallback={null}>
        <ServiceWorkerRegistration />
        <GoogleAnalytics />
        <InstallPrompt />
        <GlobalAriaLive />
        <PushNotificationManager />
      </Suspense>

      {children}
    </ErrorBoundary>
  );
}