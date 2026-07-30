import {
  StudySession,
  ExtraSubject,
  ExtraStudyStatus,
  Weekday,
  ExtraStudyType,
} from "../types/extraStudy";

export const STUDY_SESSIONS: readonly StudySession[] = [
  "morning",
  "afternoon",
  "evening",
];

export const STUDY_SESSION_LABELS: Record<StudySession, string> = {
  morning: "Ca sáng",
  afternoon: "Ca chiều",
  evening: "Ca tối",
};

export const SESSION_TIME_RANGES: Record<StudySession, string> = {
  morning: "07:00 – 11:30",
  afternoon: "13:45 – 17:00",
  evening: "17:15 – 21:00",
};

export const SESSION_MAP: Record<string, StudySession> = {
  "Ca sáng": "morning",
  "Ca chiều": "afternoon",
  "Ca tối": "evening",
};

export const EXTRA_SUBJECTS: readonly ExtraSubject[] = [
  "algebra",
  "geometry",
  "science",
  "practice-test",
];

export const EXTRA_SUBJECT_LABELS: Record<ExtraSubject, string> = {
  algebra: "Toán Đại",
  geometry: "Toán Hình",
  science: "KHTN",
  "practice-test": "Luyện Đề",
};

export const SUBJECT_MAP: Record<string, ExtraSubject> = {
  "Toán Đại": "algebra",
  "Toán Hình": "geometry",
  KHTN: "science",
  "Luyện Đề": "practice-test",
};

export const EXTRA_STUDY_STATUSES: readonly ExtraStudyStatus[] = [
  "scheduled",
  "completed",
  "cancelled",
  "archived",
];

export const EXTRA_STUDY_STATUS_LABELS: Record<ExtraStudyStatus, string> = {
  scheduled: "Đã xếp lịch",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
  archived: "Đã lưu trữ",
};

export const WEEKDAYS: readonly Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Thứ 2",
  tuesday: "Thứ 3",
  wednesday: "Thứ 4",
  thursday: "Thứ 5",
  friday: "Thứ 6",
  saturday: "Thứ 7",
  sunday: "Chủ nhật",
};

export const WEEKDAY_MAP: Record<string, Weekday> = {
  "Thứ 2": "monday",
  "Thứ 3": "tuesday",
  "Thứ 4": "wednesday",
  "Thứ 5": "thursday",
  "Thứ 6": "friday",
  "Thứ 7": "saturday",
  "Chủ nhật": "sunday",
};

export const STUDY_TYPE_LABELS: Record<ExtraStudyType, string> = {
  "extra-study": "Tăng cường",
  "make-up": "Học bù",
};

export const STUDY_TYPE_MAP: Record<string, ExtraStudyType> = {
  "Tăng cường": "extra-study",
  "Học bù": "make-up",
};

