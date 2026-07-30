import { GradeLevel, SchoolClass } from "../../types/academic";
import { GRADE_LEVELS } from "../../constants/academic";
import { getGradeLabel } from "../../utils/academic";

export interface StudentFiltersProps {
  selectedGrade: GradeLevel | "all";
  onGradeChange: (grade: GradeLevel | "all") => void;
  selectedClassId: string | "all";
  onClassChange: (classId: string | "all") => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  classes: SchoolClass[];
}

export function StudentFilters({
  selectedGrade,
  onGradeChange,
  selectedClassId,
  onClassChange,
  searchTerm,
  onSearchChange,
  classes,
}: StudentFiltersProps) {
  // Lọc danh sách lớp hiển thị trong dropdown theo Khối đã chọn
  const filteredClasses =
    selectedGrade === "all"
      ? classes
      : classes.filter((cls) => cls.grade === selectedGrade);

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 md:items-center">
      {/* Search Input */}
      <div className="relative flex-1">
        <label htmlFor="student-search-input" className="sr-only">
          Tìm kiếm học sinh
        </label>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>
        <input
          id="student-search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm theo họ tên hoặc số báo danh"
          className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Grade Filter */}
        <div className="sm:w-44">
          <label htmlFor="grade-filter-select" className="sr-only">
            Chọn khối học
          </label>
          <select
            id="grade-filter-select"
            value={selectedGrade}
            onChange={(e) => {
              const val = e.target.value;
              onGradeChange(val === "all" ? "all" : (Number(val) as GradeLevel));
            }}
            className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-800 font-medium rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors cursor-pointer"
            aria-label="Chọn khối học"
          >
            <option value="all">Tất cả khối</option>
            {GRADE_LEVELS.map((grade) => (
              <option key={grade} value={grade}>
                {getGradeLabel(grade)}
              </option>
            ))}
          </select>
        </div>

        {/* Class Filter */}
        <div className="sm:w-44">
          <label htmlFor="class-filter-select" className="sr-only">
            Chọn lớp học
          </label>
          <select
            id="class-filter-select"
            value={selectedClassId}
            onChange={(e) => onClassChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-800 font-medium rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors cursor-pointer"
            aria-label="Chọn lớp học"
          >
            <option value="all">Tất cả lớp</option>
            {filteredClasses.map((cls) => (
              <option key={cls.classId} value={cls.classId}>
                {cls.className}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
