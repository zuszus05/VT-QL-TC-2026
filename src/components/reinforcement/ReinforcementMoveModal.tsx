import { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { ReinforcementScheduleRecord } from "../../types/extraStudy";

const DAYS_OF_WEEK = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
];

const SHIFTS = ["Ca sáng", "Ca chiều", "Ca tối"];

export interface ReinforcementMoveModalProps {
  open: boolean;
  record: ReinforcementScheduleRecord | null;
  studentShortName: string;
  candidateNumber: number | string;
  className: string;
  subjectLabel: string;
  typeLabel: string;
  currentWeekdayLabel: string;
  currentSessionLabel: string;
  onClose: () => void;
  onConfirm: (newDayOfWeek: string, newShift: string) => void;
  isMoving?: boolean;
}

export function ReinforcementMoveModal({
  open,
  record,
  studentShortName,
  candidateNumber,
  className,
  subjectLabel,
  typeLabel,
  currentWeekdayLabel,
  currentSessionLabel,
  onClose,
  onConfirm,
  isMoving = false,
}: ReinforcementMoveModalProps) {
  const [newDayOfWeek, setNewDayOfWeek] = useState<string>(
    currentWeekdayLabel || "Thứ 2"
  );
  const [newShift, setNewShift] = useState<string>(
    currentSessionLabel || "Ca sáng"
  );

  useEffect(() => {
    if (open && record) {
      setNewDayOfWeek(currentWeekdayLabel);
      setNewShift(currentSessionLabel);
    }
  }, [open, record, currentWeekdayLabel, currentSessionLabel]);

  if (!record) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isMoving) return;
    onConfirm(newDayOfWeek, newShift);
  };

  return (
    <Modal
      open={open}
      title="Chuyển ca tăng cường"
      onClose={isMoving ? () => {} : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isMoving}>
            Hủy
          </Button>
          <Button variant="primary" onClick={() => handleSubmit()} disabled={isMoving}>
            {isMoving ? "Đang chuyển..." : "Xác nhận chuyển"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Thông tin hiện tại */}
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-1.5 text-slate-700">
          <div className="flex justify-between">
            <span className="text-slate-500">Tên ngắn:</span>
            <span className="font-bold text-slate-900">{studentShortName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">SBD:</span>
            <span className="font-bold text-slate-900">{candidateNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Lớp:</span>
            <span className="font-semibold text-slate-800">{className}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Môn:</span>
            <span className="font-semibold text-slate-800">{subjectLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Loại hình:</span>
            <span className="font-semibold text-slate-800">{typeLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Lịch hiện tại:</span>
            <span className="font-semibold text-slate-800">
              {currentWeekdayLabel}, {currentSessionLabel}
            </span>
          </div>
        </div>

        {/* Form chọn lịch mới */}
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <div>
            <label
              htmlFor="move-day-select"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Thứ mới
            </label>
            <select
              id="move-day-select"
              value={newDayOfWeek}
              onChange={(e) => setNewDayOfWeek(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="move-shift-select"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Ca mới
            </label>
            <select
              id="move-shift-select"
              value={newShift}
              onChange={(e) => setNewShift(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              {SHIFTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
