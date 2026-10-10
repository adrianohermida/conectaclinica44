import React from "react";
import {
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileSignature
} from "lucide-react";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Input } from "@/components/ui/input.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * PrescricaoPanel - Painel de Prescrição Eletrônica CFM
 * Extraído de Prontuarios.jsx (form completo de medicamentos)
 * Validação e persistência permanecem no pai (onSave)
 */
export default function PrescricaoPanel({
  open,
  onClose,
  prescricaoData,
  setPrescricaoData,
  onSave,
  isSaving
}) {
  const adicionarMedicamento = () => {
    setPrescricaoData({
      ...prescricaoData,
      medicamentos: [
        ...prescricaoData.medicamentos,
        {
          medicamento: "",
          principio_ativo: "",
          concentracao: "",
          posologia: "",
          quantidade: "",
          via_administracao: "oral",
          duracao_tratamento: "",
          orientacoes: "",
          controlado: false,
          tarja: "sem_tarja"
        }
      ]
    });
  };

  const removerMedicamento = (index) => {
    const novos = prescricaoData.medicamentos.filter((_, i) => i !== index);
    setPrescricaoData({ ...prescricaoData, medicamentos: novos });
  };

  return (
    <SlideInPanel
      open={open}
      onClose={onClose}
      title="Prescrição Eletrônica CFM"
      maxWidth="700px"
    >
      <div className="space-y-6">
        {/* Alerta CFM */}
        <div className="bg-[var(--pc-info-50)] rounded-lg p-4 border border-[var(--pc-info-200)]">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-[var(--pc-info)] flex-shrink-0 mt-0.5" />
            <div className="pc-body-sm text-[var(--pc-info-700)]">
              <p className="font-medium mb-1">🔒 Prescrição Eletrônica Conforme CFM</p>
              <ul className="space-y-1 text-xs">
                <li>• Resolução CFM 2.314/2022 e 2.309/2022</li>
                <li>• Assinatura Digital ICP-Brasil automática</li>
                <li>• QR Code de validação no CFM</li>
                <li>• Rastreabilidade completa de dispensações</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Dados do Paciente e Médico */}
        <div className="bg-[var(--pc-surface-variant)] rounded-lg p-3 md:p-4 border border-[var(--pc-border-primary)]">
          <h3 className="text-sm md:text-base font-semibold mb-2">Dados da Prescrição</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
            <div>
              <span className="text-[var(--pc-text-secondary)]">Paciente:</span>
              <p className="font-medium text-[var(--pc-text-primary)] truncate">{prescricaoData.paciente_nome}</p>
            </div>
            <div>
              <span className="text-[var(--pc-text-secondary)]">Prescritor:</span>
              <p className="font-medium text-[var(--pc-text-primary)] truncate">Dr(a). {prescricaoData.medico_nome}</p>
            </div>
            <div>
              <span className="text-[var(--pc-text-secondary)]">CRM:</span>
              <p className="font-medium text-[var(--pc-text-primary)]">{prescricaoData.medico_crm}/{prescricaoData.medico_uf_crm}</p>
            </div>
            <div>
              <span className="text-[var(--pc-text-secondary)]">Local:</span>
              <p className="font-medium text-[var(--pc-text-primary)] truncate">{prescricaoData.local_atendimento}</p>
            </div>
          </div>
        </div>

        {/* Tipo de Receita */}
        <div>
          <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Tipo de Receituário *</label>
          <Select
            value={prescricaoData.tipo_receita}
            onValueChange={(value) => setPrescricaoData({ ...prescricaoData, tipo_receita: value })}
          >
            <SelectTrigger className="border border-gray-300 rounded-lg min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="simples">Receita Simples</SelectItem>
              <SelectItem value="controle_especial">Controle Especial (Tarja Vermelha/Preta)</SelectItem>
              <SelectItem value="antimicrobiano">Antimicrobiano</SelectItem>
              <SelectItem value="uso_continuo">Uso Contínuo</SelectItem>
            </SelectContent>
          </Select>
          {prescricaoData.tipo_receita !== "simples" && (
            <p className="pc-caption text-[var(--pc-warning-600)] mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Requer assinatura digital ICP-Brasil e registro Anvisa
            </p>
          )}
        </div>

        {/* Medicamentos */}
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base md:text-lg font-semibold">Medicamentos</h3>
            <button
              type="button"
              onClick={adicionarMedicamento}
              aria-label="Adicionar medicamento"
              className="text-white font-bold px-3 md:px-4 py-2 rounded-xl hover:opacity-90 min-h-[48px]"
              style={{ backgroundColor: '#34a853', fontSize: '14px' }}
            >
              + Adicionar
            </button>
          </div>

          {(prescricaoData.medicamentos || []).map((med, index) => (
            <div key={index} className="bg-[var(--pc-surface-variant)] rounded-lg p-3 md:p-4 border border-[var(--pc-border-primary)] space-y-3">
              <div className="flex justify-between items-start gap-2">
                <h4 className="text-sm md:text-base font-medium text-[var(--pc-text-primary)]">Medicamento {index + 1}</h4>
                {prescricaoData.medicamentos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removerMedicamento(index)}
                    className="text-[var(--pc-error)] text-xs md:text-sm hover:underline min-h-[44px] px-2"
                  >
                    Remover
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-1">Nome do Medicamento *</label>
                  <Input
                    value={med.medicamento || ""}
                    onChange={(e) => {
                      const novos = [...prescricaoData.medicamentos];
                      novos[index].medicamento = e.target.value;
                      setPrescricaoData({ ...prescricaoData, medicamentos: novos });
                    }}
                    className="border border-gray-300 rounded-lg min-h-[44px]"
                    placeholder="Ex: Dipirona Sódica"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-1">Concentração</label>
                  <Input
                    value={med.concentracao || ""}
                    onChange={(e) => {
                      const novos = [...prescricaoData.medicamentos];
                      novos[index].concentracao = e.target.value;
                      setPrescricaoData({ ...prescricaoData, medicamentos: novos });
                    }}
                    className="border border-gray-300 rounded-lg min-h-[44px]"
                    placeholder="500mg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Posologia *</label>
                <Input
                  value={med.posologia || ""}
                  onChange={(e) => {
                    const novos = [...prescricaoData.medicamentos];
                    novos[index].posologia = e.target.value;
                    setPrescricaoData({ ...prescricaoData, medicamentos: novos });
                  }}
                  className="border border-gray-300 rounded-lg min-h-[44px]"
                  placeholder="Tomar 1 comprimido a cada 8 horas"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-1">Quantidade</label>
                  <Input
                    value={med.quantidade || ""}
                    onChange={(e) => {
                      const novos = [...prescricaoData.medicamentos];
                      novos[index].quantidade = e.target.value;
                      setPrescricaoData({ ...prescricaoData, medicamentos: novos });
                    }}
                    className="border border-gray-300 rounded-lg min-h-[44px]"
                    placeholder="30 comp"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-1">Via</label>
                  <Select
                    value={med.via_administracao}
                    onValueChange={(value) => {
                      const novos = [...prescricaoData.medicamentos];
                      novos[index].via_administracao = value;
                      setPrescricaoData({ ...prescricaoData, medicamentos: novos });
                    }}
                  >
                    <SelectTrigger className="border border-gray-300 rounded-lg min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="oral">Oral</SelectItem>
                      <SelectItem value="sublingual">Sublingual</SelectItem>
                      <SelectItem value="topica">Tópica</SelectItem>
                      <SelectItem value="intravenosa">Intravenosa</SelectItem>
                      <SelectItem value="intramuscular">Intramuscular</SelectItem>
                      <SelectItem value="subcutanea">Subcutânea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-1">Duração</label>
                  <Input
                    value={med.duracao_tratamento || ""}
                    onChange={(e) => {
                      const novos = [...prescricaoData.medicamentos];
                      novos[index].duracao_tratamento = e.target.value;
                      setPrescricaoData({ ...prescricaoData, medicamentos: novos });
                    }}
                    className="border border-gray-300 rounded-lg min-h-[44px]"
                    placeholder="7 dias"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Orientações Específicas</label>
                <Input
                  value={med.orientacoes || ""}
                  onChange={(e) => {
                    const novos = [...prescricaoData.medicamentos];
                    novos[index].orientacoes = e.target.value;
                    setPrescricaoData({ ...prescricaoData, medicamentos: novos });
                  }}
                  className="border border-gray-300 rounded-lg min-h-[44px]"
                  placeholder="Ex: Tomar com alimentos"
                />
              </div>

              {prescricaoData.tipo_receita !== "simples" && (
                <div className="flex items-center gap-3 min-h-[44px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={med.controlado}
                      onChange={(e) => {
                        const novos = [...prescricaoData.medicamentos];
                        novos[index].controlado = e.target.checked;
                        setPrescricaoData({ ...prescricaoData, medicamentos: novos });
                      }}
                      className="w-5 h-5 rounded border-2"
                    />
                    <span className="text-xs md:text-sm text-[var(--pc-text-secondary)]">Medicamento Controlado</span>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Orientações Gerais */}
        <div>
          <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Orientações Gerais</label>
          <textarea
            value={prescricaoData.orientacoes_gerais || ""}
            onChange={(e) => setPrescricaoData({ ...prescricaoData, orientacoes_gerais: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 resize-none text-sm md:text-base"
            rows="3"
            placeholder="Orientações gerais ao paciente..."
          />
        </div>

        {/* Opções */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div className="flex items-center gap-3 min-h-[44px]">
            <input
              type="checkbox"
              checked={prescricaoData.uso_continuo}
              onChange={(e) => setPrescricaoData({ ...prescricaoData, uso_continuo: e.target.checked })}
              className="w-5 h-5 rounded border-2"
            />
            <label className="text-sm md:text-base text-[var(--pc-text-secondary)] cursor-pointer">Uso Contínuo</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Validade (dias)</label>
            <Input
              type="number"
              value={prescricaoData.validade_dias}
              onChange={(e) => setPrescricaoData({ ...prescricaoData, validade_dias: parseInt(e.target.value) })}
              className="border border-gray-300 rounded-lg min-h-[44px]"
            />
          </div>
        </div>

        {/* Confirmação */}
        <div className="bg-[var(--pc-success-50)] rounded-lg p-4 border border-[var(--pc-success-200)]">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-[var(--pc-success)] flex-shrink-0 mt-0.5" />
            <div className="pc-body-sm text-[var(--pc-success-700)]">
              <p className="font-medium mb-1">✅ Prescrição será gerada com:</p>
              <ul className="space-y-1 text-xs">
                <li>• Número único de receita</li>
                <li>• Código de verificação CFM</li>
                <li>• QR Code para validação</li>
                <li>• Assinatura digital ICP-Brasil</li>
                <li>• Registro Anvisa (se controlado)</li>
                <li>• Envio automático para o paciente</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="pc-btn-secondary flex-1 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            aria-label="Gerar prescrição eletrônica"
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all"
            style={{ backgroundColor: '#7E57FF', fontSize: '16px' }}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                Gerando...
              </>
            ) : (
              <>
                <FileSignature className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                Gerar Prescrição
              </>
            )}
          </button>
        </div>
      </div>
    </SlideInPanel>
  );
}