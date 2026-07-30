import { TeacherProfile, TeacherStatus } from "../../types/teacher";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";

interface TeacherListProps {
  teachers: TeacherProfile[];
  onEditTeacher?: (teacher: TeacherProfile) => void;
  onStatusChangeRequest?: (teacher: TeacherProfile, targetStatus: TeacherStatus) => void;
  updatingUids?: Set<string>;
  updatingUid?: string | null;
}

function formatDate(isoString: string): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function TeacherList({
  teachers,
  onEditTeacher,
  onStatusChangeRequest,
  updatingUids,
  updatingUid,
}: TeacherListProps) {
  const isUidUpdating = (uid: string) => {
    if (updatingUid === uid) return true;
    if (updatingUids && updatingUids.has(uid)) return true;
    return false;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse min-w-[640px]">
        <thead>
          <tr className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
            <th className="py-3 px-4">Họ tên</th>
            <th className="py-3 px-4">Email</th>
            <th className="py-3 px-4">Vai trò</th>
            <th className="py-3 px-4">Trạng thái</th>
            <th className="py-3 px-4">Ngày tạo</th>
            <th className="py-3 px-4 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
          {teachers.map((t) => {
            const isAdmin = t.role === "admin";
            const isUpdating = isUidUpdating(t.uid);

            return (
              <tr key={t.uid} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <span>{t.displayName || t.email}</span>
                    {isAdmin && (
                      <span className="text-[10px] font-extrabold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                  {t.email}
                </td>
                <td className="py-3 px-4">
                  {isAdmin ? (
                    <Badge variant="success" className="text-[11px]">
                      Quản trị viên
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-[11px]">
                      Giáo viên
                    </Badge>
                  )}
                </td>
                <td className="py-3 px-4">
                  {t.status === "active" && (
                    <Badge variant="success" className="text-[11px]">
                      Đang hoạt động
                    </Badge>
                  )}
                  {t.status === "pending" && (
                    <Badge variant="warning" className="text-[11px]">
                      Chờ duyệt
                    </Badge>
                  )}
                  {t.status === "disabled" && (
                    <Badge variant="danger" className="text-[11px]">
                      Đã vô hiệu hóa
                    </Badge>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-500 text-xs">
                  {formatDate(t.createdAt)}
                </td>
                <td className="py-3 px-4 text-right">
                  {isAdmin ? (
                    <span className="text-slate-400 italic text-xs">
                      Quản trị viên
                    </span>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      {/* Nút Sửa họ tên */}
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => onEditTeacher && onEditTeacher(t)}
                        className="text-xs px-2.5 py-1 text-slate-700 border-slate-300 hover:bg-slate-100"
                      >
                        Sửa
                      </Button>

                      {t.status === "pending" && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isUpdating}
                            onClick={() =>
                              onStatusChangeRequest &&
                              onStatusChangeRequest(t, "active")
                            }
                            className="text-xs px-2.5 py-1"
                          >
                            Duyệt
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={isUpdating}
                            onClick={() =>
                              onStatusChangeRequest &&
                              onStatusChangeRequest(t, "disabled")
                            }
                            className="text-xs px-2.5 py-1"
                          >
                            Từ chối
                          </Button>
                        </>
                      )}

                      {t.status === "active" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() =>
                            onStatusChangeRequest &&
                            onStatusChangeRequest(t, "disabled")
                          }
                          className="text-xs px-2.5 py-1 text-rose-700 border-rose-200 hover:bg-rose-50"
                        >
                          Vô hiệu hóa
                        </Button>
                      )}

                      {t.status === "disabled" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() =>
                            onStatusChangeRequest &&
                            onStatusChangeRequest(t, "active")
                          }
                          className="text-xs px-2.5 py-1 text-teal-700 border-teal-200 hover:bg-teal-50"
                        >
                          Kích hoạt lại
                        </Button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
