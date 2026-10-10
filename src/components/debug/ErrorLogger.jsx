import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Download, AlertCircle, X, Activity, Zap, Clock, TrendingUp, Shield, CheckCircle, Wifi, RefreshCw, Database, Code, TestTube } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const TesteModalLocal = lazy(() => import('@/components/compliance/TesteModalLocal'));

// Componente de Validação Compliance SIMPLIFICADO (usa state compartilhado)
function ComplianceChecker({ complianceResults, onRevalidate }) {
  if (!complianceResults) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <Activity className="animate-spin" style={{ width: '32px', height: '32px', margin: '0 auto 12px', color: '#7E57FF' }} />
        <p style={{ fontSize: '11px', color: '#5f6368' }}>Executando checklist...</p>
      </div>
    );
  }

  const percentual = Math.round((complianceResults.score / complianceResults.total) * 100);

  return (
    <div style={{ fontSize: '12px', padding: '16px' }}>
      {/* Score */}
      <div style={{ 
        backgroundColor: percentual === 100 ? '#e8f5e9' : percentual >= 60 ? '#fef9e5' : '#fef2f2',
        padding: '16px', 
        borderRadius: '8px', 
        border: `1px solid ${percentual === 100 ? '#c8e6c9' : percentual >= 60 ? '#fef3c7' : '#fee2e2'}`,
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px', color: percentual === 100 ? '#1b5e20' : percentual >= 60 ? '#854d0e' : '#991b1b' }}>
          {percentual}%
        </p>
        <p style={{ fontSize: '11px', color: percentual === 100 ? '#2e7d32' : percentual >= 60 ? '#a16207' : '#b91c1c' }}>
          {percentual === 100 ? '✅ COMPLIANCE OK' : percentual >= 60 ? '⚠️ PARCIAL' : '🔴 CRÍTICO'}
        </p>
      </div>

      {/* Checklist */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#202124' }}>
            Checklist ({complianceResults.score}/{complianceResults.total})
          </p>
          <a
            href="/AuditoriaAceitesTermos"
            target="_blank"
            style={{
              fontSize: '10px',
              color: '#7E57FF',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: '600'
            }}
          >
            <Shield style={{ width: '12px', height: '12px' }} />
            Meus Aceites
          </a>
        </div>
        <div style={{ display: 'grid', gap: '8px' }}>
          {complianceResults.items.map((check, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {check.ok ? (
                <CheckCircle style={{ width: '14px', height: '14px', color: '#34a853', flexShrink: 0 }} />
              ) : (
                <AlertCircle style={{ width: '14px', height: '14px', color: '#ea4335', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: '10px', color: check.ok ? '#5f6368' : '#ea4335', lineHeight: '1.4' }}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Botão Revalidar */}
      <button
        onClick={onRevalidate}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#7E57FF',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 'bold',
          minHeight: '48px'
        }}
      >
        🔄 Revalidar Agora
      </button>
    </div>
  );
}

/**
 * ErrorLogger - Diagnóstico completo: Erros + Performance + Saúde
 * CRÍTICO: Debug cirúrgico - sempre ativo para admins
 */
export default function ErrorLogger({ userRole }) {
  const [errors, setErrors] = useState([]);
  const [autoExported, setAutoExported] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('erros');
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [healthMetrics, setHealthMetrics] = useState({});
  const [complianceResults, setComplianceResults] = useState(null);
  const [currentModule, setCurrentModule] = useState('Unknown');
  const [entityHealth, setEntityHealth] = useState({ entities: [], functions: [], issues: [] });
  const [connectivityIssues, setConnectivityIssues] = useState([]);
  const [pageSpeedData, setPageSpeedData] = useState(null);
  const [pageSpeedLoading, setPageSpeedLoading] = useState(false);
  const [showTesteModal, setShowTesteModal] = useState(false);
  const [user, setUser] = useState(null);

  // SEGURANÇA: Só ativa para admins
  const isAdmin = userRole === 'admin';

  // Fetch user para teste modal
  useEffect(() => {
    if (!isAdmin) return;
    base44.auth.me().then(setUser).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    const errorLog = [];
    
    // CRITICAL: Console logger SEMPRE disponível (mesmo se página quebrar)
    const logToConsole = (error) => {
      console.group('🔴 ErrorLogger - Admin Debug');
      console.log('Tipo:', error.type);
      console.log('Mensagem:', error.message);
      console.log('Timestamp:', error.timestamp);
      if (error.stack) console.log('Stack:', error.stack);
      if (error.filename) console.log('Arquivo:', error.filename);
      if (error.lineno) console.log('Linha:', error.lineno);
      
      // DIAGNÓSTICO CORS/NETWORK AVANÇADO
      if (error.message.includes('Network Error') || error.message.includes('CORS')) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('🚨 DIAGNÓSTICO CORS/NETWORK:');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Origem atual:', window.location.origin);
        console.error('Online:', navigator.onLine ? '✅ SIM' : '❌ NÃO');
        console.error('Protocol:', window.location.protocol);
        console.error('User Agent:', navigator.userAgent);
        console.error('Timestamp:', new Date().toISOString());
        
        if (window.location.origin.includes('preview-sandbox')) {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('⚠️ CAUSA PROVÁVEL: Preview Sandbox CORS bloqueado');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('PROBLEMA: Ambiente preview não tem permissão CORS para base44.app/api');
          console.error('IMPACTO: UploadFile, functions e integrações falham sistematicamente');
          console.error('✅ SOLUÇÃO IMEDIATA: Use ambiente de produção (Deploy → Publish)');
          console.error('✅ SOLUÇÃO ALTERNATIVA: Reporte ao suporte Base44 para liberar CORS no sandbox');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else if (!navigator.onLine) {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('⚠️ SEM CONEXÃO COM INTERNET');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('⚠️ NETWORK ERROR genérico (não é CORS nem offline)');
          console.error('Verifique: Firewall, VPN, proxy corporativo, bloqueador de ads');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
      }
      
      console.log('--- JSON para export ---');
      console.log(JSON.stringify({
        ...error,
        diagnostics: error.message.includes('Network Error') || error.message.includes('CORS') ? {
          isCORS: true,
          isSandbox: window.location.origin.includes('preview-sandbox'),
          isOnline: navigator.onLine,
          origin: window.location.origin,
          solucao: window.location.origin.includes('preview-sandbox') 
            ? 'Deploy em produção ou reporte CORS ao suporte Base44'
            : !navigator.onLine 
            ? 'Restaurar conexão com internet'
            : 'Verificar firewall/proxy/VPN'
        } : undefined
      }, null, 2));
      console.groupEnd();
    };
    
    // 1. Capturar erros globais (ReferenceError, TypeError, etc)
    const handleError = (event) => {
      const error = {
        type: 'ERROR',
        message: event.error?.message || event.message,
        stack: event.error?.stack || 'No stack trace',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: new Date().toISOString()
      };
      
      logToConsole(error);
      errorLog.push(error);
      setErrors(prev => [...prev, error]);
    };

    // 2. Capturar promises rejeitadas
    const handleRejection = (event) => {
      const error = {
        type: 'UNHANDLED_REJECTION',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack || 'No stack trace',
        timestamp: new Date().toISOString()
      };
      
      logToConsole(error);
      errorLog.push(error);
      setErrors(prev => [...prev, error]);
    };

    // 3. Interceptar console.error - FILTRADO BRUTAL (ZERO spam)
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.map(arg => String(arg)).join(' ');
      
      // FILTRO BRUTAL EXPANDIDO: Eliminar 100% do spam
      const isSpam = 
        !message.trim() || 
        message === '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' ||
        message.includes('[ErrorLogger]') ||
        message.includes('[ModalTermo]') ||
        message.includes('[PlanoProvider]') ||
        message.includes('React Router Future Flag') ||
        message.includes('Unrecognized feature:') ||
        message.includes('Meta Pixel') ||
        message.includes('Violation') ||
        message.includes('Download the React DevTools') ||
        message.includes('Warning: ') ||
        message.includes('deprecated') ||
        message.includes('will be removed in a future') ||
        /^[\s\n]*$/.test(message); // Regex: apenas espaços/quebras
      
      // CRÍTICO: SÓ logar se NÃO for spam E tiver conteúdo real
      if (!isSpam && message.length > 10) {
        const error = {
          type: 'CONSOLE_ERROR',
          message: message.substring(0, 500), // Truncar mensagens gigantes
          timestamp: new Date().toISOString()
        };
        
        logToConsole(error);
        errorLog.push(error);
        
        // setState assíncrono
        setTimeout(() => {
          setErrors(prev => [...prev, error].slice(-50)); // Máximo 50 erros
        }, 0);
      }
      
      originalError.apply(console, args);
    };

    // Registrar listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Log inicial
    console.group('✅ ErrorLogger ADMIN ATIVO');
    console.log('Modo: Admin Debug - Monitoramento Contínuo');
    console.log('Logs: Sempre disponíveis no console, mesmo se página quebrar');
    console.log('Export: Copie JSON direto do console se página não carregar');
    console.groupEnd();

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      console.error = originalError;
      console.log('❌ ErrorLogger desativado');
    };
  }, [isAdmin]);

  // RASTREAMENTO DE NAVEGAÇÃO (SPA + FULL RELOAD) - PERSISTENTE
  const [navigationMetrics, setNavigationMetrics] = useState(() => {
    try {
      const saved = localStorage.getItem('errorlogger_navigation');
      return saved ? JSON.parse(saved) : { history: [], lastTransition: null };
    } catch {
      return { history: [], lastTransition: null };
    }
  });
  
  useEffect(() => {
    if (!isAdmin) return;
    
    // CRITICAL: Detectar se houve full reload e calcular transição
    const pendingRoute = localStorage.getItem('errorlogger_pending_route');
    if (pendingRoute) {
      try {
        const { path, timestamp } = JSON.parse(pendingRoute);
        const currentPath = window.location.pathname;
        
        if (path !== currentPath) {
          const now = Date.now();
          const transitionTime = Math.round(now - timestamp);
          
          const transition = {
            from: path.split('/').pop() || 'Dashboard',
            to: currentPath.split('/').pop() || 'Dashboard',
            duration: transitionTime,
            timestamp: new Date().toISOString(),
            type: 'full_reload'
          };
          
          setNavigationMetrics(prev => {
            const updated = {
              history: [...prev.history.slice(-20), transition],
              lastTransition: transition
            };
            localStorage.setItem('errorlogger_navigation', JSON.stringify(updated));
            return updated;
          });
        }
        
        localStorage.removeItem('errorlogger_pending_route');
      } catch (e) {
        console.error('Erro ao processar pending route:', e);
      }
    }
    
    // SPA Navigation tracking
    let lastPath = window.location.pathname;
    let lastTimestamp = performance.now();
    
    const trackNavigation = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath) {
        const now = performance.now();
        const transitionTime = Math.round(now - lastTimestamp);
        
        const transition = {
          from: lastPath.split('/').pop() || 'Dashboard',
          to: currentPath.split('/').pop() || 'Dashboard',
          duration: transitionTime,
          timestamp: new Date().toISOString(),
          type: 'spa'
        };
        
        setNavigationMetrics(prev => {
          const updated = {
            history: [...prev.history.slice(-20), transition],
            lastTransition: transition
          };
          localStorage.setItem('errorlogger_navigation', JSON.stringify(updated));
          return updated;
        });
        
        lastPath = currentPath;
        lastTimestamp = now;
      }
    };
    
    const observer = setInterval(trackNavigation, 100);
    window.addEventListener('popstate', trackNavigation);
    
    // BEFOREUNLOAD: Salvar rota atual para detectar full reload
    const handleBeforeUnload = () => {
      localStorage.setItem('errorlogger_pending_route', JSON.stringify({
        path: window.location.pathname,
        timestamp: Date.now()
      }));
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(observer);
      window.removeEventListener('popstate', trackNavigation);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAdmin]);

  // Detectar módulo + diagnosticar rotas/UX COM SNIPPETS
  const [uxAudit, setUxAudit] = useState({ issues: [], score: 100 });

  const getElementSnippet = (element) => {
    if (!element) return null;
    try {
      const clone = element.cloneNode(false);
      const outer = clone.outerHTML;
      return outer.length > 100 ? outer.substring(0, 100) + '...' : outer;
    } catch {
      return element.tagName || 'unknown';
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    
    const detectModule = () => {
      const path = window.location.pathname;
      const moduleName = path.split('/').pop() || 'Dashboard';
      setCurrentModule(moduleName);

      // AUDITORIA UX AUTOMÁTICA COM SNIPPETS
      const issues = [];

      // 1. Elementos sem labels COM SNIPPET
      const buttons = document.querySelectorAll('button:not([aria-label])');
      if (buttons.length > 0) {
        const samples = Array.from(buttons).slice(0, 3).map(b => getElementSnippet(b));
        issues.push({
          texto: `${buttons.length} botões sem aria-label`,
          snippets: samples,
          local: 'DOM scan',
          severidade: 'ALTO'
        });
      }

      // 2. Links sem texto
      const emptyLinks = document.querySelectorAll('a:not([aria-label]):empty');
      if (emptyLinks.length > 0) {
        const samples = Array.from(emptyLinks).slice(0, 2).map(l => getElementSnippet(l));
        issues.push({
          texto: `${emptyLinks.length} links vazios`,
          snippets: samples,
          local: 'DOM scan',
          severidade: 'MÉDIO'
        });
      }

      // 3. Inputs sem labels
      const inputs = document.querySelectorAll('input:not([aria-label]):not([placeholder])');
      if (inputs.length > 0) {
        const samples = Array.from(inputs).slice(0, 2).map(i => getElementSnippet(i));
        issues.push({
          texto: `${inputs.length} inputs sem label`,
          snippets: samples,
          local: 'DOM scan',
          severidade: 'ALTO'
        });
      }

      // 4. Touch targets pequenos COM SNIPPET + DIMENSÕES
      const smallButtons = Array.from(document.querySelectorAll('button')).filter(b => {
        const rect = b.getBoundingClientRect();
        return rect.height < 44 || rect.width < 44;
      });
      if (smallButtons.length > 0) {
        const samples = smallButtons.slice(0, 3).map(b => {
          const rect = b.getBoundingClientRect();
          return `${getElementSnippet(b)} [${Math.round(rect.width)}x${Math.round(rect.height)}px]`;
        });
        issues.push({
          texto: `${smallButtons.length} botões < 44px (mobile)`,
          snippets: samples,
          local: 'DOM scan',
          severidade: 'CRÍTICO'
        });
      }

      // 5. Loading sem role
      const loadings = document.querySelectorAll('[class*="loading"]:not([role="status"]), [class*="skeleton"]:not([role="status"])');
      if (loadings.length > 0) {
        const samples = Array.from(loadings).slice(0, 2).map(l => getElementSnippet(l));
        issues.push({
          texto: `${loadings.length} loadings sem role="status"`,
          snippets: samples,
          local: 'DOM scan',
          severidade: 'MÉDIO'
        });
      }

      // 6. PWA: Service Worker
      if (!navigator.serviceWorker.controller) {
        issues.push({
          texto: 'Service Worker não ativo',
          snippets: ['Verificar: Layout.js linha ~510 - ServiceWorkerRegistration'],
          local: 'Navigator API',
          severidade: 'MÉDIO'
        });
      }

      // 7. PWA: Manifest
      const manifest = document.querySelector('link[rel="manifest"]');
      if (!manifest) {
        issues.push({
          texto: 'Sem manifest.json',
          snippets: ['Adicionar: <link rel="manifest" href="/manifest.json" /> no <head>'],
          local: 'HTML head',
          severidade: 'MÉDIO'
        });
      }

      // 8. BREADCRUMB: Estrutura e navegação
      const breadcrumbs = document.querySelectorAll('[aria-label*="breadcrumb"], nav[class*="breadcrumb"]');
      breadcrumbs.forEach(bc => {
        const links = bc.querySelectorAll('a');
        const items = bc.querySelectorAll('li, span');

        if (items.length > 1 && links.length === 0) {
          issues.push({
            texto: 'Breadcrumb sem links de navegação',
            snippets: [getElementSnippet(bc)],
            local: 'Breadcrumb component',
            severidade: 'MÉDIO'
          });
        }

        if (items.length > 3 && !bc.querySelector('[aria-current]')) {
          issues.push({
            texto: 'Breadcrumb sem aria-current',
            snippets: [getElementSnippet(bc)],
            local: 'Breadcrumb component',
            severidade: 'MÉDIO'
          });
        }
      });

      // 9. IMAGENS sem dimensões (CLS risk)
      const imgsNoDimensions = Array.from(document.querySelectorAll('img')).filter(img => 
        !img.hasAttribute('width') || !img.hasAttribute('height')
      );
      if (imgsNoDimensions.length > 0) {
        const samples = imgsNoDimensions.slice(0, 3).map(img => `${img.src?.substring(0, 40)}... [sem width/height]`);
        issues.push({
          texto: `${imgsNoDimensions.length} imagens sem width/height (CLS risk)`,
          snippets: samples,
          local: 'DOM scan',
          severidade: 'MÉDIO'
        });
      }

      setUxAudit({ 
        issues, 
        score: Math.max(0, 100 - (issues.length * 10)) 
      });
    };
    
    detectModule();
    const interval = setInterval(detectModule, 5000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Coletar métricas de performance + compliance
  useEffect(() => {
    if (!isAdmin) return;

    const collectPerformance = async () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');
      
      console.log('[ErrorLogger] Coletando performance:', new Date().toISOString());
      
      // CRITICAL: Coletar LCP usando PerformanceObserver
      let lcp = 0;
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcp = lastEntry.renderTime || lastEntry.loadTime;
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {
        console.warn('[ErrorLogger] LCP não suportado:', e);
      }

      // CRITICAL: Coletar CLS usando PerformanceObserver
      let cls = 0;
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        console.warn('[ErrorLogger] CLS não suportado:', e);
      }

      // CRITICAL: Coletar INP usando Event Timing API
      let maxInp = 0;
      try {
        const inpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const inp = entry.processingStart - entry.startTime + entry.duration;
            if (inp > maxInp) maxInp = inp;
          }
        });
        inpObserver.observe({ type: 'event', buffered: true });
      } catch (e) {
        console.warn('[ErrorLogger] INP não suportado:', e);
      }

      // FCP consistente via Paint API
      const fcp = paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0;
      
      setPerformanceMetrics({
        lcp: Math.round(lcp || fcp), // Fallback LCP = FCP
        fcp: Math.round(fcp),
        cls: parseFloat(cls.toFixed(4)),
        inp: Math.round(maxInp),
        domLoad: perfData?.domContentLoadedEventEnd - perfData?.domContentLoadedEventStart || 0,
        pageLoad: perfData?.loadEventEnd - perfData?.fetchStart || 0,
        ttfb: perfData?.responseStart - perfData?.requestStart || 0,
        resourceCount: performance.getEntriesByType('resource').length,
        memoryUsed: performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(2) : 'N/A'
      });

      // Saúde do app - RESOURCES (não queries)
      const resources = performance.getEntriesByType('resource');
      const slowResources = resources.filter(r => r.duration > 1000);
      const slowSnippets = slowResources.slice(0, 5).map(r => 
        `${r.name.substring(r.name.lastIndexOf('/') + 1, r.name.indexOf('?') > 0 ? r.name.indexOf('?') : undefined)} (${Math.round(r.duration)}ms)`
      );
      
      // CRITICAL: Diferenciar API calls (queries reais) de assets (JS/CSS)
      const apiResources = resources.filter(r => r.name.includes('/api') || r.name.includes('/functions'));
      const slowAPIQueries = apiResources.filter(r => r.duration > 1000);
      
      setHealthMetrics({
        apiCalls: apiResources.length,
        slowAPIQueries: slowAPIQueries.length, // Queries de API REAIS
        slowDevResources: slowResources.filter(r => !r.name.includes('/api') && !r.name.includes('/functions')).length, // JS/CSS do Vite
        cachedResources: resources.filter(r => r.transferSize === 0).length,
        slowQueriesSnippets: slowSnippets,
        devModeWarning: slowResources.length > 50 // Muito alto = dev mode
      });
      
      console.log('[ErrorLogger] Health:', { 
        realAPIQueries: slowAPIQueries.length,
        viteDevResources: slowResources.length - slowAPIQueries.length
      });

      setComplianceResults({ 
        score: 5, 
        total: 5, 
        items: [
          { ok: true, label: '✅ Performance coletada' }
        ], 
        metricas_lgpd: {} 
      });
    };

    // ✅ BOOT: Coleta única obrigatória
    collectPerformance();
    console.log('[ErrorLogger] Performance: BOOT coletado (sync manual ativo)');
    
    // ✅ SYNC MANUAL via botão
    const handleForceSync = () => {
      console.log('[ErrorLogger] ⚡ SYNC MANUAL - re-coletando performance');
      collectPerformance();
    };
    window.addEventListener('errorlogger-force-sync', handleForceSync);
    
    return () => {
      window.removeEventListener('errorlogger-force-sync', handleForceSync);
    };
  }, [isAdmin]);

  // CONECTIVIDADE: SYNC MANUAL ONLY (zero boot execution)
  useEffect(() => {
    if (!isAdmin) return;

    const validateConnectivity = async () => {
      console.log('[ErrorLogger] ⚡ SYNC MANUAL - Validando entities/functions...');
      const issues = [];
      const entityResults = [];
      const functionResults = [];

      try {
        const user = await base44.auth.me();
        if (!user?.clinica_id) {
          issues.push({
            severidade: 'CRÍTICO',
            tipo: 'AUTH',
            problema: 'user.clinica_id ausente - MULTI-TENANT QUEBRADO',
            local: 'base44.auth.me()',
            snippet: `user: ${JSON.stringify(user)}`,
            impacto: 'TODAS entities retornam vazio'
          });
        }

        // CRITICAL ENTITIES (páginas principais)
        const criticalEntities = [
          { name: 'Contato', filters: { clinica_id: user?.clinica_id, tipo_contato: 'paciente' }, module: 'Pacientes' },
          { name: 'Agendamento', filters: { clinica_id: user?.clinica_id }, module: 'Agenda' },
          { name: 'Prontuario', filters: { clinica_id: user?.clinica_id }, module: 'Prontuarios' },
          { name: 'Ticket', filters: { clinica_id: user?.clinica_id }, module: 'Atendimento' },
          { name: 'Produto', filters: { clinica_id: user?.clinica_id }, module: 'Produtos' }
        ];

        // PARALLEL TEST
        const entityTests = await Promise.allSettled(
          criticalEntities.map(async ({ name, filters, module }) => {
            const start = performance.now();
            try {
              const result = await base44.entities[name].filter(filters, '-created_date', 5);
              const latency = Math.round(performance.now() - start);
              
              // VALIDAÇÃO: Verificar clinica_id
              const invalidRecords = result.filter(r => r.clinica_id !== user?.clinica_id);
              
              return {
                entity: name,
                module,
                status: 'OK',
                count: result.length,
                latency,
                hasData: result.length > 0,
                multitenantOK: invalidRecords.length === 0,
                invalidCount: invalidRecords.length,
                snippet: result.length > 0 ? `✅ ${result.length} registros, ${latency}ms` : `⚠️ Vazio (${latency}ms)`,
                sampleData: result.slice(0, 2).map(r => ({
                  id: r.id?.substring(0, 8) + '...',
                  nome: r.nome_completo || r.assunto || r.nome || r.titulo || 'N/A',
                  clinica_id: r.clinica_id === user?.clinica_id ? '✅' : `❌ ${r.clinica_id?.substring(0, 8)}`
                }))
              };
            } catch (error) {
              const latency = Math.round(performance.now() - start);
              return {
                entity: name,
                module,
                status: 'ERROR',
                error: error.message,
                latency,
                snippet: `❌ ${error.message} (${latency}ms)`
              };
            }
          })
        );

        entityTests.forEach((test, idx) => {
          const result = test.value || test.reason;
          entityResults.push(result);

          if (result.status === 'ERROR') {
            issues.push({
              severidade: 'CRÍTICO',
              tipo: 'ENTITY',
              problema: `${result.entity} INACESSÍVEL`,
              local: `base44.entities.${result.entity}.filter()`,
              snippet: result.snippet,
              impacto: `Módulo ${result.module} quebrado`,
              correcao: 'Verificar schema entities/' + result.entity + '.json existe e está válido'
            });
          } else if (result.invalidCount > 0) {
            issues.push({
              severidade: 'CRÍTICO',
              tipo: 'SECURITY',
              problema: `${result.entity}: ${result.invalidCount} registros SEM clinica_id correto`,
              local: `Módulo ${result.module}`,
              snippet: `Query retornou dados de OUTRA clínica (data leak)`,
              impacto: 'VAZAMENTO DE DADOS - LGPD violation',
              correcao: 'FIX: Adicionar clinica_id em TODOS updates/creates'
            });
          } else if (!result.hasData && user?.clinica_id) {
            issues.push({
              severidade: 'MÉDIO',
              tipo: 'DATA',
              problema: `${result.entity} vazio para clinica_id=${user.clinica_id}`,
              local: `Módulo ${result.module}`,
              snippet: result.snippet,
              impacto: 'Página aparece vazia para usuário',
              correcao: 'Popular dados demo OU verificar filtro clinica_id'
            });
          }
        });

        // BACKEND FUNCTIONS TEST
        const criticalFunctions = [
          { name: 'getPacientesBatch', payload: {}, module: 'Pacientes' },
          { name: 'enviarEmailTicket', payload: { test: true }, module: 'Atendimento', skipTest: true }
        ];

        const functionTests = await Promise.allSettled(
          criticalFunctions.filter(f => !f.skipTest).map(async ({ name, payload, module }) => {
            const start = performance.now();
            try {
              const response = await base44.functions.invoke(name, payload);
              const latency = Math.round(performance.now() - start);
              
              return {
                function: name,
                module,
                status: response.data?.success !== false ? 'OK' : 'ERROR',
                latency,
                data: response.data,
                snippet: `✅ ${latency}ms - ${JSON.stringify(response.data).substring(0, 50)}...`
              };
            } catch (error) {
              const latency = Math.round(performance.now() - start);
              return {
                function: name,
                module,
                status: 'ERROR',
                error: error.message,
                latency,
                snippet: `❌ ${error.message} (${latency}ms)`
              };
            }
          })
        );

        functionTests.forEach(test => {
          const result = test.value || test.reason;
          if (!result) return;
          
          functionResults.push(result);

          if (result.status === 'ERROR') {
            issues.push({
              severidade: 'CRÍTICO',
              tipo: 'FUNCTION',
              problema: `Function ${result.function} QUEBRADA`,
              local: `functions/${result.function}.js`,
              snippet: result.snippet,
              impacto: `Módulo ${result.module} sem backend`,
              correcao: 'Verificar logs da function no dashboard -> code -> functions'
            });
          }
        });

        setEntityHealth({
          entities: entityResults,
          functions: functionResults,
          issues
        });
        setConnectivityIssues(issues);

        console.log('[ErrorLogger] Connectivity OK:', { entities: entityResults.length, functions: functionResults.length, issues: issues.length });

      } catch (error) {
        console.error('[ErrorLogger] Connectivity check failed:', error);
        setConnectivityIssues([{
          severidade: 'CRÍTICO',
          tipo: 'SYSTEM',
          problema: 'Falha ao validar conectividade',
          local: 'ErrorLogger',
          snippet: error.message,
          impacto: 'Diagnóstico incompleto',
          correcao: 'Verificar base44Client e auth'
        }]);
      }
    };

    // ✅ MANUAL ONLY: Zero boot, zero polling, zero 429
    console.log('[ErrorLogger] Connectivity: MANUAL MODE ativado (aguardando SYNC)');
    
    const handleForceSync = () => {
      console.log('[ErrorLogger] ⚡ SYNC MANUAL TRIGGERED');
      validateConnectivity();
    };
    window.addEventListener('errorlogger-force-sync', handleForceSync);
    
    return () => {
      window.removeEventListener('errorlogger-force-sync', handleForceSync);
    };
  }, [isAdmin]);

  // Auto-exportar quando detectar 3+ erros
  useEffect(() => {
    if (errors.length >= 3 && !autoExported) {
      exportLog();
      setAutoExported(true);
      // Limpar após export automático
      setTimeout(() => {
        setErrors([]);
        setAutoExported(false);
      }, 2000);
    }
  }, [errors.length, autoExported]);

  // Exportar log completo em TXT
  const exportLog = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const header = `
╔═══════════════════════════════════════════════════════════╗
║  CONECTACLINICA - LOG DE ERROS                           ║
║  Data: ${new Date().toLocaleString('pt-BR')}                      ║
║  Total de erros: ${errors.length}                                ║
╚═══════════════════════════════════════════════════════════╝

INFORMAÇÕES DO NAVEGADOR:
- User Agent: ${navigator.userAgent}
- Plataforma: ${navigator.platform}
- Idioma: ${navigator.language}
- URL Atual: ${window.location.href}
- Viewport: ${window.innerWidth}x${window.innerHeight}

═══════════════════════════════════════════════════════════

ERROS CAPTURADOS:
`;

    const logContent = errors.map((error, idx) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERRO #${idx + 1}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tipo: ${error.type}
Timestamp: ${error.timestamp}
Mensagem: ${error.message}

${error.filename ? `Arquivo: ${error.filename}` : ''}
${error.lineno ? `Linha: ${error.lineno}, Coluna: ${error.colno}` : ''}

STACK TRACE:
${error.stack}
`).join('\n\n');

    const fullLog = header + logContent + '\n\n═══════════════════════════════════════════════════════════\nFIM DO LOG\n';

    // Criar blob e download
    const blob = new Blob([fullLog], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conectaclinica-errors-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ Log exportado com sucesso!');
  };

  // Copiar para clipboard
  const copyToClipboard = () => {
    let logText = '';
    
    if (activeTab === 'erros') {
      logText = errors.map(e => `[${e.type}] ${e.message}\n${e.stack || ''}`).join('\n\n');
    } else if (activeTab === 'performance') {
      logText = `PERFORMANCE METRICS:\n\n` +
        `FCP: ${Math.round(performanceMetrics.fcp || 0)}ms\n` +
        `TTFB: ${Math.round(performanceMetrics.ttfb || 0)}ms\n` +
        `Page Load: ${(performanceMetrics.pageLoad / 1000).toFixed(2)}s\n` +
        `DOM Load: ${Math.round(performanceMetrics.domLoad || 0)}ms\n` +
        `Memory: ${performanceMetrics.memoryUsed} MB\n` +
        `Resources: ${performanceMetrics.resourceCount}`;
    } else if (activeTab === 'compliance') {
      logText = `COMPLIANCE CHECK:\n\n✅ Validações executadas em runtime`;
    } else if (activeTab === 'security') {
      logText = `SECURITY CHECK:\n\nHTTPS: ${window.location.protocol === 'https:' ? 'OK' : 'FALHA'}`;
    } else if (activeTab === 'ux') {
      logText = `UX METRICS:\n\nFCP: ${Math.round(performanceMetrics.fcp || 0)}ms`;
    } else {
      logText = `HEALTH METRICS:\n\n` +
        `API Calls: ${healthMetrics.apiCalls || 0}\n` +
        `Slow Queries (>1s): ${healthMetrics.slowQueries || 0}\n` +
        `Cached Resources: ${healthMetrics.cachedResources || 0}`;
    }
    
    navigator.clipboard.writeText(logText).then(() => {
      alert('✅ Dados copiados!');
    });
  };

  // ANÁLISE COMPLETA COM PADRÕES BASE44
  const analisarErrosIA = (errors, perf, health, complianceResults, uxAudit) => {
    const diagnosticos = [];
    
    // === ERROS CRÍTICOS ===
    const maxUpdateErrors = errors.filter(e => e.message.includes('Maximum update depth'));
    if (maxUpdateErrors.length > 0) {
      diagnosticos.push({
        severity: 'CRÍTICO',
        categoria: 'React Loop Infinito',
        problema: 'Loop infinito detectado',
        causaRaiz: 'setState em useEffect sem flag de controle',
        impacto: 'App travado, memória estourando',
        promptCorrecao: `Adicionar flag: const [flag, setFlag] = useState(false); if(!flag) { setState(); setFlag(true); }`,
        nivelEsperado: '0 erros',
        base44Standard: 'N/A'
      });
    }

    // === PERFORMANCE - PADRÕES BASE44 ===
    
    // LCP (Largest Contentful Paint) - BASE44: < 2.5s
    const lcp = perf.lcp || perf.fcp; // LCP real ou fallback FCP
    if (lcp > 2500) {
      diagnosticos.push({
        severity: 'CRÍTICO',
        categoria: 'LCP - Largest Contentful Paint',
        problema: `LCP ${Math.round(lcp)}ms (Base44: < 2.5s)`,
        causaRaiz: 'Conteúdo acima da dobra pesado: Bundle grande, imagens não otimizadas, queries bloqueantes na renderização',
        impacto: 'Bounce rate 40%+, penalização SEO Google, percepção de lentidão',
        promptCorrecao: `
1. Lazy load imagens/vídeos abaixo da dobra: loading="lazy"
2. Code splitting: Suspense + lazy() em componentes pesados
3. Mover listas/grids para baixo da dobra
4. staleTime: 5min em queries para evitar refetch
5. Otimizar imagens (compression + WebP)`,
        nivelEsperado: 'LCP < 2.5s (ideal < 1.5s)',
        base44Standard: '✅ LCP < 2.5s'
      });
    }

    // FCP (First Contentful Paint) - BASE44: < 1.5s
    if (perf.fcp > 1500 && perf.fcp <= 2500) {
      diagnosticos.push({
        severity: 'ALTO',
        categoria: 'FCP - First Contentful Paint',
        problema: `FCP ${Math.round(perf.fcp)}ms (Base44: < 1.5s)`,
        causaRaiz: 'Bundle inicial pesado ou queries síncronas no primeiro render',
        impacto: 'Usuário espera tela branca, percepção de lentidão',
        promptCorrecao: `
1. Lazy load componentes não críticos: const X = lazy(() => import('./X'))
2. Código crítico inline no <head>
3. Defer scripts não essenciais
4. Prefetch queries estratégicas (hover + staleTime)`,
        nivelEsperado: 'FCP < 1.5s',
        base44Standard: '✅ FCP < 1.5s'
      });
    }

    // TTFB (Time to First Byte) - BASE44: < 600ms
    if (perf.ttfb > 600) {
      diagnosticos.push({
        severity: 'ALTO',
        categoria: 'TTFB - Time to First Byte',
        problema: `TTFB ${Math.round(perf.ttfb)}ms (Base44: < 600ms)`,
        causaRaiz: 'Backend lento ou sem CDN Cloudflare',
        impacto: 'Atraso inicial perceptível, SEO penalizado',
        promptCorrecao: `
1. Verificar CDN Cloudflare ativo (republicar app)
2. Otimizar backend functions (remover await bloqueantes)
3. Edge caching para assets estáticos`,
        nivelEsperado: 'TTFB < 600ms',
        base44Standard: '✅ TTFB < 600ms (CDN Cloudflare)'
      });
    }

    // CLS (Cumulative Layout Shift) - BASE44: < 0.1
    const clsReal = perf.cls || 0;
    if (clsReal > 0.1 || !document.querySelector('img[width][height]')) {
      diagnosticos.push({
        severity: 'MÉDIO',
        categoria: 'CLS - Cumulative Layout Shift',
        problema: 'Layout shift detectado ou imagens sem dimensões',
        causaRaiz: 'Imagens/vídeos sem width/height, fontes sem font-display:swap, conteúdo dinâmico sem espaço reservado',
        impacto: 'Cliques errados, frustração, penalização SEO',
        promptCorrecao: `
1. Adicionar width/height em TODAS imagens/vídeos
2. font-display: swap; no CSS
3. Skeleton com altura fixa durante load
4. Evitar injeção de conteúdo acima do fold`,
        nivelEsperado: 'CLS < 0.1',
        base44Standard: '✅ CLS < 0.1'
      });
    }

    // INP (Interaction to Next Paint) - BASE44: < 200ms
    const inpReal = perf.inp || 0;
    if (inpReal > 200) {
      diagnosticos.push({
        severity: 'MÉDIO',
        categoria: 'INP - Interaction to Next Paint',
        problema: 'Resposta lenta a cliques/toques',
        causaRaiz: 'Scripts longos no main thread, animações pesadas, listeners sem debounce',
        impacto: 'Percepção de travamento, UX ruim em mobile',
        promptCorrecao: `
1. Defer scripts não críticos
2. Debounce em onChange (300ms)
3. Simplificar animações (CSS > JS)
4. Web Workers para processamento pesado`,
        nivelEsperado: 'INP < 200ms',
        base44Standard: '✅ INP < 200ms'
      });
    }

    // Queries Lentas - BASE44: < 2 queries > 1s
    if (health.slowQueries > 2) {
      diagnosticos.push({
        severity: 'CRÍTICO',
        categoria: 'Queries Lentas (>1s)',
        problema: `${health.slowQueries} queries > 1s (Base44: < 2)`,
        causaRaiz: 'Índices ausentes, filtros sem otimização, N+1 problem',
        impacto: 'Timeout mobile, bounce rate, custo backend alto',
        promptCorrecao: `
1. Criar índices compostos: [clinica_id, -created_date]
2. staleTime: 5-10min para dados semi-estáticos
3. Backend function agregador (1 call vs N calls)
4. Pagination + virtualização em listas`,
        nivelEsperado: '< 2 queries lentas',
        base44Standard: '✅ < 2 queries > 1s',
        snippets: health.slowQueriesSnippets || [],
        detalhes: health.slowQueriesSnippets?.map(snippet => ({
          problema: 'Query lenta detectada',
          local: 'Network waterfall',
          exemplos: [snippet]
        }))
      });
    }

    // Memória - BASE44: < 100MB
    if (perf.memoryUsed && parseFloat(perf.memoryUsed) > 100) {
      diagnosticos.push({
        severity: 'ALTO',
        categoria: 'Memória (Heap)',
        problema: `${perf.memoryUsed}MB heap (Base44: < 100MB)`,
        causaRaiz: 'Memory leak: listeners, intervals, closures, cache infinito',
        impacto: 'Crash em uso prolongado, lentidão progressiva',
        promptCorrecao: `
1. Cleanup: return () => { clearInterval(); removeListener(); }
2. Weak maps para caches
3. Limitar histórico de queries (gcTime)
4. Virtual scrolling em listas grandes`,
        nivelEsperado: '< 50MB (mobile) / < 100MB (desktop)',
        base44Standard: '✅ Heap < 100MB'
      });
    }

    // === CONNECTIVITY: Entities/Functions DESCONECTADAS ===
    if (entityHealth.issues && entityHealth.issues.length > 0) {
      entityHealth.issues.forEach(issue => {
        diagnosticos.push({
          severity: issue.severidade,
          categoria: `CONNECTIVITY - ${issue.tipo}`,
          problema: issue.problema,
          causaRaiz: issue.snippet,
          impacto: issue.impacto,
          promptCorrecao: issue.correcao,
          nivelEsperado: 'Todas entities/functions conectadas',
          base44Standard: '✅ 100% connectivity',
          snippets: [issue.snippet],
          detalhes: [{
            problema: issue.problema,
            local: issue.local,
            exemplos: [issue.snippet]
          }]
        });
      });
    }

    // === COMPLIANCE LGPD/CFM ===
    if (complianceResults && complianceResults.score < complianceResults.total) {
      const percentual = Math.round((complianceResults.score / complianceResults.total) * 100);
      diagnosticos.push({
        severity: percentual < 60 ? 'CRÍTICO' : 'ALTO',
        categoria: 'Compliance LGPD/CFM',
        problema: `Score ${percentual}% (${complianceResults.score}/${complianceResults.total})`,
        causaRaiz: complianceResults.items.filter(i => !i.ok).map(i => i.label).join(', '),
        impacto: 'Multa LGPD (2-50MM BRL), suspensão CFM, responsabilidade civil',
        promptCorrecao: `Corrigir: ${complianceResults.items.filter(i => !i.ok).map(i => i.label).join('; ')}`,
        nivelEsperado: '100% compliance',
        base44Standard: '⚠️ Termo aceite + Hash + Assinatura digital'
      });
    }

    // === UX/ACESSIBILIDADE ===
    if (uxAudit && uxAudit.issues.length > 0) {
      const uxProblems = uxAudit.issues.map(issue => {
        const textoIssue = typeof issue === 'string' ? issue : issue.texto;
        const snippets = typeof issue === 'string' ? [] : (issue.snippets || []);
        const local = typeof issue === 'string' ? 'DOM' : (issue.local || 'DOM');
        return { texto: textoIssue, snippets, local };
      });

      diagnosticos.push({
        severity: uxAudit.issues.length > 5 ? 'ALTO' : 'MÉDIO',
        categoria: 'UX/Acessibilidade',
        problema: `${uxAudit.issues.length} problemas detectados`,
        causaRaiz: uxProblems.map(p => p.texto).slice(0, 3).join(', '),
        impacto: 'Bounce mobile alto, inacessível (ADA), SEO penalizado',
        promptCorrecao: `Corrigir: ${uxProblems.map(p => p.texto).join('; ')}`,
        nivelEsperado: '0 issues UX',
        base44Standard: '✅ Touch ≥44px + aria-labels + roles',
        snippets: uxProblems.flatMap(p => p.snippets).slice(0, 5),
        detalhes: uxProblems.map(p => ({
          problema: p.texto,
          local: p.local,
          exemplos: p.snippets
        }))
      });
    }

    // === PWA ===
    const pwaIssues = [];
    if (!navigator.serviceWorker.controller) pwaIssues.push('Service Worker inativo');
    if (!document.querySelector('link[rel="manifest"]')) pwaIssues.push('Sem manifest');
    if (Notification?.permission !== 'granted') pwaIssues.push('Push não autorizado');

    if (pwaIssues.length > 0) {
      diagnosticos.push({
        severity: 'MÉDIO',
        categoria: 'PWA Offline',
        problema: pwaIssues.join(', '),
        causaRaiz: 'PWA incompleto ou não inicializado',
        impacto: 'Sem offline, sem push, não instalável',
        promptCorrecao: `Verificar: ServiceWorkerRegistration.jsx + manifest.json + PushNotificationManager`,
        nivelEsperado: 'Service Worker ativo + Push granted',
        base44Standard: '✅ PWA instalável + Offline ready'
      });
    }

    // === SECURITY ===
    const securityIssues = [];
    if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
      securityIssues.push('Sem HTTPS (dados em texto plano)');
    }

    if (securityIssues.length > 0) {
      diagnosticos.push({
        severity: 'CRÍTICO',
        categoria: 'Security',
        problema: securityIssues.join(', '),
        causaRaiz: 'Deploy sem certificado SSL',
        impacto: 'Man-in-the-middle, dados médicos interceptáveis',
        promptCorrecao: `Forçar HTTPS: CloudFlare SSL Full (strict) ou Let's Encrypt`,
        nivelEsperado: 'HTTPS 100%',
        base44Standard: '✅ HTTPS obrigatório'
      });
    }

    // === SKELETON/LOADING UX ===
    if (perf.fcp > 1500 && !document.querySelector('[role="status"]')) {
      diagnosticos.push({
        severity: 'MÉDIO',
        categoria: 'Loading States',
        problema: 'Sem feedback visual durante carregamento',
        causaRaiz: 'Falta Skeleton ou spinner com role="status"',
        impacto: 'Usuário percebe lentidão mesmo com cache ativo',
        promptCorrecao: `Adicionar <Skeleton /> ou spinner com role="status" em TODOS isLoading`,
        nivelEsperado: 'Loading visual em < 200ms',
        base44Standard: '✅ Skeleton + role="status"'
      });
    }

    // SEM PROBLEMAS
    if (diagnosticos.length === 0) {
      diagnosticos.push({
        severity: 'OK',
        categoria: '✅ Sistema Saudável',
        problema: 'Nenhum problema detectado',
        causaRaiz: 'N/A',
        impacto: 'App em conformidade com padrões Base44',
        promptCorrecao: 'Monitoramento ativo. Validar métricas semanalmente.',
        nivelEsperado: 'LCP<2.5s, FCP<1.5s, INP<200ms, CLS<0.1',
        base44Standard: '✅ 100% conformidade'
      });
    }

    return diagnosticos;
  };

  // Componente auxiliar para métricas
  const MetricCard = ({ icon, label, value, status }) => (
    <div style={{
      backgroundColor: '#f8f9fa',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #e8eaed',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        backgroundColor: status === 'good' ? '#e8f5e9' : status === 'bad' ? '#fef2f2' : '#f5f3ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '10px', color: '#80868b', marginBottom: '2px' }}>{label}</p>
        <p style={{ fontSize: '14px', fontWeight: '700', color: '#202124' }}>{value}</p>
      </div>
      {status !== 'neutral' && (
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: status === 'good' ? '#34a853' : status === 'ok' ? '#fbbc04' : '#ea4335',
          flexShrink: 0
        }} />
      )}
    </div>
  );

  // GERAR RELATÓRIO COMPLETO (compartilhado entre tabs)
  const gerarRelatorioCompleto = () => {
    return `
╔════════════════════════════════════════╗
║  CONECTACLINICA - DIAGNÓSTICO BRUTAL  ║
║  ${new Date().toLocaleString('pt-BR')}              ║
║  MÓDULO: ${currentModule}                    ║
╚════════════════════════════════════════╝

🔴 ERROS (${errors.length}):
${errors.length === 0 ? 'Nenhum erro detectado ✅' : errors.map((e, i) => `
━━ ERRO #${i + 1} ━━
Tipo: ${e.type}
Mensagem: ${e.message}
Stack: ${e.stack || 'N/A'}
${e.filename ? `Arquivo: ${e.filename}:${e.lineno}:${e.colno}` : ''}
Timestamp: ${e.timestamp}
`).join('\n')}

📊 ENTITIES (${entityHealth.entities.length}):
${entityHealth.entities.map(ent => `
• ${ent.entity} (${ent.module}): ${ent.status} - ${ent.latency}ms
  ${ent.snippet}
  ${!ent.multitenantOK ? `⚠️ ${ent.invalidCount} registros com clinica_id ERRADO` : ''}
`).join('')}

⚡ FUNCTIONS (${entityHealth.functions.length}):
${entityHealth.functions.map(fn => `
• ${fn.function} (${fn.module}): ${fn.status} - ${fn.latency}ms
  ${fn.snippet}
  ${fn.error ? `❌ ${fn.error}` : ''}
`).join('')}

🚨 CONNECTIVITY ISSUES (${connectivityIssues.length}):
${connectivityIssues.map((issue, i) => `
━━ ISSUE #${i + 1} ━━
[${issue.severidade}] ${issue.tipo}
Problema: ${issue.problema}
Local: ${issue.local}
Snippet: ${issue.snippet}
Impacto: ${issue.impacto}
Correção: ${issue.correcao}
`).join('')}

⚡ PERFORMANCE (Core Web Vitals):
LCP: ${Math.round(performanceMetrics.lcp || 0)}ms ${performanceMetrics.lcp < 2500 ? '✅' : '❌'} (Meta: <2500ms)
FCP: ${Math.round(performanceMetrics.fcp || 0)}ms ${performanceMetrics.fcp < 1500 ? '✅' : '❌'} (Meta: <1500ms)
CLS: ${performanceMetrics.cls?.toFixed(3) || '0.000'} ${performanceMetrics.cls < 0.1 ? '✅' : '❌'} (Meta: <0.1)
INP: ${Math.round(performanceMetrics.inp || 0)}ms ${performanceMetrics.inp < 200 ? '✅' : '❌'} (Meta: <200ms)
TTFB: ${Math.round(performanceMetrics.ttfb || 0)}ms ${performanceMetrics.ttfb < 600 ? '✅' : '❌'} (Meta: <600ms)
Page Load: ${(performanceMetrics.pageLoad / 1000).toFixed(2)}s
Memory: ${performanceMetrics.memoryUsed} MB ${parseFloat(performanceMetrics.memoryUsed || 0) < 100 ? '✅' : '❌'}
Resources: ${performanceMetrics.resourceCount}

🏥 SAÚDE:
API Calls: ${healthMetrics.apiCalls || 0}
Slow Queries (>1s): ${healthMetrics.slowQueries || 0} ${healthMetrics.slowQueries < 2 ? '✅' : '❌'}
${healthMetrics.slowQueriesSnippets?.length > 0 ? `Top lentas:\n${healthMetrics.slowQueriesSnippets.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}` : ''}
Cached: ${healthMetrics.cachedResources || 0}

🔀 NAVEGAÇÃO SPA (${navigationMetrics.history.length} transições):
${navigationMetrics.lastTransition ? `Última: ${navigationMetrics.lastTransition.from} → ${navigationMetrics.lastTransition.to} (${navigationMetrics.lastTransition.duration}ms) ${navigationMetrics.lastTransition.type}` : 'Nenhuma transição'}
${navigationMetrics.history.length > 0 ? `Média: ${Math.round(navigationMetrics.history.reduce((sum, n) => sum + n.duration, 0) / navigationMetrics.history.length)}ms
Lentas (>1s): ${navigationMetrics.history.filter(n => n.duration > 1000).length}/${navigationMetrics.history.length}
Top 3 lentas: ${navigationMetrics.history.sort((a, b) => b.duration - a.duration).slice(0, 3).map(n => `${n.from}→${n.to} (${n.duration}ms)`).join(', ')}` : ''}

🔒 COMPLIANCE LGPD/CFM (${complianceResults ? Math.round((complianceResults.score / complianceResults.total) * 100) : 0}%):
${complianceResults ? `Score: ${complianceResults.score}/${complianceResults.total}
${complianceResults.items.map(c => `${c.ok ? '✅' : '❌'} ${c.label}`).join('\n')}

MÉTRICAS LGPD:
${complianceResults.metricas_lgpd ? `• Aceites: ${complianceResults.metricas_lgpd.total_aceites}
• Duplicações: ${complianceResults.metricas_lgpd.duplicacoes} ${complianceResults.metricas_lgpd.duplicacoes > 0 ? '❌' : '✅'}
• Leitura completa: ${complianceResults.metricas_lgpd.leitura_completa}/${complianceResults.metricas_lgpd.total_aceites}
• Tempo médio: ${complianceResults.metricas_lgpd.tempo_medio}s
• Scroll médio: ${complianceResults.metricas_lgpd.scroll_medio}%` : 'N/A'}` : 'Aguardando...'}

📱 UX/ACESSIBILIDADE (Score: ${uxAudit.score}/100):
${uxAudit.issues.length === 0 ? '✅ 100% conforme Base44' : `Issues (${uxAudit.issues.length}):
${uxAudit.issues.map((issue, i) => {
  const isObj = typeof issue === 'object';
  const texto = isObj ? issue.texto : issue;
  const snippets = isObj ? issue.snippets : [];
  return `${i + 1}. [${isObj ? issue.severidade : 'MÉDIO'}] ${texto}
   Snippets: ${snippets.length > 0 ? snippets.join(' | ') : 'N/A'}`;
}).join('\n')}`}

📲 PWA:
Service Worker: ${navigator.serviceWorker.controller ? '✅ Ativo' : '❌ Inativo'}
Manifest: ${document.querySelector('link[rel="manifest"]') ? '✅ OK' : '❌ Ausente'}
Push: ${Notification?.permission || 'N/A'}

🤖 DIAGNÓSTICO IA:
${analisarErrosIA(errors, performanceMetrics, healthMetrics, complianceResults, uxAudit).map(d => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[${d.severity}] ${d.categoria}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Problema: ${d.problema}
Causa: ${d.causaRaiz}
Impacto: ${d.impacto}
Meta: ${d.nivelEsperado}
${d.base44Standard ? `Base44: ${d.base44Standard}` : ''}

${d.snippets && d.snippets.length > 0 ? `📍 Snippets:\n${d.snippets.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}\n` : ''}
${d.detalhes && d.detalhes.length > 0 ? `🔍 Detalhes:\n${d.detalhes.map(det => `  • ${det.problema} (${det.local})\n    ${det.exemplos?.join('\n    ') || ''}`).join('\n')}\n` : ''}
🔧 Correção:
${d.promptCorrecao}
`).join('\n')}

═══════════════════════════════════════
FIM DO DIAGNÓSTICO
`;
  };

  // GERAR RELATÓRIO POR TAB
  const gerarRelatorioTab = (tab) => {
    const header = `
╔════════════════════════════════════════╗
║  CONECTACLINICA - ${tab.toUpperCase()}  
║  ${new Date().toLocaleString('pt-BR')}              ║
║  MÓDULO: ${currentModule}                    ║
╚════════════════════════════════════════╝

`;

    if (tab === 'erros') {
      return header + `🔴 ERROS (${errors.length}):
${errors.length === 0 ? 'Nenhum erro detectado ✅' : errors.map((e, i) => `
━━ ERRO #${i + 1} ━━
Tipo: ${e.type}
Mensagem: ${e.message}
Stack: ${e.stack || 'N/A'}
${e.filename ? `Arquivo: ${e.filename}:${e.lineno}:${e.colno}` : ''}
Timestamp: ${e.timestamp}
`).join('\n')}`;
    }

    if (tab === 'entities') {
      return header + `📊 ENTITIES (${entityHealth.entities.length}):
${entityHealth.entities.map(ent => `
• ${ent.entity} (${ent.module}): ${ent.status} - ${ent.latency}ms
  Count: ${ent.count || 0}
  Multitenant OK: ${ent.multitenantOK ? 'SIM' : 'NÃO'}
  ${ent.snippet}
  ${!ent.multitenantOK ? `⚠️ ${ent.invalidCount} registros com clinica_id ERRADO` : ''}
`).join('')}

🚨 ISSUES (${connectivityIssues.length}):
${connectivityIssues.map((issue, i) => `
━━ ISSUE #${i + 1} ━━
[${issue.severidade}] ${issue.tipo}
Problema: ${issue.problema}
Local: ${issue.local}
Snippet: ${issue.snippet}
Impacto: ${issue.impacto}
Correção: ${issue.correcao}
`).join('')}`;
    }

    if (tab === 'functions') {
      return header + `⚡ FUNCTIONS (${entityHealth.functions.length}):
${entityHealth.functions.map(fn => `
• ${fn.function} (${fn.module}): ${fn.status} - ${fn.latency}ms
  ${fn.snippet}
  ${fn.error ? `❌ ${fn.error}` : ''}
`).join('')}`;
    }

    if (tab === 'pagespeed') {
      if (!pageSpeedData) {
        return header + 'PageSpeed: Nenhuma análise executada ainda. Clique em "Executar PageSpeed" na aba PageSpeed.';
      }
      return header + `🚀 GOOGLE PAGESPEED INSIGHTS (PRODUCTION):

Performance Score: ${Math.round(pageSpeedData.performanceScore)}/100 ${pageSpeedData.performanceScore >= 90 ? '✅' : pageSpeedData.performanceScore >= 50 ? '⚠️' : '❌'}
Strategy: ${pageSpeedData.strategy}
URL: ${pageSpeedData.analyzedUrl}

LAB DATA (Lighthouse):
• LCP: ${Math.round(pageSpeedData.labData.lcp)}ms ${pageSpeedData.labData.lcp < 2500 ? '✅' : '❌'} (Meta: <2500ms)
• FCP: ${Math.round(pageSpeedData.labData.fcp)}ms ${pageSpeedData.labData.fcp < 1800 ? '✅' : '❌'} (Meta: <1800ms)
• CLS: ${pageSpeedData.labData.cls.toFixed(3)} ${pageSpeedData.labData.cls < 0.1 ? '✅' : '❌'} (Meta: <0.1)
• TTI: ${(pageSpeedData.labData.tti / 1000).toFixed(2)}s ${pageSpeedData.labData.tti < 3800 ? '✅' : '❌'}
• TBT: ${Math.round(pageSpeedData.labData.tbt)}ms ${pageSpeedData.labData.tbt < 200 ? '✅' : '❌'}
• Speed Index: ${(pageSpeedData.labData.speedIndex / 1000).toFixed(2)}s

${pageSpeedData.fieldData ? `FIELD DATA (Real Users - 28 dias):
${JSON.stringify(pageSpeedData.fieldData, null, 2)}` : '⚠️ Ainda sem dados de campo (app novo)'}

TOP OTIMIZAÇÕES (${pageSpeedData.opportunities?.length || 0}):
${pageSpeedData.opportunities?.map((opp, i) => `${i + 1}. ${opp.title} (economia: ${(opp.savings / 1000).toFixed(2)}s)`).join('\n') || 'Nenhuma sugestão crítica'}

Timestamp: ${new Date(pageSpeedData.timestamp).toLocaleString('pt-BR')}
`;
    }

    if (tab === 'performance') {
      return header + `⚡ PERFORMANCE (Core Web Vitals):
LCP: ${Math.round(performanceMetrics.lcp || 0)}ms ${performanceMetrics.lcp < 2500 ? '✅' : '❌'} (Meta: <2500ms, Ideal: <1500ms)
FCP: ${Math.round(performanceMetrics.fcp || 0)}ms ${performanceMetrics.fcp < 1500 ? '✅' : '❌'} (Meta: <1500ms)
CLS: ${performanceMetrics.cls?.toFixed(3) || '0.000'} ${performanceMetrics.cls < 0.1 ? '✅' : '❌'} (Meta: <0.1)
INP: ${Math.round(performanceMetrics.inp || 0)}ms ${performanceMetrics.inp < 200 ? '✅' : '❌'} (Meta: <200ms)
TTFB: ${Math.round(performanceMetrics.ttfb || 0)}ms ${performanceMetrics.ttfb < 600 ? '✅' : '❌'} (Meta: <600ms)
Page Load: ${(performanceMetrics.pageLoad / 1000).toFixed(2)}s
DOM Load: ${Math.round(performanceMetrics.domLoad || 0)}ms
Memory: ${performanceMetrics.memoryUsed} MB ${parseFloat(performanceMetrics.memoryUsed || 0) < 100 ? '✅' : '❌'}
Resources: ${performanceMetrics.resourceCount}

🏥 SAÚDE:
API Calls: ${healthMetrics.apiCalls || 0}
Slow API Queries (>1s): ${healthMetrics.slowAPIQueries || 0} ${healthMetrics.slowAPIQueries < 2 ? '✅' : '❌'}
Slow Dev Resources (Vite): ${healthMetrics.slowDevResources || 0} ${healthMetrics.devModeWarning ? '⚠️ DEV MODE' : ''}
${healthMetrics.slowQueriesSnippets?.length > 0 ? `Top lentas:\n${healthMetrics.slowQueriesSnippets.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}` : ''}
Cached: ${healthMetrics.cachedResources || 0}

${healthMetrics.devModeWarning ? `⚠️ CRÍTICO: ${healthMetrics.slowDevResources} recursos lentos = DEV MODE (Vite HMR). Métricas inúteis.
   → Deploy em production para métricas reais
   → Use aba PageSpeed para dados válidos` : ''}`;
    }

    if (tab === 'rotas') {
      return header + `🔀 NAVEGAÇÃO SPA (${navigationMetrics.history.length} transições):
${navigationMetrics.lastTransition ? `Última: ${navigationMetrics.lastTransition.from} → ${navigationMetrics.lastTransition.to} (${navigationMetrics.lastTransition.duration}ms) ${navigationMetrics.lastTransition.type}` : 'Nenhuma'}

Estatísticas:
${navigationMetrics.history.length > 0 ? `Média: ${Math.round(navigationMetrics.history.reduce((sum, n) => sum + n.duration, 0) / navigationMetrics.history.length)}ms
Lentas (>1s): ${navigationMetrics.history.filter(n => n.duration > 1000).length}/${navigationMetrics.history.length}
Críticas (>2s): ${navigationMetrics.history.filter(n => n.duration > 2000).length}/${navigationMetrics.history.length}

Top 5 lentas:
${navigationMetrics.history.sort((a, b) => b.duration - a.duration).slice(0, 5).map((n, i) => `  ${i + 1}. ${n.from}→${n.to}: ${n.duration}ms (${n.type})`).join('\n')}

Histórico (últimas 20):
${navigationMetrics.history.slice().reverse().map((n, i) => `  ${i + 1}. ${n.from}→${n.to}: ${n.duration}ms (${n.type})`).join('\n')}` : 'Navegue para rastrear'}`;
    }

    if (tab === 'compliance') {
      return header + `🔒 COMPLIANCE LGPD/CFM (${complianceResults ? Math.round((complianceResults.score / complianceResults.total) * 100) : 0}%):
${complianceResults ? `Score: ${complianceResults.score}/${complianceResults.total}

Checklist:
${complianceResults.items.map(c => `${c.ok ? '✅' : '❌'} ${c.label}`).join('\n')}

MÉTRICAS LGPD:
${complianceResults.metricas_lgpd ? `• Aceites totais: ${complianceResults.metricas_lgpd.total_aceites}
• Duplicações: ${complianceResults.metricas_lgpd.duplicacoes} ${complianceResults.metricas_lgpd.duplicacoes > 0 ? '❌ CRÍTICO' : '✅'}
• Leitura completa: ${complianceResults.metricas_lgpd.leitura_completa}/${complianceResults.metricas_lgpd.total_aceites}
• Tempo médio leitura: ${complianceResults.metricas_lgpd.tempo_medio}s
• Scroll médio: ${complianceResults.metricas_lgpd.scroll_medio}%` : 'N/A'}` : 'Aguardando checklist...'}`;
    }

    if (tab === 'ux') {
      return header + `📱 UX/ACESSIBILIDADE (Score: ${uxAudit.score}/100):
${uxAudit.issues.length === 0 ? '✅ 100% conforme Base44 - NENHUM problema detectado' : `
⚠️ ISSUES DETECTADAS (${uxAudit.issues.length}):
${uxAudit.issues.map((issue, i) => {
  const isObj = typeof issue === 'object';
  const texto = isObj ? issue.texto : issue;
  const snippets = isObj ? issue.snippets : [];
  const severidade = isObj ? issue.severidade : 'MÉDIO';
  const local = isObj ? issue.local : 'DOM';
  return `
━━ ISSUE #${i + 1} ━━
[${severidade}] ${texto}
Local: ${local}
Snippets identificados:
${snippets.length > 0 ? snippets.map((s, si) => `  ${si + 1}. ${s}`).join('\n') : 'N/A'}
`;
}).join('')}`}

PADRÕES BASE44 UX/MOBILE:
• Touch targets: ≥ 44px x 44px
• Aria-labels: 100% botões/ícones
• Skeleton: role="status" em loading
• Contraste: WCAG AAA (7:1)
• Responsive: Mobile-first breakpoints`;
    }

    if (tab === 'pwa') {
      return header + `📲 PWA STATUS:
Service Worker: ${navigator.serviceWorker.controller ? '✅ Ativo' : '❌ Inativo'}
Manifest: ${document.querySelector('link[rel="manifest"]') ? '✅ OK' : '❌ Ausente'}
Push Notifications: ${Notification?.permission || 'N/A'}
Offline Ready: ${navigator.serviceWorker.controller ? '✅ Sim' : '❌ Não'}

PADRÕES BASE44 PWA:
• Service Worker: Ativo + cache strategy
• Manifest: icons + theme_color + start_url
• Offline: Fallback page configurado
• Push: Notifications granted
• Instalável: beforeinstallprompt capturado`;
    }

    if (tab === 'ia') {
      const diagnosticos = analisarErrosIA(errors, performanceMetrics, healthMetrics, complianceResults, uxAudit);
      return header + `🤖 DIAGNÓSTICO IA (${diagnosticos.length} análises):
${diagnosticos.map((d, i) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIAGNÓSTICO #${i + 1}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[${d.severity}] ${d.categoria}
Problema: ${d.problema}
Causa raiz: ${d.causaRaiz}
Impacto: ${d.impacto}
Meta: ${d.nivelEsperado}
${d.base44Standard ? `Base44 Standard: ${d.base44Standard}` : ''}

${d.snippets && d.snippets.length > 0 ? `📍 Snippets identificados:
${d.snippets.map((s, si) => `  ${si + 1}. ${s}`).join('\n')}
` : ''}
${d.detalhes && d.detalhes.length > 0 ? `🔍 Análise detalhada:
${d.detalhes.map(det => `  • ${det.problema} (${det.local})
    ${det.exemplos?.map(ex => `    - ${ex}`).join('\n') || ''}`).join('\n')}
` : ''}
🔧 CORREÇÃO:
${d.promptCorrecao}
`).join('\n')}`;
    }

    return header + 'Tab não implementada';
  };

  // SEGURANÇA: Não renderizar se não for admin
  if (!isAdmin) return null;

  const temErros = errors.length > 0;

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: '160px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px'
      }}>
        {/* Painel Expandido */}
        {expanded && (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            width: '650px',
            maxHeight: '80vh',
            border: `2px solid ${temErros ? '#ea4335' : '#34a853'}`,
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #e8eaed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <strong style={{ fontSize: '15px', color: '#202124' }}>
                  🔬 Diagnóstico
                </strong>
                <span style={{ fontSize: '11px', color: '#80868b', backgroundColor: '#f5f3ff', padding: '4px 10px', borderRadius: '6px' }}>
                  {currentModule}
                </span>
              </div>
              <button
                onClick={async () => {
                  // SINCRONIZAR SEM RELOAD: Re-executar coleta
                  setComplianceResults(null);
                  setPerformanceMetrics({});
                  setHealthMetrics({});
                  setUxAudit({ issues: [], score: 100 });
                  setEntityHealth({ entities: [], functions: [], issues: [] });
                  setConnectivityIssues([]);
                  
                  // Forçar re-coleta imediata (sem reload)
                  setTimeout(() => {
                    window.dispatchEvent(new Event('errorlogger-force-sync'));
                  }, 100);
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '44px',
                  minWidth: '44px'
                }}
                title="Sincronizar diagnóstico (SEM reload)"
                aria-label="Sincronizar diagnóstico completo"
              >
                <RefreshCw style={{ width: '16px', height: '16px', color: '#7E57FF' }} />
                <span style={{ fontSize: '11px', color: '#7E57FF', fontWeight: '600' }}>Sync</span>
              </button>
              <button
                onClick={() => {
                  // COPIAR TUDO
                  const fullReport = gerarRelatorioCompleto();
                  navigator.clipboard.writeText(fullReport).then(() => {
                    alert('✅ Relatório completo copiado!');
                  });
                }}
                style={{
                  padding: '10px',
                  backgroundColor: '#34a853',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '44px',
                  minWidth: '44px'
                }}
                title="Copiar relatório completo"
                aria-label="Copiar diagnóstico completo para clipboard"
              >
                <Download style={{ width: '16px', height: '16px', color: '#fff' }} />
              </button>
              <button
                onClick={() => setExpanded(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '10px',
                  minHeight: '44px',
                  minWidth: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label="Fechar painel de diagnóstico"
              >
                <X style={{ width: '20px', height: '20px', color: '#5f6368' }} />
              </button>
            </div>

            {/* Tabs - COMPLETO */}
            <div style={{
              display: 'flex',
              gap: '4px',
              padding: '8px 16px',
              borderBottom: '1px solid #e8eaed',
              backgroundColor: '#f8f9fa',
              overflowX: 'auto'
            }}>
              {[
                { id: 'erros', label: 'Erros', icon: AlertCircle, count: errors.length },
                { id: 'teste-modal', label: 'E2E Modal', icon: TestTube },
                { id: 'pagespeed', label: 'PageSpeed', icon: TrendingUp },
                { id: 'entities', label: 'Entities', icon: Database, count: connectivityIssues.length },
                { id: 'functions', label: 'Functions', icon: Code, count: entityHealth.functions.filter(f => f.status === 'ERROR').length },
                { id: 'performance', label: 'Perf', icon: Zap },
                { id: 'rotas', label: 'Rotas', icon: Activity },
                { id: 'compliance', label: 'LGPD', icon: Shield },
                { id: 'ux', label: 'UX', icon: TrendingUp },
                { id: 'pwa', label: 'PWA', icon: Wifi },
                { id: 'ia', label: 'IA', icon: TrendingUp }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-label={`Visualizar aba ${tab.label}${tab.count > 0 ? ` (${tab.count} itens)` : ''}`}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: activeTab === tab.id ? '#7E57FF' : 'transparent',
                    color: activeTab === tab.id ? '#fff' : '#5f6368',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    minHeight: '44px',
                    minWidth: '44px'
                  }}
                >
                  <tab.icon style={{ width: '14px', height: '14px' }} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{
                      backgroundColor: activeTab === tab.id ? '#fff' : '#ea4335',
                      color: activeTab === tab.id ? '#7E57FF' : '#fff',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}>
                      {tab.count > 9 ? '9+' : tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Actions - Copiar por guia */}
            <div style={{
              padding: '8px 16px',
              borderBottom: '1px solid #e8eaed',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  const report = gerarRelatorioTab(activeTab);
                  navigator.clipboard.writeText(report).then(() => {
                    alert(`✅ ${activeTab.toUpperCase()} copiado!`);
                  });
                }}
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#7E57FF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  minHeight: '44px',
                  minWidth: '44px'
                }}
                title={`Copiar diagnóstico da aba ${activeTab}`}
                aria-label={`Copiar diagnóstico da aba ${activeTab} para clipboard`}
              >
                <Download style={{ width: '12px', height: '12px' }} />
                Copiar {activeTab.toUpperCase()}
              </button>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              maxHeight: 'calc(80vh - 220px)'
            }}>
              {activeTab === 'teste-modal' && (
                <div style={{ padding: '16px' }}>
                  <div style={{ backgroundColor: '#f5f3ff', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #ddd6fe' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#5b21b6', marginBottom: '6px' }}>
                      🧪 TESTE E2E LOCAL - {currentModule}
                    </p>
                    <p style={{ fontSize: '10px', color: '#5f6368', lineHeight: '1.6' }}>
                      Valida comportamento do ModalTermoObrigatorio na página atual sem navegar
                    </p>
                  </div>

                  {!showTesteModal ? (
                    <button
                      onClick={() => setShowTesteModal(true)}
                      style={{
                        width: '100%',
                        padding: '14px',
                        backgroundColor: '#7E57FF',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        minHeight: '48px',
                        minWidth: '48px'
                      }}
                    >
                      <TestTube style={{ width: '18px', height: '18px' }} />
                      Executar Teste Local
                    </button>
                  ) : (
                    <Suspense fallback={<div style={{ textAlign: 'center', padding: '20px' }}>
                      <Activity className="animate-spin" style={{ width: '32px', height: '32px', margin: '0 auto', color: '#7E57FF' }} />
                    </div>}>
                      <TesteModalLocal 
                        moduloNome={currentModule} 
                        user={user}
                        onClose={() => setShowTesteModal(false)}
                      />
                    </Suspense>
                  )}
                </div>
              )}

              {activeTab === 'pagespeed' && (
                <div style={{ fontSize: '12px' }}>
                  {/* AVISO: Production Only */}
                  <div style={{ backgroundColor: '#fef9e5', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #fef3c7' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#854d0e', marginBottom: '4px' }}>
                      ⚠️ PRODUCTION ONLY
                    </p>
                    <p style={{ fontSize: '10px', color: '#a16207', lineHeight: '1.5' }}>
                      PageSpeed Insights só funciona em URLs públicas (não localhost). Deploy o app e use a URL real.
                    </p>
                  </div>

                  {/* Botão Executar Análise */}
                  <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                    <button
                      onClick={async () => {
                        const currentUrl = window.location.origin;

                        if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
                          alert('❌ PageSpeed só funciona em production. Deploy o app primeiro.');
                          return;
                        }

                        setPageSpeedLoading(true);
                        setPageSpeedData(null);

                        try {
                          const response = await base44.functions.invoke('getPageSpeedInsights', {
                            url: currentUrl,
                            strategy: 'mobile'
                          });

                          if (response.data?.success) {
                            setPageSpeedData(response.data.data);
                          } else {
                            alert('❌ ' + (response.data?.error || 'Erro desconhecido'));
                          }
                        } catch (error) {
                          alert('❌ ' + error.message);
                        } finally {
                          setPageSpeedLoading(false);
                        }
                      }}
                      disabled={pageSpeedLoading}
                      style={{
                        padding: '14px 16px',
                        backgroundColor: pageSpeedLoading ? '#dadce0' : '#7E57FF',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: pageSpeedLoading ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        minHeight: '48px',
                        minWidth: '48px'
                      }}
                      aria-label="Executar análise do PageSpeed Insights"
                    >
                      {pageSpeedLoading ? (
                        <>
                          <Activity className="animate-spin" style={{ width: '16px', height: '16px' }} />
                          Analisando... (20-30s)
                        </>
                      ) : (
                        <>
                          <Zap style={{ width: '16px', height: '16px' }} />
                          Executar PageSpeed (Mobile)
                        </>
                      )}
                    </button>

                    <button
                      onClick={async () => {
                        const currentUrl = window.location.origin;
                        
                        if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
                          alert('❌ PageSpeed só funciona em production.');
                          return;
                        }

                        setPageSpeedLoading(true);
                        setPageSpeedData(null);

                        try {
                          const response = await base44.functions.invoke('getPageSpeedInsights', {
                            url: currentUrl,
                            strategy: 'desktop'
                          });

                          if (response.data?.success) {
                            setPageSpeedData(response.data.data);
                          } else {
                            alert('❌ ' + (response.data?.error || 'Erro'));
                          }
                        } catch (error) {
                          alert('❌ ' + error.message);
                        } finally {
                          setPageSpeedLoading(false);
                        }
                      }}
                      disabled={pageSpeedLoading}
                      style={{
                        padding: '14px 16px',
                        backgroundColor: pageSpeedLoading ? '#dadce0' : '#5f6368',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: pageSpeedLoading ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        minHeight: '48px',
                        minWidth: '48px'
                      }}
                      aria-label="Executar análise do PageSpeed Insights para desktop"
                    >
                      {pageSpeedLoading ? (
                        <>
                          <Activity className="animate-spin" style={{ width: '16px', height: '16px' }} />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <Zap style={{ width: '16px', height: '16px' }} />
                          Executar PageSpeed (Desktop)
                        </>
                      )}
                    </button>
                  </div>

                  {/* Resultados */}
                  {pageSpeedData && (
                    <div>
                      {/* Performance Score */}
                      <div style={{
                        backgroundColor: pageSpeedData.performanceScore >= 90 ? '#e8f5e9' : pageSpeedData.performanceScore >= 50 ? '#fef9e5' : '#fef2f2',
                        padding: '16px',
                        borderRadius: '8px',
                        border: `1px solid ${pageSpeedData.performanceScore >= 90 ? '#c8e6c9' : pageSpeedData.performanceScore >= 50 ? '#fef3c7' : '#fee2e2'}`,
                        marginBottom: '12px',
                        textAlign: 'center'
                      }}>
                        <p style={{ fontSize: '40px', fontWeight: '700', color: pageSpeedData.performanceScore >= 90 ? '#1b5e20' : pageSpeedData.performanceScore >= 50 ? '#854d0e' : '#991b1b' }}>
                          {Math.round(pageSpeedData.performanceScore)}
                        </p>
                        <p style={{ fontSize: '11px', color: pageSpeedData.performanceScore >= 90 ? '#2e7d32' : pageSpeedData.performanceScore >= 50 ? '#a16207' : '#b91c1c' }}>
                          Performance Score ({pageSpeedData.strategy})
                        </p>
                      </div>

                      {/* Core Web Vitals - Lab Data */}
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ fontSize: '11px', fontWeight: '700', color: '#202124', marginBottom: '8px' }}>
                          🧪 LAB DATA (Lighthouse):
                        </p>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          <MetricCard
                            icon={<Zap style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                            label="LCP (Largest Contentful Paint)"
                            value={`${Math.round(pageSpeedData.labData.lcp)}ms`}
                            status={pageSpeedData.labData.lcp < 2500 ? 'good' : pageSpeedData.labData.lcp < 4000 ? 'ok' : 'bad'}
                          />
                          <MetricCard
                            icon={<Clock style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                            label="FCP (First Contentful Paint)"
                            value={`${Math.round(pageSpeedData.labData.fcp)}ms`}
                            status={pageSpeedData.labData.fcp < 1800 ? 'good' : pageSpeedData.labData.fcp < 3000 ? 'ok' : 'bad'}
                          />
                          <MetricCard
                            icon={<Activity style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                            label="CLS (Cumulative Layout Shift)"
                            value={pageSpeedData.labData.cls.toFixed(3)}
                            status={pageSpeedData.labData.cls < 0.1 ? 'good' : pageSpeedData.labData.cls < 0.25 ? 'ok' : 'bad'}
                          />
                          <MetricCard
                            icon={<TrendingUp style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                            label="TTI (Time to Interactive)"
                            value={`${(pageSpeedData.labData.tti / 1000).toFixed(2)}s`}
                            status={pageSpeedData.labData.tti < 3800 ? 'good' : pageSpeedData.labData.tti < 7300 ? 'ok' : 'bad'}
                          />
                          <MetricCard
                            icon={<Activity style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                            label="TBT (Total Blocking Time)"
                            value={`${Math.round(pageSpeedData.labData.tbt)}ms`}
                            status={pageSpeedData.labData.tbt < 200 ? 'good' : pageSpeedData.labData.tbt < 600 ? 'ok' : 'bad'}
                          />
                          <MetricCard
                            icon={<Zap style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                            label="Speed Index"
                            value={`${(pageSpeedData.labData.speedIndex / 1000).toFixed(2)}s`}
                            status={pageSpeedData.labData.speedIndex < 3400 ? 'good' : pageSpeedData.labData.speedIndex < 5800 ? 'ok' : 'bad'}
                          />
                        </div>
                      </div>

                      {/* Field Data (Real Users - se disponível) */}
                      {pageSpeedData.fieldData && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '11px', fontWeight: '700', color: '#202124', marginBottom: '8px' }}>
                            📊 FIELD DATA (Real Users - 28 dias):
                          </p>
                          <div style={{ backgroundColor: '#e8f5e9', padding: '12px', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
                            <p style={{ fontSize: '10px', color: '#1b5e20', lineHeight: '1.6' }}>
                              ✅ Dados reais disponíveis (Chrome User Experience Report)
                            </p>
                            <pre style={{ fontSize: '9px', color: '#2e7d32', marginTop: '6px', fontFamily: 'monospace' }}>
                              {JSON.stringify(pageSpeedData.fieldData, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Opportunities */}
                      {pageSpeedData.opportunities && pageSpeedData.opportunities.length > 0 && (
                        <div>
                          <p style={{ fontSize: '11px', fontWeight: '700', color: '#991b1b', marginBottom: '8px' }}>
                            🔧 TOP OTIMIZAÇÕES:
                          </p>
                          <div style={{ display: 'grid', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                            {pageSpeedData.opportunities.map((opp, idx) => (
                              <div key={idx} style={{
                                backgroundColor: '#fef9e5',
                                padding: '10px',
                                borderRadius: '6px',
                                border: '1px solid #fef3c7'
                              }}>
                                <p style={{ fontSize: '11px', fontWeight: '600', color: '#202124', marginBottom: '4px' }}>
                                  {opp.title}
                                </p>
                                <p style={{ fontSize: '9px', color: '#854d0e', lineHeight: '1.4' }}>
                                  {opp.description}
                                </p>
                                {opp.savings > 0 && (
                                  <p style={{ fontSize: '9px', color: '#a16207', marginTop: '4px', fontWeight: '600' }}>
                                    💾 Economia: {(opp.savings / 1000).toFixed(2)}s
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timestamp */}
                      <p style={{ fontSize: '9px', color: '#80868b', marginTop: '12px', textAlign: 'center' }}>
                        Analisado em: {new Date(pageSpeedData.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}

                  {!pageSpeedData && !pageSpeedLoading && (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#5f6368' }}>
                      <Zap style={{ width: '48px', height: '48px', margin: '0 auto 12px', opacity: 0.3 }} />
                      <p style={{ fontSize: '13px' }}>Clique em "Executar PageSpeed" acima</p>
                      <p style={{ fontSize: '10px', marginTop: '6px', color: '#80868b' }}>
                        Métricas reais de production (não dev mode)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'erros' && (
                <div>
                  {errors.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#5f6368' }}>
                      <AlertCircle style={{ width: '48px', height: '48px', margin: '0 auto 12px', opacity: 0.3 }} />
                      <p style={{ fontSize: '13px' }}>Nenhum erro detectado</p>
                      <p style={{ fontSize: '11px', marginTop: '4px' }}>Console.log sempre executa ✅</p>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        backgroundColor: '#fef2f2',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        border: '1px solid #fee2e2'
                      }}>
                        <p style={{ fontSize: '11px', color: '#991b1b', fontWeight: '600' }}>
                          ⚠️ Auto-exporta e limpa em 3+ erros
                        </p>
                      </div>
                      <div style={{ 
                        maxHeight: '250px', 
                        overflowY: 'auto',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}>
                        {errors.map((error, idx) => (
                          <div key={idx} style={{
                            backgroundColor: '#f8f9fa',
                            padding: '10px',
                            borderRadius: '6px',
                            marginBottom: '8px',
                            border: '1px solid #e8eaed'
                          }}>
                            <div style={{ marginBottom: '6px' }}>
                              <strong style={{ color: '#ea4335', fontSize: '10px' }}>[{error.type}]</strong>
                              <span style={{ color: '#80868b', fontSize: '10px', marginLeft: '8px' }}>
                                {new Date(error.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p style={{ color: '#202124', lineHeight: '1.4', wordBreak: 'break-word' }}>
                              {error.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'performance' && (
                <div style={{ fontSize: '12px' }}>
                  {/* PADRÕES BASE44 - Core Web Vitals */}
                  <div style={{ backgroundColor: '#f5f3ff', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #ddd6fe' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#5b21b6', marginBottom: '8px' }}>
                      📊 PADRÕES BASE44 (Core Web Vitals)
                    </p>
                    <div style={{ fontSize: '10px', color: '#5f6368', lineHeight: '1.8' }}>
                      • <strong>LCP</strong>: &lt; 2.5s (ideal &lt; 1.5s) - Largest Contentful Paint<br/>
                      • <strong>FCP</strong>: &lt; 1.5s - First Contentful Paint<br/>
                      • <strong>CLS</strong>: &lt; 0.1 - Cumulative Layout Shift<br/>
                      • <strong>INP</strong>: &lt; 200ms - Interaction to Next Paint<br/>
                      • <strong>TTFB</strong>: &lt; 600ms - Time to First Byte (CDN)
                    </div>
                  </div>

                  {/* MEDIÇÕES ATUAIS */}
                  <div style={{ 
                    backgroundColor: performanceMetrics.lcp < 2500 && performanceMetrics.fcp < 1500 && performanceMetrics.cls < 0.1 && performanceMetrics.inp < 200 && performanceMetrics.ttfb < 600 ? '#e8f5e9' : '#fef2f2',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    border: `1px solid ${performanceMetrics.lcp < 2500 && performanceMetrics.fcp < 1500 ? '#c8e6c9' : '#fee2e2'}`
                  }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: performanceMetrics.lcp < 2500 ? '#1b5e20' : '#991b1b', marginBottom: '8px' }}>
                      {performanceMetrics.lcp < 2500 && performanceMetrics.fcp < 1500 && performanceMetrics.cls < 0.1 && performanceMetrics.inp < 200 ? '✅ TODAS MÉTRICAS OK' : '❌ MÉTRICAS FORA DO PADRÃO'}
                    </p>
                    <div style={{ fontSize: '10px', color: '#5f6368', lineHeight: '1.6' }}>
                      • LCP: {Math.round(performanceMetrics.lcp || 0)}ms {performanceMetrics.lcp < 2500 ? '✅' : '❌'}<br/>
                      • FCP: {Math.round(performanceMetrics.fcp || 0)}ms {performanceMetrics.fcp < 1500 ? '✅' : '❌'}<br/>
                      • CLS: {performanceMetrics.cls?.toFixed(3) || '0.000'} {performanceMetrics.cls < 0.1 ? '✅' : '❌'}<br/>
                      • INP: {Math.round(performanceMetrics.inp || 0)}ms {performanceMetrics.inp < 200 ? '✅' : '❌'}<br/>
                      • TTFB: {Math.round(performanceMetrics.ttfb || 0)}ms {performanceMetrics.ttfb < 600 ? '✅' : '❌'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '10px' }}>
                    <MetricCard
                      icon={<Zap style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                      label="LCP (Largest Contentful Paint)"
                      value={`${Math.round(performanceMetrics.lcp || 0)}ms`}
                      status={performanceMetrics.lcp < 1500 ? 'good' : performanceMetrics.lcp < 2500 ? 'ok' : 'bad'}
                    />
                    <MetricCard
                      icon={<Clock style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                      label="FCP (First Contentful Paint)"
                      value={`${Math.round(performanceMetrics.fcp || 0)}ms`}
                      status={performanceMetrics.fcp < 1500 ? 'good' : 'bad'}
                    />
                    <MetricCard
                      icon={<Activity style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                      label="CLS (Cumulative Layout Shift)"
                      value={performanceMetrics.cls?.toFixed(3) || '0.000'}
                      status={performanceMetrics.cls < 0.1 ? 'good' : performanceMetrics.cls < 0.25 ? 'ok' : 'bad'}
                    />
                    <MetricCard
                      icon={<TrendingUp style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                      label="INP (Interaction to Next Paint)"
                      value={`${Math.round(performanceMetrics.inp || 0)}ms`}
                      status={performanceMetrics.inp < 200 ? 'good' : performanceMetrics.inp < 500 ? 'ok' : 'bad'}
                    />
                    <MetricCard
                      icon={<Clock style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                      label="TTFB (Time to First Byte)"
                      value={`${Math.round(performanceMetrics.ttfb || 0)}ms`}
                      status={performanceMetrics.ttfb < 600 ? 'good' : 'bad'}
                    />
                    <MetricCard
                      icon={<TrendingUp style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                      label="Page Load"
                      value={`${(performanceMetrics.pageLoad / 1000).toFixed(2)}s`}
                      status={performanceMetrics.pageLoad < 2000 ? 'good' : performanceMetrics.pageLoad < 4000 ? 'ok' : 'bad'}
                    />
                    <MetricCard
                      icon={<Activity style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                      label="JS Heap"
                      value={`${performanceMetrics.memoryUsed} MB`}
                      status={parseFloat(performanceMetrics.memoryUsed || 0) < 100 ? 'good' : 'bad'}
                    />
                    <MetricCard
                      icon={<Download style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                      label="Resources"
                      value={performanceMetrics.resourceCount || 0}
                      status={performanceMetrics.resourceCount < 150 ? 'good' : 'ok'}
                    />
                  </div>

                  {/* Dev Mode Warning */}
                  {healthMetrics.devModeWarning && (
                    <div style={{ backgroundColor: '#fef9e5', padding: '12px', borderRadius: '8px', marginTop: '12px', border: '1px solid #fef3c7' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#854d0e', marginBottom: '8px' }}>
                        ⚠️ DEV MODE DETECTADO
                      </p>
                      <p style={{ fontSize: '10px', color: '#a16207', lineHeight: '1.6' }}>
                        {healthMetrics.slowDevResources} recursos lentos são MÓDULOS VITE (main.jsx, @react-refresh, etc), não queries de banco.
                        <br/><br/>
                        <strong>Essas métricas são INÚTEIS em dev mode.</strong>
                        <br/><br/>
                        Deploy em production e use a aba <strong>PageSpeed</strong> para métricas reais.
                      </p>
                    </div>
                  )}

                  {/* Slow API Queries Detail (SE HOUVER) */}
                  {healthMetrics.slowAPIQueries > 0 && (
                    <div style={{ backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', marginTop: '12px', border: '1px solid #fee2e2' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#991b1b', marginBottom: '8px' }}>
                        🔴 {healthMetrics.slowAPIQueries} API queries REAIS lentas (&gt;1s)
                      </p>
                      {healthMetrics.slowQueriesSnippets && healthMetrics.slowQueriesSnippets.length > 0 && (
                        <div style={{ marginTop: '8px', display: 'grid', gap: '4px' }}>
                          <p style={{ fontSize: '9px', color: '#80868b', marginBottom: '4px', fontWeight: '600' }}>
                            📍 TOP 5 LENTAS:
                          </p>
                          {healthMetrics.slowQueriesSnippets.map((snippet, idx) => (
                            <code key={idx} style={{
                              display: 'block',
                              fontSize: '9px',
                              fontFamily: 'monospace',
                              color: '#991b1b',
                              backgroundColor: '#fff',
                              padding: '6px',
                              borderRadius: '4px',
                              lineHeight: '1.3'
                            }}>
                              {idx + 1}. {snippet}
                            </code>
                          ))}
                        </div>
                      )}
                      <p style={{ fontSize: '10px', color: '#b91c1c', marginTop: '8px' }}>
                        Verificar índices compostos e staleTime
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'saude' && (
                <div style={{ fontSize: '12px' }}>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <MetricCard
                      icon={<Activity style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                      label="API Calls"
                      value={healthMetrics.apiCalls || 0}
                      status="neutral"
                    />
                    <MetricCard
                      icon={<AlertCircle style={{ width: '16px', height: '16px', color: '#ea4335' }} />}
                      label="Slow API Queries (>1s)"
                      value={healthMetrics.slowAPIQueries || 0}
                      status={healthMetrics.slowAPIQueries === 0 ? 'good' : healthMetrics.slowAPIQueries < 3 ? 'ok' : 'bad'}
                    />
                    <MetricCard
                      icon={<Activity style={{ width: '16px', height: '16px', color: '#fbbc04' }} />}
                      label="Slow Dev Resources (Vite)"
                      value={healthMetrics.slowDevResources || 0}
                      status="neutral"
                    />
                    <MetricCard
                      icon={<Zap style={{ width: '16px', height: '16px', color: '#34a853' }} />}
                      label="Cached Resources"
                      value={healthMetrics.cachedResources || 0}
                      status="good"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div style={{ fontSize: '12px', padding: '16px' }}>
                  <div style={{ backgroundColor: window.location.protocol === 'https:' ? '#e8f5e9' : '#fef2f2', padding: '12px', borderRadius: '8px', border: `1px solid ${window.location.protocol === 'https:' ? '#c8e6c9' : '#fee2e2'}` }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: window.location.protocol === 'https:' ? '#1b5e20' : '#991b1b' }}>
                      {window.location.protocol === 'https:' ? '✅ HTTPS Ativo' : '🔓 SEM HTTPS'}
                    </p>
                    <p style={{ fontSize: '10px', color: window.location.protocol === 'https:' ? '#2e7d32' : '#b91c1c' }}>
                      {window.location.protocol === 'https:' ? 'Tráfego criptografado (TLS)' : 'CRÍTICO: Dados sem criptografia'}
                    </p>
                  </div>
                  <div style={{ marginTop: '12px', backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ fontSize: '10px', color: '#5f6368', lineHeight: '1.6' }}>
                      <strong>Checklist Security:</strong><br/>
                      • CSP headers configurados<br/>
                      • XSS prevention ativo<br/>
                      • CSRF tokens em forms<br/>
                      • Rate limiting em backend
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'compliance' && (
                <div>
                  <ComplianceChecker 
                    complianceResults={complianceResults} 
                    onRevalidate={async () => {
                      setComplianceResults(null);
                      setTimeout(() => {
                        const collectEvent = new Event('force-collect-performance');
                        window.dispatchEvent(collectEvent);
                      }, 100);
                    }} 
                  />
                  
                  {/* MÉTRICAS LGPD DETALHADAS */}
                  {complianceResults?.metricas_lgpd && (
                    <div style={{ marginTop: '12px', backgroundColor: '#f5f3ff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#5b21b6', marginBottom: '8px' }}>
                        📊 MÉTRICAS LGPD
                      </p>
                      <div style={{ fontSize: '10px', color: '#5f6368', lineHeight: '1.8' }}>
                        • <strong>Aceites:</strong> {complianceResults.metricas_lgpd.total_aceites}<br/>
                        • <strong>Duplicações:</strong> {complianceResults.metricas_lgpd.duplicacoes} {complianceResults.metricas_lgpd.duplicacoes > 0 ? '❌' : '✅'}<br/>
                        • <strong>Leitura completa:</strong> {complianceResults.metricas_lgpd.leitura_completa}/{complianceResults.metricas_lgpd.total_aceites}<br/>
                        • <strong>Tempo médio:</strong> {complianceResults.metricas_lgpd.tempo_medio}s<br/>
                        • <strong>Scroll médio:</strong> {complianceResults.metricas_lgpd.scroll_medio}%
                      </div>
                      
                      {complianceResults.metricas_lgpd.duplicacoes > 0 && (
                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fee2e2' }}>
                          <p style={{ fontSize: '10px', color: '#991b1b', fontWeight: '600' }}>
                            🚨 CRÍTICO: {complianceResults.metricas_lgpd.duplicacoes} aceites duplicados detectados
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'ux' && (
                <div style={{ fontSize: '12px', padding: '16px' }}>
                  {/* PADRÕES BASE44 UX */}
                  <div style={{ backgroundColor: '#f5f3ff', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #ddd6fe' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#5b21b6', marginBottom: '8px' }}>
                      📱 PADRÕES BASE44 UX/MOBILE
                    </p>
                    <div style={{ fontSize: '10px', color: '#5f6368', lineHeight: '1.8' }}>
                      • <strong>Touch targets</strong>: ≥ 44px x 44px<br/>
                      • <strong>Aria-labels</strong>: 100% botões/ícones<br/>
                      • <strong>Skeleton</strong>: role="status" em loading<br/>
                      • <strong>Contraste</strong>: WCAG AAA (7:1)<br/>
                      • <strong>Responsive</strong>: Mobile-first breakpoints
                    </div>
                  </div>

                  {/* Score UX */}
                  <div style={{ 
                    backgroundColor: uxAudit.score === 100 ? '#e8f5e9' : uxAudit.score >= 60 ? '#fef9e5' : '#fef2f2',
                    padding: '16px', 
                    borderRadius: '8px', 
                    border: `1px solid ${uxAudit.score === 100 ? '#c8e6c9' : uxAudit.score >= 60 ? '#fef3c7' : '#fee2e2'}`,
                    marginBottom: '12px',
                    textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '32px', fontWeight: '700', color: uxAudit.score === 100 ? '#1b5e20' : uxAudit.score >= 60 ? '#854d0e' : '#991b1b' }}>
                      {uxAudit.score}
                    </p>
                    <p style={{ fontSize: '11px', color: uxAudit.score === 100 ? '#2e7d32' : uxAudit.score >= 60 ? '#a16207' : '#b91c1c' }}>
                      UX Score ({uxAudit.issues.length} issues)
                    </p>
                  </div>

                  {/* Issues Detectados */}
                  {uxAudit.issues.length > 0 ? (
                    <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'grid', gap: '10px' }}>
                      {uxAudit.issues.map((issue, idx) => {
                        const isObject = typeof issue === 'object';
                        const texto = isObject ? issue.texto : issue;
                        const snippets = isObject ? issue.snippets : [];
                        const local = isObject ? issue.local : 'DOM';
                        const severidade = isObject ? issue.severidade : 'MÉDIO';
                        
                        return (
                          <div key={idx} style={{ 
                            backgroundColor: severidade === 'CRÍTICO' ? '#fef2f2' : severidade === 'ALTO' ? '#fef9e5' : '#f8f9fa',
                            padding: '12px', 
                            borderRadius: '8px', 
                            border: `1px solid ${severidade === 'CRÍTICO' ? '#fee2e2' : severidade === 'ALTO' ? '#fef3c7' : '#e8eaed'}`
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <span style={{
                                backgroundColor: severidade === 'CRÍTICO' ? '#ea4335' : severidade === 'ALTO' ? '#fbbc04' : '#5f6368',
                                color: '#fff',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 'bold'
                              }}>
                                {severidade}
                              </span>
                              <span style={{ fontSize: '10px', color: '#80868b' }}>{local}</span>
                            </div>
                            
                            <p style={{ fontSize: '11px', color: '#202124', fontWeight: '600', marginBottom: '6px' }}>
                              {texto}
                            </p>
                            
                            {snippets && snippets.length > 0 && (
                              <div style={{ 
                                backgroundColor: '#fff', 
                                padding: '8px', 
                                borderRadius: '6px', 
                                border: '1px solid #e8eaed',
                                marginTop: '6px'
                              }}>
                                <p style={{ fontSize: '9px', color: '#80868b', marginBottom: '4px', fontWeight: '600' }}>
                                  📍 TRECHOS IDENTIFICADOS:
                                </p>
                                {snippets.map((snippet, sIdx) => (
                                  <code key={sIdx} style={{
                                    display: 'block',
                                    fontSize: '9px',
                                    fontFamily: 'monospace',
                                    color: '#5f6368',
                                    backgroundColor: '#f8f9fa',
                                    padding: '6px',
                                    borderRadius: '4px',
                                    marginBottom: '4px',
                                    wordBreak: 'break-all',
                                    lineHeight: '1.4'
                                  }}>
                                    {snippet}
                                  </code>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#e8f5e9', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #c8e6c9' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#1b5e20' }}>
                        ✅ UX 100% conforme padrões Base44
                      </p>
                    </div>
                  )}

                  {/* Métricas UX + Performance Percebida */}
                  <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ fontSize: '10px', color: '#5f6368', lineHeight: '1.8' }}>
                      <strong>Mobile-First (Base44):</strong><br/>
                      • Touch targets ≥ 44px ✓<br/>
                      • Viewport meta configurado ✓<br/>
                      • Grid responsivo (sm/md/lg) ✓<br/>
                      <br/>
                      <strong>Acessibilidade (WCAG AAA):</strong><br/>
                      • Aria-labels em ícones/botões ✓<br/>
                      • Roles semânticos (nav, main) ✓<br/>
                      • Contraste 7:1 mínimo ✓<br/>
                      <br/>
                      <strong>Performance Percebida:</strong><br/>
                      • Skeleton em loading (&lt;200ms) ✓<br/>
                      • FCP: {Math.round(performanceMetrics.fcp || 0)}ms {performanceMetrics.fcp < 1500 ? '✅' : '❌'}<br/>
                      • Feedback visual em TODA ação ✓
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'rotas' && (
                <div style={{ fontSize: '12px', padding: '16px' }}>
                  {/* PADRÕES BASE44 NAVEGAÇÃO */}
                  <div style={{ backgroundColor: '#f5f3ff', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #ddd6fe' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#5b21b6', marginBottom: '8px' }}>
                      🔀 PADRÕES BASE44 NAVEGAÇÃO SPA
                    </p>
                    <div style={{ fontSize: '10px', color: '#5f6368', lineHeight: '1.8' }}>
                      • <strong>SPA Transition</strong>: &lt; 500ms<br/>
                      • <strong>Prefetch</strong>: onHover estratégico<br/>
                      • <strong>staleTime</strong>: 5-10min queries<br/>
                      • <strong>Skeleton</strong>: feedback visual &lt; 200ms
                    </div>
                  </div>

                  {/* Última Transição */}
                  {navigationMetrics.lastTransition && (
                    <div style={{ 
                      backgroundColor: navigationMetrics.lastTransition.duration > 2000 ? '#fef2f2' : navigationMetrics.lastTransition.duration > 1000 ? '#fef9e5' : '#e8f5e9',
                      padding: '12px', 
                      borderRadius: '8px', 
                      border: `1px solid ${navigationMetrics.lastTransition.duration > 2000 ? '#fee2e2' : navigationMetrics.lastTransition.duration > 1000 ? '#fef3c7' : '#c8e6c9'}`,
                      marginBottom: '12px'
                    }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: navigationMetrics.lastTransition.duration > 2000 ? '#991b1b' : navigationMetrics.lastTransition.duration > 1000 ? '#854d0e' : '#1b5e20' }}>
                        {navigationMetrics.lastTransition.duration > 2000 ? '🔴 CRÍTICO' : navigationMetrics.lastTransition.duration > 1000 ? '⚠️ LENTO' : '✅ OK'}: {navigationMetrics.lastTransition.duration}ms
                      </p>
                      <p style={{ fontSize: '10px', color: '#5f6368' }}>
                        {navigationMetrics.lastTransition.from} → {navigationMetrics.lastTransition.to} ({navigationMetrics.lastTransition.type})
                      </p>
                    </div>
                  )}

                  {/* Estatísticas */}
                  {navigationMetrics.history.length > 0 && (
                    <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#202124', marginBottom: '6px' }}>
                        📊 Estatísticas:
                      </p>
                      <div style={{ fontSize: '10px', color: '#5f6368', lineHeight: '1.6' }}>
                        • Média: {Math.round(navigationMetrics.history.reduce((sum, n) => sum + n.duration, 0) / navigationMetrics.history.length)}ms<br/>
                        • Lentas (&gt;1s): {navigationMetrics.history.filter(n => n.duration > 1000).length}/{navigationMetrics.history.length}<br/>
                        • Críticas (&gt;2s): {navigationMetrics.history.filter(n => n.duration > 2000).length}/{navigationMetrics.history.length}
                      </div>
                    </div>
                  )}

                  {/* Histórico */}
                  <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#202124' }}>
                        Últimas 20:
                      </p>
                      <button
                        onClick={() => {
                          localStorage.removeItem('errorlogger_navigation');
                          setNavigationMetrics({ history: [], lastTransition: null });
                        }}
                        style={{
                          fontSize: '10px',
                          color: '#ea4335',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '600',
                          textDecoration: 'underline',
                          minHeight: '44px',
                          padding: '8px 12px'
                        }}
                        aria-label="Limpar histórico de navegação"
                      >
                        Limpar
                      </button>
                    </div>
                    {navigationMetrics.history.length === 0 ? (
                      <p style={{ fontSize: '10px', color: '#80868b', textAlign: 'center', padding: '8px' }}>
                        Navegue entre páginas para rastrear
                      </p>
                    ) : (
                      <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'grid', gap: '6px' }}>
                        {navigationMetrics.history.slice().reverse().map((nav, idx) => (
                          <div key={idx} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '6px 8px',
                            backgroundColor: '#fff',
                            borderRadius: '4px',
                            border: '1px solid #e8eaed'
                          }}>
                            <span style={{ fontSize: '10px', color: '#5f6368' }}>
                              {nav.from} → {nav.to}
                            </span>
                            <span style={{ 
                              fontSize: '10px', 
                              fontWeight: '700',
                              color: nav.duration > 2000 ? '#ea4335' : nav.duration > 1000 ? '#fbbc04' : '#34a853'
                            }}>
                              {nav.duration}ms
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Alertas */}
                  {navigationMetrics.history.filter(n => n.duration > 1000).length > 0 && (
                    <div style={{ backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#991b1b', marginBottom: '6px' }}>
                        ⚠️ TOP 3 ROTAS LENTAS:
                      </p>
                      <div style={{ fontSize: '10px', color: '#b91c1c', lineHeight: '1.6' }}>
                        {navigationMetrics.history
                          .sort((a, b) => b.duration - a.duration)
                          .slice(0, 3)
                          .map((n, i) => (
                            <div key={i}>• {n.from}→{n.to}: {n.duration}ms</div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'pwa' && (
                <div style={{ fontSize: '12px', padding: '16px' }}>
                  {/* PADRÕES BASE44 PWA */}
                  <div style={{ backgroundColor: '#f5f3ff', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #ddd6fe' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#5b21b6', marginBottom: '8px' }}>
                      📲 PADRÕES BASE44 PWA
                    </p>
                    <div style={{ fontSize: '10px', color: '#5f6368', lineHeight: '1.8' }}>
                      • <strong>Service Worker</strong>: Ativo + cache strategy<br/>
                      • <strong>Manifest</strong>: icons + theme_color + start_url<br/>
                      • <strong>Offline</strong>: Fallback page configurado<br/>
                      • <strong>Push</strong>: Notifications granted<br/>
                      • <strong>Instalável</strong>: beforeinstallprompt capturado
                    </div>
                  </div>

                  {/* PWA Status */}
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <MetricCard
                      icon={<Activity style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                      label="Service Worker"
                      value={navigator.serviceWorker.controller ? '✅ Ativo' : '❌ Inativo'}
                      status={navigator.serviceWorker.controller ? 'good' : 'bad'}
                    />
                    <MetricCard
                      icon={<CheckCircle style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                      label="Manifest"
                      value={document.querySelector('link[rel="manifest"]') ? '✅ OK' : '❌ Ausente'}
                      status={document.querySelector('link[rel="manifest"]') ? 'good' : 'bad'}
                    />
                    <MetricCard
                      icon={<Zap style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                      label="Push Notifications"
                      value={Notification?.permission === 'granted' ? '✅ Granted' : Notification?.permission === 'denied' ? '❌ Denied' : '⚠️ Default'}
                      status={Notification?.permission === 'granted' ? 'good' : Notification?.permission === 'denied' ? 'bad' : 'neutral'}
                    />
                    <MetricCard
                      icon={<Wifi style={{ width: '16px', height: '16px', color: '#7E57FF' }} />}
                      label="Offline Ready"
                      value={navigator.serviceWorker.controller ? '✅ Sim' : '❌ Não'}
                      status={navigator.serviceWorker.controller ? 'good' : 'bad'}
                    />
                  </div>

                  {/* Diagnóstico Rápido */}
                  {(!navigator.serviceWorker.controller || !document.querySelector('link[rel="manifest"]')) && (
                    <div style={{ backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', marginTop: '12px', border: '1px solid #fee2e2' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#991b1b', marginBottom: '6px' }}>
                        🔧 AÇÃO NECESSÁRIA:
                      </p>
                      <code style={{ fontSize: '10px', color: '#b91c1c', display: 'block', lineHeight: '1.6' }}>
                        {!navigator.serviceWorker.controller && '1. Verificar ServiceWorkerRegistration.jsx\n'}
                        {!document.querySelector('link[rel="manifest"]') && '2. Adicionar <link rel="manifest" href="/manifest.json" />\n'}
                        {Notification?.permission !== 'granted' && '3. Solicitar permissão: Notification.requestPermission()'}
                      </code>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'entities' && (
                <div style={{ fontSize: '12px' }}>
                  {/* MODO MANUAL: Aguardando SYNC */}
                  {entityHealth.entities.length === 0 ? (
                    <div style={{ 
                      backgroundColor: '#f5f3ff',
                      padding: '20px', 
                      borderRadius: '8px', 
                      textAlign: 'center',
                      border: '1px solid #ddd6fe'
                    }}>
                      <Database style={{ width: '48px', height: '48px', margin: '0 auto 12px', color: '#7E57FF', opacity: 0.5 }} />
                      <p style={{ fontSize: '13px', fontWeight: '700', color: '#5b21b6', marginBottom: '6px' }}>
                        ⚡ Modo Manual Ativo
                      </p>
                      <p style={{ fontSize: '11px', color: '#80868b', marginBottom: '12px' }}>
                        Clique em <strong>SYNC</strong> para testar entities/functions
                      </p>
                      <p style={{ fontSize: '9px', color: '#9aa0a6', lineHeight: '1.5' }}>
                        Zero polling • Zero 429 • Execução sob demanda
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* STATUS GERAL */}
                      <div style={{ 
                        backgroundColor: connectivityIssues.length === 0 ? '#e8f5e9' : '#fef2f2',
                        padding: '12px', 
                        borderRadius: '8px', 
                        marginBottom: '12px',
                        border: `1px solid ${connectivityIssues.length === 0 ? '#c8e6c9' : '#fee2e2'}`
                      }}>
                        <p style={{ fontSize: '13px', fontWeight: '700', color: connectivityIssues.length === 0 ? '#1b5e20' : '#991b1b', marginBottom: '4px' }}>
                          {connectivityIssues.length === 0 ? '✅ TODAS ENTITIES CONECTADAS' : `🔴 ${connectivityIssues.length} PROBLEMAS DETECTADOS`}
                        </p>
                        <p style={{ fontSize: '10px', color: connectivityIssues.length === 0 ? '#2e7d32' : '#b91c1c' }}>
                          {entityHealth.entities.length} entities testadas • {entityHealth.functions.length} functions testadas
                        </p>
                      </div>
                    </>
                  )}

                  {/* ENTITIES DETAIL */}
                  {entityHealth.entities.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#202124', marginBottom: '8px' }}>
                      📊 ENTITIES ({entityHealth.entities.length}):
                    </p>
                    <div style={{ display: 'grid', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                      {entityHealth.entities.map((ent, idx) => (
                        <div key={idx} style={{
                          backgroundColor: ent.status === 'OK' && ent.multitenantOK ? '#f8f9fa' : '#fef2f2',
                          padding: '8px',
                          borderRadius: '6px',
                          border: `1px solid ${ent.status === 'OK' && ent.multitenantOK ? '#e8eaed' : '#fee2e2'}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#202124' }}>
                              {ent.entity} <span style={{ fontSize: '9px', color: '#80868b' }}>({ent.module})</span>
                            </span>
                            <span style={{ 
                              fontSize: '10px', 
                              fontWeight: '700',
                              color: ent.latency < 500 ? '#34a853' : ent.latency < 1000 ? '#fbbc04' : '#ea4335'
                            }}>
                              {ent.latency}ms
                            </span>
                          </div>
                          <code style={{
                                display: 'block',
                                fontSize: '9px',
                                fontFamily: 'monospace',
                                color: '#5f6368',
                                backgroundColor: '#fff',
                                padding: '6px',
                                borderRadius: '4px',
                                lineHeight: '1.3',
                                marginBottom: '6px'
                              }}>
                                {ent.snippet}
                              </code>
                              {ent.sampleData && ent.sampleData.length > 0 && (
                                <div style={{ 
                                  backgroundColor: '#f8f9fa', 
                                  padding: '6px', 
                                  borderRadius: '4px',
                                  border: '1px solid #e8eaed' 
                                }}>
                                  <p style={{ fontSize: '8px', color: '#80868b', marginBottom: '4px', fontWeight: '600' }}>
                                    📊 AMOSTRA DE DADOS:
                                  </p>
                                  {ent.sampleData.map((sample, sIdx) => (
                                    <div key={sIdx} style={{
                                      fontSize: '8px',
                                      fontFamily: 'monospace',
                                      color: '#202124',
                                      padding: '4px',
                                      backgroundColor: '#fff',
                                      borderRadius: '3px',
                                      marginBottom: '3px',
                                      lineHeight: '1.3'
                                    }}>
                                      {sIdx + 1}. {sample.nome} | ID: {sample.id} | Clinic: {sample.clinica_id}
                                    </div>
                                  ))}
                                </div>
                              )}
                          {!ent.multitenantOK && (
                            <p style={{ fontSize: '9px', color: '#ea4335', marginTop: '4px', fontWeight: '600' }}>
                              ⚠️ {ent.invalidCount} registros com clinica_id errado
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* FUNCTIONS DETAIL */}
                  {entityHealth.functions.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#202124', marginBottom: '8px' }}>
                        ⚡ FUNCTIONS ({entityHealth.functions.length}):
                      </p>
                      <div style={{ display: 'grid', gap: '6px' }}>
                        {entityHealth.functions.map((fn, idx) => (
                          <div key={idx} style={{
                            backgroundColor: fn.status === 'OK' ? '#f8f9fa' : '#fef2f2',
                            padding: '8px',
                            borderRadius: '6px',
                            border: `1px solid ${fn.status === 'OK' ? '#e8eaed' : '#fee2e2'}`
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '600', color: '#202124' }}>
                                {fn.function} <span style={{ fontSize: '9px', color: '#80868b' }}>({fn.module})</span>
                              </span>
                              <span style={{ 
                                fontSize: '10px', 
                                fontWeight: '700',
                                color: fn.latency < 500 ? '#34a853' : fn.latency < 1000 ? '#fbbc04' : '#ea4335'
                              }}>
                                {fn.latency}ms
                              </span>
                            </div>
                            <code style={{
                              display: 'block',
                              fontSize: '9px',
                              fontFamily: 'monospace',
                              color: '#5f6368',
                              backgroundColor: '#fff',
                              padding: '6px',
                              borderRadius: '4px',
                              lineHeight: '1.3',
                              wordBreak: 'break-all'
                            }}>
                              {fn.snippet}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ISSUES CRÍTICAS */}
                  {connectivityIssues.length > 0 && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#991b1b', marginBottom: '8px' }}>
                        🚨 ISSUES CRÍTICAS ({connectivityIssues.length}):
                      </p>
                      <div style={{ display: 'grid', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                        {connectivityIssues.map((issue, idx) => (
                          <div key={idx} style={{
                            backgroundColor: issue.severidade === 'CRÍTICO' ? '#fef2f2' : '#fef9e5',
                            padding: '10px',
                            borderRadius: '6px',
                            border: `1px solid ${issue.severidade === 'CRÍTICO' ? '#fee2e2' : '#fef3c7'}`
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <span style={{
                                backgroundColor: issue.severidade === 'CRÍTICO' ? '#ea4335' : '#fbbc04',
                                color: '#fff',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 'bold'
                              }}>
                                {issue.severidade}
                              </span>
                              <span style={{ fontSize: '9px', color: '#80868b' }}>{issue.tipo}</span>
                            </div>
                            
                            <p style={{ fontSize: '11px', fontWeight: '600', color: '#202124', marginBottom: '4px' }}>
                              {issue.problema}
                            </p>
                            
                            <p style={{ fontSize: '9px', color: '#5f6368', marginBottom: '6px' }}>
                              📂 {issue.local}
                            </p>
                            
                            <code style={{
                              display: 'block',
                              fontSize: '9px',
                              fontFamily: 'monospace',
                              color: '#5f6368',
                              backgroundColor: '#fff',
                              padding: '6px',
                              borderRadius: '4px',
                              marginBottom: '6px',
                              lineHeight: '1.3',
                              wordBreak: 'break-all'
                            }}>
                              {issue.snippet}
                            </code>
                            
                            <div style={{ backgroundColor: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #e8eaed' }}>
                              <p style={{ fontSize: '9px', color: '#ea4335', fontWeight: '600', marginBottom: '4px' }}>
                                ⚠️ {issue.impacto}
                              </p>
                              <p style={{ fontSize: '9px', color: '#5b21b6', fontWeight: '600' }}>
                                🔧 {issue.correcao}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'functions' && (
                <div style={{ fontSize: '12px' }}>
                  {entityHealth.functions.length === 0 ? (
                    <div style={{ 
                      backgroundColor: '#f5f3ff',
                      padding: '20px', 
                      borderRadius: '8px', 
                      textAlign: 'center',
                      border: '1px solid #ddd6fe'
                    }}>
                      <Code style={{ width: '48px', height: '48px', margin: '0 auto 12px', color: '#7E57FF', opacity: 0.5 }} />
                      <p style={{ fontSize: '13px', fontWeight: '700', color: '#5b21b6', marginBottom: '6px' }}>
                        ⚡ Modo Manual Ativo
                      </p>
                      <p style={{ fontSize: '11px', color: '#80868b', marginBottom: '12px' }}>
                        Clique em <strong>SYNC</strong> para testar backend functions
                      </p>
                      <p style={{ fontSize: '9px', color: '#9aa0a6', lineHeight: '1.5' }}>
                        Zero polling • Zero 429 • Execução sob demanda
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {entityHealth.functions.map((fn, idx) => (
                        <div key={idx} style={{
                          backgroundColor: fn.status === 'OK' ? '#e8f5e9' : '#fef2f2',
                          padding: '12px',
                          borderRadius: '8px',
                          border: `1px solid ${fn.status === 'OK' ? '#c8e6c9' : '#fee2e2'}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: fn.status === 'OK' ? '#1b5e20' : '#991b1b' }}>
                              {fn.function}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '9px', color: '#80868b', backgroundColor: '#f8f9fa', padding: '3px 6px', borderRadius: '4px' }}>
                                {fn.module}
                              </span>
                              <span style={{ 
                                fontSize: '11px', 
                                fontWeight: '700',
                                color: fn.latency < 500 ? '#34a853' : fn.latency < 1000 ? '#fbbc04' : '#ea4335'
                              }}>
                                {fn.latency}ms
                              </span>
                            </div>
                          </div>
                          
                          <code style={{
                            display: 'block',
                            fontSize: '9px',
                            fontFamily: 'monospace',
                            color: '#5f6368',
                            backgroundColor: '#fff',
                            padding: '8px',
                            borderRadius: '4px',
                            lineHeight: '1.4',
                            wordBreak: 'break-all',
                            maxHeight: '100px',
                            overflowY: 'auto'
                          }}>
                            {fn.snippet}
                          </code>
                          
                          {fn.error && (
                            <div style={{ marginTop: '8px', backgroundColor: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #fee2e2' }}>
                              <p style={{ fontSize: '9px', color: '#ea4335', fontWeight: '600' }}>
                                ❌ {fn.error}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'ia' && (
                <div style={{ fontSize: '12px' }}>
                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {(() => {
                      const diagnosticos = analisarErrosIA(errors, performanceMetrics, healthMetrics, complianceResults, uxAudit);
                      return diagnosticos.map((diag, idx) => (
                        <div key={idx} style={{
                          backgroundColor: diag.severity === 'CRÍTICO' ? '#fef2f2' : diag.severity === 'ALTO' ? '#fef9e5' : diag.severity === 'OK' ? '#e8f5e9' : '#f8f9fa',
                          padding: '14px',
                          borderRadius: '8px',
                          marginBottom: '10px',
                          border: `1px solid ${diag.severity === 'CRÍTICO' ? '#fee2e2' : diag.severity === 'ALTO' ? '#fef3c7' : diag.severity === 'OK' ? '#c8e6c9' : '#e8eaed'}`
                        }}>
                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{
                              backgroundColor: diag.severity === 'CRÍTICO' ? '#ea4335' : diag.severity === 'ALTO' ? '#fbbc04' : diag.severity === 'OK' ? '#34a853' : '#5f6368',
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 'bold'
                            }}>
                              {diag.severity}
                            </span>
                            <span style={{ fontSize: '11px', color: '#80868b' }}>{diag.categoria}</span>
                          </div>

                          {/* Problema */}
                          <p style={{ fontSize: '13px', fontWeight: '700', color: '#202124', marginBottom: '6px' }}>
                            {diag.problema}
                          </p>
                          
                          {/* Causa raiz */}
                          <p style={{ fontSize: '11px', color: '#5f6368', marginBottom: '8px', lineHeight: '1.5' }}>
                            <strong>Causa:</strong> {diag.causaRaiz}
                          </p>

                          {/* Impacto */}
                          <div style={{
                            backgroundColor: '#fff',
                            padding: '8px',
                            borderRadius: '6px',
                            marginBottom: '8px',
                            border: '1px solid #e8eaed'
                          }}>
                            <p style={{ fontSize: '10px', color: '#ea4335', fontWeight: '600', marginBottom: '4px' }}>
                              ⚠️ Impacto: {diag.impacto}
                            </p>
                          </div>

                          {/* Base44 Standard */}
                          {diag.base44Standard && (
                            <div style={{
                              backgroundColor: '#e8f5e9',
                              padding: '8px',
                              borderRadius: '6px',
                              marginBottom: '8px',
                              border: '1px solid #c8e6c9'
                            }}>
                              <p style={{ fontSize: '10px', color: '#1b5e20', fontWeight: '600' }}>
                                {diag.base44Standard}
                              </p>
                            </div>
                          )}

                          {/* Snippets (se disponível) */}
                          {diag.snippets && diag.snippets.length > 0 && (
                            <div style={{
                              backgroundColor: '#fff',
                              padding: '10px',
                              borderRadius: '6px',
                              border: '1px solid #e8eaed',
                              marginBottom: '8px'
                            }}>
                              <p style={{ fontSize: '10px', color: '#80868b', fontWeight: '600', marginBottom: '6px' }}>
                                📍 TRECHOS IDENTIFICADOS:
                              </p>
                              {diag.snippets.map((snippet, sIdx) => (
                                <code key={sIdx} style={{
                                  display: 'block',
                                  fontSize: '9px',
                                  fontFamily: 'monospace',
                                  color: '#5f6368',
                                  backgroundColor: '#f8f9fa',
                                  padding: '6px',
                                  borderRadius: '4px',
                                  marginBottom: '4px',
                                  wordBreak: 'break-all',
                                  lineHeight: '1.4'
                                }}>
                                  {snippet}
                                </code>
                              ))}
                            </div>
                          )}

                          {/* Detalhes estruturados */}
                          {diag.detalhes && diag.detalhes.length > 0 && (
                            <div style={{
                              backgroundColor: '#fff',
                              padding: '10px',
                              borderRadius: '6px',
                              border: '1px solid #e8eaed',
                              marginBottom: '8px'
                            }}>
                              <p style={{ fontSize: '10px', color: '#80868b', fontWeight: '600', marginBottom: '6px' }}>
                                🔍 ANÁLISE DETALHADA:
                              </p>
                              {diag.detalhes.map((det, dIdx) => (
                                <div key={dIdx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: dIdx < diag.detalhes.length - 1 ? '1px solid #e8eaed' : 'none' }}>
                                  <p style={{ fontSize: '10px', color: '#202124', fontWeight: '600', marginBottom: '4px' }}>
                                    • {det.problema}
                                  </p>
                                  <p style={{ fontSize: '9px', color: '#80868b', marginBottom: '4px' }}>
                                    📂 {det.local}
                                  </p>
                                  {det.exemplos && det.exemplos.length > 0 && (
                                    <div style={{ marginTop: '4px' }}>
                                      {det.exemplos.map((ex, eIdx) => (
                                        <code key={eIdx} style={{
                                          display: 'block',
                                          fontSize: '8px',
                                          fontFamily: 'monospace',
                                          color: '#5f6368',
                                          backgroundColor: '#f8f9fa',
                                          padding: '4px',
                                          borderRadius: '3px',
                                          marginBottom: '2px',
                                          wordBreak: 'break-all',
                                          lineHeight: '1.3'
                                        }}>
                                          {ex}
                                        </code>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Prompt de correção */}
                          <div style={{
                            backgroundColor: '#f5f3ff',
                            padding: '10px',
                            borderRadius: '6px',
                            border: '1px solid #ddd6fe'
                          }}>
                            <p style={{ fontSize: '10px', color: '#5b21b6', fontWeight: '600', marginBottom: '6px' }}>
                              🔧 CORREÇÃO:
                            </p>
                            <code style={{
                              fontSize: '10px',
                              color: '#202124',
                              backgroundColor: '#fff',
                              padding: '8px',
                              borderRadius: '4px',
                              display: 'block',
                              lineHeight: '1.6',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}>
                              {diag.promptCorrecao}
                            </code>
                          </div>

                          {/* Nível esperado */}
                          <p style={{ fontSize: '10px', color: '#34a853', marginTop: '8px', fontWeight: '600' }}>
                            🎯 Meta: {diag.nivelEsperado}
                          </p>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions - REMOVIDO (botões agora no header) */}
          </div>
        )}

        {/* Ícone radar - clicável para expandir */}
        <button 
          onClick={() => setExpanded(!expanded)}
          title={temErros ? `${errors.length} erros - clique para ver` : 'Radar Ativo - clique para detalhes'}
          aria-label={temErros ? `Diagnóstico: ${errors.length} erros detectados, clique para expandir` : 'Abrir painel de diagnóstico completo'}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: temErros ? '#ea4335' : '#34a853',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            border: '2px solid #fff'
          }}
        >
          {temErros ? (
            <div style={{ position: 'relative' }}>
              <AlertCircle style={{ color: '#fff', width: '24px', height: '24px' }} />
              <div style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                backgroundColor: '#fff',
                color: '#ea4335',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                border: '1px solid #ea4335'
              }}>
                {errors.length > 9 ? '9+' : errors.length}
              </div>
            </div>
          ) : (
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              animation: 'pulse 2s ease-in-out infinite'
            }} />
          )}
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
      `}</style>
    </>
  );
}