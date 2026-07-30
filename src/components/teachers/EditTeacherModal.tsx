import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { TeacherProfile } from "../../types/teacher";

export interface EditTeacherModalProps {
  open: boolean;
  teacher: TeacherProfile | null;
  onClose: () => void;
  onSubmit: (uid: string, newDisplayName: string) => Promise<void>;
}

export function EditTeacherModal({
  open,
  teacher,
  onClose,
  onSubmit,
}: EditTeacherModalProps) {
  const [displayName, setDisplayName] = useState<string>("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (teacher) {
      setDisplayName(teacher.displayName || "");
      setNameError(null);
      setGeneralError(null);
    }
  }, [teacher, open]);

  const handleClose = () => {
    if (isSubmitting) return;
    setNameError(null);
    setGeneralError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !teacher) return;

    setNameError(null);
    setGeneralError(null);

    const cleanName = displayName.trim();
    if (!cleanName) {
      setNameError("Họ và tên không được để trống.");
      return;
    }

    if (cleanName.length > 100) {
      setNameError("Họ và tên không được quá 100 ký tự.");
      return;
    }

    // Nếu không thay đổi tên, không gọi service / không tạo Firestore write
    if (cleanName === (teacher.displayName || "").trim()) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(teacher.uid, cleanName);
      onClose();
    } catch (err: any) {
      console.error("[EditTeacherModal] Lỗi cập nhật tên giáo viên:", err);
      setGeneralError(
        err?.message || "Không thể cập nhật tên giáo viên. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Đang hoạt động";
      case "disabled":
        return "Đã vô hiệu hóa";
      case "pending":
        return "Chờ duyệt";
      default:
        return status;
    }
  };

  return (
    <Modal
      open={open}
      title="Sửa thông tin giáo viên"
      onClose={handleClose}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-xs font-semibold"
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="text-xs font-semibold min-w-[110px]"
          >
            {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {generalError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
            ⚠️ {generalError}
          </div>
        )}

        {/* Họ và tên (Có thể sửa) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Họ và tên <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (nameError) setNameError(null);
            }}
            maxLength={100}
            placeholder="Nhập họ và tên giáo viên"
            disabled={isSubmitting}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              nameError
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300"
            } disabled:bg-slate-100 disabled:text-slate-500`}
          />
          {nameError && (
            <p className="mt-1 text-[11px] font-medium text-rose-600">
              {nameError}
            </p>
          )}
        </div>

        {/* Email (Chỉ đọc) */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Email (Chỉ đọc)
          </label>
          <input
            type="text"
            value={teacher?.email || ""}
            disabled
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 font-mono cursor-not-allowed"
          />
        </div>

        {/* Vai trò (Chỉ đọc) */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Vai trò (Chỉ đọc)
          </label>
          <input
            type="text"
            value={teacher?.role === "admin" ? "Quản trị viên" : "Giáo viên"}
            disabled
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 cursor-not-allowed"
          />
        </div>

        {/* Trạng thái (Chỉ đọc) */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Trạng thái hiện tại (Chỉ đọc)
          </label>
          <input
            type="text"
            value={getStatusLabel(teacher?.status || "")}
            disabled
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 cursor-not-allowed"
          />
        </div>
      </form>
    </Modal>
  );
}
