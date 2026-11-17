'use client';

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  useEffect(() => {
    const wideScreenQuery = window.matchMedia('(min-width: 1280px)');
    setIsSidebarCollapsed(!wideScreenQuery.matches);

    const handleBreakpointChange = (event: MediaQueryListEvent) => {
      setIsSidebarCollapsed(!event.matches);
    };

    wideScreenQuery.addEventListener('change', handleBreakpointChange);
    return () => wideScreenQuery.removeEventListener('change', handleBreakpointChange);
  }, []);

  return (
    <div className="app-window-layout flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
      />
      <main
        className={`min-w-0 flex-1 pb-20 transition-[margin] duration-300 lg:pb-0 ${
          isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        }`}
      >
        <Topbar />
        {children}
      </main>
    </div>
  );
}
