import { Modal } from "../common/Modal";
import { Button } from "../common/Button";

interface AttendanceSaveModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  saving?: boolean;
  dateStr: string;
  dayName: string;
  shiftName: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
}

export function AttendanceSaveModal({
  open,
  onClose,
  onConfirm,
  saving = false,
  dateStr,
  dayName,
  shiftName,
  totalStudents,
  presentCount,
  absentCount,
  lateCount,
}: AttendanceSaveModalProps) {
  return (
    <Modal
      open={open}
      title="Xác nhận lưu điểm danh"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={saving}>
            {saving ? "Đang lưu..." : "Xác nhận lưu"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Thông tin ca học */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1.5">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-500">Thời gian:</span>
            <span className="font-bold text-slate-900">
              {dayName}, {dateStr}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-500">Ca học:</span>
            <span className="font-bold text-slate-900">{shiftName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-500">Sĩ số:</span>
            <span className="font-bold text-slate-900">{totalStudents} học sinh</span>
          </div>
        </div>

        {/* Thống kê điểm danh */}
        <div className="flex items-center justify-around p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 text-xs font-semibold">
          <div className="text-center">
            <div className="text-slate-500 text-[11px] mb-0.5">Có mặt</div>
            <div className="text-sm font-bold text-emerald-700">{presentCount}</div>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="text-center">
            <div className="text-slate-500 text-[11px] mb-0.5">Vắng</div>
            <div className="text-sm font-bold text-rose-700">{absentCount}</div>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="text-center">
            <div className="text-slate-500 text-[11px] mb-0.5">Muộn</div>
            <div className="text-sm font-bold text-amber-700">{lateCount}</div>
          </div>
        </div>

        <p className="text-sm text-slate-700 pt-1">
          Bạn có chắc muốn lưu kết quả điểm danh của ca này?
        </p>
      </div>
    </Modal>
  );
}
