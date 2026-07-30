import { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { AttendanceStatus } from "../../types/attendance";

interface NoteAttendanceModalProps {
  open: boolean;
  className: string;
  candidateNumber: number;
  studentShortName: string;
  status: AttendanceStatus;
  initialNote?: string;
  onClose: () => void;
  onConfirm: (note: string) => void;
}

export function NoteAttendanceModal({
  open,
  className,
  candidateNumber,
  studentShortName,
  status,
  initialNote = "",
  onClose,
  onConfirm,
}: NoteAttendanceModalProps) {
  const [noteText, setNoteText] = useState<string>("");

  useEffect(() => {
    if (open) {
      setNoteText(initialNote);
    }
  }, [open, initialNote]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(noteText.trim());
  };

  const getStatusLabel = () => {
    if (status === "absent") {
      return "Vắng";
    }
    if (status === "late") {
      return "Muộn";
    }
    return "Có mặt";
  };

  const getStatusBadgeClass = () => {
    if (status === "absent") {
      return "bg-rose-100 text-rose-800 border-rose-200";
    }
    if (status === "late") {
      return "bg-amber-100 text-amber-800 border-amber-200";
    }
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  };

  return (
    <Modal
      open={open}
      title="Ghi chú học sinh"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Lưu ghi chú
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Thông tin học sinh */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                {className}
              </span>
              <span className="text-slate-800 font-bold text-sm">
                {candidateNumber} — {studentShortName}
              </span>
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${getStatusBadgeClass()}`}
            >
              {getStatusLabel()}
            </span>
          </div>
        </div>

        {/* Textarea Ghi chú */}
        <div className="space-y-1.5">
          <label
            htmlFor="attendance-note"
            className="block text-xs font-semibold text-slate-700"
          >
            Ghi chú
          </label>
          <textarea
            id="attendance-note"
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Nhập ghi chú cho học sinh này (VD: Muộn 15p, xin về sớm...)"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </form>
    </Modal>
  );
}
