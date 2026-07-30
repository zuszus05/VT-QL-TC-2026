import { GradeLevel, SchoolClass } from "../../types/academic";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Card } from "../common/Card";

export interface ClassCardProps {
  schoolClass: SchoolClass;
  studentCount: number;
  onViewStudents: (grade: GradeLevel, classId: string) => void;
  onEditClass: (classId: string) => void;
  onDeleteClass: (classId: string) => void;
}

export function ClassCard({
  schoolClass,
  studentCount,
  onViewStudents,
  onEditClass,
  onDeleteClass,
}: ClassCardProps) {
  return (
    <Card className="flex flex-col justify-between border-slate-200/90 hover:border-teal-300 transition-all">
      <div>
        {/* Header card: Tên lớp & Trạng thái */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            {schoolClass.className}
          </h3>
          {schoolClass.isActive ? (
            <Badge variant="success">Đang hoạt động</Badge>
          ) : (
            <Badge variant="default">Tạm ngừng</Badge>
          )}
        </div>

        {/* Số lượng học sinh */}
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          <span className="font-medium text-slate-800">
            {studentCount} học sinh
          </span>
        </div>
      </div>

      {/* Nút hành động */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onViewStudents(schoolClass.grade, schoolClass.classId)}
          className="flex-1 font-semibold text-teal-700 hover:text-teal-800 hover:bg-teal-50 min-h-[38px]"
        >
          Xem học sinh
        </Button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEditClass(schoolClass.classId)}
            className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[38px] min-w-[38px] flex items-center justify-center"
            aria-label={`Sửa lớp ${schoolClass.className}`}
            title="Sửa lớp"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onDeleteClass(schoolClass.classId)}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 min-h-[38px] min-w-[38px] flex items-center justify-center"
            aria-label={`Xóa lớp ${schoolClass.className}`}
            title="Xóa lớp"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
        </div>
      </div>
    </Card>
  );
}
