import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import { Button } from "@/components/ui/Button";
import MenuItem from "@/components/menu/MenuItem";
import MenuItemModal from "@/components/menu/MenuItemModal";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";

export default function GestaoMenu() {
  const [tipoMenu, setTipoMenu] = useState('clinica');
  const [editando, setEditando] = useState(null);
  const [expandidos, setExpandidos] = useState({});
  const queryClient = useQueryClient();

  const { data: menus = [], isLoading } = useQuery({
    queryKey: ['menus-sidebar', tipoMenu],
    queryFn: async () => {
      const result = await base44.entities.MenuSidebar.filter({ tipo_menu: tipoMenu }, 'ordem', 200);
      
      // POPULAR PADRÃO SE VAZIO (seed data)
      if (result.length === 0) {
        try {
          await base44.functions.invoke('popularMenusPadrao', {});
          const novosMenus = await base44.entities.MenuSidebar.filter({ tipo_menu: tipoMenu }, 'ordem', 200);
          return novosMenus;
        } catch (error) {
          console.error('Erro ao popular menus:', error);
          return [];
        }
      }
      
      return result;
    }
  });

  const { data: planos = [] } = useQuery({
    queryKey: ['planos-modulos'],
    queryFn: async () => {
      const result = await base44.entities.PlanoModulo.list();
      return result;
    }
  });

  const salvarMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        return await base44.entities.MenuSidebar.update(data.id, data);
      } else {
        return await base44.entities.MenuSidebar.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['menus-sidebar']);
      queryClient.invalidateQueries(['menu-sidebar']);
      setEditando(null);
      toast.success('✅ Item salvo - sidebar atualizada');
    }
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuSidebar.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['menus-sidebar']);
      queryClient.invalidateQueries(['menu-sidebar']);
      toast.success('✅ Item removido - sidebar atualizada');
    }
  });

  const reordenarMutation = useMutation({
    mutationFn: async (updates) => {
      await Promise.all(
        updates.map(({ id, ordem, parent_id }) => 
          base44.entities.MenuSidebar.update(id, { ordem, parent_id })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['menus-sidebar']);
      queryClient.invalidateQueries(['menu-sidebar']);
      toast.success('✅ Ordem atualizada - sidebar atualizada');
    }
  });

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(menus);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    const updates = items.map((item, index) => ({
      id: item.id,
      ordem: index,
      parent_id: item.parent_id
    }));

    reordenarMutation.mutate(updates);
  };

  const toggleExpandir = (id) => {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const hierarquia = menus.reduce((acc, item) => {
    if (!item.parent_id) {
      acc.push({ ...item, filhos: [] });
    }
    return acc;
  }, []);

  menus.forEach(item => {
    if (item.parent_id) {
      const pai = hierarquia.find(p => p.id === item.parent_id);
      if (pai) pai.filhos.push(item);
    }
  });

  if (isLoading) {
    return (
      <RouteGuard requireAuth>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7E57FF' }} />
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="Gestão de Menu Sidebar"
          description="Controle total: criar, reordenar, vincular a planos"
          action={
            <Button onClick={() => setEditando({
              tipo_menu: tipoMenu,
              tipo_item: 'pagina',
              ordem: menus.length,
              visivel: true,
              roles_permitidos: ['admin', 'user']
            })}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Item
            </Button>
          }
        />

        <div className="pc-card p-4">
          <div className="flex gap-4">
            <button
              onClick={() => setTipoMenu('clinica')}
              className={`px-4 py-2 rounded-lg font-medium ${
                tipoMenu === 'clinica' ? 'bg-[#7E57FF] text-white' : 'bg-gray-100'
              }`}
            >
              Menu Clínica
            </button>
            <button
              onClick={() => setTipoMenu('superadmin')}
              className={`px-4 py-2 rounded-lg font-medium ${
                tipoMenu === 'superadmin' ? 'bg-[#7E57FF] text-white' : 'bg-gray-100'
              }`}
            >
              Menu SuperAdmin
            </button>
          </div>
        </div>

        <div className="pc-card p-6">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="menu-items">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {hierarquia.map((item, index) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      index={index}
                      onEdit={setEditando}
                      onDelete={deletarMutation.mutate}
                      expandidos={expandidos}
                      toggleExpandir={toggleExpandir}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {editando && (
          <MenuItemModal
            item={editando}
            planos={planos}
            onSave={salvarMutation.mutate}
            onClose={() => setEditando(null)}
            isSaving={salvarMutation.isPending}
          />
        )}
      </div>
    </RouteGuard>
  );
}