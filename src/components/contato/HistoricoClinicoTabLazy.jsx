import React, { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

const HistoricoClinicoTab = lazy(() => import("./HistoricoClinicoTab"));

export default function HistoricoClinicoTabLazy(props) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7E57FF' }} />
        <span className="sr-only">Carregando histórico clínico...</span>
      </div>
    }>
      <HistoricoClinicoTab {...props} />
    </Suspense>
  );
}