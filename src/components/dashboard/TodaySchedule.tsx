import { TodayStudentSchedule, StudySessionFilter } from "../../types/dashboard";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { getSessionLabel } from "../../utils/date";

function getShortName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
}

export interface TodayScheduleProps {
  students: TodayStudentSchedule[];
  activeFilter: StudySessionFilter;
  onNavigateExtraStudy: () => void;
}

export function TodaySchedule({
  students,
  activeFilter,
  onNavigateExtraStudy,
}: TodayScheduleProps) {
  const filteredStudents = students.filter((student) => {
    if (activeFilter === "all") return true;
    return student.session === activeFilter;
  });

  const getSessionBadgeVariant = (session: string) => {
    switch (session) {
      case "morning":
        return "info";
      case "afternoon":
        return "warning";
      case "evening":
        return "success";
      default:
        return "default";
    }
  };

  const gradeOrder = [6, 7, 8, 9];
  const groupedByGrade = gradeOrder
    .map((grade) => {
      const gradeStudents = filteredStudents.filter(
        (s) => Number(s.grade) === grade
      );
      if (gradeStudents.length === 0) return null;

      // Sắp xếp trong từng khối: className -> candidateNumber -> tên ngắn
      gradeStudents.sort((a, b) => {
        const classComp = a.className.localeCompare(b.className, "vi");
        if (classComp !== 0) return classComp;
        if (a.candidateNumber !== b.candidateNumber) {
          return a.candidateNumber - b.candidateNumber;
        }
        const shortA = getShortName(a.fullName);
        const shortB = getShortName(b.fullName);
        return shortA.localeCompare(shortB, "vi");
      });

      return {
        grade,
        students: gradeStudents,
      };
    })
    .filter(
      (
        g
      ): g is {
        grade: number;
        students: TodayStudentSchedule[];
      } => g !== null
    );

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Lịch học tăng cường hôm nay
          </h3>
          <p className="text-xs text-slate-500">
            Hiển thị {filteredStudents.length} lượt học theo bộ lọc
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onNavigateExtraStudy}
          className="self-start sm:self-auto"
        >
          Sắp xếp / Quản lý DS Tăng cường →
        </Button>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="Không có lịch học tăng cường phù hợp."
            description="Không tìm thấy học sinh nào cho ca học được chọn."
          />
        </div>
      ) : (
        <div className="p-4 sm:p-5 space-y-4">
          {groupedByGrade.map((gradeGroup) => (
            <div
              key={gradeGroup.grade}
              className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs"
            >
              {/* Header Khối */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-teal-50/90 border-b border-teal-100">
                <span className="inline-flex items-center justify-center font-extrabold text-xs text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded border border-teal-200/80">
                  K{gradeGroup.grade}
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  Khối {gradeGroup.grade}
                </h4>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-600 font-medium">
                  {gradeGroup.students.length} lượt tăng cường
                </span>
              </div>

              {/* Bảng học sinh trong khối */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[360px]">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-semibold text-xs border-b border-slate-100 uppercase tracking-wider">
                      <th className="py-2.5 px-4 w-20">Lớp</th>
                      <th className="py-2.5 px-4 w-20">SBD</th>
                      <th className="py-2.5 px-4">Tên</th>
                      <th className="py-2.5 px-4">Ca học</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {gradeGroup.students.map((student) => (
                      <tr
                        key={student.extraStudyId}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold">
                            {student.className}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-teal-700">
                          {student.candidateNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {getShortName(student.fullName)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={getSessionBadgeVariant(student.session)}
                            >
                              {getSessionLabel(student.session)}
                            </Badge>
                            <span className="text-xs text-slate-500 hidden md:inline">
                              {student.sessionTime}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
