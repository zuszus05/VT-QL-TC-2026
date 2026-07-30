import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { GradeLevel } from "../types/academic";
import { Student } from "../types/student";

function isGradeLevel(value: unknown): value is GradeLevel {
  return value === 6 || value === 7 || value === 8 || value === 9;
}

function normalizeDate(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof value === "string" ? value : "";
}

function mapDocToStudent(id: string, data: Record<string, unknown>): Student | null {
  const candidateNumber = Number(data.candidateNumber);
  if (!Number.isInteger(candidateNumber) || candidateNumber < 1) {
    console.warn(`[studentService] Skipping doc ${id}: invalid candidateNumber ${data.candidateNumber}`);
    return null;
  }

  const grade = Number(data.grade);
  if (!isGradeLevel(grade)) {
    console.warn(`[studentService] Skipping doc ${id}: invalid grade ${data.grade}`);
    return null;
  }

  const fullName = typeof data.fullName === "string" ? data.fullName.trim() : "";
  if (!fullName) {
    console.warn(`[studentService] Skipping doc ${id}: empty fullName`);
    return null;
  }

  const classId = typeof data.classId === "string" ? data.classId.trim() : "";
  if (!classId) {
    console.warn(`[studentService] Skipping doc ${id}: empty classId`);
    return null;
  }

  const schoolName = typeof data.schoolName === "string" ? data.schoolName.trim() : undefined;
  const motherPhone = typeof data.motherPhone === "string" ? data.motherPhone.trim() : undefined;
  const fatherPhone = typeof data.fatherPhone === "string" ? data.fatherPhone.trim() : undefined;
  const note = typeof data.note === "string" ? data.note.trim() : undefined;

  return {
    studentId: id,
    candidateNumber,
    fullName,
    grade,
    classId,
    schoolName,
    motherPhone,
    fatherPhone,
    note,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
  };
}

export async function getAllStudents(): Promise<Student[]> {
  const snapshot = await getDocs(collection(db, "students"));
  const studentsList: Student[] = [];

  snapshot.forEach((docSnap) => {
    const student = mapDocToStudent(docSnap.id, docSnap.data());
    if (student !== null) {
      studentsList.push(student);
    }
  });

  // Sort: grade asc -> candidateNumber asc -> fullName vi-VN asc
  studentsList.sort((a, b) => {
    if (a.grade !== b.grade) {
      return a.grade - b.grade;
    }
    if (a.candidateNumber !== b.candidateNumber) {
      return a.candidateNumber - b.candidateNumber;
    }
    return a.fullName.localeCompare(b.fullName, "vi");
  });

  return studentsList;
}

export interface CreateStudentInput {
  candidateNumber: number;
  fullName: string;
  schoolName?: string;
  motherPhone?: string;
  fatherPhone?: string;
  classId: string;
  grade: GradeLevel;
  note?: string;
  studentId?: string;
}

export async function createStudent(data: CreateStudentInput): Promise<Student> {
  const studentsRef = collection(db, "students");
  const docRef = data.studentId ? doc(db, "students", data.studentId) : doc(studentsRef);
  const studentId = docRef.id;

  const nowISO = new Date().toISOString();
  const trimmedSchoolName = data.schoolName?.trim() || "";

  const payload = {
    studentId,
    candidateNumber: data.candidateNumber,
    fullName: data.fullName.trim(),
    schoolName: trimmedSchoolName,
    motherPhone: data.motherPhone?.trim() || "",
    fatherPhone: data.fatherPhone?.trim() || "",
    classId: data.classId,
    grade: data.grade,
    note: data.note?.trim() || "",
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload);

  return {
    studentId,
    candidateNumber: data.candidateNumber,
    fullName: data.fullName.trim(),
    schoolName: trimmedSchoolName || undefined,
    motherPhone: data.motherPhone?.trim() || undefined,
    fatherPhone: data.fatherPhone?.trim() || undefined,
    classId: data.classId,
    grade: data.grade,
    note: data.note?.trim() || undefined,
    isActive: true,
    createdAt: nowISO,
    updatedAt: nowISO,
  };
}

export interface UpdateStudentInput {
  candidateNumber?: number;
  fullName?: string;
  schoolName?: string;
  motherPhone?: string;
  fatherPhone?: string;
  classId?: string;
  grade?: GradeLevel;
  note?: string;
  isActive?: boolean;
}

export async function updateStudent(
  studentId: string,
  data: UpdateStudentInput
): Promise<void> {
  if (!studentId) return;
  const docRef = doc(db, "students", studentId);

  const updatePayload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (data.candidateNumber !== undefined) {
    updatePayload.candidateNumber = data.candidateNumber;
  }
  if (data.fullName !== undefined) {
    updatePayload.fullName = data.fullName.trim();
  }
  if (data.schoolName !== undefined) {
    updatePayload.schoolName = data.schoolName.trim();
  }
  if (data.motherPhone !== undefined) {
    updatePayload.motherPhone = data.motherPhone.trim();
  }
  if (data.fatherPhone !== undefined) {
    updatePayload.fatherPhone = data.fatherPhone.trim();
  }
  if (data.classId !== undefined) {
    updatePayload.classId = data.classId;
  }
  if (data.grade !== undefined) {
    updatePayload.grade = data.grade;
  }
  if (data.note !== undefined) {
    updatePayload.note = data.note.trim();
  }
  if (data.isActive !== undefined) {
    updatePayload.isActive = data.isActive;
  }

  await updateDoc(docRef, updatePayload);
}

export async function deleteStudent(studentId: string): Promise<void> {
  if (!studentId) return;
  const docRef = doc(db, "students", studentId);
  await deleteDoc(docRef);
}
