import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { AlertCircle, CheckCircle, Shield, Mail, Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

export default function AuditoriaEmailMultitenant() {
  return (
    <RouteGuard requireAuth>
      <AuditoriaContent />
    </RouteGuard>
  );
}

function AuditoriaContent() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: resultado, refetch } = useQuery({
    queryKey: ["auditoria-email"],
    queryFn: async () => {
      const response = await base44.functions.invoke('limparConfigsDuplicadas', {});
      return response.data;
    },
    enabled: user?.role === 'admin',
    refetchOnMount: false
  });

  if (user?.role !== 'admin') {
    return <div className="p-6">Acesso negado - SuperAdmin only</div>;
  }

  const executarLimpeza = async () => {
    if (!confirm('Confirma limpeza de configs duplicadas? Apenas a config mais antiga ATIVA será mantida por alias.')) {
      return;
    }
    
    try {
      await refetch();
      toast.success("Limpeza executada");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria Multi-Tenant Email"
        description="Verificar vazamentos de email entre clínicas"
        breadcrumbs={[
          { label: "SuperAdmin", url: "/SuperAdmin" },
          { label: "Auditoria Email" }
        ]}
        action={
          <Button onClick={executarLimpeza} variant="danger">
            <Trash2 className="w-4 h-4 mr-2" />
            Executar Limpeza
          </Button>
        }
      />

      {!resultado ? (
        <div className="bg-white rounded-2xl p-8 text-center" style={{ border: '1px solid #e8eaed' }}>
          <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: '#9aa0a6' }} />
          <p className="text-sm" style={{ color: '#5f6368' }}>
            Clique em "Executar Limpeza" para auditar
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status */}
          <div className={`p-6 rounded-2xl border ${resultado.duplicatas.length === 0 ? 'bg-green-50' : 'bg-red-50'}`} style={{
            borderColor: resultado.duplicatas.length === 0 ? '#b8e7ca' : '#f9b8b6'
          }}>
            <div className="flex items-center gap-3 mb-2">
              {resultado.duplicatas.length === 0 ? (
                <CheckCircle className="w-6 h-6" style={{ color: '#34a853' }} />
              ) : (
                <AlertCircle className="w-6 h-6" style={{ color: '#ea4335' }} />
              )}
              <h3 className="font-bold text-lg" style={{ 
                color: resultado.duplicatas.length === 0 ? '#137333' : '#c5221f' 
              }}>
                {resultado.duplicatas.length === 0 ? 'Nenhum vazamento detectado' : `${resultado.duplicatas.length} alias duplicado(s) encontrado(s)`}
              </h3>
            </div>
            {resultado.total_deletados > 0 && (
              <p className="text-sm" style={{ color: '#5f6368' }}>
                {resultado.total_deletados} config(s) duplicada(s) foram removidas
              </p>
            )}
          </div>

          {/* Duplicatas */}
          {resultado.duplicatas.length > 0 && (
            <div className="space-y-3">
              {resultado.duplicatas.map((dup, idx) => (
                <div key={idx} className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="w-5 h-5" style={{ color: '#ea4335' }} />
                    <h4 className="font-semibold" style={{ color: '#202124' }}>{dup.alias}</h4>
                  </div>
                  <div className="space-y-2">
                    {dup.configs.map(config => (
                      <div key={config.id} className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#f8f9fa' }}>
                        <Building2 className="w-4 h-4" style={{ color: '#5f6368' }} />
                        <span className="text-sm flex-1" style={{ color: '#202124' }}>
                          Clínica: {config.clinica_id}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs`} style={{
                          backgroundColor: config.ativo ? '#e6f7ed' : '#f1f3f4',
                          color: config.ativo ? '#34a853' : '#5f6368'
                        }}>
                          {config.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ações executadas */}
          {resultado.acoes && resultado.acoes.length > 0 && (
            <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
              <h4 className="font-semibold mb-3" style={{ color: '#202124' }}>Ações Executadas</h4>
              <div className="space-y-1 font-mono text-xs" style={{ color: '#5f6368' }}>
                {resultado.acoes.map((acao, idx) => (
                  <div key={idx}>{acao}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}