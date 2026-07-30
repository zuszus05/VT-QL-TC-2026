import { useState, useEffect } from "react";
import { AttendanceRecord } from "../../types/attendance";
import { ReinforcementScheduleRecord, StudySession } from "../../types/extraStudy";
import { Student } from "../../types/student";
import { SchoolClass } from "../../types/academic";
import { EmptyState } from "../common/EmptyState";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { getSessionLabel } from "../../utils/date";
import { NoteAttendanceModal } from "./NoteAttendanceModal";
import { FinalizeAbsenceModal } from "./FinalizeAbsenceModal";
import { useToast } from "../../hooks/useToast";

function getShortName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
}

type StatusFilter = "all" | "absent" | "late";

const sessionOrder: StudySession[] = ["morning", "afternoon", "evening"];
const gradeOrder = [6, 7, 8, 9];

interface TodayReportSectionProps {
  attendanceRecords?: AttendanceRecord[];
  reportLoading?: boolean;
  reportError?: string | null;
  onAttendanceRecordsChange?: (records: AttendanceRecord[]) => void;
  onLoadDailyReport?: (date: string) => void;
  extraStudyRecords?: ReinforcementScheduleRecord[];
  students?: Student[];
  classes?: SchoolClass[];
}

export function TodayReportSection({
  attendanceRecords = [],
  reportLoading = false,
  reportError = null,
  onAttendanceRecordsChange,
  onLoadDailyReport,
  extraStudyRecords = [],
  students = [],
  classes = [],
}: TodayReportSectionProps) {
  const { showToast } = useToast();

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayIsoDate = `${year}-${month}-${day}`;

  const [selectedDate, setSelectedDate] = useState<string>(todayIsoDate);

  useEffect(() => {
    if (onLoadDailyReport) {
      onLoadDailyReport(selectedDate);
    }
  }, [selectedDate, onLoadDailyReport]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [noteTarget, setNoteTarget] = useState<{
    att: AttendanceRecord;
    student?: Student;
    className: string;
  } | null>(null);

  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(false);

  // Parse formatted date
  const [sYear, sMonth, sDay] = selectedDate.split("-");
  const formattedSelectedDate =
    sYear && sMonth && sDay ? `${sDay}/${sMonth}/${sYear}` : selectedDate;
  const isToday = selectedDate === todayIsoDate;
  const titleText = isToday
    ? "Tình hình hôm nay"
    : `Tình hình ngày ${formattedSelectedDate}`;

  // Lấy tất cả AttendanceRecord của selectedDate có status "absent" hoặc "late"
  const dateProblemRecords = attendanceRecords.filter(
    (a) =>
      a.attendanceDate === selectedDate &&
      (a.status === "absent" || a.status === "late")
  );

  // Danh sách vắng của ngày selectedDate để kiểm tra Chốt vắng
  const absentRecordsForSelectedDate = attendanceRecords.filter(
    (a) => a.attendanceDate === selectedDate && a.status === "absent"
  );

  const isAllAbsenceFinalized =
    absentRecordsForSelectedDate.length > 0 &&
    absentRecordsForSelectedDate.every((a) => a.absenceFinalized === true);

  // Thống kê đầu trang: tính theo toàn bộ dữ liệu của selectedDate (không phụ thuộc statusFilter)
  const absentCount = dateProblemRecords.filter(
    (a) => a.status === "absent"
  ).length;

  const lateCount = dateProblemRecords.filter(
    (a) => a.status === "late"
  ).length;

  const totalNeedsHandling = absentCount + lateCount;

  const stats = [
    {
      label: "Vắng",
      value: absentCount,
      color: "text-rose-600 bg-rose-50 border-rose-200",
    },
    {
      label: "Muộn",
      value: lateCount,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      label: "Tổng cần xử lý",
      value: totalNeedsHandling,
      color: "text-slate-800 bg-slate-100 border-slate-200",
    },
  ];

  // Thống kê theo từng ca (Morning, Afternoon, Evening) cho selectedDate
  const sessionStats = sessionOrder.map((session) => {
    const sessionRecords = dateProblemRecords.filter((att) => {
      const extraStudy = extraStudyRecords.find(
        (e) => e.extraStudyId === att.extraStudyId
      );
      const recSession: StudySession =
        extraStudy?.session || att.session || "morning";
      return recSession === session;
    });

    const absent = sessionRecords.filter((a) => a.status === "absent").length;
    const late = sessionRecords.filter((a) => a.status === "late").length;
    const totalNeedsHandling = absent + late;

    return {
      session,
      label: getSessionLabel(session),
      absent,
      late,
      totalNeedsHandling,
    };
  });

  const handleSessionClick = (session: StudySession) => {
    const el = document.getElementById(`session-group-${session}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Lọc theo bộ lọc trạng thái
  const filteredProblemRecords = dateProblemRecords.filter((a) => {
    if (statusFilter === "absent") {
      return a.status === "absent";
    }
    if (statusFilter === "late") {
      return a.status === "late";
    }
    return true; // "all"
  });

  // Enrich data cho từng bản ghi đã lọc
  const enrichedItems = filteredProblemRecords.map((att) => {
    const extraStudy = extraStudyRecords.find(
      (e) => e.extraStudyId === att.extraStudyId
    );
    const student = students.find((s) => s.studentId === att.studentId);
    const classObj = classes.find((c) => c.classId === student?.classId);

    const session: StudySession =
      extraStudy?.session || att.session || "morning";
    const grade = student?.grade || classObj?.grade || 6;
    const className = classObj?.className || "—";

    return {
      att,
      extraStudy,
      student,
      classObj,
      session,
      grade,
      className,
    };
  });

  // Nhóm theo Ca học (Ca sáng -> Ca chiều -> Ca tối), sau đó nhóm theo Khối (6 -> 7 -> 8 -> 9)
  const groupedBySession = sessionOrder
    .map((session) => {
      const sessionItems = enrichedItems.filter((i) => i.session === session);
      if (sessionItems.length === 0) return null;

      const grades = gradeOrder
        .map((grade) => {
          const gradeItems = sessionItems.filter((i) => i.grade === grade);
          if (gradeItems.length === 0) return null;
          return {
            grade,
            items: gradeItems,
          };
        })
        .filter(
          (
            g
          ): g is {
            grade: number;
            items: typeof sessionItems;
          } => g !== null
        );

      return {
        session,
        sessionLabel: getSessionLabel(session),
        grades,
      };
    })
    .filter(
      (
        s
      ): s is {
        session: StudySession;
        sessionLabel: string;
        grades: {
          grade: number;
          items: typeof enrichedItems;
        }[];
      } => s !== null
    );

  // Xử lý chuyển sang Vắng
  const handleSetStatusAbsent = (attId: string) => {
    const nowIso = new Date().toISOString();
    const updatedRecords = attendanceRecords.map((rec) => {
      if (rec.attendanceId === attId) {
        return {
          ...rec,
          status: "absent" as const,
          absenceFinalized: undefined,
          absenceFinalizedAt: undefined,
          updatedAt: nowIso,
        };
      }
      return rec;
    });

    if (onAttendanceRecordsChange) {
      onAttendanceRecordsChange(updatedRecords);
    }
    showToast("Đã chuyển trạng thái Vắng.", "success");
  };

  // Xử lý chuyển sang Muộn
  const handleSetStatusLate = (attId: string) => {
    const nowIso = new Date().toISOString();
    const updatedRecords = attendanceRecords.map((rec) => {
      if (rec.attendanceId === attId) {
        return {
          ...rec,
          status: "late" as const,
          absenceFinalized: undefined,
          absenceFinalizedAt: undefined,
          updatedAt: nowIso,
        };
      }
      return rec;
    });

    if (onAttendanceRecordsChange) {
      onAttendanceRecordsChange(updatedRecords);
    }
    showToast("Đã chuyển trạng thái Muộn.", "success");
  };

  // Xác nhận lưu ghi chú
  const handleConfirmNote = (note: string) => {
    if (!noteTarget) return;

    const nowIso = new Date().toISOString();
    const updatedRecords = attendanceRecords.map((rec) => {
      if (rec.attendanceId === noteTarget.att.attendanceId) {
        return {
          ...rec,
          note: note ? note : undefined,
          updatedAt: nowIso,
        };
      }
      return rec;
    });

    if (onAttendanceRecordsChange) {
      onAttendanceRecordsChange(updatedRecords);
    }

    showToast("Đã cập nhật ghi chú.", "success");
    setNoteTarget(null);
  };

  // Xác nhận Chốt vắng
  const handleConfirmFinalizeAbsence = () => {
    const nowIso = new Date().toISOString();
    const updatedRecords = attendanceRecords.map((rec) => {
      if (rec.attendanceDate === selectedDate && rec.status === "absent") {
        return {
          ...rec,
          absenceFinalized: true,
          absenceFinalizedAt: nowIso,
          updatedAt: nowIso,
        };
      }
      return rec;
    });

    if (onAttendanceRecordsChange) {
      onAttendanceRecordsChange(updatedRecords);
    }

    showToast("Đã chốt danh sách vắng.", "success");
    setShowFinalizeModal(false);
  };

  const filterOptions: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "absent", label: "Vắng" },
    { id: "late", label: "Muộn" },
  ];

  return (
    <div className="space-y-6">
      {/* Thanh tiêu đề, Chọn ngày, Bộ lọc & Nút Chốt vắng */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">{titleText}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ngày {formattedSelectedDate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Input chọn ngày */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="report-date-picker"
              className="text-xs font-semibold text-slate-700 whitespace-nowrap"
            >
              Ngày cần xem:
            </label>
            <input
              id="report-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Bộ lọc trạng thái */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            {filterOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === opt.id
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Nút chính: Chốt vắng */}
          <Button
            variant={isAllAbsenceFinalized ? "secondary" : "primary"}
            disabled={
              isAllAbsenceFinalized || absentRecordsForSelectedDate.length === 0
            }
            onClick={() => setShowFinalizeModal(true)}
            className="text-xs font-bold"
          >
            {isAllAbsenceFinalized ? "Đã chốt vắng" : "Chốt vắng"}
          </Button>
        </div>
      </div>

      {reportLoading ? (
        <Card className="p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="text-sm font-medium text-slate-600">
            Đang tải dữ liệu báo cáo...
          </p>
        </Card>
      ) : reportError ? (
        <Card className="p-8 text-center flex flex-col items-center justify-center space-y-3 border-rose-200 bg-rose-50/50">
          <p className="text-sm font-semibold text-rose-700">
            Không thể tải dữ liệu báo cáo.
          </p>
          <Button
            variant="secondary"
            onClick={() => onLoadDailyReport?.(selectedDate)}
            className="text-xs font-bold border-rose-300 text-rose-800 hover:bg-rose-100"
          >
            Thử lại
          </Button>
        </Card>
      ) : (
        <>
          {/* Các thẻ thống kê */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {stats.map((item, idx) => (
              <Card key={idx} className="p-4 flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {item.label}
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span
                    className={`text-2xl font-extrabold px-2.5 py-0.5 rounded-lg border ${item.color}`}
                  >
                    {item.value}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Thống kê theo ca */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Thống kê theo ca
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {sessionStats.map((sStat) => {
                const hasElement = groupedBySession.some(
                  (g) => g.session === sStat.session
                );
                return (
                  <Card
                    key={sStat.session}
                    onClick={() => handleSessionClick(sStat.session)}
                    className={`p-4 transition-all ${
                      hasElement
                        ? "cursor-pointer hover:border-teal-300 hover:shadow-xs"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-900">
                        {sStat.label}
                      </span>
                      <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                        Cần xử lý: {sStat.totalNeedsHandling}
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-rose-50/80 border border-rose-100 p-1.5 rounded-lg">
                        <span className="block text-[10px] font-semibold text-rose-600">
                          Vắng
                        </span>
                        <span className="text-sm font-extrabold text-rose-700">
                          {sStat.absent}
                        </span>
                      </div>
                      <div className="bg-amber-50/80 border border-amber-100 p-1.5 rounded-lg">
                        <span className="block text-[10px] font-semibold text-amber-600">
                          Muộn
                        </span>
                        <span className="text-sm font-extrabold text-amber-700">
                          {sStat.late}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Danh sách xử lý */}
          {dateProblemRecords.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                title="Không có học sinh vắng hoặc muộn trong ngày đã chọn."
                description="Hiện tại không có học sinh nào vắng mặt hoặc đi muộn trong ngày này."
              />
            </Card>
          ) : filteredProblemRecords.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                title="Không có học sinh phù hợp với bộ lọc."
                description="Hãy thử chọn bộ lọc trạng thái khác để xem thông tin."
              />
            </Card>
          ) : (
            <div className="space-y-6">
              {groupedBySession.map((sessionGroup) => (
                <div
                  key={sessionGroup.session}
                  id={`session-group-${sessionGroup.session}`}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs space-y-4 p-4"
                >
                  {/* Header Ca học */}
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                      {sessionGroup.sessionLabel}
                    </h3>
                  </div>

                  {/* Danh sách theo Khối trong Ca */}
                  <div className="space-y-4">
                    {sessionGroup.grades.map((gradeGroup) => (
                      <div key={gradeGroup.grade} className="space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
                          <span>Khối {gradeGroup.grade}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 font-medium">
                            {gradeGroup.items.length} học sinh
                          </span>
                        </div>

                        <div className="space-y-2">
                          {gradeGroup.items.map(
                            ({ att, student, className }) => {
                              const isAbsent = att.status === "absent";

                              return (
                                <div
                                  key={att.attendanceId}
                                  className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-2.5">
                                      <span className="inline-flex items-center justify-center font-bold text-xs text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60">
                                        {className}
                                      </span>
                                      <span className="text-sm font-bold text-slate-900">
                                        {student?.candidateNumber} —{" "}
                                        {student
                                          ? getShortName(student.fullName)
                                          : "Chưa xác định"}
                                      </span>
                                    </div>

                                    {/* Nút thao tác: Vắng, Muộn, Ghi chú */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSetStatusAbsent(
                                            att.attendanceId
                                          )
                                        }
                                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                                          isAbsent
                                            ? "bg-rose-600 text-white shadow-2xs"
                                            : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                        }`}
                                      >
                                        Vắng
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSetStatusLate(att.attendanceId)
                                        }
                                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                                          !isAbsent
                                            ? "bg-amber-600 text-white shadow-2xs"
                                            : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                        }`}
                                      >
                                        Muộn
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setNoteTarget({
                                            att,
                                            student,
                                            className,
                                          })
                                        }
                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                                          att.note && att.note.trim() !== ""
                                            ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                                        }`}
                                      >
                                        {att.note && att.note.trim() !== ""
                                          ? "📝 Đã ghi chú"
                                          : "Ghi chú"}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-0.5">
                                    <div className="flex flex-wrap items-center gap-4">
                                      <span>
                                        <strong className="text-slate-500">
                                          SĐT Mẹ:
                                        </strong>{" "}
                                        <a
                                          href={
                                            student?.motherPhone
                                              ? `tel:${student.motherPhone}`
                                              : undefined
                                          }
                                          className="text-teal-700 hover:underline font-medium"
                                        >
                                          {student?.motherPhone || "—"}
                                        </a>
                                      </span>
                                      <span>
                                        <strong className="text-slate-500">
                                          SĐT Bố:
                                        </strong>{" "}
                                        <a
                                          href={
                                            student?.fatherPhone
                                              ? `tel:${student.fatherPhone}`
                                              : undefined
                                          }
                                          className="text-teal-700 hover:underline font-medium"
                                        >
                                          {student?.fatherPhone || "—"}
                                        </a>
                                      </span>
                                    </div>

                                    {att.note && att.note.trim() !== "" && (
                                      <div className="text-xs bg-amber-50 text-amber-900 px-2.5 py-1 rounded-md border border-amber-200/80 font-medium">
                                        📝{" "}
                                        <span className="font-semibold">
                                          Ghi chú:
                                        </span>{" "}
                                        {att.note}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal Ghi chú */}
      {noteTarget && (
        <NoteAttendanceModal
          open={Boolean(noteTarget)}
          className={noteTarget.className}
          candidateNumber={noteTarget.student?.candidateNumber || 0}
          studentShortName={
            noteTarget.student
              ? getShortName(noteTarget.student.fullName)
              : "Chưa xác định"
          }
          status={noteTarget.att.status}
          initialNote={noteTarget.att.note || ""}
          onClose={() => setNoteTarget(null)}
          onConfirm={handleConfirmNote}
        />
      )}

      {/* Modal Chốt vắng */}
      {showFinalizeModal && (
        <FinalizeAbsenceModal
          open={showFinalizeModal}
          formattedDate={formattedSelectedDate}
          absentTotal={absentCount}
          lateCount={lateCount}
          onClose={() => setShowFinalizeModal(false)}
          onConfirm={handleConfirmFinalizeAbsence}
        />
      )}
    </div>
  );
}
