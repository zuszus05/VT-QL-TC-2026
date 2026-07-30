import { GradeLevel, SchoolClass } from "../types/academic";
import { Student } from "../types/student";
import { AttendanceRecord } from "../types/attendance";
import { StudySession } from "../types/extraStudy";

/**
 * Làm sạch họ tên học sinh: bỏ khoảng trắng thừa đầu/cuối và giữa các từ
 */
export function normalizeFullName(value: string): string {
  if (!value) return "";
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Kiểm tra Số báo danh (SBD): phải là số nguyên dương lớn hơn 0
 */
export function isValidCandidateNumber(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Kiểm tra trùng SBD:
 * QUY TẮC BẮT BUỘC: SBD chỉ duy nhất TRONG CÙNG MỘT KHỐI (grade).
 * Các khối khác nhau được phép trùng SBD.
 * Nếu đang chỉnh sửa (có excludingStudentId), bỏ qua chính học sinh đó.
 */
export function isCandidateNumberDuplicate(
  students: Student[],
  grade: GradeLevel,
  candidateNumber: number,
  excludingStudentId?: string
): boolean {
  return students.some((student) => {
    if (excludingStudentId && student.studentId === excludingStudentId) {
      return false;
    }
    return student.grade === grade && student.candidateNumber === candidateNumber;
  });
}

/**
 * Kiểm tra Khối của Học sinh phải khớp với Khối của Lớp được tham chiếu bởi classId
 */
export function validateStudentClassGrade(
  studentGrade: GradeLevel,
  classId: string,
  classes: SchoolClass[]
): boolean {
  const targetClass = classes.find((c) => c.classId === classId);
  if (!targetClass) return false;
  return targetClass.grade === studentGrade;
}

/**
 * Kiểm tra xem bản ghi điểm danh có bị trùng không (cùng studentId, attendanceDate và session)
 */
export function isAttendanceRecordDuplicate(
  records: AttendanceRecord[],
  studentId: string,
  attendanceDate: string,
  session: StudySession,
  excludingAttendanceId?: string
): boolean {
  return records.some((rec) => {
    if (excludingAttendanceId && rec.attendanceId === excludingAttendanceId) {
      return false;
    }
    return (
      rec.studentId === studentId &&
      rec.attendanceDate === attendanceDate &&
      rec.session === session
    );
  });
}

