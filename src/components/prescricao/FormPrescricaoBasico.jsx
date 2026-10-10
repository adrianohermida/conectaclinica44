import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function FormPrescricaoBasico({ 
  medico, 
  paciente, 
  prontuario,
  onSubmit, 
  onCancel,
  initialData = null 
}) {
  const [medicamentos, setMedicamentos] = useState(initialData?.medicamentos || [{
    nome_generico: "",
    nome_comercial: "",
    dose: "",
    unidade: "mg",
    via_administracao: "oral",
    frequencia: "",
    duracao: "",
    quantidade_total: "",
    orientacoes: "",
    uso_continuo: false
  }]);

  const [orientacoesGerais, setOrientacoesGerais] = useState(initialData?.orientacoes_gerais || "");
  const [tipoReceita, setTipoReceita] = useState(initialData?.tipo_receita || "comum");
  const [loading, setLoading] = useState(false);

  // VALIDAÇÃO CFM CRÍTICA
  if (!medico?.crms || medico.crms.length === 0) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h3 className="font-bold text-lg text-red-900 mb-2">⚠️ CRM Não Cadastrado</h3>
        <p className="text-sm text-red-700 mb-1">
          Prescrição eletrônica requer CRM ativo (CFM 1.821/07 Art. 16).
        </p>
        <p className="text-xs text-red-600">
          Médico: {medico?.nome_completo || 'Não identificado'} | Email: {medico?.email || 'N/A'}
        </p>
        <Button variant="outline" onClick={onCancel} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  // VALIDAÇÃO: CRM precisa ter número e estado
  const crmPrincipal = medico.crms[0];
  if (!crmPrincipal?.numero || !crmPrincipal?.estado) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h3 className="font-bold text-lg text-red-900 mb-2">⚠️ CRM Incompleto</h3>
        <p className="text-sm text-red-700">
          CRM precisa ter número e estado cadastrados.
        </p>
        <Button variant="outline" onClick={onCancel} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  if (!prontuario?.id) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h3 className="font-bold text-lg text-red-900 mb-2">⚠️ Prontuário Obrigatório</h3>
        <p className="text-sm text-red-700">
          CFM exige prescrição vinculada a prontuário médico.
        </p>
        <Button variant="outline" onClick={onCancel} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  const adicionarMedicamento = () => {
    setMedicamentos([...medicamentos, {
      nome_generico: "",
      nome_comercial: "",
      dose: "",
      unidade: "mg",
      via_administracao: "oral",
      frequencia: "",
      duracao: "",
      quantidade_total: "",
      orientacoes: "",
      uso_continuo: false
    }]);
  };

  const removerMedicamento = (index) => {
    if (medicamentos.length === 1) {
      toast.error("Prescrição precisa ter ao menos 1 medicamento");
      return;
    }
    setMedicamentos(medicamentos.filter((_, i) => i !== index));
  };

  const updateMedicamento = (index, field, value) => {
    const updated = [...medicamentos];
    updated[index] = { ...updated[index], [field]: value };
    setMedicamentos(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação básica
    const medicamentosValidos = medicamentos.filter(m => 
      m.nome_generico && m.dose && m.frequencia
    );

    if (medicamentosValidos.length === 0) {
      toast.error("Adicione ao menos 1 medicamento completo");
      return;
    }

    setLoading(true);
    
    try {
      await onSubmit({
        medicamentos: medicamentosValidos,
        orientacoes_gerais: orientacoesGerais,
        tipo_receita: tipoReceita
      });
    } catch (error) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header CFM */}
      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-gray-600">Médico:</p>
            <p className="font-bold text-gray-900">{medico.nome_completo}</p>
            <p className="text-purple-700 font-mono">CRM {crmPrincipal.numero}/{crmPrincipal.estado}</p>
          </div>
          <div>
            <p className="text-gray-600">Paciente:</p>
            <p className="font-bold text-gray-900">{paciente.nome_completo}</p>
            {paciente.cpf && <p className="text-gray-700">CPF {paciente.cpf}</p>}
          </div>
          <div>
            <p className="text-gray-600">Prontuário:</p>
            <p className="font-mono text-purple-700">#{prontuario.id.slice(0, 8)}</p>
            <p className="text-xs text-gray-500">{new Date(prontuario.data_atendimento).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* Tipo Receita */}
      <div>
        <label className="block text-sm font-medium mb-2">Tipo de Receita *</label>
        <select
          value={tipoReceita}
          onChange={(e) => setTipoReceita(e.target.value)}
          className="w-full border rounded-lg p-2 text-sm"
          required
        >
          <option value="comum">Comum (branca)</option>
          <option value="controlada_b1">Controlada B1 (azul) - Portaria 344/98</option>
          <option value="controlada_b2">Controlada B2 (azul) - Portaria 344/98</option>
          <option value="antimicrobiano">Antimicrobiano (branca 2 vias)</option>
          <option value="especial">Especial (branca)</option>
        </select>
        {tipoReceita !== 'comum' && (
          <p className="text-xs text-orange-600 mt-1">
            ⚠️ Receita {tipoReceita.replace('_', ' ')} - validade específica
          </p>
        )}
      </div>

      {/* Medicamentos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">Medicamentos *</label>
          <Button type="button" variant="outline" size="sm" onClick={adicionarMedicamento}>
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-4">
          {medicamentos.map((med, index) => (
            <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">Medicamento #{index + 1}</span>
                {medicamentos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removerMedicamento(index)}
                    className="p-1 hover:bg-red-50 rounded text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Nome Genérico *</label>
                  <Input
                    value={med.nome_generico}
                    onChange={(e) => updateMedicamento(index, 'nome_generico', e.target.value)}
                    placeholder="Ex: Dipirona Sódica"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Nome Comercial</label>
                  <Input
                    value={med.nome_comercial}
                    onChange={(e) => updateMedicamento(index, 'nome_comercial', e.target.value)}
                    placeholder="Ex: Novalgina"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Dose *</label>
                  <Input
                    value={med.dose}
                    onChange={(e) => updateMedicamento(index, 'dose', e.target.value)}
                    placeholder="500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Unidade *</label>
                  <select
                    value={med.unidade}
                    onChange={(e) => updateMedicamento(index, 'unidade', e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm"
                    required
                  >
                    <option value="mg">mg</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="UI">UI</option>
                    <option value="mcg">mcg</option>
                    <option value="comprimido">comprimido</option>
                    <option value="capsula">cápsula</option>
                    <option value="aplicacao">aplicação</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Via *</label>
                  <select
                    value={med.via_administracao}
                    onChange={(e) => updateMedicamento(index, 'via_administracao', e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm"
                    required
                  >
                    <option value="oral">Oral</option>
                    <option value="intravenosa">IV</option>
                    <option value="intramuscular">IM</option>
                    <option value="subcutanea">SC</option>
                    <option value="topica">Tópica</option>
                    <option value="inalatoria">Inalatória</option>
                    <option value="ocular">Ocular</option>
                    <option value="auricular">Auricular</option>
                    <option value="retal">Retal</option>
                    <option value="vaginal">Vaginal</option>
                    <option value="sublingual">Sublingual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Frequência *</label>
                  <Input
                    value={med.frequencia}
                    onChange={(e) => updateMedicamento(index, 'frequencia', e.target.value)}
                    placeholder="8/8h"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Duração</label>
                  <Input
                    value={med.duracao}
                    onChange={(e) => updateMedicamento(index, 'duracao', e.target.value)}
                    placeholder="7 dias"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Quantidade Total</label>
                  <Input
                    value={med.quantidade_total}
                    onChange={(e) => updateMedicamento(index, 'quantidade_total', e.target.value)}
                    placeholder="21 comprimidos"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Orientações</label>
                <textarea
                  value={med.orientacoes}
                  onChange={(e) => updateMedicamento(index, 'orientacoes', e.target.value)}
                  placeholder="Ex: Tomar com água, evitar bebidas alcoólicas"
                  className="w-full border rounded-lg p-2 text-sm"
                  rows={2}
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={med.uso_continuo}
                  onChange={(e) => updateMedicamento(index, 'uso_continuo', e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Uso contínuo</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Orientações Gerais */}
      <div>
        <label className="block text-sm font-medium mb-2">Orientações Gerais</label>
        <textarea
          value={orientacoesGerais}
          onChange={(e) => setOrientacoesGerais(e.target.value)}
          placeholder="Orientações adicionais ao paciente..."
          className="w-full border rounded-lg p-3 text-sm"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Salvar Prescrição
        </Button>
      </div>
    </form>
  );
}