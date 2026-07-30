import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { CreateTeacherParams } from "../../services/teacherService";

export interface AddTeacherModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (params: CreateTeacherParams) => Promise<void>;
}

export function AddTeacherModal({
  open,
  onClose,
  onSubmit,
}: AddTeacherModalProps) {
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const resetForm = () => {
    setDisplayName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFieldErrors({});
    setGeneralError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    const errors: {
      displayName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    const cleanName = displayName.trim();
    if (!cleanName) {
      errors.displayName = "Họ và tên không được để trống.";
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) {
      errors.email = "Email không được để trống.";
    } else if (!emailRegex.test(cleanEmail)) {
      errors.email = "Email không đúng định dạng.";
    }

    if (!password) {
      errors.password = "Mật khẩu không được để trống.";
    } else if (password.length < 6) {
      errors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Xác nhận mật khẩu không được để trống.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setGeneralError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: "teacher",
      });
      resetForm();
      onClose();
    } catch (err: any) {
      console.error("[AddTeacherModal] Lỗi khi tạo giáo viên:", err);
      setPassword("");
      setConfirmPassword("");
      setGeneralError(
        err?.message || "Không thể tạo tài khoản giáo viên. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Thêm giáo viên"
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
            {isSubmitting ? "Đang tạo..." : "Tạo giáo viên"}
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

        {/* Họ và tên */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Họ và tên <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (fieldErrors.displayName) {
                setFieldErrors((prev) => ({ ...prev, displayName: undefined }));
              }
            }}
            placeholder="Ví dụ: Nguyễn Văn A"
            disabled={isSubmitting}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              fieldErrors.displayName
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300"
            } disabled:bg-slate-100 disabled:text-slate-500`}
          />
          {fieldErrors.displayName && (
            <p className="mt-1 text-[11px] font-medium text-rose-600">
              {fieldErrors.displayName}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Email <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            placeholder="giaovien@school.edu.vn"
            disabled={isSubmitting}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              fieldErrors.email
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300"
            } disabled:bg-slate-100 disabled:text-slate-500`}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-[11px] font-medium text-rose-600">
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Mật khẩu */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Mật khẩu <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            placeholder="Tối thiểu 6 ký tự"
            disabled={isSubmitting}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              fieldErrors.password
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300"
            } disabled:bg-slate-100 disabled:text-slate-500`}
          />
          {fieldErrors.password && (
            <p className="mt-1 text-[11px] font-medium text-rose-600">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Xác nhận mật khẩu */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Xác nhận mật khẩu <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) {
                setFieldErrors((prev) => ({
                  ...prev,
                  confirmPassword: undefined,
                }));
              }
            }}
            placeholder="Nhập lại mật khẩu"
            disabled={isSubmitting}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              fieldErrors.confirmPassword
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300"
            } disabled:bg-slate-100 disabled:text-slate-500`}
          />
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-[11px] font-medium text-rose-600">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
