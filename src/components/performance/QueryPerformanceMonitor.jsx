import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * QueryPerformanceMonitor - Monitora queries lentas em tempo real
 * Exibe no canto inferior direito para validação de P95 < 300ms
 */
export default function QueryPerformanceMonitor() {
  const queryClient = useQueryClient();
  const [stats, setStats] = useState({
    total: 0,
    slow: 0, // > 300ms
    verySlow: 0, // > 1000ms
    avgTime: 0,
    p95: 0
  });
  const [slowQueries, setSlowQueries] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Escutar evento de toggle
    const handleToggle = (e) => setVisible(e.detail.enabled);
    window.addEventListener('toggle-performance-monitors', handleToggle);
    
    return () => window.removeEventListener('toggle-performance-monitors', handleToggle);
  }, []);

  useEffect(() => {
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();
    
    // Extrair tempos de todas as queries
    const times = queries
      .map(q => {
        const state = q.state;
        return state.dataUpdatedAt - state.fetchMeta?.fetchStart || 0;
      })
      .filter(t => t > 0)
      .sort((a, b) => a - b);

    if (times.length === 0) {
      setStats({ total: 0, slow: 0, verySlow: 0, avgTime: 0, p95: 0 });
      return;
    }

    const total = times.length;
    const slow = times.filter(t => t > 300).length;
    const verySlow = times.filter(t => t > 1000).length;
    const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / total);
    const p95Index = Math.floor(times.length * 0.95);
    const p95 = times[p95Index] || times[times.length - 1];

    setStats({ total, slow, verySlow, avgTime, p95 });

    // Top 5 queries mais lentas
    const slowest = queries
      .map(q => ({
        key: JSON.stringify(q.queryKey).slice(0, 40),
        time: q.state.dataUpdatedAt - (q.state.fetchMeta?.fetchStart || q.state.dataUpdatedAt)
      }))
      .filter(q => q.time > 300)
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);

    setSlowQueries(slowest);
  }, [queryClient]);

  const getP95Color = () => {
    if (stats.p95 < 300) return '#34a853';
    if (stats.p95 < 1000) return '#fbbc04';
    return '#ea4335';
  };

  if (!visible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '12px',
        fontSize: '12px',
        fontFamily: 'monospace',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
        minWidth: '220px',
        maxWidth: expanded ? '400px' : '220px',
        cursor: 'pointer'
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '8px', 
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>🔍 Queries Performance</span>
        <span style={{ fontSize: '10px', opacity: 0.7 }}>
          {expanded ? '▼' : '▶'}
        </span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span>P95:</span>
        <span style={{ 
          fontWeight: 'bold', 
          color: getP95Color(),
          fontSize: '14px'
        }}>
          {Math.round(stats.p95)}ms
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span>Avg:</span>
        <span style={{ color: '#7dd3fc' }}>
          {stats.avgTime}ms
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span>Total:</span>
        <span style={{ color: '#a78bfa' }}>
          {stats.total}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span>Lentas (&gt;300ms):</span>
        <span style={{ color: stats.slow > 10 ? '#ea4335' : '#fbbf24' }}>
          {stats.slow}
        </span>
      </div>

      {stats.verySlow > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Críticas (&gt;1s):</span>
          <span style={{ color: '#ea4335', fontWeight: 'bold' }}>
            {stats.verySlow}
          </span>
        </div>
      )}

      {expanded && slowQueries.length > 0 && (
        <div style={{ 
          marginTop: '12px', 
          paddingTop: '12px', 
          borderTop: '1px solid rgba(255,255,255,0.2)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
            Top Queries Lentas:
          </div>
          {slowQueries.map((q, i) => (
            <div key={i} style={{ 
              fontSize: '10px', 
              marginBottom: '4px',
              opacity: 0.8,
              display: 'flex',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <span style={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}>
                {q.key}
              </span>
              <span style={{ 
                color: q.time > 1000 ? '#ea4335' : '#fbbc04',
                fontWeight: 'bold'
              }}>
                {Math.round(q.time)}ms
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ 
        marginTop: '8px', 
        paddingTop: '8px', 
        borderTop: '1px solid rgba(255,255,255,0.2)',
        fontSize: '10px',
        opacity: 0.7
      }}>
        Target P95: &lt;300ms | Status: {stats.p95 < 300 ? '✅' : '❌'}
      </div>
    </div>
  );
}