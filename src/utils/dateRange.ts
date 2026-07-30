import {
  StudySession,
  SourceStudySession,
} from "../types/extraStudy";

export interface ExtraStudyDateRange {
  minDate: string; // YYYY-MM-DD
  maxDate: string; // YYYY-MM-DD
}

/**
 * Chuyển chuỗi YYYY-MM-DD thành đối tượng Date theo giờ địa phương (tránh lệch múi giờ UTC)
 */
export function parseLocalDate(dateStr: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Định dạng đối tượng Date thành chuỗi YYYY-MM-DD theo giờ địa phương
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Thêm/bớt số ngày đối với một chuỗi ngày YYYY-MM-DD
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

/**
 * Tính khoảng ngày được phép xếp tăng cường:
 * - Ca nguồn "morning" (Ca sáng):
 *   + minDate = chính ngày sourceDate
 *   + maxDate = sourceDate + 6 ngày (đến hết cùng thứ của tuần kế tiếp)
 * - Ca nguồn "afternoon" (Ca chiều):
 *   + minDate = sourceDate + 1 ngày
 *   + maxDate = sourceDate + 7 ngày (đến hết cùng thứ của tuần kế tiếp)
 */
export function getAllowedExtraStudyDateRange(
  sourceDate: string,
  sourceSession: SourceStudySession
): ExtraStudyDateRange {
  if (sourceSession === "morning") {
    return {
      minDate: sourceDate,
      maxDate: addDaysToDateStr(sourceDate, 6),
    };
  } else {
    return {
      minDate: addDaysToDateStr(sourceDate, 1),
      maxDate: addDaysToDateStr(sourceDate, 7),
    };
  }
}

/**
 * Kiểm tra slot ca học tăng cường có hợp lệ hay không:
 * - targetDate phải nằm trong khoảng [minDate, maxDate]
 * - Nếu sourceSession = "morning" và targetDate = sourceDate:
 *   + Chỉ cho phép targetSession = "afternoon" hoặc "evening" (không cho phép "morning")
 * - Nếu sourceSession = "afternoon" và targetDate = sourceDate:
 *   + Không cho phép xếp trong cùng ngày
 * - Với các ngày sau trong khoảng: cho phép "morning", "afternoon", "evening"
 */
export function isTargetExtraStudySlotAllowed(
  sourceDate: string,
  sourceSession: SourceStudySession,
  targetDate: string,
  targetSession: StudySession
): boolean {
  const range = getAllowedExtraStudyDateRange(sourceDate, sourceSession);

  if (targetDate < range.minDate || targetDate > range.maxDate) {
    return false;
  }

  if (targetDate === sourceDate) {
    if (sourceSession === "morning") {
      return targetSession === "afternoon" || targetSession === "evening";
    }
    if (sourceSession === "afternoon") {
      return false;
    }
  }

  return true;
}
