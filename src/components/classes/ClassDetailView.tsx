import { useState } from "react";
import { SchoolClass, GradeLevel } from "../../types/academic";
import { Student } from "../../types/student";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { StudentTable } from "../students/StudentTable";
import { StudentCardList } from "../students/StudentCardList";
import { StudentFormModal, StudentFormData } from "../students/StudentFormModal";
import { StudentDeleteModal } from "../students/StudentDeleteModal";
import { filterAndSortStudents, StudentSortOption } from "../../utils/studentSorting";

export interface ClassDetailViewProps {
  schoolClass: SchoolClass;
  classStudents: Student[];
  allStudents: Student[];
  allClasses: SchoolClass[];
  onBack: () => void;
  onSaveStudent: (studentData: StudentFormData & { grade: GradeLevel; classId: string }) => void;
  onAddStudent?: () => void;
  onEditStudent?: (studentId: string) => void;
  onDeleteStudent: (studentId: string) => void;
}

export function ClassDetailView({
  schoolClass,
  classStudents,
  allStudents,
  allClasses,
  onBack,
  onSaveStudent,
  onDeleteStudent,
}: ClassDetailViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<StudentSortOption>("candidate-asc");

  // State cho Modal Thêm/Sửa học sinh
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // State cho Modal Xóa học sinh
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (studentId: string) => {
    const studentToEdit = classStudents.find((s) => s.studentId === studentId) || null;
    setEditingStudent(studentToEdit);
    setIsModalOpen(true);
  };

  const handleRequestDelete = (studentId: string) => {
    const studentToDelete = classStudents.find((s) => s.studentId === studentId) || null;
    setDeletingStudent(studentToDelete);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  const handleSaveStudent = (formData: StudentFormData) => {
    onSaveStudent(formData);
  };

  // Lọc và sắp xếp chỉ trong lớp này
  const filteredStudents = filterAndSortStudents(
    classStudents,
    schoolClass.grade,
    schoolClass.classId,
    searchTerm,
    sortOption
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Nút Quay lại */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-lg px-3 py-2 bg-slate-100 hover:bg-slate-200/80 min-h-[40px]"
          aria-label="Quay lại danh sách lớp"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Quay lại danh sách lớp
        </button>
      </div>

      {/* Header chi tiết lớp */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            LỚP {schoolClass.className}
          </h1>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-600 font-medium">
            <span>👥</span>
            <span className="text-teal-700 font-bold">{classStudents.length} học sinh</span>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenAddModal}
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
      </div>

      {/* Bộ lọc & Sắp xếp trong lớp */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <label htmlFor="class-detail-search-input" className="sr-only">
            Tìm kiếm học sinh trong lớp
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
            id="class-detail-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo họ tên hoặc số báo danh"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <label htmlFor="class-detail-sort-select" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Sắp xếp:
          </label>
          <select
            id="class-detail-sort-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as StudentSortOption)}
            className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-700 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors cursor-pointer"
            aria-label="Sắp xếp danh sách học sinh"
          >
            <option value="candidate-asc">SBD tăng dần</option>
            <option value="candidate-desc">SBD giảm dần</option>
            <option value="name-asc">Tên A–Z</option>
            <option value="name-desc">Tên Z–A</option>
          </select>
        </div>
      </div>

      {/* Bảng học sinh trong lớp */}
      {filteredStudents.length > 0 ? (
        <div>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <StudentTable
              students={filteredStudents}
              classes={allClasses}
              hideClassColumn
              onEditStudent={handleOpenEditModal}
              onDeleteStudent={handleRequestDelete}
            />
          </div>

          {/* Mobile Cards */}
          <div className="block md:hidden">
            <StudentCardList
              students={filteredStudents}
              classes={allClasses}
              hideClassColumn
              onEditStudent={handleOpenEditModal}
              onDeleteStudent={handleRequestDelete}
            />
          </div>
        </div>
      ) : (
        <EmptyState
          title="Không tìm thấy học sinh phù hợp."
          description="Thử thay đổi từ khóa tìm kiếm."
        />
      )}

      {/* Modal Thêm / Sửa Học Sinh */}
      <StudentFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        presetGrade={schoolClass.grade}
        presetClassId={schoolClass.classId}
        allClasses={allClasses}
        allStudents={allStudents}
        student={editingStudent}
        onSave={handleSaveStudent}
      />

      {/* Modal Xóa Học Sinh */}
      <StudentDeleteModal
        open={Boolean(deletingStudent)}
        student={deletingStudent}
        classNameDisplay={schoolClass.className}
        onClose={() => setDeletingStudent(null)}
        onConfirmDelete={(studentId) => {
          onDeleteStudent(studentId);
          setDeletingStudent(null);
        }}
      />
    </div>
  );
}
