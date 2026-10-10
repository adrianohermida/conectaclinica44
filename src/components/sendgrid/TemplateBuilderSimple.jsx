import React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Save, Eye, Code } from "lucide-react";
import PreviewTemplate from "./PreviewTemplate";

/**
 * SPRINT 4: Template Builder simples (sem WYSIWYG)
 * Edição HTML direto + variáveis + preview
 */
export default function TemplateBuilderSimple({ templateData, onSave }) {
  const [nome, setNome] = React.useState(templateData?.nome || '');
  const [html, setHtml] = React.useState(templateData?.html_preview || '');
  const [vars, setVars] = React.useState(templateData?.variaveis?.join(', ') || '');
  const [showPreview, setShowPreview] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const varsExemplo = React.useMemo(() => {
    const varsList = vars.split(',').map(v => v.trim()).filter(Boolean);
    return Object.fromEntries(varsList.map(v => [v, `{exemplo_${v}}`]));
  }, [vars]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        nome,
        html_preview: html,
        variaveis: vars.split(',').map(v => v.trim()).filter(Boolean)
      });
      toast.success('Template salvo');
    } catch (error) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="pc-card p-6">
        <h3 className="font-bold mb-4">Editor de Template</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Nome do Template</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Lembrete Consulta"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Variáveis (separadas por vírgula)
            </label>
            <Input
              value={vars}
              onChange={(e) => setVars(e.target.value)}
              placeholder="Ex: paciente_nome, data, horario, medico_nome"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use no HTML como: {"{{paciente_nome}}"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Code className="w-4 h-4" />
              HTML do Template
            </label>
            <Textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="font-mono text-xs h-64"
              placeholder="Cole seu HTML aqui..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={() => setShowPreview(!showPreview)}
            variant="outline"
            icon={<Eye className="w-4 h-4" />}
          >
            {showPreview ? 'Fechar' : 'Preview'}
          </Button>
          <Button
            onClick={handleSave}
            loading={loading}
            icon={<Save className="w-4 h-4" />}
          >
            Salvar Template
          </Button>
        </div>
      </div>

      {showPreview && (
        <PreviewTemplate 
          htmlContent={html} 
          variaveis={varsExemplo}
        />
      )}
    </div>
  );
}