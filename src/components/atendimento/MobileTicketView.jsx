import React from "react";
import MobileTicketList from "./MobileTicketList";
import MobileTicketDetails from "./MobileTicketDetails";

export default function MobileTicketView({
  ticketSelecionado,
  setTicketSelecionado,
  ticketsFiltrados,
  selecionados,
  setSelecionados,
  mensagens,
  resposta,
  setResposta,
  onEnviarResposta,
  enviando,
  notasInternas,
  notaInterna,
  setNotaInterna,
  tipoNota,
  setTipoNota,
  onAdicionarNota,
  adicionandoNota,
  user,
  timezone = 'America/Sao_Paulo'
}) {
  return (
    <div className="lg:hidden">
      {!ticketSelecionado ? (
        <MobileTicketList
          tickets={ticketsFiltrados}
          selecionados={selecionados}
          setSelecionados={setSelecionados}
          onSelectTicket={setTicketSelecionado}
        />
      ) : (
        <MobileTicketDetails
          ticket={ticketSelecionado}
          mensagens={mensagens}
          resposta={resposta}
          setResposta={setResposta}
          onEnviarResposta={onEnviarResposta}
          enviando={enviando}
          notasInternas={notasInternas}
          notaInterna={notaInterna}
          setNotaInterna={setNotaInterna}
          tipoNota={tipoNota}
          setTipoNota={setTipoNota}
          onAdicionarNota={onAdicionarNota}
          adicionandoNota={adicionandoNota}
          onVoltar={() => setTicketSelecionado(null)}
          user={user}
          timezone={timezone}
        />
      )}
    </div>
  );
}