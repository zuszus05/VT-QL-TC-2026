import { SessionCountSummary, StudySessionFilter } from "../../types/dashboard";

export interface TodaySessionsProps {
  sessionCounts: SessionCountSummary;
  activeFilter: StudySessionFilter;
  onFilterChange: (filter: StudySessionFilter) => void;
}

export function TodaySessions({
  sessionCounts,
  activeFilter,
  onFilterChange,
}: TodaySessionsProps) {
  const totalToday = sessionCounts.morning + sessionCounts.afternoon + sessionCounts.evening;

  const filters: { id: StudySessionFilter; label: string; count: number }[] = [
    { id: "all", label: "Tất cả", count: totalToday },
    { id: "morning", label: "Ca sáng", count: sessionCounts.morning },
    { id: "afternoon", label: "Ca chiều", count: sessionCounts.afternoon },
    { id: "evening", label: "Ca tối", count: sessionCounts.evening },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 w-fit">
      {filters.map((item) => {
        const isActive = activeFilter === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onFilterChange(item.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              isActive
                ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <span>{item.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                isActive
                  ? "bg-teal-100 text-teal-800"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
