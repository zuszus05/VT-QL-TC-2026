import { useState, useEffect, useRef, FormEvent } from "react";
import { Student } from "../../types/student";
import { GradeLevel, SchoolClass } from "../../types/academic";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { useToast } from "../../hooks/useToast";
import { isCandidateNumberDuplicate } from "../../utils/studentValidation";

export interface StudentFormData {
  studentId?: string;
  candidateNumber: number;
  fullName: string;
  grade: GradeLevel;
  classId: string;
  schoolName?: string;
  motherPhone?: string;
  fatherPhone?: string;
  note?: string;
}

export interface StudentFormModalProps {
  open: boolean;
  onClose: () => void;
  allStudents: Student[];
  allClasses: SchoolClass[];
  presetGrade?: GradeLevel;
  presetClassId?: string;
  student?: Student | null;
  onSave: (data: StudentFormData) => void;
}

export function StudentFormModal({
  open,
  onClose,
  allStudents,
  allClasses,
  presetGrade,
  presetClassId,
  student,
  onSave,
}: StudentFormModalProps) {
  const { showToast } = useToast();
  const sbdInputRef = useRef<HTMLInputElement>(null);

  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | "">("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [candidateNumber, setCandidateNumber] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [motherPhone, setMotherPhone] = useState<string>("");
  const [fatherPhone, setFatherPhone] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [errors, setErrors] = useState<{
    grade?: string;
    classId?: string;
    candidateNumber?: string;
    fullName?: string;
  }>({});

  const isEditMode = Boolean(student);
  const title = isEditMode ? "Sửa học sinh" : "Thêm học sinh";

  // When modal opens or editing student/presets change, fill/reset form
  useEffect(() => {
    if (open) {
      setErrors({});
      if (student) {
        setSelectedGrade(student.grade);
        setSelectedClassId(student.classId);
        setCandidateNumber(
          student.candidateNumber ? String(student.candidateNumber) : ""
        );
        setFullName(student.fullName || "");
        setSchoolName(student.schoolName || "");
        setMotherPhone(student.motherPhone || "");
        setFatherPhone(student.fatherPhone || "");
        setNote(student.note || "");
      } else if (presetGrade && presetClassId) {
        setSelectedGrade(presetGrade);
        setSelectedClassId(presetClassId);
        setCandidateNumber("");
        setFullName("");
        setSchoolName("");
        setMotherPhone("");
        setFatherPhone("");
        setNote("");
      } else {
        setSelectedGrade("");
        setSelectedClassId("");
        setCandidateNumber("");
        setFullName("");
        setSchoolName("");
        setMotherPhone("");
        setFatherPhone("");
        setNote("");
      }

      const timer = setTimeout(() => {
        sbdInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open, student, presetGrade, presetClassId]);

  const handleGradeChange = (newGradeStr: string) => {
    const newGrade = newGradeStr ? (Number(newGradeStr) as GradeLevel) : "";
    setSelectedGrade(newGrade);

    if (errors.grade) {
      setErrors((prev) => ({ ...prev, grade: undefined }));
    }

    if (newGrade && selectedClassId) {
      const isStillValid = allClasses.some(
        (c) => c.grade === newGrade && c.classId === selectedClassId
      );
      if (!isStillValid) {
        setSelectedClassId("");
      }
    } else if (!newGrade) {
      setSelectedClassId("");
    }
  };

  const availableClasses = selectedGrade
    ? [...allClasses]
        .filter((c) => c.grade === Number(selectedGrade))
        .sort((a, b) =>
          a.className.localeCompare(b.className, "vi", { numeric: true })
        )
    : [];

  const validate = (): boolean => {
    const newErrors: {
      grade?: string;
      classId?: string;
      candidateNumber?: string;
      fullName?: string;
    } = {};

    if (!selectedGrade) {
      newErrors.grade = "Vui lòng chọn khối.";
    }

    if (!selectedClassId) {
      newErrors.classId = "Vui lòng chọn lớp.";
    }

    const trimmedSbd = candidateNumber.trim();
    const parsedNumber = Number(trimmedSbd);

    if (!trimmedSbd) {
      newErrors.candidateNumber = "Số báo danh không được để trống.";
    } else if (
      isNaN(parsedNumber) ||
      !Number.isInteger(parsedNumber) ||
      parsedNumber < 1
    ) {
      newErrors.candidateNumber = "Số báo danh phải là số nguyên lớn hơn 0.";
    } else if (selectedGrade) {
      const isDuplicate = isCandidateNumberDuplicate(
        allStudents,
        Number(selectedGrade) as GradeLevel,
        parsedNumber,
        student?.studentId
      );

      if (isDuplicate) {
        newErrors.candidateNumber = `Số báo danh này đã tồn tại trong Khối ${selectedGrade}.`;
        showToast(
          `Số báo danh này đã tồn tại trong Khối ${selectedGrade}. Vui lòng chọn số khác.`,
          "error"
        );
      }
    }

    if (!fullName.trim()) {
      newErrors.fullName = "Họ và tên không được để trống.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const trimmedFullName = fullName.trim();
    const parsedCandidateNumber = Number(candidateNumber.trim());

    onSave({
      studentId: student?.studentId,
      candidateNumber: parsedCandidateNumber,
      fullName: trimmedFullName,
      grade: Number(selectedGrade) as GradeLevel,
      classId: selectedClassId,
      schoolName: schoolName.trim() || undefined,
      motherPhone: motherPhone.trim() || undefined,
      fatherPhone: fatherPhone.trim() || undefined,
      note: note.trim() || undefined,
    });

    showToast("Đã lưu học sinh.", "success");
    onClose();
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="student-form" variant="primary">
            Lưu
          </Button>
        </>
      }
    >
      <form id="student-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Khối & Lớp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Khối */}
          <div>
            <label
              htmlFor="student-grade-select"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Khối <span className="text-rose-500">*</span>
            </label>
            <select
              id="student-grade-select"
              value={selectedGrade}
              onChange={(e) => handleGradeChange(e.target.value)}
              className={`w-full px-3 py-2 text-sm rounded-lg border ${
                errors.grade
                  ? "bg-white text-slate-900 border-rose-500 focus:ring-rose-500"
                  : "bg-white text-slate-900 border-slate-300 focus:ring-teal-500 focus:border-teal-500"
              } focus:outline-none focus:ring-2 transition-colors`}
            >
              <option value="">-- Chọn khối --</option>
              <option value="6">Khối 6</option>
              <option value="7">Khối 7</option>
              <option value="8">Khối 8</option>
              <option value="9">Khối 9</option>
            </select>
            {errors.grade && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {errors.grade}
              </p>
            )}
          </div>

          {/* Lớp */}
          <div>
            <label
              htmlFor="student-class-select"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Lớp <span className="text-rose-500">*</span>
            </label>
            <select
              id="student-class-select"
              value={selectedClassId}
              disabled={!selectedGrade}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                if (errors.classId) {
                  setErrors((prev) => ({ ...prev, classId: undefined }));
                }
              }}
              className={`w-full px-3 py-2 text-sm rounded-lg border ${
                !selectedGrade
                  ? "bg-slate-100 text-slate-600 font-semibold border-slate-200 cursor-not-allowed"
                  : errors.classId
                  ? "bg-white text-slate-900 border-rose-500 focus:ring-rose-500"
                  : "bg-white text-slate-900 border-slate-300 focus:ring-teal-500 focus:border-teal-500"
              } focus:outline-none focus:ring-2 transition-colors`}
            >
              <option value="">
                {!selectedGrade ? "-- Chọn khối trước --" : "-- Chọn lớp --"}
              </option>
              {availableClasses.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.className}
                </option>
              ))}
            </select>
            {errors.classId && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {errors.classId}
              </p>
            )}
          </div>
        </div>

        {/* Số báo danh & Họ và tên */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Số báo danh */}
          <div>
            <label
              htmlFor="student-candidate-number"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Số báo danh <span className="text-rose-500">*</span>
            </label>
            <input
              ref={sbdInputRef}
              id="student-candidate-number"
              type="number"
              min={1}
              value={candidateNumber}
              onChange={(e) => {
                setCandidateNumber(e.target.value);
                if (errors.candidateNumber) {
                  setErrors((prev) => ({ ...prev, candidateNumber: undefined }));
                }
              }}
              placeholder="Ví dụ: 1"
              className={`w-full px-3 py-2 bg-white text-sm text-slate-900 rounded-lg border ${
                errors.candidateNumber
                  ? "border-rose-500 focus:ring-rose-500"
                  : "border-slate-300 focus:ring-teal-500 focus:border-teal-500"
              } focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.candidateNumber && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {errors.candidateNumber}
              </p>
            )}
          </div>

          {/* Họ và tên */}
          <div>
            <label
              htmlFor="student-full-name"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              id="student-full-name"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) {
                  setErrors((prev) => ({ ...prev, fullName: undefined }));
                }
              }}
              placeholder="Ví dụ: Nguyễn Văn An"
              className={`w-full px-3 py-2 bg-white text-sm text-slate-900 rounded-lg border ${
                errors.fullName
                  ? "border-rose-500 focus:ring-rose-500"
                  : "border-slate-300 focus:ring-teal-500 focus:border-teal-500"
              } focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {errors.fullName}
              </p>
            )}
          </div>
        </div>

        {/* Trường đang học */}
        <div>
          <label
            htmlFor="student-school-name"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Trường đang học
          </label>
          <input
            id="student-school-name"
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="Ví dụ: THCS Nguyễn Du"
            className="w-full px-3 py-2 bg-white text-sm text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Số điện thoại mẹ */}
          <div>
            <label
              htmlFor="student-mother-phone"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Số điện thoại mẹ
            </label>
            <input
              id="student-mother-phone"
              type="tel"
              value={motherPhone}
              onChange={(e) => setMotherPhone(e.target.value)}
              placeholder="Ví dụ: 0912345678"
              className="w-full px-3 py-2 bg-white text-sm text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Số điện thoại bố */}
          <div>
            <label
              htmlFor="student-father-phone"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Số điện thoại bố
            </label>
            <input
              id="student-father-phone"
              type="tel"
              value={fatherPhone}
              onChange={(e) => setFatherPhone(e.target.value)}
              placeholder="Ví dụ: 0987654321"
              className="w-full px-3 py-2 bg-white text-sm text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            />
          </div>
        </div>

        {/* Ghi chú */}
        <div>
          <label
            htmlFor="student-note"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Ghi chú
          </label>
          <textarea
            id="student-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập ghi chú nếu có"
            className="w-full px-3 py-2 bg-white text-sm text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}
