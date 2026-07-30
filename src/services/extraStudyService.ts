import {
  collection,
  doc,
  getDocs,
  writeBatch,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  ReinforcementScheduleRecord,
  ExtraSubject,
  ExtraStudyType,
  Weekday,
  StudySession,
  ExtraStudyStatus,
} from "../types/extraStudy";

export interface CreateExtraStudyRecordInput {
  studentId: string;
  subject: ExtraSubject;
  type: ExtraStudyType;
  weekday: Weekday;
  targetDate: string;
  session: StudySession;
  status: ExtraStudyStatus;
  createdByUserId: string;
  updatedByUserId: string;
}

export interface UpdateExtraStudyScheduleInput {
  weekday: Weekday;
  targetDate: string;
  session: StudySession;
  updatedByUserId: string;
}

function normalizeDate(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof value === "string" ? value : "";
}

function mapExtraStudyDoc(
  docSnap: QueryDocumentSnapshot | DocumentSnapshot
): ReinforcementScheduleRecord {
  const data = docSnap.data() || {};
  return {
    extraStudyId: docSnap.id,
    studentId: String(data.studentId || "").trim(),
    subject: data.subject || "algebra",
    type: data.type || "extra-study",
    weekday: data.weekday || "monday",
    targetDate: String(data.targetDate || "").trim(),
    session: data.session || "morning",
    status: data.status || "scheduled",
    createdByUserId: data.createdByUserId ? String(data.createdByUserId) : undefined,
    updatedByUserId: data.updatedByUserId ? String(data.updatedByUserId) : undefined,
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
  };
}

/**
 * Reads all extra study records from Firestore 'extraStudyRecords' collection.
 * Throws an Error if fetching fails.
 */
export async function loadExtraStudyRecords(): Promise<ReinforcementScheduleRecord[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "extraStudyRecords"));
    const records: ReinforcementScheduleRecord[] = [];

    querySnapshot.forEach((docSnap) => {
      records.push(mapExtraStudyDoc(docSnap));
    });

    return records;
  } catch (error) {
    console.error("[extraStudyService] Lỗi khi tải danh sách extraStudyRecords từ Firestore:", error);
    throw error;
  }
}

/**
 * Reads extra study records from Firestore 'extraStudyRecords' collection within a date range [startDate, endDate].
 * Uses targetDate field for query filtering.
 */
export async function loadExtraStudyRecordsByDateRange(
  startDate: string,
  endDate: string
): Promise<ReinforcementScheduleRecord[]> {
  const trimmedStart = typeof startDate === "string" ? startDate.trim() : "";
  const trimmedEnd = typeof endDate === "string" ? endDate.trim() : "";

  if (!trimmedStart || !trimmedEnd) {
    throw new Error("startDate và endDate không hợp lệ.");
  }

  try {
    const q = query(
      collection(db, "extraStudyRecords"),
      where("targetDate", ">=", trimmedStart),
      where("targetDate", "<=", trimmedEnd)
    );

    const querySnapshot = await getDocs(q);
    const records: ReinforcementScheduleRecord[] = [];

    querySnapshot.forEach((docSnap) => {
      records.push(mapExtraStudyDoc(docSnap));
    });

    return records;
  } catch (error) {
    console.error(
      `[extraStudyService] Lỗi khi tải extraStudyRecords trong khoảng ${trimmedStart} đến ${trimmedEnd} từ Firestore:`,
      error
    );
    throw error;
  }
}

/**
 * Subscribes to real-time extra study records from Firestore 'extraStudyRecords' collection within [startDate, endDate].
 * Uses targetDate field for query filtering.
 * Returns a Firestore Unsubscribe function.
 */
export function subscribeExtraStudyRecordsByDateRange(
  startDate: string,
  endDate: string,
  onData: (records: ReinforcementScheduleRecord[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const trimmedStart = typeof startDate === "string" ? startDate.trim() : "";
  const trimmedEnd = typeof endDate === "string" ? endDate.trim() : "";

  if (!trimmedStart || !trimmedEnd) {
    onError(new Error("startDate và endDate không hợp lệ."));
    return () => {};
  }

  try {
    const q = query(
      collection(db, "extraStudyRecords"),
      where("targetDate", ">=", trimmedStart),
      where("targetDate", "<=", trimmedEnd)
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        const records: ReinforcementScheduleRecord[] = [];
        querySnapshot.forEach((docSnap) => {
          records.push(mapExtraStudyDoc(docSnap));
        });
        onData(records);
      },
      (error) => {
        console.error(
          `[extraStudyService] Lỗi realtime extraStudyRecords trong khoảng ${trimmedStart} đến ${trimmedEnd}:`,
          error
        );
        onError(error);
      }
    );
  } catch (error) {
    console.error(
      `[extraStudyService] Lỗi khi tạo listener extraStudyRecords trong khoảng ${trimmedStart} đến ${trimmedEnd}:`,
      error
    );
    onError(error instanceof Error ? error : new Error(String(error)));
    return () => {};
  }
}

/**
 * Creates extra study records in Firestore 'extraStudyRecords' collection using writeBatch (chunks of 400).
 * Returns the created ReinforcementScheduleRecord array.
 */
export async function createExtraStudyRecords(
  inputs: CreateExtraStudyRecordInput[],
  onPrepared?: (records: ReinforcementScheduleRecord[]) => void
): Promise<ReinforcementScheduleRecord[]> {
  if (!inputs || inputs.length === 0) {
    return [];
  }

  const nowIso = new Date().toISOString();
  const createdRecords: ReinforcementScheduleRecord[] = [];
  const BATCH_SIZE = 400;

  const extraStudyRef = collection(db, "extraStudyRecords");

  const prepareList = inputs.map((input) => {
    const docRef = doc(extraStudyRef);
    const extraStudyId = docRef.id;

    const record: ReinforcementScheduleRecord = {
      extraStudyId,
      studentId: input.studentId,
      subject: input.subject,
      type: input.type,
      weekday: input.weekday,
      targetDate: input.targetDate,
      session: input.session,
      status: input.status || "scheduled",
      createdByUserId: input.createdByUserId,
      updatedByUserId: input.updatedByUserId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const docData = {
      extraStudyId,
      studentId: input.studentId,
      subject: input.subject,
      type: input.type,
      weekday: input.weekday,
      targetDate: input.targetDate,
      session: input.session,
      status: input.status || "scheduled",
      createdByUserId: input.createdByUserId,
      updatedByUserId: input.updatedByUserId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return { docRef, record, docData };
  });

  const preparedRecords = prepareList.map((item) => item.record);

  if (onPrepared) {
    try {
      onPrepared(preparedRecords);
    } catch (err) {
      console.error("[extraStudyService] Lỗi trong callback onPrepared:", err);
    }
  }

  for (let i = 0; i < prepareList.length; i += BATCH_SIZE) {
    const chunk = prepareList.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const item of chunk) {
      batch.set(item.docRef, item.docData);
    }

    try {
      await batch.commit();
      for (const item of chunk) {
        createdRecords.push(item.record);
      }
    } catch (error) {
      console.error("[extraStudyService] Lỗi khi tạo extraStudyRecords trên Firestore:", error);
      throw error;
    }
  }

  return createdRecords;
}

/**
 * Deletes an extra study record from Firestore 'extraStudyRecords' collection by extraStudyId.
 */
export async function deleteExtraStudyRecord(extraStudyId: string): Promise<void> {
  const trimmedId = typeof extraStudyId === "string" ? extraStudyId.trim() : "";
  if (!trimmedId) {
    throw new Error("extraStudyId không hợp lệ.");
  }

  try {
    const docRef = doc(db, "extraStudyRecords", trimmedId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`[extraStudyService] Lỗi khi xóa extraStudyRecord (${trimmedId}) trên Firestore:`, error);
    throw error;
  }
}

/**
 * Updates weekday, targetDate, session and updatedByUserId for an extra study record in Firestore.
 */
export async function updateExtraStudySchedule(
  extraStudyId: string,
  input: UpdateExtraStudyScheduleInput
): Promise<void> {
  const trimmedId = typeof extraStudyId === "string" ? extraStudyId.trim() : "";
  const trimmedUserId = typeof input?.updatedByUserId === "string" ? input.updatedByUserId.trim() : "";
  const trimmedTargetDate = typeof input?.targetDate === "string" ? input.targetDate.trim() : "";

  if (!trimmedId) {
    throw new Error("extraStudyId không hợp lệ.");
  }
  if (!trimmedUserId) {
    throw new Error("updatedByUserId không hợp lệ.");
  }
  if (!trimmedTargetDate) {
    throw new Error("targetDate không hợp lệ.");
  }

  try {
    const docRef = doc(db, "extraStudyRecords", trimmedId);
    await updateDoc(docRef, {
      weekday: input.weekday,
      targetDate: trimmedTargetDate,
      session: input.session,
      updatedByUserId: trimmedUserId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`[extraStudyService] Lỗi khi cập nhật lịch extraStudyRecord (${trimmedId}) trên Firestore:`, error);
    throw error;
  }
}

/**
 * Archives extra study records in Firestore 'extraStudyRecords' collection by extraStudyIds.
 * Updates status to 'archived', updatedByUserId, and updatedAt.
 */
export async function archiveExtraStudyRecords(
  extraStudyIds: string[],
  updatedByUserId: string
): Promise<void> {
  const trimmedUserId = typeof updatedByUserId === "string" ? updatedByUserId.trim() : "";
  if (!trimmedUserId) {
    throw new Error("updatedByUserId không hợp lệ.");
  }

  if (!extraStudyIds || extraStudyIds.length === 0) {
    return;
  }

  const uniqueIds = Array.from(
    new Set(
      extraStudyIds
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter((id) => id.length > 0)
    )
  );

  if (uniqueIds.length === 0) {
    return;
  }

  const BATCH_SIZE = 400;
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const chunk = uniqueIds.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const id of chunk) {
      const docRef = doc(db, "extraStudyRecords", id);
      batch.update(docRef, {
        status: "archived",
        updatedByUserId: trimmedUserId,
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      console.error(
        "[extraStudyService] Lỗi khi lưu trữ extraStudyRecords trên Firestore:",
        error
      );
      throw error;
    }
  }
}


