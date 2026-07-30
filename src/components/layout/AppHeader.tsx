import { AppTab } from "../../types/navigation";
import { NAV_ITEMS } from "../../config/navigation";
import { Badge } from "../common/Badge";

export interface AppHeaderProps {
  activeTab: AppTab;
  mobileMenuOpen: boolean;
  onOpenMobileMenu: () => void;
}

export function AppHeader({
  activeTab,
  mobileMenuOpen,
  onOpenMobileMenu,
}: AppHeaderProps) {
  const currentNav = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];

  return (
    <header className="bg-white border-b border-slate-200/80 header-safe-padding flex items-center justify-between shadow-2xs sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation-drawer"
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label="Mở menu điều hướng"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            {currentNav.label}
          </h2>
          <p className="text-xs text-slate-500 font-medium hidden md:block">
            {currentNav.description}
          </p>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <Badge variant="success" className="text-[11px] font-medium tracking-normal py-1 px-2.5">
          Dữ liệu Firebase • Đã kết nối
        </Badge>
      </div>
    </header>
  );
}
