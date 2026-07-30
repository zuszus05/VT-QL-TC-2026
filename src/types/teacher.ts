export type TeacherRole = "admin" | "teacher";
export type TeacherStatus = "pending" | "active" | "disabled";

export interface TeacherProfile {
  uid: string;
  email: string;
  displayName: string;
  role: TeacherRole;
  status: TeacherStatus;
  createdAt: string;
  updatedAt: string;
}
