import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Runtime Tracer - Detecta N+1 queries e patterns suspeitos
 * MINIMALISTA: só coleta dados, não bloqueia render
 */
export function useQueryTracer(pageName) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!import.meta.env.PROD) {
      const startTime = Date.now();
      const queriesExecuted = [];

      // Listener leve - não impacta performance
      const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
        if (event?.query?.queryKey) {
          queriesExecuted.push({
            key: event.query.queryKey,
            timestamp: Date.now() - startTime,
            status: event.query.state.status
          });
        }
      });

      // Análise após 5s (não bloqueia mount)
      const timer = setTimeout(() => {
        const analysis = analyzeQueries(queriesExecuted, pageName);
        if (analysis.issues.length > 0) {
          console.warn(`[QueryTracer] ${pageName}:`, analysis);
        }
      }, 5000);

      return () => {
        unsubscribe();
        clearTimeout(timer);
      };
    }
  }, [queryClient, pageName]);
}

function analyzeQueries(queries, pageName) {
  const issues = [];
  const queryKeys = queries.map(q => JSON.stringify(q.key));
  
  // Detecta N+1: queries similares em loop
  const grouped = {};
  queryKeys.forEach(key => {
    const base = key.split(',')[0]; // Pega base da key
    grouped[base] = (grouped[base] || 0) + 1;
  });

  Object.entries(grouped).forEach(([base, count]) => {
    if (count > 3) {
      issues.push({
        type: 'n_plus_1',
        query: base,
        count,
        recommendation: 'Batch queries com fetchMany ou prefetch'
      });
    }
  });

  // Detecta waterfall: queries sequenciais quando podiam ser paralelas
  if (queries.length > 5) {
    const sequential = queries.filter((q, i) => {
      if (i === 0) return false;
      return (q.timestamp - queries[i-1].timestamp) < 100; // <100ms = sequencial
    });
    
    if (sequential.length > 3) {
      issues.push({
        type: 'waterfall',
        count: sequential.length,
        recommendation: 'Use Promise.all ou prefetchQueries'
      });
    }
  }

  return {
    page: pageName,
    total_queries: queries.length,
    issues,
    queries: queries.slice(0, 10) // Só primeiras 10
  };
}