import { ExtraStudyRecord, ReinforcementScheduleRecord } from "../types/extraStudy";
import { getNextDateForWeekday } from "../utils/date";

export const MOCK_EXTRA_STUDY_RECORDS: ExtraStudyRecord[] = [
  // Nguyễn Văn An (std-601) - Nguồn: Ca sáng 2026-07-23 -> Xếp: Ca chiều 2026-07-23
  {
    extraStudyId: "ext-101",
    studentId: "std-601",
    subject: "algebra",
    sourceDate: "2026-07-23",
    sourceSession: "morning",
    targetDate: "2026-07-23",
    targetSession: "afternoon",
    status: "scheduled",
    note: "Ôn tập phép chia số tự nhiên",
    createdByUserId: "usr-admin-1",
    createdAt: "2026-07-23T11:30:00.000Z",
    updatedAt: "2026-07-23T11:30:00.000Z",
  },

  // Trần Thị Bình (std-701) - Nguồn: Ca sáng 2026-07-23 -> Xếp: Ca chiều 2026-07-23
  {
    extraStudyId: "ext-102",
    studentId: "std-701",
    subject: "geometry",
    sourceDate: "2026-07-23",
    sourceSession: "morning",
    targetDate: "2026-07-23",
    targetSession: "afternoon",
    status: "scheduled",
    note: "Tăng cường hai đường thẳng song song",
    createdByUserId: "usr-admin-1",
    createdAt: "2026-07-23T11:35:00.000Z",
    updatedAt: "2026-07-23T11:35:00.000Z",
  },

  // Lê Hoàng Cường (std-801) - Nguồn: Ca chiều 2026-07-22 -> Xếp: Ca tối 2026-07-23
  {
    extraStudyId: "ext-103",
    studentId: "std-801",
    subject: "science",
    sourceDate: "2026-07-22",
    sourceSession: "afternoon",
    targetDate: "2026-07-23",
    targetSession: "evening",
    status: "scheduled",
    note: "Phụ đạo công thức hóa học",
    createdByUserId: "usr-teacher-1",
    createdAt: "2026-07-22T17:00:00.000Z",
    updatedAt: "2026-07-22T17:00:00.000Z",
  },

  // Phạm Minh Đức (std-901) - Nguồn: Ca sáng 2026-07-23 -> Xếp: Ca tối 2026-07-23
  {
    extraStudyId: "ext-104",
    studentId: "std-901",
    subject: "practice-test",
    sourceDate: "2026-07-23",
    sourceSession: "morning",
    targetDate: "2026-07-23",
    targetSession: "evening",
    status: "scheduled",
    note: "Giải đề thi thử môn Toán số 3",
    createdByUserId: "usr-admin-1",
    createdAt: "2026-07-23T11:40:00.000Z",
    updatedAt: "2026-07-23T11:40:00.000Z",
  },

  // Hoàng Thị Dung (std-602) - Nguồn: Ca chiều 2026-07-23 -> Xếp: Ca sáng 2026-07-24
  {
    extraStudyId: "ext-105",
    studentId: "std-602",
    subject: "algebra",
    sourceDate: "2026-07-23",
    sourceSession: "afternoon",
    targetDate: "2026-07-24",
    targetSession: "morning",
    status: "scheduled",
    note: "Luyện tập hình học cơ bản",
    createdByUserId: "usr-teacher-1",
    createdAt: "2026-07-23T16:30:00.000Z",
    updatedAt: "2026-07-23T16:30:00.000Z",
  },
];

export const MOCK_REINFORCEMENT_SCHEDULE_RECORDS: ReinforcementScheduleRecord[] = [
  {
    extraStudyId: "r-101",
    studentId: "std-601", // Nguyễn Văn An, SBD 1, Class 6A
    subject: "algebra",
    type: "extra-study",
    weekday: "monday",
    targetDate: getNextDateForWeekday("monday"),
    session: "morning",
    status: "scheduled",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T08:00:00.000Z",
  },
  {
    extraStudyId: "r-102",
    studentId: "std-602", // Hoàng Thị Dung, SBD 2, Class 6B
    subject: "geometry",
    type: "make-up",
    weekday: "monday",
    targetDate: getNextDateForWeekday("monday"),
    session: "morning",
    status: "scheduled",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T08:00:00.000Z",
  },
  {
    extraStudyId: "r-103",
    studentId: "std-603", // Vũ Gia Huy, SBD 3, Class 6A
    subject: "science",
    type: "extra-study",
    weekday: "monday",
    targetDate: getNextDateForWeekday("monday"),
    session: "morning",
    status: "scheduled",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T08:00:00.000Z",
  },
  {
    extraStudyId: "r-104",
    studentId: "std-701", // Trần Thị Bình, SBD 1, Class 7B
    subject: "algebra",
    type: "extra-study",
    weekday: "monday",
    targetDate: getNextDateForWeekday("monday"),
    session: "afternoon",
    status: "scheduled",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T08:00:00.000Z",
  },
  {
    extraStudyId: "r-105",
    studentId: "std-702", // Đặng Khánh Linh, SBD 2, Class 7A
    subject: "geometry",
    type: "make-up",
    weekday: "monday",
    targetDate: getNextDateForWeekday("monday"),
    session: "evening",
    status: "scheduled",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T08:00:00.000Z",
  },
  {
    extraStudyId: "r-106",
    studentId: "std-801", // Lê Hoàng Cường, SBD 1, Class 8A
    subject: "science",
    type: "make-up",
    weekday: "tuesday",
    targetDate: getNextDateForWeekday("tuesday"),
    session: "morning",
    status: "scheduled",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T08:00:00.000Z",
  },
  {
    extraStudyId: "r-107",
    studentId: "std-802", // Bùi Tuyết Nhi, SBD 2, Class 8B
    subject: "practice-test",
    type: "extra-study",
    weekday: "tuesday",
    targetDate: getNextDateForWeekday("tuesday"),
    session: "morning",
    status: "scheduled",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T08:00:00.000Z",
  },
  {
    extraStudyId: "r-108",
    studentId: "std-901", // Phạm Minh Đức, SBD 1, Class 9C
    subject: "practice-test",
    type: "extra-study",
    weekday: "wednesday",
    targetDate: getNextDateForWeekday("wednesday"),
    session: "afternoon",
    status: "scheduled",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T08:00:00.000Z",
  },
  {
    extraStudyId: "r-109",
    studentId: "std-604", // Phan Quốc Bảo, SBD 4, Class 6C
    subject: "algebra",
    type: "extra-study",
    weekday: "monday",
    targetDate: getNextDateForWeekday("monday"),
    session: "morning",
    status: "archived",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T22:05:00.000Z",
  },
];

