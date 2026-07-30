import { UserRole } from "./user";

export type AppTab =
  | "dashboard"
  | "students"
  | "extra-study"
  | "attendance"
  | "reports"
  | "teachers";

export interface NavigationItem {
  id: AppTab;
  label: string;
  description: string;
  iconName: "dashboard" | "users" | "calendar" | "check-square" | "bar-chart" | "user-check";
  allowedRoles: UserRole[];
}
