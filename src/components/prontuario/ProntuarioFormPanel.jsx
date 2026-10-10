import React from "react";
import {
  FileStack,
  Calendar,
  Paperclip,
  Upload,
  FileText,
  Eye,
  Trash2,
  CheckCircle,
  Loader2
} from "lucide-react";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input.jsx";
import SearchableSelect from "@/components/ui/SearchableSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * ProntuarioFormPanel - Painel de criação/edição de prontuário eletrônico
 * Extraído de Prontuarios.jsx (form completo + modo leitura)
 * Validações e mutations permanecem no pai (onSubmit/onUploadFile/onDeleteDoc)
 */
export default function ProntuarioFormPanel({
  open,
  onClose,
  editingProntuario,
  podeEditar,
  formData,
  setFormData,
  pacientes,
  medicos,
  documentos = [],
  uploadingFile,
  onUploadFile,
  onDeleteDoc,
  onSubmit,
  isSaving,
  onOpenTemplates
}) {
  return (
    <SlideInPanel
      open={open}
      onClose={onClose}
      title={podeEditar && editingProntuario ? "Editar Prontuário" : "Prontuário Eletrônico"}
      maxWidth="700px"
    >
      {!podeEditar && editingProntuario ? (
        // MODO LEITURA: Apenas visualização
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-medium text-yellow-800">
              🔒 Modo somente leitura - Apenas médicos podem editar prontuários (CFM 1.821/07)
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Paciente</p>
              <p className="font-bold text-gray-900">{editingProntuario.paciente_nome}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Data</p>
                <p className="font-medium text-gray-900">{editingProntuario.data_atendimento}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Médico</p>
                <p className="font-medium text-gray-900">Dr(a). {editingProntuario.medico_nome}</p>
              </div>
            </div>

            {editingProntuario.queixa_principal && (
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Queixa Principal</p>
                <p className="text-gray-900">{editingProntuario.queixa_principal}</p>
              </div>
            )}

            {editingProntuario.hipotese_diagnostica && (
              <div className="bg-purple-50 p-4 rounded-xl">
                <p className="text-xs text-purple-700 mb-1">Diagnóstico</p>
                <p className="font-medium text-purple-900">{editingProntuario.hipotese_diagnostica}</p>
              </div>
            )}

            {editingProntuario.conduta && (
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Conduta</p>
                <p className="text-gray-900">{editingProntuario.conduta}</p>
              </div>
            )}
          </div>

          <Button variant="secondary" onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      ) : (
      <form onSubmit={onSubmit} className="space-y-4 md:space-y-6">
        {/* Botão Templates */}
        {!editingProntuario && (
          <button
            type="button"
            onClick={onOpenTemplates}
            aria-label="Usar template de prontuário"
            className="w-full hover:bg-purple-100 border-2 font-bold py-3 px-3 md:px-4 rounded-xl flex items-center justify-center gap-2 min-h-[48px]"
            style={{ backgroundColor: '#f5f3ff', borderColor: '#e9ddff', color: '#7E57FF', fontSize: '16px' }}
          >
            <FileStack className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
            <span className="hidden sm:inline">Usar Template de Prontuário</span>
            <span className="sm:hidden">Usar Template</span>
          </button>
        )}
        {/* Dados do Atendimento */}
        <div className="bg-[var(--pc-info-50)] rounded-lg p-3 md:p-4 border border-[var(--pc-info-200)]">
          <h3 className="text-sm md:text-base font-semibold text-[var(--pc-info-700)] mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
            Dados do Atendimento
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label htmlFor="prontuario_paciente" className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Paciente *</label>
              <SearchableSelect
                id="prontuario_paciente"
                items={pacientes}
                value={formData.paciente_nome}
                onValueChange={(value) => {
                  const paciente = pacientes.find(p => p.nome_completo === value);
                  setFormData({
                    ...formData,
                    paciente_nome: value,
                    paciente_id: paciente?.id || ""
                  });
                }}
                getLabel={(p) => p.nome_completo}
                getValue={(p) => p.nome_completo}
                placeholder="Selecione o paciente"
                searchPlaceholder="Buscar paciente..."
                required
                ariaLabel="Selecionar paciente para o prontuário"
              />
            </div>
            <div>
              <label htmlFor="prontuario_medico" className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Médico *</label>
              <SearchableSelect
                id="prontuario_medico"
                items={medicos}
                value={formData.medico_nome}
                onValueChange={(value) => {
                  const medico = medicos.find(m => m.nome_completo === value);
                  setFormData({
                    ...formData,
                    medico_nome: value,
                    medico_crm: medico?.crm || ""
                  });
                }}
                getLabel={(m) => `Dr(a). ${m.nome_completo} - CRM ${m.crm}`}
                getValue={(m) => m.nome_completo}
                placeholder="Selecione o médico"
                searchPlaceholder="Buscar médico..."
                required
                ariaLabel="Selecionar médico responsável"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4">
            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Data *</label>
              <Input
                type="date"
                value={formData.data_atendimento}
                onChange={(e) => setFormData({ ...formData, data_atendimento: e.target.value })}
                className="border border-gray-300 rounded-lg min-h-[44px]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Tipo</label>
              <Select
                value={formData.tipo_atendimento}
                onValueChange={(value) => setFormData({ ...formData, tipo_atendimento: value })}
              >
                <SelectTrigger className="border border-gray-300 rounded-lg min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="consulta">Consulta</SelectItem>
                  <SelectItem value="retorno">Retorno</SelectItem>
                  <SelectItem value="procedimento">Procedimento</SelectItem>
                  <SelectItem value="exame">Exame</SelectItem>
                  <SelectItem value="teleconsulta">Teleconsulta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Anamnese */}
        <div>
          <h3 className="text-base md:text-lg font-semibold mb-3">Anamnese</h3>
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Motivo da Consulta</label>
              <Input
                value={formData.motivo_consulta || ""}
                onChange={(e) => setFormData({ ...formData, motivo_consulta: e.target.value })}
                className="border border-gray-300 rounded-lg min-h-[44px]"
                placeholder="Motivo principal da visita"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Queixa Principal *</label>
              <textarea
                value={formData.queixa_principal || ""}
                onChange={(e) => setFormData({ ...formData, queixa_principal: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 resize-none text-sm md:text-base"
                rows="2"
                placeholder="Descreva a queixa principal do paciente..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">História da Doença Atual (HDA)</label>
              <textarea
                value={formData.historia_doenha_atual || ""}
                onChange={(e) => setFormData({ ...formData, historia_doenha_atual: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 resize-none text-sm md:text-base"
                rows="4"
                placeholder="História clínica detalhada..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">História Patológica Pregressa</label>
              <textarea
                value={formData.historia_patologica_pregressa || ""}
                onChange={(e) => setFormData({ ...formData, historia_patologica_pregressa: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 resize-none text-sm md:text-base"
                rows="2"
                placeholder="Doenças anteriores, cirurgias, internações..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Alergias</label>
              <Input
                value={formData.alergias || ""}
                onChange={(e) => setFormData({ ...formData, alergias: e.target.value })}
                className="border border-gray-300 rounded-lg min-h-[44px]"
                placeholder="Alergias medicamentosas ou alimentares"
              />
            </div>
          </div>
        </div>

        {/* Exame Físico */}
        <div>
          <h3 className="text-base md:text-lg font-semibold mb-3">Exame Físico</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">PA (mmHg)</label>
              <Input
                value={formData.exame_fisico?.pressao_arterial || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  exame_fisico: { ...formData.exame_fisico, pressao_arterial: e.target.value }
                })}
                className="border border-gray-300 rounded-lg min-h-[44px]"
                placeholder="120/80"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">FC (bpm)</label>
              <Input
                value={formData.exame_fisico?.frequencia_cardiaca || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  exame_fisico: { ...formData.exame_fisico, frequencia_cardiaca: e.target.value }
                })}
                className="border border-gray-300 rounded-lg min-h-[44px]"
                placeholder="72"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Temp (°C)</label>
              <Input
                value={formData.exame_fisico?.temperatura || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  exame_fisico: { ...formData.exame_fisico, temperatura: e.target.value }
                })}
                className="border border-gray-300 rounded-lg min-h-[44px]"
                placeholder="36.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Peso (kg)</label>
              <Input
                value={formData.exame_fisico?.peso || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  exame_fisico: { ...formData.exame_fisico, peso: e.target.value }
                })}
                className="border border-gray-300 rounded-lg min-h-[44px]"
                placeholder="70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Altura (cm)</label>
              <Input
                value={formData.exame_fisico?.altura || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  exame_fisico: { ...formData.exame_fisico, altura: e.target.value }
                })}
                className="border border-gray-300 rounded-lg min-h-[44px]"
                placeholder="170"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Estado Geral</label>
              <Select
                value={formData.exame_fisico?.estado_geral}
                onValueChange={(value) => setFormData({
                  ...formData,
                  exame_fisico: { ...formData.exame_fisico, estado_geral: value }
                })}
              >
                <SelectTrigger className="border border-gray-300 rounded-lg min-h-[44px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="BEG">BEG (Bom Estado Geral)</SelectItem>
                  <SelectItem value="REG">REG (Regular Estado Geral)</SelectItem>
                  <SelectItem value="MEG">MEG (Mau Estado Geral)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Diagnóstico e Conduta */}
        <div>
          <h3 className="text-base md:text-lg font-semibold mb-3">Diagnóstico e Conduta</h3>
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Hipótese Diagnóstica (CID-10)</label>
              <Input
                value={formData.hipotese_diagnostica || ""}
                onChange={(e) => setFormData({ ...formData, hipotese_diagnostica: e.target.value })}
                className="border border-gray-300 rounded-lg min-h-[44px]"
                placeholder="Ex: J00 - Nasofaringite aguda"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Conduta Médica</label>
              <textarea
                value={formData.conduta || ""}
                onChange={(e) => setFormData({ ...formData, conduta: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 resize-none text-sm md:text-base"
                rows="3"
                placeholder="Conduta médica adotada..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Plano Terapêutico</label>
              <textarea
                value={formData.plano_terapeutico || ""}
                onChange={(e) => setFormData({ ...formData, plano_terapeutico: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 resize-none text-sm md:text-base"
                rows="3"
                placeholder="Plano de tratamento..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Observações Complementares</label>
              <textarea
                value={formData.observacoes_complementares || ""}
                onChange={(e) => setFormData({ ...formData, observacoes_complementares: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 resize-none text-sm md:text-base"
                rows="2"
              />
            </div>
          </div>
        </div>

        {/* Documentos Anexados */}
        {editingProntuario && (
          <div className="bg-[var(--pc-surface-variant)] rounded-lg p-3 md:p-4 border border-[var(--pc-border-primary)]">
            <h3 className="text-sm md:text-base font-semibold mb-3 flex items-center gap-2">
              <Paperclip className="w-4 h-4 md:w-5 md:h-5 text-[var(--pc-info)] flex-shrink-0" />
              Documentos Anexados
            </h3>

            <div className="mb-3 md:mb-4">
              <label className="block text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Anexar Documento
              </label>
              <input
                type="file"
                onChange={(e) => onUploadFile(e, editingProntuario.id)}
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={uploadingFile}
                className="w-full border border-gray-300 rounded-lg p-2 bg-white file:mr-2 md:file:mr-4 file:py-2 file:px-3 md:file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-xs md:file:text-sm file:font-medium hover:file:bg-blue-700 cursor-pointer text-xs md:text-sm"
              />
               {uploadingFile && (
                <p className="text-sm mt-2 flex items-center gap-1">
                  <Upload className="w-4 h-4 animate-pulse" />
                  Enviando arquivo...
                </p>
              )}
            </div>

            {documentos.length === 0 ? (
              <p className="pc-body-sm text-center py-4">Nenhum documento anexado</p>
            ) : (
              <div className="space-y-2">
                {(documentos || []).map((doc) => {
                  const nomeExibicao = doc.titulo || doc.nome_arquivo || 'Documento';
                  const isComprimido = doc.comprimido;
                  return (
                    <div key={doc.id} className="bg-[var(--pc-surface)] rounded-lg p-3 border border-[var(--pc-border-primary)]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-[var(--pc-info)] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="pc-body-sm truncate">{nomeExibicao}</p>
                            {isComprimido && (
                              <p className="text-xs text-green-600">
                                ✅ Otimizado {doc.economia_compressao_percent}% ({(doc.tamanho_bytes/1024).toFixed(0)}KB)
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <a
                            href={doc.arquivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[var(--pc-info-50)] hover:bg-[var(--pc-info-100)] text-[var(--pc-info-700)] p-1 rounded"
                            aria-label="Visualizar documento"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => onDeleteDoc(doc)}
                            className="bg-[var(--pc-error-50)] hover:bg-[var(--pc-error-100)] text-[var(--pc-error-700)] p-1 rounded"
                            aria-label="Excluir documento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Alerta CFM */}
        <div className="bg-[var(--pc-success-50)] rounded-lg p-4 border border-[var(--pc-success-200)]">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-[var(--pc-success)] flex-shrink-0 mt-0.5" />
            <div className="pc-body-sm text-[var(--pc-success-700)]">
              <p className="font-medium mb-1">✅ Prontuário será gerado conforme CFM</p>
              <ul className="space-y-1 text-xs">
                <li>• Assinatura digital automática com hash único</li>
                <li>• Registro de auditoria completo</li>
                <li>• Versionamento de alterações</li>
                <li>• Conformidade com Resolução CFM 1.821/07</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 min-h-[44px]"
          >
            Cancelar
          </Button>
          <button
            type="submit"
            aria-label={editingProntuario ? "Atualizar prontuário" : "Finalizar prontuário"}
            className="flex-1 flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all"
            style={{ backgroundColor: '#7E57FF', fontSize: '16px' }}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                {editingProntuario ? "Atualizando..." : "Salvando..."}
              </>
            ) : (
              editingProntuario ? "Atualizar Prontuário" : "Finalizar Prontuário"
            )}
          </button>
        </div>
      </form>
      )}
    </SlideInPanel>
  );
}