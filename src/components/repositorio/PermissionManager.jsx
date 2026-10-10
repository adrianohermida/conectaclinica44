import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { X, Plus, Shield, Eye, Edit3, Trash2, Users, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * PERMISSION MANAGER - LGPD Compliant
 * Gestão granular de permissões com herança
 */
export default function PermissionManager({ item, onClose }) {
  const [searchUser, setSearchUser] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState({
    visualizar: true,
    editar: false,
    excluir: false
  });
  const queryClient = useQueryClient();

  const isPasta = !item.arquivo_url;

  // Carregar permissões existentes
  const { data: permissoes = [], isLoading } = useQuery({
    queryKey: ['permissoes', item.id],
    queryFn: async () => {
      const query = isPasta 
        ? { pasta_id: item.id }
        : { documento_id: item.id };
      return await base44.entities.PermissaoCompliance.filter(query);
    }
  });

  // Carregar usuários disponíveis (da clínica)
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-clinica'],
    queryFn: async () => {
      const user = await base44.auth.me();
      // Filtrar usuários da mesma clínica (implementar lógica real)
      return await base44.entities.User.list();
    }
  });

  // Mutation para conceder permissão
  const concederMutation = useMutation({
    mutationFn: async (permissaoData) => {
      return await base44.entities.PermissaoCompliance.create(permissaoData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['permissoes', item.id]);
      toast.success('Permissão concedida');
      setSelectedUser(null);
      setSearchUser('');
    },
    onError: () => toast.error('Erro ao conceder permissão')
  });

  // Mutation para revogar permissão
  const revogarMutation = useMutation({
    mutationFn: async (permissaoId) => {
      return await base44.entities.PermissaoCompliance.delete(permissaoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['permissoes', item.id]);
      toast.success('Permissão revogada');
    },
    onError: () => toast.error('Erro ao revogar permissão')
  });

  const handleConceder = async () => {
    if (!selectedUser) {
      toast.error('Selecione um usuário');
      return;
    }

    const user = await base44.auth.me();
    const permissaoData = {
      ...(isPasta ? { pasta_id: item.id } : { documento_id: item.id }),
      usuario_id: selectedUser.id,
      usuario_email: selectedUser.email,
      usuario_nome: selectedUser.full_name,
      visualizar: selectedPermissions.visualizar,
      editar: selectedPermissions.editar,
      excluir: selectedPermissions.excluir,
      concedido_por: user.email,
      herdar_subpastas: isPasta // Herança automática para pastas
    };

    concederMutation.mutate(permissaoData);
  };

  const usuariosFiltrados = usuarios.filter(u => 
    u.full_name?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUser.toLowerCase())
  );

  const getPermissionBadges = (perm) => {
    const badges = [];
    if (perm.visualizar) badges.push({ icon: Eye, label: 'Visualizar', color: 'bg-blue-100 text-blue-700' });
    if (perm.editar) badges.push({ icon: Edit3, label: 'Editar', color: 'bg-yellow-100 text-yellow-700' });
    if (perm.excluir) badges.push({ icon: Trash2, label: 'Excluir', color: 'bg-red-100 text-red-700' });
    return badges;
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Gerenciar Permissões</h3>
                <p className="text-sm text-gray-600">{item.nome || item.titulo}</p>
              </div>
            </div>
            <Button size="sm" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-800">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* LGPD Alert */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-900">
              <strong>LGPD:</strong> Controle de acesso obrigatório (Art. 46). Logs de auditoria registrados automaticamente.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Adicionar Novo Usuário */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Conceder Acesso
            </h4>
            
            <div className="space-y-3">
              {/* Buscar Usuário */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Buscar usuário por nome ou email..."
                  className="pl-10"
                />
                {searchUser && usuariosFiltrados.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                    {usuariosFiltrados.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setSearchUser(u.full_name);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b last:border-0"
                      >
                        <p className="font-medium text-sm text-gray-900">{u.full_name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Seletor de Permissões */}
              {selectedUser && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Selecione as permissões:</p>
                  <div className="space-y-2">
                    {[
                      { key: 'visualizar', icon: Eye, label: 'Visualizar', desc: 'Ver conteúdo' },
                      { key: 'editar', icon: Edit3, label: 'Editar', desc: 'Modificar conteúdo' },
                      { key: 'excluir', icon: Trash2, label: 'Excluir', desc: 'Deletar permanentemente' }
                    ].map(({ key, icon: Icon, label, desc }) => (
                      <label key={key} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPermissions[key]}
                          onChange={(e) => setSelectedPermissions({
                            ...selectedPermissions,
                            [key]: e.target.checked
                          })}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <Icon className="w-4 h-4 text-gray-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{label}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <Button 
                    onClick={handleConceder} 
                    disabled={concederMutation.isLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {concederMutation.isLoading ? 'Concedendo...' : 'Conceder Acesso'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Permissões Existentes */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Usuários com Acesso ({permissoes.length})
            </h4>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : permissoes.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Nenhuma permissão concedida ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {permissoes.map((perm) => (
                  <div key={perm.id} className="border rounded-lg p-4 hover:border-purple-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{perm.usuario_nome}</p>
                        <p className="text-sm text-gray-500">{perm.usuario_email}</p>
                        <div className="flex gap-2 mt-2">
                          {getPermissionBadges(perm).map(({ icon: Icon, label, color }) => (
                            <span key={label} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                              <Icon className="w-3 h-3" />
                              {label}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Concedido por {perm.concedido_por} • {new Date(perm.created_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`Revogar acesso de ${perm.usuario_nome}?`)) {
                            revogarMutation.mutate(perm.id);
                          }
                        }}
                        className="text-red-600 hover:bg-red-50 border-red-200"
                      >
                        Revogar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Herança (somente pastas) */}
          {isPasta && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h5 className="font-semibold text-purple-900 text-sm mb-2">Herança de Permissões</h5>
              <p className="text-xs text-purple-700">
                As permissões desta pasta serão <strong>automaticamente aplicadas</strong> a todas as subpastas e documentos filhos.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <Button onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}