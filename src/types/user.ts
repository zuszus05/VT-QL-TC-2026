import { ExtraSubject } from "./extraStudy";

export type UserRole = "admin" | "teacher";

export type UserStatus = "pending" | "approved" | "blocked";

export interface AppUser {
  userId: string;
  fullName: string;
  email: string;
  title?: string;
  subject?: ExtraSubject | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

// UserProfile giữ để tương thích với AppHeader / Sidebar / Mock hiện tại
export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  title: string;
  subject: string | null;
  role: UserRole;
}
