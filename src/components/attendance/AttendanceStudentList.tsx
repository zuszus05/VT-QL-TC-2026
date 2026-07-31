import { useState } from "react";
import { ReinforcementScheduleRecord } from "../../types/extraStudy";
import { Student } from "../../types/student";
import { SchoolClass, GradeLevel } from "../../types/academic";
import { EmptyState } from "../common/EmptyState";
import type { AttendanceRecord, AttendanceStatus } from "../../types/attendance";

interface AttendanceStudentListProps {
  records: ReinforcementScheduleRecord[];
  students: Student[];
  classes: SchoolClass[];
  attendanceMap: Record<string, AttendanceStatus>;
  notesMap: Record<string, string>;
  finalizedSet?: Set<string>;
  attendanceRecordMap?: Record<string, AttendanceRecord>;
  disabled?: boolean;
  onStatusChange: (extraStudyId: string, status: AttendanceStatus) => void;
  onOpenNoteModal: (record: ReinforcementScheduleRecord, student: Student) => void;
  onMarkAttendanceLate?: (attendanceId: string) => Promise<boolean>;
}

function getShortName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
}

export function AttendanceStudentList({
  records,
  students,
  classes,
  attendanceMap,
  notesMap,
  finalizedSet,
  attendanceRecordMap,
  disabled = false,
  onStatusChange,
  onOpenNoteModal,
  onMarkAttendanceLate,
}: AttendanceStudentListProps) {
  const [updatingLateId, setUpdatingLateId] = useState<string | null>(null);

  const handleMarkLateClick = async (attendanceId: string) => {
    if (!attendanceId || updatingLateId || disabled || !onMarkAttendanceLate) return;
    setUpdatingLateId(attendanceId);
    try {
      await onMarkAttendanceLate(attendanceId);
    } finally {
      setUpdatingLateId(null);
    }
  };
  if (records.length === 0) {
    return (
      <div className="py-8">
        <EmptyState title="Chưa có học sinh trong ca này." description="" />
      </div>
    );
  }

  // Chuẩn bị danh sách đầy đủ thông tin học sinh & lớp học
  const enrichedList = records
    .map((rec) => {
      const student = students.find((s) => s.studentId === rec.studentId);
      if (!student) return null;

      const schoolClass = classes.find((c) => c.classId === student.classId);
      const className = schoolClass?.className || "—";
      const shortName = getShortName(student.fullName);
      const grade = student.grade;

      return {
        rec,
        student,
        className,
        shortName,
        grade,
      };
    })
    .filter(
      (
        item
      ): item is {
        rec: ReinforcementScheduleRecord;
        student: Student;
        className: string;
        shortName: string;
        grade: GradeLevel;
      } => item !== null
    );

  const GRADE_ORDER = [6, 7, 8, 9] as const;

  // Nhóm theo khối
  const groupedByGrade = GRADE_ORDER.map((grade) => {
    const groupItems = enrichedList.filter((item) => item.grade === grade);

    // Sắp xếp trong nhóm: className asc -> candidateNumber asc -> shortName asc (vi-VN)
    groupItems.sort((a, b) => {
      const classCmp = a.className.localeCompare(b.className, "vi", {
        numeric: true,
      });
      if (classCmp !== 0) return classCmp;

      const candA = Number(a.student.candidateNumber) || 0;
      const candB = Number(b.student.candidateNumber) || 0;
      if (candA !== candB) return candA - candB;

      return a.shortName.localeCompare(b.shortName, "vi");
    });

    return {
      grade,
      items: groupItems,
    };
  }).filter((group) => group.items.length > 0);

  if (groupedByGrade.length === 0) {
    return (
      <div className="py-8">
        <EmptyState title="Chưa có học sinh trong ca này." description="" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedByGrade.map((group) => {
        const getEffectiveStatus = (extraStudyId: string): AttendanceStatus => {
          return attendanceMap[extraStudyId] || "present";
        };

        const gradePresentCount = group.items.filter(
          (item) => getEffectiveStatus(item.rec.extraStudyId) === "present"
        ).length;

        const gradeAbsentCount = group.items.filter(
          (item) => getEffectiveStatus(item.rec.extraStudyId) === "absent"
        ).length;

        const gradeLateCount = group.items.filter(
          (item) => getEffectiveStatus(item.rec.extraStudyId) === "late"
        ).length;

        return (
          <div
            key={group.grade}
            className="rounded-xl border border-teal-200/80 bg-slate-50/40 overflow-hidden shadow-2xs"
          >
            {/* Header Khối */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-teal-100/70 px-4 py-3 border-b border-teal-200/80">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-extrabold bg-teal-700 text-white shadow-2xs">
                  K{group.grade}
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Khối {group.grade}
                </h3>
                <span className="text-xs font-semibold text-slate-700 bg-white/90 px-2.5 py-0.5 rounded-full border border-teal-200/80">
                  Sĩ số: {group.items.length} học sinh
                </span>
              </div>

              {/* Thống kê điểm danh theo khối */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Có mặt: {gradePresentCount}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                  Vắng: {gradeAbsentCount}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                  Muộn: {gradeLateCount}
                </span>
              </div>
            </div>

            {/* Danh sách học sinh của khối */}
            <div className="p-3 space-y-2">
              {group.items.map(({ rec, student, className, shortName }) => {
                const attRecord = attendanceRecordMap?.[rec.extraStudyId];
                const attRecordId = attRecord?.attendanceId;
                const currentStatus = attendanceMap[rec.extraStudyId] || "present";
                const note = notesMap[rec.extraStudyId] || "";
                const hasNote = note.trim().length > 0;
                const isFinalized = finalizedSet?.has(rec.extraStudyId) ?? false;
                const isRowDisabled = isFinalized || disabled;

                return (
                  <div
                    key={rec.extraStudyId}
                    className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center font-bold text-xs text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60 min-w-[36px]">
                        {className}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {student.candidateNumber} — {shortName}
                      </span>
                      {isFinalized && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Đã chốt
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isRowDisabled}
                        onClick={() =>
                          onStatusChange(rec.extraStudyId, "present")
                        }
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                          currentStatus === "present"
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                        }`}
                      >
                        Có mặt
                      </button>
                      <button
                        type="button"
                        disabled={isRowDisabled}
                        onClick={() =>
                          onStatusChange(rec.extraStudyId, "absent")
                        }
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                          currentStatus === "absent"
                            ? "bg-rose-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                        }`}
                      >
                        Vắng
                      </button>
                      <button
                        type="button"
                        disabled={isRowDisabled}
                        onClick={() =>
                          onStatusChange(rec.extraStudyId, "late")
                        }
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                          currentStatus === "late"
                            ? "bg-amber-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                        }`}
                      >
                        Muộn
                      </button>

                      {isFinalized && currentStatus === "present" && attRecordId && (
                        <button
                          type="button"
                          disabled={disabled || updatingLateId === attRecordId}
                          onClick={() => handleMarkLateClick(attRecordId)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 border border-amber-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {updatingLateId === attRecordId
                            ? "Đang cập nhật..."
                            : "Đánh dấu Muộn"}
                        </button>
                      )}

                      {isFinalized && currentStatus === "late" && (
                        <span className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                          Đã muộn
                        </span>
                      )}

                      <button
                        type="button"
                        disabled={!isFinalized && disabled}
                        onClick={() => onOpenNoteModal(rec, student)}
                        title={
                          isFinalized
                            ? `Ghi chú (Đã chốt): ${note || "Không có"}`
                            : hasNote
                            ? `Ghi chú: ${note}`
                            : "Thêm ghi chú"
                        }
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors border disabled:opacity-60 disabled:cursor-not-allowed ${
                          hasNote
                            ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 font-bold"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-900"
                        }`}
                      >
                        <span>📝</span>
                        <span>{isFinalized ? "Xem ghi chú" : "Ghi chú"}</span>
                        {hasNote && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

