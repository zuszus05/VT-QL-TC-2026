import { UserRole, UserStatus } from "../types/user";

export const USER_ROLES: readonly UserRole[] = ["admin", "teacher"];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Quản trị viên",
  teacher: "Giáo viên",
};

export const USER_STATUSES: readonly UserStatus[] = [
  "pending",
  "approved",
  "blocked",
];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  blocked: "Đã khóa",
};
