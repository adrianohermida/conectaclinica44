import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, GitMerge, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";

export default function DetectorDuplicatas({ clinicaId, onMergeSuccess }) {
  const [selectedGroups, setSelectedGroups] = useState({});
  const queryClient = useQueryClient();

  const { data: duplicatasData, isLoading } = useQuery({
    queryKey: ['duplicatas-tickets', clinicaId],
    queryFn: async () => {
      const response = await base44.functions.invoke('detectarTicketsDuplicados', { clinica_id: clinicaId });
      return response.data;
    },
    enabled: !!clinicaId
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ ticket_master_id, tickets_duplicados_ids, motivo }) => {
      const response = await base44.functions.invoke('mergeTickets', {
        ticket_master_id,
        tickets_duplicados_ids,
        motivo
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.tickets_merged} ticket(s) mesclado(s)`);
      queryClient.invalidateQueries(['duplicatas-tickets']);
      queryClient.invalidateQueries(['tickets']);
      setSelectedGroups({});
      if (onMergeSuccess) onMergeSuccess();
    },
    onError: (error) => {
      toast.error(`Erro ao mesclar: ${error.message}`);
    }
  });

  const handleMerge = (grupo) => {
    if (!confirm(`Mesclar ${grupo.tickets.length} tickets duplicados?\n\nTodo o histórico será preservado no ticket master.`)) {
      return;
    }

    const [master, ...duplicados] = grupo.tickets;
    mergeMutation.mutate({
      ticket_master_id: master.id,
      tickets_duplicados_ids: duplicados.map(t => t.id),
      motivo: 'Duplicata detectada automaticamente'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-600">Detectando duplicatas...</p>
        </div>
      </div>
    );
  }

  const grupos = duplicatasData?.grupos || [];

  if (grupos.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600 opacity-50" />
        <p className="text-gray-600 font-medium">Nenhuma duplicata detectada</p>
        <p className="text-sm text-gray-500 mt-1">Todos os tickets estão únicos</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Duplicatas Detectadas</h3>
          <p className="text-sm text-gray-600">{grupos.length} grupo(s) encontrado(s)</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-yellow-50 border border-yellow-200">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span className="text-xs font-semibold text-yellow-800">
            {grupos.reduce((acc, g) => acc + g.tickets.length, 0)} tickets duplicados
          </span>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800">
            <p className="font-semibold mb-1">🔍 Como funciona a detecção</p>
            <ul className="space-y-0.5 ml-4 list-disc">
              <li>Mesmo email/telefone do solicitante</li>
              <li>Assunto similar (&gt;60% match)</li>
              <li>Criados em até 24h de intervalo</li>
            </ul>
            <p className="mt-2"><strong>Merge:</strong> Todas mensagens e notas são preservadas no ticket master.</p>
          </div>
        </div>
      </div>

      {/* Grupos de duplicatas */}
      <div className="space-y-4">
        {grupos.map(grupo => (
          <div key={grupo.grupo_id} className="border rounded-lg p-4 bg-white shadow-sm" style={{ borderColor: '#e8eaed' }}>
            {/* Confiança */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-900">{grupo.tickets.length} tickets similares</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                grupo.confianca >= 0.9 ? 'bg-red-100 text-red-800' :
                grupo.confianca >= 0.7 ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                {Math.round(grupo.confianca * 100)}% match
              </div>
            </div>

            {/* Lista de tickets */}
            <div className="space-y-2 mb-3">
              {grupo.tickets.map((ticket, idx) => (
                <div 
                  key={ticket.id} 
                  className={`p-3 rounded-lg border ${idx === 0 ? 'bg-purple-50 border-purple-200' : 'bg-gray-50'}`}
                  style={idx === 0 ? {} : { borderColor: '#e8eaed' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          idx === 0 ? 'bg-purple-600 text-white' : 'bg-gray-400 text-white'
                        }`}>
                          {idx === 0 ? 'MASTER' : `DUP ${idx}`}
                        </span>
                        <code className="text-xs font-mono text-gray-600">{ticket.numero_ticket}</code>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          ticket.canal === 'email' ? 'bg-blue-100 text-blue-800' :
                          ticket.canal === 'whatsapp' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {ticket.canal}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">{ticket.assunto}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>{ticket.solicitante_nome}</span>
                        <span>•</span>
                        <span>{ticket.solicitante_email}</span>
                        <span>•</span>
                        <span>{new Date(ticket.created_date).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ação de Merge */}
            <div className="flex justify-end">
              <Button
                onClick={() => handleMerge(grupo)}
                disabled={mergeMutation.isPending}
                icon={<GitMerge className="w-4 h-4" />}
                variant="primary"
              >
                {mergeMutation.isPending ? 'Mesclando...' : 'Mesclar Tickets'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}