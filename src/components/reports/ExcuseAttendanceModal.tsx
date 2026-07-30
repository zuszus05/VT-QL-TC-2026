import { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";

interface ExcuseAttendanceModalProps {
  open: boolean;
  className: string;
  candidateNumber: number;
  studentShortName: string;
  motherPhone?: string;
  fatherPhone?: string;
  note?: string;
  onClose: () => void;
  onConfirm: (excuseReason: string) => void;
}

export function ExcuseAttendanceModal({
  open,
  className,
  candidateNumber,
  studentShortName,
  motherPhone,
  fatherPhone,
  note,
  onClose,
  onConfirm,
}: ExcuseAttendanceModalProps) {
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Vui lòng nhập lý do phụ huynh xác nhận.");
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Modal
      open={open}
      title="Xác nhận học sinh Có phép"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Xác nhận Có phép
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Thông tin học sinh */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
              {className}
            </span>
            <span className="text-slate-800 font-bold text-sm">
              {candidateNumber} — {studentShortName}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-600 pt-1 border-t border-slate-200/80">
            <div>
              <span className="text-slate-500 font-medium">SĐT Mẹ:</span>{" "}
              <span className="font-semibold text-slate-800">
                {motherPhone || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">SĐT Bố:</span>{" "}
              <span className="font-semibold text-slate-800">
                {fatherPhone || "—"}
              </span>
            </div>
          </div>

          {note && note.trim() !== "" && (
            <div className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200/80 mt-1">
              <span className="font-semibold">Ghi chú điểm danh:</span> {note}
            </div>
          )}
        </div>

        {/* Input lý do phụ huynh xác nhận */}
        <div className="space-y-1.5">
          <label
            htmlFor="excuse-reason"
            className="block text-xs font-semibold text-slate-700"
          >
            Lý do phụ huynh xác nhận <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="excuse-reason"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            placeholder="Nhập lý do phụ huynh xin phép (VD: Ốm, bận việc gia đình...)"
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 ${
              error
                ? "border-rose-400 focus:ring-rose-500"
                : "border-slate-300 focus:ring-teal-500 focus:border-transparent"
            }`}
          />
          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        </div>
      </form>
    </Modal>
  );
}
