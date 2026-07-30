import { Badge } from "./Badge";

export interface StatusBadgeProps {
  status: "active" | "pending" | "inactive" | string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  switch (status) {
    case "active":
      return <Badge variant="success">{label || "Đã duyệt"}</Badge>;
    case "pending":
      return <Badge variant="warning">{label || "Chờ duyệt"}</Badge>;
    case "inactive":
      return <Badge variant="danger">{label || "Đã khóa"}</Badge>;
    default:
      return <Badge variant="default">{label || status}</Badge>;
  }
}
