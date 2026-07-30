import { GradeLevel } from "./academic";

export interface Student {
  studentId: string;
  fullName: string;
  grade: GradeLevel;
  classId: string;
  candidateNumber: number;
  schoolName?: string;
  motherPhone?: string;
  fatherPhone?: string;
  note?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
