import React, { useState } from "react";
import { secureEntities } from "@/components/security/SecureEntityWrapper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ProntuarioQuickForm({ paciente, pacientePreSelecionado, onSuccess, onCancel }) {
  const pacienteUsado = pacientePreSelecionado || paciente;
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    paciente_id: pacienteUsado?.id,
    paciente_nome: pacienteUsado?.nome_completo,
    data_atendimento: new Date().toISOString().split('T')[0],
    hora_atendimento: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    medico_nome: "",
    medico_crm: "",
    tipo_atendimento: "consulta",
    queixa_principal: "",
    historia_doenca_atual: "",
    exame_fisico: {},
    hipotese_diagnostica: "",
    conduta: "",
    status_prontuario: "rascunho"
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // P0 FIX: criarProntuario (backend function) bloqueada no plano atual
      // Fallback: create direto via secureEntities (clinica_id injetado + isolamento tenant no client)
      return secureEntities.Prontuario.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["prontuarios"]);
      queryClient.invalidateQueries(["prontuarios-count"]);
      toast.success("Prontuário criado!");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    }
  });

  return (
    <div className="space-y-4">
      <h2 className="pc-heading-4">Novo Prontuário</h2>
      
      <div className="grid md:grid-cols-2 gap-3">
        <Input 
          placeholder="Nome do Médico" 
          value={form.medico_nome}
          onChange={e => setForm({...form, medico_nome: e.target.value})}
        />
        <Input 
          placeholder="CRM" 
          value={form.medico_crm}
          onChange={e => setForm({...form, medico_crm: e.target.value})}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Input 
          type="date"
          value={form.data_atendimento}
          onChange={e => setForm({...form, data_atendimento: e.target.value})}
        />
        <Input 
          type="time"
          value={form.hora_atendimento}
          onChange={e => setForm({...form, hora_atendimento: e.target.value})}
        />
      </div>

      <Input 
        placeholder="Queixa Principal *" 
        value={form.queixa_principal}
        onChange={e => setForm({...form, queixa_principal: e.target.value})}
      />

      <textarea
        placeholder="História da Doença Atual"
        value={form.historia_doenca_atual}
        onChange={e => setForm({...form, historia_doenca_atual: e.target.value})}
        className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-colors min-h-[100px]"
        style={{ 
          borderColor: 'var(--pc-border-primary)',
          color: 'var(--pc-text-primary)'
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--pc-border-focus)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--pc-border-primary)'}
      />

      <div className="flex gap-3 pt-4">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button 
          onClick={() => createMutation.mutate(form)} 
          disabled={!form.queixa_principal || !form.medico_nome || createMutation.isPending}
          className="flex-1"
        >
          {createMutation.isPending ? "Salvando..." : "Criar Prontuário"}
        </Button>
      </div>
    </div>
  );
}