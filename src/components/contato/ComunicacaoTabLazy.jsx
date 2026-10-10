import React, { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

const ComunicacaoTab = lazy(() => import("./ComunicacaoTab"));

export default function ComunicacaoTabLazy(props) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7E57FF' }} />
        <span className="sr-only">Carregando comunicações...</span>
      </div>
    }>
      <ComunicacaoTab {...props} />
    </Suspense>
  );
}