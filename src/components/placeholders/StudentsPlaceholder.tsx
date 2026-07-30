import { Card } from "../common/Card";
import { Badge } from "../common/Badge";

export function StudentsPlaceholder() {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center my-6">
      <div className="h-16 w-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      </div>
      <Badge variant="info" className="mb-3">
        Sẽ phát triển ở bước sau
      </Badge>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Học sinh & Lớp học</h2>
      <p className="text-sm text-slate-500 max-w-md leading-relaxed">
        Khu vực quản lý danh sách lớp, tạo mới, chỉnh sửa hồ sơ học sinh, tìm kiếm lọc theo lớp và hỗ trợ nhập / xuất file Excel CSV.
      </p>
    </Card>
  );
}
