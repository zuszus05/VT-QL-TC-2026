import { useState, useEffect, useRef, FormEvent } from "react";
import { GradeLevel, SchoolClass } from "../../types/academic";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";

export interface ClassFormData {
  classId?: string;
  grade: GradeLevel;
  className: string;
}

export interface ClassFormModalProps {
  open: boolean;
  onClose: () => void;
  allClasses: SchoolClass[];
  schoolClass?: SchoolClass | null;
  onSave: (data: ClassFormData) => void;
}

export function ClassFormModal({
  open,
  onClose,
  allClasses,
  schoolClass,
  onSave,
}: ClassFormModalProps) {
  const classNameInputRef = useRef<HTMLInputElement>(null);

  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | "">("");
  const [className, setClassName] = useState<string>("");

  const [errors, setErrors] = useState<{
    grade?: string;
    className?: string;
  }>({});

  const isEditMode = Boolean(schoolClass);
  const title = isEditMode ? "Sửa lớp học" : "Thêm lớp học mới";

  useEffect(() => {
    if (open) {
      setErrors({});
      if (schoolClass) {
        setSelectedGrade(schoolClass.grade);
        setClassName(schoolClass.className);
      } else {
        setSelectedGrade("");
        setClassName("");
      }

      const timer = setTimeout(() => {
        classNameInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open, schoolClass]);

  const validate = (): boolean => {
    const newErrors: {
      grade?: string;
      className?: string;
    } = {};

    if (!selectedGrade) {
      newErrors.grade = "Vui lòng chọn khối.";
    }

    const trimmedName = className.trim().toUpperCase();

    if (!trimmedName) {
      newErrors.className = "Tên lớp không được để trống.";
    } else if (selectedGrade) {
      const gradeStr = String(selectedGrade);
      if (!trimmedName.startsWith(gradeStr)) {
        newErrors.className = `Tên lớp phải bắt đầu bằng số khối (${gradeStr}). Ví dụ: ${gradeStr}A`;
      } else {
        // Kiểm tra trùng tên lớp (không phân biệt hoa thường)
        const isDuplicate = allClasses.some((c) => {
          if (isEditMode && schoolClass && c.classId === schoolClass.classId) {
            return false;
          }
          return c.className.trim().toUpperCase() === trimmedName;
        });

        if (isDuplicate) {
          newErrors.className = `Lớp "${trimmedName}" đã tồn tại.`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const trimmedName = className.trim().toUpperCase();

    onSave({
      classId: schoolClass?.classId,
      grade: Number(selectedGrade) as GradeLevel,
      className: trimmedName,
    });

    onClose();
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" type="submit" form="class-form">
            {isEditMode ? "Lưu thay đổi" : "Thêm lớp"}
          </Button>
        </>
      }
    >
      <form id="class-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Khối */}
        <div>
          <label
            htmlFor="class-grade-select"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Khối <span className="text-rose-500">*</span>
          </label>
          <select
            id="class-grade-select"
            value={selectedGrade}
            disabled={isEditMode}
            onChange={(e) => {
              const val = e.target.value ? (Number(e.target.value) as GradeLevel) : "";
              setSelectedGrade(val);
              if (errors.grade) {
                setErrors((prev) => ({ ...prev, grade: undefined }));
              }
            }}
            className={`w-full px-3 py-2 text-sm rounded-lg border ${
              isEditMode
                ? "bg-slate-100 text-slate-600 font-semibold border-slate-200 cursor-not-allowed"
                : errors.grade
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

        {/* Tên lớp */}
        <div>
          <label
            htmlFor="class-name-input"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Tên lớp <span className="text-rose-500">*</span>
          </label>
          <input
            ref={classNameInputRef}
            id="class-name-input"
            type="text"
            value={className}
            onChange={(e) => {
              setClassName(e.target.value);
              if (errors.className) {
                setErrors((prev) => ({ ...prev, className: undefined }));
              }
            }}
            placeholder={
              selectedGrade ? `Ví dụ: ${selectedGrade}A, ${selectedGrade}B` : "Ví dụ: 6A, 7B"
            }
            className={`w-full px-3 py-2 bg-white text-sm text-slate-900 rounded-lg border ${
              errors.className
                ? "border-rose-500 focus:ring-rose-500"
                : "border-slate-300 focus:ring-teal-500 focus:border-teal-500"
            } focus:outline-none focus:ring-2 transition-colors uppercase`}
          />
          {errors.className && (
            <p className="mt-1 text-xs text-rose-600 font-medium">
              {errors.className}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
