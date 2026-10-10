import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Trash2, Edit, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function GestaoPlanos() {
  return (
    <RouteGuard requireAuth>
      <GestoaPlanosContent />
    </RouteGuard>
  );
}

function GestoaPlanosContent() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    clinica_id: "",
    plano_slug: "starter",
    status: "trial"
  });

  const { data: clinicas = [] } = useQuery({
    queryKey: ["clinicas-all"],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('listarClinicas', {});
      return data.clinicas || [];
    }
  });

  const { data: planos = [] } = useQuery({
    queryKey: ["planos"],
    queryFn: () => base44.entities.PlanoModulo.list()
  });

  const { data: assinaturas = [] } = useQuery({
    queryKey: ["assinaturas-all"],
    queryFn: () => base44.asServiceRole.entities.AssinaturaClinica.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Usar função centralizada getClinicaPlanoPorId para garantir sync
      const { data: planoInfo } = await base44.functions.invoke('getClinicaPlanoPorId', {
        clinica_id: data.clinica_id
      });

      // Criar AssinaturaClinica com modulos_inclusos sincronizados
      const payload = {
        ...data,
        modulos_inclusos: planoInfo.modulos_inclusos || [],
        valor_mensal_centavos: 0
      };

      return await base44.asServiceRole.entities.AssinaturaClinica.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["assinaturas-all"]);
      setShowForm(false);
      toast.success("✅ Assinatura criada com módulos sincronizados!");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({id, data}) => {
      // Usar função centralizada para sync
      const { data: planoInfo } = await base44.functions.invoke('getClinicaPlanoPorId', {
        clinica_id: data.clinica_id
      });
      
      data.modulos_inclusos = planoInfo.modulos_inclusos;
      data.valor_mensal_centavos = 0;

      return await base44.asServiceRole.entities.AssinaturaClinica.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["assinaturas-all"]);
      setShowForm(false);
      setEditing(null);
      toast.success("✅ Atualizado!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.asServiceRole.entities.AssinaturaClinica.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["assinaturas-all"]);
      toast.success("Excluída!");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Pegar clinica_nome de clinicas
    const clinica = clinicas.find(c => c.id === formData.clinica_id);
    
    const payload = {
      ...formData,
      clinica_nome: clinica?.nome || formData.clinica_nome,
      clinica_email: clinica?.email || formData.clinica_email,
      data_inicio: formData.data_inicio || new Date().toISOString().split('T')[0]
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Verificar se é SuperAdmin
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-bold">Acesso negado - SuperAdmin apenas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <PageHeader
          title="Gestão de Planos"
          description="Associar clínicas a planos e sincronizar módulos"
          breadcrumbs={[
            { label: "SuperAdmin", url: "/SuperAdmin" },
            { label: "Gestão Planos" }
          ]}
          action={
            <Button onClick={() => {
              setEditing(null);
              setFormData({clinica_id:"",plano_slug:"starter",status:"trial"});
              setShowForm(true);
            }}>
              <Plus className="w-4 h-4 mr-2" /> Nova Assinatura
            </Button>
          }
        />

        {/* Clínicas SEM Assinatura - Prioridade */}
        {(() => {
          const clinicasComAssinatura = assinaturas.map(a => a.clinica_id);
          const clinicasSemAssinatura = clinicas.filter(c => !clinicasComAssinatura.includes(c.id));
          
          return clinicasSemAssinatura.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-5 mb-6">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2" style={{ color: '#ea8600' }}>
                ⚠️ Clínicas Sem Plano ({clinicasSemAssinatura.length})
              </h3>
              <div className="space-y-2">
                {clinicasSemAssinatura.map(clinica => (
                  <div key={clinica.id} className="bg-white rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold" style={{ color: '#202124' }}>{clinica.nome}</p>
                      <p className="text-xs" style={{ color: '#5f6368' }}>{clinica.email}</p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setEditing(null);
                        setFormData({ clinica_id: clinica.id, plano_slug: "starter", status: "trial" });
                        setShowForm(true);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Criar Plano
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Lista Assinaturas */}
        <div className="bg-white rounded-2xl shadow-sm border divide-y">
          {assinaturas.map(ass => {
            const clinica = clinicas.find(c => c.id === ass.clinica_id);
            const plano = planos.find(p => p.nome.toLowerCase() === ass.plano_slug);
            const isBeta = plano?.beta_clinicas?.includes(ass.clinica_id);
            const modulosFaltando = !ass.modulos_inclusos || ass.modulos_inclusos.length === 0;
            
            return (
              <div key={ass.id} className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{clinica?.nome || ass.clinica_id}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                        {plano?.nome || ass.plano_slug}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        ass.status === 'ativa' ? 'bg-green-100 text-green-700' :
                        ass.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {ass.status}
                      </span>
                      {isBeta && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                          🎁 Beta Gratuito
                        </span>
                      )}
                      {modulosFaltando && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                          ⚠️ Módulos não sincronizados
                        </span>
                      )}
                    </div>
                    {ass.modulos_inclusos && ass.modulos_inclusos.length > 0 && (
                      <p className="text-xs mt-2" style={{ color: '#5f6368' }}>
                        {ass.modulos_inclusos.length} módulo(s) ativos
                      </p>
                    )}
                    </div>
                    </div>
                    <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => {
                    setEditing(ass);
                    setFormData(ass);
                    setShowForm(true);
                  }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    if (confirm("Excluir?")) deleteMutation.mutate(ass.id);
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {assinaturas.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              Nenhuma assinatura
            </div>
          )}
        </div>

        {/* Form */}
        <SlideInPanel open={showForm} onClose={() => setShowForm(false)} title={editing ? "Editar" : "Nova Assinatura"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Clínica *</label>
              <Select value={formData.clinica_id} onValueChange={v => setFormData({...formData, clinica_id:v})}>
                <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
                <SelectContent style={{zIndex:999999}}>
                  {clinicas.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Plano *</label>
              <Select value={formData.plano_slug} onValueChange={v => setFormData({...formData, plano_slug:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent style={{zIndex:999999}}>
                  {planos.map(p => (
                    <SelectItem key={p.id} value={p.nome.toLowerCase()}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={formData.status} onValueChange={v => setFormData({...formData, status:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent style={{zIndex:999999}}>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Data Início</label>
              <Input type="date" value={formData.data_inicio||''} onChange={e => setFormData({...formData, data_inicio:e.target.value})} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1">Salvar</Button>
            </div>
          </form>
        </SlideInPanel>
      </div>
  );
}