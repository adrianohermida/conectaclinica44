import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import RouteGuard from "@/components/auth/RouteGuard";
import { createPageUrl } from "@/utils";
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  BarChart3,
  Package,
  Zap,
  ShoppingCart,
  Settings
} from "lucide-react";
import { Link } from "react-router-dom";

/**
 * HUB DE MONETIZAÇÃO - SuperAdmin
 * 
 * Centraliza:
 * - Produtos Stripe
 * - Planos e Preços
 * - Métricas de Receita
 * - Checkout e Pagamentos
 * 
 * Ganho: Controle financeiro unificado
 */

export default function HubMonetizacao() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: assinaturas = [] } = useQuery({
    queryKey: ["assinaturas-metricas"],
    queryFn: () => base44.entities.AssinaturaClinica.list("-created_date", 100),
    enabled: user?.role === 'admin'
  });

  if (user?.role !== 'admin') {
    return (
      <RouteGuard requireAuth>
        <PageHeader title="Acesso Negado" />
        <Card><div className="p-8 text-center"><p className="text-red-600">Apenas SuperAdmin</p></div></Card>
      </RouteGuard>
    );
  }

  const mrr = assinaturas
    .filter(a => a.status === 'ativa')
    .reduce((acc, a) => {
      if (a.plano_slug === 'starter') return acc + 97;
      if (a.plano_slug === 'profissional') return acc + 297;
      if (a.plano_slug === 'enterprise') return acc + 497;
      return acc;
    }, 0);

  const arr = mrr * 12;

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="Hub de Monetização"
          description="Controle de produtos, preços e receita recorrente"
          breadcrumbs={[{ label: "Monetização" }]}
        />

        {/* KPIs Financeiros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <DollarSign className="w-12 h-12 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">MRR</p>
                  <p className="text-3xl font-bold text-green-600">R$ {mrr.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <TrendingUp className="w-12 h-12 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">ARR</p>
                  <p className="text-3xl font-bold text-blue-600">R$ {arr.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <CreditCard className="w-12 h-12 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Assinaturas</p>
                  <p className="text-3xl font-bold text-purple-600">{assinaturas.filter(a => a.status === 'ativa').length}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to={createPageUrl("GerenciarProdutosStripe")}>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-purple-300">
              <div className="p-5">
                <Package className="w-10 h-10 text-purple-600 mb-3" />
                <h3 className="font-bold text-lg mb-2">Produtos Stripe</h3>
                <p className="text-sm text-gray-600">Gerenciar catálogo</p>
              </div>
            </Card>
          </Link>

          <Link to={createPageUrl("PlanosPrecos")}>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-300">
              <div className="p-5">
                <Settings className="w-10 h-10 text-blue-600 mb-3" />
                <h3 className="font-bold text-lg mb-2">Planos & Preços</h3>
                <p className="text-sm text-gray-600">Configurar ofertas</p>
              </div>
            </Card>
          </Link>

          <Link to={createPageUrl("MetricasAssinaturas")}>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-green-300">
              <div className="p-5">
                <BarChart3 className="w-10 h-10 text-green-600 mb-3" />
                <h3 className="font-bold text-lg mb-2">Métricas</h3>
                <p className="text-sm text-gray-600">Analytics de receita</p>
              </div>
            </Card>
          </Link>

          <Link to={createPageUrl("RecargaCreditos")}>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-orange-300">
              <div className="p-5">
                <Zap className="w-10 h-10 text-orange-600 mb-3" />
                <h3 className="font-bold text-lg mb-2">Recargas</h3>
                <p className="text-sm text-gray-600">Créditos avulsos</p>
              </div>
            </Card>
          </Link>
        </div>

        {/* Informações Úteis */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Links Úteis</h3>
            <div className="space-y-3">
              <a 
                href="https://dashboard.stripe.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all"
              >
                <CreditCard className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium">Dashboard Stripe</p>
                  <p className="text-sm text-gray-600">Visualizar pagamentos e clientes</p>
                </div>
              </a>

              <Link 
                to={createPageUrl("SuperAdminBilling")}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all"
              >
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">Billing Admin</p>
                  <p className="text-sm text-gray-600">Gerenciar faturas e pagamentos</p>
                </div>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </RouteGuard>
  );
}