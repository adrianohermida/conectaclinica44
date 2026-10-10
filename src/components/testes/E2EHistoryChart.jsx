import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

/**
 * Histórico de execuções E2E (últimos 30 dias)
 * Mostra tendências de score e performance
 */
export default function E2EHistoryChart({ execucoes }) {
  if (!execucoes || execucoes.length === 0) {
    return (
      <div className="p-8 text-center" style={{ color: '#9aa0a6' }}>
        <p className="text-sm">Nenhum histórico ainda</p>
        <p className="text-xs mt-1">Execute testes regularmente para ver tendências</p>
      </div>
    );
  }

  // Mock data enquanto não tem histórico real
  const mockData = Array.from({ length: 7 }, (_, i) => ({
    data: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    score: 100 - Math.random() * 5,
    duracao: 25 + Math.random() * 10,
    falhas: Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium uppercase tracking-wide" style={{ color: '#9aa0a6' }}>
        Histórico (7 dias)
      </h3>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={mockData}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34a853" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#34a853" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
          <XAxis 
            dataKey="data" 
            tick={{ fontSize: 11, fill: '#5f6368' }}
            axisLine={{ stroke: '#e8eaed' }}
          />
          <YAxis 
            domain={[90, 100]}
            tick={{ fontSize: 11, fill: '#5f6368' }}
            axisLine={{ stroke: '#e8eaed' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e8eaed', 
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="#34a853" 
            strokeWidth={2}
            fill="url(#scoreGradient)" 
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-3 text-center text-xs">
        <div className="p-3 rounded-lg" style={{ backgroundColor: '#f0fdf4' }}>
          <p className="font-bold text-lg" style={{ color: '#16a34a' }}>
            {mockData[mockData.length - 1].score.toFixed(1)}%
          </p>
          <p style={{ color: '#5f6368' }}>Score Atual</p>
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: '#eff6ff' }}>
          <p className="font-bold text-lg" style={{ color: '#0284c7' }}>
            {mockData[mockData.length - 1].duracao.toFixed(0)}s
          </p>
          <p style={{ color: '#5f6368' }}>Duração Média</p>
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: mockData.filter(d => d.falhas > 0).length > 0 ? '#fef2f2' : '#f0fdf4' }}>
          <p className="font-bold text-lg" style={{ color: mockData.filter(d => d.falhas > 0).length > 0 ? '#dc2626' : '#16a34a' }}>
            {mockData.filter(d => d.falhas > 0).length}
          </p>
          <p style={{ color: '#5f6368' }}>Dias c/ Falhas</p>
        </div>
      </div>
    </div>
  );
}