import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar, Clock, Settings, Code, Eye, Copy, CheckCircle2,
  ExternalLink, AlertCircle, Zap, TrendingUp
} from "lucide-react";
import toast from "react-hot-toast";

export default function AgendaOnline() {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['agenda-online-config', user?.clinica_id],
    queryFn: async () => {
      const configs = await base44.entities.ConfiguracaoAgendaOnline.filter({
        clinica_id: user.clinica_id
      });
      return configs[0] || null;
    },
    enabled: !!user?.clinica_id
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (config?.id) {
        return base44.entities.ConfiguracaoAgendaOnline.update(config.id, data);
      } else {
        return base44.entities.ConfiguracaoAgendaOnline.create({
          clinica_id: user.clinica_id,
          ...data
        });
      }
    },
    onSuccess: () => {
      toast.success("Configuração salva!");
      queryClient.invalidateQueries(['agenda-online-config']);
    }
  });

  const [formData, setFormData] = useState({
    cor_primaria: config?.cor_primaria || '#7E57FF',
    duracao_padrao_minutos: config?.duracao_padrao_minutos || 30,
    horario_inicio: config?.horario_inicio || '09:00',
    horario_fim: config?.horario_fim || '18:00',
    intervalo_minutos: config?.intervalo_minutos || 30,
    dias_semana: config?.dias_semana || ['seg', 'ter', 'qua', 'qui', 'sex'],
    confirmacao_automatica: config?.confirmacao_automatica ?? true,
    campos_obrigatorios: config?.campos_obrigatorios || ['nome', 'telefone', 'email']
  });

  React.useEffect(() => {
    if (config) {
      setFormData({
        cor_primaria: config.cor_primaria || '#7E57FF',
        duracao_padrao_minutos: config.duracao_padrao_minutos || 30,
        horario_inicio: config.horario_inicio || '09:00',
        horario_fim: config.horario_fim || '18:00',
        intervalo_minutos: config.intervalo_minutos || 30,
        dias_semana: config.dias_semana || ['seg', 'ter', 'qua', 'qui', 'sex'],
        confirmacao_automatica: config.confirmacao_automatica ?? true,
        campos_obrigatorios: config.campos_obrigatorios || ['nome', 'telefone', 'email']
      });
    }
  }, [config]);

  const embedCode = `<!-- ConectaClínica Agenda Online -->
<div id="conecta-agenda-widget"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/widget-agenda.js';
    script.async = true;
    script.onload = function() {
      ConectaAgenda.init({
        clinicaId: '${user?.clinica_id}',
        theme: '${formData.cor_primaria}'
      });
    };
    document.head.appendChild(script);
  })();
</script>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const diasSemana = [
    { id: 'seg', label: 'Segunda' },
    { id: 'ter', label: 'Terça' },
    { id: 'qua', label: 'Quarta' },
    { id: 'qui', label: 'Quinta' },
    { id: 'sex', label: 'Sexta' },
    { id: 'sab', label: 'Sábado' },
    { id: 'dom', label: 'Domingo' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda Online Pública"
        description="Widget de agendamento para seu site - conversão de visitantes em pacientes"
        breadcrumbs={[
          { label: "Administração", url: "/Administracao" },
          { label: "Agenda Online" }
        ]}
      />

      {/* Hero ROI */}
      <div className="pc-card p-6 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Converta 30-50% dos visitantes em agendamentos
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Sem fricção</p>
                <p className="font-semibold text-gray-900">Zero login necessário</p>
              </div>
              <div>
                <p className="text-gray-500">Disponibilidade real</p>
                <p className="font-semibold text-gray-900">Sync com sua agenda</p>
              </div>
              <div>
                <p className="text-gray-500">Confirmação automática</p>
                <p className="font-semibold text-gray-900">Email + WhatsApp</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">
            <Settings className="w-4 h-4 mr-2" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="embed">
            <Code className="w-4 h-4 mr-2" />
            Código Embed
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <div className="pc-card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Aparência</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor Primária
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.cor_primaria}
                    onChange={(e) => setFormData({...formData, cor_primaria: e.target.value})}
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={formData.cor_primaria}
                    onChange={(e) => setFormData({...formData, cor_primaria: e.target.value})}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pc-card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Disponibilidade</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horário Início
                </label>
                <Input
                  type="time"
                  value={formData.horario_inicio}
                  onChange={(e) => setFormData({...formData, horario_inicio: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horário Fim
                </label>
                <Input
                  type="time"
                  value={formData.horario_fim}
                  onChange={(e) => setFormData({...formData, horario_fim: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duração Padrão (min)
                </label>
                <Input
                  type="number"
                  value={formData.duracao_padrao_minutos}
                  onChange={(e) => setFormData({...formData, duracao_padrao_minutos: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intervalo (min)
                </label>
                <Input
                  type="number"
                  value={formData.intervalo_minutos}
                  onChange={(e) => setFormData({...formData, intervalo_minutos: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dias da Semana
              </label>
              <div className="flex flex-wrap gap-2">
                {diasSemana.map(dia => (
                  <label key={dia.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.dias_semana?.includes(dia.id)}
                      onChange={(e) => {
                        const newDias = e.target.checked
                          ? [...(formData.dias_semana || []), dia.id]
                          : formData.dias_semana.filter(d => d !== dia.id);
                        setFormData({...formData, dias_semana: newDias});
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{dia.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="pc-card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Confirmação</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.confirmacao_automatica}
                onChange={(e) => setFormData({...formData, confirmacao_automatica: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">Confirmação automática (Email + WhatsApp)</span>
            </label>
          </div>

          <Button
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </TabsContent>

        <TabsContent value="embed">
          <div className="pc-card p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Código de Integração</h3>
              <p className="text-sm text-gray-600 mb-4">
                Cole este código no seu site, antes do fechamento da tag <code>&lt;/body&gt;</code>
              </p>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                  {embedCode}
                </pre>
                <Button
                  size="sm"
                  onClick={copyEmbed}
                  className="absolute top-2 right-2"
                  variant="ghost"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-2 p-4 bg-blue-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">URL direta do widget:</p>
                <a
                  href={`${window.location.origin}/agenda-publica/${user?.clinica_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  {window.location.origin}/agenda-publica/{user?.clinica_id}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div className="pc-card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Preview do Widget</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 min-h-[500px] bg-gray-50">
              <iframe
                src={`/agenda-publica/${user?.clinica_id}`}
                className="w-full h-[600px] border-0 rounded-lg bg-white"
                title="Preview Agenda Online"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}