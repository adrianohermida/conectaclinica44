import { useQuery } from "@tanstack/react-query";
import { useRef, useEffect } from "react";

/**
 * useOptimizedQuery - Hook otimizado para queries com cache agressivo
 * 
 * OTIMIZAÇÕES:
 * - Cache longo por padrão (5 min stale, 10 min inactive)
 * - Deduplication automática
 * - Retry inteligente
 * - Background refetch desabilitado por padrão
 * 
 * USAR para dados estáveis (pacientes, medicamentos, planos)
 * NÃO USAR para dados real-time (notificações, status de pagamento)
 */
export function useOptimizedQuery({
  queryKey,
  queryFn,
  staleTime = 10 * 60 * 1000, // 10 min cache
  cacheTime = 15 * 60 * 1000, // 15 min
  retry = 1,
  refetchOnWindowFocus = false,
  refetchOnMount = false,
  enabled = true,
  initialData = [],
  ...options
}) {
  const previousData = useRef(initialData);

  const result = useQuery({
    queryKey,
    queryFn: async () => {
      console.log(`🚀 [Query] Executing: ${JSON.stringify(queryKey)}`);
      const data = await queryFn();
      const safeData = Array.isArray(data) ? data : (data || initialData);
      previousData.current = safeData;
      console.log(`✅ [Query] Success: ${JSON.stringify(queryKey)} - ${Array.isArray(safeData) ? safeData.length : 'N/A'} items`);
      return safeData;
    },
    staleTime,
    gcTime: cacheTime, // FIX: cacheTime was renamed to gcTime in React Query v5
    retry,
    refetchOnWindowFocus,
    refetchOnMount,
    enabled,
    placeholderData: previousData.current,
    ...options
  });

  // Log query state
  useEffect(() => {
    const key = JSON.stringify(queryKey);
    console.log(`📊 [Query State] ${key}:`, {
      enabled,
      isLoading: result.isLoading,
      isFetching: result.isFetching,
      isSuccess: result.isSuccess,
      isError: result.isError,
      dataLength: Array.isArray(result.data) ? result.data.length : 'N/A'
    });
  }, [enabled, result.isLoading, result.isFetching, result.isSuccess, result.isError, queryKey, result.data]);

  return {
    ...result,
    data: Array.isArray(result.data) ? result.data : initialData
  };
}

/**
 * usePaginatedQuery - Query paginada com cache por página
 */
export function usePaginatedQuery({
  queryKey,
  queryFn,
  page = 1,
  pageSize = 50,
  ...options
}) {
  return useOptimizedQuery({
    queryKey: [...queryKey, "page", page, "size", pageSize],
    queryFn: () => queryFn(page, pageSize),
    keepPreviousData: true, // Mantém dados da página anterior durante transição
    ...options
  });
}

/**
 * useInfiniteOptimizedQuery - Infinite scroll otimizado
 */
export function useInfiniteOptimizedQuery({
  queryKey,
  queryFn,
  getNextPageParam,
  staleTime = 10 * 60 * 1000,
  ...options
}) {
  return useQuery({
    queryKey,
    queryFn,
    getNextPageParam,
    staleTime,
    cacheTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options
  });
}

export default useOptimizedQuery;