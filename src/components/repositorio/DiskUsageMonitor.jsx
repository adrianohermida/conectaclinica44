import React, { useEffect, useState } from "react";
import { HardDrive, AlertCircle, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function DiskUsageMonitor({ documentos }) {
  const [realData, setRealData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  
  // Calcular breakdown local
  const calculateBreakdown = (docs) => {
    const byType = {};
    let total = 0;

    for (const doc of docs) {
      const tipo = doc.tipo_arquivo?.toLowerCase() || 'unknown';
      const size = doc.tamanho_bytes || 0;
      
      if (!byType[tipo]) {
        byType[tipo] = { count: 0, bytes: 0 };
      }
      byType[tipo].count++;
      byType[tipo].bytes += size;
      total += size;
    }

    return Object.entries(byType)
      .map(([tipo, data]) => ({
        tipo,
        count: data.count,
        bytes: data.bytes,
        mb: (data.bytes / 1024 / 1024).toFixed(1),
        percent: total > 0 ? ((data.bytes / total) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5);
  };
  
  // Cálculo APROXIMADO (fallback se API falhar)
  const totalBytes = documentos.reduce((acc, doc) => acc + (doc.tamanho_bytes || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
  const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(3);
  
  // Usar dados REAIS da Base44 Management API se disponível
  const usedGB = realData ? parseFloat(realData.total_gb) : parseFloat(totalGB);
  const limitGB = realData?.limite_gb || 10;
  const usagePercent = (usedGB / limitGB) * 100;
  const fonte = realData?.fonte || 'Aproximado (soma tamanho_bytes)';
  
  const fetchRealUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('getStorageUsageReal', {});
      if (response?.data?.success) {
        setRealData(response.data.data);
        console.log('[DiskUsage] ✅ Conectado:', response.data.data);
        
        // Usar breakdown da API se disponível
        if (response.data.data?.breakdown) {
          setBreakdown(response.data.data.breakdown);
        } else {
          setBreakdown(calculateBreakdown(documentos));
        }
        setError(null);
      } else {
        console.warn('[DiskUsage] Fallback:', response?.data);
        setBreakdown(calculateBreakdown(documentos));
        setError('Monitor offline - usando cálculo local');
      }
    } catch (err) {
      console.warn('[DiskUsage] Erro:', err?.message || err);
      setBreakdown(calculateBreakdown(documentos));
      setError('Monitor offline - usando cálculo local');
    } finally {
      setLoading(false);
    }
  };
  
  // Buscar dados reais APENAS 1x no mount
  useEffect(() => {
    fetchRealUsage();
  }, []);

  // Recalcular breakdown quando documentos mudarem
  useEffect(() => {
    if (!realData?.breakdown && documentos.length > 0) {
      setBreakdown(calculateBreakdown(documentos));
    }
  }, [documentos, realData]);

  const getColor = () => {
    if (usagePercent >= 90) return 'text-red-600';
    if (usagePercent >= 70) return 'text-orange-600';
    return 'text-gray-600';
  };

  const getBarColor = () => {
    if (usagePercent >= 90) return 'bg-red-600';
    if (usagePercent >= 70) return 'bg-orange-500';
    return 'bg-purple-600';
  };

  return (
    <div className="border-t p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <HardDrive className={`w-4 h-4 ${getColor()}`} />
          <span className="text-xs font-medium text-gray-700">Armazenamento</span>
          {usagePercent >= 90 && <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
        </div>
        <button
          onClick={fetchRealUsage}
          disabled={loading}
          className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
          style={{ minWidth: '28px', minHeight: '28px' }}
          title="Buscar uso real via Base44 Management API"
          aria-label="Atualizar dados de armazenamento"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} style={{ color: '#7E57FF' }} />
        </button>
      </div>

      {/* Fonte + Warning */}
      <div className="mb-2 p-1.5 bg-white rounded text-[8px] text-gray-500 border border-gray-200">
        <p className="leading-tight">📊 {fonte}</p>
        {realData?.warning && <p className="text-orange-600 mt-0.5">⚠️ {realData.warning}</p>}
        {error && <p className="text-red-600 mt-0.5">❌ {error}</p>}
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${getBarColor()}`}
          style={{ width: `${Math.min(usagePercent, 100)}%` }}
        />
      </div>
      
      <div className="flex justify-between items-center text-[10px] font-medium">
        <span className="text-gray-700">{documentos.length} arquivos</span>
        <span className={usagePercent >= 90 ? 'text-red-600 font-bold' : 'text-gray-700'}>
          {usedGB.toFixed(3)} / {limitGB} GB ({usagePercent.toFixed(1)}%)
        </span>
      </div>
      
      {/* Breakdown por tipo (top 5) */}
      {breakdown && breakdown.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
          <p className="text-[9px] font-semibold text-gray-600 mb-1">Top Tipos:</p>
          {breakdown.map((item) => {
            const barColor = usagePercent >= 90 ? '#ef4444' : usagePercent >= 70 ? '#f59e0b' : '#7E57FF';
            return (
              <div key={item.tipo} className="space-y-0.5">
                <div className="flex justify-between text-[9px]">
                  <span className="text-gray-700 uppercase font-medium">{item.tipo}</span>
                  <span className="text-gray-500">{item.mb} MB ({item.percent}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: barColor
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alertas */}
      {usagePercent >= 90 && (
        <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="w-3 h-3 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-[9px] text-red-700 leading-tight">
              <strong>CRÍTICO:</strong> Base44 cheio. Migre para Supabase Storage → /RoadmapArmazenamento
            </p>
          </div>
        </div>
      )}
      
      {usagePercent >= 70 && usagePercent < 90 && (
        <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
          <p className="text-[9px] text-yellow-700 leading-tight">
            ⚠️ {usagePercent.toFixed(0)}% usado. Planeje storage dedicado (Supabase/R2).
          </p>
        </div>
      )}
    </div>
  );
}