import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import RouteGuard from "@/components/auth/RouteGuard";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import { Button } from "@/components/ui/Button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import {
  Users,
  Building2,
  DollarSign,
  Shield,
  Plus,
  Percent,
  FileText,
  TrendingUp,
  UserCheck,
  UserX,
  Edit
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

/**
 * GESTÃO SOCIETÁRIA - Admin Clínica
 * 
 * Controle de sócios, participação, administração
 * Owner = responsável financeiro (admin_clinica)
 * Ganho: transparência societária, compliance
 */

export default function GestaoSocietaria() {
  const { clinicaId, clinicaData } = useClinicaContext();
  const queryClient = useQueryClient();
  const [showPanel, setShowPanel] = useState(false);
  const [editingSocio, setEditingSocio] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const isOwner = user?.perfil === 'admin_clinica' || user?.cargo === 'administrador';

  const [formData, setFormData] = useState({
    socio_nome: "",
    cpf: "",
    participacao_tipo: "percentual",
    participacao_percentual: 0,
    participacao_cotas: 0,
    capital_social_valor: 0,
    exerce_administracao: false,
    cargo_administracao: "nenhum",
    pode_assinar_contratos: false,
    pode_movimentar_financeiro: false,
    data_entrada: new Date().toISOString().split('T')[0],
    status: "ativo"
  });

  const updateClinicaMutation = useMutation({
    mutationFn: (data) => base44.entities.Clinica.update(clinicaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["clinica", clinicaId]);
      toast.success(editingSocio ? "Sócio atualizado" : "Sócio adicionado");
      setShowPanel(false);
      resetForm();
    },
    onError: () => toast.error("Erro ao salvar sócio")
  });

  const handleAddSocio = () => {
    if (!formData.socio_nome || !formData.cpf) {
      toast.error("Preencha nome e CPF");
      return;
    }

    const socios = [...(clinicaData?.socios || [])];
    
    if (editingSocio !== null) {
      socios[editingSocio] = formData;
    } else {
      socios.push(formData);
    }

    updateClinicaMutation.mutate({ socios });
  };

  const handleRemoveSocio = (index) => {
    const socios = [...(clinicaData?.socios || [])];
    socios[index].status = "desligado";
    socios[index].data_saida = new Date().toISOString().split('T')[0];
    updateClinicaMutation.mutate({ socios });
  };

  const resetForm = () => {
    setFormData({
      socio_nome: "",
      cpf: "",
      participacao_tipo: "percentual",
      participacao_percentual: 0,
      participacao_cotas: 0,
      capital_social_valor: 0,
      exerce_administracao: false,
      cargo_administracao: "nenhum",
      pode_assinar_contratos: false,
      pode_movimentar_financeiro: false,
      data_entrada: new Date().toISOString().split('T')[0],
      status: "ativo"
    });
    setEditingSocio(null);
  };

  const sociosAtivos = (clinicaData?.socios || []).filter(s => s.status === 'ativo');
  const totalParticipacao = sociosAtivos.reduce((acc, s) => acc + (s.participacao_percentual || 0), 0);
  const totalCotas = sociosAtivos.reduce((acc, s) => acc + (s.participacao_cotas || 0), 0);
  const totalCapital = sociosAtivos.reduce((acc, s) => acc + (s.capital_social_valor || 0), 0);

  if (!isOwner) {
    return (
      <RouteGuard requireAuth requireClinica>
        <PageHeader title="Acesso Negado" />
        <Card>
          <div className="p-8 text-center">
            <p className="text-red-600">Apenas administradores podem acessar gestão societária</p>
          </div>
        </Card>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth requireClinica>
      <div className="space-y-6">
        <PageHeader
          title="Gestão Societária"
          description="Estrutura societária e administração da clínica"
          breadcrumbs={[{ label: "Administração" }, { label: "Societária" }]}
          action={
            <Button onClick={() => setShowPanel(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Sócio
            </Button>
          }
        />

        {/* KPIs Societários */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Sócios Ativos</p>
                  <p className="text-2xl font-bold">{sociosAtivos.length}</p>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <Percent className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Participação Total</p>
                  <p className="text-2xl font-bold">{totalParticipacao.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Capital Social</p>
                  <p className="text-2xl font-bold">R$ {totalCapital.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Administradores</p>
                  <p className="text-2xl font-bold">
                    {sociosAtivos.filter(s => s.exerce_administracao).length}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Responsável Financeiro */}
        <Card>
          <div className="p-6 bg-purple-50 border-l-4 border-purple-600">
            <div className="flex items-start gap-3">
              <Building2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 mb-1">Responsável Financeiro (Owner)</h3>
                <p className="text-sm text-gray-600">
                  {clinicaData?.responsavel_financeiro_nome || user?.full_name || 'Não definido'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Responsável legal pela clínica e assinatura de contratos
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabela Sócios */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: '#202124' }}>
              Quadro Societário
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#e8eaed' }}>
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: '#5f6368' }}>Sócio</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: '#5f6368' }}>CPF</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: '#5f6368' }}>Participação</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: '#5f6368' }}>Capital</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: '#5f6368' }}>Administração</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: '#5f6368' }}>Status</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: '#5f6368' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sociosAtivos.map((socio, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50" style={{ borderColor: '#e8eaed' }}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span className="font-medium">{socio.socio_nome}</span>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4 text-sm text-gray-600">
                        {socio.cpf}
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="px-3 py-1 rounded-full font-bold bg-blue-100 text-blue-700">
                          {socio.participacao_tipo === 'percentual' 
                            ? `${socio.participacao_percentual}%`
                            : `${socio.participacao_cotas} cotas`}
                        </span>
                      </td>
                      <td className="text-center py-4 px-4 font-bold text-green-600">
                        R$ {(socio.capital_social_valor || 0).toLocaleString()}
                      </td>
                      <td className="text-center py-4 px-4">
                        {socio.exerce_administracao ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                              {socio.cargo_administracao}
                            </span>
                            <div className="flex gap-1">
                              {socio.pode_assinar_contratos && (
                                <FileText className="w-3 h-3 text-orange-600" title="Pode assinar contratos" />
                              )}
                              {socio.pode_movimentar_financeiro && (
                                <DollarSign className="w-3 h-3 text-green-600" title="Movimenta financeiro" />
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className={`px-3 py-1 rounded-full font-bold ${
                          socio.status === 'ativo' ? 'bg-green-100 text-green-700' :
                          socio.status === 'afastado' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {socio.status}
                        </span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingSocio(index);
                              setFormData(socio);
                              setShowPanel(true);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleRemoveSocio(index)}
                            className="p-2 hover:bg-gray-100 rounded-full"
                            title="Desligar"
                          >
                            <UserX className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Panel Adicionar/Editar Sócio */}
        <SlideInPanel
          open={showPanel}
          onClose={() => {
            setShowPanel(false);
            resetForm();
          }}
          title={editingSocio !== null ? "Editar Sócio" : "Adicionar Sócio"}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome Completo *</label>
              <Input
                value={formData.socio_nome}
                onChange={(e) => setFormData({ ...formData, socio_nome: e.target.value })}
                placeholder="Nome do sócio"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CPF *</label>
              <Input
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Participação</label>
              <Select
                value={formData.participacao_tipo}
                onValueChange={(value) => setFormData({ ...formData, participacao_tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 999999 }}>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="cotas">Cotas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.participacao_tipo === 'percentual' ? (
              <div>
                <label className="block text-sm font-medium mb-2">Participação (%)</label>
                <Input
                  type="number"
                  value={formData.participacao_percentual}
                  onChange={(e) => setFormData({ ...formData, participacao_percentual: parseFloat(e.target.value) })}
                  step="0.01"
                  max="100"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">Número de Cotas</label>
                <Input
                  type="number"
                  value={formData.participacao_cotas}
                  onChange={(e) => setFormData({ ...formData, participacao_cotas: parseInt(e.target.value) })}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Capital Social (R$)</label>
              <Input
                type="number"
                value={formData.capital_social_valor}
                onChange={(e) => setFormData({ ...formData, capital_social_valor: parseFloat(e.target.value) })}
                step="0.01"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="exerce_admin"
                checked={formData.exerce_administracao}
                onChange={(e) => setFormData({ ...formData, exerce_administracao: e.target.checked })}
                className="w-5 h-5"
              />
              <label htmlFor="exerce_admin" className="text-sm font-medium">
                Exerce Administração
              </label>
            </div>

            {formData.exerce_administracao && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Cargo de Administração</label>
                  <Select
                    value={formData.cargo_administracao}
                    onValueChange={(value) => setFormData({ ...formData, cargo_administracao: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 999999 }}>
                      <SelectItem value="administrador">Administrador</SelectItem>
                      <SelectItem value="diretor">Diretor</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="assinar"
                    checked={formData.pode_assinar_contratos}
                    onChange={(e) => setFormData({ ...formData, pode_assinar_contratos: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="assinar" className="text-sm">
                    Pode assinar contratos
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="financeiro"
                    checked={formData.pode_movimentar_financeiro}
                    onChange={(e) => setFormData({ ...formData, pode_movimentar_financeiro: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="financeiro" className="text-sm">
                    Pode movimentar financeiro
                  </label>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Data de Entrada</label>
              <Input
                type="date"
                value={formData.data_entrada}
                onChange={(e) => setFormData({ ...formData, data_entrada: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setShowPanel(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleAddSocio} className="flex-1">
                {editingSocio !== null ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </SlideInPanel>
      </div>
    </RouteGuard>
  );
}