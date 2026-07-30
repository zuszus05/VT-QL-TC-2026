import { UserProfile } from "../../types/user";
import { AppTab } from "../../types/navigation";
import { NAV_ITEMS } from "../../config/navigation";
import { SyncStatus } from "../common/SyncStatus";
import { Badge } from "../common/Badge";
import { useToast } from "../../hooks/useToast";
import { getUserInitials } from "../../utils/avatar";
import { signOutUser } from "../../services/authService";
import { NavIcon } from "./NavIcon";

export interface SidebarProps {
  currentUser: UserProfile;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onCloseMobileDrawer?: () => void;
  onLogout?: () => void;
  variant?: "desktop" | "mobile-secondary";
}

export function Sidebar({
  currentUser,
  activeTab,
  onSelectTab,
  onCloseMobileDrawer,
  onLogout,
  variant = "desktop",
}: SidebarProps) {
  const { showToast } = useToast();

  const handleLogoutClick = async () => {
    try {
      await signOutUser();
      if (onLogout) onLogout();
    } catch {
      showToast("Không thể đăng xuất. Vui lòng thử lại.", "error");
    }
  };

  const allowedNavItems = NAV_ITEMS.filter(
    (item) =>
      item.allowedRoles.includes(currentUser.role) &&
      (variant === "desktop" || item.id === "teachers")
  );

  const displaySubtitle = currentUser.subject || currentUser.title;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 w-68 border-r border-slate-800 select-none pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)]">
      {/* Header Logo */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-500 text-slate-900 flex items-center justify-center font-black text-lg shadow-sm">
            TH
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-white">Quản lý học sinh</h1>
            <p className="text-xs text-teal-400 font-medium">Học tăng cường</p>
          </div>
        </div>
        {onCloseMobileDrawer && (
          <button
            onClick={onCloseMobileDrawer}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Đóng menu điều hướng"
          >
            ✕
          </button>
        )}
      </div>

      {/* Thông tin Người dùng */}
      <div className="p-4 mx-3 my-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-base shrink-0 shadow-xs">
          {getUserInitials(currentUser.fullName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-100 truncate">
              {currentUser.fullName}
            </span>
            <Badge
              variant={currentUser.role === "admin" ? "success" : "info"}
              className="text-[10px] px-1.5 py-0"
            >
              {currentUser.role === "admin" ? "ADMIN" : "GIÁO VIÊN"}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 truncate">{displaySubtitle}</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {allowedNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                if (onCloseMobileDrawer) onCloseMobileDrawer();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isActive
                  ? "bg-teal-600 text-white shadow-xs"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <NavIcon iconName={item.iconName} className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="text-xs text-slate-400 truncate px-1">
          {currentUser.email}
        </div>

        <SyncStatus />

        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors border border-slate-800 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12" />
          </svg>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

