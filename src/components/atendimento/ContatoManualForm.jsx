import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function ContatoManualForm({ form, setForm, contatos }) {
  const contatoExistente = contatos.find(c => 
    c.emails?.some(e => e.email.toLowerCase() === form.solicitante_email?.toLowerCase()) ||
    c.email?.toLowerCase() === form.solicitante_email?.toLowerCase()
  );

  return (
    <>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Nome *</label>
          <Input
            value={form.solicitante_nome}
            onChange={(e) => setForm({ ...form, solicitante_nome: e.target.value })}
            required
            className="rounded-xl min-h-[48px] border-gray-200"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Email *</label>
          <Input
            type="email"
            value={form.solicitante_email}
            onChange={(e) => {
              const email = e.target.value;
              
              // Auto-detectar e preencher nome
              const existente = contatos.find(c => 
                c.emails?.some(em => em.email.toLowerCase() === email.toLowerCase()) ||
                c.email?.toLowerCase() === email.toLowerCase()
              );
              
              if (existente) {
                setForm({ 
                  ...form, 
                  solicitante_email: email,
                  solicitante_nome: existente.nome_completo,
                  solicitante_telefone: existente.telefones?.[0]?.numero || existente.telefone || form.solicitante_telefone,
                  contato_id: existente.id,
                  criar_novo_contato: false
                });
                toast.success(`✓ Contato encontrado: ${existente.nome_completo}`);
              } else {
                setForm({ ...form, solicitante_email: email, contato_id: "", criar_novo_contato: true });
              }
            }}
            required
            className="rounded-xl min-h-[48px] border-gray-200"
            placeholder="email@exemplo.com"
          />
        </div>
      </div>

      {contatoExistente ? (
        <div className="p-4 rounded-xl border-2" style={{ backgroundColor: '#fff3e0', borderColor: '#ffb300' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#e65100' }}>⚠️ EMAIL JÁ CADASTRADO</p>
          <p className="text-sm font-bold" style={{ color: '#202124' }}>{contatoExistente.nome_completo}</p>
          <p className="text-xs mt-1" style={{ color: '#5f6368' }}>O ticket será vinculado a este contato.</p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#f8f9fa' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#202124' }}>Criar novo contato</p>
            <p className="text-xs" style={{ color: '#5f6368' }}>Salvar como lead no sistema</p>
          </div>
          <Switch
            checked={form.criar_novo_contato}
            onCheckedChange={(v) => setForm({ ...form, criar_novo_contato: v })}
          />
        </div>
      )}
    </>
  );
}