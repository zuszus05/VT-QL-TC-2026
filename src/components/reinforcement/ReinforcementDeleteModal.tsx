import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { ReinforcementScheduleRecord } from "../../types/extraStudy";

export interface ReinforcementDeleteModalProps {
  open: boolean;
  record: ReinforcementScheduleRecord | null;
  studentShortName: string;
  candidateNumber: number | string;
  className: string;
  subjectLabel: string;
  typeLabel: string;
  weekdayLabel: string;
  sessionLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function ReinforcementDeleteModal({
  open,
  record,
  studentShortName,
  candidateNumber,
  className,
  subjectLabel,
  typeLabel,
  weekdayLabel,
  sessionLabel,
  onClose,
  onConfirm,
  isDeleting = false,
}: ReinforcementDeleteModalProps) {
  if (!record) return null;

  return (
    <Modal
      open={open}
      title="Xác nhận xóa khỏi ca"
      onClose={isDeleting ? () => {} : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Hủy
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Đang xóa..." : "Xóa khỏi ca"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-slate-700 font-medium">
          Bạn có chắc muốn xóa học sinh này khỏi ca đã xếp?
        </p>

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
            <span className="text-slate-500">Thứ:</span>
            <span className="font-semibold text-slate-800">{weekdayLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Ca:</span>
            <span className="font-semibold text-slate-800">{sessionLabel}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
