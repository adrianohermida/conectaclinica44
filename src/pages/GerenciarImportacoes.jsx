import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import RouteGuard from "@/components/auth/RouteGuard";
import { CheckCircle, Clock, AlertCircle, Loader2, Building2 } from "lucide-react";
import { format } from "date-fns";

export default function GerenciarImportacoes() {
  const { data: jobs = [] } = useQuery({
    queryKey: ["importacao-jobs-all"],
    queryFn: () => base44.asServiceRole.entities.ImportacaoJob.list('-created_date', 200),
    staleTime: 30000,
    refetchInterval: 5000
  });

  const statusConfig = {
    'pendente': { icon: Clock, color: 'yellow', label: 'Aguardando' },
    'processando': { icon: Loader2, color: 'blue', label: 'Processando', spin: true },
    'concluido': { icon: CheckCircle, color: 'green', label: 'Concluído' },
    'erro': { icon: AlertCircle, color: 'red', label: 'Erro' }
  };

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="Importações (SuperAdmin)"
          description="Gerenciar jobs de importação em background"
          breadcrumbs={[{label:"SuperAdmin"},{label:"Importações"}]}
        />

        <Card>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Job ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Clínica</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tipo</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Progresso</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Sucesso</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Erros</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => {
                    const config = statusConfig[job.status];
                    const Icon = config.icon;
                    const progresso = job.total_registros > 0 ? (job.processados / job.total_registros * 100).toFixed(0) : 0;

                    return (
                      <tr key={job.id} className="border-b hover:bg-gray-50">
                        <td className="py-4 px-4 text-xs font-mono">{job.id.slice(0,8)}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-purple-600" />
                            <span className="text-sm">{job.clinica_id.slice(0,8)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm font-medium">{job.tipo_entidade}</td>
                        <td className="text-center py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold bg-${config.color}-100 text-${config.color}-700 inline-flex items-center gap-1`}>
                            <Icon className={`w-3 h-3 ${config.spin?'animate-spin':''}`} />
                            {config.label}
                          </span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div className="bg-purple-600 h-2 rounded-full" style={{width:`${progresso}%`}} />
                            </div>
                            <span className="text-xs font-bold">{progresso}%</span>
                          </div>
                        </td>
                        <td className="text-center py-4 px-4 font-bold text-green-600">{job.sucesso}</td>
                        <td className="text-center py-4 px-4 font-bold text-red-600">{job.erros}</td>
                        <td className="py-4 px-4 text-xs text-gray-600">
                          {format(new Date(job.created_date), "dd/MM HH:mm")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </RouteGuard>
  );
}