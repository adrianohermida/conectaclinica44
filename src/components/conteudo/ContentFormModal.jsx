import React, { useState, useEffect } from "react";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import ContentEditorUniversal from "./ContentEditorUniversal";

/**
 * FORM MODAL GENÉRICO - Create/Edit conteúdo
 */
export default function ContentFormModal({ 
  open, 
  onClose, 
  onSave, 
  item = null,
  fields = [],
  editorMode = "markdown"
}) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (item) {
      setForm(item);
    } else {
      const initialForm = {};
      (fields || []).forEach(f => {
        initialForm[f.key] = f.default || "";
      });
      setForm(initialForm);
    }
  }, [item, open]);

  const handleSubmit = () => {
    onSave(form);
    onClose();
  };

  return (
    <SlideInPanel open={open} onClose={onClose} title={item ? "Editar" : "Novo"} width="xl">
      <div className="space-y-4">
        {(fields || []).map(field => {
          if (field.type === "editor") {
            return (
              <div key={field.key}>
                <label className="block text-sm font-medium mb-2">{field.label}</label>
                <ContentEditorUniversal
                  value={form[field.key]}
                  onChange={(val) => setForm({ ...form, [field.key]: val })}
                  mode={editorMode}
                />
              </div>
            );
          }

          if (field.type === "select") {
            return (
              <div key={field.key}>
                <label className="block text-sm font-medium mb-2">{field.label}</label>
                <select
                  value={form[field.key] || ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--brand-primary)]"
                  style={{ borderColor: 'var(--brand-border-primary)' }}
                >
                  {(field.options || []).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            );
          }

          if (field.type === "checkbox") {
            return (
              <div key={field.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form[field.key] || false}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium">{field.label}</label>
              </div>
            );
          }

          return (
            <div key={field.key}>
              <label className="block text-sm font-medium mb-2">{field.label}</label>
              <Input
                value={form[field.key] || ""}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                placeholder={field.placeholder}
              />
            </div>
          );
        })}

        <Button onClick={handleSubmit} className="w-full">
          Salvar
        </Button>
      </div>
    </SlideInPanel>
  );
}