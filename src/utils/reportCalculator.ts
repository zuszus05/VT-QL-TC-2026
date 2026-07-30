import { AttendanceRecord } from "../types/attendance";
import { Student } from "../types/student";
import { SchoolClass } from "../types/academic";

export interface MonthlyStudentReport {
  studentId: string;
  candidateNumber: number;
  fullName: string;
  shortName: string;
  classId: string;
  className: string;
  grade: number;
  totalSessions: number;
  rawAbsentCount: number;
  madeUpCount: number;
  remainingAbsentCount: number;
  /** absentCount represents remaining unmade-up absences for backwards compatibility */
  absentCount: number;
  lateCount: number;
  absentDates: string[];
}

export interface MonthlyClassReport {
  classId: string;
  className: string;
  grade: number;
  students: MonthlyStudentReport[];
  totalRawAbsent: number;
  totalMadeUp: number;
  totalRemainingAbsent: number;
  /** totalAbsent represents remaining unmade-up absences for backwards compatibility */
  totalAbsent: number;
  totalLate: number;
}

export interface CalculateMonthlyReportInput {
  attendanceRecords: AttendanceRecord[];
  students: Student[];
  classes: SchoolClass[];
}

export function getShortName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
}

/**
 * Pure calculation function for monthly report statistics.
 * Aggregates attendance records by student, filters students with violations (absent/late),
 * and groups the result by class.
 */
export function calculateMonthlyReport(
  input: CalculateMonthlyReportInput
): MonthlyClassReport[] {
  const { attendanceRecords, students, classes } = input;

  const studentMap = new Map<string, Student>();
  students.forEach((s) => {
    if (s.studentId) {
      studentMap.set(s.studentId, s);
    }
  });

  const classMap = new Map<string, SchoolClass>();
  classes.forEach((c) => {
    if (c.classId) {
      classMap.set(c.classId, c);
    }
  });

  const studentAggMap = new Map<
    string,
    {
      student: Student;
      classObj?: SchoolClass;
      totalSessions: number;
      rawAbsentCount: number;
      madeUpCount: number;
      remainingAbsentCount: number;
      lateCount: number;
      absentDates: string[];
    }
  >();

  for (const record of attendanceRecords) {
    if (!record || !record.studentId) continue;

    const student = studentMap.get(record.studentId);
    if (!student) {
      console.warn(
        `[reportCalculator] Không tìm thấy học sinh cho attendanceRecord attendanceId=${record.attendanceId}, studentId=${record.studentId}`
      );
      continue;
    }

    let agg = studentAggMap.get(record.studentId);
    if (!agg) {
      const classObj = student.classId ? classMap.get(student.classId) : undefined;
      agg = {
        student,
        classObj,
        totalSessions: 0,
        rawAbsentCount: 0,
        madeUpCount: 0,
        remainingAbsentCount: 0,
        lateCount: 0,
        absentDates: [],
      };
      studentAggMap.set(record.studentId, agg);
    }

    agg.totalSessions += 1;

    if (record.status === "absent") {
      agg.rawAbsentCount += 1;
      if (record.isMadeUp === true) {
        agg.madeUpCount += 1;
      } else {
        agg.remainingAbsentCount += 1;
      }
      if (record.attendanceDate) {
        agg.absentDates.push(record.attendanceDate);
      }
    } else if (record.status === "late") {
      agg.lateCount += 1;
    }
  }

  const studentReports: MonthlyStudentReport[] = [];

  for (const agg of studentAggMap.values()) {
    if (agg.rawAbsentCount === 0 && agg.lateCount === 0) {
      continue;
    }

    const student = agg.student;
    const classObj = agg.classObj;

    if (!student.classId || !classObj) {
      console.warn(
        `[reportCalculator] Không tìm thấy lớp cho học sinh studentId=${student.studentId}, classId=${student.classId}`
      );
      continue;
    }

    const sortedAbsentDates = [...agg.absentDates].sort((a, b) =>
      a.localeCompare(b)
    );

    const classId = classObj.classId;
    const className = classObj.className;
    const grade = classObj.grade;
    const fullName = student.fullName || "";
    const shortName = getShortName(fullName);
    const candidateNumber =
      typeof student.candidateNumber === "number"
        ? student.candidateNumber
        : Number(student.candidateNumber) || 0;

    const absentCount = agg.remainingAbsentCount;

    studentReports.push({
      studentId: student.studentId,
      candidateNumber,
      fullName,
      shortName,
      classId,
      className,
      grade,
      totalSessions: agg.totalSessions,
      rawAbsentCount: agg.rawAbsentCount,
      madeUpCount: agg.madeUpCount,
      remainingAbsentCount: agg.remainingAbsentCount,
      absentCount,
      lateCount: agg.lateCount,
      absentDates: sortedAbsentDates,
    });
  }

  const classGroupMap = new Map<
    string,
    {
      classId: string;
      className: string;
      grade: number;
      students: MonthlyStudentReport[];
      totalRawAbsent: number;
      totalMadeUp: number;
      totalRemainingAbsent: number;
      totalAbsent: number;
      totalLate: number;
    }
  >();

  for (const stReport of studentReports) {
    const key = stReport.classId || stReport.className;
    let clsGroup = classGroupMap.get(key);
    if (!clsGroup) {
      clsGroup = {
        classId: stReport.classId,
        className: stReport.className,
        grade: stReport.grade,
        students: [],
        totalRawAbsent: 0,
        totalMadeUp: 0,
        totalRemainingAbsent: 0,
        totalAbsent: 0,
        totalLate: 0,
      };
      classGroupMap.set(key, clsGroup);
    }

    clsGroup.students.push(stReport);
    clsGroup.totalRawAbsent += stReport.rawAbsentCount;
    clsGroup.totalMadeUp += stReport.madeUpCount;
    clsGroup.totalRemainingAbsent += stReport.remainingAbsentCount;
    clsGroup.totalAbsent += stReport.absentCount;
    clsGroup.totalLate += stReport.lateCount;
  }

  const classReports = Array.from(classGroupMap.values()).sort((a, b) => {
    if (a.grade !== b.grade) {
      return a.grade - b.grade;
    }
    return a.className.localeCompare(b.className);
  });

  classReports.forEach((clsGroup) => {
    clsGroup.students.sort((a, b) => {
      const numA = Number(a.candidateNumber);
      const numB = Number(b.candidateNumber);

      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      if (a.candidateNumber !== b.candidateNumber) {
        return String(a.candidateNumber).localeCompare(String(b.candidateNumber));
      }
      return a.fullName.localeCompare(b.fullName);
    });
  });

  return classReports;
}
