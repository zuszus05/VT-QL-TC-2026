import { AppUser, UserProfile, UserRole } from "../types/user";

/**
 * CẤU HÌNH KIỂM THỬ VAI TRÒ MẪU:
 * - Thay đổi giá trị mockRole bên dưới thành "admin" hoặc "teacher" để kiểm thử phân quyền giao diện.
 */
export const mockRole: UserRole = "admin";

export const ADMIN_USER: UserProfile = {
  id: "admin-root",
  fullName: "Vương Thuận",
  email: "thuanvuong05@gmail.com",
  title: "Quản lý giáo dục",
  subject: null,
  role: "admin",
};

export const TEACHER_USER: UserProfile = {
  id: "teacher-demo",
  fullName: "Phương Thảo",
  email: "giaovien@example.com",
  title: "Giáo viên",
  subject: "Toán Đại",
  role: "teacher",
};

export const MOCK_APP_USERS: AppUser[] = [
  {
    userId: "usr-admin-1",
    fullName: "Vương Thuận",
    email: "thuanvuong05@gmail.com",
    title: "Quản lý giáo dục",
    subject: null,
    role: "admin",
    status: "approved",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    userId: "usr-teacher-1",
    fullName: "Phương Thảo",
    email: "giaovien@example.com",
    title: "Giáo viên",
    subject: "algebra",
    role: "teacher",
    status: "approved",
    createdAt: "2026-01-05T08:00:00.000Z",
    updatedAt: "2026-01-05T08:00:00.000Z",
  },
  {
    userId: "usr-teacher-pending-1",
    fullName: "Nguyễn Kim Anh",
    email: "kimanh.nguyen@school.edu.vn",
    title: "Giáo viên bộ môn",
    subject: "science",
    role: "teacher",
    status: "pending",
    createdAt: "2026-07-22T09:15:00.000Z",
    updatedAt: "2026-07-22T09:15:00.000Z",
  },
];

export function getCurrentUser(role: UserRole = mockRole): UserProfile {
  return role === "admin" ? ADMIN_USER : TEACHER_USER;
}
