import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Plus,
  ExternalLink,
  Key,
  Shield,
  Edit,
  Trash2,
  Globe,
  Building2,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import PageHeader from "@/components/ui/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, differenceInDays } from "date-fns";
import { createPageUrl } from "@/utils";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

const tiposSistema = [
  { value: "fiscal", label: "Fiscal" },
  { value: "contabil", label: "Contábil" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "previdenciario", label: "Previdenciário" },
  { value: "bancario", label: "Bancário" },
  { value: "outro", label: "Outro" }
];

const esferas = [
  { value: "federal", label: "Federal" },
  { value: "estadual", label: "Estadual" },
  { value: "municipal", label: "Municipal" },
  { value: "privado", label: "Privado" }
];

export default function SistemasGov() {
  usePerformanceTracker('/SistemasGov');
  const [showPanel, setShowPanel] = useState(false);
  const [editingSistema, setEditingSistema] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const { data: sistemas = [] } = useOptimizedQuery({
    queryKey: ["sistemasGov"],
    queryFn: () => base44.entities.SistemaGovernamental.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SistemaGovernamental.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["sistemasGov"]);
      setShowPanel(false);
      setEditingSistema(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SistemaGovernamental.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["sistemasGov"]);
      setShowPanel(false);
      setEditingSistema(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SistemaGovernamental.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["sistemasGov"])
  });

  const [formSistema, setFormSistema] = useState({
    nome: "",
    sigla: "",
    tipo: "fiscal",
    esfera: "federal",
    url_acesso: "",
    usuario: "",
    certificado_digital: false,
    tipo_certificado: "nenhum",
    data_validade_acesso: "",
    responsavel: "",
    observacoes: "",
    ativo: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingSistema) {
      updateMutation.mutate({ id: editingSistema.id, data: formSistema });
    } else {
      createMutation.mutate(formSistema);
    }
  };

  const hoje = new Date();

  // Agrupar por esfera
  const sistemasPorEsfera = sistemas.reduce((acc, s) => {
    const esfera = s.esfera || "outro";
    if (!acc[esfera]) acc[esfera] = [];
    acc[esfera].push(s);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <RouteGuard requireAuth={true} requireClinica={true}>
        <div className="max-w-7xl mx-auto space-y-6 overflow-x-hidden animate-pulse">
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            <div className="h-8 bg-gray-200 rounded w-56 mb-3" />
            <div className="h-5 bg-gray-200 rounded w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
                <div className="h-6 bg-gray-200 rounded w-32 mb-3" />
                <div className="h-5 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 overflow-x-hidden">:::
      <PageHeader
        title="Sistemas Governamentais"
        description="Acessos fiscais e contábeis"
        breadcrumbs={[
          { label: "Administração", href: createPageUrl("Administracao") },
          { label: "Sistemas Governamentais" }
        ]}
      />

      {/* Ações */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingSistema(null);
            setFormSistema({
              nome: "",
              sigla: "",
              tipo: "fiscal",
              esfera: "federal",
              url_acesso: "",
              usuario: "",
              certificado_digital: false,
              tipo_certificado: "nenhum",
              data_validade_acesso: "",
              responsavel: "",
              observacoes: "",
              ativo: true
            });
            setShowPanel(true);
          }}
          aria-label="Adicionar novo sistema"
          className="font-bold rounded-full hover:opacity-90 transition-all min-h-[48px] flex items-center gap-2 px-5"
          style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '14px' }}
        >
          <Plus className="w-5 h-5 flex-shrink-0" />
          Novo Sistema
        </button>
      </div>

      {/* Lista por Esfera */}
      {sistemas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p style={{ color: '#5f6368', fontSize: '16px' }}>Nenhum sistema cadastrado</p>
        </div>
      ) : (
        Object.entries(sistemasPorEsfera).map(([esfera, sistemasEsfera]) => (
          <div key={esfera} className="space-y-4 overflow-hidden">
            <h2 className="font-bold capitalize flex items-center gap-2" style={{ color: '#202124', fontSize: '20px' }}>
              <Building2 className="w-6 h-6 flex-shrink-0" style={{ color: '#7E57FF' }} />
              {esfera === "federal" ? "Federal" : 
               esfera === "estadual" ? "Estadual" : 
               esfera === "municipal" ? "Municipal" : 
               esfera === "privado" ? "Privado" : "Outro"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-hidden">:::
              {sistemasEsfera.map((sistema) => {
                const temValidadeAcesso = sistema.data_validade_acesso;
                const diasRestantes = temValidadeAcesso 
                  ? differenceInDays(new Date(sistema.data_validade_acesso), hoje) 
                  : null;
                const acessoVencendo = diasRestantes !== null && diasRestantes <= 30 && diasRestantes >= 0;
                const acessoVencido = diasRestantes !== null && diasRestantes < 0;

                return (
                  <div
                    key={sistema.id}
                    className={`bg-white rounded-2xl shadow-sm p-5 overflow-hidden ${
                      !sistema.ativo ? "opacity-60" : ""
                    }`}
                    style={{ borderColor: '#e8eaed', border: '1px solid' }}
                  >
                    <div className="flex items-start justify-between mb-3 gap-3 min-w-0">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          sistema.tipo === "fiscal" ? "bg-blue-100" :
                          sistema.tipo === "contabil" ? "bg-green-100" :
                          sistema.tipo === "trabalhista" ? "bg-purple-100" :
                          sistema.tipo === "previdenciario" ? "bg-orange-100" :
                          sistema.tipo === "bancario" ? "bg-yellow-100" :
                          "bg-gray-100"
                        }`}>
                          <Globe className={`w-5 h-5 ${
                            sistema.tipo === "fiscal" ? "text-blue-600" :
                            sistema.tipo === "contabil" ? "text-green-600" :
                            sistema.tipo === "trabalhista" ? "text-purple-600" :
                            sistema.tipo === "previdenciario" ? "text-orange-600" :
                            sistema.tipo === "bancario" ? "text-yellow-600" :
                            "text-gray-600"
                            }`} />
                            </div>
                            <div className="min-w-0">
                            <h3 className="font-bold truncate" style={{ color: '#202124', fontSize: '16px' }}>{sistema.nome}</h3>
                            {sistema.sigla && (
                              <p className="truncate" style={{ color: '#80868b', fontSize: '13px' }}>{sistema.sigla}</p>
                            )}
                            </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg font-bold capitalize whitespace-nowrap flex-shrink-0 ${
                        sistema.tipo === "fiscal" ? "bg-blue-100 text-blue-700" :
                        sistema.tipo === "contabil" ? "bg-green-100 text-green-700" :
                        "bg-gray-100 text-gray-700"
                      }`} style={{ fontSize: '12px' }}>
                        {sistema.tipo}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 mb-4 overflow-hidden">
                      {sistema.usuario && (
                        <div className="flex items-center gap-2 min-w-0">
                          <Key className="w-4 h-4 flex-shrink-0" style={{ color: '#5f6368' }} />
                          <span className="truncate" style={{ color: '#5f6368', fontSize: '14px' }}>Usuário: {sistema.usuario}</span>
                        </div>
                      )}
                      {sistema.certificado_digital && (
                        <div className="flex items-center gap-2 min-w-0">
                          <Shield className="w-4 h-4 flex-shrink-0" style={{ color: '#5f6368' }} />
                          <span className="truncate" style={{ color: '#5f6368', fontSize: '14px' }}>Cert. Digital: {sistema.tipo_certificado?.toUpperCase()}</span>
                        </div>
                      )}
                      {sistema.responsavel && (
                        <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>Resp: {sistema.responsavel}</p>
                      )}
                    </div>

                    {/* Alerta de validade */}
                    {(acessoVencendo || acessoVencido) && (
                      <div className={`p-3 rounded-xl flex items-center gap-2 mb-3 overflow-hidden ${
                        acessoVencido ? "bg-red-50 border border-red-200" : "bg-orange-50 border border-orange-200"
                      }`}>
                        <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: acessoVencido ? '#ea4335' : '#fbbc04' }} />
                        <span className="truncate font-bold" style={{ 
                          color: acessoVencido ? '#c5221f' : '#e37400',
                          fontSize: '13px'
                        }}>
                          {acessoVencido ? "Acesso vencido!" : `Vence em ${diasRestantes} dias`}
                        </span>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex flex-wrap gap-2 pt-3 overflow-hidden" style={{ borderTop: '1px solid #f1f3f4' }}>
                      {sistema.url_acesso && (
                        <a
                          href={sistema.url_acesso}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Acessar sistema"
                          className="font-bold rounded-xl hover:opacity-90 transition-all min-h-[48px] inline-flex items-center justify-center gap-2 px-4 flex-1 overflow-hidden"
                          style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '14px' }}
                        >
                          <ExternalLink className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Acessar</span>
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setEditingSistema(sistema);
                          setFormSistema({ ...sistema });
                          setShowPanel(true);
                        }}
                        aria-label="Editar sistema"
                        className="font-bold rounded-xl hover:bg-gray-200 transition-all min-h-[48px] inline-flex items-center justify-center gap-2 px-4 overflow-hidden"
                        style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
                      >
                        <Edit className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">Editar</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Deseja excluir este sistema?")) {
                            deleteMutation.mutate(sistema.id);
                          }
                        }}
                        aria-label="Excluir sistema"
                        className="font-bold rounded-xl hover:opacity-90 transition-all min-h-[48px] min-w-[48px] flex items-center justify-center"
                        style={{ backgroundColor: '#fde7e7', color: '#c5221f', fontSize: '14px' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Panel */}
      <SlideInPanel
        open={showPanel}
        onClose={() => setShowPanel(false)}
        title={editingSistema ? "Editar Sistema" : "Novo Sistema"}
        maxWidth="700px"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Nome do Sistema *</label>
              <Input
                value={formSistema.nome}
                onChange={(e) => setFormSistema({ ...formSistema, nome: e.target.value })}
                className="border border-gray-300 rounded-xl min-h-[48px]"
                style={{ fontSize: '16px' }}
                placeholder="Ex: e-CAC, SPED..."
                required
              />
            </div>
            <div>
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Sigla</label>
              <Input
                value={formSistema.sigla}
                onChange={(e) => setFormSistema({ ...formSistema, sigla: e.target.value })}
                className="border border-gray-300 rounded-xl min-h-[48px]"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Tipo *</label>
              <Select
                value={formSistema.tipo}
                onValueChange={(value) => setFormSistema({ ...formSistema, tipo: value })}
              >
                <SelectTrigger className="border border-gray-300 rounded-xl min-h-[48px]" style={{ fontSize: '16px' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposSistema.map(t => (
                    <SelectItem key={t.value} value={t.value} style={{ fontSize: '14px' }}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Esfera *</label>
              <Select
                value={formSistema.esfera}
                onValueChange={(value) => setFormSistema({ ...formSistema, esfera: value })}
              >
                <SelectTrigger className="border border-gray-300 rounded-xl min-h-[48px]" style={{ fontSize: '16px' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {esferas.map(e => (
                    <SelectItem key={e.value} value={e.value} style={{ fontSize: '14px' }}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">URL de Acesso</label>
            <Input
              value={formSistema.url_acesso}
              onChange={(e) => setFormSistema({ ...formSistema, url_acesso: e.target.value })}
              className="border-gray-300"
              placeholder="https://"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuário de Acesso</label>
              <Input
                value={formSistema.usuario}
                onChange={(e) => setFormSistema({ ...formSistema, usuario: e.target.value })}
                className="border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Responsável</label>
              <Input
                value={formSistema.responsavel}
                onChange={(e) => setFormSistema({ ...formSistema, responsavel: e.target.value })}
                className="border-gray-300"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formSistema.certificado_digital}
              onChange={(e) => setFormSistema({ ...formSistema, certificado_digital: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm text-gray-700">Requer Certificado Digital</label>
          </div>

          {formSistema.certificado_digital && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Certificado</label>
              <Select
                value={formSistema.tipo_certificado}
                onValueChange={(value) => setFormSistema({ ...formSistema, tipo_certificado: value })}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="e-cpf">e-CPF</SelectItem>
                  <SelectItem value="e-cnpj">e-CNPJ</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Validade do Acesso/Procuração</label>
            <Input
              type="date"
              value={formSistema.data_validade_acesso}
              onChange={(e) => setFormSistema({ ...formSistema, data_validade_acesso: e.target.value })}
              className="border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações/Instruções</label>
            <textarea
              value={formSistema.observacoes}
              onChange={(e) => setFormSistema({ ...formSistema, observacoes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 resize-none"
              rows="3"
              placeholder="Instruções de acesso, senhas temporárias, etc..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formSistema.ativo}
              onChange={(e) => setFormSistema({ ...formSistema, ativo: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm text-gray-700">Sistema Ativo</label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPanel(false)}
              className="flex-1 border-gray-300"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              className="flex-1 bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </SlideInPanel>
      </div>
    </RouteGuard>
  );
}