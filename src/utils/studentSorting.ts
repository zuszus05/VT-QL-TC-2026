import { Student } from "../types/student";
import { GradeLevel } from "../types/academic";

export type StudentSortOption =
  | "candidate-asc"
  | "candidate-desc"
  | "name-asc"
  | "name-desc";

function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");
}

export function filterAndSortStudents(
  students: Student[],
  selectedGrade: GradeLevel | "all",
  selectedClassId: string | "all",
  searchTerm: string,
  sortOption: StudentSortOption
): Student[] {
  // 1. Filtering
  const rawTerm = searchTerm.trim().toLowerCase().replace(/\s+/g, " ");
  const cleanTerm = removeVietnameseTones(rawTerm);

  const filtered = students.filter((student) => {
    // Filter by grade
    if (selectedGrade !== "all" && student.grade !== selectedGrade) {
      return false;
    }

    // Filter by classId
    if (selectedClassId !== "all" && student.classId !== selectedClassId) {
      return false;
    }

    // Filter by searchTerm
    if (cleanTerm) {
      const rawName = student.fullName.toLowerCase().replace(/\s+/g, " ");
      const nameClean = removeVietnameseTones(rawName);
      const candStr = student.candidateNumber.toString();

      const matchesName = nameClean.includes(cleanTerm);
      const matchesCand = candStr.includes(rawTerm);

      if (!matchesName && !matchesCand) {
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
