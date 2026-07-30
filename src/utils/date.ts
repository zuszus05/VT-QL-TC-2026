import { StudySession, Weekday } from "../types/extraStudy";

/**
 * Định dạng ngày hiện tại theo tiếng Việt (Ví dụ: "Thứ Năm, 23/07/2026")
 */
export function getFormattedVietnameseDate(date: Date = new Date()): string {
  const daysOfWeek = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];

  const dayName = daysOfWeek[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${dayName}, ${day}/${month}/${year}`;
}

export function getSessionLabel(session: StudySession): string {
  switch (session) {
    case "morning":
      return "Ca sáng";
    case "afternoon":
      return "Ca chiều";
    case "evening":
      return "Ca tối";
    default:
      return session;
  }
}

/**
 * Lấy ngày gần nhất dạng YYYY-MM-DD cho thứ trong tuần chỉ định
 * (trong vòng 7 ngày tính từ fromDate, giữ giờ địa phương)
 */
export function getNextDateForWeekday(
  weekday: Weekday,
  fromDate: Date = new Date()
): string {
  const weekdayMap: Record<Weekday, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const targetDay = weekdayMap[weekday];
  const currentDay = fromDate.getDay();

  const diff = (targetDay - currentDay + 7) % 7;

  const targetDate = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate() + diff
  );

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

