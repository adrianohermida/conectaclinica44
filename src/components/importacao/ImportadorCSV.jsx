import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

export default function ImportadorCSV({ clinicaId, onSuccess }) {
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState("Contato");
  const [arquivo, setArquivo] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      return data.file_url;
    }
  });

  const criarJobMutation = useMutation({
    mutationFn: async (url) => {
      const job = await base44.entities.ImportacaoJob.create({
        clinica_id: clinicaId,
        tipo_entidade: tipo,
        arquivo_url: url,
        usuario_id: (await base44.auth.me()).id,
        usuario_nome: (await base44.auth.me()).full_name
      });

      // Iniciar processamento em background
      await base44.functions.invoke('processarImportacaoCSV', { job_id: job.id });
      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["importacao-jobs"]);
      toast.success("Importação iniciada! Acompanhe em Administração > Importações.");
      setArquivo(null);
      if (onSuccess) onSuccess();
    },
    onError: () => toast.error("Erro ao iniciar importação")
  });

  const handleImportar = async () => {
    if (!arquivo) return toast.error("Selecione um arquivo");
    
    try {
      const url = await uploadMutation.mutateAsync(arquivo);
      await criarJobMutation.mutateAsync(url);
    } catch (error) {
      toast.error("Erro");
    }
  };

  return (
    <Card>
      <div className="p-6 space-y-4">
        <h3 className="font-bold text-lg">Importar Dados (CSV/XLS)</h3>
        
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-bold mb-1">Formatos aceitos:</p>
              <ul className="list-disc list-inside text-xs">
                <li>CSV (vírgula, ponto-vírgula, tab)</li>
                <li>XLS/XLSX</li>
                <li>Processamento em background (lotes de 50)</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tipo de Dados</label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{zIndex:999999}}>
              <SelectItem value="Contato">Contatos</SelectItem>
              <SelectItem value="Produto">Produtos</SelectItem>
              <SelectItem value="Prontuario">Prontuários</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <input
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={(e) => setArquivo(e.target.files[0])}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="block">
            <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50">
              {arquivo ? (
                <>
                  <FileText className="w-12 h-12 mx-auto text-green-600 mb-2" />
                  <p className="font-medium">{arquivo.name}</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Clique ou arraste arquivo</p>
                </>
              )}
            </div>
          </label>
        </div>

        <Button
          onClick={handleImportar}
          disabled={!arquivo || uploadMutation.isLoading || criarJobMutation.isLoading}
          className="w-full"
        >
          {uploadMutation.isLoading || criarJobMutation.isLoading ? "Processando..." : "Importar"}
        </Button>
      </div>
    </Card>
  );
}