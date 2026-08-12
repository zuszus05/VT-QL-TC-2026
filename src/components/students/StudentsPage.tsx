import { useState, useRef, useMemo } from "react";
import { GradeLevel, SchoolClass } from "../../types/academic";
import { Student } from "../../types/student";
import { GRADE_LEVELS } from "../../constants/academic";
import { useToast } from "../../hooks/useToast";
import { createStableId } from "../../utils/id";
import { createClass, updateClass, deleteClass } from "../../services/classService";
import { createStudent, updateStudent, deleteStudent } from "../../services/studentService";
import { isCandidateNumberDuplicate } from "../../utils/studentValidation";
import { parseStudentExcelFile, ExcelFilePreviewData } from "../../utils/excelReader";
import { validateExcelImportData, ExcelValidationResult } from "../../utils/excelValidator";
import { StudentImportResult } from "../../services/studentImportService";
import { upsertById, upsertManyById, removeById } from "../../utils/stateHelpers";
import { filterAndSortStudents } from "../../utils/studentSorting";
import { StudentsHeader } from "./StudentsHeader";
import { StudentStats } from "./StudentStats";
import { StudentFilters } from "./StudentFilters";
import { StudentTable } from "./StudentTable";
import { StudentCardList } from "./StudentCardList";
import { StudentDeleteModal } from "./StudentDeleteModal";
import { ClassSection } from "../classes/ClassSection";
import { ClassDetailView } from "../classes/ClassDetailView";
import { ClassFormModal } from "../classes/ClassFormModal";
import { ClassDeleteModal } from "../classes/ClassDeleteModal";
import { StudentFormModal, StudentFormData } from "./StudentFormModal";
import { ExcelImportPreviewModal } from "./ExcelImportPreviewModal";
import { ExcelValidationModal } from "./ExcelValidationModal";
import { EmptyState } from "../common/EmptyState";
import { UserProfile } from "../../types/user";
import { Button } from "../common/Button";

interface StudentsPageProps {
  currentUser?: UserProfile | null;
  students?: Student[];
  studentsLoading?: boolean;
  studentsError?: string | null;
  classes?: SchoolClass[];
  classesLoading?: boolean;
  classesError?: string | null;
  onStudentsChange?: React.Dispatch<React.SetStateAction<Student[]>>;
  onClassesChange?: React.Dispatch<React.SetStateAction<SchoolClass[]>>;
  onReloadClasses?: () => Promise<void>;
  onReloadStudents?: () => Promise<void>;
}

export function StudentsPage({
  currentUser,
  students = [],
  studentsLoading = false,
  studentsError = null,
  classes = [],
  classesLoading = false,
  classesError = null,
  onStudentsChange,
  onClassesChange,
  onReloadClasses,
  onReloadStudents,
}: StudentsPageProps) {
  const { showToast } = useToast();

  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | "all">("all");
  const [selectedClassId, setSelectedClassId] = useState<string | "all">("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeDetailClassId, setActiveDetailClassId] = useState<string | null>(null);

  // Modals state
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [isClassFormOpen, setIsClassFormOpen] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [deletingClass, setDeletingClass] = useState<SchoolClass | null>(null);

  // Excel Import preview & validation state
  const [excelPreviewData, setExcelPreviewData] = useState<ExcelFilePreviewData | null>(null);
  const [isExcelPreviewOpen, setIsExcelPreviewOpen] = useState<boolean>(false);
  const [excelValidationResult, setExcelValidationResult] = useState<ExcelValidationResult | null>(null);
  const [isExcelValidationOpen, setIsExcelValidationOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerImportExcel = () => {
    if (studentsLoading) {
      showToast("Danh sách học sinh đang được tải. Vui lòng chờ tải hoàn tất.", "info");
      return;
    }
    if (studentsError) {
      showToast("Không thể nạp danh sách học sinh. Vui lòng tải lại trang trước khi nhập Excel.", "error");
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const previewData = await parseStudentExcelFile(file);
      setExcelPreviewData(previewData);
      setIsExcelPreviewOpen(true);
    } catch (err) {
      console.error("[StudentsPage] Lỗi đọc tệp Excel:", err);
      showToast("Không thể đọc tệp tin Excel. Vui lòng kiểm tra định dạng tệp (.xlsx, .xls).", "error");
    }
  };

  const handleContinueToValidation = () => {
    if (!excelPreviewData) return;
    const result = validateExcelImportData(excelPreviewData, classes, students);
    setExcelValidationResult(result);
    setIsExcelPreviewOpen(false);
    setIsExcelValidationOpen(true);
  };

  const handleBackToPreview = () => {
    setIsExcelValidationOpen(false);
    setIsExcelPreviewOpen(true);
  };

  const handleCloseImportModals = () => {
    setIsExcelPreviewOpen(false);
    setIsExcelValidationOpen(false);
    setExcelPreviewData(null);
    setExcelValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImportSuccess = (result: StudentImportResult) => {
    // Cập nhật local state học sinh bằng functional updater
    if (result.processedStudents && result.processedStudents.length > 0 && onStudentsChange) {
      onStudentsChange((prev) =>
        upsertManyById(prev, result.processedStudents!, (s) => s.studentId)
      );
    }

    // THÔNG BÁO: Hiển thị kết quả nhập
    let toastMsg = "";
    if (result.classSummaries && result.classSummaries.length > 0) {
      toastMsg = result.classSummaries
        .map(
          (cs) =>
            `${cs.className || cs.classId} — thêm ${cs.importedCount}, cập nhật ${cs.updatedCount}, bỏ qua ${cs.skippedCount}, lỗi ${cs.failedCount}`
        )
        .join(" | ");
    } else {
      toastMsg = `Đã thêm ${result.importedCount}, cập nhật ${result.updatedCount}, bỏ qua ${result.skippedCount}, lỗi ${result.failedCount}`;
    }

    showToast(
      toastMsg,
      result.importedCount > 0 || result.updatedCount > 0 ? "success" : "info"
    );

    // ĐÓNG MODAL & RESET dữ liệu import tạm
    handleCloseImportModals();
  };

  // Tự động điều chỉnh selectedClassId về "all" nếu đổi khối làm lớp hiện tại không hợp lệ
  const handleGradeChange = (newGrade: GradeLevel | "all") => {
    setSelectedGrade(newGrade);

    if (newGrade !== "all" && selectedClassId !== "all") {
      const currentClass = classes.find((c) => c.classId === selectedClassId);
      if (!currentClass || currentClass.grade !== newGrade) {
        setSelectedClassId("all");
      }
    }
  };

  const handleSaveStudent = async (studentData: StudentFormData) => {
    // 1. Kiểm tra lớp được chọn tồn tại trong classes
    const targetClass = classes.find((c) => c.classId === studentData.classId);
    if (!targetClass) {
      showToast("Lớp học được chọn không tồn tại.", "error");
      return;
    }

    // Tự động lấy grade từ lớp được chọn
    const grade = targetClass.grade;

    // 2. Kiểm tra SBD là số nguyên dương
    if (!Number.isInteger(studentData.candidateNumber) || studentData.candidateNumber < 1) {
      showToast("Số báo danh phải là số nguyên lớn hơn 0.", "error");
      return;
    }

    // 3. Kiểm tra trùng SBD trong cùng khối trên toàn bộ danh sách học sinh
    const isDuplicate = isCandidateNumberDuplicate(
      students,
      grade,
      studentData.candidateNumber,
      studentData.studentId
    );

    if (isDuplicate) {
      showToast(`Số báo danh ${studentData.candidateNumber} đã tồn tại trong Khối ${grade}.`, "error");
      return;
    }

    try {
      if (studentData.studentId) {
        // Sửa học sinh
        await updateStudent(studentData.studentId, {
          candidateNumber: studentData.candidateNumber,
          fullName: studentData.fullName,
          schoolName: studentData.schoolName,
          motherPhone: studentData.motherPhone,
          fatherPhone: studentData.fatherPhone,
          classId: studentData.classId,
          grade: grade,
          note: studentData.note,
        });
        showToast("Đã cập nhật học sinh.", "success");
        if (onStudentsChange) {
          onStudentsChange((prev) => {
            const existing = prev.find((s) => s.studentId === studentData.studentId);
            if (!existing) return prev;
            const updated: Student = {
              ...existing,
              candidateNumber: studentData.candidateNumber,
              fullName: studentData.fullName.trim(),
              schoolName: studentData.schoolName?.trim() || undefined,
              motherPhone: studentData.motherPhone?.trim() || undefined,
              fatherPhone: studentData.fatherPhone?.trim() || undefined,
              classId: studentData.classId,
              grade,
              note: studentData.note?.trim() || undefined,
              updatedAt: new Date().toISOString(),
            };
            return upsertById(prev, updated, (s) => s.studentId);
          });
        }
      } else {
        // Thêm học sinh
        const createdStudent = await createStudent({
          candidateNumber: studentData.candidateNumber,
          fullName: studentData.fullName,
          schoolName: studentData.schoolName,
          motherPhone: studentData.motherPhone,
          fatherPhone: studentData.fatherPhone,
          classId: studentData.classId,
          grade: grade,
          note: studentData.note,
        });
        showToast("Đã thêm học sinh.", "success");
        if (onStudentsChange) {
          onStudentsChange((prev) => upsertById(prev, createdStudent, (s) => s.studentId));
        }
      }
    } catch (err) {
      console.error("[StudentsPage] Save student error:", err);
      showToast("Không thể lưu thông tin học sinh. Vui lòng thử lại.", "error");
    }
  };

  const handleAddStudent = () => {
    setEditingStudent(null);
    setIsAddStudentModalOpen(true);
  };

  const handleEditStudentFromSearch = (studentId: string) => {
    const st = students.find((s) => s.studentId === studentId);
    if (st) {
      setEditingStudent(st);
      setIsAddStudentModalOpen(true);
    }
  };

  const handleDeleteStudentFromSearch = (studentId: string) => {
    const st = students.find((s) => s.studentId === studentId);
    if (st) {
      setDeletingStudent(st);
    }
  };

  const handleAddClass = () => {
    setEditingClass(null);
    setIsClassFormOpen(true);
  };

  const handleEditClass = (classId: string) => {
    const cls = classes.find((c) => c.classId === classId);
    if (cls) {
      setEditingClass(cls);
      setIsClassFormOpen(true);
    }
  };

  const handleSaveClass = async (data: { classId?: string; grade: GradeLevel; className: string }) => {
    const trimmedName = data.className.trim().toUpperCase();

    // Kiểm tra trùng tên lớp (không phân biệt hoa thường và khoảng trắng thừa)
    const isDuplicate = classes.some((c) => {
      if (data.classId && c.classId === data.classId) return false;
      return c.className.trim().toUpperCase() === trimmedName;
    });

    if (isDuplicate) {
      showToast(`Không thể lưu. Lớp "${trimmedName}" đã tồn tại.`, "error");
      return;
    }

    try {
      if (data.classId) {
        // Sửa lớp: Cập nhật className, grade, status, updatedAt
        await updateClass(data.classId, {
          className: trimmedName,
          grade: data.grade,
        });
        showToast("Đã cập nhật lớp.", "success");
        if (onClassesChange) {
          onClassesChange((prev) => {
            const existing = prev.find((c) => c.classId === data.classId);
            if (!existing) return prev;
            const updated: SchoolClass = {
              ...existing,
              className: trimmedName,
              grade: data.grade,
              updatedAt: new Date().toISOString(),
            };
            return upsertById(prev, updated, (c) => c.classId);
          });
        }
      } else {
        // Thêm lớp mới
        const createdCls = await createClass({
          grade: data.grade,
          className: trimmedName,
        });
        showToast("Đã thêm lớp.", "success");
        if (onClassesChange) {
          onClassesChange((prev) => upsertById(prev, createdCls, (c) => c.classId));
        }
      }
    } catch (err) {
      console.error("[StudentsPage] Save class error:", err);
      showToast("Không thể lưu lớp học. Vui lòng thử lại.", "error");
    }
  };

  const handleDeleteClass = (classId: string) => {
    const cls = classes.find((c) => c.classId === classId);
    if (!cls) return;

    const studentCount = students.filter((s) => s.classId === classId).length;

    if (studentCount > 0) {
      showToast("Không thể xóa lớp đang có học sinh.", "warning");
      return;
    }

    setDeletingClass(cls);
  };

  const handleConfirmDeleteClass = async (classId: string) => {
    const studentCount = students.filter((s) => s.classId === classId).length;

    if (studentCount > 0) {
      showToast("Không thể xóa lớp đang có học sinh.", "warning");
      setDeletingClass(null);
      return;
    }

    try {
      await deleteClass(classId);
      showToast("Đã xóa lớp.", "success");
      setDeletingClass(null);
      if (onClassesChange) {
        onClassesChange((prev) => removeById(prev, classId, (c) => c.classId));
      }
    } catch (err) {
      console.error("[StudentsPage] Delete class error:", err);
      showToast("Không thể xóa lớp học. Vui lòng thử lại.", "error");
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteStudent(studentId);
      showToast("Đã xóa học sinh.", "success");
      if (onStudentsChange) {
        onStudentsChange((prev) => removeById(prev, studentId, (s) => s.studentId));
      }
    } catch (err) {
      console.error("[StudentsPage] Delete student error:", err);
      showToast("Không thể xóa học sinh. Vui lòng thử lại.", "error");
    }
  };

  const handleViewStudents = (_grade: GradeLevel, classId: string) => {
    setActiveDetailClassId(classId);
  };

  // Nếu đang ở chế độ Chi tiết lớp
  if (activeDetailClassId) {
    const activeClass = classes.find((c) => c.classId === activeDetailClassId);

    if (activeClass) {
      const classStudents = students.filter(
        (s) => s.classId === activeDetailClassId
      );

      return (
        <ClassDetailView
          schoolClass={activeClass}
          classStudents={classStudents}
          allStudents={students}
          allClasses={classes}
          onBack={() => setActiveDetailClassId(null)}
          onSaveStudent={handleSaveStudent}
          onDeleteStudent={handleDeleteStudent}
        />
      );
    }
  }

  // Chế độ Danh sách lớp bình thường
  const isSearchActive = searchTerm.trim() !== "";

  const filteredStudents = useMemo(() => {
    if (!isSearchActive) return [];
    return filterAndSortStudents(
      students,
      selectedGrade,
      selectedClassId,
      searchTerm,
      "candidate-asc",
      classes
    );
  }, [students, selectedGrade, selectedClassId, searchTerm, isSearchActive, classes]);

  const matchedClassGroups = useMemo(() => {
    if (!isSearchActive || filteredStudents.length === 0) return [];

    const groupsMap = new Map<string, { cls?: SchoolClass; students: Student[] }>();

    for (const student of filteredStudents) {
      const classId = student.classId || "unknown";
      if (!groupsMap.has(classId)) {
        const cls = classes.find((c) => c.classId === classId);
        groupsMap.set(classId, { cls, students: [] });
      }
      groupsMap.get(classId)!.students.push(student);
    }

    const groupList = Array.from(groupsMap.values());

    groupList.sort((a, b) => {
      const gradeA = a.cls?.grade ?? 999;
      const gradeB = b.cls?.grade ?? 999;
      if (gradeA !== gradeB) return gradeA - gradeB;
      const nameA = a.cls?.className || "";
      const nameB = b.cls?.className || "";
      return nameA.localeCompare(nameB, "vi", { numeric: true });
    });

    return groupList;
  }, [isSearchActive, filteredStudents, classes]);

  const gradesToDisplay: GradeLevel[] =
    selectedGrade === "all" ? [...GRADE_LEVELS] : [selectedGrade];

  const hasMatchingClasses = gradesToDisplay.some((grade) => {
    const classesInGrade = classes.filter((c) => c.grade === grade);
    if (selectedClassId === "all") {
      return classesInGrade.length > 0;
    }
    return classesInGrade.some((c) => c.classId === selectedClassId);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Input chọn file Excel ẩn */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header trang */}
      <StudentsHeader
        onAddStudent={handleAddStudent}
        onImportExcel={handleTriggerImportExcel}
        onAddClass={handleAddClass}
        isImportDisabled={studentsLoading || Boolean(studentsError)}
      />

      {/* Thông báo lỗi / trạng thái tải danh sách học sinh */}
      {studentsError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
          <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{studentsError}</span>
        </div>
      )}

      {studentsLoading && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Đang tải danh sách học sinh từ Firestore...</span>
        </div>
      )}

      {/* Thống kê nhanh - Ẩn đối với Teacher */}
      {currentUser?.role !== "teacher" && (
        <StudentStats
          totalStudents={students.length}
          totalClasses={classes.length}
          selectedGrade={selectedGrade}
          selectedClassId={selectedClassId}
          classes={classes}
        />
      )}

      {/* Bộ lọc */}
      <StudentFilters
        selectedGrade={selectedGrade}
        onGradeChange={handleGradeChange}
        selectedClassId={selectedClassId}
        onClassChange={setSelectedClassId}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        classes={classes}
      />

      {/* Khu vực Danh sách lớp */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {isSearchActive ? "Kết quả tìm kiếm" : "Danh sách lớp"}
          </h2>
        </div>

        {classesLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 flex items-center justify-center gap-2 text-sm">
            <svg
              className="animate-spin h-5 w-5 text-teal-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Đang tải danh sách lớp học từ Firestore...</span>
          </div>
        ) : classesError ? (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <EmptyState
              title="Không thể tải danh sách lớp học."
              description="Vui lòng kiểm tra kết nối và quyền truy cập Firestore."
            />
          </div>
        ) : isSearchActive ? (
          filteredStudents.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center">
              <EmptyState
                title="Không tìm thấy học sinh phù hợp."
                description="Thử thay đổi từ khóa tìm kiếm hoặc kiểm tra lại bộ lọc."
              />
            </div>
          ) : (
            <div className="space-y-6">
              {matchedClassGroups.map(({ cls, students: classMatchedStudents }) => {
                const classId = cls?.classId || "unknown";
                const classNameDisplay = cls
                  ? cls.className.startsWith("Lớp")
                    ? cls.className
                    : `Lớp ${cls.className}`
                  : "Chưa xác định lớp";

                return (
                  <div
                    key={classId}
                    className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">
                          {classNameDisplay}
                        </h3>
                        <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                          {classMatchedStudents.length} học sinh phù hợp
                        </span>
                      </div>
                      {cls && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewStudents(cls.grade, cls.classId)}
                          className="text-xs font-semibold text-teal-700 hover:bg-teal-50 min-h-[36px]"
                        >
                          Xem toàn bộ lớp
                        </Button>
                      )}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <StudentTable
                        students={classMatchedStudents}
                        classes={classes}
                        hideClassColumn
                        onEditStudent={handleEditStudentFromSearch}
                        onDeleteStudent={handleDeleteStudentFromSearch}
                      />
                    </div>

                    {/* Mobile Cards */}
                    <div className="block md:hidden">
                      <StudentCardList
                        students={classMatchedStudents}
                        classes={classes}
                        hideClassColumn
                        onEditStudent={handleEditStudentFromSearch}
                        onDeleteStudent={handleDeleteStudentFromSearch}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <EmptyState
              title="Chưa có lớp học."
              description="Hệ thống chưa có lớp học nào. Bạn có thể thêm lớp học mới để bắt đầu."
              action={
                <Button variant="primary" size="sm" onClick={handleAddClass}>
                  + Thêm lớp
                </Button>
              }
            />
          </div>
        ) : hasMatchingClasses ? (
          <div className="space-y-8">
            {gradesToDisplay.map((grade) => {
              let classesInGrade = classes.filter((c) => c.grade === grade);
              if (selectedClassId !== "all") {
                classesInGrade = classesInGrade.filter(
                  (c) => c.classId === selectedClassId
                );
              }

              if (classesInGrade.length === 0) {
                return null;
              }

              return (
                <ClassSection
                  key={grade}
                  grade={grade}
                  classes={classesInGrade}
                  students={students}
                  onViewStudents={handleViewStudents}
                  onEditClass={handleEditClass}
                  onDeleteClass={handleDeleteClass}
                />
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center text-slate-500">
            Không tìm thấy lớp học phù hợp với bộ lọc đã chọn.
          </div>
        )}
      </div>

      {/* Modal Thêm/Sửa Lớp */}
      <ClassFormModal
        open={isClassFormOpen}
        onClose={() => {
          setIsClassFormOpen(false);
          setEditingClass(null);
        }}
        allClasses={classes}
        schoolClass={editingClass}
        onSave={handleSaveClass}
      />

      {/* Modal Xóa Lớp */}
      <ClassDeleteModal
        open={Boolean(deletingClass)}
        schoolClass={deletingClass}
        onClose={() => setDeletingClass(null)}
        onConfirmDelete={handleConfirmDeleteClass}
      />

      {/* Modal Thêm/Sửa học sinh */}
      <StudentFormModal
        open={isAddStudentModalOpen}
        onClose={() => {
          setIsAddStudentModalOpen(false);
          setEditingStudent(null);
        }}
        allStudents={students}
        allClasses={classes}
        student={editingStudent}
        onSave={(data) => {
          handleSaveStudent(data);
          setEditingStudent(null);
          setIsAddStudentModalOpen(false);
        }}
      />

      {/* Modal Xóa Học Sinh */}
      <StudentDeleteModal
        open={Boolean(deletingStudent)}
        student={deletingStudent}
        classNameDisplay={
          deletingStudent
            ? classes.find((c) => c.classId === deletingStudent.classId)?.className
            : undefined
        }
        onClose={() => setDeletingStudent(null)}
        onConfirmDelete={async (studentId) => {
          await handleDeleteStudent(studentId);
          setDeletingStudent(null);
        }}
      />

      {/* Modal Xem trước dữ liệu tệp Excel */}
      <ExcelImportPreviewModal
        open={isExcelPreviewOpen}
        data={excelPreviewData}
        onClose={handleCloseImportModals}
        onContinueImport={handleContinueToValidation}
      />

      {/* Modal Kiểm tra dữ liệu Excel */}
      <ExcelValidationModal
        open={isExcelValidationOpen}
        validationResult={excelValidationResult}
        existingStudents={students}
        studentsLoading={studentsLoading}
        studentsError={studentsError}
        onClose={handleCloseImportModals}
        onBackToPreview={handleBackToPreview}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
