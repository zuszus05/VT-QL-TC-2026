import { useEffect, useId } from "react";
import { Student } from "../../types/student";
import { SchoolClass } from "../../types/academic";
import {
  ReinforcementScheduleRecord,
  ExtraSubject,
  ExtraStudyType,
  StudySession,
} from "../../types/extraStudy";
import { TeacherProfile } from "../../types/teacher";
import { UserProfile } from "../../types/user";
import {
  EXTRA_SUBJECT_LABELS,
  STUDY_TYPE_LABELS,
  STUDY_SESSION_LABELS,
} from "../../constants/extraStudy";
import { Button } from "../common/Button";

export interface AdminExtraStudyHistoryModalProps {
  open: boolean;
  student: Student | null;
  schoolClass?: SchoolClass | null;
  records: ReinforcementScheduleRecord[];
  teachers?: TeacherProfile[];
  currentUser?: UserProfile | null;
  onClose: () => void;
}

/**
 * Tra cứu tên hiển thị từ userId sử dụng danh sách teacher/user hiện có trong RAM.
 * Không gọi Firestore.
 */
function getUserDisplayName(
  userId: string | undefined,
  teachers: TeacherProfile[] = [],
  currentUser?: UserProfile | null
): string {
  if (!userId || !userId.trim()) {
    return "Không xác định";
  }

  const cleanId = userId.trim();

  // Kiểm tra trường hợp hệ thống tự động
  if (cleanId === "SYSTEM_AUTO_2300" || cleanId.startsWith("SYSTEM_")) {
    return "Hệ thống (Tự động)";
  }

  // Kiểm tra với currentUser
  if (
    currentUser &&
    (currentUser.id === cleanId || currentUser.email === cleanId)
  ) {
    return currentUser.fullName || currentUser.email || "Không xác định";
  }

  // Kiểm tra trong danh sách giáo viên/users đã tải
  const foundTeacher = teachers.find(
    (t) => t.uid === cleanId || t.email === cleanId
  );
  if (foundTeacher) {
    return foundTeacher.displayName || foundTeacher.email || "Không xác định";
  }

  // Mock ID fallback
  if (cleanId === "usr-admin-1") return "Quản trị viên";
  if (cleanId === "usr-teacher-1") return "Giáo viên";

  return "Không xác định";
}

/**
 * Định dạng ngày giờ chuẩn tiếng Việt: DD/MM/YYYY HH:mm
 */
function formatVietnameseDateTime(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return "—";
  }
}

/**
 * Định dạng ngày học: DD/MM/YYYY
 */
function formatVietnameseDateOnly(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return "—";
  const trimmed = dateStr.trim();
  const parts = trimmed.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return trimmed;
}

/**
 * Nhận diện an toàn xem record đã từng được sửa sau khi tạo hay chưa.
 * Nếu chưa từng sửa: updatedByUserId/updatedAt thiếu hoặc trùng thời gian khởi tạo -> false.
 */
function isRecordModified(rec: ReinforcementScheduleRecord): boolean {
  if (!rec.updatedByUserId || !rec.updatedByUserId.trim() || !rec.updatedAt) {
    return false;
  }

  // Nếu người sửa khác người tạo ban đầu -> chắc chắn đã sửa
  if (rec.createdByUserId && rec.updatedByUserId !== rec.createdByUserId) {
    return true;
  }

  // Nếu cùng người tạo nhưng updatedAt muộn hơn createdAt ít nhất 2 giây -> đã sửa
  if (rec.createdAt && rec.updatedAt) {
    const createdTime = new Date(rec.createdAt).getTime();
    const updatedTime = new Date(rec.updatedAt).getTime();
    if (!isNaN(createdTime) && !isNaN(updatedTime)) {
      return updatedTime - createdTime > 2000;
    }
  }

  return false;
}

function getSubjectDisplay(subject?: string): string {
  if (!subject) return "—";
  return EXTRA_SUBJECT_LABELS[subject as ExtraSubject] || subject || "—";
}

function getTypeDisplay(type?: string): string {
  if (!type) return "—";
  return STUDY_TYPE_LABELS[type as ExtraStudyType] || type || "—";
}

function getSessionDisplay(session?: string): string {
  if (!session) return "—";
  return STUDY_SESSION_LABELS[session as StudySession] || session || "—";
}

function getShortName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
}

export function AdminExtraStudyHistoryModal({
  open,
  student,
  schoolClass,
  records,
  teachers = [],
  currentUser,
  onClose,
}: AdminExtraStudyHistoryModalProps) {
  const titleId = useId();

  // Escape key handler và khóa scroll body
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  // Bảo vệ quyền Admin: chỉ Admin mới được mở modal này
  if (!open || currentUser?.role !== "admin") {
    return null;
  }

  const studentShortName = student ? getShortName(student.fullName).toUpperCase() : "—";
  const candidateNumber = student?.candidateNumber ?? "—";
  const rawClassName = schoolClass?.className || "—";
  const formattedClassName =
    rawClassName === "—"
      ? "Chưa xác định lớp"
      : rawClassName.startsWith("Lớp")
      ? rawClassName
      : `Lớp ${rawClassName}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto modal-overlay-safe"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col my-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70 shrink-0">
          <div className="space-y-1">
            <h2
              id={titleId}
              className="text-xs font-bold uppercase tracking-wider text-teal-800"
            >
              LỊCH SỬ XẾP TĂNG CƯỜNG
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base sm:text-lg font-bold text-slate-900">
                {candidateNumber} — {studentShortName}
              </span>
              <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {formattedClassName}
              </span>
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/80">
                {records.length} lượt
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 shrink-0"
            aria-label="Đóng"
            title="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Nội dung danh sách records */}
        <div className="p-4 sm:p-5 overflow-y-auto min-h-0 flex-1 space-y-3.5 text-slate-700 text-sm">
          {records.length === 0 ? (
            <div className="py-8 text-center text-slate-500 space-y-1">
              <p className="font-medium text-slate-600">
                Không có lịch sử tăng cường hiện tại.
              </p>
              <p className="text-xs text-slate-400">
                Học sinh này hiện chưa có buổi học tăng cường hoặc học bù nào trong danh sách hiện tại.
              </p>
            </div>
          ) : (
            records.map((rec, index) => {
              const creatorName = getUserDisplayName(
                rec.createdByUserId,
                teachers,
                currentUser
              );
              const createdAtFormatted = formatVietnameseDateTime(rec.createdAt);

              const hasModified = isRecordModified(rec);
              const modifierName = hasModified
                ? getUserDisplayName(rec.updatedByUserId, teachers, currentUser)
                : "";
              const updatedAtFormatted = hasModified
                ? formatVietnameseDateTime(rec.updatedAt)
                : "";

              const subjectLabel = getSubjectDisplay(rec.subject);
              const typeLabel = getTypeDisplay(rec.type);
              const sessionLabel = getSessionDisplay(rec.session);
              const dateLabel = formatVietnameseDateOnly(rec.targetDate);

              const isExtraStudy = rec.type === "extra-study";

              return (
                <div
                  key={rec.extraStudyId || `rec-${index}`}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  {/* Dòng 1: Ngày học & Ca · Môn & Loại hình */}
                  <div className="flex items-start justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {dateLabel} · {sessionLabel}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        {subjectLabel} · {typeLabel}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          isExtraStudy
                            ? "bg-amber-100/80 text-amber-900 border border-amber-200/70"
                            : "bg-purple-100/80 text-purple-900 border border-purple-200/70"
                        }`}
                      >
                        {typeLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200/70">
                        {subjectLabel}
                      </span>
                    </div>
                  </div>

                  {/* Thông tin Người xếp ban đầu */}
                  <div className="text-xs space-y-1 pt-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-slate-500">Người xếp:</span>
                      <span className="font-semibold text-slate-800 text-right">
                        {creatorName}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-slate-500">Xếp lúc:</span>
                      <span className="font-medium text-slate-700 text-right">
                        {createdAtFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Thông tin Người sửa gần nhất (chỉ hiển thị nếu record đã từng được sửa) */}
                  {hasModified && (
                    <div className="text-xs space-y-1 pt-2 border-t border-dashed border-slate-200">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-amber-700 font-medium">Người sửa gần nhất:</span>
                        <span className="font-semibold text-slate-800 text-right">
                          {modifierName}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-500">Sửa lúc:</span>
                        <span className="font-medium text-slate-700 text-right">
                          {updatedAtFormatted}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-end px-5 py-3 bg-slate-50/80 border-t border-slate-100 shrink-0">
          <Button variant="secondary" onClick={onClose} className="px-5">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
