export type StudySession = "morning" | "afternoon" | "evening";

export type ExtraSubject =
  | "algebra"
  | "geometry"
  | "science"
  | "practice-test";

export type ExtraStudyType = "extra-study" | "make-up";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type ExtraStudyStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "archived";

export type SourceStudySession = "morning" | "afternoon";

export interface ExtraStudyRecord {
  extraStudyId: string;
  studentId: string;
  subject: ExtraSubject;
  targetDate: string; // YYYY-MM-DD
  targetSession: StudySession;
  sourceDate: string; // YYYY-MM-DD
  sourceSession: SourceStudySession;
  status: ExtraStudyStatus;
  note?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReinforcementScheduleRecord {
  extraStudyId: string;
  studentId: string;
  subject: ExtraSubject;
  type: ExtraStudyType;
  weekday: Weekday;
  targetDate: string; // YYYY-MM-DD
  session: StudySession;
  status: ExtraStudyStatus;
  createdByUserId?: string;
  updatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

