import React, { useState } from "react";
import { X, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NovoDocumentoModal({ open, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    tipo_documento: "contrato_custom",
    categoria_custom: "",
    uso_tipo: "interno",
    titulo_custom: "",
    slug: "",
    versao: "1.0.0"
  });

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f5f3ff] flex items-center justify-center">
              <FileText className="w-5 h-5" style={{ color: '#7E57FF' }} />
            </div>
            <h2 className="text-xl font-bold text-[#202124]">Novo Documento Legal</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold text-sm text-[#202124] mb-2">
              Tipo de Uso
            </label>
            <Select
              value={formData.uso_tipo}
              onValueChange={(value) => setFormData({ ...formData, uso_tipo: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="publico">Público (Site)</SelectItem>
                <SelectItem value="interno">Interno (Contratos/Modal)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block font-bold text-sm text-[#202124] mb-2">
              Tipo de Documento
            </label>
            <Select
              value={formData.tipo_documento}
              onValueChange={(value) => setFormData({ ...formData, tipo_documento: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formData.uso_tipo === 'publico' ? (
                  <>
                    <SelectItem value="termos_uso">Termos de Uso</SelectItem>
                    <SelectItem value="politica_privacidade">Política de Privacidade</SelectItem>
                    <SelectItem value="lgpd">Compliance LGPD</SelectItem>
                  </>
                ) : (
                  <SelectItem value="contrato_custom">Contrato Personalizado</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {formData.tipo_documento === 'contrato_custom' && (
            <>
              <div>
                <label className="block font-bold text-sm text-[#202124] mb-2">
                  Categoria Personalizada
                </label>
                <Input
                  value={formData.categoria_custom}
                  onChange={(e) => setFormData({ ...formData, categoria_custom: e.target.value })}
                  placeholder="Ex: Procuração, Declaração, Contrato"
                  required
                />
              </div>
              
              <div>
                <label className="block font-bold text-sm text-[#202124] mb-2">
                  Título do Documento
                </label>
                <Input
                  value={formData.titulo_custom}
                  onChange={(e) => setFormData({ ...formData, titulo_custom: e.target.value })}
                  placeholder="Ex: Contrato de Prestação de Serviços"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-sm text-[#202124] mb-2">
                  Slug da URL {formData.uso_tipo === 'interno' && '(opcional)'}
                </label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  placeholder="Ex: meu-contrato"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.uso_tipo === 'publico' ? (
                    <>URL será: /ConteudoLegalPublico?slug={formData.slug || 'auto-gerado'}</>
                  ) : (
                    <>Identificador único para referência</>
                  )}
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block font-bold text-sm text-[#202124] mb-2">
              Versão Inicial
            </label>
            <Input
              value={formData.versao}
              onChange={(e) => setFormData({ ...formData, versao: e.target.value })}
              placeholder="1.0.0"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-[#7E57FF] hover:bg-[#6d28d9] text-white">
              Criar Documento
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}