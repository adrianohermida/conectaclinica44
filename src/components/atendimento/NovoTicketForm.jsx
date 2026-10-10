import React, { useState } from "react";
import TicketTypeSelector from "./TicketTypeSelector";
import ContatoSelector from "./ContatoSelector";
import ContatoManualForm from "./ContatoManualForm";
import TicketFormFields from "./TicketFormFields";

export default function NovoTicketForm({ 
  form, 
  setForm, 
  contatos, 
  anexos, 
  setAnexos, 
  onSubmit, 
  onCancel, 
  isLoading
}) {
  const [buscaContato, setBuscaContato] = useState("");
  const contatoSelecionado = form.contato_id ? contatos.find(c => c.id === form.contato_id) : null;

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit(form);
    }} className="space-y-5">
      <TicketTypeSelector
        tipo={form.tipo}
        onTipoChange={(tipo) => {
          setForm({ ...form, tipo, canal: tipo === 'ticket' ? 'interno' : 'email' });
          setBuscaContato("");
        }}
      />

      {form.tipo === 'ticket' ? (
        <ContatoSelector
          contatos={contatos}
          buscaContato={buscaContato}
          setBuscaContato={setBuscaContato}
          contatoSelecionado={contatoSelecionado}
          onSelectContato={(contatoId) => {
            setForm({ ...form, contato_id: contatoId });
            setBuscaContato("");
          }}
          onRemoveContato={() => setForm({ ...form, contato_id: "" })}
        />
      ) : (
        <ContatoManualForm
          form={form}
          setForm={setForm}
          contatos={contatos}
        />
      )}

      <TicketFormFields
        form={form}
        setForm={setForm}
        anexos={anexos}
        setAnexos={setAnexos}
      />

      <div className="flex gap-3 pt-4">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 rounded-xl font-semibold border border-gray-300 hover:bg-gray-50 transition-all"
          style={{ minWidth: '44px', minHeight: '48px' }}
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={isLoading || (form.tipo === 'ticket' && !form.contato_id) || !form.assunto || !form.descricao} 
          className="flex-1 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ backgroundColor: '#7E57FF', color: 'white', minWidth: '44px', minHeight: '48px' }}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Enviando...</span>
            </>
          ) : form.tipo === 'email' ? "📧 Enviar Email" : "📝 Criar Ticket"}
        </button>
      </div>
    </form>
  );
}