import { Student } from "../types/student";
import { SchoolClass } from "../types/academic";
import { isCandidateNumberDuplicate } from "./studentValidation";
import {
  isClassNameValidForGrade,
  isClassNameDuplicate,
} from "./academic";
import { isTargetExtraStudySlotAllowed } from "./dateRange";
import { shouldArchiveExtraStudyRecord } from "./extraStudyValidation";

export function runDataModelChecks(): { passed: boolean; errors: string[] } {
  const errors: string[] = [];

  // ==========================================
  // 1. KIỂM TRA QUY TẮC SỐ BÁO DANH (SBD)
  // ==========================================
  const mockStudents: Student[] = [
    {
      studentId: "std-sbd-6",
      fullName: "Nguyễn Văn Khối 6",
      grade: 6,
      classId: "cls-6a",
      candidateNumber: 1,
      isActive: true,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
    {
      studentId: "std-sbd-6-dup",
      fullName: "Trần Văn Khối 6 Trùng",
      grade: 6,
      classId: "cls-6a",
      candidateNumber: 10,
      isActive: true,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ];

  // Khối 6 SBD 1 và Khối 7 SBD 1 không bị coi là trùng
  if (isCandidateNumberDuplicate(mockStudents, 7, 1)) {
    errors.push("LỖI SBD: Khối 6 SBD 1 và Khối 7 SBD 1 bị báo trùng nhầm!");
  }

  // Hai học sinh cùng Khối 6 SBD 10 bị coi là trùng
  if (!isCandidateNumberDuplicate(mockStudents, 6, 10)) {
    errors.push("LỖI SBD: Hai học sinh cùng Khối 6 SBD 10 không bị phát hiện trùng!");
  }

  // excludingStudentId bỏ qua chính học sinh đang sửa
  if (isCandidateNumberDuplicate(mockStudents, 6, 10, "std-sbd-6-dup")) {
    errors.push("LỖI SBD: excludingStudentId không bỏ qua chính học sinh đang sửa!");
  }

  // ==========================================
  // 2. KIỂM TRA QUY TẮC TÊN LỚP
  // ==========================================
  const mockClasses: SchoolClass[] = [
    {
      classId: "cls-6a",
      className: "6A",
      grade: 6,
      isActive: true,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ];

  // 6A hợp lệ với Khối 6
  if (!isClassNameValidForGrade("6A", 6)) {
    errors.push("LỖI TÊN LỚP: Lớp 6A bị coi là không hợp lệ cho Khối 6!");
  }

  // 7A không hợp lệ với Khối 6
  if (isClassNameValidForGrade("7A", 6)) {
    errors.push("LỖI TÊN LỚP: Lớp 7A bị coi là hợp lệ cho Khối 6!");
  }

  // 6a và 6A được coi là trùng (không phân biệt hoa thường)
  if (!isClassNameDuplicate(mockClasses, "6a")) {
    errors.push("LỖI TÊN LỚP: 6a và 6A không được coi là trùng tên lớp!");
  }

  // ==========================================
  // 3. KIỂM TRA QUY TẮC KHOẢNG NGÀY & SLOT
  // ==========================================
  // Nguồn ca sáng ngày 2026-07-23:
  // - Ca chiều 2026-07-23: true
  if (!isTargetExtraStudySlotAllowed("2026-07-23", "morning", "2026-07-23", "afternoon")) {
    errors.push("LỖI KHOẢNG NGÀY: Nguồn sáng 2026-07-23 -> Đích chiều 2026-07-23 phải là true!");
  }
  // - Ca tối 2026-07-23: true
  if (!isTargetExtraStudySlotAllowed("2026-07-23", "morning", "2026-07-23", "evening")) {
    errors.push("LỖI KHOẢNG NGÀY: Nguồn sáng 2026-07-23 -> Đích tối 2026-07-23 phải là true!");
  }
  // - Ca sáng 2026-07-23: false
  if (isTargetExtraStudySlotAllowed("2026-07-23", "morning", "2026-07-23", "morning")) {
    errors.push("LỖI KHOẢNG NGÀY: Nguồn sáng 2026-07-23 -> Đích sáng 2026-07-23 phải là false!");
  }
  // - Bất kỳ ca nào 2026-07-29: true
  if (
    !isTargetExtraStudySlotAllowed("2026-07-23", "morning", "2026-07-29", "morning") ||
    !isTargetExtraStudySlotAllowed("2026-07-23", "morning", "2026-07-29", "afternoon") ||
    !isTargetExtraStudySlotAllowed("2026-07-23", "morning", "2026-07-29", "evening")
  ) {
    errors.push("LỖI KHOẢNG NGÀY: Nguồn sáng 2026-07-23 -> Ngày 2026-07-29 phải là true cho mọi ca!");
  }
  // - Ngày 2026-07-30: false
  if (isTargetExtraStudySlotAllowed("2026-07-23", "morning", "2026-07-30", "afternoon")) {
    errors.push("LỖI KHOẢNG NGÀY: Nguồn sáng 2026-07-23 -> Ngày 2026-07-30 phải là false!");
  }

  // Nguồn ca chiều ngày 2026-07-23:
  // - Bất kỳ ca nào 2026-07-23: false
  if (
    isTargetExtraStudySlotAllowed("2026-07-23", "afternoon", "2026-07-23", "morning") ||
    isTargetExtraStudySlotAllowed("2026-07-23", "afternoon", "2026-07-23", "afternoon") ||
    isTargetExtraStudySlotAllowed("2026-07-23", "afternoon", "2026-07-23", "evening")
  ) {
    errors.push("LỖI KHOẢNG NGÀY: Nguồn chiều 2026-07-23 -> Ngày 2026-07-23 phải là false cho mọi ca!");
  }
  // - Ngày 2026-07-24: true
  if (
    !isTargetExtraStudySlotAllowed("2026-07-23", "afternoon", "2026-07-24", "morning") ||
    !isTargetExtraStudySlotAllowed("2026-07-23", "afternoon", "2026-07-24", "afternoon") ||
    !isTargetExtraStudySlotAllowed("2026-07-23", "afternoon", "2026-07-24", "evening")
  ) {
    errors.push("LỖI KHOẢNG NGÀY: Nguồn chiều 2026-07-23 -> Ngày 2026-07-24 phải là true!");
  }
  // - Ngày 2026-07-30: true
  if (
    !isTargetExtraStudySlotAllowed("2026-07-23", "afternoon", "2026-07-30", "morning") ||
    !isTargetExtraStudySlotAllowed("2026-07-23", "afternoon", "2026-07-30", "afternoon") ||
    !isTargetExtraStudySlotAllowed("2026-07-23", "afternoon", "2026-07-30", "evening")
  ) {
    errors.push("LỖI KHOẢNG NGÀY: Nguồn chiều 2026-07-23 -> Ngày 2026-07-30 phải là true!");
  }
  // - Ngày 2026-07-31: false
  if (isTargetExtraStudySlotAllowed("2026-07-23", "afternoon", "2026-07-31", "morning")) {
    errors.push("LỖI KHOẢNG NGÀY: Nguồn chiều 2026-07-23 -> Ngày 2026-07-31 phải là false!");
  }

  // ==========================================
  // 4. KIỂM TRA QUY TẮC LƯU TRỮ TỰ ĐỘNG (ARCHIVE)
  // ==========================================
  // Ngày hiện tại lúc 21:59: false
  const time2159 = new Date("2026-07-23T21:59:00");
  if (shouldArchiveExtraStudyRecord("2026-07-23", time2159)) {
    errors.push("LỖI ARCHIVE: Ngày hiện tại lúc 21:59 không được tự động archive!");
  }

  // Ngày hiện tại lúc 22:00: true
  const time2200 = new Date("2026-07-23T22:00:00");
  if (!shouldArchiveExtraStudyRecord("2026-07-23", time2200)) {
    errors.push("LỖI ARCHIVE: Ngày hiện tại lúc 22:00 phải tự động archive!");
  }

  // Ngày tương lai: false
  if (shouldArchiveExtraStudyRecord("2026-07-24", time2200)) {
    errors.push("LỖI ARCHIVE: Ngày trong tương lai 2026-07-24 không được archive ngay cả sau 22:00!");
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}
