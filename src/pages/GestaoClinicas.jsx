import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import RouteGuard from "@/components/auth/RouteGuard";
import { Button } from "@/components/ui/Button";
import { createPageUrl } from "@/utils";
import { 
  Building2, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Activity,
  CreditCard,
  BarChart3,
  Settings,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

/**
 * HUB DE GESTÃO DE CLÍNICAS - SuperAdmin
 * 
 * Centraliza:
 * - Listagem de clínicas
 * - Status de billing
 * - Consumo de recursos
 * - Ações rápidas
 * 
 * Ganho: Visão operacional única, reduz dispersão
 */

export default function GestaoClinicas() {
  const [busca, setBusca] = useState("");

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: clinicas = [], isLoading } = useQuery({
    queryKey: ["clinicas-todas"],
    queryFn: () => base44.entities.Clinica.list("-created_date", 100),
    enabled: user?.role === 'admin'
  });

  const { data: assinaturas = [] } = useQuery({
    queryKey: ["assinaturas-todas"],
    queryFn: () => base44.entities.AssinaturaClinica.list("-created_date", 100),
    enabled: user?.role === 'admin'
  });

  const { data: consumo = [] } = useQuery({
    queryKey: ["consumo-todas"],
    queryFn: () => base44.entities.ConsumoRecurso.list("-created_date", 100),
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

  // Métricas agregadas
  const clinicasAtivas = clinicas.filter(c => c.ativa).length;
  const assinaturasAtivas = assinaturas.filter(a => a.status === 'ativa').length;
  const receitaMensal = assinaturas
    .filter(a => a.status === 'ativa')
    .reduce((acc, a) => {
      const plano = a.plano_slug;
      if (plano === 'starter') return acc + 97;
      if (plano === 'profissional') return acc + 297;
      if (plano === 'enterprise') return acc + 497;
      return acc;
    }, 0);

  const clinicasFiltradas = clinicas.filter(c => 
    !busca || 
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.email?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="Gestão de Clínicas"
          description="Controle operacional de clientes, billing e consumo"
          breadcrumbs={[{ label: "Gestão Clínicas" }]}
          action={
            <Link to={createPageUrl("OnboardingClinica")}>
              <Button>
                <Building2 className="w-4 h-4 mr-2" />
                Nova Clínica
              </Button>
            </Link>
          }
        />

        {/* KPIs Críticos - Componentizados */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard 
            icon={Building2}
            label="Clínicas Ativas"
            value={clinicasAtivas}
            color="#7E57FF"
            bgColor="#f5f3ff"
            loading={isLoading}
          />
          <StatCard 
            icon={CheckCircle2}
            label="Assinaturas Ativas"
            value={assinaturasAtivas}
            color="#34a853"
            bgColor="#e6f7ed"
            loading={isLoading}
          />
          <StatCard 
            icon={DollarSign}
            label="MRR"
            value={`R$ ${receitaMensal.toLocaleString()}`}
            color="#34a853"
            bgColor="#e6f7ed"
            loading={isLoading}
          />
          <StatCard 
            icon={Activity}
            label="Taxa Ativação"
            value={`${clinicas.length > 0 ? ((clinicasAtivas / clinicas.length) * 100).toFixed(0) : 0}%`}
            color="#0B7A9E"
            bgColor="#e0f2fe"
            loading={isLoading}
          />
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to={createPageUrl("GestaoPlanos")}>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-purple-300">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <CreditCard className="w-8 h-8 text-purple-600" />
                  <h3 className="font-bold text-lg">Gestão Planos</h3>
                </div>
                <p className="text-sm text-gray-600">Atribuir planos às clínicas</p>
              </div>
            </Card>
          </Link>

          <Link to={createPageUrl("SuperAdminBilling")}>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-green-300">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  <h3 className="font-bold text-lg">Billing</h3>
                </div>
                <p className="text-sm text-gray-600">Pagamentos e faturas</p>
              </div>
            </Card>
          </Link>

          <Link to={createPageUrl("MonitoramentoConsumo")}>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-300">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                  <h3 className="font-bold text-lg">Consumo</h3>
                </div>
                <p className="text-sm text-gray-600">Recursos e limites</p>
              </div>
            </Card>
          </Link>
        </div>

        {/* Filtro */}
        <Card>
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar clínicas..."
                className="pl-10"
              />
            </div>
          </div>
        </Card>

        {/* Tabela Clínicas */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Clínicas Cadastradas</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#e8eaed' }}>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Clínica</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Plano</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Criada em</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-500">Carregando...</td></tr>
                  ) : clinicasFiltradas.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-500">Nenhuma clínica</td></tr>
                  ) : (
                    clinicasFiltradas.map(clinica => {
                      const assinatura = assinaturas.find(a => a.clinica_id === clinica.id);
                      return (
                        <tr key={clinica.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#e8eaed' }}>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <Building2 className="w-5 h-5 text-purple-600" />
                              <div>
                                <p className="font-medium">{clinica.nome}</p>
                                <p className="text-xs text-gray-500">{clinica.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                              {assinatura?.plano_slug || 'Trial'}
                            </span>
                          </td>
                          <td className="text-center py-4 px-4">
                            {clinica.ativa ? (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Ativa
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center justify-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Inativa
                              </span>
                            )}
                          </td>
                          <td className="text-center py-4 px-4 text-sm text-gray-600">
                            {new Date(clinica.created_date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="text-center py-4 px-4">
                            <Link to={createPageUrl(`ClinicaDetalhes?id=${clinica.id}`)}>
                              <Button variant="secondary" size="sm">
                                <Settings className="w-4 h-4 mr-2" />
                                Detalhes
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </RouteGuard>
  );
}