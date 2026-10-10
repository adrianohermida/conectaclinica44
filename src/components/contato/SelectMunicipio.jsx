import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

/**
 * DECISÃO: Não carregar 5570 municípios na base.
 * Usar busca via ViaCEP ou permitir entrada livre.
 */
export default function SelectMunicipio({ value, onChange, uf, disabled }) {
  const [busca, setBusca] = useState("");

  // TODO: Integrar busca via IBGE ou ViaCEP se necessário
  // Por enquanto: entrada livre (mais simples, funcional)

  return (
    <div className="relative">
      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
      <Input
        value={value || busca}
        onChange={(e) => {
          setBusca(e.target.value);
          onChange(e.target.value);
        }}
        placeholder="Digite a cidade"
        disabled={disabled}
        className="pl-10"
      />
    </div>
  );
}