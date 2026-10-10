import React from "react";
import { useLimites } from "@/components/hooks/useLimites";
import { Users, Calendar, HardDrive, UserPlus } from "lucide-react";

export default function BarraUsoPlano() {
  const { limites, isLoading } = useLimites();

  if (isLoading || !limites) return null;

  const recursos = [
    { key: "usuarios", label: "Usuários", icon: Users },
    { key: "pacientes", label: "Pacientes", icon: UserPlus },
    { key: "agendamentos", label: "Agend/Mês", icon: Calendar },
    { key: "storage", label: "Storage", icon: HardDrive, unidade: "GB" }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Uso do Plano {limites.plano.toUpperCase()}</h3>
        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
          limites.status === "ativa" ? "bg-green-100 text-green-700" :
          limites.status === "trial" ? "bg-orange-100 text-orange-700" :
          "bg-gray-100 text-gray-600"
        }`}>
          {limites.status === "trial" ? "Trial" : limites.status}
        </span>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {recursos.map((rec) => {
          const limite = limites[rec.key];
          if (!limite) return null;
          
          const Icone = rec.icon;
          const cor = limite.atingido ? "red" : limite.percentual >= 80 ? "orange" : "green";
          
          return (
            <div key={rec.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icone className="w-4 h-4 text-gray-500" />
                <p className="text-xs text-gray-600">{rec.label}</p>
              </div>
              <p className="text-lg font-bold text-gray-800">
                {limite.usado}/{limite.limite === 999999 ? "∞" : limite.limite}
                {rec.unidade && ` ${rec.unidade}`}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    cor === "red" ? "bg-red-500" :
                    cor === "orange" ? "bg-orange-500" :
                    "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(limite.percentual, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">{limite.percentual}% usado</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}