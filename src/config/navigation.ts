import { NavigationItem } from "../types/navigation";

export const NAV_ITEMS: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Tổng quan",
    description: "Theo dõi tình hình học sinh và hoạt động tăng cường.",
    iconName: "dashboard",
    allowedRoles: ["admin"],
  },
  {
    id: "students",
    label: "Học sinh & Lớp",
    description: "Quản lý danh sách lớp và hồ sơ học sinh.",
    iconName: "users",
    allowedRoles: ["admin", "teacher"],
  },
  {
    id: "extra-study",
    label: "DS Tăng cường",
    description: "Sắp xếp học sinh theo ngày và ca học.",
    iconName: "calendar",
    allowedRoles: ["admin", "teacher"],
  },
  {
    id: "attendance",
    label: "Điểm danh",
    description: "Theo dõi tình trạng tham gia của học sinh.",
    iconName: "check-square",
    allowedRoles: ["admin", "teacher"],
  },
  {
    id: "reports",
    label: "Báo cáo",
    description: "Tổng hợp dữ liệu vắng, muộn và hoạt động học tập.",
    iconName: "bar-chart",
    allowedRoles: ["admin", "teacher"],
  },
  {
    id: "teachers",
    label: "Quản lý giáo viên",
    description: "Duyệt và quản lý tài khoản giáo viên.",
    iconName: "user-check",
    allowedRoles: ["admin"],
  },
];
