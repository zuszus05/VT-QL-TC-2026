import { useState } from "react";
import { UserProfile } from "../../types/user";
import { AppTab } from "../../types/navigation";
import { Student } from "../../types/student";
import { SchoolClass } from "../../types/academic";
import { ReinforcementScheduleRecord } from "../../types/extraStudy";
import { AttendanceRecord } from "../../types/attendance";
import { TeacherProfile } from "../../types/teacher";
import { StudySessionFilter, TodayStudentSchedule } from "../../types/dashboard";
import { getFormattedVietnameseDate } from "../../utils/date";
import { SESSION_TIME_RANGES } from "../../constants/extraStudy";

import { DashboardWelcome } from "./DashboardWelcome";
import { PendingTeacherAlert } from "./PendingTeacherAlert";
import { DashboardStats } from "./DashboardStats";
import { TodaySessions } from "./TodaySessions";
import { TodaySchedule } from "./TodaySchedule";
import { GradeDistribution } from "./GradeDistribution";
import { TodayAttendanceSummary } from "./TodayAttendanceSummary";

export interface DashboardProps {
  currentUser: UserProfile;
  onNavigate: (tab: AppTab) => void;
  students: Student[];
  studentsLoading?: boolean;
  classes: SchoolClass[];
  classesLoading?: boolean;
  extraStudyRecords: ReinforcementScheduleRecord[];
  extraStudyLoading?: boolean;
  todayAttendanceRecords?: AttendanceRecord[];
  todayAttendanceLoading?: boolean;
  todayAttendanceError?: string | null;
  teachers?: TeacherProfile[];
  teachersLoading?: boolean;
  teachersError?: string | null;
}

export function Dashboard({
  currentUser,
  onNavigate,
  students,
  studentsLoading = false,
  classes,
  classesLoading = false,
  extraStudyRecords,
  extraStudyLoading = false,
  todayAttendanceRecords = [],
  todayAttendanceLoading = false,
  todayAttendanceError = null,
  teachers = [],
  teachersLoading = false,
  teachersError = null,
}: DashboardProps) {
  const [activeSessionFilter, setActiveSessionFilter] =
    useState<StudySessionFilter>("all");

  const formattedDate = getFormattedVietnameseDate();

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayDateStr = `${year}-${month}-${day}`;

  // Lọc lịch tăng cường ngày hôm nay (status === "scheduled")
  const todayExtraRecords = extraStudyRecords.filter(
    (r) => r.targetDate === todayDateStr && r.status === "scheduled"
  );

  const todayExtraCount = todayExtraRecords.length;

  const todayScheduleStudents: TodayStudentSchedule[] = todayExtraRecords
    .map((record) => {
      if (
        !record.extraStudyId ||
        typeof record.extraStudyId !== "string" ||
        record.extraStudyId.trim() === ""
      ) {
        return null;
      }
      const student = students.find((s) => s.studentId === record.studentId);
      const schoolClass = student
        ? classes.find((c) => c.classId === student.classId)
        : null;

      const rawClassName = schoolClass?.className;
      const className = schoolClass && rawClassName
        ? rawClassName.startsWith("Lớp")
          ? rawClassName
          : `Lớp ${rawClassName}`
        : "Chưa xác định lớp";

      const sessionTime =
        SESSION_TIME_RANGES[record.session] || "07:00 – 11:30";

      const result: TodayStudentSchedule = {
        extraStudyId: record.extraStudyId,
        studentId: record.studentId,
        candidateNumber: student?.candidateNumber || 0,
        fullName: student?.fullName || "Chưa xác định",
        grade: schoolClass ? (schoolClass.grade ?? student?.grade ?? 999) : 999,
        classId: schoolClass ? schoolClass.classId : "unknown",
        className,
        session: record.session,
        sessionTime,
      };
      return result;
    })
    .filter((item): item is TodayStudentSchedule => item !== null);

  const sessionCounts = {
    morning: todayScheduleStudents.filter((s) => s.session === "morning").length,
    afternoon: todayScheduleStudents.filter((s) => s.session === "afternoon").length,
    evening: todayScheduleStudents.filter((s) => s.session === "evening").length,
  };

  // Thống kê giáo viên (chỉ đếm role === "teacher")
  const teacherProfiles = teachers.filter((t) => t.role === "teacher");
  const activeTeachersCount = teacherProfiles.filter((t) => t.status === "active").length;
  const pendingTeachersCount = teacherProfiles.filter((t) => t.status === "pending").length;
  const disabledTeachersCount = teacherProfiles.filter((t) => t.status === "disabled").length;

  return (
    <div className="space-y-6 pb-8">
      {/* Lời chào & Bảng chào mừng */}
      <DashboardWelcome
        fullName={currentUser.fullName}
        role={currentUser.role}
        formattedDate={formattedDate}
        todayExtraCount={todayExtraCount}
      />

      {/* Cảnh báo giáo viên chờ duyệt (Chỉ hiển thị với Admin) */}
      {currentUser.role === "admin" && pendingTeachersCount > 0 && (
        <PendingTeacherAlert
          pendingCount={pendingTeachersCount}
          onNavigateTeachers={() => onNavigate("teachers")}
        />
      )}

      {/* Khối Thống kê dạng Card */}
      <DashboardStats
        totalStudents={students.length}
        studentsLoading={studentsLoading}
        totalClasses={classes.length}
        classesLoading={classesLoading}
        todayExtraStudyCount={todayExtraCount}
        extraStudyLoading={extraStudyLoading}
        activeTeachersCount={activeTeachersCount}
        pendingTeachersCount={pendingTeachersCount}
        disabledTeachersCount={disabledTeachersCount}
        teachersLoading={teachersLoading}
        onNavigate={onNavigate}
      />

      {/* Biểu đồ phân bố Khối & Tóm tắt điểm danh hôm nay */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <GradeDistribution students={students} loading={studentsLoading} />
        <TodayAttendanceSummary
          records={todayAttendanceRecords}
          loading={todayAttendanceLoading}
          error={todayAttendanceError}
          todayDateStr={todayDateStr}
        />
      </div>

      {/* Phần Lịch học tăng cường hôm nay & Bộ lọc ca */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Hoạt động Tăng cường Hôm nay
            </h2>
            <p className="text-xs text-slate-500">
              Lọc theo các ca học sáng, chiều và tối ({todayDateStr})
            </p>
          </div>

          <TodaySessions
            sessionCounts={sessionCounts}
            activeFilter={activeSessionFilter}
            onFilterChange={setActiveSessionFilter}
          />
        </div>

        <TodaySchedule
          students={todayScheduleStudents}
          activeFilter={activeSessionFilter}
          onNavigateExtraStudy={() => onNavigate("extra-study")}
        />
      </div>
    </div>
  );
}
