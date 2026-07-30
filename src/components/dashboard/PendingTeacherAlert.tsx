import { Button } from "../common/Button";

export interface PendingTeacherAlertProps {
  pendingCount: number;
  onNavigateTeachers: () => void;
}

export function PendingTeacherAlert({
  pendingCount,
  onNavigateTeachers,
}: PendingTeacherAlertProps) {
  if (pendingCount <= 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-2xs">
      <div className="flex items-start sm:items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold text-lg">
          !
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-900">
            Có {pendingCount} tài khoản giáo viên đang chờ duyệt!
          </h4>
          <p className="text-xs text-amber-800/90 leading-relaxed">
            Vui lòng kiểm tra danh sách tài khoản mới đăng ký để kích hoạt quyền truy cập hệ thống.
          </p>
        </div>
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={onNavigateTeachers}
        className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white self-start sm:self-auto shrink-0"
      >
        Duyệt tài khoản ngay →
      </Button>
    </div>
  );
}
