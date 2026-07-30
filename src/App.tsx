import { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./lib/firebase";
import { getTeacherProfile } from "./services/teacherProfileService";
import { signOutUser } from "./services/authService";
import { getAllClasses } from "./services/classService";
import { getAllStudents } from "./services/studentService";
import {
  loadExtraStudyRecords,
  loadExtraStudyRecordsByDateRange,
  subscribeExtraStudyRecordsByDateRange,
  createExtraStudyRecords,
  deleteExtraStudyRecord,
  updateExtraStudySchedule,
  archiveExtraStudyRecords,
  CreateExtraStudyRecordInput,
} from "./services/extraStudyService";
import { formatLocalDate, addDaysToDateStr } from "./utils/dateRange";
import {
  loadAttendanceRecords,
  saveAttendanceRecords,
  finalizeAttendanceRecords,
  markAttendanceLate,
  loadAttendanceRecordsByDate,
  loadAttendanceRecordsByMonth,
  updateAttendanceMadeUpStatus,
} from "./services/attendanceService";
import { createTeacherAccount, getAllTeachers, CreateTeacherParams } from "./services/teacherService";
import { TeacherProfile } from "./types/teacher";
import { shouldArchiveExtraStudyRecord } from "./utils/extraStudyValidation";
import { upsertById, upsertManyById } from "./utils/stateHelpers";
import { useToast } from "./hooks/useToast";
import { Weekday, StudySession } from "./types/extraStudy";
import { LoginPage } from "./components/auth/LoginPage";
import { UserProfile } from "./types/user";
import { AppTab } from "./types/navigation";
import { Student } from "./types/student";
import { SchoolClass } from "./types/academic";
import { MOCK_EXTRA_STUDY_RECORDS } from "./mocks/extraStudy";
import { ReinforcementScheduleRecord } from "./types/extraStudy";
import { AttendanceRecord, AttendanceStatus } from "./types/attendance";
import { validateMockAcademicData } from "./utils/academic";
import { runDataModelChecks } from "./utils/dataModelChecks";
import { runFirebaseChecks } from "./utils/firebaseChecks";
import { NAV_ITEMS } from "./config/navigation";
import { ToastProvider } from "./components/common/Toast";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./components/dashboard/Dashboard";
import { StudentsPage } from "./components/students/StudentsPage";
import { ReinforcementPage } from "./components/reinforcement/ReinforcementPage";
import { AttendancePage } from "./components/attendance/AttendancePage";
import { ReportPage } from "./components/reports/ReportPage";
import { TeachersPage } from "./components/teachers/TeachersPage";

// Giới hạn số lượng entry tối đa cho từng RAM cache (Step 13C2-02)
const EXTRA_STUDY_RANGE_CACHE_MAX = 20;
const ATTENDANCE_EXTRA_STUDY_CACHE_MAX = 20;
const DAILY_REPORT_CACHE_MAX = 31;
const MONTHLY_REPORT_CACHE_MAX = 12;

/**
 * Helper lưu entry vào RAM cache Map với giới hạn dung lượng và LRU eviction policy.
 */
function setBoundedCacheEntry<K, V>(
  cache: Map<K, V>,
  key: K,
  value: V,
  maxEntries: number
): void {
  if (maxEntries <= 0) {
    cache.clear();
    return;
  }
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, value);
  while (cache.size > maxEntries) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    } else {
      break;
    }
  }
}

/**
 * Helper đọc entry từ RAM cache Map với LRU refresh (đưa key vừa đọc về cuối Map).
 */
function getBoundedCacheEntry<K, V>(
  cache: Map<K, V>,
  key: K
): V | undefined {
  if (!cache.has(key)) {
    return undefined;
  }
  const value = cache.get(key)!;
  cache.delete(key);
  cache.set(key, value);
  return value;
}

/**
 * Helper kiểm tra 1 bản ghi điểm danh có thay đổi so với bản gốc đã tải từ Firestore hay không (Step 13C2-03-Fix).
 */
function hasAttendanceRecordChanged(
  existingRecord: AttendanceRecord | undefined,
  nextStatus: AttendanceStatus,
  nextNote: string
): boolean {
  if (!existingRecord) {
    return true; // Bản ghi mới chưa có trong Firestore
  }

  if (existingRecord.status !== nextStatus) {
    return true; // Trạng thái điểm danh thay đổi
  }

  const existingNote =
    typeof existingRecord.note === "string"
      ? existingRecord.note
      : "";

  const nextNoteNormalized =
    typeof nextNote === "string"
      ? nextNote
      : "";

  if (existingNote !== nextNoteNormalized) {
    return true; // Ghi chú thay đổi
  }

  return false;
}

function AppContent() {
  const { showToast } = useToast();
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const getDefaultTab = (role: string): AppTab => {
    return role === "admin" ? "dashboard" : "students";
  };

  const [activeTab, setActiveTab] = useState<AppTab>("students");

  // State danh sách học sinh và lớp dùng chung
  const [students, setStudents] = useState<Student[]>([]);

  const [studentsLoading, setStudentsLoading] = useState<boolean>(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classesLoading, setClassesLoading] = useState<boolean>(false);
  const [classesError, setClassesError] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    setClassesLoading(true);
    setClassesError(null);
    try {
      const data = await getAllClasses();
      setClasses(data);
    } catch (err) {
      console.error("[App] Lỗi tải danh sách lớp từ Firestore:", err);
      setClassesError("Không thể tải danh sách lớp học từ Firestore.");
      setClasses([]);
    } finally {
      setClassesLoading(false);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    setStudentsError(null);
    try {
      const data = await getAllStudents();
      setStudents(data);
    } catch (err) {
      console.error("[App] Lỗi tải danh sách học sinh từ Firestore:", err);
      setStudentsError("Không thể tải danh sách học sinh từ Firestore.");
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  // State danh sách giáo viên dùng chung (Admin-only)
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [teachersLoading, setTeachersLoading] = useState<boolean>(false);
  const [teachersError, setTeachersError] = useState<string | null>(null);
  const teachersLoadedRef = useRef<boolean>(false);

  const loadTeachers = useCallback(async (force = false) => {
    if (teachersLoadedRef.current && !force) return;
    setTeachersLoading(true);
    setTeachersError(null);
    try {
      const data = await getAllTeachers();
      setTeachers(data);
      teachersLoadedRef.current = true;
    } catch (err) {
      console.error("[App] Lỗi tải danh sách giáo viên từ Firestore:", err);
      setTeachersError("Không thể tải danh sách giáo viên.");
      setTeachers([]);
    } finally {
      setTeachersLoading(false);
    }
  }, []);

  // State điểm danh hôm nay riêng cho Overview/Dashboard (Admin-only)
  const [todayAttendanceRecords, setTodayAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [todayAttendanceLoading, setTodayAttendanceLoading] = useState<boolean>(false);
  const [todayAttendanceError, setTodayAttendanceError] = useState<string | null>(null);
  const todayAttendanceLoadedDateRef = useRef<string | null>(null);

  const getTodayDateStr = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const loadTodayAttendance = useCallback(async (force = false) => {
    const todayStr = getTodayDateStr();
    if (todayAttendanceLoadedDateRef.current === todayStr && !force) {
      return;
    }
    setTodayAttendanceLoading(true);
    setTodayAttendanceError(null);
    try {
      const records = await loadAttendanceRecordsByDate(todayStr);
      setTodayAttendanceRecords(records);
      todayAttendanceLoadedDateRef.current = todayStr;
    } catch (err) {
      console.error("[App] Lỗi tải bản ghi điểm danh hôm nay cho Overview:", err);
      setTodayAttendanceError("Không thể tải dữ liệu điểm danh hôm nay.");
      setTodayAttendanceRecords([]);
    } finally {
      setTodayAttendanceLoading(false);
    }
  }, [getTodayDateStr]);

  // State danh sách lịch tăng cường / học bù dùng chung cho DS Tăng cường (active range ±7 ngày)
  const [extraStudyRecords, setExtraStudyRecords] = useState<
    ReinforcementScheduleRecord[]
  >([]);
  // State riêng cho Lịch sử tăng cường
  const [extraStudyHistoryRecords, setExtraStudyHistoryRecords] = useState<
    ReinforcementScheduleRecord[]
  >([]);
  // State riêng cho Điểm danh (khi xem ngày ngoài active range)
  const [attendanceExtraStudyRecords, setAttendanceExtraStudyRecords] = useState<
    ReinforcementScheduleRecord[]
  >([]);

  const [extraStudyLoading, setExtraStudyLoading] = useState<boolean>(false);
  const [extraStudyError, setExtraStudyError] = useState<string | null>(null);

  const activeStartDateRef = useRef<string>("");
  const activeEndDateRef = useRef<string>("");
  const pendingExtraStudyRecordsRef = useRef<Map<string, ReinforcementScheduleRecord>>(new Map());
  const extraStudyRangeCacheRef = useRef<Map<string, ReinforcementScheduleRecord[]>>(new Map());
  const attendanceExtraStudyCacheRef = useRef<Map<string, ReinforcementScheduleRecord[]>>(new Map());
  const dailyReportCacheRef = useRef<Map<string, AttendanceRecord[]>>(new Map());
  const monthlyReportCacheRef = useRef<Map<string, AttendanceRecord[]>>(new Map());
  const currentAttendanceDateRef = useRef<string>("");
  const latestExtraStudyHistoryRequestRef = useRef<number>(0);

  // State key ngày hiện tại (YYYY-MM-DD) để chủ động đổi active range khi qua ngày mới
  const [currentDateKey, setCurrentDateKey] = useState<string>(() =>
    formatLocalDate(new Date())
  );
  const lastHiddenTimeRef = useRef<number | null>(null);

  const invalidateExtraStudyRangeCacheForDate = useCallback((dateStr: string) => {
    if (!dateStr) return;
    const target = dateStr.trim();
    for (const key of Array.from(extraStudyRangeCacheRef.current.keys())) {
      const [start, end] = key.split("|");
      if (start && end && target >= start && target <= end) {
        extraStudyRangeCacheRef.current.delete(key);
      }
    }
    attendanceExtraStudyCacheRef.current.delete(target);
  }, []);

  // Lắng nghe realtime extraStudyRecords trong phạm vi active ±7 ngày tính từ currentDateKey
  useEffect(() => {
    if (!currentUser) {
      setExtraStudyRecords([]);
      setExtraStudyLoading(false);
      setExtraStudyError(null);
      return;
    }

    setExtraStudyLoading(true);
    setExtraStudyError(null);

    const startDate = addDaysToDateStr(currentDateKey, -7);
    const endDate = addDaysToDateStr(currentDateKey, 7);

    activeStartDateRef.current = startDate;
    activeEndDateRef.current = endDate;

    const unsubscribe = subscribeExtraStudyRecordsByDateRange(
      startDate,
      endDate,
      (records) => {
        const start = activeStartDateRef.current;
        const end = activeEndDateRef.current;
        const pendingRecords = Array.from(
          pendingExtraStudyRecordsRef.current.values()
        ).filter((r) => {
          if (start && end && r.targetDate) {
            return r.targetDate >= start && r.targetDate <= end;
          }
          return true;
        });

        const mergedRecords = upsertManyById(
          records,
          pendingRecords,
          (record) => record.extraStudyId
        );

        setExtraStudyRecords(mergedRecords);
        setExtraStudyLoading(false);
        setExtraStudyError(null);
      },
      (error) => {
        console.error("[App] Lỗi realtime danh sách tăng cường từ Firestore:", error);
        setExtraStudyError("Không thể tải danh sách học tăng cường từ Firestore.");
        setExtraStudyLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser, currentDateKey]);

  // Vòng đời ứng dụng: Xử lý Sleep / Resume / Online / Chuyển ngày mới (13D5-B)
  useEffect(() => {
    const handleCheckResumeAndDateChange = () => {
      const todayStr = formatLocalDate(new Date());
      setCurrentDateKey((prevDateKey) => {
        if (prevDateKey !== todayStr) {
          return todayStr;
        }
        return prevDateKey;
      });

      // Nếu quay lại sau khi background quá 5 phút (300,000 ms), xóa RAM cache dữ liệu cũ
      if (lastHiddenTimeRef.current !== null) {
        const hiddenDuration = Date.now() - lastHiddenTimeRef.current;
        if (hiddenDuration > 300000) {
          extraStudyRangeCacheRef.current.clear();
          attendanceExtraStudyCacheRef.current.clear();
          dailyReportCacheRef.current.clear();
          monthlyReportCacheRef.current.clear();
        }
        lastHiddenTimeRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        lastHiddenTimeRef.current = Date.now();
      } else if (document.visibilityState === "visible") {
        handleCheckResumeAndDateChange();
      }
    };

    const handlePageShow = () => {
      handleCheckResumeAndDateChange();
    };

    const handleOnline = () => {
      handleCheckResumeAndDateChange();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Tải phạm vi ngày cho Lịch sử (với RAM Cache) - KHÔNG gộp vào active state extraStudyRecords
  const handleLoadExtraStudyRange = useCallback(
    async (startDate: string, endDate: string): Promise<ReinforcementScheduleRecord[]> => {
      const trimmedStart = startDate.trim();
      const trimmedEnd = endDate.trim();
      if (!trimmedStart || !trimmedEnd) return [];

      const requestId = ++latestExtraStudyHistoryRequestRef.current;

      const cacheKey = `${trimmedStart}|${trimmedEnd}`;
      const cached = getBoundedCacheEntry(extraStudyRangeCacheRef.current, cacheKey);
      if (cached !== undefined) {
        if (requestId === latestExtraStudyHistoryRequestRef.current) {
          setExtraStudyHistoryRecords(cached);
        }
        return cached;
      }

      try {
        const fetched = await loadExtraStudyRecordsByDateRange(trimmedStart, trimmedEnd);
        setBoundedCacheEntry(
          extraStudyRangeCacheRef.current,
          cacheKey,
          fetched,
          EXTRA_STUDY_RANGE_CACHE_MAX
        );
        if (requestId === latestExtraStudyHistoryRequestRef.current) {
          setExtraStudyHistoryRecords(fetched);
        }
        return fetched;
      } catch (err) {
        console.error(`[App] Lỗi khi tải extraStudyRecords history range (${trimmedStart} - ${trimmedEnd}):`, err);
        if (requestId === latestExtraStudyHistoryRequestRef.current) {
          setExtraStudyHistoryRecords([]);
        }
        return [];
      }
    },
    []
  );

  const handleCreateExtraStudyRecords = useCallback(
    async (
      inputs: Omit<CreateExtraStudyRecordInput, "createdByUserId" | "updatedByUserId">[]
    ): Promise<ReinforcementScheduleRecord[]> => {
      const userId = fbUser?.uid || currentUser?.id;
      if (!userId) {
        throw new Error("Người dùng chưa đăng nhập.");
      }

      const fullInputs: CreateExtraStudyRecordInput[] = inputs.map((inp) => ({
        ...inp,
        createdByUserId: userId,
        updatedByUserId: userId,
      }));

      let preparedForThisCall: ReinforcementScheduleRecord[] = [];

      try {
        const newRecords = await createExtraStudyRecords(
          fullInputs,
          (preparedRecords) => {
            preparedForThisCall = preparedRecords;
            const start = activeStartDateRef.current;
            const end = activeEndDateRef.current;

            for (const rec of preparedRecords) {
              pendingExtraStudyRecordsRef.current.set(rec.extraStudyId, rec);
              if (rec.targetDate) {
                invalidateExtraStudyRangeCacheForDate(rec.targetDate);
              }
            }

            const recordsToUpsert = preparedRecords.filter((rec) => {
              if (start && end && rec.targetDate) {
                return rec.targetDate >= start && rec.targetDate <= end;
              }
              return true;
            });

            setExtraStudyRecords((prev) =>
              upsertManyById(prev, recordsToUpsert, (r) => r.extraStudyId)
            );
          }
        );

        for (const rec of newRecords) {
          pendingExtraStudyRecordsRef.current.delete(rec.extraStudyId);
          if (rec.targetDate) {
            invalidateExtraStudyRangeCacheForDate(rec.targetDate);
          }
        }

        const start = activeStartDateRef.current;
        const end = activeEndDateRef.current;
        const recordsToUpsert = newRecords.filter((rec) => {
          if (start && end && rec.targetDate) {
            return rec.targetDate >= start && rec.targetDate <= end;
          }
          return true;
        });

        setExtraStudyRecords((prev) =>
          upsertManyById(prev, recordsToUpsert, (r) => r.extraStudyId)
        );

        return newRecords;
      } catch (error) {
        console.error("[App] Lỗi khi tạo extraStudyRecords:", error);

        const createdIds = new Set(
          preparedForThisCall.map((rec) => rec.extraStudyId)
        );

        for (const rec of preparedForThisCall) {
          pendingExtraStudyRecordsRef.current.delete(rec.extraStudyId);
          if (rec.targetDate) {
            invalidateExtraStudyRangeCacheForDate(rec.targetDate);
          }
        }

        setExtraStudyRecords((prev) =>
          prev.filter((rec) => !createdIds.has(rec.extraStudyId))
        );

        throw error;
      }
    },
    [fbUser, currentUser, invalidateExtraStudyRangeCacheForDate]
  );

  const handleDeleteExtraStudyRecord = useCallback(
    async (extraStudyId: string): Promise<void> => {
      if (!extraStudyId || !extraStudyId.trim()) {
        throw new Error("extraStudyId không hợp lệ.");
      }

      const targetRecord =
        extraStudyRecords.find((r) => r.extraStudyId === extraStudyId) ||
        extraStudyHistoryRecords.find((r) => r.extraStudyId === extraStudyId) ||
        attendanceExtraStudyRecords.find((r) => r.extraStudyId === extraStudyId);

      await deleteExtraStudyRecord(extraStudyId);

      if (targetRecord?.targetDate) {
        invalidateExtraStudyRangeCacheForDate(targetRecord.targetDate);
      }

      setExtraStudyRecords((prev) =>
        prev.filter((record) => record.extraStudyId !== extraStudyId)
      );
      setExtraStudyHistoryRecords((prev) =>
        prev.filter((record) => record.extraStudyId !== extraStudyId)
      );
      setAttendanceExtraStudyRecords((prev) =>
        prev.filter((record) => record.extraStudyId !== extraStudyId)
      );
    },
    [
      extraStudyRecords,
      extraStudyHistoryRecords,
      attendanceExtraStudyRecords,
      invalidateExtraStudyRangeCacheForDate,
    ]
  );

  const handleMoveExtraStudyRecord = useCallback(
    async (
      record: ReinforcementScheduleRecord,
      weekday: Weekday,
      targetDate: string,
      session: StudySession
    ): Promise<void> => {
      const userId = fbUser?.uid || currentUser?.id;
      if (!userId) {
        throw new Error("Người dùng chưa đăng nhập.");
      }
      const extraStudyId = record.extraStudyId;
      if (!extraStudyId || !extraStudyId.trim()) {
        throw new Error("extraStudyId không hợp lệ.");
      }
      const newTargetDate = targetDate.trim();
      if (!newTargetDate) {
        throw new Error("targetDate không hợp lệ.");
      }

      const oldTargetDate = record.targetDate;

      await updateExtraStudySchedule(extraStudyId, {
        weekday,
        targetDate: newTargetDate,
        session,
        updatedByUserId: userId,
      });

      if (oldTargetDate) invalidateExtraStudyRangeCacheForDate(oldTargetDate);
      if (newTargetDate) invalidateExtraStudyRangeCacheForDate(newTargetDate);

      const nowIso = new Date().toISOString();
      const updatedRecord: ReinforcementScheduleRecord = {
        ...record,
        weekday,
        targetDate: newTargetDate,
        session,
        updatedByUserId: userId,
        updatedAt: nowIso,
      };

      const start = activeStartDateRef.current;
      const end = activeEndDateRef.current;
      const isNewInActiveRange = Boolean(
        start && end && newTargetDate >= start && newTargetDate <= end
      );

      setExtraStudyRecords((prev) => {
        if (isNewInActiveRange) {
          return upsertById(prev, updatedRecord, (r) => r.extraStudyId);
        } else {
          return prev.filter((r) => r.extraStudyId !== extraStudyId);
        }
      });

      setExtraStudyHistoryRecords((prev) => {
        if (prev.some((r) => r.extraStudyId === extraStudyId)) {
          return prev.map((r) => (r.extraStudyId === extraStudyId ? updatedRecord : r));
        }
        return prev;
      });

      setAttendanceExtraStudyRecords((prev) => {
        if (prev.some((r) => r.extraStudyId === extraStudyId)) {
          return prev.map((r) => (r.extraStudyId === extraStudyId ? updatedRecord : r));
        }
        return prev;
      });
    },
    [fbUser, currentUser, invalidateExtraStudyRangeCacheForDate]
  );

  const handleArchiveDueExtraStudyRecords = useCallback(
    async (dueRecords: ReinforcementScheduleRecord[]): Promise<void> => {
      const userId = fbUser?.uid || currentUser?.id;
      if (!userId) {
        return;
      }
      const idsToArchive = dueRecords
        .map((r) => r.extraStudyId)
        .filter((id) => typeof id === "string" && id.trim().length > 0);

      if (idsToArchive.length === 0) {
        return;
      }

      try {
        await archiveExtraStudyRecords(idsToArchive, userId);

        for (const r of dueRecords) {
          if (r.targetDate) {
            invalidateExtraStudyRangeCacheForDate(r.targetDate);
          }
        }

        const nowIso = new Date().toISOString();
        const archivedIdSet = new Set(idsToArchive);

        setExtraStudyRecords((prev) =>
          prev.map((record) => {
            if (archivedIdSet.has(record.extraStudyId)) {
              return {
                ...record,
                status: "archived",
                updatedByUserId: userId,
                updatedAt: nowIso,
              };
            }
            return record;
          })
        );

        setExtraStudyHistoryRecords((prev) =>
          prev.map((record) => {
            if (archivedIdSet.has(record.extraStudyId)) {
              return {
                ...record,
                status: "archived",
                updatedByUserId: userId,
                updatedAt: nowIso,
              };
            }
            return record;
          })
        );
      } catch (error) {
        console.error("[App] Lỗi khi lưu trữ danh sách tăng cường:", error);
        showToast("Không thể lưu trữ danh sách tăng cường.", "error");
      }
    },
    [fbUser, currentUser, showToast, invalidateExtraStudyRangeCacheForDate]
  );

  const hasCheckedArchiveRef = useRef<boolean>(false);

  // Reset flag khi đổi hoặc đăng xuất tài khoản
  useEffect(() => {
    if (!currentUser) {
      hasCheckedArchiveRef.current = false;
      reportMadeUpGenerationRef.current += 1;
      reportMadeUpUpdatingIdsRef.current.clear();
      setReportMadeUpUpdatingIds(new Set());
      setReportMadeUpError(null);
      dailyReportCacheRef.current.clear();
      monthlyReportCacheRef.current.clear();
      extraStudyRangeCacheRef.current.clear();
      attendanceExtraStudyCacheRef.current.clear();
      pendingExtraStudyRecordsRef.current.clear();
      setExtraStudyHistoryRecords([]);
      setAttendanceExtraStudyRecords([]);
    }
  }, [currentUser]);

  // Tự động archive danh sách tăng cường ngày hôm nay sau 22:00 khi đã tải xong dữ liệu từ Firestore
  useEffect(() => {
    const userId = fbUser?.uid || currentUser?.id;
    if (
      !currentUser ||
      !userId ||
      extraStudyLoading ||
      extraStudyError !== null
    ) {
      return;
    }

    if (hasCheckedArchiveRef.current) {
      return;
    }

    const now = new Date();
    const dueRecords = extraStudyRecords.filter(
      (record) =>
        record.status === "scheduled" &&
        record.targetDate &&
        shouldArchiveExtraStudyRecord(record.targetDate, now)
    );

    hasCheckedArchiveRef.current = true;

    if (dueRecords.length > 0) {
      handleArchiveDueExtraStudyRecords(dueRecords);
    }
  }, [
    currentUser,
    fbUser,
    extraStudyRecords,
    extraStudyLoading,
    extraStudyError,
    handleArchiveDueExtraStudyRecords,
  ]);

  // State danh sách bản ghi điểm danh dùng chung
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceSaving, setAttendanceSaving] = useState<boolean>(false);
  const [attendanceFinalizing, setAttendanceFinalizing] = useState<boolean>(false);
  const [attendanceMarkingLate, setAttendanceMarkingLate] = useState<boolean>(false);
  const [attendanceLoadedKey, setAttendanceLoadedKey] = useState<string | null>(null);
  const attendanceLoadedKeyRef = useRef<string | null>(null);
  attendanceLoadedKeyRef.current = attendanceLoadedKey;
  const latestAttendanceRequestRef = useRef<number>(0);
  // State riêng cho Báo cáo (Reports)
  const [reportAttendanceRecords, setReportAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const reportAttendanceRecordsRef = useRef<AttendanceRecord[]>([]);
  reportAttendanceRecordsRef.current = reportAttendanceRecords;

  // Helper tập trung để invalidate cache báo cáo theo ngày điểm danh (Step 13C2-01)
  const invalidateReportCachesForDate = useCallback((attendanceDate: string) => {
    if (!attendanceDate) return;
    const targetDate = attendanceDate.trim();
    if (!targetDate) return;

    // 1. Xóa cache ngày
    dailyReportCacheRef.current.delete(targetDate);

    // 2. Xóa các cache tháng bao phủ ngày này
    const targetMonth = targetDate.length >= 7 ? targetDate.substring(0, 7) : "";
    for (const key of Array.from(monthlyReportCacheRef.current.keys())) {
      if (key === targetMonth) {
        monthlyReportCacheRef.current.delete(key);
        continue;
      }
      if (key.includes("|")) {
        const [start, end] = key.split("|");
        if (start && end && targetDate >= start && targetDate <= end) {
          monthlyReportCacheRef.current.delete(key);
        }
      }
    }
  }, []);

  // Ref guards chống submit song song / double click (Step 13C2-01)
  const createExtraStudySubmittingRef = useRef<boolean>(false);
  const attendanceMutationSubmittingRef = useRef<boolean>(false);

  // Đồng bộ cập nhật record vào RAM cache của ngày và tháng (Step 13B2-02-Fix)
  const updateReportCachesWithRecords = useCallback((recordsToSync: AttendanceRecord[]) => {
    if (!recordsToSync || recordsToSync.length === 0) return;

    for (const rec of recordsToSync) {
      const attId = rec.attendanceId || rec.extraStudyId;
      const attDate = rec.attendanceDate;
      if (!attDate) continue;

      const monthKey = attDate.length >= 7 ? attDate.substring(0, 7) : "";

      // 1. Cập nhật Cache Ngày nếu ngày đó đã được lưu cache trong RAM
      const cachedDaily = getBoundedCacheEntry(dailyReportCacheRef.current, attDate);
      if (cachedDaily !== undefined) {
        const idx = cachedDaily.findIndex(
          (r) => (r.attendanceId || r.extraStudyId) === attId
        );
        const nextDaily =
          idx >= 0
            ? cachedDaily.map((item, i) =>
                i === idx ? { ...item, ...rec } : item
              )
            : [...cachedDaily, rec];
        setBoundedCacheEntry(
          dailyReportCacheRef.current,
          attDate,
          nextDaily,
          DAILY_REPORT_CACHE_MAX
        );
      }

      // 2. Cập nhật Cache Tháng nếu tháng đó đã được lưu cache trong RAM
      if (monthKey) {
        const cachedMonthly = getBoundedCacheEntry(monthlyReportCacheRef.current, monthKey);
        if (cachedMonthly !== undefined) {
          const idx = cachedMonthly.findIndex(
            (r) => (r.attendanceId || r.extraStudyId) === attId
          );
          const nextMonthly =
            idx >= 0
              ? cachedMonthly.map((item, i) =>
                  i === idx ? { ...item, ...rec } : item
                )
              : [...cachedMonthly, rec];
          setBoundedCacheEntry(
            monthlyReportCacheRef.current,
            monthKey,
            nextMonthly,
            MONTHLY_REPORT_CACHE_MAX
          );
        }
      }
    }
  }, []);

  // Handler cập nhật state reportAttendanceRecords đồng thời giữ RAM cache đồng bộ
  const handleSetReportAttendanceRecords = useCallback(
    (recordsOrUpdater: AttendanceRecord[] | ((prev: AttendanceRecord[]) => AttendanceRecord[])) => {
      setReportAttendanceRecords((prev) => {
        const nextRecords =
          typeof recordsOrUpdater === "function"
            ? recordsOrUpdater(prev)
            : recordsOrUpdater;

        const currentKey = reportLoadedKeyRef.current;
        if (currentKey) {
          if (currentKey.startsWith("day|")) {
            const date = currentKey.substring(4);
            setBoundedCacheEntry(
              dailyReportCacheRef.current,
              date,
              nextRecords,
              DAILY_REPORT_CACHE_MAX
            );
          } else if (currentKey.startsWith("month|")) {
            const month = currentKey.substring(6);
            setBoundedCacheEntry(
              monthlyReportCacheRef.current,
              month,
              nextRecords,
              MONTHLY_REPORT_CACHE_MAX
            );
          }
        }

        updateReportCachesWithRecords(nextRecords);
        return nextRecords;
      });
    },
    [updateReportCachesWithRecords]
  );

  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportLoadedKey, setReportLoadedKey] = useState<string | null>(null);
  const reportLoadedKeyRef = useRef<string | null>(null);
  reportLoadedKeyRef.current = reportLoadedKey;

  const latestReportRequestRef = useRef<number>(0);
  const [reportMadeUpUpdatingIds, setReportMadeUpUpdatingIds] = useState<
    Set<string>
  >(new Set());
  const reportMadeUpUpdatingIdsRef = useRef<Set<string>>(new Set());
  const [reportMadeUpError, setReportMadeUpError] = useState<string | null>(
    null
  );
  const reportMadeUpGenerationRef = useRef<number>(0);

  // Hàm nạp báo cáo theo ngày (YYYY-MM-DD) từ RAM Cache hoặc Firestore
  const handleLoadDailyReport = useCallback(
    async (attendanceDate: string) => {
      reportMadeUpGenerationRef.current += 1;
      reportMadeUpUpdatingIdsRef.current.clear();
      setReportMadeUpUpdatingIds(new Set());
      setReportMadeUpError(null);

      if (!currentUser) {
        setReportAttendanceRecords([]);
        setReportLoading(false);
        setReportError(null);
        setReportLoadedKey(null);
        return;
      }

      const trimmedDate =
        typeof attendanceDate === "string" ? attendanceDate.trim() : "";
      const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

      latestReportRequestRef.current += 1;
      const requestId = latestReportRequestRef.current;
      const targetKey = `day|${trimmedDate}`;

      if (!trimmedDate || !dateRegex.test(trimmedDate)) {
        setReportAttendanceRecords([]);
        setReportError("Ngày báo cáo không hợp lệ (yêu cầu YYYY-MM-DD).");
        setReportLoading(false);
        setReportLoadedKey(null);
        return;
      }

      // 1. Nếu ngày này đã có trong RAM Cache -> Dùng ngay, 0 Firestore Read
      const cachedRecords = getBoundedCacheEntry(dailyReportCacheRef.current, trimmedDate);
      if (cachedRecords !== undefined) {
        setReportAttendanceRecords(cachedRecords);
        setReportError(null);
        setReportLoadedKey(targetKey);
        setReportLoading(false);
        return;
      }

      // 2. Nếu chưa có -> Đọc Firestore và lưu RAM Cache
      setReportLoading(true);
      setReportError(null);
      setReportAttendanceRecords([]);

      try {
        const records = await loadAttendanceRecordsByDate(trimmedDate);
        if (requestId === latestReportRequestRef.current) {
          setBoundedCacheEntry(
            dailyReportCacheRef.current,
            trimmedDate,
            records,
            DAILY_REPORT_CACHE_MAX
          );
          setReportAttendanceRecords(records);
          setReportError(null);
          setReportLoadedKey(targetKey);
        }
      } catch (error) {
        console.error(
          "[App] Lỗi nạp dữ liệu báo cáo ngày từ Firestore:",
          error
        );
        if (requestId === latestReportRequestRef.current) {
          setReportAttendanceRecords([]);
          setReportError("Không thể tải dữ liệu báo cáo.");
          setReportLoadedKey(null);
        }
      } finally {
        if (requestId === latestReportRequestRef.current) {
          setReportLoading(false);
        }
      }
    },
    [currentUser]
  );

  // Hàm nạp báo cáo theo tháng (YYYY-MM) từ RAM Cache hoặc Firestore
  const handleLoadMonthlyReport = useCallback(
    async (monthKey: string) => {
      reportMadeUpGenerationRef.current += 1;
      reportMadeUpUpdatingIdsRef.current.clear();
      setReportMadeUpUpdatingIds(new Set());
      setReportMadeUpError(null);

      if (!currentUser) {
        setReportAttendanceRecords([]);
        setReportLoading(false);
        setReportError(null);
        setReportLoadedKey(null);
        return;
      }

      const trimmedMonth =
        typeof monthKey === "string" ? monthKey.trim() : "";
      const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

      latestReportRequestRef.current += 1;
      const requestId = latestReportRequestRef.current;
      const targetKey = `month|${trimmedMonth}`;

      if (!trimmedMonth || !monthRegex.test(trimmedMonth)) {
        setReportAttendanceRecords([]);
        setReportError("Tháng báo cáo không hợp lệ (yêu cầu YYYY-MM).");
        setReportLoading(false);
        setReportLoadedKey(null);
        return;
      }

      // 1. Nếu tháng này đã có trong RAM Cache -> Dùng ngay, 0 Firestore Read
      const cachedRecords = getBoundedCacheEntry(monthlyReportCacheRef.current, trimmedMonth);
      if (cachedRecords !== undefined) {
        setReportAttendanceRecords(cachedRecords);
        setReportError(null);
        setReportLoadedKey(targetKey);
        setReportLoading(false);
        return;
      }

      // 2. Nếu chưa có -> Đọc Firestore và lưu RAM Cache
      setReportLoading(true);
      setReportError(null);
      setReportAttendanceRecords([]);

      try {
        const records = await loadAttendanceRecordsByMonth(trimmedMonth);
        if (requestId === latestReportRequestRef.current) {
          setBoundedCacheEntry(
            monthlyReportCacheRef.current,
            trimmedMonth,
            records,
            MONTHLY_REPORT_CACHE_MAX
          );
          setReportAttendanceRecords(records);
          setReportError(null);
          setReportLoadedKey(targetKey);
        }
      } catch (error) {
        console.error(
          "[App] Lỗi nạp dữ liệu báo cáo tháng từ Firestore:",
          error
        );
        if (requestId === latestReportRequestRef.current) {
          setReportAttendanceRecords([]);
          setReportError("Không thể tải dữ liệu báo cáo.");
          setReportLoadedKey(null);
        }
      } finally {
        if (requestId === latestReportRequestRef.current) {
          setReportLoading(false);
        }
      }
    },
    [currentUser]
  );

  // Callback cập nhật trạng thái "Đã học bù" cho từng lần vắng trong Báo cáo tháng
  const handleUpdateAttendanceMadeUpStatus = useCallback(
    async (attendanceId: string, nextIsMadeUp: boolean): Promise<void> => {
      const userId = fbUser?.uid || currentUser?.id;
      if (!currentUser || !userId || typeof userId !== "string" || !userId.trim()) {
        showToast("Bạn chưa đăng nhập.", "error");
        return;
      }

      const trimmedAttId =
        typeof attendanceId === "string" ? attendanceId.trim() : "";
      if (!trimmedAttId) {
        showToast("Mã điểm danh không hợp lệ.", "error");
        return;
      }

      // Khóa đồng bộ tức thời bằng ref chống bấm lặp
      if (reportMadeUpUpdatingIdsRef.current.has(trimmedAttId)) {
        return;
      }

      // Thêm ngay lập tức vào lock ref
      reportMadeUpUpdatingIdsRef.current.add(trimmedAttId);
      // Đồng bộ state để disable checkbox UI
      setReportMadeUpUpdatingIds(new Set(reportMadeUpUpdatingIdsRef.current));

      // Lưu lại context thế hệ (generation) & loadedKey tại thời điểm bắt đầu thao tác
      const operationGeneration = reportMadeUpGenerationRef.current;
      const operationLoadedKey = reportLoadedKeyRef.current;

      // Tìm record trong reportAttendanceRecordsRef hiện tại
      const currentRecords = reportAttendanceRecordsRef.current;
      const targetRecord = currentRecords.find(
        (r) => r.attendanceId === trimmedAttId
      );

      if (!targetRecord) {
        console.error(
          `[App] Không tìm thấy bản ghi điểm danh ${trimmedAttId} trong báo cáo hiện tại.`
        );
        reportMadeUpUpdatingIdsRef.current.delete(trimmedAttId);
        setReportMadeUpUpdatingIds(new Set(reportMadeUpUpdatingIdsRef.current));
        return;
      }

      // Record phải có status === "absent"
      if (targetRecord.status !== "absent") {
        console.warn(
          `[App] Không thể đánh dấu học bù cho bản ghi không vắng (status=${targetRecord.status})`
        );
        reportMadeUpUpdatingIdsRef.current.delete(trimmedAttId);
        setReportMadeUpUpdatingIds(new Set(reportMadeUpUpdatingIdsRef.current));
        return;
      }

      setReportMadeUpError(null);

      try {
        await updateAttendanceMadeUpStatus(
          trimmedAttId,
          nextIsMadeUp,
          userId
        );

        const nowIso = new Date().toISOString();
        const updatedRecState: AttendanceRecord = {
          ...targetRecord,
          isMadeUp: nextIsMadeUp,
          madeUpAt: nextIsMadeUp ? nowIso : null,
          madeUpByUserId: nextIsMadeUp ? userId : null,
          updatedAt: nowIso,
          updatedByUserId: userId,
        };

        // Luôn cập nhật RAM Cache bất kể người dùng còn ở tháng cũ hay không
        updateReportCachesWithRecords([updatedRecState]);
        if (targetRecord.attendanceDate) {
          invalidateReportCachesForDate(targetRecord.attendanceDate);
        }

        showToast(
          nextIsMadeUp ? "Đã đánh dấu học bù." : "Đã bỏ đánh dấu học bù.",
          "success"
        );

        // Kiểm tra generation và loadedKey hiện tại trước khi cập nhật state local UI đang xem
        const currentGen = reportMadeUpGenerationRef.current;
        const currentKey = reportLoadedKeyRef.current;

        const isGenValid = operationGeneration === currentGen;
        const isKeyValid =
          operationLoadedKey !== null &&
          operationLoadedKey === currentKey &&
          operationLoadedKey.startsWith("month|");

        if (isGenValid && isKeyValid) {
          setReportAttendanceRecords((prev) => {
            // Kiểm tra record vẫn tồn tại và vẫn có status === "absent"
            const recExists = prev.some(
              (r) => r.attendanceId === trimmedAttId && r.status === "absent"
            );
            if (!recExists) return prev;

            return prev.map((rec) => {
              if (rec.attendanceId === trimmedAttId) {
                if (nextIsMadeUp) {
                  return {
                    ...rec,
                    isMadeUp: true,
                    madeUpAt: nowIso,
                    madeUpByUserId: userId,
                    updatedAt: nowIso,
                    updatedByUserId: userId,
                  };
                } else {
                  return {
                    ...rec,
                    isMadeUp: false,
                    madeUpAt: null,
                    madeUpByUserId: null,
                    updatedAt: nowIso,
                    updatedByUserId: userId,
                  };
                }
              }
              return rec;
            });
          });

          setTodayAttendanceRecords((prevToday) =>
            prevToday.map((rec) => {
              if (rec.attendanceId === trimmedAttId) {
                return {
                  ...rec,
                  isMadeUp: nextIsMadeUp,
                  madeUpAt: nextIsMadeUp ? nowIso : null,
                  madeUpByUserId: nextIsMadeUp ? userId : null,
                  updatedAt: nowIso,
                  updatedByUserId: userId,
                };
              }
              return rec;
            })
          );
        }
      } catch (error) {
        console.error(
          `[App] Lỗi cập nhật trạng thái học bù cho attendanceId=${trimmedAttId}:`,
          error
        );

        const currentGen = reportMadeUpGenerationRef.current;
        if (operationGeneration === currentGen) {
          setReportMadeUpError("Không thể cập nhật trạng thái học bù.");
          showToast("Không thể cập nhật trạng thái học bù.", "error");
        }
      } finally {
        // Cleanup khóa attendanceId
        reportMadeUpUpdatingIdsRef.current.delete(trimmedAttId);
        setReportMadeUpUpdatingIds(new Set(reportMadeUpUpdatingIdsRef.current));
      }
    },
    [fbUser, currentUser, showToast]
  );

  const handleCreateTeacher = useCallback(
    async (params: CreateTeacherParams) => {
      const result = await createTeacherAccount(params);
      if (teachersLoadedRef.current) {
        setTeachers((prev) => upsertById(prev, result, (teacher) => teacher.uid));
      }
      return result;
    },
    []
  );

  // Hàm nạp danh sách điểm danh từ Firestore theo ngày và ca
  const handleLoadAttendanceView = useCallback(
    async (attendanceDate: string, session: StudySession) => {
      if (!currentUser) {
        setAttendanceRecords([]);
        setAttendanceLoading(false);
        setAttendanceError(null);
        setAttendanceLoadedKey(null);
        return;
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!attendanceDate || !dateRegex.test(attendanceDate)) {
        return;
      }
      if (
        session !== "morning" &&
        session !== "afternoon" &&
        session !== "evening"
      ) {
        return;
      }

      currentAttendanceDateRef.current = attendanceDate;
      const requestId = ++latestAttendanceRequestRef.current;

      setAttendanceLoading(true);
      setAttendanceError(null);
      setAttendanceRecords([]);
      setAttendanceLoadedKey(null);

      try {
        const start = activeStartDateRef.current;
        const end = activeEndDateRef.current;
        const isInActiveRange = Boolean(
          start && end && attendanceDate >= start && attendanceDate <= end
        );

        let attendanceExtraTask: Promise<ReinforcementScheduleRecord[]> | null = null;

        if (!isInActiveRange) {
          const cached = getBoundedCacheEntry(
            attendanceExtraStudyCacheRef.current,
            attendanceDate
          );
          if (cached !== undefined) {
            if (requestId === latestAttendanceRequestRef.current) {
              setAttendanceExtraStudyRecords(cached);
            }
          } else {
            attendanceExtraTask = loadExtraStudyRecordsByDateRange(
              attendanceDate,
              attendanceDate
            );
          }
        } else {
          if (requestId === latestAttendanceRequestRef.current) {
            setAttendanceExtraStudyRecords([]);
          }
        }

        const attendanceTask = loadAttendanceRecords({
          attendanceDate,
          session,
        });

        const [extraStudyFetched, records] = await Promise.all([
          attendanceExtraTask,
          attendanceTask,
        ]);

        if (requestId === latestAttendanceRequestRef.current) {
          if (extraStudyFetched) {
            setBoundedCacheEntry(
              attendanceExtraStudyCacheRef.current,
              attendanceDate,
              extraStudyFetched,
              ATTENDANCE_EXTRA_STUDY_CACHE_MAX
            );
            setAttendanceExtraStudyRecords(extraStudyFetched);
          }
          setAttendanceRecords(records);
          setAttendanceError(null);
          setAttendanceLoadedKey(`${attendanceDate}|${session}`);
        }
      } catch (error) {
        console.error("[App] Lỗi nạp bản ghi điểm danh:", error);
        if (requestId === latestAttendanceRequestRef.current) {
          setAttendanceRecords([]);
          setAttendanceError("Không thể tải dữ liệu điểm danh.");
          setAttendanceLoadedKey(null);
        }
      } finally {
        if (requestId === latestAttendanceRequestRef.current) {
          setAttendanceLoading(false);
        }
      }
    },
    [currentUser]
  );

  // Hàm lưu danh sách điểm danh lên Firestore
  const handleSaveAttendanceRecords = useCallback(
    async (
      attendanceDate: string,
      session: StudySession,
      draftRecords: Array<{
        extraStudyId: string;
        studentId: string;
        status: AttendanceStatus;
        note: string;
      }>
    ): Promise<boolean> => {
      if (attendanceMutationSubmittingRef.current) {
        return false;
      }
      attendanceMutationSubmittingRef.current = true;

      try {
        const uid = fbUser?.uid;
        if (!uid) {
          showToast("Bạn chưa đăng nhập.", "error");
          return false;
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!attendanceDate || !dateRegex.test(attendanceDate)) {
          showToast("Ngày điểm danh không hợp lệ.", "error");
          return false;
        }

        if (
          session !== "morning" &&
          session !== "afternoon" &&
          session !== "evening"
        ) {
          showToast("Ca học không hợp lệ.", "error");
          return false;
        }

        const saveKey = `${attendanceDate}|${session}`;
        if (attendanceLoadedKey !== saveKey) {
          showToast("Dữ liệu điểm danh chưa tải xong. Vui lòng thử lại.", "error");
          return false;
        }

        if (attendanceLoading) {
          showToast("Dữ liệu điểm danh đang tải, vui lòng chờ.", "error");
          return false;
        }

        if (attendanceError !== null) {
          showToast("Dữ liệu điểm danh bị lỗi, không thể lưu.", "error");
          return false;
        }

        if (attendanceSaving || attendanceFinalizing || attendanceMarkingLate) {
          return false;
        }

        // Lọc bỏ tất cả record đã finalized trong attendanceRecords chính thức
        const unfinalizedDrafts = draftRecords.filter((item) => {
          const existingRec = attendanceRecords.find(
            (a) => a.extraStudyId === item.extraStudyId
          );
          return !existingRec || existingRec.isFinalized !== true;
        });

        if (unfinalizedDrafts.length === 0) {
          showToast("Danh sách điểm danh đã được chốt.", "info");
          return false;
        }

        const saveRequestId = latestAttendanceRequestRef.current;

        const changedRecords: AttendanceRecord[] = [];

        for (const item of unfinalizedDrafts) {
          const existingRec = attendanceRecords.find(
            (a) => a.extraStudyId === item.extraStudyId
          );

          if (
            hasAttendanceRecordChanged(existingRec, item.status, item.note || "")
          ) {
            if (existingRec) {
              changedRecords.push({
                ...existingRec,
                status: item.status,
                note: item.note || "",
                updatedByUserId: uid,
              });
            } else {
              changedRecords.push({
                attendanceId: item.extraStudyId,
                extraStudyId: item.extraStudyId,
                studentId: item.studentId,
                attendanceDate: attendanceDate,
                session: session,
                status: item.status,
                note: item.note || "",
                isFinalized: false,
                finalizedAt: null,
                finalizedByUserId: null,
                createdByUserId: uid,
                updatedByUserId: uid,
                createdAt: null,
                updatedAt: null,
              });
            }
          }
        }

        if (changedRecords.length === 0) {
          showToast("Đã lưu điểm danh.", "success");
          return true;
        }

        setAttendanceSaving(true);

        try {
          await saveAttendanceRecords({
            records: changedRecords,
            updatedByUserId: uid,
          });

          // Viết thành công lên Firestore => Luôn invalidate report cache kể cả người dùng chuyển ngày
          invalidateReportCachesForDate(attendanceDate);

          const nowIso = new Date().toISOString();

          if (saveRequestId === latestAttendanceRequestRef.current) {
            setAttendanceRecords((prevRecords) => {
              const updatedList = [...prevRecords];

              changedRecords.forEach((saved) => {
                const idx = updatedList.findIndex(
                  (r) => r.extraStudyId === saved.extraStudyId
                );

                const isNew = !saved.createdAt;
                const updatedRecordState: AttendanceRecord = {
                  ...saved,
                  createdAt: isNew ? nowIso : saved.createdAt,
                  updatedAt: nowIso,
                };

                if (idx >= 0) {
                  updatedList[idx] = updatedRecordState;
                } else {
                  updatedList.push(updatedRecordState);
                }
              });

              return updatedList;
            });

            if (attendanceDate === getTodayDateStr()) {
              setTodayAttendanceRecords((prevToday) => {
                const updatedToday = [...prevToday];
                changedRecords.forEach((saved) => {
                  const savedAttId = saved.attendanceId || saved.extraStudyId;
                  const idx = updatedToday.findIndex(
                    (r) => (r.attendanceId || r.extraStudyId) === savedAttId
                  );
                  const isNew = !saved.createdAt;
                  const updatedRecordState: AttendanceRecord = {
                    ...saved,
                    attendanceId: savedAttId,
                    createdAt: isNew ? nowIso : saved.createdAt,
                    updatedAt: nowIso,
                  };

                  if (idx >= 0) {
                    updatedToday[idx] = updatedRecordState;
                  } else {
                    updatedToday.push(updatedRecordState);
                  }
                });
                return updatedToday;
              });
            }
          }

          showToast("Đã lưu điểm danh.", "success");
          return true;
        } catch (error) {
          console.error("[App] Lỗi khi lưu điểm danh lên Firestore:", error);
          showToast("Không thể lưu điểm danh. Vui lòng thử lại.", "error");
          return false;
        } finally {
          setAttendanceSaving(false);
        }
      } finally {
        attendanceMutationSubmittingRef.current = false;
      }
    },
    [
      fbUser,
      attendanceLoadedKey,
      attendanceLoading,
      attendanceError,
      attendanceSaving,
      attendanceFinalizing,
      attendanceMarkingLate,
      attendanceRecords,
      showToast,
      invalidateReportCachesForDate,
    ]
  );

  // Hàm chốt vắng điểm danh trên Firestore
  const handleFinalizeAttendanceRecords = useCallback(
    async (
      attendanceDate: string,
      session: StudySession
    ): Promise<boolean> => {
      if (attendanceMutationSubmittingRef.current) {
        return false;
      }
      attendanceMutationSubmittingRef.current = true;

      try {
        const uid = fbUser?.uid;
        if (!uid) {
          showToast("Bạn chưa đăng nhập.", "error");
          return false;
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!attendanceDate || !dateRegex.test(attendanceDate)) {
          showToast("Ngày điểm danh không hợp lệ.", "error");
          return false;
        }

        if (
          session !== "morning" &&
          session !== "afternoon" &&
          session !== "evening"
        ) {
          showToast("Ca học không hợp lệ.", "error");
          return false;
        }

        const finalizeKey = `${attendanceDate}|${session}`;
        if (attendanceLoadedKey !== finalizeKey) {
          showToast("Dữ liệu điểm danh chưa tải xong. Vui lòng thử lại.", "error");
          return false;
        }

        if (attendanceLoading) {
          showToast("Dữ liệu điểm danh đang tải, vui lòng chờ.", "error");
          return false;
        }

        if (attendanceSaving) {
          showToast("Đang lưu điểm danh, vui lòng chờ.", "error");
          return false;
        }

        if (attendanceFinalizing || attendanceMarkingLate) {
          return false;
        }

        if (attendanceError !== null) {
          showToast("Dữ liệu điểm danh bị lỗi, không thể chốt.", "error");
          return false;
        }

        const currentViewRecords = attendanceRecords.filter(
          (r) => r.attendanceDate === attendanceDate && r.session === session
        );

        if (currentViewRecords.length === 0) {
          showToast("Chưa có dữ liệu điểm danh để chốt.", "error");
          return false;
        }

        const unfinalizedRecords = currentViewRecords.filter(
          (r) => !r.isFinalized
        );

        if (unfinalizedRecords.length === 0) {
          showToast("Danh sách điểm danh đã được chốt.", "error");
          return false;
        }

        const attendanceIds = unfinalizedRecords
          .map((r) => (typeof r.attendanceId === "string" ? r.attendanceId.trim() : ""))
          .filter((id) => id.length > 0);

        if (attendanceIds.length === 0) {
          showToast("Chưa có dữ liệu điểm danh để chốt.", "error");
          return false;
        }

        setAttendanceFinalizing(true);
        const finalizeRequestId = latestAttendanceRequestRef.current;

        try {
          await finalizeAttendanceRecords({
            attendanceIds,
            finalizedByUserId: uid,
          });

          const nowIso = new Date().toISOString();

          if (
            finalizeRequestId === latestAttendanceRequestRef.current &&
            attendanceLoadedKey === finalizeKey
          ) {
            setAttendanceRecords((prevRecords) =>
              prevRecords.map((r) => {
                if (
                  r.attendanceDate === attendanceDate &&
                  r.session === session &&
                  attendanceIds.includes(r.attendanceId.trim())
                ) {
                  return {
                    ...r,
                    isFinalized: true,
                    finalizedAt: nowIso,
                    finalizedByUserId: uid,
                    updatedAt: nowIso,
                    updatedByUserId: uid,
                  };
                }
                return r;
              })
            );
          }

          if (attendanceDate === getTodayDateStr()) {
            setTodayAttendanceRecords((prevToday) =>
              prevToday.map((r) => {
                if (
                  r.attendanceDate === attendanceDate &&
                  r.session === session &&
                  attendanceIds.includes(r.attendanceId.trim())
                ) {
                  return {
                    ...r,
                    isFinalized: true,
                    finalizedAt: nowIso,
                    finalizedByUserId: uid,
                    updatedAt: nowIso,
                    updatedByUserId: uid,
                  };
                }
                return r;
              })
            );
          }

          const finalizedRecords: AttendanceRecord[] = unfinalizedRecords.map((r) => ({
            ...r,
            isFinalized: true,
            finalizedAt: nowIso,
            finalizedByUserId: uid,
            updatedAt: nowIso,
            updatedByUserId: uid,
          }));
          updateReportCachesWithRecords(finalizedRecords);
          invalidateReportCachesForDate(attendanceDate);

          showToast("Đã chốt vắng.", "success");
          return true;
        } catch (error) {
          console.error("[App] Lỗi khi chốt vắng điểm danh lên Firestore:", error);
          showToast("Không thể chốt vắng. Vui lòng thử lại.", "error");
          return false;
        } finally {
          setAttendanceFinalizing(false);
        }
      } finally {
        attendanceMutationSubmittingRef.current = false;
      }
    },
    [
      fbUser,
      attendanceLoadedKey,
      attendanceLoading,
      attendanceSaving,
      attendanceFinalizing,
      attendanceMarkingLate,
      attendanceError,
      attendanceRecords,
      showToast,
      updateReportCachesWithRecords,
      invalidateReportCachesForDate,
    ]
  );

  // Hàm chốt vắng từ màn hình Báo cáo Hôm nay
  const handleFinalizeDailyReport = useCallback(
    async (attendanceDate: string): Promise<boolean> => {
      const uid = fbUser?.uid;
      if (!uid) {
        showToast("Bạn chưa đăng nhập.", "error");
        return false;
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!attendanceDate || !dateRegex.test(attendanceDate)) {
        showToast("Ngày báo cáo không hợp lệ.", "error");
        return false;
      }

      const unfinalizedAbsentRecords = reportAttendanceRecords.filter(
        (r) =>
          r.attendanceDate === attendanceDate &&
          r.status === "absent" &&
          r.isFinalized !== true
      );

      const attendanceIds = Array.from(
        new Set(
          unfinalizedAbsentRecords
            .map((r) =>
              typeof r.attendanceId === "string" ? r.attendanceId.trim() : ""
            )
            .filter((id) => id.length > 0)
        )
      );

      if (attendanceIds.length === 0) {
        showToast("Chưa có bản ghi vắng nào cần chốt.", "info");
        return true;
      }

      try {
        await finalizeAttendanceRecords({
          attendanceIds,
          finalizedByUserId: uid,
        });

        const nowIso = new Date().toISOString();

        setReportAttendanceRecords((prev) =>
          prev.map((r) => {
            const trimmedId =
              typeof r.attendanceId === "string" ? r.attendanceId.trim() : "";
            if (
              r.attendanceDate === attendanceDate &&
              r.status === "absent" &&
              attendanceIds.includes(trimmedId)
            ) {
              return {
                ...r,
                isFinalized: true,
                finalizedAt: nowIso,
                finalizedByUserId: uid,
                updatedAt: nowIso,
                updatedByUserId: uid,
              };
            }
            return r;
          })
        );

        if (attendanceDate === getTodayDateStr()) {
          setTodayAttendanceRecords((prevToday) =>
            prevToday.map((r) => {
              const trimmedId =
                typeof r.attendanceId === "string" ? r.attendanceId.trim() : "";
              if (
                r.attendanceDate === attendanceDate &&
                r.status === "absent" &&
                attendanceIds.includes(trimmedId)
              ) {
                return {
                  ...r,
                  isFinalized: true,
                  finalizedAt: nowIso,
                  finalizedByUserId: uid,
                  updatedAt: nowIso,
                  updatedByUserId: uid,
                };
              }
              return r;
            })
          );
        }

        invalidateReportCachesForDate(attendanceDate);
        showToast("Đã chốt danh sách vắng.", "success");
        return true;
      } catch (error) {
        console.error("[App] Lỗi khi chốt vắng báo cáo ngày:", error);
        showToast("Không thể chốt vắng. Vui lòng thử lại.", "error");
        return false;
      }
    },
    [
      fbUser,
      reportAttendanceRecords,
      getTodayDateStr,
      invalidateReportCachesForDate,
      showToast,
    ]
  );

  const hasAutoFinalizedTodayRef = useRef<boolean>(false);

  // Tự động chốt vắng ngày hôm nay sau 23:00 cho các bản ghi chưa chốt
  useEffect(() => {
    const userId = fbUser?.uid || currentUser?.id;
    if (!currentUser || !userId) return;

    const now = new Date();
    if (now.getHours() >= 23) {
      const todayStr = getTodayDateStr();
      if (hasAutoFinalizedTodayRef.current === todayStr) return;

      const unfinalizedAbsent = todayAttendanceRecords.filter(
        (r) =>
          r.attendanceDate === todayStr &&
          r.status === "absent" &&
          r.isFinalized !== true
      );

      if (unfinalizedAbsent.length > 0) {
        hasAutoFinalizedTodayRef.current = todayStr;
        const ids = unfinalizedAbsent
          .map((r) =>
            typeof r.attendanceId === "string" ? r.attendanceId.trim() : ""
          )
          .filter(Boolean);

        if (ids.length > 0) {
          finalizeAttendanceRecords({
            attendanceIds: ids,
            finalizedByUserId: "SYSTEM_AUTO_2300",
          })
            .then(() => {
              const nowIso = new Date().toISOString();
              setTodayAttendanceRecords((prev) =>
                prev.map((r) => {
                  const rId =
                    typeof r.attendanceId === "string"
                      ? r.attendanceId.trim()
                      : "";
                  if (ids.includes(rId)) {
                    return {
                      ...r,
                      isFinalized: true,
                      finalizedAt: nowIso,
                      finalizedByUserId: "SYSTEM_AUTO_2300",
                      updatedAt: nowIso,
                      updatedByUserId: "SYSTEM_AUTO_2300",
                    };
                  }
                  return r;
                })
              );
              setReportAttendanceRecords((prev) =>
                prev.map((r) => {
                  const rId =
                    typeof r.attendanceId === "string"
                      ? r.attendanceId.trim()
                      : "";
                  if (ids.includes(rId)) {
                    return {
                      ...r,
                      isFinalized: true,
                      finalizedAt: nowIso,
                      finalizedByUserId: "SYSTEM_AUTO_2300",
                      updatedAt: nowIso,
                      updatedByUserId: "SYSTEM_AUTO_2300",
                    };
                  }
                  return r;
                })
              );
              invalidateReportCachesForDate(todayStr);
            })
            .catch((err) => {
              console.error("[App] Lỗi auto finalize lúc 23:00:", err);
            });
        }
      }
    }
  }, [
    currentUser,
    fbUser,
    todayAttendanceRecords,
    getTodayDateStr,
    invalidateReportCachesForDate,
  ]);

  // Hàm đánh dấu muộn cho 1 học sinh đã được chốt vắng (isFinalized === true && status === 'present')
  const handleMarkAttendanceLate = useCallback(
    async (attendanceId: string): Promise<boolean> => {
      if (attendanceMutationSubmittingRef.current) {
        return false;
      }
      attendanceMutationSubmittingRef.current = true;

      try {
        const uid = fbUser?.uid;
        if (!uid) {
          showToast("Bạn chưa đăng nhập.", "error");
          return false;
        }

        if (typeof attendanceId !== "string" || !attendanceId.trim()) {
          showToast("Bản ghi điểm danh không hợp lệ.", "error");
          return false;
        }

        if (
          attendanceLoading ||
          attendanceSaving ||
          attendanceFinalizing ||
          attendanceMarkingLate
        ) {
          return false;
        }

        const cleanId = attendanceId.trim();
        const targetRecord = attendanceRecords.find(
          (r) => (typeof r.attendanceId === "string" ? r.attendanceId.trim() : "") === cleanId
        );

        if (!targetRecord) {
          showToast("Không tìm thấy bản ghi điểm danh.", "error");
          return false;
        }

        if (targetRecord.status === "late") {
          showToast("Học sinh đã được đánh dấu muộn.", "info");
          return false;
        }

        if (targetRecord.isFinalized !== true || targetRecord.status !== "present") {
          showToast("Chỉ có thể đánh dấu muộn cho học sinh đã chốt và có mặt.", "error");
          return false;
        }

        const targetKey = `${targetRecord.attendanceDate}|${targetRecord.session}`;

        try {
          setAttendanceMarkingLate(true);

          await markAttendanceLate({
            attendanceId: cleanId,
            updatedByUserId: uid,
          });

          const nowIso = new Date().toISOString();

          if (attendanceLoadedKeyRef.current === targetKey) {
            setAttendanceRecords((prevRecords) =>
              prevRecords.map((r) => {
                const rId = typeof r.attendanceId === "string" ? r.attendanceId.trim() : "";
                if (rId === cleanId) {
                  return {
                    ...r,
                    status: "late",
                    updatedAt: nowIso,
                    updatedByUserId: uid,
                  };
                }
                return r;
              })
            );
          }

          if (targetRecord.attendanceDate === getTodayDateStr()) {
            setTodayAttendanceRecords((prevToday) =>
              prevToday.map((r) => {
                const rId = typeof r.attendanceId === "string" ? r.attendanceId.trim() : "";
                if (rId === cleanId) {
                  return {
                    ...r,
                    status: "late",
                    updatedAt: nowIso,
                    updatedByUserId: uid,
                  };
                }
                return r;
              })
            );
          }

          const lateRecordState: AttendanceRecord = {
            ...targetRecord,
            status: "late",
            updatedAt: nowIso,
            updatedByUserId: uid,
          };
          updateReportCachesWithRecords([lateRecordState]);
          if (targetRecord.attendanceDate) {
            invalidateReportCachesForDate(targetRecord.attendanceDate);
          }

          showToast("Đã đánh dấu muộn.", "success");
          return true;
        } catch (error) {
          console.error("[App] Lỗi khi đánh dấu muộn lên Firestore:", error);
          showToast("Không thể cập nhật trạng thái muộn.", "error");
          return false;
        } finally {
          setAttendanceMarkingLate(false);
        }
      } finally {
        attendanceMutationSubmittingRef.current = false;
      }
    },
    [
      fbUser,
      attendanceLoading,
      attendanceSaving,
      attendanceFinalizing,
      attendanceMarkingLate,
      attendanceRecords,
      showToast,
      updateReportCachesWithRecords,
      invalidateReportCachesForDate,
    ]
  );

  // Theo dõi trạng thái Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFbUser(null);
        setCurrentUser(null);
        setAuthError(null);
        setAuthLoading(false);
        setAttendanceRecords([]);
        setAttendanceLoading(false);
        setAttendanceError(null);
        setAttendanceSaving(false);
        setAttendanceFinalizing(false);
        setAttendanceLoadedKey(null);
        latestAttendanceRequestRef.current += 1;
        setReportAttendanceRecords([]);
        setReportLoading(false);
        setReportError(null);
        setReportLoadedKey(null);
        latestReportRequestRef.current += 1;
        return;
      }

      setFbUser(user);
      setAuthLoading(true);

      try {
        const profile = await getTeacherProfile(user.uid);

        if (!profile) {
          setAuthError("Tài khoản chưa được cấp quyền sử dụng.");
          setCurrentUser(null);
        } else if (profile.status === "pending") {
          setAuthError("Tài khoản đang chờ quản trị viên duyệt.");
          setCurrentUser(null);
        } else if (profile.status === "disabled") {
          setAuthError("Tài khoản đã bị vô hiệu hóa.");
          setCurrentUser(null);
        } else if (profile.status === "active") {
          setAuthError(null);
          const mappedUser: UserProfile = {
            id: profile.uid,
            fullName: profile.displayName || profile.email,
            email: profile.email,
            title: profile.role === "admin" ? "Quản trị viên" : "Giáo viên",
            subject: null,
            role: profile.role,
          };
          setCurrentUser(mappedUser);
          setActiveTab(getDefaultTab(profile.role));
        } else {
          setAuthError("Trạng thái tài khoản không hợp lệ.");
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("[Auth] Lỗi lấy hồ sơ giáo viên:", err);
        setAuthError("Không thể tải thông tin tài khoản. Vui lòng thử lại.");
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Tải danh sách lớp, học sinh từ Firestore khi currentUser đã đăng nhập & active
  useEffect(() => {
    if (currentUser) {
      loadClasses();
      loadStudents();
      if (currentUser.role === "admin") {
        loadTeachers();
        loadTodayAttendance();
      }
    }
  }, [
    currentUser,
    loadClasses,
    loadStudents,
    loadTeachers,
    loadTodayAttendance,
  ]);

  // Kiểm tra tính toàn vẹn dữ liệu mẫu và quy tắc nghiệp vụ khi ở chế độ Development
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    if (isDev) {
      const validation = validateMockAcademicData(
        [],
        [],
        MOCK_EXTRA_STUDY_RECORDS
      );
      if (!validation.valid) {
        console.error("[Mock Data Validation Errors]:", validation.errors);
      } else {
        console.log("[Mock Data Validation]: All mock data is valid.");
      }

      const checks = runDataModelChecks();
      if (!checks.passed) {
        console.error("[Data Model Checks Failed]:", checks.errors);
      } else {
        console.log("[Data Model Checks Passed]: All business rules verified successfully.");
      }

      runFirebaseChecks();
    }
  }, []);

  // Tự động điều chỉnh activeTab khi role thay đổi
  useEffect(() => {
    if (currentUser) {
      const currentNavConfig = NAV_ITEMS.find((item) => item.id === activeTab);
      if (
        !currentNavConfig ||
        !currentNavConfig.allowedRoles.includes(currentUser.role)
      ) {
        setActiveTab(getDefaultTab(currentUser.role));
      }
    }
  }, [currentUser, activeTab]);

  // Màn hình Loading toàn trang
  if (authLoading) {
    return (
      <div className="app-min-viewport-height bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-100 font-sans">
        <div className="flex items-center gap-3">
          <svg
            className="animate-spin h-8 w-8 text-teal-400"
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
          <span className="text-sm font-medium text-slate-300">
            Đang kiểm tra trạng thái đăng nhập...
          </span>
        </div>
      </div>
    );
  }

  // Màn hình Đăng nhập nếu chưa xác thực
  if (!fbUser) {
    return <LoginPage />;
  }

  // Màn hình thông báo nếu bị từ chối truy cập (pending, disabled, missing profile)
  if (authError || !currentUser) {
    return (
      <div className="app-min-viewport-height bg-slate-900 flex items-center justify-center p-4 text-slate-100 font-sans">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700/80 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-2">
              Truy cập bị từ chối
            </h2>
            <p className="text-sm text-slate-300 bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/60 font-medium">
              {authError || "Tài khoản chưa được cấp quyền sử dụng."}
            </p>
            <p className="text-xs text-slate-400 mt-3">
              Email đăng nhập: <span className="text-teal-300 font-mono">{fbUser.email}</span>
            </p>
          </div>
          <button
            onClick={() => signOutUser()}
            className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl text-sm transition-all cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            currentUser={currentUser}
            onNavigate={setActiveTab}
            students={students}
            studentsLoading={studentsLoading}
            classes={classes}
            classesLoading={classesLoading}
            extraStudyRecords={extraStudyRecords}
            extraStudyLoading={extraStudyLoading}
            todayAttendanceRecords={todayAttendanceRecords}
            todayAttendanceLoading={todayAttendanceLoading}
            todayAttendanceError={todayAttendanceError}
            teachers={teachers}
            teachersLoading={teachersLoading}
            teachersError={teachersError}
          />
        );
      case "students":
        return (
          <StudentsPage
            currentUser={currentUser}
            students={students}
            studentsLoading={studentsLoading}
            studentsError={studentsError}
            classes={classes}
            classesLoading={classesLoading}
            classesError={classesError}
            onStudentsChange={setStudents}
            onClassesChange={setClasses}
            onReloadClasses={loadClasses}
            onReloadStudents={loadStudents}
          />
        );
      case "extra-study":
        return (
          <ReinforcementPage
            records={extraStudyRecords}
            historyRecords={extraStudyHistoryRecords}
            onRecordsChange={setExtraStudyRecords}
            students={students}
            classes={classes}
            isLoading={extraStudyLoading}
            loadError={extraStudyError}
            onCreateRecords={handleCreateExtraStudyRecords}
            onDeleteRecord={handleDeleteExtraStudyRecord}
            onMoveRecord={handleMoveExtraStudyRecord}
            onLoadHistoryRange={handleLoadExtraStudyRange}
          />
        );
      case "attendance": {
        const currAttDate = currentAttendanceDateRef.current;
        const start = activeStartDateRef.current;
        const end = activeEndDateRef.current;
        const isInActiveRange = Boolean(
          start && end && currAttDate && currAttDate >= start && currAttDate <= end
        );
        const effectiveExtraStudyRecords =
          isInActiveRange || !currAttDate
            ? extraStudyRecords
            : attendanceExtraStudyRecords;

        return (
          <AttendancePage
            records={effectiveExtraStudyRecords}
            attendanceRecords={attendanceRecords}
            attendanceLoading={attendanceLoading}
            attendanceError={attendanceError}
            attendanceSaving={attendanceSaving}
            attendanceFinalizing={attendanceFinalizing}
            attendanceMarkingLate={attendanceMarkingLate}
            onAttendanceRecordsChange={setAttendanceRecords}
            onViewChange={handleLoadAttendanceView}
            onSaveAttendanceRecords={handleSaveAttendanceRecords}
            onFinalizeAttendanceRecords={handleFinalizeAttendanceRecords}
            onMarkAttendanceLate={handleMarkAttendanceLate}
            students={students}
            classes={classes}
          />
        );
      }
      case "reports":
        return (
          <ReportPage
            attendanceRecords={reportAttendanceRecords}
            reportLoading={reportLoading}
            reportError={reportError}
            onAttendanceRecordsChange={handleSetReportAttendanceRecords}
            onLoadDailyReport={handleLoadDailyReport}
            onLoadMonthlyReport={handleLoadMonthlyReport}
            onFinalizeDailyReport={handleFinalizeDailyReport}
            onUpdateMadeUpStatus={handleUpdateAttendanceMadeUpStatus}
            madeUpUpdatingIds={reportMadeUpUpdatingIds}
            madeUpError={reportMadeUpError}
            extraStudyRecords={extraStudyRecords}
            students={students}
            classes={classes}
          />
        );
      case "teachers":
        return (
          <TeachersPage
            currentUser={currentUser}
            teachers={teachers}
            onTeachersChange={setTeachers}
            onReloadTeachers={loadTeachers}
            onCreateTeacher={handleCreateTeacher}
          />
        );
      default:
        return (
          <StudentsPage
            currentUser={currentUser}
            students={students}
            studentsLoading={studentsLoading}
            studentsError={studentsError}
            classes={classes}
            classesLoading={classesLoading}
            classesError={classesError}
            onStudentsChange={setStudents}
            onClassesChange={setClasses}
            onReloadClasses={loadClasses}
            onReloadStudents={loadStudents}
          />
        );
    }
  };

  return (
    <AppLayout
      currentUser={currentUser}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onLogout={signOutUser}
    >
      {renderActiveTabContent()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

