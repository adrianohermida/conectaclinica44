import { useEffect, useState } from "react";

/**
 * RealFCPTest - Medição REAL de FCP (First Contentful Paint)
 * Exibe no canto superior direito da tela para validação manual
 */
export default function RealFCPTest() {
  const [fcp, setFcp] = useState(null);
  const [ttfb, setTtfb] = useState(null);
  const [loadTime, setLoadTime] = useState(null);
  const [bundleSize, setBundleSize] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Escutar evento de toggle
    const handleToggle = (e) => setVisible(e.detail.enabled);
    window.addEventListener('toggle-performance-monitors', handleToggle);
    
    return () => window.removeEventListener('toggle-performance-monitors', handleToggle);
  }, []);

  useEffect(() => {
    // FCP real via PerformanceObserver
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            setFcp(Math.round(entry.startTime));
          }
        }
      });
      observer.observe({ entryTypes: ['paint'] });
    }

    // TTFB e Load Time
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        setTtfb(Math.round(navigation.responseStart - navigation.requestStart));
        setLoadTime(Math.round(navigation.loadEventEnd - navigation.fetchStart));
      }

      // Bundle size (aproximado via resource timing)
      const resources = performance.getEntriesByType('resource');
      const jsSize = resources
        .filter(r => r.name.includes('.js'))
        .reduce((acc, r) => acc + (r.transferSize || 0), 0);
      setBundleSize(Math.round(jsSize / 1024)); // KB
    });
  }, []);

  const getFcpColor = () => {
    if (!fcp) return '#gray';
    if (fcp < 1800) return '#34a853'; // Verde (bom)
    if (fcp < 3000) return '#fbbc04'; // Amarelo (OK)
    return '#ea4335'; // Vermelho (ruim)
  };

  if (!visible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: '80px',
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
        minWidth: '200px'
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
        ⚡ Performance Real
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span>FCP:</span>
        <span style={{ 
          fontWeight: 'bold', 
          color: getFcpColor(),
          fontSize: '14px'
        }}>
          {fcp ? `${fcp}ms` : 'medindo...'}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span>TTFB:</span>
        <span style={{ color: '#7dd3fc' }}>
          {ttfb ? `${ttfb}ms` : '-'}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span>Load:</span>
        <span style={{ color: '#a78bfa' }}>
          {loadTime ? `${loadTime}ms` : '-'}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>JS Bundle:</span>
        <span style={{ color: '#fbbf24' }}>
          {bundleSize ? `${bundleSize}KB` : '-'}
        </span>
      </div>

      {fcp && (
        <div style={{ 
          marginTop: '8px', 
          paddingTop: '8px', 
          borderTop: '1px solid rgba(255,255,255,0.2)',
          fontSize: '10px',
          opacity: 0.7
        }}>
          Target: &lt;1800ms | Atual: {fcp >= 1800 ? '❌' : '✅'}
        </div>
      )}
    </div>
  );
}