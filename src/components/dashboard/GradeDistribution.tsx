import { Student } from "../../types/student";
import { Card } from "../common/Card";

export interface GradeDistributionProps {
  students: Student[];
  loading?: boolean;
}

export function GradeDistribution({ students, loading = false }: GradeDistributionProps) {
  const grades = [6, 7, 8, 9] as const;

  const gradeCounts = grades.map((g) => {
    const count = students.filter((s) => Number(s.grade) === g).length;
    return {
      gradeLabel: `Khối ${g}`,
      count,
    };
  });

  const totalStudents = students.length;
  const maxCount = Math.max(...gradeCounts.map((g) => g.count), 1);

  return (
    <Card className="border-slate-200/90 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Phân bố theo Khối</h3>
            <p className="text-xs text-slate-500">
              Tổng số {totalStudents} học sinh 4 khối (THCS)
            </p>
          </div>
          <span className="text-xs font-semibold bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full border border-teal-100">
            4 Khối
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
            Đang tải danh sách học sinh...
          </div>
        ) : (
          <div className="space-y-3.5">
            {gradeCounts.map((item) => {
              const percentage =
                totalStudents > 0
                  ? Math.round((item.count / totalStudents) * 100)
                  : 0;
              const barWidth =
                totalStudents > 0 ? (item.count / maxCount) * 100 : 0;

              return (
                <div key={item.gradeLabel} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">{item.gradeLabel}</span>
                    <span className="text-slate-900 font-bold">
                      {item.count} HS ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
        <span>Tỷ lệ phân bổ theo khối THCS</span>
        <span className="text-teal-700 font-medium">Toàn trường</span>
      </div>
    </Card>
  );
}
