import { Card } from "../common/Card";
import { Badge } from "../common/Badge";

export function ReportsPlaceholder() {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center my-6">
      <div className="h-16 w-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <Badge variant="info" className="mb-3">
        Sẽ phát triển ở bước sau
      </Badge>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Báo cáo & Thống kê</h2>
      <p className="text-sm text-slate-500 max-w-md leading-relaxed">
        Khu vực tổng hợp lượt vắng, muộn theo tháng, lọc theo lớp học và xuất dữ liệu báo cáo ra tệp Excel.
      </p>
    </Card>
  );
}
