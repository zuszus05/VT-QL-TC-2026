import { TeacherProfile } from "../types/teacher";

export const MOCK_TEACHERS: TeacherProfile[] = [
  {
    uid: "admin-root",
    email: "thuanvuong05@gmail.com",
    displayName: "Vương Thuận",
    role: "admin",
    status: "active",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    uid: "teacher-1",
    email: "nguyenvana@gmail.com",
    displayName: "Nguyễn Văn An",
    role: "teacher",
    status: "active",
    createdAt: "2026-02-10T09:30:00.000Z",
    updatedAt: "2026-02-10T09:30:00.000Z",
  },
  {
    uid: "teacher-2",
    email: "tranthib@gmail.com",
    displayName: "Trần Thị Bình",
    role: "teacher",
    status: "active",
    createdAt: "2026-02-15T10:15:00.000Z",
    updatedAt: "2026-02-15T10:15:00.000Z",
  },
  {
    uid: "teacher-3",
    email: "leofficec@gmail.com",
    displayName: "Lê Văn Cường",
    role: "teacher",
    status: "pending",
    createdAt: "2026-03-01T14:20:00.000Z",
    updatedAt: "2026-03-01T14:20:00.000Z",
  },
  {
    uid: "teacher-4",
    email: "phamthid@gmail.com",
    displayName: "Phạm Thị Dung",
    role: "teacher",
    status: "disabled",
    createdAt: "2026-01-20T11:00:00.000Z",
    updatedAt: "2026-02-01T16:45:00.000Z",
  },
];
