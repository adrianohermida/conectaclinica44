import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Calendar, Users, FileText, Settings } from "lucide-react";

export default function MobileBottomNav() {
  const location = useLocation();

  const items = [
    { title: "Início", url: createPageUrl("DashboardCompleto"), icon: LayoutDashboard },
    { title: "Agenda", url: createPageUrl("Agenda"), icon: Calendar },
    { title: "Pacientes", url: createPageUrl("Pacientes"), icon: Users },
    { title: "Prontuários", url: createPageUrl("Prontuarios"), icon: FileText },
    { title: "Config", url: createPageUrl("ConfiguracaoClinica"), icon: Settings }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 lg:hidden">
      <div className="grid grid-cols-5 h-16">
        {items.map(item => {
          const isActive = location.pathname === item.url;
          return (
            <Link
              key={item.title}
              to={item.url}
              className="flex flex-col items-center justify-center gap-1 transition-all"
              style={isActive ? { backgroundColor: '#f5f3ff' } : {}}
            >
              <item.icon className="w-5 h-5" style={{ color: isActive ? '#7E57FF' : '#80868b' }} />
              <span className="text-[10px] font-medium" style={{ color: isActive ? '#7E57FF' : '#80868b' }}>
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}