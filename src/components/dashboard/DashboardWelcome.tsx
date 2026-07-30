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
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 bg-teal-950/80 px-2.5 py-0.5 rounded-full border border-teal-800/60">
            {role === "admin" ? "Bảng điều khiển Quản trị" : "Bảng điều khiển Giáo viên"}
          </span>
          <span className="text-xs text-slate-400">• {formattedDate}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Xin chào, {fullName}!
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          Tổng quan tình hình học sinh, số lượng theo khối lớp và lịch trình các ca học tăng cường trong ngày.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0">
        <div className="px-4 py-3 bg-slate-800/90 rounded-xl border border-slate-700 text-center">
          <p className="text-xs text-slate-400 font-medium">Hôm nay</p>
          <p className="text-lg font-bold text-teal-400">
            {todayExtraCount !== undefined ? `${todayExtraCount} Lượt tăng cường` : "Lịch học"}
          </p>
        </div>
      </div>
    </div>
  );
}
