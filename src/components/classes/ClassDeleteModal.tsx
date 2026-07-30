import { SchoolClass } from "../../types/academic";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";

export interface ClassDeleteModalProps {
  open: boolean;
  schoolClass: SchoolClass | null;
  onClose: () => void;
  onConfirmDelete: (classId: string) => void;
}

export function ClassDeleteModal({
  open,
  schoolClass,
  onClose,
  onConfirmDelete,
}: ClassDeleteModalProps) {
  if (!schoolClass) return null;

  const handleConfirm = () => {
    onConfirmDelete(schoolClass.classId);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Xóa lớp"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            Xóa lớp
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Class info box */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-slate-500">Tên lớp:</span>
            <span className="font-bold text-slate-900">{schoolClass.className}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-slate-500">Khối:</span>
            <span className="font-semibold text-slate-800">Khối {schoolClass.grade}</span>
          </div>
        </div>

        {/* Warning message */}
        <p className="text-slate-600 text-sm">
          Bạn có chắc chắn muốn xóa lớp <span className="font-semibold text-slate-900">{schoolClass.className}</span> khỏi dữ liệu mẫu?
        </p>
      </div>
    </Modal>
  );
}
