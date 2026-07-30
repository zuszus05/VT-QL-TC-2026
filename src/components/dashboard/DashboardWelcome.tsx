import { UserRole } from "../../types/user";

export interface DashboardWelcomeProps {
  fullName: string;
  role: UserRole;
  formattedDate: string;
  todayExtraCount?: number;
}

export function DashboardWelcome({
  fullName,
  role,
  formattedDate,
  todayExtraCount,
}: DashboardWelcomeProps) {
  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 md:p-8 shadow-sm border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1 md:space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex text-xs font-semibold uppercase tracking-wider text-teal-400 bg-teal-950/80 px-2.5 py-0.5 rounded-full border border-teal-800/60">
            {role === "admin" ? "Bảng điều khiển Quản trị" : "Bảng điều khiển Giáo viên"}
          </span>
          <span className="text-xs text-slate-400">• {formattedDate}</span>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
          Xin chào, {fullName}!
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          Tổng quan tình hình học sinh, số lượng theo khối lớp và lịch trình các ca học tăng cường trong ngày.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0 pt-1 md:pt-0">
        <div className="px-3.5 py-2 md:px-4 md:py-3 bg-slate-800/90 rounded-xl border border-slate-700 text-center">
          <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Hôm nay</p>
          <p className="text-base sm:text-lg font-bold text-teal-400">
            {todayExtraCount !== undefined ? `${todayExtraCount} Lượt tăng cường` : "Lịch học"}
          </p>
        </div>
      </div>
    </div>
  );
}
