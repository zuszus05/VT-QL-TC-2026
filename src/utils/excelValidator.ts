import { SchoolClass, GradeLevel } from "../types/academic";
import { Student } from "../types/student";
import { ExcelFilePreviewData } from "./excelReader";

export interface ValidatedStudentRow {
  rowIndex: number;
  candidateNumber: number;
  fullName: string;
  schoolName: string;
  motherPhone: string;
  fatherPhone: string;
  classId?: string;
  className?: string;
  grade?: GradeLevel;
  isValid: boolean;
  errors: string[];
}

export interface ValidatedSheet {
  sheetName: string;
  matchedClass: SchoolClass | null;
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  errorCount: number;
  rows: ValidatedStudentRow[];
  errorRows: ValidatedStudentRow[];
}

export interface ExcelValidationResult {
  fileName: string;
  totalSheets: number;
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  totalErrorsCount: number;
  sheets: ValidatedSheet[];
}

export function validateExcelImportData(
  previewData: ExcelFilePreviewData,
  classes: SchoolClass[],
  existingStudents: Student[]
): ExcelValidationResult {
  const validatedSheets: ValidatedSheet[] = [];

  let overallTotalRows = 0;
  let overallValidRows = 0;
  let overallInvalidRows = 0;
  let overallTotalErrors = 0;

  // Track candidateNumbers per grade across the entire Excel file
  // Key: `${grade}_${candidateNumber}` -> array of occurrences
  const fileCandidateNumberTracker = new Map<string, { sheetName: string; rowIndex: number }[]>();

  // Step 1: Pre-pass to index candidate numbers per grade in the Excel file
  for (const sheet of previewData.sheets) {
    const rawSheetName = sheet.sheetName.trim().toLowerCase();
    const matchedClass = classes.find(
      (c) => c.className.trim().toLowerCase() === rawSheetName
    ) || null;

    if (matchedClass) {
      for (const student of sheet.students) {
        // Skip empty row (neither candidateNumber nor fullName)
        if (!student.candidateNumber && (!student.fullName || !student.fullName.trim())) {
          continue;
        }

        if (student.candidateNumber > 0 && Number.isInteger(student.candidateNumber)) {
          const key = `${matchedClass.grade}_${student.candidateNumber}`;
          if (!fileCandidateNumberTracker.has(key)) {
            fileCandidateNumberTracker.set(key, []);
          }
          fileCandidateNumberTracker.get(key)!.push({
            sheetName: sheet.sheetName,
            rowIndex: student.rowIndex,
          });
        }
      }
    }
  }

  // Step 2: Validate each sheet and each student row
  for (const sheet of previewData.sheets) {
    const rawSheetName = sheet.sheetName.trim().toLowerCase();
    const matchedClass = classes.find(
      (c) => c.className.trim().toLowerCase() === rawSheetName
    ) || null;

    const validatedRows: ValidatedStudentRow[] = [];
    const errorRows: ValidatedStudentRow[] = [];

    let sheetValidCount = 0;
    let sheetInvalidCount = 0;
    let sheetErrorCount = 0;

    for (const student of sheet.students) {
      // 1. Skip empty row
      const trimmedName = (student.fullName || "").trim();
      const sbd = student.candidateNumber;

      if (!sbd && !trimmedName) {
        continue; // Coi là dòng trống => Bỏ qua => Không báo lỗi
      }

      const rowErrors: string[] = [];

      // 2. Check Sheet -> Class match
      if (!matchedClass) {
        rowErrors.push("Không tìm thấy lớp tương ứng.");
      }

      // 3. Check Họ và Tên
      if (!trimmedName) {
        rowErrors.push("Thiếu Họ và tên.");
      }

      // 4. Check SBD
      if (!sbd || sbd < 1 || !Number.isInteger(sbd)) {
        rowErrors.push("SBD không hợp lệ hoặc thiếu SBD.");
      }

      // 5. If matched class exists and candidateNumber is valid: check duplicate rules
      if (matchedClass && sbd > 0 && Number.isInteger(sbd)) {
        const grade = matchedClass.grade;

        // 5a. Check Duplicate within Excel file (same Grade + same SBD)
        const trackerKey = `${grade}_${sbd}`;
        const fileOccurrences = fileCandidateNumberTracker.get(trackerKey) || [];
        if (fileOccurrences.length > 1) {
          rowErrors.push("SBD trùng lặp trong file.");
        }

        // 5b. Check Duplicate in Firestore (existingStudents)
        const isDuplicateFirestore = existingStudents.some(
          (s) => s.grade === grade && s.candidateNumber === sbd
        );
        if (isDuplicateFirestore) {
          rowErrors.push("SBD đã tồn tại.");
        }
      }

      const isValid = rowErrors.length === 0;

      const validatedRow: ValidatedStudentRow = {
        rowIndex: student.rowIndex,
        candidateNumber: sbd,
        fullName: student.fullName,
        schoolName: student.schoolName,
        motherPhone: student.motherPhone,
        fatherPhone: student.fatherPhone,
        classId: matchedClass?.classId,
        className: matchedClass?.className,
        grade: matchedClass?.grade,
        isValid,
        errors: rowErrors,
      };

      validatedRows.push(validatedRow);

      if (isValid) {
        sheetValidCount++;
      } else {
        sheetInvalidCount++;
        sheetErrorCount += rowErrors.length;
        errorRows.push(validatedRow);
      }
    }

    const sheetTotalRows = validatedRows.length;

    validatedSheets.push({
      sheetName: sheet.sheetName,
      matchedClass,
      totalRows: sheetTotalRows,
      validRowsCount: sheetValidCount,
      invalidRowsCount: sheetInvalidCount,
      errorCount: sheetErrorCount,
      rows: validatedRows,
      errorRows,
    });

    overallTotalRows += sheetTotalRows;
    overallValidRows += sheetValidCount;
    overallInvalidRows += sheetInvalidCount;
    overallTotalErrors += sheetErrorCount;
  }

  return {
    fileName: previewData.fileName,
    totalSheets: validatedSheets.length,
    totalRows: overallTotalRows,
    validRowsCount: overallValidRows,
    invalidRowsCount: overallInvalidRows,
    totalErrorsCount: overallTotalErrors,
    sheets: validatedSheets,
  };
}
