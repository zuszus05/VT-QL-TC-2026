import { GradeLevel, SchoolClass } from "../../types/academic";
import { Student } from "../../types/student";
import { getGradeLabel } from "../../utils/academic";
import { ClassCard } from "./ClassCard";

export interface ClassSectionProps {
  grade: GradeLevel;
  classes: SchoolClass[];
  students: Student[];
  onViewStudents: (grade: GradeLevel, classId: string) => void;
  onEditClass: (classId: string) => void;
  onDeleteClass: (classId: string) => void;
}

export function ClassSection({
  grade,
  classes,
  students,
  onViewStudents,
  onEditClass,
  onDeleteClass,
}: ClassSectionProps) {
  if (classes.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      {/* Group Header */}
      <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          {getGradeLabel(grade)}
        </h2>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-1">
          {classes.length} lớp
        </span>
      </div>

      {/* Grid of Class Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {classes.map((cls) => {
          const count = students.filter((s) => s.classId === cls.classId).length;
          return (
            <ClassCard
              key={cls.classId}
              schoolClass={cls}
              studentCount={count}
              onViewStudents={onViewStudents}
              onEditClass={onEditClass}
              onDeleteClass={onDeleteClass}
            />
          );
        })}
      </div>
    </section>
  );
}
