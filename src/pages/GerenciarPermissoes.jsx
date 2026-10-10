import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Save, User, Check, X, Search } from "lucide-react";
import { toast } from "sonner";

const MODULOS_SISTEMA = [
  { id: "dashboard", nome: "Dashboard" },
  { id: "agenda", nome: "Agenda" },
  { id: "pacientes", nome: "Pacientes" },
  { id: "prontuarios", nome: "Prontuários" },
  { id: "produtos", nome: "Produtos & Estoque" },
  { id: "financeiro", nome: "Financeiro" },
  { id: "relatorios", nome: "Relatórios" },
  { id: "atendimento", nome: "Atendimento" },
  { id: "telemedicina", nome: "Telemedicina" },
  { id: "jornada", nome: "Jornada do Paciente" },
  { id: "planos_tratamento", nome: "Planos de Tratamento" },
  { id: "analise_ia", nome: "Análise IA" },
  { id: "colaboracao", nome: "Colaboração Médica" }
];

const PERFIS_PADRAO = [
  { id: "admin_clinica", nome: "Admin Clínica", modulos: ["*"] },
  { id: "medico", nome: "Médico", modulos: ["dashboard", "agenda", "pacientes", "prontuarios", "atendimento"] },
  { id: "recepcionista", nome: "Recepcionista", modulos: ["dashboard", "agenda", "pacientes", "atendimento"] },
  { id: "financeiro", nome: "Financeiro", modulos: ["dashboard", "financeiro", "relatorios"] }
];

export default function GerenciarPermissoes() {
  return (
    <RouteGuard requireAuth requireClinica>
      <PermissionGuard modulo="administracao">
        <GerenciarPermissoesContent />
      </PermissionGuard>
    </RouteGuard>
  );
}

function GerenciarPermissoesContent() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [usuarioEditando, setUsuarioEditando] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["equipe", user?.clinica_id],
    queryFn: async () => {
      const response = await base44.functions.invoke('listarEquipeClinica', {
        clinica_id: user.clinica_id
      });
      return response.data.usuarios || [];
    },
    enabled: !!user?.clinica_id
  });

  const atualizarPermissaoMutation = useMutation({
    mutationFn: async ({ userId, permissoes }) => {
      const targetUser = usuarios.find(u => u.id === userId);
      
      await base44.functions.invoke('ajustarPermissoesAdmin', {
        user_id: userId,
        user_email: targetUser.email,
        permissoes: permissoes
      });
      
      return { userId, permissoes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["equipe"]);
      toast.success("Permissões atualizadas");
      setUsuarioEditando(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar");
    }
  });

  const toggleModulo = (userId, moduloId) => {
    const usuario = usuarios.find(u => u.id === userId);
    const permissoesAtuais = usuario?.permissoes?.modulos || [];
    
    const novasPermissoes = permissoesAtuais.includes(moduloId)
      ? permissoesAtuais.filter(m => m !== moduloId)
      : [...permissoesAtuais, moduloId];

    atualizarPermissaoMutation.mutate({
      userId,
      permissoes: { modulos: novasPermissoes }
    });
  };

  const aplicarPerfil = (userId, perfilId) => {
    const perfil = PERFIS_PADRAO.find(p => p.id === perfilId);
    
    atualizarPermissaoMutation.mutate({
      userId,
      permissoes: { 
        modulos: perfil.modulos,
        perfil: perfilId
      }
    });
  };

  const usuariosFiltrados = usuarios.filter(u =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Gerenciar Permissões"
        description="Controle granular de acesso por módulo e usuário"
        breadcrumbs={[
          { label: "Administração", href: "/Administracao" },
          { label: "Permissões" }
        ]}
      />

      {/* Search */}
      <div className="pc-card p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Buscar usuário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 rounded-xl min-h-[48px]"
          />
        </div>
      </div>

      {/* Lista Usuários */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="pc-card p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {usuariosFiltrados.map((usuario) => (
            <div key={usuario.id} className="pc-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
                    <User className="w-6 h-6" style={{ color: '#7E57FF' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg" style={{ color: '#202124' }}>
                      {usuario.full_name}
                    </h3>
                    <p className="text-sm" style={{ color: '#80868b' }}>{usuario.email}</p>
                    {usuario.permissoes?.perfil && (
                      <span className="pc-badge pc-badge-primary mt-1">
                        {PERFIS_PADRAO.find(p => p.id === usuario.permissoes.perfil)?.nome || usuario.permissoes.perfil}
                      </span>
                    )}
                  </div>
                </div>

                {/* Perfis Rápidos */}
                <div className="flex gap-2">
                  {PERFIS_PADRAO.map(perfil => (
                    <button
                      key={perfil.id}
                      onClick={() => aplicarPerfil(usuario.id, perfil.id)}
                      disabled={usuario.permissoes?.perfil === perfil.id}
                      className="px-3 py-2 text-xs rounded-lg border transition-all disabled:opacity-50"
                      style={{
                        borderColor: usuario.permissoes?.perfil === perfil.id ? '#7E57FF' : '#e8eaed',
                        backgroundColor: usuario.permissoes?.perfil === perfil.id ? '#f5f3ff' : '#ffffff',
                        color: usuario.permissoes?.perfil === perfil.id ? '#7E57FF' : '#5f6368'
                      }}
                    >
                      {perfil.nome}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Módulos */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {MODULOS_SISTEMA.map(modulo => {
                  const temAcesso = usuario.permissoes?.modulos?.includes('*') || 
                                   usuario.permissoes?.modulos?.includes(modulo.id) ||
                                   usuario.role === 'admin';
                  
                  return (
                    <button
                      key={modulo.id}
                      onClick={() => toggleModulo(usuario.id, modulo.id)}
                      disabled={usuario.permissoes?.modulos?.includes('*') || usuario.role === 'admin'}
                      className="flex items-center gap-2 p-3 rounded-lg border transition-all disabled:cursor-not-allowed"
                      style={{
                        borderColor: temAcesso ? '#34a853' : '#e8eaed',
                        backgroundColor: temAcesso ? '#e6f7ed' : '#ffffff'
                      }}
                    >
                      {temAcesso ? (
                        <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#34a853' }} />
                      ) : (
                        <X className="w-4 h-4 flex-shrink-0" style={{ color: '#bdc1c6' }} />
                      )}
                      <span className="text-sm truncate" style={{ color: temAcesso ? '#1f6332' : '#5f6368' }}>
                        {modulo.nome}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="pc-card p-6 border-l-4" style={{ borderColor: '#1a73e8', backgroundColor: '#e8f1fb' }}>
        <div className="flex gap-3">
          <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#1a73e8' }} />
          <div className="text-sm" style={{ color: '#0e4082' }}>
            <p className="font-bold mb-2">💡 RBAC Granular Ativo</p>
            <ul className="space-y-1 text-xs">
              <li>✅ Admin Clínica tem acesso total (*)</li>
              <li>✅ Perfis rápidos aplicam conjunto de módulos</li>
              <li>✅ Permissões customizadas por usuário</li>
              <li>⚠️ Admin SuperAdmin (role=admin) não pode ser editado</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}