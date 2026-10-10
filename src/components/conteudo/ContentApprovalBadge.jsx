import React from "react";
import { CheckCircle, XCircle, Clock, Sparkles } from "lucide-react";

/**
 * BADGE APROVAÇÃO - IA/Humano/Pendente
 */
export default function ContentApprovalBadge({ aprovado, origem }) {
  if (aprovado) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">
        <CheckCircle className="w-3 h-3" />
        Aprovado
      </span>
    );
  }

  if (origem === 'ia_sugerida') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold">
        <Sparkles className="w-3 h-3" />
        IA Sugerido
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-bold">
      <Clock className="w-3 h-3" />
      Pendente
    </span>
  );
}