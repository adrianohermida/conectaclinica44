import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import ConfiguracaoPerfil from "@/components/perfil/ConfiguracaoPerfil";

export default function MeuPerfil() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  if (isLoading) {
    return (
      <RouteGuard requireAuth>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl p-6 border animate-pulse" style={{ borderColor: '#e8eaed' }}>
            <div className="h-8 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-5 bg-gray-200 rounded w-64" />
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth>
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="Meu Perfil"
          description="Gerencie suas informações pessoais"
          breadcrumbs={[{ label: "Meu Perfil" }]}
        />

        <div className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
          <ConfiguracaoPerfil user={user} />
        </div>
      </div>
    </RouteGuard>
  );
}