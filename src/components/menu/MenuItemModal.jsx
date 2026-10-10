import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import { Folder, Menu, ExternalLink, X, Save, Loader2 } from "lucide-react";
import PageSelector from "@/components/menu/PageSelector";
import RolePermissionSelector from "@/components/menu/RolePermissionSelector";
import {
  LayoutDashboard, Calendar, Users, FileText, Video, Package,
  DollarSign, ShoppingCart, MessageSquare, Settings, Shield,
  Activity, BarChart3, Inbox, Mail, Zap, Globe, Building2
} from "lucide-react";

const iconMap = {
  LayoutDashboard, Calendar, Users, FileText, Video, Package,
  DollarSign, ShoppingCart, MessageSquare, Settings, Shield,
  Activity, BarChart3, Inbox, Mail, Zap, Globe, Building2
};

export default function MenuItemModal({ item, planos, onSave, onClose, isSaving }) {
  const [form, setForm] = useState(item);
  
  const iconesComuns = [
    'LayoutDashboard', 'Calendar', 'Users', 'FileText', 'Video', 'Package',
    'DollarSign', 'ShoppingCart', 'MessageSquare', 'Settings', 'Shield',
    'Activity', 'BarChart3', 'Inbox', 'Mail', 'Zap', 'Globe', 'Building2'
  ];

  const handleSubmit = () => {
    if (form.tipo_item === 'pagina' && !form.rota_pagina) {
      alert('Página requer rota_pagina');
      return;
    }
    if (form.tipo_item === 'link_externo' && !form.url_externa) {
      alert('Link externo requer URL');
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">{item.id ? 'Editar Item' : 'Novo Item'}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {['pasta', 'pagina', 'link_externo'].map(tipo => (
                <button key={tipo} onClick={() => setForm({ ...form, tipo_item: tipo })} className={`px-4 py-2 rounded-lg border font-medium ${form.tipo_item === tipo ? 'border-[#7E57FF] bg-[#f5f3ff]' : ''}`}>
                  {tipo === 'pasta' ? <Folder className="w-4 h-4 mx-auto mb-1" /> : tipo === 'pagina' ? <Menu className="w-4 h-4 mx-auto mb-1" /> : <ExternalLink className="w-4 h-4 mx-auto mb-1" />}
                  {tipo.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Título</label>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Dashboard, Pacientes" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ícone Lucide</label>
            <div className="grid grid-cols-6 gap-2 mb-2">
              {iconesComuns.map((name) => {
                const Icon = iconMap[name];
                return (
                  <button key={name} onClick={() => setForm({ ...form, icone_lucide: name })} className={`p-3 rounded-lg border ${form.icone_lucide === name ? 'border-[#7E57FF] bg-[#f5f3ff]' : ''}`}>
                    <Icon className="w-5 h-5 mx-auto" />
                  </button>
                );
              })}
            </div>
            <Input value={form.icone_lucide || ''} onChange={(e) => setForm({ ...form, icone_lucide: e.target.value })} placeholder="Ou digite manualmente" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cor</label>
            <Input type="color" value={form.cor || '#7E57FF'} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
          </div>

          {form.tipo_item === 'pagina' && (
            <div>
              <label className="block text-sm font-medium mb-2">Rota da Página*</label>
              <PageSelector 
                value={form.rota_pagina || ''} 
                onChange={(path) => setForm({ ...form, rota_pagina: path })} 
              />
            </div>
          )}

          {form.tipo_item === 'link_externo' && (
            <div>
              <label className="block text-sm font-medium mb-2">URL Externa*</label>
              <Input value={form.url_externa || ''} onChange={(e) => setForm({ ...form, url_externa: e.target.value })} placeholder="https://..." />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Módulo Slug (para PlanoProvider)</label>
            <Input value={form.modulo_slug || ''} onChange={(e) => setForm({ ...form, modulo_slug: e.target.value })} placeholder="Ex: pacientes, agenda" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Planos que incluem</label>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
              {planos.map(plano => (
                <label key={plano.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={form.planos_requeridos?.includes(plano.id)} onChange={(e) => {
                    const checked = e.target.checked;
                    const planos_requeridos = form.planos_requeridos || [];
                    setForm({ ...form, planos_requeridos: checked ? [...planos_requeridos, plano.id] : planos_requeridos.filter(p => p !== plano.id) });
                  }} className="rounded" />
                  <span className="text-sm">{plano.nome}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Permissões de Acesso</label>
            <RolePermissionSelector
              value={form.roles_permitidos || ['admin', 'user']}
              onChange={(roles) => setForm({ ...form, roles_permitidos: roles })}
            />
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.visivel} onChange={(e) => setForm({ ...form, visivel: e.target.checked })} className="rounded" />
            <span className="text-sm font-medium">Visível no menu</span>
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.beta} onChange={(e) => setForm({ ...form, beta: e.target.checked })} className="rounded" />
            <span className="text-sm font-medium">Badge Beta</span>
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.customizavel_clinica} onChange={(e) => setForm({ ...form, customizavel_clinica: e.target.checked })} className="rounded" />
            <span className="text-sm font-medium">Clínica pode customizar</span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <Button onClick={onClose} variant="outline" className="flex-1">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !form.titulo} className="flex-1">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}