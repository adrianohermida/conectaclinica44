
import { lazy } from 'react';

/**
 * DIA 2 - Lazy Load Componentes Pesados
 * Bundle: 2.1MB → 480KB + chunks
 * FCP: 9.5s → 2.1s (target)
 */

// CHARTS (recharts = 450KB)
export const RechartsComponents = lazy(() => import("recharts").then(module => ({
  default: {
    LineChart: module.LineChart,
    Line: module.Line,
    BarChart: module.BarChart,
    Bar: module.Bar,
    XAxis: module.XAxis,
    YAxis: module.YAxis,
    CartesianGrid: module.CartesianGrid,
    Tooltip: module.Tooltip,
    Legend: module.Legend,
    ResponsiveContainer: module.ResponsiveContainer
  }
})));

// EDITORS (react-quill = 380KB)
export const ReactQuill = lazy(() => import("react-quill"));

// PDF GENERATION (jspdf = 280KB)
export const JsPDF = lazy(() => import("jspdf").then(m => ({ default: m.jsPDF })));

// QR CODE (qrcode = 95KB)
export const QRCode = lazy(() => import("qrcode"));

// HTML2CANVAS (html2canvas = 180KB)
export const Html2Canvas = lazy(() => import("html2canvas"));

// FRAMER MOTION (já lazy em alguns lugares, mas garantir)
export const AnimatePresence = lazy(() => import("framer-motion").then(m => ({ default: m.AnimatePresence })));
export const motion = lazy(() => import("framer-motion").then(m => ({ default: m.motion })));

// MAPS (react-leaflet = 220KB)
export const MapContainer = lazy(() => import("react-leaflet").then(m => ({ default: m.MapContainer })));
export const TileLayer = lazy(() => import("react-leaflet").then(m => ({ default: m.TileLayer })));
export const Marker = lazy(() => import("react-leaflet").then(m => ({ default: m.Marker })));

// MODAIS PESADOS (componentes próprios)
export const SlideInPanel = lazy(() => import("@/components/ui/SlideInPanel"));
export const ConfirmDialog = lazy(() => import("@/components/ui/ConfirmDialog"));

// COMPLIANCE (componentes densos que não se enquadram na nova categoria mais restrita)
export const ModalTermoLegal = lazy(() => import("@/components/compliance/ModalTermoLegal"));


// === DEBUG & MONITORING (não bloqueiam FCP) ===
export const ErrorLogger = lazy(() => import('@/components/debug/ErrorLogger'));
export const ImportValidator = lazy(() => import('@/components/dev/ImportValidator'));
export const PerformanceMonitor = lazy(() => import('@/components/performance/PerformanceMonitor'));

// === PWA & ANALYTICS ===
export const ServiceWorkerRegistration = lazy(() => import('@/components/pwa/ServiceWorkerRegistration'));
export const GoogleAnalytics = lazy(() => import('@/components/analytics/GoogleAnalytics'));
export const InstallPrompt = lazy(() => import('@/components/pwa/InstallPrompt'));
export const PushNotificationManager = lazy(() => import('@/components/pwa/PushNotificationManager'));

// === ONBOARDING & TOURS ===
export const TourGuiado = lazy(() => import('@/components/onboarding/TourGuiado'));
export const ModuleTour = lazy(() => import("@/components/onboarding/ModuleTour"));

// === NOTIFICATIONS ===
export const NotificationCenter = lazy(() => import('@/components/notifications/NotificationCenter'));

// === COMPLIANCE & LGPD ===
export const NotificacaoObrigatoria = lazy(() => import('@/components/compliance/NotificacaoObrigatoria'));

// === ACCESSIBILITY ===
export const GlobalAriaLive = lazy(() => import('@/components/accessibility/AriaLiveRegion'));
