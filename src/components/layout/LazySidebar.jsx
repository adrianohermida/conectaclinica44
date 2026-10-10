import React, { Suspense } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2 } from "lucide-react";

// Lazy load sidebar content for LCP optimization
const SidebarContent = React.lazy(() => import("./SidebarContent"));

export default function LazySidebar({ sidebarOpen, setSidebarOpen, navigationItems, user, submenusAbertos, setSubmenusAbertos, userPermissions, medicos, pacientes, prefetch, temAcessoModulo, planoLoading }) {
  const location = useLocation();

  return (
    <aside
      className={`fixed top-14 md:top-16 left-0 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] w-full sm:w-80 lg:w-64 bg-white z-40 pc-transition-slow ${
        sidebarOpen ? 'translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full lg:translate-x-0'
      }`}
      style={{ borderRight: '1px solid #e8eaed' }}
      role="navigation"
      aria-label="Menu principal"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      }>
        <SidebarContent
          navigationItems={navigationItems}
          location={location}
          setSidebarOpen={setSidebarOpen}
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
      </Suspense>
    </aside>
  );
}