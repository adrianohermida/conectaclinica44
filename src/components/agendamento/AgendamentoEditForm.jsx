import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AgendamentoEditForm({ agendamento, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    data: agendamento.data,
    horario: agendamento.horario,
    tipo_consulta: agendamento.tipo_consulta || "presencial",
    especialidade: agendamento.especialidade || "clinica_geral",
    medico: agendamento.medico || "",
    medico_id: agendamento.medico_id || "",
    medico_crm: agendamento.medico_crm || "",
    tratamento: agendamento.tratamento || "",
    observacoes: agendamento.observacoes || "",
    status: agendamento.status || "agendado",
    valor: agendamento.valor || ""
  });

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: medicos = [] } = useQuery({
    queryKey: ["medicos", user?.clinica_id],
    queryFn: () => base44.entities.Medico.filter({ clinica_id: user.clinica_id }),
    enabled: !!user?.clinica_id
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Agendamento.update(agendamento.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["agendamentos"]);
      toast.success("Agendamento atualizado!");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    }
  });

  return (
    <div className="space-y-4">
      <h2 className="pc-heading-4">Editar Agendamento</h2>
      
      <div className="grid md:grid-cols-2 gap-3">
        <Input 
          type="date"
          value={form.data}
          onChange={e => setForm({...form, data: e.target.value})}
          min={new Date().toISOString().split('T')[0]}
        />
        <Input 
          type="time"
          value={form.horario}
          onChange={e => setForm({...form, horario: e.target.value})}
        />
      </div>

      <Select value={form.tipo_consulta} onValueChange={v => setForm({...form, tipo_consulta: v})}>
        <SelectTrigger>
          <SelectValue placeholder="Tipo de Consulta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="presencial">Presencial</SelectItem>
          <SelectItem value="telemedicina">Telemedicina</SelectItem>
        </SelectContent>
      </Select>

      <Select value={form.especialidade} onValueChange={v => setForm({...form, especialidade: v})}>
        <SelectTrigger>
          <SelectValue placeholder="Especialidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="clinica_geral">Clínica Geral</SelectItem>
          <SelectItem value="medicina_integrativa">Medicina Integrativa</SelectItem>
          <SelectItem value="cirurgia_geral">Cirurgia Geral</SelectItem>
          <SelectItem value="medicina_preventiva">Medicina Preventiva</SelectItem>
          <SelectItem value="home_care">Home Care</SelectItem>
        </SelectContent>
      </Select>

      <Select value={form.medico_id} onValueChange={v => {
        const medicoSelecionado = medicos.find(m => m.id === v);
        setForm({
          ...form, 
          medico_id: v,
          medico: medicoSelecionado?.nome_completo || "",
          medico_crm: medicoSelecionado?.crms?.[0]?.numero || ""
        });
      }}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione o Médico" />
        </SelectTrigger>
        <SelectContent>
          {medicos.map(m => (
            <SelectItem key={m.id} value={m.id}>
              Dr(a). {m.nome_completo} {m.crms?.[0]?.numero ? `- CRM ${m.crms[0].numero}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input 
        placeholder="Tratamento/Procedimento" 
        value={form.tratamento}
        onChange={e => setForm({...form, tratamento: e.target.value})}
      />

      <Input 
        type="number"
        placeholder="Valor (R$)" 
        value={form.valor}
        onChange={e => setForm({...form, valor: parseFloat(e.target.value) || 0})}
      />

      <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="agendado">Agendado</SelectItem>
          <SelectItem value="confirmado">Confirmado</SelectItem>
          <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
          <SelectItem value="concluido">Concluído</SelectItem>
          <SelectItem value="cancelado">Cancelado</SelectItem>
        </SelectContent>
      </Select>

      <textarea
        placeholder="Observações"
        value={form.observacoes}
        onChange={e => setForm({...form, observacoes: e.target.value})}
        className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-colors min-h-[80px]"
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
          onClick={() => updateMutation.mutate(form)} 
          disabled={!form.data || !form.horario || updateMutation.isPending}
          className="flex-1"
        >
          {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}