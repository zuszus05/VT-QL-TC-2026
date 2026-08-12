import { useState, useMemo } from "react";
import { TodayStudentSchedule, StudySessionFilter } from "../../types/dashboard";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";

function getShortName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return (parts[parts.length - 1] || fullName).toUpperCase();
}

export interface TodayScheduleProps {
  students: TodayStudentSchedule[];
  activeFilter: StudySessionFilter;
  onNavigateExtraStudy: () => void;
}

interface ClassGroup {
  classKey: string;
  className: string;
  isUnknown: boolean;
  totalCount: number;
  morningStudents: TodayStudentSchedule[];
  afternoonStudents: TodayStudentSchedule[];
  eveningStudents: TodayStudentSchedule[];
  allFilteredStudents: TodayStudentSchedule[];
}

interface GradeGroup {
  gradeKey: number;
  gradeLabel: string;
  isUnknownGrade: boolean;
  totalCount: number;
  classes: ClassGroup[];
}

function StudentItem({ student }: { student: TodayStudentSchedule }) {
  const shortName = getShortName(student.fullName);
  const candNum = student.candidateNumber ? student.candidateNumber : "—";

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50/80 rounded border border-slate-200/60 text-xs hover:bg-slate-100/60 transition-colors">
      <span className="font-mono font-bold text-teal-700 min-w-[28px]">
        {candNum}
      </span>
      <span className="text-slate-300 font-light">—</span>
      <span className="font-bold text-slate-900 tracking-tight truncate">
        {shortName}
      </span>
    </div>
  );
}

function SessionColumn({
  title,
  students,
}: {
  title: string;
  students: TodayStudentSchedule[];
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200/90 p-2.5 shadow-2xs space-y-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <span className="text-xs font-bold text-slate-800 tracking-wide">
          {title}
        </span>
        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
          {students.length} HS
        </span>
      </div>

      {students.length === 0 ? (
        <div className="py-2.5 text-center text-xs text-slate-400 italic">
          Không có học sinh
        </div>
      ) : (
        <div className="space-y-1.5">
          {students.map((st) => (
            <StudentItem key={st.extraStudyId} student={st} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TodaySchedule({
  students,
  activeFilter,
  onNavigateExtraStudy,
}: TodayScheduleProps) {
  const [openClassKeys, setOpenClassKeys] = useState<Set<string>>(new Set());

  const toggleClassAccordion = (key: string) => {
    setOpenClassKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // 1. Filter students by activeFilter
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (activeFilter === "all") return true;
      return student.session === activeFilter;
    });
  }, [students, activeFilter]);

  // 2. Group by Grade -> Class
  const gradeGroups = useMemo(() => {
    if (filteredStudents.length === 0) return [];

    const mapGrade = new Map<
      number,
      {
        gradeKey: number;
        isUnknownGrade: boolean;
        classMap: Map<
          string,
          {
            classKey: string;
            className: string;
            isUnknown: boolean;
            records: TodayStudentSchedule[];
          }
        >;
      }
    >();

    for (const rec of filteredStudents) {
      const isUnknownRecord =
        !rec.classId ||
        rec.classId === "unknown" ||
        rec.className === "Chưa xác định lớp";

      const gKey = isUnknownRecord ? 999 : Number(rec.grade) || 999;
      const cKey = isUnknownRecord ? "unknown" : rec.classId || "unknown";
      const cName = isUnknownRecord ? "Chưa xác định lớp" : rec.className;

      if (!mapGrade.has(gKey)) {
        mapGrade.set(gKey, {
          gradeKey: gKey,
          isUnknownGrade: gKey === 999,
          classMap: new Map(),
        });
      }

      const gradeObj = mapGrade.get(gKey)!;

      if (!gradeObj.classMap.has(cKey)) {
        gradeObj.classMap.set(cKey, {
          classKey: cKey,
          className: cName,
          isUnknown: isUnknownRecord,
          records: [],
        });
      }

      gradeObj.classMap.get(cKey)!.records.push(rec);
    }

    const result: GradeGroup[] = [];

    for (const [gKey, gData] of mapGrade.entries()) {
      const classGroups: ClassGroup[] = [];
      let gradeTotal = 0;

      for (const [cKey, cData] of gData.classMap.entries()) {
        const records = [...cData.records];
        records.sort((a, b) => {
          if (a.candidateNumber !== b.candidateNumber) {
            return a.candidateNumber - b.candidateNumber;
          }
          return getShortName(a.fullName).localeCompare(
            getShortName(b.fullName),
            "vi"
          );
        });

        const morningStudents = records.filter((r) => r.session === "morning");
        const afternoonStudents = records.filter(
          (r) => r.session === "afternoon"
        );
        const eveningStudents = records.filter((r) => r.session === "evening");

        classGroups.push({
          classKey: cKey,
          className: cData.className,
          isUnknown: cData.isUnknown,
          totalCount: records.length,
          morningStudents,
          afternoonStudents,
          eveningStudents,
          allFilteredStudents: records,
        });

        gradeTotal += records.length;
      }

      classGroups.sort((a, b) => {
        if (a.isUnknown) return 1;
        if (b.isUnknown) return -1;
        return a.className.localeCompare(b.className, "vi", { numeric: true });
      });

      const gradeLabel = gData.isUnknownGrade
        ? "Chưa xác định lớp"
        : `Khối ${gKey}`;

      result.push({
        gradeKey: gKey,
        gradeLabel,
        isUnknownGrade: gData.isUnknownGrade,
        totalCount: gradeTotal,
        classes: classGroups,
      });
    }

    result.sort((a, b) => a.gradeKey - b.gradeKey);

    return result;
  }, [filteredStudents]);

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
          {gradeGroups.map((gradeGroup) => (
            <div
              key={gradeGroup.gradeKey}
              className="rounded-xl border border-slate-200/90 overflow-hidden bg-slate-50/30 p-3 shadow-2xs space-y-2"
            >
              {/* Header Khối */}
              <div className="flex items-center gap-2 px-3 py-2 bg-teal-50/90 border border-teal-100/80 rounded-lg">
                <span className="inline-flex items-center justify-center font-extrabold text-xs text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded border border-teal-200/80">
                  {gradeGroup.isUnknownGrade ? "?" : `K${gradeGroup.gradeKey}`}
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {gradeGroup.gradeLabel}
                </h4>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-600 font-semibold">
                  {gradeGroup.totalCount} HS
                </span>
              </div>

              {/* Danh sách các Lớp trong Khối */}
              <div className="space-y-2">
                {gradeGroup.classes.map((classGroup) => {
                  const accordionKey = `${gradeGroup.gradeKey}-${classGroup.classKey}`;
                  const isOpen = openClassKeys.has(accordionKey);
                  const displayClassName = classGroup.isUnknown
                    ? "Chưa xác định lớp"
                    : classGroup.className.startsWith("Lớp")
                    ? classGroup.className
                    : `Lớp ${classGroup.className}`;

                  return (
                    <div
                      key={classGroup.classKey}
                      className="rounded-lg border border-slate-200/90 bg-white overflow-hidden shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => toggleClassAccordion(accordionKey)}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-slate-400 font-bold text-xs">
                            {isOpen ? "▾" : "▸"}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {displayClassName}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
                          {classGroup.totalCount} HS
                        </span>
                      </button>

                      {isOpen && (
                        <div className="p-3 border-t border-slate-100 bg-slate-50/40">
                          {activeFilter === "all" ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <SessionColumn
                                title="SÁNG"
                                students={classGroup.morningStudents}
                              />
                              <SessionColumn
                                title="CHIỀU"
                                students={classGroup.afternoonStudents}
                              />
                              <SessionColumn
                                title="TỐI"
                                students={classGroup.eveningStudents}
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {classGroup.allFilteredStudents.map((st) => (
                                <StudentItem
                                  key={st.extraStudyId}
                                  student={st}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
