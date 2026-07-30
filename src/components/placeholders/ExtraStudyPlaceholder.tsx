import { Card } from "../common/Card";
import { Badge } from "../common/Badge";

export function ExtraStudyPlaceholder() {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center my-6">
      <div className="h-16 w-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </div>
      <Badge variant="info" className="mb-3">
        Sẽ phát triển ở bước sau
      </Badge>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Danh sách Tăng cường</h2>
      <p className="text-sm text-slate-500 max-w-md leading-relaxed">
        Khu vực phân ca học sáng, chiều, tối theo ngày cho danh sách học sinh, lọc theo lớp và quản lý lịch sử xếp ca tăng cường.
      </p>
    </Card>
  );
}
