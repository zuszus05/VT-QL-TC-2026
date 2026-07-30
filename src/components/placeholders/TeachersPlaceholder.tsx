import { Card } from "../common/Card";
import { Badge } from "../common/Badge";

export function TeachersPlaceholder() {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center my-6">
      <div className="h-16 w-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>
      <Badge variant="info" className="mb-3">
        Sẽ phát triển ở bước sau
      </Badge>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Quản lý Giáo viên (Admin)</h2>
      <p className="text-sm text-slate-500 max-w-md leading-relaxed">
        Khu vực xem danh sách tài khoản giáo viên chờ duyệt, kích hoạt duyệt tài khoản hoặc khóa tài khoản dành riêng cho Admin.
      </p>
    </Card>
  );
}
