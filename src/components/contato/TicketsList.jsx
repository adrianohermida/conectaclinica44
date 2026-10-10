import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2 
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function TicketsList({ contatoId, contato }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ assunto: "", descricao: "" });

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", contatoId],
    queryFn: async () => {
      // Buscar todos tickets da clínica
      const todosTickets = await base44.entities.Ticket.filter({ 
        clinica_id: user.clinica_id 
      }, "-created_date");
      
      // Filtrar por email do contato (suporta emails[] array)
      const emailPrincipal = contato?.emails?.find(e => e.principal)?.email || 
                            contato?.emails?.[0]?.email || 
                            contato?.email;
      
      return todosTickets.filter(t => 
        t.contato_id === contatoId ||
        t.solicitante_email === emailPrincipal
      );
    },
    enabled: !!contatoId && !!user?.clinica_id,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const emailPrincipal = contato?.emails?.find(e => e.principal)?.email || 
                            contato?.emails?.[0]?.email || 
                            contato?.email;
      
      return base44.entities.Ticket.create({
        ...data,
        clinica_id: user.clinica_id,
        solicitante_email: emailPrincipal
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["tickets"]);
      queryClient.invalidateQueries(["tickets", contatoId]);
      setShowForm(false);
      setFormData({ assunto: "", descricao: "" });
      toast.success("Ticket criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar ticket:", error);
      toast.error("Erro ao criar ticket. Tente novamente.");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const emailPrincipal = contato?.emails?.find(e => e.principal)?.email || 
                          contato?.emails?.[0]?.email || 
                          contato?.email;
    
    createMutation.mutate({
      contato_id: contatoId,
      solicitante_nome: contato.nome_completo,
      solicitante_email: emailPrincipal,
      assunto: formData.assunto,
      descricao: formData.descricao,
      status: "aberto",
      prioridade: "media",
      canal: "interno" // CRÍTICO: Campo obrigatório
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      aberto: "bg-blue-100 text-blue-700",
      em_andamento: "bg-yellow-100 text-yellow-700",
      resolvido: "bg-green-100 text-green-700",
      fechado: "bg-gray-100 text-gray-600"
    };
    return styles[status] || styles.aberto;
  };

  const getStatusIcon = (status) => {
    const icons = {
      aberto: <Clock className="w-4 h-4" />,
      em_andamento: <AlertCircle className="w-4 h-4" />,
      resolvido: <CheckCircle2 className="w-4 h-4" />,
      fechado: <CheckCircle2 className="w-4 h-4" />
    };
    return icons[status] || icons.aberto;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--pc-primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="pc-heading-4">
          Tickets de Atendimento
        </h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Ticket
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="pc-card p-4 space-y-3">
          <Input
            placeholder="Assunto *"
            value={formData.assunto}
            onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
            required
          />
          <Textarea
            placeholder="Descrição do problema *"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            rows={4}
            required
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="flex-1">
              {createMutation.isPending ? "Criando..." : "Criar Ticket"}
            </Button>
          </div>
        </form>
      )}

      {tickets.length === 0 ? (
        <div className="pc-card p-12 text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-3" style={{ color: 'var(--pc-gray-400)' }} />
          <p className="pc-body-sm">Nenhum ticket registrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="pc-card p-4 hover:shadow-md pc-transition cursor-pointer">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="pc-body font-bold truncate mb-1">
                    {ticket.assunto}
                  </h3>
                  <p className="pc-body-sm line-clamp-2 mb-2">
                    {ticket.descricao}
                  </p>
                </div>
                <span className={`pc-badge flex items-center gap-1 ${getStatusBadge(ticket.status)}`}>
                  {getStatusIcon(ticket.status)}
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-3 pc-caption">
                <span>#{ticket.numero_ticket || ticket.id.substring(0, 8)}</span>
                <span>•</span>
                <span>{format(new Date(ticket.created_date), "dd/MM/yyyy HH:mm")}</span>
                {ticket.prioridade && (
                  <>
                    <span>•</span>
                    <span className={`font-bold`} style={{ color: 
                      ticket.prioridade === 'alta' ? 'var(--pc-error)' : 
                      ticket.prioridade === 'media' ? 'var(--pc-warning)' : 'var(--pc-text-tertiary)'
                    }}>
                      {ticket.prioridade}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}