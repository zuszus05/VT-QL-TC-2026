import { Card } from "../common/Card";
import { Badge } from "../common/Badge";

export function AttendancePlaceholder() {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center my-6">
      <div className="h-16 w-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <Badge variant="info" className="mb-3">
        Sẽ phát triển ở bước sau
      </Badge>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Điểm danh</h2>
      <p className="text-sm text-slate-500 max-w-md leading-relaxed">
        Khu vực điểm danh học sinh theo ngày và ca học với các trạng thái Có mặt, Vắng, Muộn cùng trường nhập ghi chú lý do.
      </p>
    </Card>
  );
}
