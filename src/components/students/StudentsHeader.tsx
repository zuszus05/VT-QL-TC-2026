import { Button } from "../common/Button";

export interface StudentsHeaderProps {
  onAddStudent: () => void;
  onImportExcel: () => void;
  onAddClass: () => void;
  isImportDisabled?: boolean;
}

export function StudentsHeader({
  onAddStudent,
  onImportExcel,
  onAddClass,
  isImportDisabled = false,
}: StudentsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Học sinh &amp; Lớp
        </h1>
        <p className="text-sm text-slate-500 mt-1 hidden md:block">
          Quản lý danh sách lớp và hồ sơ học sinh theo từng khối.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          variant="primary"
          onClick={onAddStudent}
          className="min-h-[44px] px-4 font-semibold shadow-xs"
        >
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Thêm học sinh
        </Button>

        <Button
          variant="secondary"
          onClick={onImportExcel}
          disabled={isImportDisabled}
          title={isImportDisabled ? "Đang tải hoặc không thể nạp danh sách học sinh" : undefined}
          className={`min-h-[44px] px-4 font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-200/80 ${
            isImportDisabled ? "opacity-50 cursor-not-allowed pointer-events-auto" : ""
          }`}
        >
          <svg
            className="w-4 h-4 mr-1.5 text-teal-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Nhập Excel
        </Button>

        <Button
          variant="secondary"
          onClick={onAddClass}
          className="min-h-[44px] px-4 font-semibold"
        >
          <svg
            className="w-4 h-4 mr-1.5 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Thêm lớp
        </Button>
      </div>
    </div>
  );
}
