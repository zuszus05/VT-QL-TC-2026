import { Student } from "../types/student";
import { GradeLevel, SchoolClass } from "../types/academic";

export type StudentSortOption =
  | "candidate-asc"
  | "candidate-desc"
  | "name-asc"
  | "name-desc";

export function normalizeSearchText(value: string): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim()
    .replace(/\s+/g, " ");
}

export function matchStudentTokens(
  student: Student,
  searchTerm: string,
  className?: string
): boolean {
  const normTerm = normalizeSearchText(searchTerm);
  if (!normTerm) return true;

  const tokens = normTerm.split(" ").filter(Boolean);
  if (tokens.length === 0) return true;

  const candidateStr = student.candidateNumber.toString();
  const nameNorm = normalizeSearchText(student.fullName);
  const classNorm = className ? normalizeSearchText(className) : "";

  const searchableText = `${candidateStr} ${nameNorm} ${classNorm}`;

  return tokens.every((token) => searchableText.includes(token));
}

export function filterAndSortStudents(
  students: Student[],
  selectedGrade: GradeLevel | "all",
  selectedClassId: string | "all",
  searchTerm: string,
  sortOption: StudentSortOption,
  classes?: SchoolClass[]
): Student[] {
  // 1. Filtering
  const classMap = new Map<string, string>();
  if (classes) {
    classes.forEach((c) => classMap.set(c.classId, c.className));
  }

  const filtered = students.filter((student) => {
    // Filter by grade
    if (selectedGrade !== "all" && student.grade !== selectedGrade) {
      return false;
    }

    // Filter by classId
    if (selectedClassId !== "all" && student.classId !== selectedClassId) {
      return false;
    }

    // Filter by searchTerm with token search
    if (searchTerm.trim() !== "") {
      const clsName = classMap.get(student.classId) || "";
      if (!matchStudentTokens(student, searchTerm, clsName)) {
        return false;
      }
    }

    return true;
  });

  // 2. Sorting
  return filtered.sort((a, b) => {
    if (sortOption === "candidate-asc" || sortOption === "candidate-desc") {
      // First sort by grade ascending (6, 7, 8, 9)
      if (a.grade !== b.grade) {
        return a.grade - b.grade;
      }
      // Then candidateNumber
      if (a.candidateNumber !== b.candidateNumber) {
        return sortOption === "candidate-asc"
          ? a.candidateNumber - b.candidateNumber
          : b.candidateNumber - a.candidateNumber;
      }
      // Tie breaker by name
      return a.fullName.localeCompare(b.fullName, "vi-VN");
    }

    if (sortOption === "name-asc") {
      const comp = a.fullName.localeCompare(b.fullName, "vi-VN");
      if (comp !== 0) return comp;
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.candidateNumber - b.candidateNumber;
    }

    if (sortOption === "name-desc") {
      const comp = b.fullName.localeCompare(a.fullName, "vi-VN");
      if (comp !== 0) return comp;
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.candidateNumber - b.candidateNumber;
    }

    return 0;
  });
}
