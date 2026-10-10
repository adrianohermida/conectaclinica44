import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import RouteGuard from "@/components/auth/RouteGuard";
import { Button } from "@/components/ui/Button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Edit, Eye, CheckCircle2, XCircle, Hash } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

/**
 * GESTÃO DE TERMOS LEGAIS - SuperAdmin
 * 
 * CMS completo para termos legais com:
 * - Editor rich text
 * - Versionamento
 * - Hash SHA-256 para integridade
 * - Rastreabilidade MP 2.200/2
 */

export default function GestaoTermosLegais() {
  const queryClient = useQueryClient();
  const [showPanel, setShowPanel] = useState(false);
  const [editingTermo, setEditingTermo] = useState(null);
  
  const [formData, setFormData] = useState({
    tipo: "cfm_normas",
    titulo: "",
    conteudo_html: "",
    versao: "1.0",
    modulo_aplicacao: "global",
    obrigatorio: true,
    ativo: true,
    data_vigencia: new Date().toISOString().split('T')[0]
  });

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: termos = [], isLoading } = useQuery({
    queryKey: ["termos-legais"],
    queryFn: () => base44.entities.TermoLegal.list("-created_date", 100),
    enabled: user?.role === 'admin'
  });

  const { data: aceites = [] } = useQuery({
    queryKey: ["aceites-termos"],
    queryFn: () => base44.entities.AceiteTermoLegal.list("-created_date", 100),
    enabled: user?.role === 'admin'
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // BACKEND: Chamar função para criar termo com hash server-side
      const response = await base44.functions.invoke('criarTermoLegal', {
        ...data,
        autor_criacao: user.full_name || user.email
      });
      
      return response.data.termo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["termos-legais"]);
      toast.success("Termo criado com sucesso");
      setShowPanel(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // BACKEND: Atualizar termo com hash server-side
      const response = await base44.functions.invoke('atualizarTermoLegal', {
        termo_id: id,
        ...data
      });
      
      return response.data.termo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["termos-legais"]);
      toast.success("Termo atualizado");
      setShowPanel(false);
      resetForm();
    }
  });

  const handleSubmit = () => {
    if (!formData.titulo || !formData.conteudo_html) {
      toast.error("Preencha título e conteúdo");
      return;
    }

    if (editingTermo) {
      updateMutation.mutate({ id: editingTermo.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const resetForm = () => {
    setFormData({
      tipo: "cfm_normas",
      titulo: "",
      conteudo_html: "",
      versao: "1.0",
      modulo_aplicacao: "global",
      obrigatorio: true,
      ativo: true,
      data_vigencia: new Date().toISOString().split('T')[0]
    });
    setEditingTermo(null);
  };

  if (user?.role !== 'admin') {
    return (
      <RouteGuard requireAuth>
        <PageHeader title="Acesso Negado" />
        <Card><div className="p-8 text-center"><p className="text-red-600">Apenas SuperAdmin</p></div></Card>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="Gestão de Termos Legais"
          description="Editor de termos com rastreabilidade MP 2.200/2"
          breadcrumbs={[{ label: "SuperAdmin" }, { label: "Compliance" }, { label: "Termos Legais" }]}
          action={
            <div className="flex gap-2">
              <Link to={createPageUrl("TesteModalTermoBrutal")}>
                <Button variant="outline" className="bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Teste E2E
                </Button>
              </Link>
              <Button onClick={() => {
                resetForm();
                setShowPanel(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Termo
              </Button>
            </div>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <FileText className="w-10 h-10 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Termos Ativos</p>
                  <p className="text-3xl font-bold">{termos.filter(t => t.ativo).length}</p>
                </div>
              </div>
            </div>
          </Card>

          <Link to={createPageUrl("AceitesTermosLegais")}>
            <Card className="cursor-pointer hover:shadow-lg transition-all">
            <div className="p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Aceites Totais</p>
                  <p className="text-3xl font-bold">{aceites.filter(a => a.aceito).length}</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">Clique para visualizar →</p>
                </div>
              </div>
            </div>
          </Card>
          </Link>

          <Card>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <Hash className="w-10 h-10 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Com Hash SHA-256</p>
                  <p className="text-3xl font-bold">{termos.filter(t => t.hash_sha256).length}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabela de Termos */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Termos Cadastrados</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#e8eaed' }}>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Título</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Tipo</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Versão</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Módulo</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Aceites</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-500">Carregando...</td></tr>
                  ) : termos.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-500">Nenhum termo cadastrado</td></tr>
                  ) : (
                    termos.map(termo => {
                      const aceitesCount = aceites.filter(a => a.termo_legal_id === termo.id && a.aceito).length;
                      return (
                        <tr key={termo.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#e8eaed' }}>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-purple-600" />
                              <div>
                                <p className="font-medium">{termo.titulo}</p>
                                <p className="text-xs text-gray-500">Hash: {termo.hash_sha256?.substring(0, 12)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                              {termo.tipo.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="text-center py-4 px-4 font-mono text-sm">{termo.versao}</td>
                          <td className="text-center py-4 px-4 text-sm">{termo.modulo_aplicacao}</td>
                          <td className="text-center py-4 px-4">
                            {termo.ativo ? (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Ativo
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 flex items-center justify-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Inativo
                              </span>
                            )}
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                              {aceitesCount} aceites
                            </span>
                          </td>
                          <td className="text-center py-4 px-4">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingTermo(termo);
                                setFormData(termo);
                                setShowPanel(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
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

        {/* Panel Editor */}
        <SlideInPanel
          open={showPanel}
          onClose={() => {
            setShowPanel(false);
            resetForm();
          }}
          title={editingTermo ? "Editar Termo Legal" : "Novo Termo Legal"}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Título *</label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Normas do CFM para Prontuários Eletrônicos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tipo *</label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent style={{ zIndex: 999999 }}>
                  <SelectItem value="cfm_normas">CFM - Normas Médicas</SelectItem>
                  <SelectItem value="lgpd_termo">LGPD - Termo de Consentimento</SelectItem>
                  <SelectItem value="codigo_etica">Código de Ética</SelectItem>
                  <SelectItem value="cdc_direitos">CDC - Direitos do Consumidor</SelectItem>
                  <SelectItem value="termo_uso">Termo de Uso</SelectItem>
                  <SelectItem value="politica_privacidade">Política de Privacidade</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">Versão *</label>
                <Input
                  value={formData.versao}
                  onChange={(e) => setFormData({ ...formData, versao: e.target.value })}
                  placeholder="1.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Módulo *</label>
                <Select value={formData.modulo_aplicacao} onValueChange={(v) => setFormData({ ...formData, modulo_aplicacao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent style={{ zIndex: 999999 }}>
                    <SelectItem value="global">Global (todos)</SelectItem>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="prontuarios">Prontuários</SelectItem>
                    <SelectItem value="atendimento">Atendimento</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="telemedicina">Telemedicina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Conteúdo do Termo *</label>
              <ReactQuill
                theme="snow"
                value={formData.conteudo_html}
                onChange={(content) => setFormData({ ...formData, conteudo_html: content })}
                style={{ height: '300px', marginBottom: '60px' }}
              />
            </div>

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="obrigatorio"
                checked={formData.obrigatorio}
                onChange={(e) => setFormData({ ...formData, obrigatorio: e.target.checked })}
                className="w-5 h-5"
              />
              <label htmlFor="obrigatorio" className="text-sm font-medium">
                Aceite obrigatório
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="w-5 h-5"
              />
              <label htmlFor="ativo" className="text-sm font-medium">
                Termo ativo
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setShowPanel(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="flex-1">
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </SlideInPanel>
      </div>
    </RouteGuard>
  );
}