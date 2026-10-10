import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { FixedSizeList } from "react-window";

export default function ContatoSelector({ 
  contatos = [],
  buscaContato, 
  setBuscaContato, 
  contatoSelecionado, 
  onSelectContato, 
  onRemoveContato
}) {
  // BUSCA CLIENT-SIDE + VIRTUALIZAÇÃO (garantido que funciona)
  const contatosFiltrados = useMemo(() => {
    if (!buscaContato || buscaContato.length < 2) return [];
    
    const termo = buscaContato.toLowerCase();
    
    return contatos.filter(c => {
      const matchNome = c.nome_completo?.toLowerCase().includes(termo);
      const matchEmail = c.emails?.some(e => e.email?.toLowerCase().includes(termo)) ||
                         c.email?.toLowerCase().includes(termo);
      const matchTelefone = c.telefones?.some(t => t.numero?.includes(termo)) ||
                            c.telefone?.includes(termo);
      const matchCpf = c.cpf?.includes(termo) || c.cnpj?.includes(termo);
      
      return matchNome || matchEmail || matchTelefone || matchCpf;
    }).slice(0, 100); // Limit 100 client-side
  }, [contatos, buscaContato]);

  // Row renderer para react-window (virtualização)
  const Row = ({ index, style }) => {
    const c = contatosFiltrados[index];
    const emailPrincipal = c.emails?.find(e => e.principal)?.email || c.emails?.[0]?.email || c.email;
    
    return (
      <button
        key={c.id}
        type="button"
        onClick={() => {
          onSelectContato(c.id);
          setBuscaContato("");
        }}
        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-all border-b"
        style={{ ...style, borderColor: '#e8eaed' }}
      >
        <div className="font-semibold text-sm" style={{ color: '#202124' }}>{c.nome_completo}</div>
        <div className="text-xs mt-1" style={{ color: '#5f6368' }}>{emailPrincipal || 'Sem email'}</div>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold" style={{ color: '#202124' }}>Destinatário *</label>
      
      <Input
        placeholder="🔍 Buscar por nome ou email..."
        value={buscaContato}
        onChange={(e) => setBuscaContato(e.target.value)}
        className="rounded-xl min-h-[48px] border-gray-200"
      />

      {buscaContato && contatosFiltrados.length > 0 ? (
        <div className="border rounded-xl overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <FixedSizeList
            height={Math.min(contatosFiltrados.length * 68, 300)}
            itemCount={contatosFiltrados.length}
            itemSize={68}
            width="100%"
          >
            {Row}
          </FixedSizeList>
        </div>
      ) : buscaContato && buscaContato.length >= 2 ? (
        <div className="text-center py-4 text-sm border rounded-xl" style={{ color: '#80868b', borderColor: '#e8eaed' }}>
          ⚠️ Nenhum contato encontrado com "{buscaContato}"
          <div className="mt-2 text-xs">💡 Troque para "Email" para criar novo contato</div>
        </div>
      ) : buscaContato && buscaContato.length < 2 ? (
        <div className="text-center py-4 text-xs" style={{ color: '#80868b' }}>
          Digite pelo menos 2 caracteres para buscar...
        </div>
      ) : null}

      {contatoSelecionado && (
        <div className="p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: '#f5f3ff' }}>
          <span className="text-sm font-medium" style={{ color: '#7E57FF' }}>
            ✓ {contatoSelecionado.nome_completo}
          </span>
          <button
            type="button"
            onClick={onRemoveContato}
            className="text-xs px-2 py-1 rounded hover:bg-white"
          >
            Remover
          </button>
        </div>
      )}
    </div>
  );
}