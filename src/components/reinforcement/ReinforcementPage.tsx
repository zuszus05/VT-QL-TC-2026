import { useState, useRef, useEffect, FormEvent } from "react";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { useToast } from "../../hooks/useToast";
import { Student } from "../../types/student";
import { SchoolClass } from "../../types/academic";
import { createStableId } from "../../utils/id";
import { getNextDateForWeekday } from "../../utils/date";
import { addDaysToDateStr } from "../../utils/dateRange";
import { shouldArchiveExtraStudyRecord } from "../../utils/extraStudyValidation";
import { CreateExtraStudyRecordInput } from "../../services/extraStudyService";
import {
  ReinforcementScheduleRecord,
  Weekday,
  ExtraStudyType,
  StudySession,
  ExtraSubject,
} from "../../types/extraStudy";
import {
  WEEKDAY_MAP,
  SESSION_MAP,
  STUDY_TYPE_MAP,
  SUBJECT_MAP,
  EXTRA_SUBJECT_LABELS,
  STUDY_TYPE_LABELS,
  WEEKDAY_LABELS,
  STUDY_SESSION_LABELS,
} from "../../constants/extraStudy";
import { ReinforcementDeleteModal } from "./ReinforcementDeleteModal";
import { ReinforcementMoveModal } from "./ReinforcementMoveModal";

const DAYS_OF_WEEK = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
] as const;

const SUBJECTS = ["Toán Đại", "Toán Hình", "KHTN", "Luyện Đề"] as const;
const STUDY_TYPES = ["Tăng cường", "Học bù"] as const;
const SHIFTS = ["Ca sáng", "Ca chiều", "Ca tối"] as const;
const GRADES = ["Khối 6", "Khối 7", "Khối 8", "Khối 9"] as const;

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

function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getShortName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
}

interface ReinforcementPageProps {
  records: ReinforcementScheduleRecord[];
  historyRecords?: ReinforcementScheduleRecord[];
  onRecordsChange: React.Dispatch<
    React.SetStateAction<ReinforcementScheduleRecord[]>
  >;
  students: Student[];
  classes: SchoolClass[];
  isLoading?: boolean;
  loadError?: string | null;
  onCreateRecords?: (
    inputs: Omit<CreateExtraStudyRecordInput, "createdByUserId" | "updatedByUserId">[]
  ) => Promise<ReinforcementScheduleRecord[]>;
  onDeleteRecord?: (extraStudyId: string) => Promise<void>;
  onMoveRecord?: (
    record: ReinforcementScheduleRecord,
    weekday: Weekday,
    targetDate: string,
    session: StudySession
  ) => Promise<void>;
  onLoadHistoryRange?: (
    startDate: string,
    endDate: string
  ) => Promise<ReinforcementScheduleRecord[]>;
}

export function ReinforcementPage({
  records: extraStudyRecords,
  historyRecords: extraStudyHistoryRecords = [],
  onRecordsChange: setExtraStudyRecords,
  students,
  classes,
  isLoading = false,
  loadError = null,
  onCreateRecords,
  onDeleteRecord,
  onMoveRecord,
  onLoadHistoryRange,
}: ReinforcementPageProps) {
  const { showToast } = useToast();

  const sbdInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  // State form controls
  const [grade, setGrade] = useState<string>("Khối 6");
  const [candidateNumbers, setCandidateNumbers] = useState<string>("");
  const [subject, setSubject] = useState<string>("Toán Đại");
  const [type, setType] = useState<string>("Tăng cường");
  const [dayOfWeek, setDayOfWeek] = useState<string>(getTodayDayName);
  const [shift, setShift] = useState<string>("Ca sáng");

  // State active tab for Area 2
  const [activeDayTab, setActiveDayTab] = useState<string>(getTodayDayName);

  // State chế độ xem (lịch hiện tại / lịch sử) & bộ lọc lịch sử
  const [viewMode, setViewMode] = useState<"active" | "history">("active");
  const [historyFilter, setHistoryFilter] = useState<
    "all" | "extra-study" | "make-up"
  >("all");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>(getTodayIsoDate);

  // Tải dữ liệu lịch sử theo khoảng ngày khi xem phần Lịch sử
  useEffect(() => {
    if (viewMode === "history" && onLoadHistoryRange) {
      if (selectedHistoryDate) {
        onLoadHistoryRange(selectedHistoryDate, selectedHistoryDate);
      } else {
        const todayStr = getTodayIsoDate();
        const past30Str = addDaysToDateStr(todayStr, -30);
        onLoadHistoryRange(past30Str, todayStr);
      }
    }
  }, [viewMode, selectedHistoryDate, onLoadHistoryRange]);

  // Tự động lưu trữ (archive) các bản ghi của ngày hiện tại khi truy cập trang sau 22:00
  useEffect(() => {
    const now = new Date();
    setExtraStudyRecords((prev) => {
      let hasChanges = false;
      const updated = prev.map((r) => {
        if (
          r.status === "scheduled" &&
          shouldArchiveExtraStudyRecord(r.targetDate, now)
        ) {
          hasChanges = true;
          return {
            ...r,
            status: "archived" as const,
            updatedAt: now.toISOString(),
          };
        }
        return r;
      });
      return hasChanges ? updated : prev;
    });
  }, []);

  // Extract numeric grade from string e.g. "Khối 6" -> 6
  const numericGrade = Number(grade.replace("Khối ", "").trim());

  // Parse candidate numbers input
  const parseSbdInput = () => {
    const rawParts = candidateNumbers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Deduplicate parts while preserving order
    const uniqueParts = Array.from(new Set(rawParts));

    const validParsedNumbers: number[] = [];
    const invalidInputs: string[] = [];

    for (const part of uniqueParts) {
      const num = Number(part);
      if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
        invalidInputs.push(part);
      } else {
        validParsedNumbers.push(num);
      }
    }

    const recognizedStudents: { sbd: number; student: Student }[] = [];
    const notFoundSbds: number[] = [];

    for (const sbd of validParsedNumbers) {
      const found = students.find(
        (s) => s.grade === numericGrade && s.candidateNumber === sbd
      );
      if (found) {
        recognizedStudents.push({ sbd, student: found });
      } else {
        notFoundSbds.push(sbd);
      }
    }

    return {
      invalidInputs,
      notFoundSbds,
      recognizedStudents,
    };
  };

  const { invalidInputs, notFoundSbds, recognizedStudents } = parseSbdInput();

  const handleRemoveSbd = (sbdToRemove: number) => {
    const parts = candidateNumbers
      .split(",")
      .map((s) => s.trim())
      .filter(
        (s) => s !== "" && Number(s) !== sbdToRemove && s !== String(sbdToRemove)
      );
    setCandidateNumbers(parts.join(", "));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isSaving || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      if (recognizedStudents.length === 0) {
        showToast("Vui lòng nhập ít nhất một SBD hợp lệ.", "error");
        return;
      }

      const internalWeekday = WEEKDAY_MAP[dayOfWeek] || (dayOfWeek as Weekday);
      const internalSession = SESSION_MAP[shift] || (shift as StudySession);
      const internalSubject = (SUBJECT_MAP[subject] || subject) as ExtraSubject;
      const internalTypeDef = STUDY_TYPE_MAP[type] || (type as ExtraStudyType);
      const targetDate = getNextDateForWeekday(internalWeekday);

      let hasDuplicate = false;
      const inputsToCreate: Omit<
        CreateExtraStudyRecordInput,
        "createdByUserId" | "updatedByUserId"
      >[] = [];

      for (const { student } of recognizedStudents) {
        const isDuplicate = extraStudyRecords.some(
          (r) =>
            r.studentId === student.studentId &&
            r.targetDate === targetDate &&
            r.session === internalSession
        );

        if (isDuplicate) {
          hasDuplicate = true;
        } else {
          inputsToCreate.push({
            studentId: student.studentId,
            subject: internalSubject,
            type: internalTypeDef,
            weekday: internalWeekday,
            targetDate,
            session: internalSession,
            status: "scheduled",
          });
        }
      }

      if (hasDuplicate) {
        showToast("Một số học sinh đã có trong ca này.", "warning");
      }

      if (inputsToCreate.length === 0) {
        return;
      }

      setIsSaving(true);

      try {
        if (onCreateRecords) {
          await onCreateRecords(inputsToCreate);
        } else {
          const now = new Date().toISOString();
          const fallbackRecords: ReinforcementScheduleRecord[] = inputsToCreate.map(
            (inp) => ({
              extraStudyId: createStableId("extra-study"),
              ...inp,
              createdAt: now,
              updatedAt: now,
            })
          );
          setExtraStudyRecords((prev) => [...prev, ...fallbackRecords]);
        }

        setCandidateNumbers("");
        sbdInputRef.current?.focus();
        setActiveDayTab(dayOfWeek);
        showToast("Đã thêm học sinh vào danh sách.", "success");
      } catch (error) {
        console.error("[ReinforcementPage] Lỗi khi lưu danh sách tăng cường:", error);
        showToast("Không thể lưu danh sách tăng cường. Vui lòng thử lại.", "error");
      } finally {
        setIsSaving(false);
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // State xử lý xóa record
  const [recordToDelete, setRecordToDelete] =
    useState<ReinforcementScheduleRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!recordToDelete || deletingRecordId) return;

    const targetId = recordToDelete.extraStudyId;
    setDeletingRecordId(targetId);

    try {
      if (onDeleteRecord) {
        await onDeleteRecord(targetId);
      } else {
        setExtraStudyRecords((prev) =>
          prev.filter((r) => r.extraStudyId !== targetId)
        );
      }
      setRecordToDelete(null);
      showToast("Đã xóa học sinh khỏi ca.", "success");
    } catch (error) {
      console.error("[ReinforcementPage] Lỗi khi xóa học sinh khỏi ca:", error);
      showToast("Không thể xóa học sinh khỏi ca. Vui lòng thử lại.", "error");
    } finally {
      setDeletingRecordId(null);
    }
  };

  const deleteStudent = recordToDelete
    ? students.find((s) => s.studentId === recordToDelete.studentId)
    : null;
  const deleteSchoolClass = deleteStudent
    ? classes.find((c) => c.classId === deleteStudent.classId)
    : null;

  // State xử lý chuyển lịch
  const [recordToMove, setRecordToMove] =
    useState<ReinforcementScheduleRecord | null>(null);
  const [movingRecordId, setMovingRecordId] = useState<string | null>(null);

  const handleConfirmMove = async (newDayOfWeek: string, newShift: string) => {
    if (!recordToMove || movingRecordId) return;

    const newWeekday = WEEKDAY_MAP[newDayOfWeek] || (newDayOfWeek as Weekday);
    const newSession = SESSION_MAP[newShift] || (newShift as StudySession);

    // Kiểm tra nếu chọn đúng thứ và ca hiện tại
    if (
      newWeekday === recordToMove.weekday &&
      newSession === recordToMove.session
    ) {
      showToast("Học sinh đang ở đúng ca này.", "info");
      return;
    }

    const newTargetDate = getNextDateForWeekday(newWeekday);

    // Kiểm tra trùng với record khác
    const isDuplicate = extraStudyRecords.some(
      (r) =>
        r.extraStudyId !== recordToMove.extraStudyId &&
        r.studentId === recordToMove.studentId &&
        r.targetDate === newTargetDate &&
        r.session === newSession
    );

    if (isDuplicate) {
      showToast("Học sinh đã có trong ca được chọn.", "warning");
      return;
    }

    const targetId = recordToMove.extraStudyId;
    setMovingRecordId(targetId);

    try {
      if (onMoveRecord) {
        await onMoveRecord(recordToMove, newWeekday, newTargetDate, newSession);
      } else {
        const now = new Date().toISOString();
        setExtraStudyRecords((prev) =>
          prev.map((r) => {
            if (r.extraStudyId === targetId) {
              return {
                ...r,
                weekday: newWeekday,
                targetDate: newTargetDate,
                session: newSession,
                updatedAt: now,
              };
            }
            return r;
          })
        );
      }

      setRecordToMove(null);
      setActiveDayTab(newDayOfWeek);
      showToast("Đã chuyển lịch học.", "success");
    } catch (error) {
      console.error("[ReinforcementPage] Lỗi khi chuyển ca tăng cường:", error);
      showToast("Không thể chuyển lịch học. Vui lòng thử lại.", "error");
    } finally {
      setMovingRecordId(null);
    }
  };

  const moveStudent = recordToMove
    ? students.find((s) => s.studentId === recordToMove.studentId)
    : null;
  const moveSchoolClass = moveStudent
    ? classes.find((c) => c.classId === moveStudent.classId)
    : null;

  // Helper định dạng ngày hiển thị DD/MM/YYYY
  const formatDateStr = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const SESSION_ORDER: Record<string, number> = {
    morning: 1,
    afternoon: 2,
    evening: 3,
  };

  // Danh sách lịch sử archived đã qua xử lý lọc & sắp xếp
  const archivedRecords = extraStudyHistoryRecords
    .filter((r) => r.status === "archived" || r.status === "cancelled")
    .filter((r) => {
      if (selectedHistoryDate && r.targetDate !== selectedHistoryDate) {
        return false;
      }
      if (historyFilter === "extra-study") return r.type === "extra-study";
      if (historyFilter === "make-up") return r.type === "make-up";
      return true;
    })
    .sort((a, b) => {
      // Ngày mới nhất trước nếu không chọn ngày cụ thể
      if (!selectedHistoryDate && a.targetDate !== b.targetDate) {
        return b.targetDate.localeCompare(a.targetDate);
      }
      // Cùng ngày: Ca sáng -> Ca chiều -> Ca tối
      const orderA = SESSION_ORDER[a.session] || 99;
      const orderB = SESSION_ORDER[b.session] || 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // Theo Khối tăng dần
      const studentA = students.find((s) => s.studentId === a.studentId);
      const studentB = students.find((s) => s.studentId === b.studentId);

      const gradeA = studentA?.grade ?? 999;
      const gradeB = studentB?.grade ?? 999;
      if (gradeA !== gradeB) {
        return gradeA - gradeB;
      }

      // Theo SBD tăng dần
      const sbdA = studentA?.candidateNumber ?? 999;
      const sbdB = studentB?.candidateNumber ?? 999;
      return sbdA - sbdB;
    });

  // Internal active weekday & target date for Area 2
  const activeWeekday = WEEKDAY_MAP[activeDayTab] || (activeDayTab as Weekday);
  const activeTargetDate = getNextDateForWeekday(activeWeekday);

  const currentTabRecords = extraStudyRecords.filter(
    (r) => r.targetDate === activeTargetDate && r.status === "scheduled"
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Danh sách Tăng cường
        </h1>
        <p className="text-sm text-slate-500 mt-1 hidden md:block">
          Quản lý học sinh học tăng cường và học bù theo từng ca trong tuần.
        </p>
      </div>

      {/* Grid 2 Khu Vực */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KHU VỰC 1: Xếp học sinh */}
        <Card className="lg:col-span-5 p-4 md:p-6">
          <div className="border-b border-slate-200 pb-3 mb-5">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-800 text-xs font-semibold">
                1
              </span>
              Xếp học sinh
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Bước 1 */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Bước 1: Chọn Khối
              </span>
              <div>
                <label
                  htmlFor="reinforcement-grade"
                  className="block text-xs font-semibold text-slate-700 mb-1 hidden md:block"
                >
                  Khối
                </label>
                <select
                  id="reinforcement-grade"
                  aria-label="Khối"
                  value={grade}
                  onChange={(e) => {
                    setGrade(e.target.value);
                    setCandidateNumbers("");
                  }}
                  className="w-full px-3 py-2 bg-white text-sm text-slate-900 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-colors"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bước 2 */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Bước 2: Chọn học sinh
              </span>

              {/* SBD */}
              <div>
                <label
                  htmlFor="reinforcement-sbd"
                  className="block text-xs font-semibold text-slate-700 mb-1 hidden md:block"
                >
                  SBD
                </label>
                <input
                  ref={sbdInputRef}
                  id="reinforcement-sbd"
                  aria-label="SBD"
                  type="text"
                  value={candidateNumbers}
                  onChange={(e) => setCandidateNumbers(e.target.value)}
                  placeholder="Nhập SBD..."
                  className="w-full px-3 py-2 bg-white text-sm text-slate-900 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-colors"
                />
                <div className="hidden md:flex justify-between items-center mt-1">
                  <p className="text-xs text-slate-500">
                    Có thể nhập nhiều SBD, cách nhau bằng dấu phẩy.
                  </p>
                  <span className="text-xs text-slate-400 font-mono">Ví dụ: 1,2,5,12</span>
                </div>
              </div>

              {/* Lỗi nhập không hợp lệ hoặc SBD không tìm thấy */}
              {(invalidInputs.length > 0 || notFoundSbds.length > 0) && (
                <div className="space-y-1 text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200/80 rounded-lg p-2.5">
                  {invalidInputs.map((item) => (
                    <div key={`invalid-${item}`} className="flex items-center gap-1.5">
                      <span>⚠</span>
                      <span>SBD {item} không hợp lệ.</span>
                    </div>
                  ))}
                  {notFoundSbds.map((sbd) => (
                    <div key={`notfound-${sbd}`} className="flex items-center gap-1.5">
                      <span>⚠</span>
                      <span>
                        Không tìm thấy SBD {sbd} trong {grade}.
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Học sinh đã nhận diện */}
              {recognizedStudents.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Học sinh đã nhận diện ({recognizedStudents.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {recognizedStudents.map(({ sbd, student }) => {
                      const shortName = getShortName(student.fullName);
                      return (
                        <div
                          key={student.studentId}
                          className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-900 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-2xs"
                        >
                          <span className="text-teal-600 font-bold">✓</span>
                          <span className="font-mono text-teal-800 font-bold">
                            {sbd}
                          </span>
                          <span className="text-slate-800">{shortName}</span>
                          <button
                            type="button"
                            aria-label={`Bỏ học sinh SBD ${sbd}`}
                            onClick={() => handleRemoveSbd(sbd)}
                            className="ml-1 text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer leading-none"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Môn & Loại hình */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label
                    htmlFor="reinforcement-subject"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Môn
                  </label>
                  <select
                    id="reinforcement-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-sm text-slate-900 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-colors"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reinforcement-type"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Loại hình
                  </label>
                  <select
                    id="reinforcement-type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-sm text-slate-900 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-colors"
                  >
                    {STUDY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Thứ & Ca */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reinforcement-day"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Thứ
                  </label>
                  <select
                    id="reinforcement-day"
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-sm text-slate-900 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-colors"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reinforcement-shift"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Ca
                  </label>
                  <select
                    id="reinforcement-shift"
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-sm text-slate-900 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-colors"
                  >
                    {SHIFTS.map((sh) => (
                      <option key={sh} value={sh}>
                        {sh}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Nút Submit */}
            <Button
              variant="primary"
              type="submit"
              disabled={isSaving}
              className="w-full justify-center"
            >
              {isSaving ? "Đang lưu..." : "Lưu vào danh sách"}
            </Button>
          </form>
        </Card>

        {/* KHU VỰC 2: Danh sách các ca học trong tuần hoặc Lịch sử */}
        <Card className="lg:col-span-7 p-4 md:p-6">
          <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-800 text-xs font-semibold">
                2
              </span>
              {viewMode === "history"
                ? "Lịch sử tăng cường"
                : "Danh sách các ca học trong tuần"}
            </h2>

            {viewMode === "history" && !isLoading && !loadError && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setViewMode("active")}
              >
                Quay lại lịch hiện tại
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="py-8 text-center bg-teal-50/50 rounded-xl border border-teal-100 p-4 text-teal-800 text-sm font-medium">
              {viewMode === "history"
                ? "Đang tải lịch sử..."
                : "Đang tải danh sách tăng cường..."}
            </div>
          ) : loadError ? (
            <div className="py-8 text-center bg-rose-50 rounded-xl border border-rose-200 p-4 text-rose-800 text-sm font-medium">
              {viewMode === "history"
                ? "Không thể tải lịch sử tăng cường."
                : "Không thể tải danh sách tăng cường từ Firestore."}
            </div>
          ) : viewMode === "active" ? (
            <>
              {/* Tabs Ngày trong tuần & Lịch sử */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-6">
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const isActive = activeDayTab === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setActiveDayTab(d)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
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

                <button
                  type="button"
                  onClick={() => setViewMode("history")}
                  className="px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200/80 transition-colors cursor-pointer flex items-center gap-1"
                >
                  📜 Lịch sử
                </button>
              </div>

              {/* 3 Cột: Ca sáng, Ca chiều, Ca tối */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SHIFTS.map((sLabel) => {
                  const shiftCode = SESSION_MAP[sLabel] || "morning";
                  const shiftRecords = currentTabRecords.filter(
                    (r) => r.session === shiftCode
                  );

                  return (
                    <div
                      key={sLabel}
                      className="bg-slate-50/60 rounded-xl border border-slate-200 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <h3 className="text-sm font-bold text-slate-800">
                          {sLabel}
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                          {shiftRecords.length} học sinh
                        </span>
                      </div>

                      {shiftRecords.length === 0 ? (
                        <div className="py-4">
                          <EmptyState
                            title="Chưa có học sinh."
                            description=""
                          />
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {shiftRecords.map((rec) => {
                            const student = students.find(
                              (s) => s.studentId === rec.studentId
                            );
                            if (!student) return null;

                            const schoolClass = classes.find(
                              (c) => c.classId === student.classId
                            );
                            const className = schoolClass?.className || "—";
                            const shortName = getShortName(student.fullName);
                            const subjectLabel =
                              EXTRA_SUBJECT_LABELS[rec.subject] || rec.subject;
                            const typeLabel =
                              STUDY_TYPE_LABELS[rec.type] || rec.type;

                            return (
                              <div
                                key={rec.extraStudyId}
                                className="bg-white rounded-lg border border-slate-200/90 p-3 shadow-2xs space-y-1"
                              >
                                <div className="flex items-center justify-between text-xs font-semibold">
                                  <span className="text-slate-700 font-bold">
                                    {className}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                        rec.type === "extra-study"
                                          ? "bg-amber-100/80 text-amber-900 border border-amber-200/60"
                                          : "bg-purple-100/80 text-purple-900 border border-purple-200/60"
                                      }`}
                                    >
                                      {typeLabel}
                                    </span>
                                    <button
                                      type="button"
                                      aria-label={`Chuyển lịch học sinh SBD ${student.candidateNumber}`}
                                      onClick={() => setRecordToMove(rec)}
                                      className="text-slate-500 hover:text-sky-600 hover:bg-sky-50 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border border-slate-200/80"
                                      title="Chuyển lịch"
                                    >
                                      Chuyển
                                    </button>
                                    <button
                                      type="button"
                                      aria-label={`Xóa học sinh SBD ${student.candidateNumber} khỏi ca`}
                                      onClick={() => setRecordToDelete(rec)}
                                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 transition-colors cursor-pointer text-xs font-bold leading-none ml-0.5"
                                      title="Xóa khỏi ca"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                                <div className="text-sm font-bold text-slate-900">
                                  {student.candidateNumber} — {shortName}
                                </div>
                                <div className="text-xs font-medium text-slate-500">
                                  {subjectLabel}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-slate-500 mt-4 text-center italic">
                Danh sách của ngày hiện tại sẽ được ẩn sau 22:00 và vẫn được
                giữ trong lịch sử.
              </p>
            </>
          ) : (
            /* GIAO DIỆN LỊCH SỬ ARCHIVED */
            <div className="space-y-4">
              {/* Bộ lọc ngày & loại hình */}
              <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="history-date-filter"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Ngày cần xem:
                    </label>
                    <input
                      id="history-date-filter"
                      type="date"
                      value={selectedHistoryDate}
                      onChange={(e) => setSelectedHistoryDate(e.target.value)}
                      className="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryDate("")}
                      className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-white hover:bg-teal-50 rounded-lg border border-teal-200/80 transition-colors cursor-pointer"
                    >
                      Tất cả ngày
                    </button>
                  </div>

                  <span className="text-xs font-semibold text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-full">
                    {archivedRecords.length} bản ghi
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <span className="text-xs font-semibold text-slate-700">
                    Bộ lọc loại hình:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        { id: "all", label: "Tất cả" },
                        { id: "extra-study", label: "Tăng cường" },
                        { id: "make-up", label: "Học bù" },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setHistoryFilter(f.id)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                          historyFilter === f.id
                            ? "bg-white text-teal-700 shadow-2xs border border-slate-200"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Danh sách record archived */}
              {archivedRecords.length === 0 ? (
                <div className="py-8">
                  <EmptyState
                    title="Không có dữ liệu lịch sử trong ngày này."
                    description=""
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {archivedRecords.map((rec) => {
                    const student = students.find(
                      (s) => s.studentId === rec.studentId
                    );
                    const schoolClass = student
                      ? classes.find((c) => c.classId === student.classId)
                      : null;
                    const className =
                      schoolClass?.className || (student ? "—" : "Chưa xác định");
                    const shortName = student
                      ? getShortName(student.fullName)
                      : "Không tìm thấy học sinh";
                    const candidateText = student
                      ? `SBD ${student.candidateNumber}`
                      : "SBD —";
                    const subjectLabel =
                      EXTRA_SUBJECT_LABELS[rec.subject] || rec.subject;
                    const typeLabel =
                      STUDY_TYPE_LABELS[rec.type] || rec.type;
                    const weekdayLabel =
                      WEEKDAY_LABELS[rec.weekday] || rec.weekday;
                    const sessionLabel =
                      STUDY_SESSION_LABELS[rec.session] || rec.session;
                    const statusLabel =
                      rec.status === "archived"
                        ? "Đã lưu trữ"
                        : rec.status === "cancelled"
                        ? "Đã hủy"
                        : "Đã xong";

                    return (
                      <div
                        key={rec.extraStudyId}
                        className="bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded">
                              {formatDateStr(rec.targetDate)}
                            </span>
                            <span className="font-semibold text-slate-600">
                              {weekdayLabel} — {sessionLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                rec.type === "extra-study"
                                  ? "bg-amber-100/80 text-amber-900 border border-amber-200/60"
                                  : "bg-purple-100/80 text-purple-900 border border-purple-200/60"
                              }`}
                            >
                              {typeLabel}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                rec.status === "cancelled"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-xs">
                          <div>
                            <span className="font-bold text-slate-900 text-sm mr-2">
                              {candidateText} — {shortName}
                            </span>
                            <span className="text-slate-500 font-medium">
                              ({className})
                            </span>
                          </div>
                          <div className="font-semibold text-slate-700">
                            Môn: {subjectLabel}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <ReinforcementDeleteModal
        open={!!recordToDelete}
        record={recordToDelete}
        studentShortName={deleteStudent ? getShortName(deleteStudent.fullName) : ""}
        candidateNumber={deleteStudent?.candidateNumber || ""}
        className={deleteSchoolClass?.className || "—"}
        subjectLabel={
          recordToDelete
            ? EXTRA_SUBJECT_LABELS[recordToDelete.subject] || recordToDelete.subject
            : ""
        }
        typeLabel={
          recordToDelete
            ? STUDY_TYPE_LABELS[recordToDelete.type] || recordToDelete.type
            : ""
        }
        weekdayLabel={
          recordToDelete
            ? WEEKDAY_LABELS[recordToDelete.weekday] || recordToDelete.weekday
            : ""
        }
        sessionLabel={
          recordToDelete
            ? STUDY_SESSION_LABELS[recordToDelete.session] || recordToDelete.session
            : ""
        }
        onClose={() => {
          if (!deletingRecordId) {
            setRecordToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={deletingRecordId === recordToDelete?.extraStudyId}
      />

      <ReinforcementMoveModal
        open={!!recordToMove}
        record={recordToMove}
        studentShortName={moveStudent ? getShortName(moveStudent.fullName) : ""}
        candidateNumber={moveStudent?.candidateNumber || ""}
        className={moveSchoolClass?.className || "—"}
        subjectLabel={
          recordToMove
            ? EXTRA_SUBJECT_LABELS[recordToMove.subject] || recordToMove.subject
            : ""
        }
        typeLabel={
          recordToMove
            ? STUDY_TYPE_LABELS[recordToMove.type] || recordToMove.type
            : ""
        }
        currentWeekdayLabel={
          recordToMove
            ? WEEKDAY_LABELS[recordToMove.weekday] || recordToMove.weekday
            : ""
        }
        currentSessionLabel={
          recordToMove
            ? STUDY_SESSION_LABELS[recordToMove.session] || recordToMove.session
            : ""
        }
        onClose={() => {
          if (!movingRecordId) {
            setRecordToMove(null);
          }
        }}
        onConfirm={handleConfirmMove}
        isMoving={movingRecordId === recordToMove?.extraStudyId}
      />
    </div>
  );
}

