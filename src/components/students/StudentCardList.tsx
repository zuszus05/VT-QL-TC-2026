import { SchoolClass } from "../../types/academic";
import { Student } from "../../types/student";

export interface StudentCardListProps {
  students: Student[];
  classes: SchoolClass[];
  hideClassColumn?: boolean;
  onEditStudent: (studentId: string) => void;
  onDeleteStudent: (studentId: string) => void;
}

export function StudentCardList({
  students,
  classes,
  hideClassColumn = false,
  onEditStudent,
  onDeleteStudent,
}: StudentCardListProps) {
  const classMap = new Map<string, string>();
  classes.forEach((c) => {
    classMap.set(c.classId, c.className);
  });

  return (
    <div className="space-y-3">
      {students.map((student) => {
        const className = classMap.get(student.classId) || student.classId;

        return (
          <div
            key={student.studentId}
            className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3"
          >
            {/* Header: Name, SBD badge & Class badge */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {student.fullName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-mono text-xs font-bold border border-teal-100" aria-label={`Số báo danh: ${student.candidateNumber}`}>
                    {student.candidateNumber}
                  </span>
                  {!hideClassColumn && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                      {className}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEditStudent(student.studentId)}
                  className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[38px] min-w-[38px] flex items-center justify-center"
                  aria-label={`Sửa ${student.fullName}`}
                  title="Sửa học sinh"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteStudent(student.studentId)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 min-h-[38px] min-w-[38px] flex items-center justify-center"
                  aria-label={`Xóa ${student.fullName}`}
                  title="Xóa học sinh"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2 text-slate-600">
              <div className="col-span-2">
                <span className="text-slate-400 font-medium block">Trường</span>
                <span className="font-medium text-slate-800">
                  {student.schoolName || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">SĐT mẹ</span>
                <span className="font-mono font-medium text-slate-800">
                  {student.motherPhone || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">SĐT bố</span>
                <span className="font-mono font-medium text-slate-800">
                  {student.fatherPhone || "—"}
                </span>
              </div>
              {student.note && (
                <div className="col-span-2">
                  <span className="text-slate-400 font-medium block">Ghi chú</span>
                  <span className="text-slate-700 italic">{student.note}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
