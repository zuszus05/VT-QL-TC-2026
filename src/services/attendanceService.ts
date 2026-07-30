import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  updateDoc,
  serverTimestamp,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { AttendanceRecord, AttendanceStatus } from "../types/attendance";
import { StudySession } from "../types/extraStudy";

export type { AttendanceStatus, AttendanceRecord };

export interface LoadAttendanceRecordsInput {
  attendanceDate: string;
  session: StudySession;
}

export interface SaveAttendanceRecordsInput {
  records: AttendanceRecord[];
  updatedByUserId: string;
}

export interface FinalizeAttendanceRecordsInput {
  attendanceIds: string[];
  finalizedByUserId: string;
}

function isValidAttendanceDate(dateStr: string): boolean {
  if (typeof dateStr !== "string") return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isValidSession(session: unknown): session is StudySession {
  return session === "morning" || session === "afternoon" || session === "evening";
}

function isValidAttendanceStatus(status: unknown): status is AttendanceStatus {
  return status === "present" || status === "absent" || status === "late";
}

function isValidMonthKey(monthKey: string): boolean {
  if (typeof monthKey !== "string") return false;
  const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
  return regex.test(monthKey.trim());
}

function sortAttendanceRecords(records: AttendanceRecord[]): AttendanceRecord[] {
  const sessionRank: Record<StudySession, number> = {
    morning: 1,
    afternoon: 2,
    evening: 3,
  };

  return [...records].sort((a, b) => {
    if (a.attendanceDate !== b.attendanceDate) {
      return a.attendanceDate.localeCompare(b.attendanceDate);
    }
    const rankA = sessionRank[a.session] || 99;
    const rankB = sessionRank[b.session] || 99;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    if (a.studentId !== b.studentId) {
      return a.studentId.localeCompare(b.studentId);
    }
    return a.attendanceId.localeCompare(b.attendanceId);
  });
}

function timestampToIsoString(value: unknown): string | null {
  if (!value) return null;
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

/**
 * Internal function to map a Firestore document snapshot to an AttendanceRecord object.
 */
function mapAttendanceDocument(docSnap: DocumentSnapshot): AttendanceRecord {
  const data = docSnap.data();
  if (!data) {
    throw new Error(`Dữ liệu bản ghi điểm danh (${docSnap.id}) không tồn tại.`);
  }

  const extraStudyId =
    typeof data.extraStudyId === "string" ? data.extraStudyId.trim() : "";
  if (!extraStudyId) {
    throw new Error(
      `Bản ghi điểm danh (${docSnap.id}) thiếu extraStudyId hợp lệ.`
    );
  }

  const studentId =
    typeof data.studentId === "string" ? data.studentId.trim() : "";
  if (!studentId) {
    throw new Error(
      `Bản ghi điểm danh (${docSnap.id}) thiếu studentId hợp lệ.`
    );
  }

  const attendanceDate =
    typeof data.attendanceDate === "string" ? data.attendanceDate.trim() : "";
  if (!isValidAttendanceDate(attendanceDate)) {
    throw new Error(
      `Bản ghi điểm danh (${docSnap.id}) có attendanceDate không hợp lệ: "${data.attendanceDate}".`
    );
  }

  const session = data.session;
  if (!isValidSession(session)) {
    throw new Error(
      `Bản ghi điểm danh (${docSnap.id}) có session không hợp lệ: "${data.session}".`
    );
  }

  const status = data.status;
  if (!isValidAttendanceStatus(status)) {
    throw new Error(
      `Bản ghi điểm danh (${docSnap.id}) có status không hợp lệ: "${data.status}".`
    );
  }

  return {
    attendanceId: docSnap.id,
    extraStudyId,
    studentId,
    attendanceDate,
    session,
    status,
    note: typeof data.note === "string" ? data.note : "",
    isFinalized:
      typeof data.isFinalized === "boolean" ? data.isFinalized : false,
    finalizedAt: timestampToIsoString(data.finalizedAt),
    finalizedByUserId:
      typeof data.finalizedByUserId === "string" ? data.finalizedByUserId : null,
    isMadeUp: data.isMadeUp === true,
    madeUpAt: timestampToIsoString(data.madeUpAt),
    madeUpByUserId:
      typeof data.madeUpByUserId === "string" && data.madeUpByUserId.trim() !== ""
        ? data.madeUpByUserId.trim()
        : null,
    createdByUserId:
      typeof data.createdByUserId === "string" ? data.createdByUserId : "",
    updatedByUserId:
      typeof data.updatedByUserId === "string" ? data.updatedByUserId : "",
    createdAt: timestampToIsoString(data.createdAt),
    updatedAt: timestampToIsoString(data.updatedAt),
  };
}

/**
 * Loads attendance records for a specific date (YYYY-MM-DD) and session from Firestore collection 'attendanceRecords'.
 * Throws an Error if input validation fails or if fetching fails.
 */
export async function loadAttendanceRecords(
  input: LoadAttendanceRecordsInput
): Promise<AttendanceRecord[]> {
  const trimmedDate =
    typeof input?.attendanceDate === "string" ? input.attendanceDate.trim() : "";

  if (!isValidAttendanceDate(trimmedDate)) {
    throw new Error(
      `attendanceDate không hợp lệ (yêu cầu YYYY-MM-DD): "${input?.attendanceDate}"`
    );
  }

  if (!isValidSession(input?.session)) {
    throw new Error(
      `session không hợp lệ (morning | afternoon | evening): "${input?.session}"`
    );
  }

  try {
    const q = query(
      collection(db, "attendanceRecords"),
      where("attendanceDate", "==", trimmedDate),
      where("session", "==", input.session)
    );

    const querySnapshot = await getDocs(q);
    const records: AttendanceRecord[] = [];

    querySnapshot.forEach((docSnap) => {
      records.push(mapAttendanceDocument(docSnap));
    });

    return records;
  } catch (error) {
    console.error(
      `[attendanceService] Lỗi khi nạp bản ghi điểm danh ngày ${trimmedDate} ca ${input.session} từ Firestore:`,
      error
    );
    throw error;
  }
}

/**
 * Saves attendance records to Firestore collection 'attendanceRecords' using batch writes.
 * Performs input validation, anti-duplication checks, and splits into batches of max 400.
 */
export async function saveAttendanceRecords(
  input: SaveAttendanceRecordsInput
): Promise<void> {
  const updatedByUserId =
    typeof input?.updatedByUserId === "string" ? input.updatedByUserId.trim() : "";

  if (!updatedByUserId) {
    throw new Error("updatedByUserId không hợp lệ hoặc rỗng.");
  }

  if (!Array.isArray(input?.records)) {
    throw new Error("Danh sách records điểm danh không hợp lệ.");
  }

  if (input.records.length === 0) {
    return;
  }

  // 1. Anti-duplicate and per-record validation
  const seenIds = new Set<string>();

  for (const rec of input.records) {
    const attendanceId =
      typeof rec?.attendanceId === "string" ? rec.attendanceId.trim() : "";
    if (!attendanceId) {
      throw new Error("Bản ghi điểm danh có attendanceId rỗng hoặc không hợp lệ.");
    }

    if (seenIds.has(attendanceId)) {
      throw new Error(
        `Phát hiện bản ghi điểm danh bị trùng attendanceId: "${attendanceId}".`
      );
    }
    seenIds.add(attendanceId);

    const extraStudyId =
      typeof rec?.extraStudyId === "string" ? rec.extraStudyId.trim() : "";
    if (!extraStudyId) {
      throw new Error(`Bản ghi điểm danh (${attendanceId}) thiếu extraStudyId hợp lệ.`);
    }

    const studentId =
      typeof rec?.studentId === "string" ? rec.studentId.trim() : "";
    if (!studentId) {
      throw new Error(`Bản ghi điểm danh (${attendanceId}) thiếu studentId hợp lệ.`);
    }

    const attendanceDate =
      typeof rec?.attendanceDate === "string" ? rec.attendanceDate.trim() : "";
    if (!isValidAttendanceDate(attendanceDate)) {
      throw new Error(
        `Bản ghi điểm danh (${attendanceId}) có attendanceDate không hợp lệ: "${rec?.attendanceDate}".`
      );
    }

    if (!isValidSession(rec?.session)) {
      throw new Error(
        `Bản ghi điểm danh (${attendanceId}) có session không hợp lệ: "${rec?.session}".`
      );
    }

    if (!isValidAttendanceStatus(rec?.status)) {
      throw new Error(
        `Bản ghi điểm danh (${attendanceId}) có status không hợp lệ: "${rec?.status}".`
      );
    }
  }

  // 2. Write to Firestore using writeBatch, split into chunks of max 400
  const BATCH_LIMIT = 400;

  try {
    for (let i = 0; i < input.records.length; i += BATCH_LIMIT) {
      const chunk = input.records.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);

      chunk.forEach((rec) => {
        const docId = rec.attendanceId.trim();
        const docRef = doc(db, "attendanceRecords", docId);

        const isNewRecord = !rec.createdAt;

        const payload: Record<string, unknown> = {
          attendanceId: docId,
          extraStudyId: rec.extraStudyId.trim(),
          studentId: rec.studentId.trim(),
          attendanceDate: rec.attendanceDate.trim(),
          session: rec.session,
          status: rec.status,
          note: typeof rec.note === "string" ? rec.note : "",
          isFinalized: Boolean(rec.isFinalized),
          finalizedAt: rec.finalizedAt ?? null,
          finalizedByUserId:
            typeof rec.finalizedByUserId === "string" && rec.finalizedByUserId.trim()
              ? rec.finalizedByUserId.trim()
              : null,
          createdByUserId:
            typeof rec.createdByUserId === "string" && rec.createdByUserId.trim()
              ? rec.createdByUserId.trim()
              : updatedByUserId,
          updatedByUserId: updatedByUserId,
          updatedAt: serverTimestamp(),
        };

        if (isNewRecord) {
          payload.createdAt = serverTimestamp();
        }

        batch.set(docRef, payload, { merge: true });
      });

      await batch.commit();
    }
  } catch (error) {
    console.error(
      "[attendanceService] Lỗi khi lưu bản ghi điểm danh lên Firestore:",
      error
    );
    throw error;
  }
}

/**
 * Finalizes attendance records in Firestore collection 'attendanceRecords' using batch writes.
 * Only updates isFinalized, finalizedAt, finalizedByUserId, updatedAt, updatedByUserId.
 */
export async function finalizeAttendanceRecords(
  input: FinalizeAttendanceRecordsInput
): Promise<void> {
  const finalizedByUserId =
    typeof input?.finalizedByUserId === "string"
      ? input.finalizedByUserId.trim()
      : "";

  if (!finalizedByUserId) {
    throw new Error("finalizedByUserId không hợp lệ hoặc rỗng.");
  }

  if (!Array.isArray(input?.attendanceIds)) {
    throw new Error("Danh sách attendanceIds không hợp lệ.");
  }

  const validIds: string[] = [];
  const seenIds = new Set<string>();

  for (const id of input.attendanceIds) {
    if (typeof id === "string") {
      const trimmed = id.trim();
      if (trimmed && !seenIds.has(trimmed)) {
        seenIds.add(trimmed);
        validIds.push(trimmed);
      }
    }
  }

  if (validIds.length === 0) {
    return;
  }

  const BATCH_LIMIT = 400;

  try {
    for (let i = 0; i < validIds.length; i += BATCH_LIMIT) {
      const chunk = validIds.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);

      chunk.forEach((docId) => {
        const docRef = doc(db, "attendanceRecords", docId);
        batch.update(docRef, {
          isFinalized: true,
          finalizedAt: serverTimestamp(),
          finalizedByUserId: finalizedByUserId,
          updatedAt: serverTimestamp(),
          updatedByUserId: finalizedByUserId,
        });
      });

      await batch.commit();
    }
  } catch (error) {
    console.error(
      "[attendanceService] Lỗi khi chốt vắng bản ghi điểm danh trên Firestore:",
      error
    );
    throw error;
  }
}

export interface MarkAttendanceLateInput {
  attendanceId: string;
  updatedByUserId: string;
}

export async function markAttendanceLate(
  input: MarkAttendanceLateInput
): Promise<void> {
  const { attendanceId, updatedByUserId } = input;
  if (typeof attendanceId !== "string" || !attendanceId.trim()) {
    throw new Error("attendanceId không hợp lệ");
  }
  if (typeof updatedByUserId !== "string" || !updatedByUserId.trim()) {
    throw new Error("updatedByUserId không hợp lệ");
  }

  const docRef = doc(db, "attendanceRecords", attendanceId.trim());

  try {
    await updateDoc(docRef, {
      status: "late",
      updatedAt: serverTimestamp(),
      updatedByUserId: updatedByUserId.trim(),
    });
  } catch (error) {
    console.error("[attendanceService] Lỗi khi đánh dấu muộn trên Firestore:", error);
    throw error;
  }
}

/**
 * Updates the made-up (học bù) status for a specific attendance record (status === "absent").
 * Note: This function MUST only be called for an AttendanceRecord with status === "absent".
 * Performs direct updateDoc to Firestore without prior read.
 */
export async function updateAttendanceMadeUpStatus(
  attendanceId: string,
  isMadeUp: boolean,
  userId: string
): Promise<void> {
  const trimmedAttendanceId =
    typeof attendanceId === "string" ? attendanceId.trim() : "";
  const trimmedUserId = typeof userId === "string" ? userId.trim() : "";

  if (!trimmedAttendanceId) {
    throw new Error("attendanceId không hợp lệ hoặc rỗng.");
  }

  if (!trimmedUserId) {
    throw new Error("userId không hợp lệ hoặc rỗng.");
  }

  if (typeof isMadeUp !== "boolean") {
    throw new Error("isMadeUp phải là kiểu boolean.");
  }

  const docRef = doc(db, "attendanceRecords", trimmedAttendanceId);

  try {
    if (isMadeUp) {
      await updateDoc(docRef, {
        isMadeUp: true,
        madeUpAt: serverTimestamp(),
        madeUpByUserId: trimmedUserId,
        updatedAt: serverTimestamp(),
        updatedByUserId: trimmedUserId,
      });
    } else {
      await updateDoc(docRef, {
        isMadeUp: false,
        madeUpAt: null,
        madeUpByUserId: null,
        updatedAt: serverTimestamp(),
        updatedByUserId: trimmedUserId,
      });
    }
  } catch (error) {
    console.error(
      `[attendanceService] updateAttendanceMadeUpStatus lỗi cho attendanceId="${trimmedAttendanceId}":`,
      error
    );
    throw error;
  }
}

/**
 * Loads all attendance records for a specific date (YYYY-MM-DD) across all sessions and statuses.
 */
export async function loadAttendanceRecordsByDate(
  attendanceDate: string
): Promise<AttendanceRecord[]> {
  const trimmedDate =
    typeof attendanceDate === "string" ? attendanceDate.trim() : "";

  if (!isValidAttendanceDate(trimmedDate)) {
    throw new Error(
      `attendanceDate không hợp lệ (yêu cầu YYYY-MM-DD): "${attendanceDate}"`
    );
  }

  try {
    const q = query(
      collection(db, "attendanceRecords"),
      where("attendanceDate", "==", trimmedDate)
    );
    const querySnapshot = await getDocs(q);
    const records: AttendanceRecord[] = [];

    querySnapshot.forEach((docSnap) => {
      records.push(mapAttendanceDocument(docSnap));
    });

    return sortAttendanceRecords(records);
  } catch (error) {
    console.error(
      `[attendanceService] Lỗi khi loadAttendanceRecordsByDate với date="${attendanceDate}":`,
      error
    );
    throw error;
  }
}

/**
 * Loads all attendance records for a specific month (YYYY-MM) across all dates, sessions, and statuses.
 */
export async function loadAttendanceRecordsByMonth(
  monthKey: string
): Promise<AttendanceRecord[]> {
  const trimmedMonth = typeof monthKey === "string" ? monthKey.trim() : "";

  if (!isValidMonthKey(trimmedMonth)) {
    throw new Error(
      `monthKey không hợp lệ (yêu cầu YYYY-MM): "${monthKey}"`
    );
  }

  const [year, month] = trimmedMonth.split("-").map(Number);
  const startDate = `${trimmedMonth}-01`;
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const nextMonthStr = String(nextMonth).padStart(2, "0");
  const exclusiveEndDate = `${nextYear}-${nextMonthStr}-01`;

  try {
    const q = query(
      collection(db, "attendanceRecords"),
      where("attendanceDate", ">=", startDate),
      where("attendanceDate", "<", exclusiveEndDate)
    );
    const querySnapshot = await getDocs(q);
    const records: AttendanceRecord[] = [];

    querySnapshot.forEach((docSnap) => {
      records.push(mapAttendanceDocument(docSnap));
    });

    return sortAttendanceRecords(records);
  } catch (error) {
    console.error(
      `[attendanceService] Lỗi khi loadAttendanceRecordsByMonth với monthKey="${monthKey}":`,
      error
    );
    throw error;
  }
}
