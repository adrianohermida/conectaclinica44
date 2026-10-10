import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/input";
import { Mail, Search, Trash2, Eye, Archive, Tag } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function CaixaEntradaEmail() {
  return (
    <RouteGuard requireAuth requireClinica>
      <CaixaEntradaContent />
    </RouteGuard>
  );
}

function CaixaEntradaContent() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [emailSelecionado, setEmailSelecionado] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["emails-recebidos", user?.clinica_id],
    queryFn: async () => {
      return await base44.entities.EmailRecebido.filter({ 
        clinica_id: user.clinica_id 
      });
    },
    enabled: !!user?.clinica_id
  });

  const marcarComoLidoMutation = useMutation({
    mutationFn: (emailId) => base44.entities.EmailRecebido.update(emailId, { lido: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(["emails-recebidos"]);
    }
  });

  const excluirEmailMutation = useMutation({
    mutationFn: (emailId) => base44.entities.EmailRecebido.delete(emailId),
    onSuccess: () => {
      queryClient.invalidateQueries(["emails-recebidos"]);
      setEmailSelecionado(null);
      toast.success("Email excluído");
    }
  });

  const emailsFiltrados = emails
    .filter(e => filtroCategoria === "todos" || e.categoria === filtroCategoria)
    .filter(e => 
      e.assunto?.toLowerCase().includes(busca.toLowerCase()) ||
      e.de?.toLowerCase().includes(busca.toLowerCase())
    );

  const categoriaCores = {
    suporte: { bg: '#e8f1fb', text: '#1a73e8', label: 'Suporte' },
    agendamento: { bg: '#e6f7ed', text: '#34a853', label: 'Agendamento' },
    documentos: { bg: '#f5f3ff', text: '#7E57FF', label: 'Documentos' },
    financeiro: { bg: '#fef9e5', text: '#fbbc04', label: 'Financeiro' },
    spam: { bg: '#fde7e7', text: '#ea4335', label: 'Spam' },
    outro: { bg: '#f1f3f4', text: '#5f6368', label: 'Outro' }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Caixa de Entrada"
        description="Emails recebidos pela clínica"
        breadcrumbs={[{ label: "Emails" }]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lista de Emails */}
        <div className="lg:col-span-1 space-y-4">
          <div className="pc-card p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar emails..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 border-gray-300 rounded-xl min-h-[48px]"
              />
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              {Object.entries(categoriaCores).map(([cat, style]) => (
                <button
                  key={cat}
                  onClick={() => setFiltroCategoria(filtroCategoria === cat ? "todos" : cat)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: filtroCategoria === cat ? style.bg : '#f8f9fa',
                    color: filtroCategoria === cat ? style.text : '#80868b',
                    border: `1px solid ${filtroCategoria === cat ? style.text : '#e8eaed'}`
                  }}
                >
                  {style.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pc-scrollbar">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 mx-auto border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
                </div>
              ) : emailsFiltrados.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="pc-body-sm text-gray-500">Nenhum email</p>
                </div>
              ) : (
                emailsFiltrados.map(email => (
                  <button
                    key={email.id}
                    onClick={() => {
                      setEmailSelecionado(email);
                      if (!email.lido) {
                        marcarComoLidoMutation.mutate(email.id);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      emailSelecionado?.id === email.id ? 'bg-purple-50 border-purple-200' : 'hover:bg-gray-50'
                    } ${!email.lido ? 'border-l-4' : 'border'}`}
                    style={{
                      borderColor: !email.lido ? '#7E57FF' : '#e8eaed'
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className={`text-sm truncate ${!email.lido ? 'font-bold' : 'font-normal'}`} style={{ color: '#202124' }}>
                        {email.de}
                      </p>
                      <span className="pc-caption whitespace-nowrap">
                        {format(new Date(email.created_date), "dd/MM HH:mm")}
                      </span>
                    </div>
                    <p className={`text-sm truncate mb-2 ${!email.lido ? 'font-semibold' : ''}`} style={{ color: '#5f6368' }}>
                      {email.assunto}
                    </p>
                    {email.categoria && (
                      <span 
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: categoriaCores[email.categoria]?.bg,
                          color: categoriaCores[email.categoria]?.text
                        }}
                      >
                        {categoriaCores[email.categoria]?.label}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Visualização do Email */}
        <div className="lg:col-span-2">
          {emailSelecionado ? (
            <div className="pc-card p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="pc-heading-3 mb-2">{emailSelecionado.assunto}</h2>
                  <p className="pc-body-sm mb-1" style={{ color: '#5f6368' }}>
                    De: <strong>{emailSelecionado.de}</strong>
                  </p>
                  <p className="pc-caption" style={{ color: '#80868b' }}>
                    {format(new Date(emailSelecionado.created_date), "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => excluirEmailMutation.mutate(emailSelecionado.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="border-t pt-6" style={{ borderColor: '#e8eaed' }}>
                {emailSelecionado.corpo_html ? (
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: emailSelecionado.corpo_html }}
                  />
                ) : (
                  <p className="pc-body whitespace-pre-wrap" style={{ color: '#202124' }}>
                    {emailSelecionado.corpo_texto}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="pc-card p-12 text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="pc-body" style={{ color: '#80868b' }}>
                Selecione um email para visualizar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}