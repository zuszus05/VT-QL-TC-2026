import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { TeacherProfile, TeacherStatus } from "../../types/teacher";

export interface ConfirmStatusModalProps {
  open: boolean;
  teacher: TeacherProfile | null;
  targetStatus: TeacherStatus | null;
  onClose: () => void;
  onConfirm: (uid: string, nextStatus: TeacherStatus) => Promise<void>;
}

export function ConfirmStatusModal({
  open,
  teacher,
  targetStatus,
  onClose,
  onConfirm,
}: ConfirmStatusModalProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!teacher || !targetStatus) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (isSubmitting || !teacher || !targetStatus) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onConfirm(teacher.uid, targetStatus);
      onClose();
    } catch (err: any) {
      console.error("[ConfirmStatusModal] Lỗi đổi trạng thái giáo viên:", err);
      setErrorMessage(
        err?.message || "Không thể thay đổi trạng thái. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisable = targetStatus === "disabled";
  const title = isDisable
    ? "Xác nhận vô hiệu hóa giáo viên"
    : "Xác nhận kích hoạt lại tài khoản";

  return (
    <Modal
      open={open}
      title={title}
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
            variant={isDisable ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="text-xs font-semibold min-w-[110px]"
          >
            {isSubmitting
              ? "Đang xử lý..."
              : isDisable
              ? "Vô hiệu hóa"
              : "Kích hoạt lại"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 py-1">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
            ⚠️ {errorMessage}
          </div>
        )}

        <p className="text-sm text-slate-700 font-medium">
          {isDisable ? (
            <>
              Bạn có chắc chắn muốn vô hiệu hóa tài khoản giáo viên{" "}
              <strong className="text-slate-900">
                {teacher.displayName || teacher.email}
              </strong>
              ?
            </>
          ) : (
            <>
              Xác nhận kích hoạt lại tài khoản giáo viên{" "}
              <strong className="text-slate-900">
                {teacher.displayName || teacher.email}
              </strong>
              ?
            </>
          )}
        </p>

        {isDisable && (
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-800 text-xs leading-relaxed">
            ⚠️ Giáo viên này sẽ không thể truy cập ứng dụng cho đến khi được kích hoạt lại.
          </div>
        )}
      </div>
    </Modal>
  );
}
