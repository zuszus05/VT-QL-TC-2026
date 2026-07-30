import {
  StudySession,
  ExtraSubject,
  ExtraStudyStatus,
} from "../types/extraStudy";
import {
  STUDY_SESSION_LABELS,
  EXTRA_SUBJECT_LABELS,
  EXTRA_STUDY_STATUS_LABELS,
} from "../constants/extraStudy";
import { parseLocalDate, formatLocalDate } from "./dateRange";

export function getStudySessionLabel(session: StudySession): string {
  return STUDY_SESSION_LABELS[session] || session;
}

export function getExtraSubjectLabel(subject: ExtraSubject): string {
  return EXTRA_SUBJECT_LABELS[subject] || subject;
}

export function getExtraStudyStatusLabel(status: ExtraStudyStatus): string {
  return EXTRA_STUDY_STATUS_LABELS[status] || status;
}

/**
 * Kiểm tra xem bản ghi tăng cường ngày targetDate có cần được tự động lưu trữ (archive) sau 22:00 không.
 * Quy tắc:
 * - Trả về true chỉ khi targetDate chính là ngày hiện tại (theo giờ địa phương) VÀ thời gian hiện tại từ 22:00 trở đi.
 * - Trả về false cho ngày trong tương lai hoặc các trường hợp khác.
 */
export function shouldArchiveExtraStudyRecord(
  targetDate: string,
  now: Date = new Date()
): boolean {
  const todayStr = formatLocalDate(now);
  if (targetDate !== todayStr) {
    return false;
  }
  return now.getHours() >= 22;
}

/**
 * Lấy mốc thời gian chốt lưu trữ (22:00) cho ngày targetDate
 */
export function getExtraStudyArchiveCutoff(targetDate: string): Date {
  const cutoff = parseLocalDate(targetDate);
  cutoff.setHours(22, 0, 0, 0);
  return cutoff;
}
