import React, { useMemo, useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  TrendingUp, 
  Activity, 
  Heart, 
  Weight, 
  FileText, 
  Calendar, 
  Video,
  Phone,
  Mail,
  MapPin,
  Clock,
  AlertCircle,
  ShoppingCart
} from "lucide-react";
const HistoricoCompras = lazy(() => import("@/components/paciente/HistoricoCompras"));
import { Card } from "@/components/ui/Card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardPaciente360({ paciente }) {
  const [tabAtiva, setTabAtiva] = useState('visao-geral');

  const { data: prontuarios = [] } = useQuery({
    queryKey: ['prontuarios-paciente', paciente.id],
    queryFn: () => base44.entities.Prontuario.filter({ paciente_id: paciente.id }, '-data_atendimento'),
    enabled: !!paciente.id
  });

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-paciente', paciente.id],
    queryFn: () => base44.entities.Agendamento.filter({ paciente_id: paciente.id }, '-data'),
    enabled: !!paciente.id
  });

  const { data: planosTratamento = [] } = useQuery({
    queryKey: ['planos-paciente', paciente.id],
    queryFn: () => base44.entities.PlanoTratamento.filter({ paciente_id: paciente.id }),
    enabled: !!paciente.id
  });

  const { data: jornada = [] } = useQuery({
    queryKey: ['jornada-paciente', paciente.id],
    queryFn: () => base44.entities.JornadaPaciente.filter({ paciente_id: paciente.id }),
    enabled: !!paciente.id
  });

  // Extrair dados de evolução dos prontuários
  const dadosEvolucao = useMemo(() => {
    const evolucaoPeso = [];
    const evolucaoPressao = [];
    
    (prontuarios || []).forEach(p => {
      const data = format(new Date(p.data_atendimento), "dd/MM");
      
      // Extrair peso dos sinais vitais
      if (p.sinais_vitais?.peso) {
        evolucaoPeso.push({ data, valor: p.sinais_vitais.peso });
      }
      
      // Extrair pressão
      if (p.sinais_vitais?.pressao_sistolica && p.sinais_vitais?.pressao_diastolica) {
        evolucaoPressao.push({ 
          data, 
          sistolica: p.sinais_vitais.pressao_sistolica,
          diastolica: p.sinais_vitais.pressao_diastolica
        });
      }
    });

    return { peso: evolucaoPeso.reverse(), pressao: evolucaoPressao.reverse() };
  }, [prontuarios]);

  // Timeline de eventos
  const timeline = useMemo(() => {
    const eventos = [];
    
    (prontuarios || []).forEach(p => {
      eventos.push({
        tipo: 'prontuario',
        data: new Date(p.data_atendimento),
        titulo: 'Atendimento Médico',
        descricao: `${p.medico_nome} - ${p.especialidade || 'Consulta'}`,
        icon: FileText,
        color: '#9334e9'
      });
    });

    (agendamentos || []).forEach(a => {
      if (a.status === 'confirmado' || a.status === 'agendado') {
        eventos.push({
          tipo: 'agendamento',
          data: new Date(a.data),
          titulo: 'Consulta Agendada',
          descricao: `${a.medico_nome} - ${a.especialidade || 'Consulta'}`,
          icon: Calendar,
          color: '#1a73e8'
        });
      }
    });

    (planosTratamento || []).forEach(p => {
      eventos.push({
        tipo: 'plano',
        data: new Date(p.data_inicio),
        titulo: 'Plano de Tratamento Iniciado',
        descricao: p.titulo,
        icon: Activity,
        color: '#34a853'
      });
    });

    return eventos.sort((a, b) => b.data - a.data).slice(0, 10);
  }, [prontuarios, agendamentos, planosTratamento]);

  // Estatísticas rápidas
  const stats = {
    totalAtendimentos: prontuarios.length,
    agendamentosFuturos: (agendamentos || []).filter(a => 
      new Date(a.data) > new Date() && a.status !== 'cancelado'
    ).length,
    planosAtivos: (planosTratamento || []).filter(p => p.status === 'ativo').length,
    ultimaConsulta: prontuarios[0] ? format(new Date(prontuarios[0].data_atendimento), "dd/MM/yyyy") : 'Nenhuma'
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { id: 'visao-geral', label: 'Visão Geral', icon: Activity },
          { id: 'compras', label: 'Compras', icon: ShoppingCart }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setTabAtiva(tab.id)}
            className="px-4 py-2 rounded-t-lg font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: tabAtiva === tab.id ? '#7E57FF' : 'transparent',
              color: tabAtiva === tab.id ? '#ffffff' : '#5f6368'
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {tabAtiva === 'compras' && (
        <Suspense fallback={<div className="text-center py-8">Carregando...</div>}>
          <HistoricoCompras paciente={paciente} />
        </Suspense>
      )}

      {tabAtiva === 'visao-geral' && (
        <>
      {/* Info Paciente */}
      <Card>
        <div className="p-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: '#7E57FF' }}>
              {paciente.nome_completo?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[#081828] mb-2">{paciente.nome_completo}</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  {paciente.telefone || 'Não informado'}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  {paciente.email || 'Não informado'}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {paciente.cidade || 'Não informado'}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  Última: {stats.ultimaConsulta}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <FileText className="w-8 h-8 mb-2" style={{ color: '#9334e9' }} />
            <div className="text-2xl font-bold text-[#081828]">{stats.totalAtendimentos}</div>
            <div className="text-xs text-gray-600">Atendimentos</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <Calendar className="w-8 h-8 mb-2" style={{ color: '#1a73e8' }} />
            <div className="text-2xl font-bold text-[#081828]">{stats.agendamentosFuturos}</div>
            <div className="text-xs text-gray-600">Agend. Futuros</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <Activity className="w-8 h-8 mb-2" style={{ color: '#34a853' }} />
            <div className="text-2xl font-bold text-[#081828]">{stats.planosAtivos}</div>
            <div className="text-xs text-gray-600">Planos Ativos</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <Heart className="w-8 h-8 mb-2" style={{ color: '#ea4335' }} />
            <div className="text-2xl font-bold text-[#081828]">
              {paciente.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </div>
            <div className="text-xs text-gray-600">Status</div>
          </div>
        </Card>
      </div>

      {/* Gráficos de Evolução */}
      <div className="grid lg:grid-cols-2 gap-6">
        {dadosEvolucao.peso.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#081828] mb-4 flex items-center gap-2">
                <Weight className="w-5 h-5" style={{ color: '#7E57FF' }} />
                Evolução de Peso
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dadosEvolucao.peso}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="data" style={{ fontSize: '11px' }} />
                  <YAxis style={{ fontSize: '11px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [`${value} kg`, 'Peso']}
                  />
                  <Line type="monotone" dataKey="valor" stroke="#7E57FF" strokeWidth={2} dot={{ fill: '#7E57FF', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {dadosEvolucao.pressao.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#081828] mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" style={{ color: '#ea4335' }} />
                Evolução de Pressão Arterial
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dadosEvolucao.pressao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="data" style={{ fontSize: '11px' }} />
                  <YAxis style={{ fontSize: '11px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Line type="monotone" dataKey="sistolica" stroke="#ea4335" strokeWidth={2} name="Sistólica" />
                  <Line type="monotone" dataKey="diastolica" stroke="#34a853" strokeWidth={2} name="Diastólica" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Timeline */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-bold text-[#081828] mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: '#7E57FF' }} />
            Histórico Recente
          </h3>
          <div className="space-y-4">
            {timeline.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Nenhum evento registrado</p>
              </div>
            ) : (
              timeline.map((evento, idx) => {
                const Icon = evento.icon;
                return (
                  <div key={idx} className="flex gap-4 relative">
                    {idx < timeline.length - 1 && (
                      <div className="absolute left-5 top-12 w-0.5 h-full bg-gray-200" />
                    )}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10" style={{ backgroundColor: `${evento.color}15` }}>
                      <Icon className="w-5 h-5" style={{ color: evento.color }} />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-[#081828] text-sm">{evento.titulo}</h4>
                          <p className="text-xs text-gray-600 mt-1">{evento.descricao}</p>
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-4">
                          {format(evento.data, "dd/MM/yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      {/* Módulos Integrados */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <div className="p-6 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#9334e9' }} />
            <h4 className="font-bold text-[#081828] mb-2">Prontuários</h4>
            <div className="text-3xl font-bold mb-2" style={{ color: '#9334e9' }}>{prontuarios.length}</div>
            <button className="text-xs font-medium hover:opacity-80" style={{ color: '#9334e9' }}>
              Ver todos →
            </button>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <Video className="w-12 h-12 mx-auto mb-3" style={{ color: '#1a73e8' }} />
            <h4 className="font-bold text-[#081828] mb-2">Telemedicina</h4>
            <div className="text-3xl font-bold mb-2" style={{ color: '#1a73e8' }}>
              {(agendamentos || []).filter(a => a.tipo_consulta === 'telemedicina').length}
            </div>
            <button className="text-xs font-medium hover:opacity-80" style={{ color: '#1a73e8' }}>
              Agendar online →
            </button>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <Activity className="w-12 h-12 mx-auto mb-3" style={{ color: '#34a853' }} />
            <h4 className="font-bold text-[#081828] mb-2">Planos Tratamento</h4>
            <div className="text-3xl font-bold mb-2" style={{ color: '#34a853' }}>{stats.planosAtivos}</div>
            <button className="text-xs font-medium hover:opacity-80" style={{ color: '#34a853' }}>
              Gerenciar →
            </button>
          </div>
        </Card>
      </div>

      {/* Jornada do Paciente */}
      {jornada.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-bold text-[#081828] mb-4">Jornada do Paciente</h3>
            <div className="space-y-3">
              {jornada.map(j => (
                <div key={j.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-[#081828] capitalize">{j.etapa_atual?.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {j.data_etapa ? format(new Date(j.data_etapa), "dd/MM/yyyy", { locale: ptBR }) : 'Em andamento'}
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-medium" style={{ 
                    backgroundColor: j.status === 'concluido' ? '#d1fae5' : '#f5f3ff',
                    color: j.status === 'concluido' ? '#065f46' : '#7E57FF'
                  }}>
                    {j.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Alertas */}
      {prontuarios.length === 0 && (
        <Card>
          <div className="p-6 bg-yellow-50 border-l-4 border-yellow-400">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">Nenhum prontuário registrado</h4>
                <p className="text-sm text-yellow-800">Crie o primeiro atendimento para começar o histórico médico do paciente.</p>
              </div>
            </div>
          </div>
        </Card>
      )}
        </>
      )}
    </div>
  );
}