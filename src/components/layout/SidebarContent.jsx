import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const NavItem = React.memo(({ item, isActive, onClick, badge, submenusAbertos, setSubmenusAbertos, userPermissions, user, medicos = [], pacientes = [], prefetch, temAcessoModulo, planoLoading, depth = 0 }) => {
  const iconBgColor = '#f5f3ff';
  const iconColor = '#7E57FF';
  const location = useLocation();

  // FILTRO PORTAIS
  if (item.portalType === 'medico') {
    const isMedico = medicos.some(m => m.email === user?.email);
    if (!isMedico && user?.role !== 'admin') return null;
  }
  if (item.portalType === 'paciente') {
    const isPaciente = pacientes.some(p => p.user_id === user?.id);
    if (!isPaciente && user?.role !== 'admin') return null;
  }

  // ISOLAMENTO DE PLANOS
  const isAdminTotal = user?.role === 'admin';
  const moduloDisponivel = isAdminTotal || !item.modulo || temAcessoModulo(item.modulo);

  if (!moduloDisponivel) return null;
  
  if (item.submenu) {
    const hasSubActive = item.submenu.some(sub => {
      if (sub.url) return location.pathname === sub.url;
      if (sub.submenu) return sub.submenu.some(nested => location.pathname === nested.url);
      return false;
    });
    const itemKey = `${item.title}-${depth}`;
    const isOpen = submenusAbertos.includes(itemKey);
    
    const toggleSubmenu = () => {
      if (isOpen) {
        setSubmenusAbertos(submenusAbertos.filter(key => key !== itemKey));
      } else {
        setSubmenusAbertos([...submenusAbertos, itemKey]);
      }
    };
    
    return (
      <div>
        <button
          onClick={toggleSubmenu}
          className={`group flex items-center gap-2.5 md:gap-3 px-3 py-2.5 md:py-3 rounded-xl transition-all w-full min-h-[48px] ${
            hasSubActive ? "" : "hover:bg-gray-50"
          }`}
          style={hasSubActive ? { backgroundColor: depth > 0 ? 'transparent' : '#f5f3ff' } : {}}
        >
          <div 
            className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 pc-transition"
            style={{ backgroundColor: hasSubActive && depth === 0 ? iconColor : iconBgColor }}
          >
            <item.icon 
              className="w-4.5 h-4.5 md:w-5 md:h-5" 
              style={{ color: hasSubActive && depth === 0 ? '#ffffff' : iconColor }}
            />
          </div>
          <span className={`font-normal text-sm md:text-[14.5px] pc-transition-fast flex-1 text-left truncate ${
            hasSubActive && depth === 0 ? 'text-[var(--pc-text-primary)] font-medium' : 'text-[var(--pc-text-secondary)]'
          }`}>
            {item.title}
          </span>
          <ChevronRight className={`w-3.5 h-3.5 md:w-4 md:h-4 pc-transition flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
        </button>
        {isOpen && (
          <div className="ml-5 md:ml-6 mt-1 space-y-1">
            {item.submenu.map(subItem => {
              const subActive = subItem.url ? location.pathname === subItem.url : false;
              const subAdminTotal = user?.role === 'admin';
              const subDisponivel = subAdminTotal || !subItem.modulo || temAcessoModulo(subItem.modulo);

              if (subItem.submenu) {
                return (
                  <NavItem
                    key={subItem.title}
                    item={subItem}
                    isActive={false}
                    onClick={onClick}
                    badge={0}
                    submenusAbertos={submenusAbertos}
                    setSubmenusAbertos={setSubmenusAbertos}
                    userPermissions={userPermissions}
                    user={user}
                    medicos={medicos}
                    pacientes={pacientes}
                    prefetch={prefetch}
                    temAcessoModulo={temAcessoModulo}
                    planoLoading={planoLoading}
                    depth={depth + 1}
                  />
                );
              }

              if (!subDisponivel) return null;

              return (
                <Link
                  key={subItem.title}
                  to={subItem.url}
                  onClick={onClick}
                  className={`flex items-center gap-2.5 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg transition-all min-h-[44px] ${
                    subActive ? "" : "hover:bg-gray-50"
                  }`}
                  style={subActive ? { backgroundColor: '#f5f3ff' } : {}}
                >
                  <subItem.icon className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" style={{ color: '#7E57FF' }} />
                  <span className="text-xs md:text-sm truncate">{subItem.title}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  
  if (!moduloDisponivel) return null;

  return (
    <Link
      to={item.url}
      onClick={onClick}
      onMouseEnter={() => {
        if (item.title === "Agenda" && user?.clinica_id) {
          prefetch.agenda?.(user.clinica_id);
        } else if (item.title === "Prontuários" && user?.clinica_id) {
          prefetch.prontuarios?.(user.clinica_id);
        } else if (item.title === "Contatos" && user?.clinica_id) {
          prefetch.pacientes?.(user.clinica_id);
        } else if (item.title === "Atendimento" && user?.clinica_id) {
          prefetch.atendimento?.(user.clinica_id);
        }
      }}
      className={`group flex items-center gap-2.5 md:gap-3 px-3 py-2.5 md:py-3 rounded-xl transition-all min-h-[48px] ${
        isActive ? "" : "hover:bg-gray-50"
      }`}
      style={isActive ? { backgroundColor: '#f5f3ff' } : {}}
      aria-current={isActive ? "page" : undefined}
    >
      <div 
        className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 pc-transition"
        style={{ backgroundColor: isActive ? iconColor : iconBgColor }}
      >
        <item.icon 
          className="w-4.5 h-4.5 md:w-5 md:h-5" 
          style={{ color: isActive ? '#ffffff' : iconColor }}
        />
      </div>
      <span className={`font-normal text-sm md:text-[14.5px] pc-transition-fast truncate ${
        isActive ? 'text-[var(--pc-text-primary)] font-medium' : 'text-[var(--pc-text-secondary)]'
      }`}>
        {item.title}
      </span>
      {item.beta && (
        <span className="ml-auto pc-badge pc-badge-warning text-[9px] md:text-[10px] whitespace-nowrap">Beta</span>
      )}
      {badge > 0 && (
        <span className="ml-auto bg-[var(--pc-error)] text-white text-[9px] md:text-[10px] font-bold rounded-full min-w-[16px] md:min-w-[18px] h-[16px] md:h-[18px] px-1 md:px-1.5 flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
});

export default function SidebarContent({ navigationItems, location, setSidebarOpen, submenusAbertos, setSubmenusAbertos, userPermissions, user, medicos, pacientes, prefetch, temAcessoModulo, planoLoading }) {
  return (
    <div className="px-3 py-3 h-full overflow-y-auto pc-scrollbar">
      <nav className="space-y-1">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavItem
              key={item.title}
              item={item}
              isActive={isActive}
              onClick={() => setSidebarOpen(false)}
              badge={0}
              submenusAbertos={submenusAbertos}
              setSubmenusAbertos={setSubmenusAbertos}
              userPermissions={userPermissions}
              user={user}
              medicos={medicos}
              pacientes={pacientes}
              prefetch={prefetch}
              temAcessoModulo={temAcessoModulo}
              planoLoading={planoLoading}
            />
          );
        })}
      </nav>
    </div>
  );
}