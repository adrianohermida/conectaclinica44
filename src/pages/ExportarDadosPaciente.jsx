import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Download, Search, AlertCircle, CheckCircle, FileText, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/components/hooks/useAuth";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

/**
 * Exportação de dados - LGPD Art. 18, IV
 * Portabilidade de dados
 * Acesso: Staff da clínica (admin_clinica, médicos, equipe) + SuperAdmin
 */
export default function ExportarDadosPaciente() {
  return (
    <RouteGuard requireAuth requireClinica>
      <ExportarDadosContent />
    </RouteGuard>
  );
}

function ExportarDadosContent() {
  const [busca, setBusca] = useState("");
  const [exportando, setExportando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  // ARQUITETURA V2: Contato unificado - RBAC
  const { data: pacientes = [] } = useQuery({
    queryKey: ["pacientes-exportacao", user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return [];
      return await base44.entities.Contato.filter({ 
        clinica_id: user.clinica_id,
        tipo_contato: "paciente"
      });
    },
    enabled: !!user?.clinica_id
  });

  const pacientesFiltrados = pacientes.filter(p =>
    p.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
    p.cpf?.includes(busca) ||
    p.email?.toLowerCase().includes(busca.toLowerCase())
  );

  const handleExportar = async (paciente) => {
    if (!confirm(`Exportar TODOS os dados de ${paciente.nome_completo}?\n\nIsto inclui:\n- Dados cadastrais\n- Prontuários\n- Prescrições\n- Documentos\n- Agendamentos\n- Histórico financeiro\n\nAção registrada em log de auditoria (LGPD Art. 37).`)) {
      return;
    }

    setExportando(true);
    setResultado(null);

    try {
      const response = await base44.functions.invoke('exportarDadosPaciente', {
        paciente_id: paciente.id
      });

      // Download JSON
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paciente_${paciente.nome_completo.replace(/\s/g, '_')}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      // Registrar acesso aos dados (LGPD Art. 37)
      await base44.entities.LogAcessoDado.create({
        clinica_id: user.clinica_id,
        usuario_id: user.id,
        usuario_nome: user.full_name,
        titular_id: paciente.id,
        titular_nome: paciente.nome_completo,
        tipo_operacao: 'exportacao',
        finalidade: 'Portabilidade de dados (LGPD Art. 18, IV)',
        dados_acessados: ['cadastro', 'prontuarios', 'prescricoes', 'documentos', 'agendamentos', 'financeiro'],
        ip_origem: 'webapp'
      }).catch(() => {});

      setResultado({
        sucesso: true,
        mensagem: `Dados de ${paciente.nome_completo} exportados com sucesso!`,
        totais: response.data.totais
      });
    } catch (error) {
      setResultado({
        sucesso: false,
        mensagem: `Erro ao exportar: ${error.message}`
      });
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exportar Dados de Pacientes"
        description="Portabilidade de dados (LGPD Art. 18, IV)"
        breadcrumbs={[
          { label: "Gestão Clínica" },
          { label: "Exportar Dados" }
        ]}
      />

      {/* Alerta LGPD */}
      <div className="p-5 rounded-2xl border-l-4" style={{ 
        backgroundColor: '#e8f1fb', 
        borderColor: '#1a73e8',
        border: '1px solid #bdd8f4'
      }}>
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: '#1a73e8' }} />
          <div>
            <h3 className="font-bold mb-2" style={{ color: '#0e4082' }}>⚖️ Conformidade LGPD - Portabilidade de Dados</h3>
            <ul className="text-sm space-y-1" style={{ color: '#1662c6' }}>
              <li>• <strong>Art. 18, IV</strong> - Direito à portabilidade dos dados a outro fornecedor</li>
              <li>• <strong>Art. 37</strong> - Todas exportações registradas em log de auditoria</li>
              <li>• Formato: JSON estruturado, legível por máquina, interoperável</li>
              <li>• Escopo: cadastro, prontuários, prescrições, documentos, agendamentos, financeiro</li>
              <li>• <strong>Prazo legal</strong>: Atendimento imediato à solicitação do titular</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Alerta: Auto-exportação Paciente */}
      <div className="p-4 rounded-xl" style={{ 
        backgroundColor: '#fef9e5', 
        border: '1px solid #fce181'
      }}>
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#956802' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#956802' }}>
              💡 Pacientes podem exportar seus próprios dados via Portal do Paciente
            </p>
            <p className="text-xs mt-1" style={{ color: '#b78402' }}>
              Esta página é para staff da clínica exportar dados de pacientes (ex: pedido judicial, transferência de clínica)
            </p>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="p-4 rounded-2xl bg-white" style={{ border: '1px solid #e8eaed' }}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9aa0a6' }} />
          <Input
            placeholder="Buscar paciente por nome, CPF ou email..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-12 rounded-xl min-h-[48px] border-gray-200"
            style={{ backgroundColor: '#f8f9fa' }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: '#80868b' }}>
          {pacientes.length} paciente{pacientes.length !== 1 ? 's' : ''} na clínica
        </p>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className={`p-5 rounded-2xl border-l-4`} style={{
          backgroundColor: resultado.sucesso ? '#e6f7ed' : '#fde7e7',
          borderColor: resultado.sucesso ? '#34a853' : '#ea4335',
          border: resultado.sucesso ? '1px solid #b8e7ca' : '1px solid #f9b8b6'
        }}>
          <div className="flex items-start gap-3">
            {resultado.sucesso ? (
              <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#137333' }} />
            ) : (
              <AlertCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#c5221f' }} />
            )}
            <div>
              <p className="font-semibold" style={{ color: resultado.sucesso ? '#137333' : '#c5221f' }}>
                {resultado.mensagem}
              </p>
              {resultado.totais && (
                <div className="mt-3 text-sm" style={{ color: '#1f6332' }}>
                  <p className="font-semibold">📊 Dados exportados:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• {resultado.totais.total_prontuarios} prontuários</li>
                    <li>• {resultado.totais.total_prescricoes} prescrições</li>
                    <li>• {resultado.totais.total_agendamentos} agendamentos</li>
                    <li>• {resultado.totais.total_documentos} documentos</li>
                    <li>• {resultado.totais.total_vendas} vendas</li>
                  </ul>
                  <p className="text-xs mt-3 italic">✅ Registro de auditoria criado automaticamente</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Pacientes */}
      <div className="rounded-2xl bg-white" style={{ border: '1px solid #e8eaed', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="p-4 border-b" style={{ borderColor: '#e8eaed' }}>
          <h3 className="font-bold" style={{ color: '#202124' }}>Pacientes da Clínica</h3>
          <p className="text-xs mt-1" style={{ color: '#80868b' }}>
            Clique em "Exportar" para gerar arquivo JSON com todos os dados do paciente
          </p>
        </div>
        <div className="divide-y" style={{ borderColor: '#f1f3f4' }}>
          {pacientesFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#dadce0' }} />
              <p className="text-lg font-semibold mb-2" style={{ color: '#202124' }}>Nenhum paciente encontrado</p>
              <p className="text-sm" style={{ color: '#5f6368' }}>
                {busca ? 'Tente outra busca' : 'Nenhum paciente cadastrado na clínica'}
              </p>
            </div>
          ) : (
            pacientesFiltrados.map((paciente) => (
              <div key={paciente.id} className="p-5 hover:bg-gray-50 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1 truncate" style={{ color: '#202124' }}>
                      {paciente.nome_completo}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-sm" style={{ color: '#5f6368' }}>
                      {paciente.cpf && <span>CPF: {paciente.cpf}</span>}
                      {paciente.email && <span>Email: {paciente.email}</span>}
                      {paciente.data_nascimento && (
                        <span>Nascimento: {new Date(paciente.data_nascimento).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleExportar(paciente)}
                    disabled={exportando}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#7E57FF', color: 'white' }}
                  >
                    <Download className="w-4 h-4" />
                    {exportando ? "Exportando..." : "Exportar"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}