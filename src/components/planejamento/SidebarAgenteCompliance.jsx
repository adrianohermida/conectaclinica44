import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Send, Loader2, FileUp, Link as LinkIcon, Brain, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function SidebarAgenteCompliance({ aberto, onFechar }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    if (aberto && !conversationId) {
      iniciarConversa();
    }
  }, [aberto]);

  useEffect(() => {
    if (!conversationId) return;
    
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
    });
    
    return () => unsubscribe();
  }, [conversationId]);

  const iniciarConversa = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: "auditor_compliance_legislacao",
        metadata: {
          name: "Auditoria Legislação - Planejamento",
          tipo: "compliance_legislacao"
        }
      });
      setConversationId(conv.id);
    } catch (error) {
      toast.error('Erro ao iniciar: ' + error.message);
    }
  };

  const enviarMensagem = async () => {
    if (!inputText.trim() || !conversationId) return;
    
    setEnviando(true);
    try {
      const conv = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conv, {
        role: "user",
        content: inputText
      });
      setInputText("");
    } catch (error) {
      toast.error('Erro: ' + error.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const conv = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conv, {
        role: "user",
        content: `Analise este documento de legislação e identifique obrigações legais para os módulos:`,
        file_urls: [file_url]
      });
      
      toast.success('Documento enviado');
    } catch (error) {
      toast.error('Erro upload: ' + error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  if (!aberto) return null;

  return (
    <div className="fixed top-16 right-0 bottom-0 w-[500px] bg-white shadow-2xl z-[9998] flex flex-col border-l-4 border-purple-600">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <h3 className="font-bold text-lg">Auditor Compliance</h3>
          </div>
          <button onClick={onFechar} className="p-2 hover:bg-white/20 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs opacity-90">Upload PDF legislação | Links Repositório | Validação CFM/LGPD/CDC</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-8 px-4">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-sm font-bold text-gray-900 mb-2">Auditor Compliance Legislativo</p>
            <p className="text-xs text-gray-600 mb-6">
              Análise de conformidade CFM, LGPD, CDC e legislação vigente para módulos de software médico
            </p>
            
            <div className="space-y-2 text-left">
              <div className="p-3 rounded-lg bg-purple-50 border-l-4 border-purple-600">
                <p className="text-xs font-bold text-purple-900 mb-1">📄 Upload Legislação</p>
                <p className="text-xs text-purple-700">
                  PDFs: Resoluções CFM, LGPD, CDC, Código Ética Médica
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-600">
                <p className="text-xs font-bold text-blue-900 mb-1">🔗 Links Repositório</p>
                <p className="text-xs text-blue-700">
                  Compartilhe link de pasta/documento SuperAdmin para análise
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 border-l-4 border-green-600">
                <p className="text-xs font-bold text-green-900 mb-1">💬 Consulta Direta</p>
                <p className="text-xs text-green-700">
                  "Módulo X atende CFM 1643/2002?" ou "Gaps LGPD no Prontuário?"
                </p>
              </div>
            </div>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2 mb-2">
          <label className="flex-1">
            <input
              type="file"
              accept=".pdf,.html,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              variant="outline" 
              className="w-full" 
              disabled={uploadingFile || !conversationId}
              onClick={(e) => e.currentTarget.previousElementSibling.click()}
            >
              {uploadingFile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileUp className="w-4 h-4 mr-2" />}
              Upload PDF/HTML
            </Button>
          </label>
        </div>
        
        <div className="flex gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
            placeholder="Descrever módulo ou colar link Repositório..."
            disabled={!conversationId}
          />
          <Button onClick={enviarMensagem} disabled={enviando || !inputText.trim()}>
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
        isUser ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200'
      }`}>
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-purple">
            {message.content || '...'}
          </ReactMarkdown>
        )}
        
        {message.tool_calls?.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.tool_calls.map((tc, i) => (
              <div key={i} className="text-xs bg-purple-50 border border-purple-200 rounded p-2">
                <p className="font-bold text-purple-700">🔧 {tc.name}</p>
                {tc.status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-purple-500" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}