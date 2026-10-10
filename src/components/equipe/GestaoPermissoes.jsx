import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, ChevronRight, Save, X, Check } from "lucide-react";
import { toast } from "sonner";

const MODULOS_SISTEMA = [
  { id: "dashboard", nome: "Dashboard", descricao: "Visão geral e métricas" },
  { id: "agenda", nome: "Agenda", descricao: "Agendamentos e consultas" },
  { id: "pacientes", nome: "Pacientes", descricao: "Cadastro e gestão de pacientes" },
  { id: "prontuarios", nome: "Prontuários", descricao: "Prontuários eletrônicos" },
  { id: "produtos", nome: "Produtos", descricao: "Catálogo de produtos/serviços" },
  { id: "atendimento", nome: "Atendimento", descricao: "Tickets e suporte" },
  { id: "administracao", nome: "Administração", descricao: "Configurações da clínica" },
  { id: "relatorios", nome: "Relatórios", descricao: "Relatórios e analytics" },
  { id: "financeiro", nome: "Financeiro", descricao: "Gestão financeira" },
  { id: "estoque", nome: "Estoque", descricao: "Controle de estoque" }
];

const PERFIS_PADRAO = {
  admin_clinica: {
    nome: "Administrador",
    descricao: "Acesso total ao sistema",
    modulos: ["*"]
  },
  medico: {
    nome: "Médico",
    descricao: "Acesso clínico completo",
    modulos: ["dashboard", "agenda", "pacientes", "prontuarios", "atendimento", "relatorios"]
  },
  recepcao: {
    nome: "Recepção",
    descricao: "Agendamentos e cadastros",
    modulos: ["dashboard", "agenda", "pacientes", "atendimento"]
  },
  financeiro: {
    nome: "Financeiro",
    descricao: "Gestão financeira",
    modulos: ["dashboard", "financeiro", "relatorios"]
  },
  customizado: {
    nome: "Personalizado",
    descricao: "Permissões customizadas",
    modulos: []
  }
};

export default function GestaoPermissoes({ usuario, onSave, onCancel }) {
  const [perfil, setPerfil] = useState(usuario?.perfil || "recepcao");
  const [modulosCustomizados, setModulosCustomizados] = useState(
    usuario?.permissoes?.modulos || []
  );
  const [salvando, setSalvando] = useState(false);

  const handleToggleModulo = (moduloId) => {
    setModulosCustomizados(prev => 
      prev.includes(moduloId) 
        ? prev.filter(m => m !== moduloId)
        : [...prev, moduloId]
    );
  };

  const handleSave = async () => {
    setSalvando(true);
    try {
      const permissoes = perfil === "customizado" 
        ? { modulos: modulosCustomizados }
        : { modulos: PERFIS_PADRAO[perfil].modulos };

      await onSave({ perfil, permissoes });
      toast.success("✅ Permissões atualizadas");
    } catch (error) {
      toast.error(`❌ Erro: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const modulosAtivos = perfil === "customizado" 
    ? modulosCustomizados 
    : PERFIS_PADRAO[perfil]?.modulos || [];
  
  const temAcessoTotal = modulosAtivos.includes("*");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold" style={{ color: '#202124' }}>
            Permissões de {usuario.full_name}
          </h3>
          <p className="text-sm" style={{ color: '#5f6368' }}>
            {usuario.email}
          </p>
        </div>
        <Badge 
          className="text-xs px-3 py-1" 
          style={{ 
            backgroundColor: usuario.role === 'admin' ? '#f5f3ff' : '#e8eaed',
            color: usuario.role === 'admin' ? '#6d28d9' : '#5f6368'
          }}
        >
          {usuario.role === 'admin' ? 'SuperAdmin' : 'Membro'}
        </Badge>
      </div>

      {/* Perfis Predefinidos */}
      <div>
        <label className="block text-sm font-semibold mb-3" style={{ color: '#202124' }}>
          Perfil de Acesso
        </label>
        <div className="space-y-2">
          {Object.entries(PERFIS_PADRAO).map(([key, perfilData]) => (
            <button
              key={key}
              onClick={() => setPerfil(key)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                perfil === key ? '' : 'hover:border-gray-300'
              }`}
              style={{
                borderColor: perfil === key ? '#7E57FF' : '#e8eaed',
                backgroundColor: perfil === key ? '#f5f3ff' : 'white'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4" style={{ color: perfil === key ? '#7E57FF' : '#5f6368' }} />
                    <span className="font-semibold text-sm" style={{ color: perfil === key ? '#4c1d95' : '#202124' }}>
                      {perfilData.nome}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: '#5f6368' }}>
                    {perfilData.descricao}
                  </p>
                </div>
                {perfil === key && (
                  <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#7E57FF' }} />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Módulos Customizados */}
      {perfil === "customizado" && (
        <div className="p-4 rounded-xl border" style={{ borderColor: '#e8eaed', backgroundColor: '#f8f9fa' }}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" style={{ color: '#7E57FF' }} />
            <h4 className="font-semibold text-sm" style={{ color: '#202124' }}>
              Módulos Permitidos
            </h4>
          </div>
          
          <div className="space-y-3">
            {MODULOS_SISTEMA.map(modulo => (
              <div 
                key={modulo.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-white border"
                style={{ borderColor: '#e8eaed' }}
              >
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: '#202124' }}>
                    {modulo.nome}
                  </p>
                  <p className="text-xs" style={{ color: '#5f6368' }}>
                    {modulo.descricao}
                  </p>
                </div>
                <Switch
                  checked={modulosCustomizados.includes(modulo.id)}
                  onCheckedChange={() => handleToggleModulo(modulo.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview de Acesso */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
        <h4 className="font-semibold text-sm mb-2" style={{ color: '#6d28d9' }}>
          {temAcessoTotal ? '✨ Acesso Total' : `📋 Acesso a ${modulosAtivos.length} módulos`}
        </h4>
        <div className="flex flex-wrap gap-2">
          {temAcessoTotal ? (
            <Badge className="text-xs" style={{ backgroundColor: '#7E57FF', color: 'white' }}>
              Todos os módulos
            </Badge>
          ) : (
            modulosAtivos.map(modId => {
              const modulo = MODULOS_SISTEMA.find(m => m.id === modId);
              return modulo ? (
                <Badge 
                  key={modId} 
                  className="text-xs" 
                  style={{ backgroundColor: '#7E57FF', color: 'white' }}
                >
                  {modulo.nome}
                </Badge>
              ) : null;
            })
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 min-h-[48px] rounded-xl font-medium border transition-all hover:bg-gray-50"
          style={{ borderColor: '#e8eaed', color: '#5f6368' }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={salvando}
          className="flex-1 min-h-[48px] rounded-xl font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#7E57FF', color: 'white' }}
        >
          {salvando ? (
            <>⏳ Salvando...</>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Permissões
            </>
          )}
        </button>
      </div>
    </div>
  );
}