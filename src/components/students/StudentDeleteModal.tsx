import { Student } from "../../types/student";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";

export interface StudentDeleteModalProps {
  open: boolean;
  student: Student | null;
  classNameDisplay?: string;
  onClose: () => void;
  onConfirmDelete: (studentId: string) => void;
}

export function StudentDeleteModal({
  open,
  student,
  classNameDisplay,
  onClose,
  onConfirmDelete,
}: StudentDeleteModalProps) {
  if (!student) return null;

  const handleConfirm = () => {
    onConfirmDelete(student.studentId);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Xóa học sinh"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            Xóa học sinh
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Student info box */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-slate-500">Họ và tên:</span>
            <span className="font-semibold text-slate-900">{student.fullName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-slate-500">Số báo danh:</span>
            <span className="font-mono font-bold text-teal-700">{student.candidateNumber}</span>
          </div>
          {classNameDisplay && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-slate-500">Lớp hiện tại:</span>
              <span className="font-semibold text-slate-800">{classNameDisplay}</span>
            </div>
          )}
        </div>

        {/* Warning message */}
        <p className="text-slate-600 text-sm">
          Bạn có chắc muốn xóa học sinh này khỏi dữ liệu mẫu?
        </p>
      </div>
    </Modal>
  );
}
