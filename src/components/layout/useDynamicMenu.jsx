import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Calendar, Users, FileText, Video, Package,
  DollarSign, ShoppingCart, MessageSquare, Settings, Shield,
  Activity, BarChart3, Inbox, Mail, Zap, Globe, Building2,
  Folder, Menu, ExternalLink, GitBranch, Target, Stethoscope,
  Brain, UsersRound, HelpCircle, Bell, Search, Grid3x3,
  ChevronRight, Eye, AlertCircle, TrendingUp, Headphones,
  Upload, CheckCircle2, Clock, Loader2, Database, FileSignature,
  HardDrive, Cloud, Pill, Palette
} from "lucide-react";

const iconMap = {
  LayoutDashboard, Calendar, Users, FileText, Video, Package,
  DollarSign, ShoppingCart, MessageSquare, Settings, Shield,
  Activity, BarChart3, Inbox, Mail, Zap, Globe, Building2,
  Folder, Menu, ExternalLink, GitBranch, Target, Stethoscope,
  Brain, UsersRound, HelpCircle, Bell, Search, Grid3x3,
  ChevronRight, Eye, AlertCircle, TrendingUp, Headphones,
  Upload, CheckCircle2, Clock, Loader2, Database, FileSignature,
  HardDrive, Cloud, Pill, Palette
};

export { iconMap };

/**
 * HOOK: Gera menu dinâmico baseado em MenuSidebar entity
 * Integrado com PlanoProvider para isolamento
 */
export function useDynamicMenu(user, temAcessoModulo) {
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menu-sidebar', user?.role === 'admin' ? 'superadmin' : 'clinica'],
    queryFn: async () => {
      if (!user) return [];
      
      const tipoMenu = user.role === 'admin' ? 'superadmin' : 'clinica';
      let items = await base44.entities.MenuSidebar.filter({ 
        tipo_menu: tipoMenu,
        visivel: true
      }, 'ordem', 200);
      
      // POPULAR PADRÃO SE VAZIO (seed automático)
      if (items.length === 0) {
        try {
          await base44.functions.invoke('popularMenusPadrao', {});
          items = await base44.entities.MenuSidebar.filter({ 
            tipo_menu: tipoMenu,
            visivel: true
          }, 'ordem', 200);
        } catch (error) {
          console.error('Erro ao popular menus:', error);
        }
      }
      
      return items;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Transformar em estrutura de navegação
  const transformarMenu = (items) => {
    const hierarquia = items
      .filter(item => !item.parent_id)
      .map(item => montarItem(item, items));
    
    return hierarquia;
  };

  const montarItem = (item, todosItems) => {
    const Icon = iconMap[item.icone_lucide] || Menu;
    
    const filhos = todosItems
      .filter(i => i.parent_id === item.id)
      .map(filho => montarItem(filho, todosItems));

    const navItem = {
      title: item.titulo,
      icon: Icon,
      color: item.cor,
      beta: item.beta,
      modulo: item.modulo_slug
    };

    if (item.tipo_item === 'pasta' && filhos.length > 0) {
      navItem.url = null;
      navItem.submenu = filhos;
    } else if (item.tipo_item === 'pagina') {
      navItem.url = createPageUrl(item.rota_pagina);
    } else if (item.tipo_item === 'link_externo') {
      navItem.url = item.url_externa;
      navItem.external = true;
    }

    return navItem;
  };

  const navigationItems = transformarMenu(menuItems);

  return { navigationItems, isLoading };
}