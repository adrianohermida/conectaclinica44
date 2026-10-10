import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, Video, User, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AgendamentoOnline({ pacienteData }) {
  const queryClient = useQueryClient();
  const [etapa, setEtapa] = useState(1);
  const [formData, setFormData] = useState({
    paciente_id: pacienteData?.id || "",
    paciente_nome: pacienteData?.nome_completo || "",
    paciente_email: pacienteData?.email || "",
    data: "",
    horario: "",
    tipo_consulta: "presencial",
    especialidade: "medicina_integrativa",
    medico: "",
    observacoes: "",
    status: "agendado"
  });

  const { data: user } = useQuery({
    queryKey: ["portal-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const { data: medicos = [] } = useQuery({
    queryKey: ["medicos", user?.clinica_id],
    queryFn: () => user?.clinica_id ? base44.entities.Medico.filter({ clinica_id: user.clinica_id }) : [],
    enabled: !!user?.clinica_id,
    staleTime: 10 * 60 * 1000
  });

  const { data: agendamentos = [] } = useQuery({
    queryKey: ["agendamentos", user?.clinica_id],
    queryFn: () => user?.clinica_id ? base44.entities.Agendamento.filter({ clinica_id: user.clinica_id }) : [],
    enabled: !!user?.clinica_id,
    staleTime: 2 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Agendamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["agendamentos"]);
      setEtapa(4);
    }
  });

  const proximosDias = useMemo(() => {
    const dias = [];
    for (let i = 1; i <= 14; i++) {
      const dia = addDays(new Date(), i);
      if (dia.getDay() !== 0) {
        dias.push(dia);
      }
    }
    return dias;
  }, []);

  const horariosDisponiveis = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

  const horariosOcupados = useMemo(() => {
    if (!formData.data) return [];
    return agendamentos
      .filter(a => a.data === formData.data && a.status !== "cancelado")
      .map(a => a.horario);
  }, [agendamentos, formData.data]);

  const handleSubmit = async () => {
    if (!formData.data || !formData.horario) {
      alert("Selecione data e horário");
      return;
    }
    
    const user = await base44.auth.me();
    const payload = {
      ...formData,
      clinica_id: user.clinica_id
    };
    
    createMutation.mutate(payload);
  };

  if (etapa === 4) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Agendamento Confirmado!</h2>
        <div className="bg-blue-50 rounded-lg p-6 max-w-md mx-auto border border-blue-200">
          <p className="text-gray-700 mb-2">
            <strong>{formData.tipo_consulta === "telemedicina" ? "Consulta Virtual" : "Consulta Presencial"}</strong>
          </p>
          <p className="text-gray-700">
            {format(new Date(formData.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <p className="text-gray-700">{formData.horario}</p>
          <p className="text-gray-700 mt-2">Dr(a). {formData.medico}</p>
        </div>
        <p className="text-sm text-gray-600 mt-6">
          Você receberá um lembrete 24h antes da consulta
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex items-center flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              etapa >= num ? "bg-[#0B7A9E] text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {num}
            </div>
            {num < 3 && (
              <div className={`flex-1 h-1 mx-2 ${etapa > num ? "bg-[#0B7A9E]" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Etapa 1: Tipo de Consulta */}
      {etapa === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Tipo de Consulta</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => setFormData({ ...formData, tipo_consulta: "presencial" })}
              className={`p-6 rounded-lg border-2 ${
                formData.tipo_consulta === "presencial"
                  ? "border-[#0B7A9E] bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <MapPin className={`w-12 h-12 mx-auto mb-3 ${
                formData.tipo_consulta === "presencial" ? "text-[#0B7A9E]" : "text-gray-400"
              }`} />
              <p className="font-bold text-gray-800">Presencial</p>
              <p className="text-sm text-gray-600 mt-1">Na clínica</p>
            </button>
            <button
              onClick={() => setFormData({ ...formData, tipo_consulta: "telemedicina" })}
              className={`p-6 rounded-lg border-2 ${
                formData.tipo_consulta === "telemedicina"
                  ? "border-[#0B7A9E] bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <Video className={`w-12 h-12 mx-auto mb-3 ${
                formData.tipo_consulta === "telemedicina" ? "text-[#0B7A9E]" : "text-gray-400"
              }`} />
              <p className="font-bold text-gray-800">Telemedicina</p>
              <p className="text-sm text-gray-600 mt-1">Por vídeo</p>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Especialidade</label>
            <Select
              value={formData.especialidade}
              onValueChange={(value) => setFormData({ ...formData, especialidade: value })}
            >
              <SelectTrigger className="border border-gray-300 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medicina_integrativa">Medicina Integrativa</SelectItem>
                <SelectItem value="clinica_geral">Clínica Geral</SelectItem>
                <SelectItem value="medicina_preventiva">Medicina Preventiva</SelectItem>
                <SelectItem value="home_care">Home Care</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => setEtapa(2)}
            className="w-full bg-[#0B7A9E] hover:bg-[#0a6582] text-white py-3"
          >
            Continuar
          </Button>
        </div>
      )}

      {/* Etapa 2: Data e Horário */}
      {etapa === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Selecione Data e Horário</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {proximosDias.map((dia) => {
                const dataStr = format(dia, "yyyy-MM-dd");
                return (
                  <button
                    key={dataStr}
                    type="button"
                    onClick={() => setFormData({ ...formData, data: dataStr, horario: "" })}
                    className={`p-3 rounded-lg border text-sm ${
                      formData.data === dataStr
                        ? "border-[#0B7A9E] bg-blue-50 text-[#0B7A9E]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-bold">{format(dia, "dd/MM")}</p>
                    <p className="text-xs">{format(dia, "EEE", { locale: ptBR })}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {formData.data && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horário</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {horariosDisponiveis.map((horario) => {
                  const ocupado = horariosOcupados.includes(horario);
                  return (
                    <button
                      key={horario}
                      type="button"
                      onClick={() => !ocupado && setFormData({ ...formData, horario })}
                      disabled={ocupado}
                      className={`p-3 rounded-lg border text-sm font-medium ${
                        ocupado
                          ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                          : formData.horario === horario
                          ? "border-[#0B7A9E] bg-blue-50 text-[#0B7A9E]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {horario}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => setEtapa(1)}
              variant="outline"
              className="flex-1 border border-gray-300"
            >
              Voltar
            </Button>
            <Button
              onClick={() => setEtapa(3)}
              disabled={!formData.data || !formData.horario}
              className="flex-1 bg-[#0B7A9E] hover:bg-[#0a6582] text-white"
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Etapa 3: Confirmação */}
      {etapa === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Confirme seu Agendamento</h3>
          
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 space-y-3">
            <div className="flex items-center gap-3">
              {formData.tipo_consulta === "telemedicina" ? (
                <Video className="w-5 h-5 text-[#0B7A9E]" />
              ) : (
                <MapPin className="w-5 h-5 text-[#0B7A9E]" />
              )}
              <p className="text-gray-700">
                <strong>Tipo:</strong> {formData.tipo_consulta === "telemedicina" ? "Consulta Virtual" : "Consulta Presencial"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#0B7A9E]" />
              <p className="text-gray-700">
                <strong>Data:</strong> {format(new Date(formData.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#0B7A9E]" />
              <p className="text-gray-700">
                <strong>Horário:</strong> {formData.horario}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-[#0B7A9E]" />
              <p className="text-gray-700">
                <strong>Especialidade:</strong> {formData.especialidade.replace(/_/g, " ")}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações (opcional)</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 resize-none"
              rows="3"
              placeholder="Motivo da consulta ou informações adicionais..."
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setEtapa(2)}
              variant="outline"
              className="flex-1 border border-gray-300"
            >
              Voltar
            </Button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex-1 bg-[#0B7A9E] hover:bg-[#0a6582] text-white py-3 rounded-lg font-medium"
            >
              {createMutation.isPending ? "Agendando..." : "Confirmar Agendamento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}