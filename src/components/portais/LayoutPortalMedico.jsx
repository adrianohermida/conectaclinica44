import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import UserMenu from "@/components/ui/UserMenu";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Users,
  MessageSquare,
  Activity,
  Settings,
  Building2,
  ChevronRight
} from "lucide-react";

const medicoNavItems = [
  { title: "Minha Agenda", url: createPageUrl("PortalMedico"), icon: LayoutDashboard },
  { title: "Agenda Geral", url: createPageUrl("Agenda"), icon: Calendar },
  { title: "Meus Pacientes", url: createPageUrl("Pacientes"), icon: Users },
  { title: "Prontuários", url: createPageUrl("Prontuarios"), icon: FileText },
  { title: "Mensagens", url: createPageUrl("Helpdesk"), icon: MessageSquare }
];

export default function LayoutPortalMedico({ children, user, medicoData }) {
  const location = useLocation();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FA' }}>
      {/* Header Portal Médico */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white h-16 shadow-sm" style={{ borderBottom: '1px solid #e8eaed' }}>
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8" style={{ color: '#34a853' }} />
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#081828' }}>Portal do Médico</h1>
              <p className="text-xs" style={{ color: '#5f6368' }}>
                Dr(a). {medicoData?.nome_completo} - CRM {medicoData?.crm}
              </p>
            </div>
          </div>
          <UserMenu user={user} />
        </div>
      </header>

      {/* Sidebar Médico */}
      <aside
        className="hidden lg:block fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white z-40"
        style={{ borderRight: '1px solid #e8eaed' }}
      >
        <div className="px-3 py-3 h-full overflow-y-auto">
          <nav className="space-y-1">
            {medicoNavItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isActive ? "" : "hover:bg-gray-50"
                  }`}
                  style={isActive ? { backgroundColor: '#e6f7ed' } : {}}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: isActive ? '#34a853' : '#e6f7ed' }}
                  >
                    <item.icon 
                      className="w-5 h-5" 
                      style={{ color: isActive ? '#ffffff' : '#34a853' }}
                    />
                  </div>
                  <span className={`font-normal text-sm ${
                    isActive ? 'font-medium' : ''
                  }`} style={{ color: isActive ? '#1f6332' : '#5f6368' }}>
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-20 px-4 md:px-6 lg:px-8 pb-20 min-h-screen">
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}