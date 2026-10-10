import React from "react";
import { Mail } from "lucide-react";
import EmailResultItem from "./EmailResultItem";

export default function EmailResultsList({ resultados }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{resultados.length} resultado(s)</p>
      </div>

      {resultados.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma mensagem encontrada</p>
          <p className="text-xs mt-1">Tente outro email ou verifique se foi enviado nos últimos 7 dias</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {resultados.map((msg, idx) => (
            <EmailResultItem key={idx} msg={msg} />
          ))}
        </div>
      )}
    </div>
  );
}