import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Search } from "lucide-react";
import { toast } from "sonner";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function ProntuarioForm({ 
  pacientes = [], 
  medicos = [],
  pacientePreSelecionado = null,
  onSubmit, 
  onCancel,
  isSubmitting,
  editingProntuario = null
}) {
  const [form, setForm] = useState({
    paciente_id: pacientePreSelecionado?.id || editingProntuario?.paciente_id || "",
    paciente_nome: pacientePreSelecionado?.nome_completo || editingProntuario?.paciente_nome || "",
    medico_id: editingProntuario?.medico_id || "",
    medico_nome: editingProntuario?.medico_nome || "",
    medico_crm: editingProntuario?.medico_crm || "",
    data_atendimento: editingProntuario?.data_atendimento || new Date().toISOString().split('T')[0],
    hora_atendimento: editingProntuario?.hora_atendimento || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    tipo_atendimento: editingProntuario?.tipo_atendimento || "consulta",
    queixa_principal: editingProntuario?.queixa_principal || "",
    historia_doenca_atual: editingProntuario?.historia_doenca_atual || "",
    hipotese_diagnostica: editingProntuario?.hipotese_diagnostica || "",
    conduta: editingProntuario?.conduta || "",
    status_prontuario: editingProntuario?.status_prontuario || "rascunho"
  });

  const [showNovoPaciente, setShowNovoPaciente] = useState(false);
  const [novoPaciente, setNovoPaciente] = useState({
    nome_completo: "",
    email: "",
    telefone: ""
  });
  const [buscaPaciente, setBuscaPaciente] = useState("");
  const [buscaMedico, setBuscaMedico] = useState("");

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const pacientesOrdenados = [...pacientes].sort((a, b) => 
    a.nome_completo.localeCompare(b.nome_completo)
  );

  const medicosOrdenados = [...medicos].sort((a, b) => 
    a.nome_completo.localeCompare(b.nome_completo)
  );

  const pacientesFiltrados = buscaPaciente
    ? pacientesOrdenados.filter(p =>
        p.nome_completo.toLowerCase().includes(buscaPaciente.toLowerCase()) ||
        p.cpf?.includes(buscaPaciente)
      )
    : pacientesOrdenados;

  const medicosFiltrados = buscaMedico
    ? medicosOrdenados.filter(m =>
        m.nome_completo.toLowerCase().includes(buscaMedico.toLowerCase()) ||
        m.crm?.includes(buscaMedico)
      )
    : medicosOrdenados;

  const handleCriarPacienteInline = async () => {
    if (!novoPaciente.nome_completo || !novoPaciente.email || !novoPaciente.telefone) {
      toast.error("Preencha todos os campos");
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
      toast.error("Erro: " + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="pc-heading-4">Novo Prontuário</h2>
      
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

      {/* Seletor de Médico */}
      <div>
        <label className="block text-sm font-medium mb-2">Médico *</label>
        
        {!form.medico_id && (
          <>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar médico..."
                value={buscaMedico}
                onChange={(e) => setBuscaMedico(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {medicosFiltrados.length === 0 ? (
                <p className="p-3 text-sm text-gray-500 text-center">Nenhum médico encontrado</p>
              ) : (
                medicosFiltrados.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      const crmPrincipal = m.crms?.[0];
                      setForm({
                        ...form,
                        medico_id: m.id,
                        medico_nome: m.nome_completo,
                        medico_crm: crmPrincipal ? `${crmPrincipal.numero}/${crmPrincipal.estado}` : ""
                      });
                      setBuscaMedico("");
                    }}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-0"
                  >
                    <p className="font-medium text-sm">Dr(a). {m.nome_completo}</p>
                    {m.crms?.[0] && (
                      <p className="text-xs text-gray-500">CRM {m.crms[0].numero}/{m.crms[0].estado}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {form.medico_id && (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
            <div>
              <p className="text-sm font-medium text-green-800">Dr(a). {form.medico_nome}</p>
              {form.medico_crm && <p className="text-xs text-green-600">CRM {form.medico_crm}</p>}
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, medico_id: "", medico_nome: "", medico_crm: "" })}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
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

      <Select value={form.tipo_atendimento} onValueChange={v => setForm({...form, tipo_atendimento: v})}>
        <SelectTrigger>
          <SelectValue placeholder="Tipo de Atendimento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="consulta">Consulta</SelectItem>
          <SelectItem value="retorno">Retorno</SelectItem>
          <SelectItem value="procedimento">Procedimento</SelectItem>
          <SelectItem value="exame">Exame</SelectItem>
          <SelectItem value="teleconsulta">Teleconsulta</SelectItem>
        </SelectContent>
      </Select>

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

      <Input 
        placeholder="Hipótese Diagnóstica" 
        value={form.hipotese_diagnostica}
        onChange={e => setForm({...form, hipotese_diagnostica: e.target.value})}
      />

      <textarea
        placeholder="Conduta"
        value={form.conduta}
        onChange={e => setForm({...form, conduta: e.target.value})}
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
          onClick={() => onSubmit(form)} 
          disabled={!form.queixa_principal || !form.medico_nome || !form.paciente_id || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? "Salvando..." : editingProntuario ? "Atualizar" : "Criar Prontuário"}
        </Button>
      </div>
    </div>
  );
}