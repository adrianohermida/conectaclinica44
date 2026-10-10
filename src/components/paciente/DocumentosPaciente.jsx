import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { FileText, Upload, Download, Trash2, Share2, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Input } from "@/components/ui/input";

export default function DocumentosPaciente({ pacienteId }) {
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ["documentos", pacienteId],
    queryFn: () => base44.entities.DocumentoPaciente.filter({ paciente_id: pacienteId }, "-created_date", 100),
    enabled: !!pacienteId
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentoPaciente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["documentos", pacienteId]);
      toast.success("Documento excluído!");
    }
  });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setTitulo(e.dataTransfer.files[0].name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!file || !titulo) {
      toast.error("Selecione um arquivo e informe o título");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 10MB");
      return;
    }
    
    setUploading(true);
    try {
      const user = await base44.auth.me();
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      if (!uploadResult?.file_url) {
        throw new Error("URL do arquivo não retornada");
      }

      // Buscar dados do paciente
      const [paciente] = await base44.entities.Contato.filter({ id: pacienteId });

      await base44.entities.DocumentoPaciente.create({
        clinica_id: user.clinica_id,
        paciente_id: pacienteId,
        paciente_nome: paciente?.nome_completo || "Paciente",
        nome_arquivo: file.name,
        arquivo_url: uploadResult.file_url,
        tipo_documento: file.type.includes('pdf') ? 'laudo_medico' : 'documento_geral',
        tamanho_bytes: file.size,
        extensao: file.name.split('.').pop(),
        data_upload: new Date().toISOString().split('T')[0],
        descricao: titulo,
        analisado_ia: false
      });
      
      queryClient.invalidateQueries(["documentos", pacienteId]);
      toast.success("Documento enviado com sucesso!");
      setShowUpload(false);
      setFile(null);
      setTitulo("");
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error(error.message || "Erro ao enviar documento");
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <div className="text-sm" style={{ color: "#5f6368" }}>Carregando documentos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="pc-heading-4">Documentos do Paciente</h3>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="w-4 h-4 mr-2" /> Upload
        </Button>
      </div>

      {documentos.length === 0 ? (
        <div className="pc-card p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-3" style={{ color: 'var(--pc-gray-300)' }} />
          <p className="pc-body-sm">Nenhum documento enviado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documentos.map(doc => (
            <div key={doc.id} className="pc-card p-4 hover:pc-card-elevated transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5" style={{ color: 'var(--pc-primary)' }} />
                    <span className="pc-body font-bold">{doc.titulo}</span>
                  </div>
                  <p className="pc-caption">
                    Enviado em {format(new Date(doc.created_date), "dd/MM/yyyy HH:mm")}
                  </p>
                  {doc.tamanho_bytes && (
                    <p className="pc-caption mt-1">
                      {(doc.tamanho_bytes / 1024).toFixed(2)} KB
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => window.open(doc.arquivo_url, "_blank")}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => {
                    navigator.clipboard.writeText(doc.arquivo_url);
                    toast.success("Link copiado!");
                  }}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => {
                    if (confirm("Excluir documento?")) deleteMutation.mutate(doc.id);
                  }}>
                    <Trash2 className="w-4 h-4" style={{ color: 'var(--pc-error)' }} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SlideInPanel open={showUpload} onClose={() => setShowUpload(false)} title="Upload de Documento">
        <div className="space-y-5">
          {/* DRAG & DROP ZONE - AREA COMPLETA */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`pc-card p-8 text-center cursor-pointer transition-all relative ${
              dragActive ? "pc-card-elevated" : ""
            }`}
            style={{
              backgroundColor: dragActive ? 'var(--pc-primary-50)' : 'var(--pc-bg-tertiary)',
              borderColor: dragActive ? 'var(--pc-primary)' : 'var(--pc-border-secondary)',
              borderStyle: "dashed",
              borderWidth: "2px",
              minHeight: "180px"
            }}
          >
            {/* INPUT INVISÍVEL MAS CLICÁVEL EM TODA ÁREA */}
            <div className="absolute inset-0 flex items-center justify-center flex-col" onClick={() => inputRef.current?.click()}>
              <input
                ref={inputRef}
                type="file"
                onChange={(e) => {
                  if (e.target.files[0]) {
                    setFile(e.target.files[0]);
                    setTitulo(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                  }
                }}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
              />
              <Upload className="w-12 h-12 mb-3 pointer-events-none" style={{ color: dragActive ? 'var(--pc-primary)' : 'var(--pc-gray-400)' }} />
              <p className="pc-body font-bold mb-1 pointer-events-none">
                {dragActive ? "Solte o arquivo aqui" : "Arraste e solte ou clique para selecionar"}
              </p>
              <p className="pc-caption pointer-events-none">PDF, DOC, DOCX, JPG, PNG (máx 10MB)</p>
            </div>
          </div>

          {file && (
            <div className="pc-card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="w-6 h-6 flex-shrink-0" style={{ color: "#7E57FF" }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: "#202124" }}>{file.name}</p>
                  <p className="text-xs" style={{ color: "#80868b" }}>{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "#202124" }}>Título do Documento *</label>
            <Input 
              placeholder="Ex: Exame de Sangue - Janeiro 2025" 
              value={titulo} 
              onChange={e => setTitulo(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => {
              setShowUpload(false);
              setFile(null);
              setTitulo("");
            }} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={uploading || !file || !titulo}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Documento
                </>
              )}
            </Button>
          </div>
        </div>
      </SlideInPanel>
    </div>
  );
}