'use client';

import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const wideScreenQuery = window.matchMedia("(min-width: 1280px)");
    setIsSidebarCollapsed(!wideScreenQuery.matches);

    const handleBreakpointChange = (event: MediaQueryListEvent) => {
      setIsSidebarCollapsed(!event.matches);
    };

    wideScreenQuery.addEventListener("change", handleBreakpointChange);
    return () => wideScreenQuery.removeEventListener("change", handleBreakpointChange);
  }, []);

  useEffect(() => {
    const handleMenuShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "b") return;

      event.preventDefault();
      setIsSidebarCollapsed((collapsed) => !collapsed);
    };

    window.addEventListener("keydown", handleMenuShortcut);
    return () => window.removeEventListener("keydown", handleMenuShortcut);
  }, []);

  return (
    <div className="app-window-layout flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
      />
      <main
        className={`min-w-0 flex-1 pb-20 transition-[margin] duration-300 lg:pb-0 ${
          isSidebarCollapsed ? "lg:ml-16" : "lg:ml-60"
        }`}
      >
        <Topbar />
        {children}
      </main>
    </div>
  );
}