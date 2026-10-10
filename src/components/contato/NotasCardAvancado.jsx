import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Plus, Archive, Search, Trash2, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";

export default function NotasCardAvancado({ contato }) {
  const queryClient = useQueryClient();
  const [novaNota, setNovaNota] = useState("");
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const [busca, setBusca] = useState("");

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: notas = [] } = useQuery({
    queryKey: ["notas-paciente", contato.id, mostrarArquivadas],
    queryFn: async () => {
      const filtro = { 
        clinica_id: user.clinica_id, 
        contato_id: contato.id,
        ...(mostrarArquivadas ? {} : { status: 'ativa' })
      };
      return await base44.entities.NotaPaciente.filter(filtro, '-created_date');
    },
    enabled: !!user?.clinica_id && !!contato.id
  });

  const criarNotaMutation = useMutation({
    mutationFn: async (conteudo) => {
      if (!user?.clinica_id || !user?.id) {
        throw new Error('Usuário não autenticado');
      }
      return await base44.entities.NotaPaciente.create({
        clinica_id: user.clinica_id,
        contato_id: contato.id,
        conteudo,
        criado_por: user.id,
        criado_por_nome: user.full_name,
        status: 'ativa'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["notas-paciente"]);
      setNovaNota("");
      toast.success("Nota adicionada");
    }
  });

  const arquivarNotaMutation = useMutation({
    mutationFn: (id) => base44.entities.NotaPaciente.update(id, { status: 'arquivada' }),
    onSuccess: () => {
      queryClient.invalidateQueries(["notas-paciente"]);
      toast.success("Nota arquivada");
    }
  });

  const excluirNotaMutation = useMutation({
    mutationFn: (id) => base44.entities.NotaPaciente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["notas-paciente"]);
      toast.success("Nota excluída");
    }
  });

  const notasFiltradas = notas.filter(n => 
    !busca || n.conteudo?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold flex items-center gap-2 uppercase" style={{ color: '#80868b', letterSpacing: '0.5px' }}>
          <FileText className="w-3.5 h-3.5" />
          Notas ({notas.filter(n => n.status === 'ativa').length})
        </h3>
        <button
          onClick={() => setMostrarArquivadas(!mostrarArquivadas)}
          className="text-xs font-medium hover:underline"
          style={{ color: '#7E57FF' }}
        >
          {mostrarArquivadas ? 'Ocultar arquivadas' : 'Ver arquivadas'}
        </button>
      </div>

      {/* Nova Nota */}
      <div className="mb-3 space-y-2">
        <textarea
          value={novaNota}
          onChange={(e) => setNovaNota(e.target.value)}
          placeholder="Adicionar nova nota..."
          className="w-full text-sm border rounded-lg p-3 resize-none focus:outline-none focus:border-[#7E57FF] transition-colors"
          style={{ borderColor: '#e8eaed', fontSize: '16px' }}
          rows={2}
        />
        {novaNota.trim() && (
          <Button 
            size="sm" 
            onClick={() => criarNotaMutation.mutate(novaNota)}
            disabled={criarNotaMutation.isPending}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Nota
          </Button>
        )}
      </div>

      {/* Busca */}
      {notas.length > 3 && (
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar notas..."
              className="pl-10 h-9 text-sm rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Lista de Notas */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {notasFiltradas.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: '#80868b' }}>
            Nenhuma nota {mostrarArquivadas ? 'arquivada' : 'registrada'}
          </p>
        ) : (
          notasFiltradas.map(nota => (
            <div 
              key={nota.id} 
              className={`p-3 rounded-lg border ${nota.status === 'arquivada' ? 'opacity-60' : ''}`}
              style={{ 
                borderColor: '#e8eaed',
                backgroundColor: nota.status === 'arquivada' ? '#f8f9fa' : '#ffffff'
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: '#5f6368' }}>
                    {nota.criado_por_nome}
                  </p>
                  <p className="text-[10px]" style={{ color: '#9aa0a6' }}>
                    {format(new Date(nota.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {nota.status === 'ativa' && (
                    <button
                      onClick={() => arquivarNotaMutation.mutate(nota.id)}
                      className="p-1 hover:bg-gray-100 rounded transition-all"
                      title="Arquivar"
                    >
                      <Archive className="w-3.5 h-3.5" style={{ color: '#5f6368' }} />
                    </button>
                  )}
                  {(user?.role === 'admin' || nota.criado_por === user?.id) && (
                    <button
                      onClick={() => {
                        if (confirm('Excluir esta nota?')) {
                          excluirNotaMutation.mutate(nota.id);
                        }
                      }}
                      className="p-1 hover:bg-red-100 rounded transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: '#ea4335' }} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: '#202124' }}>
                {nota.conteudo}
              </p>
              {nota.status === 'arquivada' && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: '#f1f3f4', color: '#5f6368' }}>
                  Arquivada
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}