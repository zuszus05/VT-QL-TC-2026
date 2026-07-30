import { SubjectDistributionItem } from "../../types/dashboard";
import { getExtraSubjectLabel } from "../../utils/extraStudyValidation";
import { Card } from "../common/Card";

export interface SubjectDistributionProps {
  items: SubjectDistributionItem[];
}

export function SubjectDistribution({ items }: SubjectDistributionProps) {
  const totalExtra = items.reduce((acc, curr) => acc + curr.count, 0);
  const highestSubject = items.length > 0
    ? items.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), items[0])
    : null;

  return (
    <Card className="border-slate-200/90 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Phân bố theo Môn học
            </h3>
            <p className="text-xs text-slate-500">
              {totalExtra} học sinh trong danh sách phụ đạo
            </p>
          </div>
          <span className="text-xs font-semibold bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full border border-sky-100">
            4 Bộ môn
          </span>
        </div>

        <div className="space-y-3.5">
          {items.map((item) => {
            const percentage = Math.round((item.count / totalExtra) * 100);
            return (
              <div key={item.subject} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.colorClass}`} />
                    <span className="text-slate-700">{getExtraSubjectLabel(item.subject)}</span>
                  </div>
                  <span className="text-slate-900 font-bold">
                    {item.count} HS ({percentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.colorClass} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
        <span>
          {highestSubject
            ? `${getExtraSubjectLabel(highestSubject.subject)} chiếm tỷ lệ cao nhất (${Math.round(
                (highestSubject.count / (totalExtra || 1)) * 100
              )}%)`
            : "Chưa có dữ liệu"}
        </span>
        <span className="text-sky-700 font-medium">Lớp Tăng cường</span>
      </div>
    </Card>
  );
}
