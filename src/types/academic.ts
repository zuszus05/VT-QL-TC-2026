export type GradeLevel = 6 | 7 | 8 | 9;

export interface SchoolClass {
  classId: string;
  className: string;
  grade: GradeLevel;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
