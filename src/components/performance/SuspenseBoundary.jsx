import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * DIA 2: Suspense Boundary reutilizável
 * Fallback padronizado para lazy-loaded components
 */
export default function SuspenseBoundary({ children, fallback = null }) {
  const defaultFallback = (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#7E57FF' }} />
        <p className="text-sm" style={{ color: '#5f6368' }}>Carregando...</p>
      </div>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}