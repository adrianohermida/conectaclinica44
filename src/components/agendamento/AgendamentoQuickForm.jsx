import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Search } from "lucide-react";
import { toast } from "sonner";

export default function AgendamentoQuickForm({ 
  pacientes = [], 
  medicos = [], 
  dataHoraSelecionada, 
  onSubmit, 
  onCancel,
  isSubmitting,
  pacientePreSelecionado = null
}) {
  const [form, setForm] = useState({
    paciente_id: pacientePreSelecionado?.id || "",
    paciente_nome: pacientePreSelecionado?.nome_completo || "",
    data: dataHoraSelecionada?.data || "",
    horario: dataHoraSelecionada?.horario || "",
    tipo_consulta: "presencial",
    especialidade: "clinica_geral",
    medico: "",
    medico_id: "",
    medico_crm: "",
    tratamento: "",
    observacoes: ""
  });

  const [showNovoPaciente, setShowNovoPaciente] = useState(false);
  const [novoPaciente, setNovoPaciente] = useState({
    nome_completo: "",
    email: "",
    telefone: ""
  });
  const [buscaPaciente, setBuscaPaciente] = useState("");

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const pacientesOrdenados = [...pacientes].sort((a, b) => 
    a.nome_completo.localeCompare(b.nome_completo)
  );

  const pacientesFiltrados = buscaPaciente
    ? pacientesOrdenados.filter(p =>
        p.nome_completo.toLowerCase().includes(buscaPaciente.toLowerCase()) ||
        p.cpf?.includes(buscaPaciente) ||
        p.telefone?.includes(buscaPaciente)
      )
    : pacientesOrdenados;

  const handleCriarPacienteInline = async () => {
    if (!novoPaciente.nome_completo || !novoPaciente.email || !novoPaciente.telefone) {
      toast.error("Preencha todos os campos do paciente");
      return;
    }

    try {
      const response = await base44.functions.invoke('criarContato', {
        ...novoPaciente,
        tipo_contato: 'paciente',
        clinica_id: user.clinica_id
      });

      const pacienteCriado = response.data;
      
      setForm({
        ...form,
        paciente_id: pacienteCriado.id,
        paciente_nome: pacienteCriado.nome_completo
      });
      
      setShowNovoPaciente(false);
      setNovoPaciente({ nome_completo: "", email: "", telefone: "" });
      toast.success("Paciente criado!");
    } catch (error) {
      toast.error("Erro ao criar paciente: " + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="pc-heading-4">Agendar Consulta</h2>
      
      {/* Seletor de Paciente */}
      <div>
        <label className="block text-sm font-medium mb-2">Paciente *</label>
        
        {!showNovoPaciente && !form.paciente_id && (
          <>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar paciente..."
                value={buscaPaciente}
                onChange={(e) => setBuscaPaciente(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="border rounded-lg max-h-48 overflow-y-auto mb-2">
              {pacientesFiltrados.length === 0 ? (
                <p className="p-3 text-sm text-gray-500 text-center">Nenhum paciente encontrado</p>
              ) : (
                pacientesFiltrados.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setForm({
                        ...form,
                        paciente_id: p.id,
                        paciente_nome: p.nome_completo
                      });
                      setBuscaPaciente("");
                    }}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-0"
                  >
                    <p className="font-medium text-sm">{p.nome_completo}</p>
                    {p.cpf && <p className="text-xs text-gray-500">CPF: {p.cpf}</p>}
                  </button>
                ))
              )}
            </div>

            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowNovoPaciente(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Novo Paciente
            </Button>
          </>
        )}

        {form.paciente_id && !showNovoPaciente && (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
            <span className="text-sm font-medium text-green-800">✓ {form.paciente_nome}</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, paciente_id: "", paciente_nome: "" })}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showNovoPaciente && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm">Cadastro Rápido</h3>
              <button
                type="button"
                onClick={() => setShowNovoPaciente(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <Input
              placeholder="Nome Completo *"
              value={novoPaciente.nome_completo}
              onChange={(e) => setNovoPaciente({ ...novoPaciente, nome_completo: e.target.value })}
            />
            <Input
              placeholder="Email *"
              type="email"
              value={novoPaciente.email}
              onChange={(e) => setNovoPaciente({ ...novoPaciente, email: e.target.value })}
            />
            <Input
              placeholder="Celular *"
              value={novoPaciente.telefone}
              onChange={(e) => setNovoPaciente({ ...novoPaciente, telefone: e.target.value })}
            />
            
            <Button 
              type="button" 
              onClick={handleCriarPacienteInline}
              className="w-full"
            >
              Salvar e Continuar
            </Button>
          </div>
        )}
      </div>
      
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
          <SelectValue placeholder="Selecione o Médico *" />
        </SelectTrigger>
        <SelectContent>
          {medicos.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo)).map(m => (
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
          onClick={() => onSubmit(form)} 
          disabled={!form.data || !form.horario || !form.medico_id || !form.paciente_id || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? "Agendando..." : "Confirmar Agendamento"}
        </Button>
      </div>
    </div>
  );
}