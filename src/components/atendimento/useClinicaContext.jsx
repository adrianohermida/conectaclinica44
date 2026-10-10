import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useClinicaContext() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 15 * 60 * 1000
  });

  return {
    clinicaId: user?.clinica_id,
    user
  };
}