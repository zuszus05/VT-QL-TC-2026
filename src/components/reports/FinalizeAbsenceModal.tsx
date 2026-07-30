import { Modal } from "../common/Modal";
import { Button } from "../common/Button";

interface FinalizeAbsenceModalProps {
  open: boolean;
  formattedDate: string;
  absentTotal: number;
  lateCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function FinalizeAbsenceModal({
  open,
  formattedDate,
  absentTotal,
  lateCount,
  onClose,
  onConfirm,
}: FinalizeAbsenceModalProps) {
  return (
    <Modal
      open={open}
      title="Xác nhận chốt danh sách vắng"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Xác nhận chốt vắng
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-xs text-slate-700">
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <div className="font-bold text-sm text-slate-900">
            Ngày: {formattedDate}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
            <div className="bg-rose-50 border border-rose-200 p-2 rounded-lg text-center">
              <span className="block text-rose-600 font-semibold text-[11px]">
                Tổng Vắng
              </span>
              <span className="text-base font-extrabold text-rose-700">
                {absentTotal}
              </span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-center">
              <span className="block text-amber-600 font-semibold text-[11px]">
                Muộn
              </span>
              <span className="text-base font-extrabold text-amber-700">
                {lateCount}
              </span>
            </div>
          </div>
        </div>

        <p className="text-slate-600 leading-relaxed font-medium">
          Sau khi chốt, các học sinh đang Vắng sẽ được xác nhận là danh sách
          nghỉ của ngày này.
        </p>
      </div>
    </Modal>
  );
}
