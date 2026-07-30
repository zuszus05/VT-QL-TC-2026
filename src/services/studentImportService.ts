import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { GradeLevel } from "../types/academic";
import { Student } from "../types/student";

export type ExcelImportMode = "create-only" | "upsert";

export interface StudentImportItem {
  candidateNumber: number;
  fullName: string;
  schoolName?: string;
  motherPhone?: string;
  fatherPhone?: string;
  classId: string;
  className?: string;
  grade: GradeLevel;
}

export interface ClassImportSummary {
  classId: string;
  className?: string;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
}

export interface StudentImportResult {
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  classSummaries: ClassImportSummary[];
  processedStudents?: Student[];
}

type ImportOp =
  | { type: "create"; student: StudentImportItem }
  | { type: "update"; docId: string; student: StudentImportItem; existingStudent: Student };

/**
 * Safely imports valid students into Firestore using writeBatch in chunks of 400.
 * Uses local existingStudents list to validate duplicates using key `grade + candidateNumber`.
 * 0 Firestore Reads performed.
 */
export async function importStudentsFromExcel(
  validStudents: StudentImportItem[],
  importMode: ExcelImportMode = "create-only",
  existingStudents: Student[] = []
): Promise<StudentImportResult> {
  if (!validStudents || validStudents.length === 0) {
    return {
      importedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      classSummaries: [],
      processedStudents: [],
    };
  }

  const studentsRef = collection(db, "students");
  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const classSummaryMap = new Map<string, ClassImportSummary>();

  const getClassSummary = (classId: string, className?: string): ClassImportSummary => {
    if (!classSummaryMap.has(classId)) {
      classSummaryMap.set(classId, {
        classId,
        className: className || classId,
        importedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        failedCount: 0,
      });
    }
    return classSummaryMap.get(classId)!;
  };

  // 1. Build map of existing students from local state keyed by `${grade}_${candidateNumber}` (0 Firestore Reads)
  const existingStudentsMap = new Map<string, Student>();
  for (const st of existingStudents) {
    const grade = Number(st.grade);
    const candidateNumber = Number(st.candidateNumber);
    if (grade && candidateNumber) {
      const key = `${grade}_${candidateNumber}`;
      existingStudentsMap.set(key, st);
    }
  }

  // 2. Filter & classify students to perform create / update / skip / fail
  const ops: ImportOp[] = [];
  const seenImportKeys = new Set<string>();

  for (const rawItem of validStudents) {
    const candidateNumber = Number(rawItem?.candidateNumber);
    const grade = Number(rawItem?.grade);
    const fullName = String(rawItem?.fullName || "").trim();
    const schoolName = String(rawItem?.schoolName || "").trim();
    const motherPhone = String(rawItem?.motherPhone || "").trim();
    const fatherPhone = String(rawItem?.fatherPhone || "").trim();
    const classId = String(rawItem?.classId || "").trim();
    const className = rawItem?.className || classId;

    const summary = getClassSummary(classId, className);

    // Validate inputs
    const isValidCandidateNumber = Number.isInteger(candidateNumber) && candidateNumber > 0;
    const isValidGrade = [6, 7, 8, 9].includes(grade);
    const isValidName = fullName.length > 0;
    const isValidClass = classId.length > 0;

    if (!isValidCandidateNumber || !isValidGrade || !isValidName || !isValidClass) {
      failedCount++;
      summary.failedCount++;
      continue;
    }

    const key = `${grade}_${candidateNumber}`;

    // Skip duplicate row within the same import file
    if (seenImportKeys.has(key)) {
      skippedCount++;
      summary.skippedCount++;
      continue;
    }

    const studentItem: StudentImportItem = {
      candidateNumber,
      grade: grade as GradeLevel,
      fullName,
      schoolName,
      motherPhone,
      fatherPhone,
      classId,
      className,
    };

    const existingStudent = existingStudentsMap.get(key);

    if (existingStudent) {
      if (importMode === "create-only") {
        // Skip existing student in create-only mode
        skippedCount++;
        summary.skippedCount++;
      } else {
        // Upsert mode: Compare 6 fields
        const isIdentical =
          String(existingStudent.fullName || "").trim() === fullName &&
          String(existingStudent.schoolName || "").trim() === schoolName &&
          String(existingStudent.motherPhone || "").trim() === motherPhone &&
          String(existingStudent.fatherPhone || "").trim() === fatherPhone &&
          String(existingStudent.classId || "").trim() === classId &&
          Number(existingStudent.grade) === grade;

        if (isIdentical) {
          skippedCount++;
          summary.skippedCount++;
        } else {
          // Safety check before creating update operation
          const docId = existingStudent.studentId;
          const isValidDocId =
            typeof docId === "string" &&
            docId.trim().length > 0 &&
            docId !== "pending";

          if (!isValidDocId) {
            failedCount++;
            summary.failedCount++;
          } else {
            ops.push({
              type: "update",
              docId,
              student: studentItem,
              existingStudent,
            });
          }
        }
      }
    } else {
      // Create new student
      ops.push({
        type: "create",
        student: studentItem,
      });
    }

    // Mark key as seen for this import file
    seenImportKeys.add(key);
  }

  // 3. Execute write batch operations in chunks of max 400
  const BATCH_SIZE = 400;
  const processedStudents: Student[] = [];
  const nowISO = new Date().toISOString();

  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const chunk = ops.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    const chunkStudentRecords: Student[] = [];

    for (const op of chunk) {
      if (op.type === "create") {
        const docRef = doc(studentsRef);
        const studentId = docRef.id;

        batch.set(docRef, {
          studentId,
          candidateNumber: op.student.candidateNumber,
          fullName: op.student.fullName,
          schoolName: op.student.schoolName || "",
          motherPhone: op.student.motherPhone || "",
          fatherPhone: op.student.fatherPhone || "",
          classId: op.student.classId,
          grade: op.student.grade,
          note: "",
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        chunkStudentRecords.push({
          studentId,
          candidateNumber: op.student.candidateNumber,
          fullName: op.student.fullName,
          schoolName: op.student.schoolName || undefined,
          motherPhone: op.student.motherPhone || undefined,
          fatherPhone: op.student.fatherPhone || undefined,
          classId: op.student.classId,
          grade: op.student.grade,
          note: undefined,
          isActive: true,
          createdAt: nowISO,
          updatedAt: nowISO,
        });
      } else {
        // Update existing document without modifying studentId, candidateNumber, createdAt, note, isActive
        const docRef = doc(db, "students", op.docId);

        batch.update(docRef, {
          fullName: op.student.fullName,
          schoolName: op.student.schoolName || "",
          motherPhone: op.student.motherPhone || "",
          fatherPhone: op.student.fatherPhone || "",
          classId: op.student.classId,
          grade: op.student.grade,
          updatedAt: serverTimestamp(),
        });

        chunkStudentRecords.push({
          ...op.existingStudent,
          fullName: op.student.fullName,
          schoolName: op.student.schoolName || undefined,
          motherPhone: op.student.motherPhone || undefined,
          fatherPhone: op.student.fatherPhone || undefined,
          classId: op.student.classId,
          grade: op.student.grade,
          updatedAt: nowISO,
        });
      }
    }

    try {
      await batch.commit();

      for (const op of chunk) {
        const summary = getClassSummary(op.student.classId, op.student.className);
        if (op.type === "create") {
          importedCount++;
          summary.importedCount++;
        } else {
          updatedCount++;
          summary.updatedCount++;
        }
      }
      processedStudents.push(...chunkStudentRecords);
    } catch (batchError) {
      console.error("[studentImportService] Error committing batch:", batchError);
      failedCount += chunk.length;
      for (const op of chunk) {
        const summary = getClassSummary(op.student.classId, op.student.className);
        summary.failedCount++;
      }
    }
  }

  const classSummaries = Array.from(classSummaryMap.values());

  return {
    importedCount,
    updatedCount,
    skippedCount,
    failedCount,
    classSummaries,
    processedStudents,
  };
}


