import { UserProfile } from "../../types/user";
import { AppTab } from "../../types/navigation";
import { NAV_ITEMS } from "../../config/navigation";
import { NavIcon } from "./NavIcon";

export interface MobileBottomNavigationProps {
  currentUser: UserProfile;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

const MOBILE_LABELS: Record<string, string> = {
  dashboard: "Tổng quan",
  students: "Học sinh",
  "extra-study": "Tăng cường",
  attendance: "Điểm danh",
  reports: "Báo cáo",
};

export function MobileBottomNavigation({
  currentUser,
  activeTab,
  onSelectTab,
}: MobileBottomNavigationProps) {
  // Filter out 'teachers' and filter by user role permissions
  const bottomNavItems = NAV_ITEMS.filter(
    (item) =>
      item.id !== "teachers" &&
      item.allowedRoles.includes(currentUser.role)
  );

  return (
    <nav
      aria-label="Điều hướng chính di động"
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200/90 shadow-lg md:hidden pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="flex items-center justify-around w-full px-1">
        {bottomNavItems.map((item) => {
          const isActive = activeTab === item.id;
          const label = MOBILE_LABELS[item.id] || item.label;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-label={`Mở ${label}`}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center min-h-[48px] py-1.5 px-1 transition-colors cursor-pointer text-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
                isActive
                  ? "text-teal-600 font-bold"
                  : "text-slate-500 hover:text-slate-700 font-medium"
              }`}
            >
              <NavIcon
                iconName={item.iconName}
                className={`w-5 h-5 mb-0.5 shrink-0 transition-transform ${
                  isActive ? "text-teal-600 scale-105" : "text-slate-500"
                }`}
              />
              <span className="text-[11px] leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
