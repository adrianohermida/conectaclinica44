import React from "react";
import ReactQuill from 'react-quill';
import EditorBlocos from "@/components/gestao-conteudo/EditorBlocos";

/**
 * EDITOR UNIVERSAL - Detecta modo automaticamente
 * Suporta: markdown, html, blocos
 */
export default function ContentEditorUniversal({ value, onChange, mode = "markdown" }) {
  if (mode === "blocos") {
    return <EditorBlocos blocos={value || []} onChange={onChange} />;
  }

  if (mode === "html") {
    return (
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={onChange}
        style={{ height: '400px', marginBottom: '60px' }}
      />
    );
  }

  // Markdown (default)
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:border-[#7E57FF] resize-none"
      style={{ minHeight: '400px', borderColor: '#e8eaed' }}
      placeholder="Digite o conteúdo em Markdown..."
    />
  );
}