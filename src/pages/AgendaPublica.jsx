import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Clock, CheckCircle2, Loader2, Video, MapPin, Globe } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AgendaPublica() {
  const { clinicaId } = useParams();
  const [dataSelecionada, setDataSelecionada] = useState(null);
  const [horarioSelecionado, setHorarioSelecionado] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    observacoes: ''
  });

  const { data: config } = useQuery({
    queryKey: ['config-agenda-publica', clinicaId],
    queryFn: async () => {
      const configs = await base44.entities.ConfiguracaoAgendaOnline.filter({
        clinica_id: clinicaId,
        ativo: true
      });
      return configs[0];
    }
  });

  // Buscar dados da clínica para exibir
  const { data: clinica } = useQuery({
    queryKey: ['clinica-publica', clinicaId],
    queryFn: async () => {
      const clinicas = await base44.entities.Clinica.filter({ id: clinicaId });
      return clinicas[0];
    },
    enabled: !!clinicaId
  });

  const { data: slots, isLoading: loadingSlots } = useQuery({
    queryKey: ['slots-disponiveis', clinicaId, dataSelecionada],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDisponibilidadeAgenda', {
        clinica_id: clinicaId,
        data: format(dataSelecionada, 'yyyy-MM-dd')
      });
      return response.data.slots || [];
    },
    enabled: !!dataSelecionada
  });

  const agendarMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('criarAgendamentoPublico', {
        clinica_id: clinicaId,
        data: format(dataSelecionada, 'yyyy-MM-dd'),
        horario: horarioSelecionado,
        ...formData
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ Agendamento confirmado!');
      setShowConfirmDialog(false);
      // Reset
      setDataSelecionada(null);
      setHorarioSelecionado(null);
      setFormData({ nome: '', telefone: '', email: '', observacoes: '' });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao agendar');
    }
  });

  const corPrimaria = config?.cor_primaria || '#7E57FF';

  // Filtrar dias disponíveis
  const isDayAvailable = (date) => {
    if (!config) return false;
    const diaSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][date.getDay()];
    return config.dias_semana?.includes(diaSemana);
  };

  if (!config || !clinica) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: corPrimaria }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-5 min-h-screen">
          {/* Left: Info do Evento */}
          <div className="lg:col-span-2 p-8 lg:p-12 border-r border-gray-100">
            <div className="max-w-md">
              {/* Avatar + Nome */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: corPrimaria }}>
                  {clinica.nome?.charAt(0) || 'C'}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">{clinica.nome}</p>
                  <h1 className="text-xl font-bold text-gray-900">
                    Consulta Médica
                  </h1>
                </div>
              </div>

              {/* Badge Duração */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ backgroundColor: '#FEF9E5', border: '2px solid #FCD34D' }}>
                <Clock className="w-4 h-4 text-yellow-700" />
                <span className="text-sm font-semibold text-yellow-900">
                  Reunião de {config.duracao_padrao_minutos} minutos
                </span>
              </div>

              {/* Detalhes */}
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <Video className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Consulta presencial</p>
                    <p className="text-xs text-gray-500">Atendimento na clínica</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Horário de Brasília</p>
                    <p className="text-xs text-gray-500">America/Sao_Paulo (GMT-3)</p>
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div className="text-sm text-gray-600 leading-relaxed">
                <p>
                  Agende sua consulta médica com facilidade. Selecione o melhor dia e horário disponível.
                </p>
                <p className="mt-3">
                  Você receberá confirmação por WhatsApp e email imediatamente após o agendamento.
                </p>
              </div>

              {/* Cookie Notice (Calendly style) */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg text-xs text-gray-500">
                Utilizamos cookies e tecnologias semelhantes para melhorar sua experiência. Ao clicar em "Aceitar", você concorda com nossos <a href="/TermosUso" className="underline">Termos</a>.
              </div>
            </div>
          </div>

          {/* Right: Calendário + Slots */}
          <div className="lg:col-span-3 p-8 lg:p-12">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Selecione Data e Horário
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Calendário */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-4">Escolha uma data</p>
                  <Calendar
                    mode="single"
                    selected={dataSelecionada}
                    onSelect={setDataSelecionada}
                    disabled={(date) => {
                      const hoje = new Date();
                      hoje.setHours(0, 0, 0, 0);
                      return date < hoje || !isDayAvailable(date);
                    }}
                    locale={ptBR}
                    className="rounded-lg border shadow-sm"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-semibold",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-100/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md transition-colors",
                      day_selected: "text-white hover:bg-opacity-90 focus:bg-opacity-90",
                      day_today: "bg-gray-100 text-gray-900 font-semibold",
                      day_outside: "text-gray-400 opacity-50",
                      day_disabled: "text-gray-400 opacity-30 line-through",
                      day_hidden: "invisible"
                    }}
                    styles={{
                      day_selected: { backgroundColor: corPrimaria }
                    }}
                  />
                </div>

                {/* Slots */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-4">
                    {dataSelecionada 
                      ? format(dataSelecionada, "EEEE, d 'de' MMMM", { locale: ptBR })
                      : 'Selecione uma data'}
                  </p>
                  
                  {!dataSelecionada ? (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                      <div className="text-center">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Escolha uma data ao lado</p>
                      </div>
                    </div>
                  ) : loadingSlots ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : slots?.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                      <div className="text-center">
                        <p className="text-sm">Nenhum horário disponível</p>
                        <p className="text-xs mt-1">Tente outra data</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {slots?.map(slot => (
                        <button
                          key={slot.horario}
                          onClick={() => {
                            setHorarioSelecionado(slot.horario);
                            setShowConfirmDialog(true);
                          }}
                          className="w-full text-left px-4 py-3 rounded-lg border-2 hover:border-blue-500 transition-all font-medium"
                          style={{ 
                            borderColor: horarioSelecionado === slot.horario ? corPrimaria : '#e5e7eb',
                            backgroundColor: horarioSelecionado === slot.horario ? `${corPrimaria}10` : 'white'
                          }}
                        >
                          {slot.horario}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirme seu agendamento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Resumo */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">
                  {dataSelecionada && format(dataSelecionada, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">{horarioSelecionado}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-600" />
                <span className="text-sm">Horário de Brasília</span>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone/WhatsApp *
                </label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  placeholder="Motivo da consulta, sintomas..."
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                  rows={2}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => agendarMutation.mutate()}
                disabled={!formData.nome || !formData.email || !formData.telefone || agendarMutation.isPending}
                className="flex-1"
                style={{ backgroundColor: corPrimaria }}
              >
                {agendarMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}