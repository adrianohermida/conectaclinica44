import { lazy } from 'react';

// RECHARTS = 180KB - lazy load completo
export const LineChart = lazy(() => import('recharts').then(m => ({ default: m.LineChart })));
export const BarChart = lazy(() => import('recharts').then(m => ({ default: m.BarChart })));
export const PieChart = lazy(() => import('recharts').then(m => ({ default: m.PieChart })));
export const AreaChart = lazy(() => import('recharts').then(m => ({ default: m.AreaChart })));

export const Line = lazy(() => import('recharts').then(m => ({ default: m.Line })));
export const Bar = lazy(() => import('recharts').then(m => ({ default: m.Bar })));
export const Pie = lazy(() => import('recharts').then(m => ({ default: m.Pie })));
export const Area = lazy(() => import('recharts').then(m => ({ default: m.Area })));

export const XAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
export const YAxis = lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
export const CartesianGrid = lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid })));
export const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
export const Legend = lazy(() => import('recharts').then(m => ({ default: m.Legend })));
export const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));