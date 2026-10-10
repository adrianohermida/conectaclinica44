import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Send, Trash2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";
import PageHeader from "@/components/ui/PageHeader";

export default function GestaoNewsletter() {
  usePerformanceTracker('/GestaoNewsletter');
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 80);
    return () => clearTimeout(timer);
  }, []);

  const { data: inscritos = [], isLoading } = useOptimizedQuery({
    queryKey: ['newsletter'],
    queryFn: () => base44.entities.Newsletter.list('-created_date')
  });

  const enviarBoletim = useMutation({
    mutationFn: () => base44.functions.invoke('enviarBoletimNewsletter', { assunto, corpo }),
    onSuccess: (res) => {
      toast.success(`Boletim enviado para ${res.data.enviados} inscritos!`);
      setAssunto("");
      setCorpo("");
    }
  });

  const removerInscrito = useMutation({
    mutationFn: (id) => base44.entities.Newsletter.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['newsletter']);
      toast.success("Inscrito removido");
    }
  });

  const exportarCSV = () => {
    const csv = "Email,Nome,Data\n" + inscritos.map(i => 
      `${i.email},${i.nome || ''},${i.created_date}`
    ).join("\n");
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newsletter-inscritos.csv';
    a.click();
  };

  if (pageLoading || isLoading) {
    return (
      <RouteGuard requireAuth={true} requireClinica={false}>
        <div className="max-w-6xl mx-auto space-y-6 overflow-x-hidden animate-pulse">
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            <div className="h-8 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-5 bg-gray-200 rounded w-64" />
          </div>
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            <div className="space-y-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={false}>
      <div className="max-w-6xl mx-auto space-y-5 md:space-y-6 overflow-x-hidden min-w-0">
      <PageHeader
        title="Newsletter"
        description="Gestão de inscritos"
        action={
          <button onClick={exportarCSV} aria-label="Exportar lista de inscritos" className="font-bold px-4 rounded-xl hover:bg-gray-50 border min-h-[48px] inline-flex items-center gap-2" style={{ borderColor: '#e8eaed', color: '#5f6368', fontSize: '14px' }}>
            <Download className="w-4 h-4 flex-shrink-0" />
            Exportar
          </button>
        }
      />

      <div className="bg-white rounded-2xl p-6 border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <h2 className="font-bold mb-4 break-words" style={{ color: '#202124', fontSize: '20px' }}>Enviar Boletim</h2>
        <div className="space-y-4 overflow-hidden">
          <Input
            placeholder="Assunto do email"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            aria-label="Assunto do boletim"
            className="border-gray-300 rounded-xl min-h-[48px]"
            style={{ fontSize: '16px' }}
          />
          <textarea
            placeholder="Corpo do email"
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            aria-label="Conteúdo do boletim"
            className="w-full border rounded-xl px-4 py-3 min-h-[200px] focus:outline-none resize-none"
            style={{ fontSize: '16px', borderColor: '#e8eaed', color: '#202124' }}
          />
          <button
            onClick={() => enviarBoletim.mutate()}
            disabled={!assunto || !corpo || enviarBoletim.isPending}
            aria-label="Enviar boletim para inscritos"
            className="font-bold rounded-full hover:opacity-90 disabled:opacity-50 min-h-[56px] flex items-center justify-center gap-2"
            style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '16px' }}
          >
            <Send className="w-5 h-5 inline flex-shrink-0" />
            {enviarBoletim.isPending ? 'Enviando...' : `Enviar para ${inscritos.length} inscritos`}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <h2 className="font-bold mb-4 break-words" style={{ color: '#202124', fontSize: '20px' }}>
          Inscritos ({inscritos.length})
        </h2>
        <div className="space-y-2 overflow-hidden">
          {inscritos.map(i => (
            <div key={i.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl border min-h-[56px] gap-2 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="min-w-0 flex-1">
                <p className="font-bold truncate" style={{ color: '#202124', fontSize: '14px' }}>{i.email}</p>
                {i.nome && <p className="truncate" style={{ color: '#80868b', fontSize: '13px' }}>{i.nome}</p>}
              </div>
              <button
                onClick={() => removerInscrito.mutate(i.id)}
                aria-label="Remover inscrito"
                className="p-2 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] inline-flex items-center justify-center flex-shrink-0"
                style={{ color: '#ea4335' }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      </div>
    </RouteGuard>
  );
}