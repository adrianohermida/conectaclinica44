import React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2, Code, FileText, Save } from "lucide-react";
import { toast } from "sonner";

export default function TextEditor({ onSave, onClose, onCancel, initialTitle = "", initialContent = "" }) {
  const handleClose = onCancel || onClose;
  
  console.log('[TextEditor] Renderizando com:', { initialTitle, hasContent: !!initialContent });
  const [titulo, setTitulo] = React.useState(initialTitle);
  const [abas, setAbas] = React.useState(() => {
    if (initialContent) {
      return [{ id: 1, titulo: "Conteúdo", conteudo: initialContent, tipo: "markdown" }];
    }
    return [{ id: 1, titulo: "README.md", conteudo: "", tipo: "markdown" }];
  });
  const [abaAtiva, setAbaAtiva] = React.useState(1);

  const abaAtual = abas.find(a => a.id === abaAtiva);

  const adicionarAba = (tipo = "markdown") => {
    const novaAba = {
      id: Date.now(),
      titulo: tipo === "code" ? "codigo.js" : "nova-aba.md",
      conteudo: "",
      tipo
    };
    setAbas([...abas, novaAba]);
    setAbaAtiva(novaAba.id);
  };

  const removerAba = (id) => {
    if (abas.length === 1) {
      toast.error("Mantenha ao menos uma aba");
      return;
    }
    const novasAbas = abas.filter(a => a.id !== id);
    setAbas(novasAbas);
    if (abaAtiva === id) {
      setAbaAtiva(novasAbas[0].id);
    }
  };

  const atualizarAba = (campo, valor) => {
    setAbas(abas.map(a => a.id === abaAtiva ? { ...a, [campo]: valor } : a));
  };

  const convertMarkdownToHTML = (markdown) => {
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold, Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Lists
    html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');
    
    // Badges
    html = html.replace(/\[badge:success\](.*?)\[\/badge\]/g, '<span class="badge badge-success">$1</span>');
    html = html.replace(/\[badge:warning\](.*?)\[\/badge\]/g, '<span class="badge badge-warning">$1</span>');
    html = html.replace(/\[badge:error\](.*?)\[\/badge\]/g, '<span class="badge badge-error">$1</span>');
    html = html.replace(/\[badge:info\](.*?)\[\/badge\]/g, '<span class="badge badge-info">$1</span>');
    
    // Boxes
    html = html.replace(/\[box:info\]([\s\S]*?)\[\/box\]/g, '<div class="box box-info">$1</div>');
    html = html.replace(/\[box:warning\]([\s\S]*?)\[\/box\]/g, '<div class="box box-warning">$1</div>');
    html = html.replace(/\[box:error\]([\s\S]*?)\[\/box\]/g, '<div class="box box-error">$1</div>');
    html = html.replace(/\[box:success\]([\s\S]*?)\[\/box\]/g, '<div class="box box-success">$1</div>');
    
    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    return html;
  };

  const handleSave = () => {
    if (!titulo.trim()) {
      toast.error("Digite um título para o documento");
      return;
    }

    // Gerar HTML estruturado com abas
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #202124; margin-bottom: 8px; }
    .tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .tab { padding: 10px 20px; background: white; border-radius: 8px; cursor: pointer; border: 2px solid #e8eaed; transition: all 0.2s; }
    .tab:hover { border-color: #7E57FF; }
    .tab.active { background: #7E57FF; color: white; border-color: #7E57FF; }
    .content { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    pre { background: #f8f9fa; padding: 20px; border-radius: 8px; overflow-x: auto; border-left: 4px solid #7E57FF; }
    code { font-family: 'Courier New', monospace; font-size: 14px; color: #e83e8c; }
    pre code { color: #212529; }
    h2 { color: #7E57FF; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }
    h3 { color: #5f6368; margin-top: 20px; margin-bottom: 10px; }
    p { line-height: 1.6; color: #3c4043; margin-bottom: 15px; }
    ul, ol { margin-left: 25px; margin-bottom: 15px; }
    li { margin-bottom: 8px; line-height: 1.6; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-right: 8px; }
    .badge-success { background: #e6f7ed; color: #34a853; }
    .badge-warning { background: #fef9e5; color: #fbbc04; }
    .badge-error { background: #fef2f2; color: #ea4335; }
    .badge-info { background: #e0f2fe; color: #0B7A9E; }
    .box { padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid; }
    .box-info { background: #e0f2fe; border-color: #0B7A9E; }
    .box-warning { background: #fef9e5; border-color: #fbbc04; }
    .box-error { background: #fef2f2; border-color: #ea4335; }
    .box-success { background: #e6f7ed; border-color: #34a853; }
    a { color: #7E57FF; text-decoration: none; }
    a:hover { text-decoration: underline; }
    @media print { body { background: white; } .container { max-width: 100%; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${titulo}</h1>
      <p style="color: #5f6368; margin-top: 8px;">Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
    ${abas.length > 1 ? `<div class="tabs">${abas.map((aba, idx) => 
      `<div class="tab ${idx === 0 ? 'active' : ''}" onclick="switchTab(${idx})">${aba.titulo}</div>`
    ).join('')}</div>` : ''}
    <div class="content">
      ${abas.map((aba, idx) => `
        <div class="tab-content ${idx === 0 ? 'active' : ''}" id="tab-${idx}">
          ${aba.tipo === 'code' 
            ? `<pre><code>${aba.conteudo.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
            : convertMarkdownToHTML(aba.conteudo)
          }
        </div>
      `).join('')}
    </div>
  </div>
  <script>
    function switchTab(index) {
      document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', i === index);
      });
      document.querySelectorAll('.tab-content').forEach((c, i) => {
        c.classList.toggle('active', i === index);
      });
    }
  </script>
</body>
</html>`;

    onSave(titulo, html);
  };

  return (
    <>
        {/* Título do Documento */}

        <div className="p-4 border-b bg-gray-50">
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="📄 Título do documento (ex: Guia de Integração WhatsApp)"
            className="text-lg font-medium"
          />
        </div>

        {/* Tabs */}
        <div className="border-b bg-white px-4 pt-3 flex items-center gap-2 overflow-x-auto">
          {abas.map(aba => (
            <div
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`group flex items-center gap-2 px-4 py-2 rounded-t-lg cursor-pointer transition-all ${
                abaAtiva === aba.id 
                  ? 'bg-purple-50 border-t-2 border-x border-purple-500 text-purple-700 font-medium' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {aba.tipo === 'code' ? <Code className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              <input
                value={aba.titulo}
                onChange={(e) => {
                  e.stopPropagation();
                  setAbas(abas.map(a => a.id === aba.id ? { ...a, titulo: e.target.value } : a));
                }}
                className="bg-transparent border-none outline-none w-32 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
              {abas.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removerAba(aba.id);
                  }}
                  className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => adicionarAba("markdown")}
            className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 transition-colors"
            title="Nova aba Markdown"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => adicionarAba("code")}
            className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
            title="Nova aba Código"
          >
            <Code className="w-5 h-5" />
          </button>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar com Ajuda */}
          <div className="w-80 border-r bg-gray-50 overflow-y-auto p-4 text-xs">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Guia Rápido Markdown
            </h4>
            
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-gray-700 mb-1">Headers</p>
                <code className="block bg-white p-2 rounded text-xs">
                  # Título 1<br/>
                  ## Título 2<br/>
                  ### Título 3
                </code>
              </div>

              <div>
                <p className="font-semibold text-gray-700 mb-1">Formatação</p>
                <code className="block bg-white p-2 rounded text-xs">
                  **negrito**<br/>
                  *itálico*<br/>
                  `código inline`
                </code>
              </div>

              <div>
                <p className="font-semibold text-gray-700 mb-1">Listas</p>
                <code className="block bg-white p-2 rounded text-xs">
                  * Item 1<br/>
                  * Item 2<br/>
                  <br/>
                  1. Primeiro<br/>
                  2. Segundo
                </code>
              </div>

              <div>
                <p className="font-semibold text-gray-700 mb-1">Blocos de Código</p>
                <code className="block bg-white p-2 rounded text-xs">
                  ```<br/>
                  código aqui<br/>
                  ```
                </code>
              </div>

              <div>
                <p className="font-semibold text-gray-700 mb-1">Links</p>
                <code className="block bg-white p-2 rounded text-xs">
                  [texto](https://url.com)
                </code>
              </div>

              <div className="pt-3 border-t">
                <p className="font-bold text-purple-700 mb-2">🎨 Elementos Especiais</p>
                
                <p className="font-semibold text-gray-700 mb-1 mt-2">Badges</p>
                <code className="block bg-white p-2 rounded text-xs">
                  [badge:success]OK[/badge]<br/>
                  [badge:warning]Aviso[/badge]<br/>
                  [badge:error]Erro[/badge]<br/>
                  [badge:info]Info[/badge]
                </code>

                <p className="font-semibold text-gray-700 mb-1 mt-3">Boxes</p>
                <code className="block bg-white p-2 rounded text-xs">
                  [box:info]<br/>
                  Conteúdo da box<br/>
                  [/box]<br/>
                  <br/>
                  Tipos: info, warning,<br/>
                  error, success
                </code>
              </div>
            </div>
          </div>

          {/* Main Editor */}
          <div className="flex-1 overflow-y-auto p-6">
            {abaAtual?.tipo === 'code' ? (
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                  <Code className="w-4 h-4" />
                  <span>Bloco de Código</span>
                </div>
                <textarea
                  value={abaAtual.conteudo}
                  onChange={(e) => atualizarAba('conteudo', e.target.value)}
                  className="w-full h-[calc(100vh-400px)] p-4 border rounded-lg font-mono text-sm bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Cole seu código aqui..."
                />
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="w-4 h-4" />
                  <span>Markdown</span>
                </div>
                <textarea
                  value={abaAtual?.conteudo || ''}
                  onChange={(e) => atualizarAba('conteudo', e.target.value)}
                  className="w-full h-[calc(100vh-400px)] p-4 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Digite seu markdown aqui... Use o guia ao lado para ajuda!"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions - SEMPRE VISÍVEL */}
        <div className="sticky bottom-0 p-4 border-t bg-white shadow-lg flex items-center justify-between z-20">
          <div className="text-xs sm:text-sm text-gray-600">
            {abas.length} {abas.length === 1 ? 'aba' : 'abas'} • {abaAtual?.tipo === 'code' ? 'Código' : 'Markdown'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
              <Save className="w-4 h-4 mr-2" />
              {initialTitle ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </div>
    </>
  );
}