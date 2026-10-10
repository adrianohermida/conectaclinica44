import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import { useLocation } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Download, Shield, CheckCircle2, Calendar, User, MapPin, Smartphone, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

/**
 * P0.10 - Auditoria de Aceites de Termos Legais
 * Visualizar todos os aceites + download PDF certificados
 */
export default function AuditoriaAceitesTermos() {
  const { user } = useClinicaContext();
  const location = useLocation();
  const [downloadingCert, setDownloadingCert] = useState(null);

  // BREADCRUMB DINÂMICO (extrai de URL ou state)
  const params = new URLSearchParams(location.search);
  const fromPaciente = params.get('from') === 'paciente';
  const pacienteId = params.get('paciente_id');
  const pacienteNome = params.get('paciente_nome');

  // Buscar TODOS aceites da clínica (multi-tenant)
  const { data: aceites = [], isLoading } = useQuery({
    queryKey: ["aceites-termos-clinica", user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return [];
      
      // Buscar todos usuários da clínica
      const usuarios = await base44.entities.UsuarioClinica.filter({ 
        clinica_id: user.clinica_id, 
        ativo: true 
      });
      const userIds = usuarios.map(u => u.user_id);
      
      // Buscar aceites de todos os usuários
      const allAceites = await Promise.all(
        userIds.map(uid => 
          base44.entities.AceiteTermoLegal.filter({ usuario_id: uid }, "-data_aceite", 50)
        )
      );
      
      return allAceites.flat().sort((a, b) => 
        new Date(b.data_aceite || 0) - new Date(a.data_aceite || 0)
      );
    },
    enabled: !!user?.clinica_id
  });

  // Buscar termos legais para enriquecer dados
  const { data: termosMap = {} } = useQuery({
    queryKey: ["termos-map"],
    queryFn: async () => {
      const termos = await base44.entities.TermoLegal.list();
      return termos.reduce((acc, t) => ({ ...acc, [t.id]: t }), {});
    }
  });

  const handleDownloadCertificado = async (aceite) => {
    if (!aceite.certificado_url) {
      toast.error("Certificado não disponível para este aceite.");
      return;
    }

    try {
      setDownloadingCert(aceite.id);
      const response = await fetch(aceite.certificado_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificado_aceite_${aceite.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("📄 Certificado baixado com sucesso!");
    } catch (error) {
      toast.error("Erro ao baixar certificado: " + error.message);
    } finally {
      setDownloadingCert(null);
    }
  };

  return (
    <RouteGuard requireAuth={true}>
      <div className="space-y-6">
        <PageHeader
          title="Auditoria de Aceites"
          description="Histórico completo de termos legais aceitos com cadeia de custódia"
          breadcrumbs={fromPaciente && pacienteId ? [
            { label: "Pacientes", url: createPageUrl("Pacientes") },
            { label: pacienteNome || "Detalhes", url: createPageUrl("PacienteDetalhes") + `?id=${pacienteId}` },
            { label: "Aceites LGPD" }
          ] : [
            { label: "Compliance" },
            { label: "Auditoria de Aceites" }
          ]}
          showBack={fromPaciente}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Aceites</p>
                <p className="text-2xl font-bold text-gray-900">{aceites.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Com ICP-Brasil</p>
                <p className="text-2xl font-bold text-gray-900">
                  {aceites.filter(a => a.timestamp_icp_brasil).length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Certificados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {aceites.filter(a => a.certificado_url).length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Lista de Aceites */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Histórico de Aceites
          </h2>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-32" />
              ))}
            </div>
          ) : aceites.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum termo aceito ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {aceites.map(aceite => {
                const termo = termosMap[aceite.termo_legal_id];
                return (
                  <div
                    key={aceite.id}
                    className="border rounded-xl p-4 hover:shadow-md transition-all"
                    style={{ borderColor: '#e8eaed' }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">
                          {termo?.titulo || "Termo não encontrado"}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="success">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Aceito
                          </Badge>
                          {aceite.timestamp_blockchain && (
                            <Badge variant="info">Blockchain Proof</Badge>
                          )}
                          {aceite.timestamp_icp_brasil && (
                            <Badge variant="primary">ICP-Brasil</Badge>
                          )}
                        </div>
                      </div>

                      {aceite.certificado_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadCertificado(aceite)}
                          disabled={downloadingCert === aceite.id}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {downloadingCert === aceite.id ? "Baixando..." : "Certificado PDF"}
                        </Button>
                      )}
                    </div>

                    {/* Metadados */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {aceite.timestamp_aceite ? format(new Date(aceite.timestamp_aceite), "dd/MM/yyyy HH:mm:ss") : "N/A"}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4" />
                        {aceite.usuario_email}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {aceite.ip_address || "N/A"}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Smartphone className="w-4 h-4" />
                        {aceite.user_agent ? aceite.user_agent.slice(0, 30) + "..." : "N/A"}
                      </div>
                    </div>

                    {/* Hash Auditoria */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Hash SHA-256 (Cadeia de Custódia):</p>
                      <code className="text-xs font-mono text-gray-700 break-all">
                        {aceite.hash_aceite || "N/A"}
                      </code>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Aviso Legal */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">Validade Jurídica (MP 2.200/2)</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                Todos os aceites registrados possuem cadeia de custódia digital com hash SHA-256, 
                timestamp e IP, garantindo <strong>autenticidade, integridade e não-repúdio</strong> 
                conforme MP 2.200/2 (ICP-Brasil). Certificados PDF disponíveis para download.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </RouteGuard>
  );
}