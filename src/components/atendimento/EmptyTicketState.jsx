import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyTicketState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Inbox className="w-16 h-16 mx-auto mb-4" style={{ color: '#dadce0' }} />
        <h3 className="text-lg font-bold mb-2" style={{ color: '#202124' }}>Selecione um ticket</h3>
        <p className="text-sm" style={{ color: '#5f6368' }}>Clique em um ticket à esquerda</p>
      </div>
    </div>
  );
}