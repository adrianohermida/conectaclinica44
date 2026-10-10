import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, TrendingUp, Clock, MessageSquare, DollarSign, Users, CheckCircle, XCircle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function DashboardAutoResposta({ clinicaId }) {
  const { data: mensagens = [] } = useQuery({
    queryKey: ['mensagens-analytics', clinicaId],
    queryFn: () => base44.entities.MensagemTicket.filter({ clinica_id: clinicaId }),
    enabled: !!clinicaId,
    staleTime: 2 * 60 * 1000
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets-analytics', clinicaId],
    queryFn: () => base44.entities.Ticket.filter({ clinica_id: clinicaId, canal: 'widget' }),
    enabled: !!clinicaId,
    staleTime: 2 * 60 * 1000
  });

  // Métricas Absolutas
  const totalMensagens = mensagens.length;
  const autoRespostas = mensagens.filter(m => m.resposta_automatica === true).length;
  const mensagensUsuario = mensagens.filter(m => m.remetente_tipo === 'cliente').length;
  const mensagensEquipe = mensagens.filter(m => m.remetente_tipo === 'equipe').length;

  // Taxa Auto-resposta
  const taxaAutoResposta = mensagensUsuario > 0 ? ((autoRespostas / mensagensUsuario) * 100).toFixed(1) : 0;

  // Tickets com/sem intervenção humana
  const ticketsComAutoResposta = tickets.filter(t => {
    const msgsTicket = mensagens.filter(m => m.ticket_id === t.id);
    return msgsTicket.some(m => m.resposta_automatica === true) && !msgsTicket.some(m => m.remetente_tipo === 'equipe');
  }).length;
  
  const ticketsResolvidosSemHumano = ((ticketsComAutoResposta / (tickets.length || 1)) * 100).toFixed(1);

  // Economia estimada (assumindo custo médio de R$5/atendimento manual)
  const custoAtendimentoManual = 5;
  const economiaEstimada = ticketsComAutoResposta * custoAtendimentoManual;

  // Dados temporais (últimos 7 dias)
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  
  const dadosDiarios = Array.from({ length: 7 }, (_, i) => {
    const data = new Date();
    data.setDate(data.getDate() - (6 - i));
    const dataStr = data.toISOString().split('T')[0];
    
    const msgsData = mensagens.filter(m => m.created_date?.startsWith(dataStr));
    const autoData = msgsData.filter(m => m.resposta_automatica === true).length;
    const usuarioData = msgsData.filter(m => m.remetente_tipo === 'cliente').length;
    const equipeData = msgsData.filter(m => m.remetente_tipo === 'equipe').length;
    
    return {
      dia: data.toLocaleDateString('pt-BR', { weekday: 'short' }),
      auto: autoData,
      usuario: usuarioData,
      equipe: equipeData
    };
  });

  // Distribuição de respostas
  const distribuicao = [
    { name: 'Auto-resposta', value: autoRespostas, color: '#8b5cf6' },
    { name: 'Equipe', value: mensagensEquipe, color: '#3b82f6' },
    { name: 'Aguardando', value: Math.max(0, mensagensUsuario - autoRespostas - mensagensEquipe), color: '#f59e0b' }
  ];

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="pc-card p-5 border-l-4" style={{ borderColor: '#8b5cf6' }}>
          <div className="flex items-center justify-between mb-2">
            <Brain className="w-8 h-8 text-purple-600" />
            <span className="text-3xl font-bold text-purple-600">{taxaAutoResposta}%</span>
          </div>
          <p className="text-sm font-medium text-gray-700">Taxa Auto-resposta</p>
          <p className="text-xs text-gray-500 mt-1">{autoRespostas} de {mensagensUsuario} mensagens</p>
        </div>

        <div className="pc-card p-5 border-l-4" style={{ borderColor: '#34a853' }}>
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-bold text-green-600">{ticketsResolvidosSemHumano}%</span>
          </div>
          <p className="text-sm font-medium text-gray-700">Resolvidos sem Humano</p>
          <p className="text-xs text-gray-500 mt-1">{ticketsComAutoResposta} de {tickets.length} tickets</p>
        </div>

        <div className="pc-card p-5 border-l-4" style={{ borderColor: '#1a73e8' }}>
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-bold text-blue-600">&lt;1s</span>
          </div>
          <p className="text-sm font-medium text-gray-700">Tempo Resposta IA</p>
          <p className="text-xs text-gray-500 mt-1">Instantâneo (média)</p>
        </div>

        <div className="pc-card p-5 border-l-4" style={{ borderColor: '#fbbc04' }}>
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-yellow-600" />
            <span className="text-3xl font-bold text-yellow-600">R$ {economiaEstimada}</span>
          </div>
          <p className="text-sm font-medium text-gray-700">Economia Estimada</p>
          <p className="text-xs text-gray-500 mt-1">vs atendimento manual (7d)</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Temporal */}
        <div className="pc-card p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Evolução Últimos 7 Dias
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dadosDiarios}>
              <XAxis dataKey="dia" stroke="#9aa0a6" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9aa0a6" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e8eaed',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Line type="monotone" dataKey="auto" stroke="#8b5cf6" strokeWidth={2} name="Auto-resposta" />
              <Line type="monotone" dataKey="equipe" stroke="#3b82f6" strokeWidth={2} name="Equipe" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição de Respostas */}
        <div className="pc-card p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Distribuição de Respostas
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={distribuicao}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {distribuicao.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4 text-xs">
            {distribuicao.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Volume Diário */}
      <div className="pc-card p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-700" />
          Volume de Mensagens por Dia
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dadosDiarios}>
            <XAxis dataKey="dia" stroke="#9aa0a6" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9aa0a6" style={{ fontSize: '12px' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e8eaed',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Bar dataKey="usuario" fill="#9aa0a6" name="Usuários" />
            <Bar dataKey="auto" fill="#8b5cf6" name="Auto-resposta" />
            <Bar dataKey="equipe" fill="#3b82f6" name="Equipe" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Alertas e Recomendações */}
      {totalMensagens === 0 && (
        <div className="pc-card p-6 bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-1">Aguardando Dados</p>
              <p className="text-sm text-blue-700">
                Assim que houver interações no widget, as métricas de auto-resposta aparecerão aqui. Configure FAQs na aba "Conteúdo" para melhorar a taxa de resolução automática.
              </p>
            </div>
          </div>
        </div>
      )}

      {taxaAutoResposta < 20 && autoRespostas > 0 && (
        <div className="pc-card p-6 bg-yellow-50 border border-yellow-200">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900 mb-1">Taxa de Auto-resposta Baixa</p>
              <p className="text-sm text-yellow-700">
                Apenas {taxaAutoResposta}% das mensagens estão sendo respondidas automaticamente. Considere adicionar mais FAQs para perguntas comuns e validar a qualidade das respostas atuais.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}