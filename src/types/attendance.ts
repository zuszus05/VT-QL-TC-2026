import { StudySession } from "./extraStudy";

export type AttendanceStatus = "present" | "absent" | "late";

export interface AttendanceRecord {
  attendanceId: string;
  extraStudyId: string;
  studentId: string;
  attendanceDate: string; // YYYY-MM-DD
  session: StudySession;
  status: AttendanceStatus;
  note: string;
  isFinalized: boolean;
  finalizedAt: string | null;
  finalizedByUserId: string | null;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string | null;
  updatedAt: string | null;

  // Legacy / optional fields for report features (will be standardized in Reports module later)
  isExcused?: boolean;
  excuseReason?: string;
  excusedAt?: string;
  isMadeUp?: boolean;
  madeUpAt?: string | null;
  madeUpByUserId?: string | null;
  absenceFinalized?: boolean;
  absenceFinalizedAt?: string;
}
