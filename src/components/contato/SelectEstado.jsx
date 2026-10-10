import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SelectEstado({ value, onChange, disabled }) {
  const { data: estados = [], isLoading } = useQuery({
    queryKey: ["estados"],
    queryFn: () => base44.entities.Estado.list(),
    staleTime: Infinity, // Estados não mudam
    gcTime: Infinity
  });

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Carregando..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione o estado" />
      </SelectTrigger>
      <SelectContent style={{ zIndex: 999999 }}>
        {estados.map(estado => (
          <SelectItem key={estado.sigla} value={estado.sigla}>
            {estado.nome} - {estado.sigla}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}