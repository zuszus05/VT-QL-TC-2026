import { useState, useEffect, useMemo, useRef } from "react";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { EmptyState } from "../common/EmptyState";
import { useToast } from "../../hooks/useToast";
import { Student } from "../../types/student";
import { SchoolClass } from "../../types/academic";
import type { AttendanceRecord, AttendanceStatus } from "../../types/attendance";
import { createStableId } from "../../utils/id";
import {
  WEEKDAY_MAP,
  SESSION_MAP,
} from "../../constants/extraStudy";
import { getNextDateForWeekday } from "../../utils/date";
import {
  ReinforcementScheduleRecord,
  Weekday,
  StudySession,
} from "../../types/extraStudy";
import { AttendanceStudentList } from "./AttendanceStudentList";
import { AttendanceSaveModal } from "./AttendanceSaveModal";

const DAYS_OF_WEEK = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
] as const;

const SHIFTS = ["Ca sáng", "Ca chiều", "Ca tối"] as const;

function getTodayDayName(): string {
  const dayIndex = new Date().getDay(); // 0 is Sunday
  const dayMap: Record<number, string> = {
    1: "Thứ 2",
    2: "Thứ 3",
    3: "Thứ 4",
    4: "Thứ 5",
    5: "Thứ 6",
    6: "Thứ 7",
    0: "Chủ nhật",
  };
  return dayMap[dayIndex] || "Thứ 2";
}

function getShortName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
}

function getCurrentShiftInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD
  const formattedDate = `${day}/${month}/${year}`;

  const daysOfWeek = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  const dayName = daysOfWeek[now.getDay()];

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  let session: "morning" | "afternoon" | "evening" | null = null;
  let sessionLabel = "Ngoài giờ học";

  // Ca sáng: 07:00 - trước 11:30 (420 <= min < 690)
  if (timeInMinutes >= 420 && timeInMinutes < 690) {
    session = "morning";
    sessionLabel = "Ca sáng";
  }
  // Ca chiều: 13:45 - trước 17:00 (825 <= min < 1020)
  else if (timeInMinutes >= 825 && timeInMinutes < 1020) {
    session = "afternoon";
    sessionLabel = "Ca chiều";
  }
  // Ca tối: 17:15 - trước 21:00 (1035 <= min < 1260)
  else if (timeInMinutes >= 1035 && timeInMinutes < 1260) {
    session = "evening";
    sessionLabel = "Ca tối";
  }

  return {
    dateStr,
    formattedDate,
    dayName,
    session,
    sessionLabel,
    formattedFullDate: `${dayName}, ${formattedDate}`,
  };
}

interface AttendancePageProps {
  records: ReinforcementScheduleRecord[];
  attendanceRecords?: AttendanceRecord[];
  attendanceLoading?: boolean;
  attendanceError?: string | null;
  attendanceSaving?: boolean;
  attendanceFinalizing?: boolean;
  onAttendanceRecordsChange?: (records: AttendanceRecord[]) => void;
  onViewChange?: (attendanceDate: string, session: StudySession) => void;
  onSaveAttendanceRecords?: (
    attendanceDate: string,
    session: StudySession,
    draftRecords: Array<{
      extraStudyId: string;
      studentId: string;
      status: AttendanceStatus;
      note: string;
    }>
  ) => Promise<boolean>;
  onFinalizeAttendanceRecords?: (
    attendanceDate: string,
    session: StudySession
  ) => Promise<boolean>;
  onMarkAttendanceLate?: (attendanceId: string) => Promise<boolean>;
  attendanceMarkingLate?: boolean;
  students: Student[];
  classes: SchoolClass[];
}

export function AttendancePage({
  records,
  attendanceRecords = [],
  attendanceLoading = false,
  attendanceError = null,
  attendanceSaving = false,
  attendanceFinalizing = false,
  attendanceMarkingLate = false,
  onAttendanceRecordsChange,
  onViewChange,
  onSaveAttendanceRecords,
  onFinalizeAttendanceRecords,
  onMarkAttendanceLate,
  students,
  classes,
}: AttendancePageProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<"automatic" | "manual">("automatic");
  const [selectedDay, setSelectedDay] = useState<string>(getTodayDayName);
  const [selectedShift, setSelectedShift] = useState<string>("Ca sáng");

  // State lưu trạng thái điểm danh tạm thời theo extraStudyId (mặc định "present")
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, AttendanceStatus>
  >({});

  // State lưu ghi chú điểm danh theo extraStudyId
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  // State quản lý Modal ghi chú
  const [activeNoteTarget, setActiveNoteTarget] = useState<{
    record: ReinforcementScheduleRecord;
    student: Student;
  } | null>(null);
  const [noteText, setNoteText] = useState<string>("");

  // State quản lý Modal xác nhận lưu điểm danh
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Ref guards chống submit lặp / double click (Step 13C2-01)
  const isSaveSubmittingRef = useRef(false);
  const isFinalizeSubmittingRef = useRef(false);

  // Tập hợp các extraStudyId đã được chốt (isFinalized === true)
  const finalizedSet = useMemo(() => {
    const set = new Set<string>();
    attendanceRecords.forEach((r) => {
      if (r.isFinalized === true) {
        set.add(r.extraStudyId);
      }
    });
    return set;
  }, [attendanceRecords]);

  // Map extraStudyId -> AttendanceRecord
  const attendanceRecordMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    attendanceRecords.forEach((r) => {
      map[r.extraStudyId] = r;
    });
    return map;
  }, [attendanceRecords]);

  // Tự động tính toán lại thời gian hiện tại mỗi lần component render / mở lại
  const currentInfo = getCurrentShiftInfo();

  // Reset điểm danh & ghi chú khi chuyển mode, thứ hoặc ca
  const handleSetMode = (newMode: "automatic" | "manual") => {
    setMode(newMode);
  };

  const handleSelectDay = (day: string) => {
    setSelectedDay(day);
  };

  const handleSelectShift = (shift: string) => {
    setSelectedShift(shift);
  };

  const handleStatusChange = (
    extraStudyId: string,
    status: AttendanceStatus
  ) => {
    if (
      finalizedSet.has(extraStudyId) ||
      attendanceLoading ||
      attendanceSaving ||
      attendanceFinalizing ||
      attendanceMarkingLate
    ) {
      return;
    }
    setAttendanceMap((prev) => ({
      ...prev,
      [extraStudyId]: status,
    }));
  };

  const handleOpenNoteModal = (
    record: ReinforcementScheduleRecord,
    student: Student
  ) => {
    const isFinalized = finalizedSet.has(record.extraStudyId);
    if (
      !isFinalized &&
      (attendanceLoading ||
        attendanceSaving ||
        attendanceFinalizing ||
        attendanceMarkingLate)
    ) {
      return;
    }
    setActiveNoteTarget({ record, student });
    setNoteText(notesMap[record.extraStudyId] || "");
  };

  const handleSaveNote = () => {
    if (activeNoteTarget) {
      const extraStudyId = activeNoteTarget.record.extraStudyId;
      if (
        finalizedSet.has(extraStudyId) ||
        attendanceLoading ||
        attendanceSaving ||
        attendanceFinalizing ||
        attendanceMarkingLate
      ) {
        setActiveNoteTarget(null);
        return;
      }
      setNotesMap((prev) => ({
        ...prev,
        [extraStudyId]: noteText,
      }));
    }
    setActiveNoteTarget(null);
  };

  let filteredRecords: ReinforcementScheduleRecord[] = [];
  let displayTitle = "";

  if (mode === "automatic") {
    if (currentInfo.session) {
      filteredRecords = records.filter(
        (r) =>
          r.targetDate === currentInfo.dateStr &&
          r.session === currentInfo.session &&
          r.status === "scheduled"
      );
      displayTitle = `Danh sách học sinh — ${currentInfo.dayName} (${currentInfo.sessionLabel})`;
    } else {
      filteredRecords = [];
      displayTitle = `Danh sách học sinh — ${currentInfo.dayName}`;
    }
  } else {
    const activeWeekday = WEEKDAY_MAP[selectedDay] || (selectedDay as Weekday);
    const activeSession = SESSION_MAP[selectedShift] || "morning";
    const targetDate = getNextDateForWeekday(activeWeekday);

    filteredRecords = records.filter(
      (r) =>
        r.targetDate === targetDate &&
        r.session === activeSession &&
        r.status === "scheduled"
    );
    displayTitle = `Danh sách học sinh — ${selectedDay} (${selectedShift})`;
  }

  // Xác định ngày (YYYY-MM-DD) và ca hiện tại đang xem để tải dữ liệu từ Firestore
  let activeDateToLoad: string | null = null;
  let activeSessionToLoad: StudySession | null = null;

  if (mode === "automatic") {
    if (currentInfo.session) {
      activeDateToLoad = currentInfo.dateStr;
      activeSessionToLoad = currentInfo.session;
    }
  } else {
    const activeWeekday = WEEKDAY_MAP[selectedDay] || (selectedDay as Weekday);
    activeDateToLoad = getNextDateForWeekday(activeWeekday);
    activeSessionToLoad = SESSION_MAP[selectedShift] || "morning";
  }

  // Tải dữ liệu điểm danh tương ứng khi người dùng thay đổi ngày hoặc ca
  useEffect(() => {
    if (activeDateToLoad && activeSessionToLoad && onViewChange) {
      onViewChange(activeDateToLoad, activeSessionToLoad);
    }
  }, [activeDateToLoad, activeSessionToLoad, onViewChange]);

  // Tải/đồng bộ thông tin điểm danh và ghi chú từ attendanceRecords khi đổi ca hoặc khi attendanceRecords cập nhật
  useEffect(() => {
    const newAttendanceMap: Record<string, AttendanceStatus> = {};
    const newNotesMap: Record<string, string> = {};

    filteredRecords.forEach((rec) => {
      const saved = attendanceRecords.find(
        (a) => a.extraStudyId === rec.extraStudyId
      );
      if (saved) {
        newAttendanceMap[rec.extraStudyId] = saved.status;
        newNotesMap[rec.extraStudyId] = saved.note || "";
      } else {
        newAttendanceMap[rec.extraStudyId] = "present";
        newNotesMap[rec.extraStudyId] = "";
      }
    });

    setAttendanceMap(newAttendanceMap);
    setNotesMap(newNotesMap);
  }, [
    mode,
    selectedDay,
    selectedShift,
    currentInfo.dateStr,
    currentInfo.session,
    records,
    attendanceRecords,
  ]);

  // Thống kê số lượng theo trạng thái hiện tại (mặc định 'present' nếu chưa chọn)
  const presentCount = filteredRecords.filter(
    (r) => (attendanceMap[r.extraStudyId] || "present") === "present"
  ).length;

  const absentCount = filteredRecords.filter(
    (r) => attendanceMap[r.extraStudyId] === "absent"
  ).length;

  const lateCount = filteredRecords.filter(
    (r) => attendanceMap[r.extraStudyId] === "late"
  ).length;

  // Tính thông tin hiển thị cho modal xác nhận
  let modalDateStr = "";
  let modalDayName = "";
  let modalShiftName = "";

  if (mode === "automatic") {
    modalDateStr = currentInfo.formattedDate;
    modalDayName = currentInfo.dayName;
    modalShiftName = currentInfo.sessionLabel || "Ngoài giờ học";
  } else {
    modalDayName = selectedDay;
    modalShiftName = selectedShift;
    const activeWeekday = WEEKDAY_MAP[selectedDay] || (selectedDay as Weekday);
    const targetDate = getNextDateForWeekday(activeWeekday);
    const parts = targetDate.split("-");
    if (parts.length === 3) {
      modalDateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
    } else {
      modalDateStr = targetDate;
    }
  }

  const allFinalized =
    filteredRecords.length > 0 &&
    filteredRecords.every((r) => finalizedSet.has(r.extraStudyId));

  const handleSaveAttendance = () => {
    if (filteredRecords.length === 0) {
      showToast("Chưa có dữ liệu điểm danh để lưu.", "info");
      return;
    }
    if (allFinalized) {
      showToast("Danh sách điểm danh đã được chốt.", "info");
      return;
    }
    setIsSaveModalOpen(true);
  };

  const handleFinalizeAttendance = async () => {
    if (!activeDateToLoad || !activeSessionToLoad) return;
    if (filteredRecords.length === 0) {
      showToast("Chưa có dữ liệu điểm danh để chốt.", "info");
      return;
    }
    if (allFinalized) {
      showToast("Danh sách điểm danh đã được chốt.", "info");
      return;
    }
    if (isFinalizeSubmittingRef.current) return;
    isFinalizeSubmittingRef.current = true;
    try {
      if (onFinalizeAttendanceRecords) {
        await onFinalizeAttendanceRecords(activeDateToLoad, activeSessionToLoad);
      }
    } finally {
      isFinalizeSubmittingRef.current = false;
    }
  };

  const handleConfirmSaveAttendance = async () => {
    if (!activeDateToLoad || !activeSessionToLoad) return;

    const unfinalizedDrafts = filteredRecords
      .filter((rec) => !finalizedSet.has(rec.extraStudyId))
      .map((rec) => ({
        extraStudyId: rec.extraStudyId,
        studentId: rec.studentId,
        status: (attendanceMap[rec.extraStudyId] || "present") as AttendanceStatus,
        note: notesMap[rec.extraStudyId] || "",
      }));

    if (unfinalizedDrafts.length === 0) {
      setIsSaveModalOpen(false);
      showToast("Danh sách điểm danh đã được chốt.", "info");
      return;
    }

    if (isSaveSubmittingRef.current) return;
    isSaveSubmittingRef.current = true;

    try {
      if (onSaveAttendanceRecords) {
        const success = await onSaveAttendanceRecords(
          activeDateToLoad,
          activeSessionToLoad,
          unfinalizedDrafts
        );
        if (success) {
          setIsSaveModalOpen(false);
        }
      } else {
      const nowIso = new Date().toISOString();
      const updatedAttendanceRecords = [...attendanceRecords];

      filteredRecords.forEach((rec) => {
        const currentStatus = attendanceMap[rec.extraStudyId] || "present";
        const currentNote = notesMap[rec.extraStudyId] || "";

        const existingIndex = updatedAttendanceRecords.findIndex(
          (a) => a.extraStudyId === rec.extraStudyId
        );

        if (existingIndex >= 0) {
          const existingRec = updatedAttendanceRecords[existingIndex];
          const isAbsent = currentStatus === "absent";

          updatedAttendanceRecords[existingIndex] = {
            ...existingRec,
            status: currentStatus,
            note: currentNote,
            isExcused: isAbsent ? existingRec.isExcused : undefined,
            excuseReason: isAbsent ? existingRec.excuseReason : undefined,
            excusedAt: isAbsent ? existingRec.excusedAt : undefined,
            updatedAt: nowIso,
          };
        } else {
          const newRecord: AttendanceRecord = {
            attendanceId: rec.extraStudyId,
            extraStudyId: rec.extraStudyId,
            studentId: rec.studentId,
            attendanceDate: rec.targetDate,
            session: rec.session,
            status: currentStatus,
            note: currentNote,
            isFinalized: false,
            finalizedAt: null,
            finalizedByUserId: null,
            createdByUserId: "",
            updatedByUserId: "",
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          updatedAttendanceRecords.push(newRecord);
        }
      });

      if (onAttendanceRecordsChange) {
        onAttendanceRecordsChange(updatedAttendanceRecords);
      }

      setIsSaveModalOpen(false);
      showToast("Đã lưu điểm danh.", "success");
    }
  } finally {
    isSaveSubmittingRef.current = false;
  }
};

  return (
    <div className="space-y-4 md:space-y-6 pb-6 md:pb-0">
      {/* Đầu trang */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Điểm danh</h1>
        <p className="text-sm text-slate-500 mt-1 hidden md:block">
          Điểm danh học sinh trong các ca tăng cường và học bù.
        </p>
      </div>

      {/* Khối chính */}
      <Card className="p-4 md:p-6 space-y-6">
        {mode === "automatic" ? (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Thời gian hiện tại
              </div>
              <div className="text-base font-bold text-slate-900">
                {currentInfo.formattedFullDate}
              </div>
              <div className="text-sm font-semibold text-teal-700 mt-0.5">
                {currentInfo.sessionLabel}
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSetMode("manual")}
            >
              Chọn thủ công
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-semibold text-slate-600">
                Chế độ chọn ca thủ công
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSetMode("automatic")}
              >
                Dùng thời gian hiện tại
              </Button>
            </div>

            {/* Bộ chọn Thứ */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Chọn Thứ:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((d) => {
                  const isActive = selectedDay === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleSelectDay(d)}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? "bg-teal-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bộ chọn Ca */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Chọn Ca:
              </label>
              <div className="flex flex-wrap gap-2">
                {SHIFTS.map((s) => {
                  const isActive = selectedShift === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSelectShift(s)}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? "bg-slate-800 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Sĩ số, Thống kê & Danh sách học sinh */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {displayTitle}
              </h2>
              <span className="text-xs font-semibold text-slate-600 mt-0.5 block">
                Sĩ số: {filteredRecords.length} học sinh
              </span>
            </div>

            {/* Thống kê điểm danh */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                Có mặt: {presentCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200/80">
                Vắng: {absentCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80">
                Muộn: {lateCount}
              </span>
            </div>
          </div>

          {attendanceLoading ? (
            <div className="py-8 text-center bg-teal-50/50 rounded-xl border border-teal-100 p-4 text-teal-800 text-sm font-medium flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5 text-teal-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Đang tải dữ liệu điểm danh...</span>
            </div>
          ) : attendanceError ? (
            <div className="py-6 bg-rose-50 rounded-xl border border-rose-200 p-4 flex items-center justify-between gap-4 text-rose-800 text-sm font-medium">
              <span>Không thể tải dữ liệu điểm danh.</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (activeDateToLoad && activeSessionToLoad && onViewChange) {
                    onViewChange(activeDateToLoad, activeSessionToLoad);
                  }
                }}
              >
                Thử lại
              </Button>
            </div>
          ) : mode === "automatic" && !currentInfo.session ? (
            <div className="py-8">
              <EmptyState
                title="Hiện không trong thời gian của ca học."
                description=""
              />
            </div>
          ) : (
            <>
              <AttendanceStudentList
                records={filteredRecords}
                students={students}
                classes={classes}
                attendanceMap={attendanceMap}
                notesMap={notesMap}
                finalizedSet={finalizedSet}
                attendanceRecordMap={attendanceRecordMap}
                disabled={
                  attendanceLoading ||
                  attendanceSaving ||
                  attendanceFinalizing ||
                  attendanceMarkingLate
                }
                onStatusChange={handleStatusChange}
                onOpenNoteModal={handleOpenNoteModal}
                onMarkAttendanceLate={onMarkAttendanceLate}
              />

              {filteredRecords.length > 0 && (
                <div className="pt-4 flex justify-center border-t border-slate-100">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto sm:min-w-[240px]"
                    onClick={handleSaveAttendance}
                    disabled={
                      attendanceLoading ||
                      attendanceSaving ||
                      attendanceFinalizing ||
                      attendanceMarkingLate ||
                      allFinalized
                    }
                  >
                    {attendanceSaving ? "Đang lưu..." : "Lưu điểm danh"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Modal Ghi chú điểm danh */}
      {(() => {
        const isTargetFinalized = activeNoteTarget
          ? finalizedSet.has(activeNoteTarget.record.extraStudyId)
          : false;

        return (
          <Modal
            open={!!activeNoteTarget}
            title="Ghi chú điểm danh"
            onClose={() => setActiveNoteTarget(null)}
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => setActiveNoteTarget(null)}
                >
                  {isTargetFinalized ? "Đóng" : "Hủy"}
                </Button>
                {!isTargetFinalized && (
                  <Button variant="primary" onClick={handleSaveNote}>
                    Lưu ghi chú
                  </Button>
                )}
              </>
            }
          >
            {activeNoteTarget && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1.5">
                  <div>
                    <span className="font-semibold text-slate-500">SBD:</span>{" "}
                    <span className="font-bold text-slate-900">
                      {activeNoteTarget.student.candidateNumber}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Tên ngắn:</span>{" "}
                    <span className="font-bold text-slate-900">
                      {getShortName(activeNoteTarget.student.fullName)}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">
                      Trạng thái hiện tại:
                    </span>{" "}
                    <span
                      className={`font-bold ${
                        (attendanceMap[activeNoteTarget.record.extraStudyId] ||
                          "present") === "present"
                          ? "text-emerald-700"
                          : (attendanceMap[activeNoteTarget.record.extraStudyId] ||
                              "present") === "absent"
                          ? "text-rose-700"
                          : "text-amber-700"
                      }`}
                    >
                      {(attendanceMap[activeNoteTarget.record.extraStudyId] ||
                        "present") === "present"
                        ? "Có mặt"
                        : (attendanceMap[activeNoteTarget.record.extraStudyId] ||
                            "present") === "absent"
                        ? "Vắng"
                        : "Muộn"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ghi chú
                  </label>
                  <textarea
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    disabled={isTargetFinalized}
                    placeholder={
                      isTargetFinalized
                        ? "Không có ghi chú"
                        : "Ví dụ: Nghỉ ốm, Xin phép, Đến lúc 18:10, Về sớm..."
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                  {isTargetFinalized && (
                    <p className="mt-1 text-xs text-amber-700 font-medium">
                      Học sinh đã được chốt điểm danh. Ghi chú chỉ ở trạng thái xem, không thể chỉnh sửa.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Modal>
        );
      })()}

      {/* Modal Xác nhận lưu điểm danh */}
      <AttendanceSaveModal
        open={isSaveModalOpen}
        onClose={() => {
          if (!attendanceSaving) {
            setIsSaveModalOpen(false);
          }
        }}
        onConfirm={handleConfirmSaveAttendance}
        saving={attendanceSaving}
        dateStr={modalDateStr}
        dayName={modalDayName}
        shiftName={modalShiftName}
        totalStudents={filteredRecords.length}
        presentCount={presentCount}
        absentCount={absentCount}
        lateCount={lateCount}
      />
    </div>
  );
}

