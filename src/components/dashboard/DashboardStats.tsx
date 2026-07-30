import { AppTab } from "../../types/navigation";
import { StatCard } from "./StatCard";

export interface DashboardStatsProps {
  totalStudents: number;
  studentsLoading?: boolean;
  totalClasses: number;
  classesLoading?: boolean;
  todayExtraStudyCount: number;
  extraStudyLoading?: boolean;
  activeTeachersCount: number;
  pendingTeachersCount: number;
  disabledTeachersCount: number;
  teachersLoading?: boolean;
  onNavigate: (tab: AppTab) => void;
}

export function DashboardStats({
  totalStudents,
  studentsLoading = false,
  totalClasses,
  classesLoading = false,
  todayExtraStudyCount,
  extraStudyLoading = false,
  activeTeachersCount,
  pendingTeachersCount,
  disabledTeachersCount,
  teachersLoading = false,
  onNavigate,
}: DashboardStatsProps) {
  const teacherSubtext = teachersLoading
    ? "Đang tải danh sách..."
    : pendingTeachersCount > 0
    ? `${pendingTeachersCount} tài khoản chờ duyệt`
    : disabledTeachersCount > 0
    ? `${disabledTeachersCount} tài khoản đã vô hiệu hóa`
    : "Tất cả tài khoản hoạt động";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        title="Tổng học sinh"
        value={studentsLoading ? "..." : totalStudents}
        subtitle={
          <>
            <span className="md:hidden">Học sinh</span>
            <span className="hidden md:inline">Học sinh đang quản lý</span>
          </>
        }
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        }
        badgeText="Đang quản lý"
        badgeVariant="info"
        hideBadgeOnMobile={true}
        onClick={() => onNavigate("students")}
      />

      <StatCard
        title="Tổng lớp học"
        value={classesLoading ? "..." : totalClasses}
        subtitle={
          <>
            <span className="md:hidden">Lớp học</span>
            <span className="hidden md:inline">{totalClasses} lớp học</span>
          </>
        }
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.5M4.5 21V10.5" />
          </svg>
        }
        badgeText={`${totalClasses} Lớp`}
        badgeVariant="default"
        onClick={() => onNavigate("students")}
      />

      <StatCard
        title="Lượt tăng cường hôm nay"
        value={extraStudyLoading ? "..." : todayExtraStudyCount}
        subtitle={
          <>
            <span className="md:hidden">Lượt tăng cường</span>
            <span className="hidden md:inline">Lượt tăng cường trong ngày</span>
          </>
        }
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84 51.39 51.39 0 00-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
          </svg>
        }
        badgeText="Xem danh sách →"
        badgeVariant="warning"
        onClick={() => onNavigate("extra-study")}
      />

      <StatCard
        title="Giáo viên"
        value={teachersLoading ? "..." : `${activeTeachersCount} đang hoạt động`}
        subtitle={
          teacherSubtext === "Tất cả tài khoản hoạt động" ? (
            <>
              <span className="md:hidden">Hoạt động</span>
              <span className="hidden md:inline">Tất cả tài khoản hoạt động</span>
            </>
          ) : (
            teacherSubtext
          )
        }
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        }
        badgeText={pendingTeachersCount > 0 ? `${pendingTeachersCount} Chờ duyệt` : "Hoạt động"}
        badgeVariant={pendingTeachersCount > 0 ? "danger" : "success"}
        onClick={() => onNavigate("teachers")}
      />
    </div>
  );
}
