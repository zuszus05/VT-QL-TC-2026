import { GradeLevel } from "./academic";
import { StudySession, ExtraSubject } from "./extraStudy";

export type StudySessionFilter = "all" | StudySession;

export interface TodayStudentSchedule {
  extraStudyId: string;
  studentId: string;
  candidateNumber: number; // SBD kiểu number
  fullName: string;
  grade: GradeLevel;
  className: string;
  subject?: ExtraSubject;
  session: StudySession;
  sessionTime: string;
}

export interface DashboardSummary {
  totalStudents: number;
  totalClasses: number;
  extraStudyStudents: number;
  approvedTeachers: number;
  pendingTeachers: number;
}

export interface GradeDistributionItem {
  gradeLabel: string;
  count: number;
  percentage: number;
}

export interface SubjectDistributionItem {
  subject: ExtraSubject;
  count: number;
  colorClass: string;
}

export interface SessionCountSummary {
  morning: number;
  afternoon: number;
  evening: number;
}

