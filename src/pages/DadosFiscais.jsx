import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users,
  FileText,
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  DollarSign,
  FileSearch
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
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

export default function DadosFiscais() {
  usePerformanceTracker('/DadosFiscais');
  const [visaoAtual, setVisaoAtual] = useState("clinica");
  const [isLoading, setIsLoading] = useState(true);
  const [showPanelClinica, setShowPanelClinica] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);
  const [showPanelSocio, setShowPanelSocio] = useState(false);
  const [showPanelDoc, setShowPanelDoc] = useState(false);
  const [showPanelExtrato, setShowPanelExtrato] = useState(false);
  const [showPanelJunta, setShowPanelJunta] = useState(false);
  const [editingSocio, setEditingSocio] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [importandoExtrato, setImportandoExtrato] = useState(false);
  const [solicitandoDoc, setSolicitandoDoc] = useState(false);
  const queryClient = useQueryClient();

  const { data: dadosClinica = [] } = useOptimizedQuery({
    queryKey: ["dadosFiscaisClinica"],
    queryFn: () => base44.entities.DadosFiscaisClinica.list()
  });

  const { data: socios = [] } = useOptimizedQuery({
    queryKey: ["socios"],
    queryFn: () => base44.entities.Socio.list()
  });

  const { data: documentos = [] } = useOptimizedQuery({
    queryKey: ["documentosSocietarios"],
    queryFn: () => base44.entities.DocumentoSocietario.list("-data_documento")
  });

  const { data: extratos = [] } = useOptimizedQuery({
    queryKey: ["extratosBancarios"],
    queryFn: () => base44.entities.ExtratosBancarios.list("-periodo_inicio")
  });

  const createClinicaMutation = useMutation({
    mutationFn: (data) => base44.entities.DadosFiscaisClinica.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["dadosFiscaisClinica"]);
      setShowPanelClinica(false);
    }
  });

  const updateClinicaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DadosFiscaisClinica.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["dadosFiscaisClinica"]);
      setShowPanelClinica(false);
    }
  });

  const createSocioMutation = useMutation({
    mutationFn: (data) => base44.entities.Socio.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["socios"]);
      setShowPanelSocio(false);
      setEditingSocio(null);
    }
  });

  const updateSocioMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Socio.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["socios"]);
      setShowPanelSocio(false);
      setEditingSocio(null);
    }
  });

  const deleteSocioMutation = useMutation({
    mutationFn: (id) => base44.entities.Socio.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["socios"])
  });

  const createDocMutation = useMutation({
    mutationFn: (data) => base44.entities.DocumentoSocietario.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["documentosSocietarios"]);
      setShowPanelDoc(false);
      setEditingDoc(null);
    }
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentoSocietario.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["documentosSocietarios"])
  });

  const [formClinica, setFormClinica] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    endereco_completo: "",
    cidade: "Manaus",
    estado: "AM",
    cep: "",
    telefone: "",
    email: "",
    regime_tributario: "simples_nacional",
    data_abertura: "",
    cnae_principal: "",
    capital_social: 0,
    observacoes: ""
  });

  const [formSocio, setFormSocio] = useState({
    nome_completo: "",
    cpf: "",
    rg: "",
    data_nascimento: "",
    telefone: "",
    email: "",
    endereco_completo: "",
    tipo_socio: "quotista",
    percentual_participacao: 0,
    data_entrada: "",
    ativo: true,
    observacoes: ""
  });

  const [formDoc, setFormDoc] = useState({
    tipo_documento: "contrato_social",
    titulo: "",
    numero_registro: "",
    data_documento: "",
    data_registro: "",
    descricao: "",
    arquivo_url: "",
    nome_arquivo: "",
    junta_comercial: "JUCEA - Junta Comercial do Amazonas",
    estado: "AM",
    valido: true,
    observacoes: ""
  });

  const [formExtrato, setFormExtrato] = useState({
    banco: "",
    agencia: "",
    conta: "",
    tipo_conta: "corrente",
    periodo_inicio: "",
    periodo_fim: "",
    arquivo: null
  });

  const [formJunta, setFormJunta] = useState({
    tipo_documento: "contrato_social",
    estado: "AM"
  });

  const clinica = dadosClinica[0];

  const handleSubmitClinica = (e) => {
    e.preventDefault();
    if (clinica) {
      updateClinicaMutation.mutate({ id: clinica.id, data: formClinica });
    } else {
      createClinicaMutation.mutate(formClinica);
    }
  };

  const handleSubmitSocio = (e) => {
    e.preventDefault();
    if (editingSocio) {
      updateSocioMutation.mutate({ id: editingSocio.id, data: formSocio });
    } else {
      createSocioMutation.mutate(formSocio);
    }
  };

  const handleFileUploadDoc = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormDoc({
        ...formDoc,
        arquivo_url: file_url,
        nome_arquivo: file.name,
        tamanho_bytes: file.size
      });
    } catch (error) {
      alert("Erro ao fazer upload");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmitDoc = (e) => {
    e.preventDefault();
    if (editingDoc) {
      // Update not implemented in this simplified version
    } else {
      createDocMutation.mutate(formDoc);
    }
  };

  const handleImportarExtrato = async (e) => {
    e.preventDefault();
    if (!formExtrato.arquivo) {
      alert("Selecione um arquivo");
      return;
    }

    setImportandoExtrato(true);
    try {
      const formData = new FormData();
      formData.append('file', formExtrato.arquivo);
      formData.append('banco', formExtrato.banco);
      formData.append('agencia', formExtrato.agencia);
      formData.append('conta', formExtrato.conta);
      formData.append('tipo_conta', formExtrato.tipo_conta);
      formData.append('periodo_inicio', formExtrato.periodo_inicio);
      formData.append('periodo_fim', formExtrato.periodo_fim);

      const response = await fetch('/api/functions/importarExtratoBancario', {
        method: 'POST',
        body: formData
      });

      const resultado = await response.json();

      if (resultado.success) {
        queryClient.invalidateQueries(["extratosBancarios"]);
        queryClient.invalidateQueries(["contas"]);
        setShowPanelExtrato(false);
        alert(`✅ Extrato importado!\n\n${resultado.transacoes_importadas} transações processadas\n${resultado.conciliacoes_automaticas} conciliações automáticas`);
      } else {
        alert("Erro: " + resultado.error);
      }
    } catch (error) {
      alert("Erro ao importar: " + error.message);
    } finally {
      setImportandoExtrato(false);
    }
  };

  const handleSolicitarDocJunta = async (e) => {
    e.preventDefault();
    
    if (!clinica?.cnpj) {
      alert("Cadastre os dados fiscais da clínica primeiro");
      return;
    }

    setSolicitandoDoc(true);
    try {
      const response = await base44.functions.invoke('solicitarDocumentoJunta', {
        cnpj: clinica.cnpj,
        tipo_documento: formJunta.tipo_documento,
        estado: formJunta.estado
      });

      const resultado = response.data;

      if (resultado.success) {
        queryClient.invalidateQueries(["documentosSocietarios"]);
        setShowPanelJunta(false);
        
        const instrucoes = resultado.instrucoes;
        alert(`✅ Solicitação registrada!\n\nPortal: ${instrucoes.portal_url}\nPrazo: ${instrucoes.prazo_dias} dias\nCusto: ${instrucoes.custo_estimado}\n\nVerifique os detalhes no documento cadastrado.`);
      } else {
        alert("Erro: " + resultado.error);
      }
    } catch (error) {
      alert("Erro: " + error.message);
    } finally {
      setSolicitandoDoc(false);
    }
  };

  if (isLoading) {
    return (
      <RouteGuard requireAuth={true} requireClinica={true}>
        <div className="max-w-7xl mx-auto space-y-6 overflow-x-hidden animate-pulse">
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            <div className="h-8 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-5 bg-gray-200 rounded w-56" />
          </div>
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-gray-100 rounded-xl p-4">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
                  <div className="h-5 bg-gray-200 rounded w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 overflow-x-hidden">:::
      <PageHeader
        title="Dados Fiscais"
        description="Dados da clínica"
        breadcrumbs={[
          { label: "Administração", href: createPageUrl("Administracao") },
          { label: "Dados Fiscais" }
        ]}
      />

      {/* Navegação */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { key: "clinica", label: "Clínica", icon: Building2 },
            { key: "socios", label: "Sócios", icon: Users },
            { key: "documentos", label: "Documentos", icon: FileText },
            { key: "extratos", label: "Extratos", icon: DollarSign }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setVisaoAtual(tab.key)}
                aria-label={`Ver ${tab.label}`}
                aria-pressed={visaoAtual === tab.key}
                className={`font-bold rounded-xl transition-all min-h-[48px] flex items-center justify-center gap-2 px-3 overflow-hidden ${
                  visaoAtual === tab.key ? '' : 'hover:bg-gray-100'
                }`}
                style={visaoAtual === tab.key ? { 
                  backgroundColor: '#7E57FF',
                  color: '#ffffff',
                  fontSize: '14px'
                } : {
                  backgroundColor: '#f8f9fa',
                  color: '#5f6368',
                  fontSize: '14px'
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dados da Clínica */}
      {visaoAtual === "clinica" && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (clinica) {
                  setFormClinica({ ...clinica });
                }
                setShowPanelClinica(true);
              }}
              aria-label={clinica ? "Editar dados fiscais" : "Cadastrar dados fiscais"}
              className="font-bold rounded-full hover:opacity-90 transition-all min-h-[48px] flex items-center gap-2 px-5"
              style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '14px' }}
            >
              {clinica ? <Edit className="w-5 h-5 flex-shrink-0" /> : <Plus className="w-5 h-5 flex-shrink-0" />}
              {clinica ? "Editar Dados" : "Cadastrar Dados"}
            </button>
          </div>

          {clinica ? (
            <div className="bg-white rounded-2xl shadow-sm border p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <h2 className="font-bold mb-6 break-words" style={{ color: '#202124', fontSize: '20px' }}>{clinica.razao_social}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
                <div className="bg-gray-100 rounded-xl p-4 overflow-hidden">
                  <p className="mb-1 font-bold truncate" style={{ color: '#80868b', fontSize: '13px' }}>CNPJ</p>
                  <p className="font-bold break-words" style={{ color: '#202124', fontSize: '16px' }}>{clinica.cnpj}</p>
                </div>
                <div className="bg-gray-100 rounded-xl p-4 overflow-hidden">
                  <p className="mb-1 font-bold truncate" style={{ color: '#80868b', fontSize: '13px' }}>Nome Fantasia</p>
                  <p className="font-bold break-words" style={{ color: '#202124', fontSize: '16px' }}>{clinica.nome_fantasia || "-"}</p>
                </div>
                <div className="bg-gray-100 rounded-xl p-4 overflow-hidden">
                  <p className="mb-1 font-bold truncate" style={{ color: '#80868b', fontSize: '13px' }}>Inscrição Estadual</p>
                  <p className="font-bold break-words" style={{ color: '#202124', fontSize: '16px' }}>{clinica.inscricao_estadual || "-"}</p>
                </div>
                <div className="bg-gray-100 rounded-xl p-4 overflow-hidden">
                  <p className="mb-1 font-bold truncate" style={{ color: '#80868b', fontSize: '13px' }}>Inscrição Municipal</p>
                  <p className="font-bold break-words" style={{ color: '#202124', fontSize: '16px' }}>{clinica.inscricao_municipal || "-"}</p>
                </div>
                <div className="bg-gray-100 rounded-xl p-4 overflow-hidden md:col-span-2">
                  <p className="mb-1 font-bold truncate" style={{ color: '#80868b', fontSize: '13px' }}>Endereço</p>
                  <p className="font-bold break-words" style={{ color: '#202124', fontSize: '16px', lineHeight: '1.5' }}>{clinica.endereco_completo}</p>
                </div>
                <div className="bg-gray-100 rounded-xl p-4 overflow-hidden">
                  <p className="mb-1 font-bold truncate" style={{ color: '#80868b', fontSize: '13px' }}>Regime Tributário</p>
                  <p className="font-bold capitalize break-words" style={{ color: '#202124', fontSize: '16px' }}>{clinica.regime_tributario?.replace(/_/g, " ")}</p>
                </div>
                <div className="bg-gray-100 rounded-xl p-4 overflow-hidden">
                  <p className="mb-1 font-bold truncate" style={{ color: '#80868b', fontSize: '13px' }}>Capital Social</p>
                  <p className="font-bold break-words" style={{ color: '#202124', fontSize: '16px' }}>
                    R$ {clinica.capital_social?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border p-12 text-center overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p style={{ color: '#5f6368', fontSize: '16px' }}>Nenhum dado fiscal cadastrado</p>
            </div>
          )}
        </>
      )}

      {/* Sócios */}
      {visaoAtual === "socios" && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingSocio(null);
                setFormSocio({
                  nome_completo: "",
                  cpf: "",
                  rg: "",
                  data_nascimento: "",
                  telefone: "",
                  email: "",
                  endereco_completo: "",
                  tipo_socio: "quotista",
                  percentual_participacao: 0,
                  data_entrada: "",
                  ativo: true,
                  observacoes: ""
                });
                setShowPanelSocio(true);
              }}
              aria-label="Adicionar novo sócio"
              className="font-bold rounded-full hover:opacity-90 transition-all min-h-[48px] flex items-center gap-2 px-5"
              style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '14px' }}
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              Novo Sócio
            </button>
          </div>

          <div className="grid gap-4">
            {socios.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum sócio cadastrado</p>
              </div>
            ) : (
              socios.map((socio) => (
                <div key={socio.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800">{socio.nome_completo}</h3>
                      <p className="text-sm text-gray-600">CPF: {socio.cpf}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs capitalize">
                          {socio.tipo_socio?.replace(/_/g, " ")}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {socio.percentual_participacao}%
                        </span>
                        {!socio.ativo && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                            Inativo
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingSocio(socio);
                          setFormSocio({ ...socio });
                          setShowPanelSocio(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Excluir sócio?")) {
                            deleteSocioMutation.mutate(socio.id);
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Documentos Societários */}
      {visaoAtual === "documentos" && (
        <>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setFormJunta({
                  tipo_documento: "contrato_social",
                  estado: "AM"
                });
                setShowPanelJunta(true);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <FileSearch className="w-5 h-5" />
              Solicitar via Junta
            </button>
            <button
              onClick={() => {
                setEditingDoc(null);
                setFormDoc({
                  tipo_documento: "contrato_social",
                  titulo: "",
                  numero_registro: "",
                  data_documento: "",
                  data_registro: "",
                  descricao: "",
                  arquivo_url: "",
                  nome_arquivo: "",
                  junta_comercial: "JUCEA - Junta Comercial do Amazonas",
                  estado: "AM",
                  valido: true,
                  observacoes: ""
                });
                setShowPanelDoc(true);
              }}
              className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Upload Manual
            </button>
          </div>

          <div className="grid gap-4">
            {documentos.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum documento cadastrado</p>
              </div>
            ) : (
              documentos.map((doc) => (
                <div key={doc.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{doc.titulo}</h3>
                      <p className="text-sm text-gray-600 capitalize">{doc.tipo_documento?.replace(/_/g, " ")}</p>
                      {doc.numero_registro && (
                        <p className="text-sm text-gray-500 mt-1">Registro: {doc.numero_registro}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {doc.data_documento && format(new Date(doc.data_documento), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {doc.arquivo_url && (
                        <a
                          href={doc.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("Excluir documento?")) {
                            deleteDocMutation.mutate(doc.id);
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Extratos Bancários */}
      {visaoAtual === "extratos" && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => {
                setFormExtrato({
                  banco: "",
                  agencia: "",
                  conta: "",
                  tipo_conta: "corrente",
                  periodo_inicio: "",
                  periodo_fim: "",
                  arquivo: null
                });
                setShowPanelExtrato(true);
              }}
              className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Importar Extrato
            </button>
          </div>

          <div className="grid gap-4">
            {extratos.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum extrato importado</p>
              </div>
            ) : (
              extratos.map((extrato) => (
                <div key={extrato.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{extrato.banco}</h3>
                      <p className="text-sm text-gray-600">
                        Ag: {extrato.agencia} | Conta: {extrato.conta}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Período: {format(new Date(extrato.periodo_inicio), "dd/MM/yyyy")} a {format(new Date(extrato.periodo_fim), "dd/MM/yyyy")}
                      </p>
                      {extrato.processado && (
                        <p className="text-xs text-green-600 mt-1">
                          ✅ {extrato.transacoes_importadas} transações processadas
                        </p>
                      )}
                    </div>
                    {extrato.arquivo_url && (
                      <a
                        href={extrato.arquivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Panels continuam no próximo bloco... */}
      <SlideInPanel
        open={showPanelClinica}
        onClose={() => setShowPanelClinica(false)}
        title="Dados Fiscais da Clínica"
        maxWidth="800px"
      >
        <form onSubmit={handleSubmitClinica} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Razão Social *</label>
            <Input value={formClinica.razao_social} onChange={(e) => setFormClinica({ ...formClinica, razao_social: e.target.value })} className="border border-gray-300 rounded-xl min-h-[48px]" style={{ fontSize: '16px' }} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>CNPJ *</label>
              <Input value={formClinica.cnpj} onChange={(e) => setFormClinica({ ...formClinica, cnpj: e.target.value })} className="border border-gray-300 rounded-xl min-h-[48px]" style={{ fontSize: '16px' }} required />
            </div>
            <div>
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Nome Fantasia</label>
              <Input value={formClinica.nome_fantasia} onChange={(e) => setFormClinica({ ...formClinica, nome_fantasia: e.target.value })} className="border border-gray-300 rounded-xl min-h-[48px]" style={{ fontSize: '16px' }} />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowPanelClinica(false)} className="flex-1">Cancelar</Button>
            <button type="submit" className="flex-1 bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg">Salvar</button>
          </div>
        </form>
      </SlideInPanel>

      <SlideInPanel open={showPanelSocio} onClose={() => setShowPanelSocio(false)} title={editingSocio ? "Editar Sócio" : "Novo Sócio"} maxWidth="700px">
        <form onSubmit={handleSubmitSocio} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Nome Completo *</label>
            <Input value={formSocio.nome_completo} onChange={(e) => setFormSocio({ ...formSocio, nome_completo: e.target.value })} className="border border-gray-300 rounded-xl min-h-[48px]" style={{ fontSize: '16px' }} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>CPF *</label>
              <Input value={formSocio.cpf} onChange={(e) => setFormSocio({ ...formSocio, cpf: e.target.value })} className="border border-gray-300 rounded-xl min-h-[48px]" style={{ fontSize: '16px' }} required />
            </div>
            <div>
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Tipo *</label>
              <Select value={formSocio.tipo_socio} onValueChange={(value) => setFormSocio({ ...formSocio, tipo_socio: value })}>
                <SelectTrigger className="border border-gray-300 rounded-xl min-h-[48px]" style={{ fontSize: '16px' }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador" style={{ fontSize: '14px' }}>Administrador</SelectItem>
                  <SelectItem value="quotista" style={{ fontSize: '14px' }}>Quotista</SelectItem>
                  <SelectItem value="acionista" style={{ fontSize: '14px' }}>Acionista</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>% Participação</label>
            <Input type="number" step="0.01" value={formSocio.percentual_participacao} onChange={(e) => setFormSocio({ ...formSocio, percentual_participacao: parseFloat(e.target.value) })} className="border border-gray-300 rounded-xl min-h-[48px]" style={{ fontSize: '16px' }} />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowPanelSocio(false)} className="flex-1">Cancelar</Button>
            <button type="submit" className="flex-1 bg-[#0B7A9E] text-white font-medium py-2 px-4 rounded-lg">Salvar</button>
          </div>
        </form>
      </SlideInPanel>

      <SlideInPanel open={showPanelDoc} onClose={() => setShowPanelDoc(false)} title="Upload Manual de Documento" maxWidth="700px">
        <form onSubmit={handleSubmitDoc} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
            <Select value={formDoc.tipo_documento} onValueChange={(value) => setFormDoc({ ...formDoc, tipo_documento: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contrato_social">Contrato Social</SelectItem>
                <SelectItem value="alteracao_contratual">Alteração Contratual</SelectItem>
                <SelectItem value="ata_assembleia">Ata de Assembleia</SelectItem>
                <SelectItem value="certidao_junta">Certidão da Junta</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
            <Input value={formDoc.titulo} onChange={(e) => setFormDoc({ ...formDoc, titulo: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Arquivo</label>
            <input type="file" onChange={handleFileUploadDoc} disabled={uploadingFile} className="w-full border rounded-lg p-2" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowPanelDoc(false)} className="flex-1">Cancelar</Button>
            <button type="submit" className="flex-1 bg-[#0B7A9E] text-white font-medium py-2 rounded-lg">Salvar</button>
          </div>
        </form>
      </SlideInPanel>

      <SlideInPanel open={showPanelExtrato} onClose={() => setShowPanelExtrato(false)} title="Importar Extrato Bancário" maxWidth="700px">
        <form onSubmit={handleImportarExtrato} className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              O sistema irá processar o extrato e conciliar automaticamente com contas a pagar/receber usando IA.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Banco *</label>
              <Input value={formExtrato.banco} onChange={(e) => setFormExtrato({ ...formExtrato, banco: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Conta *</label>
              <Select value={formExtrato.tipo_conta} onValueChange={(value) => setFormExtrato({ ...formExtrato, tipo_conta: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrente">Corrente</SelectItem>
                  <SelectItem value="poupanca">Poupança</SelectItem>
                  <SelectItem value="investimento">Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Agência</label>
              <Input value={formExtrato.agencia} onChange={(e) => setFormExtrato({ ...formExtrato, agencia: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Conta</label>
              <Input value={formExtrato.conta} onChange={(e) => setFormExtrato({ ...formExtrato, conta: e.target.value })} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Período Início *</label>
              <Input type="date" value={formExtrato.periodo_inicio} onChange={(e) => setFormExtrato({ ...formExtrato, periodo_inicio: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Período Fim *</label>
              <Input type="date" value={formExtrato.periodo_fim} onChange={(e) => setFormExtrato({ ...formExtrato, periodo_fim: e.target.value })} required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Arquivo do Extrato *</label>
            <input 
              type="file" 
              accept=".pdf,.csv,.txt,.ofx"
              onChange={(e) => setFormExtrato({ ...formExtrato, arquivo: e.target.files[0] })}
              disabled={importandoExtrato}
              className="w-full border rounded-lg p-2"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Formatos: PDF, CSV, TXT, OFX</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowPanelExtrato(false)} className="flex-1" disabled={importandoExtrato}>
              Cancelar
            </Button>
            <button type="submit" disabled={importandoExtrato} className="flex-1 bg-[#0B7A9E] text-white font-medium py-2 rounded-lg disabled:opacity-50">
              {importandoExtrato ? "Processando..." : "Importar"}
            </button>
          </div>
        </form>
      </SlideInPanel>

      <SlideInPanel open={showPanelJunta} onClose={() => setShowPanelJunta(false)} title="Solicitar Documento - Junta Comercial" maxWidth="600px">
        <form onSubmit={handleSolicitarDocJunta} className="space-y-4">
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <p className="text-sm text-purple-800">
              O sistema irá gerar instruções detalhadas de como solicitar o documento na Junta Comercial.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ</label>
            <Input value={clinica?.cnpj || ""} disabled className="bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Documento *</label>
            <Select value={formJunta.tipo_documento} onValueChange={(value) => setFormJunta({ ...formJunta, tipo_documento: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contrato_social">Contrato Social</SelectItem>
                <SelectItem value="alteracao_contratual">Alteração Contratual</SelectItem>
                <SelectItem value="certidao_junta">Certidão Simplificada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado *</label>
            <Input value={formJunta.estado} onChange={(e) => setFormJunta({ ...formJunta, estado: e.target.value })} maxLength={2} required />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowPanelJunta(false)} className="flex-1" disabled={solicitandoDoc}>
              Cancelar
            </Button>
            <button type="submit" disabled={solicitandoDoc} className="flex-1 bg-purple-600 text-white font-medium py-2 rounded-lg disabled:opacity-50">
              {solicitandoDoc ? "Processando..." : "Gerar Instruções"}
            </button>
          </div>
        </form>
      </SlideInPanel>
      </div>
    </RouteGuard>
  );
}