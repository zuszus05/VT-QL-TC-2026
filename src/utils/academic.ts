import { GradeLevel, SchoolClass } from "../types/academic";
import { GRADE_LABELS } from "../constants/academic";
import { Student } from "../types/student";
import { ExtraStudyRecord } from "../types/extraStudy";
import { AttendanceRecord } from "../types/attendance";
import { isCandidateNumberDuplicate, validateStudentClassGrade } from "./studentValidation";
import { isTargetExtraStudySlotAllowed } from "./dateRange";

export function getGradeLabel(grade: GradeLevel): string {
  return GRADE_LABELS[grade] || `Khối ${grade}`;
}

/**
 * Chuẩn hóa tên lớp: trim và đổi thành chữ in hoa (ví dụ: " 6a1 " -> "6A1")
 */
export function normalizeClassName(value: string): string {
  if (!value) return "";
  return value.trim().toUpperCase();
}

/**
 * Kiểm tra tên lớp có hợp lệ với Khối không (ví dụ: "6A" thuộc Khối 6, không thể thuộc Khối 7)
 */
export function isClassNameValidForGrade(
  className: string,
  grade: GradeLevel
): boolean {
  const normalized = normalizeClassName(className);
  return normalized.startsWith(grade.toString());
}

/**
 * Kiểm tra trùng tên lớp (không phân biệt hoa thường)
 */
export function isClassNameDuplicate(
  classes: SchoolClass[],
  className: string,
  excludingClassId?: string
): boolean {
  const targetNormalized = normalizeClassName(className);
  return classes.some((cls) => {
    if (excludingClassId && cls.classId === excludingClassId) {
      return false;
    }
    return normalizeClassName(cls.className) === targetNormalized;
  });
}

/**
 * Lấy danh sách lớp thuộc một khối
 */
export function getClassesByGrade(
  classes: SchoolClass[],
  grade: GradeLevel
): SchoolClass[] {
  return classes.filter((cls) => cls.grade === grade);
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Utility kiểm tra tính toàn vẹn của dữ liệu mẫu (mock data)
 */
export function validateMockAcademicData(
  classes: SchoolClass[] = [],
  students: Student[] = [],
  extraStudyRecords: ExtraStudyRecord[] = [],
  attendanceRecords: AttendanceRecord[] = []
): ValidationResult {
  const errors: string[] = [];

  // 1. Kiểm tra Lớp học
  const classIds = new Set<string>();
  const classNames = new Set<string>();

  classes.forEach((c) => {
    if (classIds.has(c.classId)) {
      errors.push(`Trùng classId: ${c.classId}`);
    } else {
      classIds.add(c.classId);
    }

    const normName = normalizeClassName(c.className);
    if (classNames.has(normName)) {
      errors.push(`Trùng tên lớp: ${c.className}`);
    } else {
      classNames.add(normName);
    }

    if (!isClassNameValidForGrade(c.className, c.grade)) {
      errors.push(`Tên lớp ${c.className} không khớp với Khối ${c.grade}`);
    }
  });

  // 2. Kiểm tra Học sinh
  const studentIds = new Set<string>();

  students.forEach((s) => {
    if (studentIds.has(s.studentId)) {
      errors.push(`Trùng studentId: ${s.studentId}`);
    } else {
      studentIds.add(s.studentId);
    }

    if (!classIds.has(s.classId)) {
      errors.push(`Học sinh ${s.fullName} tham chiếu classId không tồn tại: ${s.classId}`);
    } else if (!validateStudentClassGrade(s.grade, s.classId, classes)) {
      errors.push(`Học sinh ${s.fullName} có Khối ${s.grade} không khớp với Khối của Lớp`);
    }

    // Kiểm tra trùng SBD trong cùng khối
    const duplicateCount = students.filter(
      (other) =>
        other.studentId !== s.studentId &&
        other.grade === s.grade &&
        other.candidateNumber === s.candidateNumber
    ).length;

    if (duplicateCount > 0) {
      errors.push(
        `Trùng SBD ${s.candidateNumber} trong cùng Khối ${s.grade} cho học sinh ${s.fullName}`
      );
    }
  });

  // 3. Kiểm tra Bản ghi Tăng cường
  extraStudyRecords.forEach((r) => {
    if (!studentIds.has(r.studentId)) {
      errors.push(`ExtraStudyRecord ${r.extraStudyId} tham chiếu studentId không tồn tại: ${r.studentId}`);
    }

    const slotValid = isTargetExtraStudySlotAllowed(
      r.sourceDate,
      r.sourceSession,
      r.targetDate,
      r.targetSession
    );
    if (!slotValid) {
      errors.push(
        `ExtraStudyRecord ${r.extraStudyId} có slot không hợp lệ (Nguồn: ${r.sourceDate} ${r.sourceSession} -> Đích: ${r.targetDate} ${r.targetSession})`
      );
    }
  });

  // 4. Kiểm tra Điểm danh
  const attendanceKeys = new Set<string>();
  attendanceRecords.forEach((att) => {
    if (!studentIds.has(att.studentId)) {
      errors.push(`AttendanceRecord ${att.attendanceId} tham chiếu studentId không tồn tại: ${att.studentId}`);
    }

    const key = `${att.studentId}_${att.attendanceDate}_${att.session}`;
    if (attendanceKeys.has(key)) {
      errors.push(`Trùng bản ghi điểm danh: ${key}`);
    } else {
      attendanceKeys.add(key);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
