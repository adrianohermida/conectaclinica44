import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { secureEntities } from "@/components/security/SecureEntityWrapper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import FormPrescricaoBasico from "@/components/prescricao/FormPrescricaoBasico";
import PaywallPrescricao from "@/components/monetizacao/PaywallPrescricao";
import { 
  FilePlus, Search, Loader2, FileText, Calendar, User, 
  CheckCircle2, Clock, Send, Printer, Download, Eye,
  AlertCircle, Shield, Plus
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import PermissionGuard from "@/components/auth/PermissionGuard";

export default function PrescricoesEletronicas() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [prescricaoSelecionada, setPrescricaoSelecionada] = useState(null);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [prontuarioSelecionado, setProntuarioSelecionado] = useState(null);

  // User context
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 15 * 60 * 1000
  });

  const clinicaId = user?.clinica_id;

  // DIA 3: Verificar limites de uso
  const { data: limites } = useQuery({
    queryKey: ["limites-prescricao", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return null;
      const response = await base44.functions.invoke('verificarLimitesPrescricao', {});
      return response.data;
    },
    enabled: !!clinicaId,
    staleTime: 30000, // Revalidar a cada 30s
    refetchOnMount: true
  });

  // Buscar médico do usuário atual
  const { data: medico } = useQuery({
    queryKey: ["medico-atual", user?.email, clinicaId],
    queryFn: async () => {
      if (!clinicaId || !user?.email) return null;
      const medicos = await secureEntities.Medico.filter({ 
        clinica_id: clinicaId, 
        email: user.email 
      });
      return medicos[0] || null;
    },
    enabled: !!clinicaId && !!user?.email,
    staleTime: 10 * 60 * 1000
  });

  // Listar prescrições
  const { data: prescricoes = [], isLoading } = useQuery({
    queryKey: ["prescricoes-eletronicas", clinicaId, medico?.id],
    queryFn: async () => {
      if (!clinicaId) return [];
      
      // Médico vê só suas prescrições, admin vê tudo
      if (user?.role === 'admin') {
        return await secureEntities.PrescricaoEletronica.filter(
          { clinica_id: clinicaId },
          "-data_prescricao",
          100
        );
      } else if (medico?.id) {
        return await secureEntities.PrescricaoEletronica.filter(
          { clinica_id: clinicaId, medico_id: medico.id },
          "-data_prescricao",
          100
        );
      }
      return [];
    },
    enabled: !!clinicaId && (!!medico?.id || user?.role === 'admin'),
    staleTime: 2 * 60 * 1000
  });

  // Criar prescrição
  const criarPrescricaoMutation = useMutation({
    mutationFn: async (data) => {
      // DIA 3: PAYWALL HARD BLOCKER
      if (limites?.bloqueado) {
        throw new Error("Limite mensal atingido. Faça upgrade para continuar.");
      }

      if (!medico?.id) {
        throw new Error("Médico não cadastrado no sistema");
      }

      const crmPrincipal = medico.crms[0];
      const crmFormatado = `${crmPrincipal.numero}/${crmPrincipal.estado}`;

      // Hash SHA-256 do conteúdo (integridade CFM)
      const conteudoHash = JSON.stringify({
        medico_crm: crmFormatado,
        paciente: pacienteSelecionado.nome_completo,
        medicamentos: data.medicamentos,
        data: new Date().toISOString()
      });

      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(conteudoHash));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const novaPrescricao = await secureEntities.PrescricaoEletronica.create({
        clinica_id: clinicaId,
        medico_id: medico.id,
        medico_nome: medico.nome_completo,
        medico_crm: crmFormatado,
        paciente_id: pacienteSelecionado.id,
        paciente_nome: pacienteSelecionado.nome_completo,
        paciente_cpf: pacienteSelecionado.cpf,
        prontuario_id: prontuarioSelecionado.id,
        data_prescricao: new Date().toISOString(),
        medicamentos: data.medicamentos,
        tipo_receita: data.tipo_receita,
        orientacoes_gerais: data.orientacoes_gerais,
        status: "rascunho",
        hash_sha256: hash,
        validade_dias: data.tipo_receita === 'antimicrobiano' ? 10 : 30
      });

      toast.loading('Gerando PDF CFM-compliant...');

      // 1. Gerar PDF
      const pdfResponse = await base44.functions.invoke('gerarPDFPrescricao', {
        prescricao_id: novaPrescricao.id
      });

      if (!pdfResponse.data.success) {
        throw new Error('Erro ao gerar PDF');
      }

      const pdfUrl = pdfResponse.data.pdf_url;
      toast.dismiss();
      toast.success('PDF gerado!');
      toast.loading('Enviando para assinatura...');

      // 2. Buscar email médico
      const medicos = await base44.entities.Medico.filter({ id: medico.id });
      const medicoEmail = medicos[0]?.email;

      if (!medicoEmail) {
        throw new Error('Médico sem email. Atualize o cadastro.');
      }

      // 3. USAR FUNÇÃO EXISTENTE enviarAssinaturaDigital
      const assinaturaResponse = await base44.functions.invoke('enviarAssinaturaDigital', {
        documento_nome: `Prescrição ${pacienteSelecionado.nome_completo} - ${new Date().toLocaleDateString('pt-BR')}`,
        arquivo_url: pdfUrl,
        documento_tipo: 'prescricao_eletronica',
        signatarios: [
          { nome: medico.nome_completo, email: medicoEmail, action: 'SIGN' }
        ]
      });

      if (!assinaturaResponse.data.success) {
        throw new Error(assinaturaResponse.data.error || 'Erro ao enviar para assinatura');
      }

      const autentiqueDocId = assinaturaResponse.data.documento_id;
      const signatureLink = assinaturaResponse.data.signatarios[0]?.link_assinatura;

      // 4. Vincular Autentique ID na prescrição
      await base44.entities.PrescricaoEletronica.update(novaPrescricao.id, {
        assinatura_digital: {
          autentique_document_id: autentiqueDocId,
          status: 'pendente',
          link_assinatura: signatureLink
        },
        status: 'enviada'
      });

      toast.dismiss();
      toast.success('Enviado para assinatura!');

      // 5. Abrir link assinatura
      if (signatureLink) {
        window.open(signatureLink, '_blank');
      }

      // DIA 3: Incrementar consumo
      await base44.functions.invoke('incrementarConsumoRecurso', {
        recurso: 'prescricao_eletronica',
        entidade_vinculada_id: novaPrescricao.id,
        quantidade: 1
      });

      return novaPrescricao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["prescricoes-eletronicas"]);
      queryClient.invalidateQueries(["limites-prescricao"]); // DIA 3: Revalidar limites
      toast.success("✅ Prescrição criada e pronta para assinatura!");
      setShowForm(false);
      setPacienteSelecionado(null);
      setProntuarioSelecionado(null);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Buscar pacientes para autocomplete
  const { data: pacientes = [] } = useQuery({
    queryKey: ["pacientes-autocomplete", clinicaId, busca],
    queryFn: async () => {
      if (!clinicaId || busca.length < 2) return [];
      const results = await secureEntities.Contato.filter(
        { 
          clinica_id: clinicaId, 
          tipo_contato: "paciente"
        },
        "-created_date",
        20
      );
      return results.filter(p => 
        p.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
        p.cpf?.includes(busca)
      );
    },
    enabled: !!clinicaId && busca.length >= 2,
    staleTime: 30000
  });

  // Buscar prontuários do paciente selecionado
  const { data: prontuariosPaciente = [] } = useQuery({
    queryKey: ["prontuarios-paciente", pacienteSelecionado?.id, clinicaId],
    queryFn: async () => {
      if (!pacienteSelecionado?.id || !clinicaId) return [];
      return await secureEntities.Prontuario.filter(
        { 
          clinica_id: clinicaId, 
          paciente_id: pacienteSelecionado.id 
        },
        "-data_atendimento",
        10
      );
    },
    enabled: !!pacienteSelecionado?.id && !!clinicaId,
    staleTime: 60000
  });

  const prescricoesFiltradas = prescricoes.filter(p => 
    p.paciente_nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.medico_nome.toLowerCase().includes(busca.toLowerCase())
  );

  const statusConfig = {
    rascunho: { label: "Rascunho", color: "gray", icon: Clock },
    assinada: { label: "Assinada", color: "green", icon: CheckCircle2 },
    enviada: { label: "Enviada", color: "blue", icon: Send },
    impressa: { label: "Impressa", color: "purple", icon: Printer },
    cancelada: { label: "Cancelada", color: "red", icon: AlertCircle }
  };

  if (isLoading || !user) {
    return (
      <RouteGuard requireAuth>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
        </div>
      </RouteGuard>
    );
  }

  // BLOQUEIO: Apenas médicos podem prescrever
  if (!medico && user?.role !== 'admin') {
    return (
      <RouteGuard requireAuth>
        <div className="max-w-2xl mx-auto mt-20">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
            <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-3">⚠️ Acesso Restrito</h2>
            <p className="text-red-700 mb-2">
              Prescrição eletrônica é permitida apenas para médicos cadastrados (CFM 1.821/07).
            </p>
            <p className="text-sm text-red-600">
              Contate o administrador da clínica para vincular seu CRM.
            </p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  const handleUpgrade = () => {
    window.location.href = createPageUrl("Planos");
  };

  return (
    <RouteGuard requireAuth requireClinica>
      <PermissionGuard modulo="prontuarios">
        {/* DIA 3: PAYWALL MODAL BLOQUEANTE */}
      {limites?.bloqueado && (
        <PaywallPrescricao
          usado={limites.usado}
          limite={limites.limite}
          percentual={limites.percentual}
          bloqueado={true}
          onUpgrade={handleUpgrade}
        />
      )}

      <PageHeader
        title="Prescrições Eletrônicas"
        description="Receitas médicas digitais CFM-compliant com assinatura ICP-Brasil"
        action={
          <Button 
            onClick={() => setShowForm(true)}
            disabled={limites?.bloqueado}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Prescrição
          </Button>
        }
      />

      {/* DIA 3: ALERTA 80%+ */}
      {limites && !limites.bloqueado && limites.percentual >= 80 && (
        <PaywallPrescricao
          usado={limites.usado}
          limite={limites.limite}
          percentual={limites.percentual}
          bloqueado={false}
          onUpgrade={handleUpgrade}
        />
      )}

      {/* Modal Nova Prescrição - WORKFLOW 3 PASSOS */}
      {showForm && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Nova Prescrição Eletrônica</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setPacienteSelecionado(null);
                  setProntuarioSelecionado(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Progress Steps */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className={`flex items-center gap-2 ${!pacienteSelecionado ? 'text-purple-600 font-bold' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${!pacienteSelecionado ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>1</div>
                  <span className="text-sm">Paciente</span>
                </div>
                <div className="w-12 h-0.5 bg-gray-300" />
                <div className={`flex items-center gap-2 ${pacienteSelecionado && !prontuarioSelecionado ? 'text-purple-600 font-bold' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${pacienteSelecionado && !prontuarioSelecionado ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>2</div>
                  <span className="text-sm">Prontuário</span>
                </div>
                <div className="w-12 h-0.5 bg-gray-300" />
                <div className={`flex items-center gap-2 ${prontuarioSelecionado ? 'text-purple-600 font-bold' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${prontuarioSelecionado ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>3</div>
                  <span className="text-sm">Prescrição</span>
                </div>
              </div>

              {/* PASSO 1: Selecionar Paciente */}
              {!pacienteSelecionado && (
                <div>
                  <h3 className="font-bold mb-3">1. Selecionar Paciente</h3>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar paciente por nome ou CPF..."
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                  {busca.length >= 2 && (
                    <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                      {pacientes.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500">Nenhum paciente encontrado</p>
                      ) : (
                        pacientes.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setPacienteSelecionado(p);
                              setBusca("");
                            }}
                            className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <p className="font-medium">{p.nome_completo}</p>
                            {p.cpf && <p className="text-xs text-gray-500">CPF {p.cpf}</p>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PASSO 2: Selecionar Prontuário */}
              {pacienteSelecionado && !prontuarioSelecionado && (
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center justify-between">
                    <p className="text-sm text-green-800">✓ Paciente: <strong>{pacienteSelecionado.nome_completo}</strong></p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPacienteSelecionado(null)}
                    >
                      Trocar
                    </Button>
                  </div>
                  <h3 className="font-bold mb-3">2. Selecionar Prontuário</h3>
                  {prontuariosPaciente.length === 0 ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-sm text-red-700">Paciente sem prontuários. Crie um prontuário primeiro.</p>
                      <Button 
                        variant="outline" 
                        onClick={() => setPacienteSelecionado(null)}
                        className="mt-3"
                      >
                        Voltar
                      </Button>
                    </div>
                  ) : (
                    <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                      {prontuariosPaciente.map(pront => (
                        <button
                          key={pront.id}
                          onClick={() => setProntuarioSelecionado(pront)}
                          className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{pront.queixa_principal}</p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(pront.data_atendimento), 'dd/MM/yyyy')} • {pront.medico_nome}
                              </p>
                            </div>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                              {pront.status_prontuario}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PASSO 3: Preencher Prescrição */}
              {pacienteSelecionado && prontuarioSelecionado && (
                <FormPrescricaoBasico
                  medico={medico}
                  paciente={pacienteSelecionado}
                  prontuario={prontuarioSelecionado}
                  onSubmit={(data) => criarPrescricaoMutation.mutate(data)}
                  onCancel={() => {
                    setShowForm(false);
                    setPacienteSelecionado(null);
                    setProntuarioSelecionado(null);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Prescrições */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por paciente ou médico..."
              className="pl-10"
            />
          </div>
        </div>

        {prescricoesFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Nenhuma prescrição encontrada</p>
            <Button onClick={() => setShowForm(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira prescrição
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {prescricoesFiltradas.map(prescricao => {
              const statusInfo = statusConfig[prescricao.status];
              const StatusIcon = statusInfo.icon;
              
              return (
                <div key={prescricao.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <p className="font-bold text-gray-900">{prescricao.paciente_nome}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-${statusInfo.color}-100 text-${statusInfo.color}-700 flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(prescricao.data_prescricao), 'dd/MM/yyyy HH:mm')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {prescricao.medico_nome} • CRM {prescricao.medico_crm}
                        </span>
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          {prescricao.tipo_receita.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {prescricao.medicamentos.slice(0, 2).map((med, idx) => (
                          <p key={idx} className="text-sm text-gray-700">
                            • <strong>{med.nome_generico}</strong> {med.dose}{med.unidade} - {med.via_administracao} - {med.frequencia}
                          </p>
                        ))}
                        {prescricao.medicamentos.length > 2 && (
                          <p className="text-xs text-gray-500">+ {prescricao.medicamentos.length - 2} medicamentos</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      {prescricao.status === 'rascunho' && (
                        <Button size="sm">
                          <FileText className="w-4 h-4 mr-1" />
                          Assinar
                        </Button>
                      )}
                      {prescricao.pdf_url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(prescricao.pdf_url, '_blank')}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                      )}
                      {prescricao.assinatura_digital?.pdf_assinado_url && (
                        <Button 
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => window.open(prescricao.assinatura_digital.pdf_assinado_url, '_blank')}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          PDF Assinado
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </PermissionGuard>
    </RouteGuard>
  );
}