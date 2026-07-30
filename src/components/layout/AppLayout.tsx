import { ReactNode, useState, useEffect } from "react";
import { UserProfile } from "../../types/user";
import { AppTab } from "../../types/navigation";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { MobileBottomNavigation } from "./MobileBottomNavigation";

export interface AppLayoutProps {
  currentUser: UserProfile;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onLogout?: () => void;
  children: ReactNode;
}

export function AppLayout({
  currentUser,
  activeTab,
  onSelectTab,
  onLogout,
  children,
}: AppLayoutProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileDrawerOpen]);

  return (
    <div className="flex app-viewport-height bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          currentUser={currentUser}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          onLogout={onLogout}
          variant="desktop"
        />
      </div>

      {/* Drawer Mobile */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Sidebar */}
          <div
            id="mobile-navigation-drawer"
            aria-label="Điều hướng chính"
            className="relative z-50 flex-1 max-w-xs w-full bg-slate-900 shadow-xl flex flex-col h-full"
          >
            <Sidebar
              currentUser={currentUser}
              activeTab={activeTab}
              onSelectTab={(tab) => {
                onSelectTab(tab);
                setMobileDrawerOpen(false);
              }}
              onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
              onLogout={onLogout}
              variant="mobile-secondary"
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <AppHeader
          activeTab={activeTab}
          mobileMenuOpen={mobileDrawerOpen}
          onOpenMobileMenu={() => setMobileDrawerOpen(true)}
        />

        <main className="flex-1 overflow-y-auto main-safe-padding pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNavigation
          currentUser={currentUser}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
        />
      </div>
    </div>
  );
}

