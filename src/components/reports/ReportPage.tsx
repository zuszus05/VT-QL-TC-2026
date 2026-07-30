import { useState } from "react";
import { TodayReportSection } from "./TodayReportSection";
import { MonthlyReportSection } from "./MonthlyReportSection";
import { AttendanceRecord } from "../../types/attendance";
import { ReinforcementScheduleRecord } from "../../types/extraStudy";
import { Student } from "../../types/student";
import { SchoolClass } from "../../types/academic";

interface ReportPageProps {
  attendanceRecords?: AttendanceRecord[];
  reportLoading?: boolean;
  reportError?: string | null;
  onAttendanceRecordsChange?: (records: AttendanceRecord[]) => void;
  onLoadDailyReport?: (date: string) => void;
  onLoadMonthlyReport?: (monthKey: string) => void;
  onUpdateMadeUpStatus?: (
    attendanceId: string,
    isMadeUp: boolean
  ) => Promise<void>;
  madeUpUpdatingIds?: Set<string>;
  madeUpError?: string | null;
  extraStudyRecords?: ReinforcementScheduleRecord[];
  students?: Student[];
  classes?: SchoolClass[];
}

export function ReportPage({
  attendanceRecords = [],
  reportLoading = false,
  reportError = null,
  onAttendanceRecordsChange,
  onLoadDailyReport,
  onLoadMonthlyReport,
  onUpdateMadeUpStatus,
  madeUpUpdatingIds,
  madeUpError = null,
  extraStudyRecords = [],
  students = [],
  classes = [],
}: ReportPageProps) {
  const [activeTab, setActiveTab] = useState<"today" | "monthly">("today");

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header trang */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Báo cáo</h1>
        <p className="text-sm text-slate-500 mt-1 hidden md:block">
          Xử lý tình trạng vắng, muộn và theo dõi báo cáo học tập tăng cường.
        </p>
      </div>

      {/* Tabs chuyển đổi */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors cursor-pointer ${
              activeTab === "today"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("monthly")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors cursor-pointer ${
              activeTab === "monthly"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Báo cáo tháng
          </button>
        </nav>
      </div>

      {/* Nội dung theo tab */}
      <div>
        {activeTab === "today" ? (
          <TodayReportSection
            attendanceRecords={attendanceRecords}
            reportLoading={reportLoading}
            reportError={reportError}
            onAttendanceRecordsChange={onAttendanceRecordsChange}
            onLoadDailyReport={onLoadDailyReport}
            extraStudyRecords={extraStudyRecords}
            students={students}
            classes={classes}
          />
        ) : (
          <MonthlyReportSection
            attendanceRecords={attendanceRecords}
            reportLoading={reportLoading}
            reportError={reportError}
            onAttendanceRecordsChange={onAttendanceRecordsChange}
            onLoadMonthlyReport={onLoadMonthlyReport}
            onUpdateMadeUpStatus={onUpdateMadeUpStatus}
            madeUpUpdatingIds={madeUpUpdatingIds}
            madeUpError={madeUpError}
            extraStudyRecords={extraStudyRecords}
            students={students}
            classes={classes}
          />
        )}
      </div>
    </div>
  );
}
