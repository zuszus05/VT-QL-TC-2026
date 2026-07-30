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
import { GradeLevel, SchoolClass } from "../types/academic";

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
  return typeof value === "string" ? value : new Date().toISOString();
}

function mapDocToSchoolClass(id: string, data: Record<string, unknown>): SchoolClass | null {
  const grade = Number(data.grade);
  if (!isGradeLevel(grade)) {
    console.warn(`[classService] Skipping document ${id}: invalid grade ${data.grade}`);
    return null;
  }

  const className = typeof data.className === "string" ? data.className.trim() : "";
  if (!className) {
    console.warn(`[classService] Skipping document ${id}: invalid or empty className`);
    return null;
  }

  return {
    classId: id,
    className,
    grade,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
  };
}

export async function getAllClasses(): Promise<SchoolClass[]> {
  const snapshot = await getDocs(collection(db, "classes"));
  const classesList: SchoolClass[] = [];

  snapshot.forEach((docSnap) => {
    const schoolClass = mapDocToSchoolClass(docSnap.id, docSnap.data());
    if (schoolClass !== null) {
      classesList.push(schoolClass);
    }
  });

  classesList.sort((a, b) => {
    if (a.grade !== b.grade) {
      return a.grade - b.grade;
    }
    return a.className.localeCompare(b.className, "vi");
  });

  return classesList;
}

export async function createClass(data: {
  grade: GradeLevel;
  className: string;
  classId?: string;
}): Promise<SchoolClass> {
  const classesRef = collection(db, "classes");
  const docRef = data.classId ? doc(db, "classes", data.classId) : doc(classesRef);
  const classId = docRef.id;

  const nowISO = new Date().toISOString();
  const trimmedName = data.className.trim().toUpperCase();

  const payload = {
    classId,
    grade: data.grade,
    className: trimmedName,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload);

  return {
    classId,
    grade: data.grade,
    className: trimmedName,
    isActive: true,
    createdAt: nowISO,
    updatedAt: nowISO,
  };
}

export async function updateClass(
  classId: string,
  data: {
    className?: string;
    grade?: GradeLevel;
    isActive?: boolean;
  }
): Promise<void> {
  if (!classId) return;
  const docRef = doc(db, "classes", classId);

  const updatePayload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (data.className !== undefined) {
    updatePayload.className = data.className.trim().toUpperCase();
  }
  if (data.grade !== undefined) {
    updatePayload.grade = data.grade;
  }
  if (data.isActive !== undefined) {
    updatePayload.isActive = data.isActive;
  }

  await updateDoc(docRef, updatePayload);
}

export async function deleteClass(classId: string): Promise<void> {
  if (!classId) return;
  const docRef = doc(db, "classes", classId);
  await deleteDoc(docRef);
}
