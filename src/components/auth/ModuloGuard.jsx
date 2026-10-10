import React from "react";
import { usePlano } from "@/components/providers/PlanoProvider";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ModuloGuard({ modulo, children, fallback }) {
  const { planoAtivo, temAcessoModulo, isLoading, user } = usePlano();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  // SuperAdmin = acesso total
  if (user?.role === 'admin') {
    return <>{children}</>;
  }

  const temAcesso = temAcessoModulo(modulo);

  if (!temAcesso) {
    if (fallback) return fallback;

    return (
      <div className="min-h-[600px] flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-purple-600" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Módulo não disponível</h2>
            <p className="text-gray-600">
              O módulo <strong>{modulo}</strong> não está incluído no seu plano atual.
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-sm text-purple-900 mb-1">
              <strong>Plano atual:</strong> {planoAtivo?.plano_slug || 'Trial'}
            </p>
            <p className="text-xs text-purple-700">
              {planoAtivo?.modulos_inclusos?.length || 0} módulos disponíveis
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline">
                Voltar ao Dashboard
              </Button>
            </Link>
            <Link to={createPageUrl("GerenciarAssinatura")}>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Crown className="w-4 h-4 mr-2" />
                Fazer Upgrade
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}