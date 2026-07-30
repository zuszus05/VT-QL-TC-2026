import { AttendanceRecord } from "../../types/attendance";
import { Card } from "../common/Card";

export interface TodayAttendanceSummaryProps {
  records: AttendanceRecord[];
  loading?: boolean;
  error?: string | null;
  todayDateStr: string;
}

export function TodayAttendanceSummary({
  records,
  loading = false,
  error = null,
  todayDateStr,
}: TodayAttendanceSummaryProps) {
  const totalCount = records.length;
  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const lateCount = records.filter((r) => r.status === "late").length;

  return (
    <Card className="border-slate-200/90 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Điểm danh hôm nay</h3>
            <p className="text-xs text-slate-500">
              Thống kê lượt điểm danh ({todayDateStr})
            </p>
          </div>
          <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
            Hôm nay
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
            Đang tải dữ liệu điểm danh...
          </div>
        ) : error ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
            ⚠️ {error}
          </div>
        ) : totalCount === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 italic bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            Hôm nay chưa có lượt điểm danh nào.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500">Tổng lượt</span>
              <span className="text-xl font-extrabold text-slate-800 mt-1">
                {totalCount}
              </span>
            </div>

            <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex flex-col justify-between">
              <span className="text-xs font-semibold text-emerald-700">Có mặt</span>
              <span className="text-xl font-extrabold text-emerald-800 mt-1">
                {presentCount}
              </span>
            </div>

            <div className="p-3 bg-rose-50/80 border border-rose-200/80 rounded-xl flex flex-col justify-between">
              <span className="text-xs font-semibold text-rose-700">Vắng</span>
              <span className="text-xl font-extrabold text-rose-800 mt-1">
                {absentCount}
              </span>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex flex-col justify-between">
              <span className="text-xs font-semibold text-amber-700">Muộn</span>
              <span className="text-xl font-extrabold text-amber-800 mt-1">
                {lateCount}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
        <span>Ghi nhận từ danh sách điểm danh</span>
        <span className="text-emerald-700 font-medium">Theo ngày thực tế</span>
      </div>
    </Card>
  );
}
