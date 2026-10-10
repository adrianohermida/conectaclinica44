import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Clock, 
  Plus, 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Video,
  User,
  Trash2,
  Edit,
  Search
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UltimoAtendimentoCard({ contatoId, ultimoProntuario, isMobile }) {
  const queryClient = useQueryClient();
  const [showRegistrarInteracao, setShowRegistrarInteracao] = useState(false);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({
    tipo_interacao: "ligacao",
    descricao: "",
    duracao_minutos: "",
    data_interacao: new Date().toISOString().slice(0, 16)
  });

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: interacoes = [] } = useQuery({
    queryKey: ["interacoes", contatoId],
    queryFn: async () => {
      return await base44.entities.InteracaoPaciente.filter(
        { clinica_id: user.clinica_id, contato_id: contatoId },
        '-data_interacao',
        10
      );
    },
    enabled: !!user?.clinica_id && !!contatoId
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets-contato", contatoId],
    queryFn: async () => {
      const todosTickets = await base44.entities.Ticket.filter(
        { clinica_id: user.clinica_id },
        '-created_date',
        50
      );
      const contatoCompleto = await base44.entities.Contato.filter({ id: contatoId });
      const contato = contatoCompleto[0];
      
      return todosTickets.filter(t => 
        t.solicitante_email === contato?.emails?.find(e => e.principal)?.email ||
        t.solicitante_email === contato?.emails?.[0]?.email ||
        t.solicitante_email === contato?.email
      );
    },
    enabled: !!user?.clinica_id && !!contatoId,
    staleTime: 5 * 60 * 1000
  });

  const registrarMutation = useMutation({
    mutationFn: async (data) => {
      if (!user?.clinica_id || !user?.id) {
        throw new Error('Usuário não autenticado');
      }
      return await base44.entities.InteracaoPaciente.create({
        clinica_id: user.clinica_id,
        contato_id: contatoId,
        tipo_interacao: data.tipo_interacao,
        descricao: data.descricao,
        duracao_minutos: data.duracao_minutos ? parseInt(data.duracao_minutos) : null,
        data_interacao: data.data_interacao || new Date().toISOString(),
        registrado_por: user.id,
        registrado_por_nome: user.full_name,
        status: 'ativo'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["interacoes"]);
      setShowRegistrarInteracao(false);
      setForm({
        tipo_interacao: "ligacao",
        descricao: "",
        duracao_minutos: "",
        data_interacao: new Date().toISOString().slice(0, 16)
      });
      toast.success("Interação registrada");
    }
  });

  const excluirInteracaoMutation = useMutation({
    mutationFn: async (id) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }
      
      const interacao = interacoes.find(i => i.id === id);
      
      // Admin pode excluir direto
      if (user.role === 'admin') {
        return await base44.entities.InteracaoPaciente.delete(id);
      }
      
      // Criador pode solicitar exclusão
      if (interacao?.registrado_por === user.id) {
        await base44.entities.InteracaoPaciente.update(id, {
          status: 'pendente_exclusao',
          solicitacao_exclusao: {
            solicitante_id: user.id,
            solicitante_nome: user.full_name,
            data_solicitacao: new Date().toISOString(),
            motivo: 'Solicitação do usuário'
          }
        });
        
        // Criar notificação para admin
        const admins = await base44.entities.User.filter({ 
          clinica_id: user.clinica_id, 
          role: 'admin' 
        });
        
        for (const admin of admins) {
          await base44.entities.Notificacao.create({
            clinica_id: user.clinica_id,
            user_id: admin.id,
            tipo: 'atribuicao_ticket',
            titulo: '🗑️ Solicitação de exclusão',
            mensagem: `${user.full_name} solicitou exclusão de interação`,
            link: `/PacienteDetalhes?id=${contatoId}`,
            prioridade: 'baixa'
          });
        }
        
        toast.success("Solicitação enviada ao admin");
        return;
      }
      
      throw new Error('Sem permissão');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["interacoes"]);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const iconMap = {
    email: Mail,
    ticket: MessageSquare,
    ligacao: Phone,
    whatsapp: MessageSquare,
    presencial: User,
    videoconferencia: Video,
    portal: MessageSquare,
    outro: Clock
  };

  const todasInteracoes = [
    ...interacoes.map(i => ({ ...i, _tipo: 'interacao' })),
    ...tickets.map(t => ({ 
      id: t.id, 
      tipo_interacao: 'ticket', 
      descricao: t.assunto,
      data_interacao: t.created_date,
      registrado_por_nome: 'Sistema',
      _tipo: 'ticket'
    })),
    ...(ultimoProntuario ? [{
      id: ultimoProntuario.id,
      tipo_interacao: 'presencial',
      descricao: ultimoProntuario.queixa_principal,
      data_interacao: ultimoProntuario.data_atendimento,
      registrado_por_nome: ultimoProntuario.medico_nome,
      _tipo: 'prontuario'
    }] : [])
  ].sort((a, b) => new Date(b.data_interacao) - new Date(a.data_interacao));

  const buscaFiltrada = todasInteracoes.filter(i => 
    !busca || i.descricao?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold flex items-center gap-2 uppercase" style={{ color: '#80868b', letterSpacing: '0.5px' }}>
          <Clock className="w-3.5 h-3.5" />
          Histórico de Atendimentos
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowRegistrarInteracao(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Registrar
        </Button>
      </div>

      {todasInteracoes.length > 3 && (
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar interações..."
              className="pl-10 h-9 text-sm"
            />
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {buscaFiltrada.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: '#80868b' }}>
            Nenhuma interação registrada
          </p>
        ) : (
          buscaFiltrada.slice(0, 10).map(interacao => {
            const Icon = iconMap[interacao.tipo_interacao] || Clock;
            return (
              <div key={`${interacao._tipo}-${interacao.id}`} className="p-3 rounded-lg border" style={{ borderColor: '#e8eaed' }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: '#7E57FF' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#202124' }}>
                        {interacao.tipo_interacao}
                      </p>
                      <p className="text-[10px]" style={{ color: '#9aa0a6' }}>
                        {format(new Date(interacao.data_interacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  {interacao._tipo === 'interacao' && interacao.status !== 'arquivada' && (
                    <button
                      onClick={() => {
                        if (confirm('Excluir ou solicitar exclusão?')) {
                          excluirInteracaoMutation.mutate(interacao.id);
                        }
                      }}
                      className="p-1 hover:bg-red-100 rounded transition-all"
                      title={user?.role === 'admin' ? 'Excluir' : 'Solicitar exclusão'}
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: '#ea4335' }} />
                    </button>
                  )}
                </div>
                <p className="text-xs mb-1" style={{ color: '#5f6368' }}>
                  {interacao.descricao}
                </p>
                <div className="flex items-center justify-between text-[10px]" style={{ color: '#9aa0a6' }}>
                  <span>por {interacao.registrado_por_nome}</span>
                  {interacao.duracao_minutos && <span>{interacao.duracao_minutos} min</span>}
                </div>
                {interacao.status === 'pendente_exclusao' && (
                  <div className="mt-2 px-2 py-1 rounded text-[10px] font-medium" style={{ backgroundColor: '#fef9e5', color: '#956802' }}>
                    ⏳ Aguardando aprovação do admin
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Registrar Interação */}
      <SlideInPanel
        open={showRegistrarInteracao}
        onClose={() => setShowRegistrarInteracao(false)}
        title="Registrar Atendimento"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          registrarMutation.mutate(form);
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Tipo de Atendimento *</label>
            <Select value={form.tipo_interacao} onValueChange={(v) => setForm({ ...form, tipo_interacao: v })}>
              <SelectTrigger className="rounded-xl min-h-[48px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ zIndex: 999999 }}>
                <SelectItem value="ligacao">📞 Ligação</SelectItem>
                <SelectItem value="email">📧 Email</SelectItem>
                <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                <SelectItem value="presencial">👤 Presencial</SelectItem>
                <SelectItem value="videoconferencia">📹 Videoconferência</SelectItem>
                <SelectItem value="portal">🌐 Portal</SelectItem>
                <SelectItem value="outro">📋 Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Data/Hora *</label>
            <Input
              type="datetime-local"
              value={form.data_interacao}
              onChange={(e) => setForm({ ...form, data_interacao: e.target.value })}
              className="rounded-xl min-h-[48px]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Duração (minutos)</label>
            <Input
              type="number"
              value={form.duracao_minutos}
              onChange={(e) => setForm({ ...form, duracao_minutos: e.target.value })}
              placeholder="Ex: 15"
              className="rounded-xl min-h-[48px]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Descrição *</label>
            <Textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Descreva o atendimento..."
              required
              className="rounded-xl resize-none"
              rows={6}
            />
          </div>

          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={() => setShowRegistrarInteracao(false)} 
              className="flex-1 min-h-[48px] rounded-xl font-medium transition-all border"
              style={{ borderColor: '#e8eaed', color: '#5f6368' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={registrarMutation.isPending}
              className="flex-1 min-h-[48px] rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
              style={{ backgroundColor: '#7E57FF', color: 'white' }}
            >
              {registrarMutation.isPending ? "⏳ Salvando..." : "💾 Salvar"}
            </button>
          </div>
        </form>
      </SlideInPanel>
    </div>
  );
}