import React from "react";
import { Plus, MoreVertical, Sparkles, GitMerge, Brain, Mail } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import BulkActionsBar from "./BulkActionsBar";
import ModeSelector from "./ModeSelector";

export default function HeaderActions({
  selecionados,
  onArquivarSelecionados,
  onExcluirSelecionados,
  modoVisualizacao,
  setModoVisualizacao,
  onNovoTicket,
  onAbrirTemplates,
  onAbrirDuplicatas,
  onAbrirAnalytics,
  onAbrirEmailDebug
}) {
  return (
    <div className="flex items-center gap-3">
      <BulkActionsBar
        selecionadosCount={selecionados.length}
        onArquivar={onArquivarSelecionados}
        onExcluir={onExcluirSelecionados}
      />
      
      <ModeSelector 
        modo={modoVisualizacao} 
        onChange={setModoVisualizacao} 
      />
      
      <button
        onClick={onNovoTicket}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md"
        style={{ backgroundColor: '#7E57FF', color: 'white', minWidth: '44px', minHeight: '44px' }}
      >
        <Plus className="w-5 h-5" />
        Novo Ticket
      </button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-3 rounded-xl border transition-all hover:bg-gray-50"
            style={{ borderColor: '#e8eaed', minWidth: '44px', minHeight: '44px' }}
            title="Mais opções"
            aria-label="Mais opções"
          >
            <MoreVertical className="w-5 h-5" style={{ color: '#5f6368' }} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onAbrirTemplates}>
            <Sparkles className="w-4 h-4 mr-2" />
            Templates
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAbrirDuplicatas}>
            <GitMerge className="w-4 h-4 mr-2" />
            Duplicatas
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAbrirAnalytics}>
            <Brain className="w-4 h-4 mr-2" />
            Analytics
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAbrirEmailDebug}>
            <Mail className="w-4 h-4 mr-2" />
            Debug Email
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}