import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { X, Download, Pencil, Search, Copy, FileText, ChevronRight, Eye, Code, BookOpen } from "lucide-react";
import { toast } from "sonner";
import LazyLoadPDF from "@/components/repositorio/LazyLoadPDF";
import LazyLoadImage from "@/components/repositorio/LazyLoadImage";

/**
 * UNIVERSAL DOC VIEWER - Twilio Docs Style
 * Features: TOC navigation, search, markdown export, responsive
 */
export default function UniversalDocViewer({ item, onClose, onEdit }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [toc, setToc] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState(null);
  const [viewMode, setViewMode] = useState('rendered'); // 'rendered' | 'markdown'

  const isPDF = item.tipo_arquivo === 'pdf';
  const isHTML = item.tipo_arquivo === 'html';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(item.tipo_arquivo?.toLowerCase());

  // Carregar conteúdo
  useEffect(() => {
    if (isHTML) {
      loadHTMLContent();
    } else {
      setLoading(false);
    }
  }, [item.arquivo_url]);

  const loadHTMLContent = async () => {
    try {
      const response = await fetch(item.arquivo_url);
      const html = await response.text();
      setContent(html);
      extractTOC(html);
      setLoading(false);
    } catch (error) {
      console.error('[Viewer] Erro ao carregar HTML:', error);
      toast.error('Erro ao carregar documento');
      setLoading(false);
    }
  };

  // Extrair Table of Contents (h1, h2, h3)
  const extractTOC = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headers = doc.querySelectorAll('h1, h2, h3');
    
    const tocItems = Array.from(headers).map((header, idx) => {
      const id = `section-${idx}`;
      header.id = id; // Adicionar ID para navegação
      
      return {
        id,
        text: header.textContent.trim(),
        level: parseInt(header.tagName.charAt(1)),
        element: header
      };
    });

    setToc(tocItems);
    if (tocItems.length > 0) setActiveSection(tocItems[0].id);

    // Re-render com IDs adicionados
    setContent(doc.documentElement.outerHTML);
  };

  // Converter HTML para Markdown
  const htmlToMarkdown = (html) => {
    let markdown = html
      .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre><code>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n')
      .replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<ul>/gi, '').replace(/<\/ul>/gi, '\n')
      .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    
    return markdown;
  };

  const copyAsMarkdown = () => {
    const markdown = htmlToMarkdown(content);
    navigator.clipboard.writeText(markdown);
    toast.success('Markdown copiado!');
  };

  const scrollToSection = (id) => {
    const iframe = document.getElementById('doc-iframe');
    if (iframe && iframe.contentWindow) {
      const section = iframe.contentWindow.document.getElementById(id);
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  // Busca no conteúdo
  const highlightedContent = useMemo(() => {
    if (!searchQuery.trim() || !isHTML) return content;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return content.replace(regex, '<mark style="background: #FFE066; padding: 2px 4px; border-radius: 2px;">$1</mark>');
  }, [content, searchQuery]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between gap-4 border-b border-gray-700">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileText className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <h3 className="text-white font-bold truncate">{item.titulo}</h3>
          {item.versao > 1 && (
            <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">v{item.versao}</span>
          )}
        </div>

        {/* Ferramentas */}
        <div className="flex items-center gap-2">
          {/* Busca */}
          {(isHTML || isPDF) && (
            <div className="hidden md:flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar no documento..."
                className="bg-transparent border-none text-white text-sm w-48 p-0 focus:ring-0"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-gray-700 rounded">
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>
          )}

          {/* View Mode Toggle (HTML only) */}
          {isHTML && (
            <div className="hidden sm:flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('rendered')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === 'rendered' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5 inline mr-1" />
                Renderizado
              </button>
              <button
                onClick={() => setViewMode('markdown')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === 'markdown' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5 inline mr-1" />
                Markdown
              </button>
            </div>
          )}

          {/* Actions */}
          {isHTML && (
            <Button size="sm" variant="outline" onClick={copyAsMarkdown} className="hidden sm:flex">
              <Copy className="w-4 h-4 mr-2" />
              Copiar Markdown
            </Button>
          )}
          
          {item.tipo_arquivo === 'html' && onEdit && (
            <Button size="sm" onClick={() => { onClose(); onEdit(item); }} className="bg-purple-600 hover:bg-purple-700">
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
          
          <Button size="sm" onClick={() => window.open(item.arquivo_url, '_blank')} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          
          <Button size="sm" onClick={onClose} className="bg-gray-800 hover:bg-gray-700">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar TOC - Desktop only */}
        {isHTML && toc.length > 0 && (
          <div className="hidden lg:block w-64 bg-gray-900 border-r border-gray-700 overflow-y-auto">
            <div className="p-4 border-b border-gray-700">
              <h4 className="text-white font-bold text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                Nesta página
              </h4>
            </div>
            <nav className="p-2">
              {toc.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors mb-1 ${
                    activeSection === section.id 
                      ? 'bg-purple-600 text-white font-medium' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                  style={{ paddingLeft: `${8 + (section.level - 1) * 12}px` }}
                >
                  <ChevronRight className={`w-3 h-3 inline mr-1 ${activeSection === section.id ? 'rotate-90' : ''}`} />
                  {section.text}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Document Viewer */}
        <div className="flex-1 bg-gray-100 overflow-hidden relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Carregando documento...</p>
              </div>
            </div>
          ) : isPDF ? (
            <LazyLoadPDF item={item} />
          ) : isImage ? (
            <div className="flex items-center justify-center h-full p-4 bg-gray-900">
              <LazyLoadImage 
                item={item}
                onClick={() => window.open(item.arquivo_url, '_blank')}
              />
            </div>
          ) : isHTML ? (
            <div className="h-full overflow-hidden bg-white">
              {viewMode === 'markdown' ? (
                <div className="h-full overflow-y-auto p-6">
                  <pre className="bg-gray-900 text-gray-100 rounded-lg p-6 overflow-x-auto font-mono text-sm whitespace-pre-wrap">
                    {htmlToMarkdown(content)}
                  </pre>
                  <div className="mt-4 flex gap-2">
                    <Button onClick={copyAsMarkdown}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Markdown
                    </Button>
                  </div>
                </div>
              ) : (
                <iframe
                  id="doc-iframe"
                  srcDoc={highlightedContent}
                  className="w-full h-full border-0"
                  title={item.titulo}
                  sandbox="allow-same-origin allow-scripts"
                  onLoad={(e) => {
                    // Rastrear scroll para atualizar activeSection
                    const iframe = e.target;
                    if (iframe.contentWindow) {
                      iframe.contentWindow.addEventListener('scroll', () => {
                        const scrollPos = iframe.contentWindow.scrollY;
                        const sections = Array.from(iframe.contentWindow.document.querySelectorAll('h1, h2, h3'));
                        
                        for (let i = sections.length - 1; i >= 0; i--) {
                          if (sections[i].offsetTop <= scrollPos + 100) {
                            setActiveSection(sections[i].id);
                            break;
                          }
                        }
                      });
                    }
                  }}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6 bg-white rounded-lg max-w-md">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Visualização inline não disponível para este tipo de arquivo</p>
                <Button onClick={() => window.open(item.arquivo_url, '_blank')}>
                  <Download className="w-4 h-4 mr-2" />
                  Abrir em nova aba
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile TOC Drawer - Toggle */}
      {isHTML && toc.length > 0 && (
        <div className="lg:hidden fixed bottom-20 right-4 z-10">
          <Button 
            size="sm" 
            onClick={() => {
              const drawer = document.getElementById('mobile-toc-drawer');
              drawer?.classList.toggle('hidden');
            }}
            className="bg-purple-600 hover:bg-purple-700 shadow-2xl"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Índice ({toc.length})
          </Button>
        </div>
      )}

      {isHTML && toc.length > 0 && (
        <div id="mobile-toc-drawer" className="hidden lg:hidden fixed inset-x-0 bottom-0 bg-white rounded-t-xl shadow-2xl max-h-[50vh] overflow-y-auto z-20">
          <div className="p-4 border-b sticky top-0 bg-white flex items-center justify-between">
            <h4 className="font-bold text-gray-900">Nesta página</h4>
            <button onClick={() => document.getElementById('mobile-toc-drawer')?.classList.add('hidden')}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="p-2">
            {toc.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  scrollToSection(section.id);
                  document.getElementById('mobile-toc-drawer')?.classList.add('hidden');
                }}
                className={`w-full text-left px-3 py-2.5 rounded text-sm mb-1 ${
                  activeSection === section.id ? 'bg-purple-600 text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={{ paddingLeft: `${12 + (section.level - 1) * 16}px` }}
              >
                {section.text}
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}