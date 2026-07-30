import * as XLSX from "xlsx";

export interface ExcelStudentPreview {
  rowIndex: number;
  candidateNumber: number;
  fullName: string;
  schoolName: string;
  motherPhone: string;
  fatherPhone: string;
}

export interface ExcelSheetPreview {
  sheetName: string;
  students: ExcelStudentPreview[];
}

export interface ExcelFilePreviewData {
  fileName: string;
  totalSheets: number;
  totalStudents: number;
  sheets: ExcelSheetPreview[];
}

function parseSBD(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const str = String(val).trim();
  if (!str) return 0;
  const num = parseInt(str, 10);
  return isNaN(num) ? 0 : num;
}

function formatPhoneNumber(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  if (!str) return "";
  if (/^\d{9}$/.test(str)) {
    return "0" + str;
  }
  return str;
}

export function parseStudentExcelFile(file: File): Promise<ExcelFilePreviewData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) {
          throw new Error("Không thể đọc tệp tin Excel.");
        }

        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: "array" });

        const sheets: ExcelSheetPreview[] = [];
        let totalStudents = 0;

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
            header: 1,
            raw: false,
            defval: "",
          });

          if (!rows || rows.length === 0) continue;

          let headerRowIndex = -1;
          let sbdCol = -1;
          let nameCol = -1;
          let schoolCol = -1;
          let motherPhoneCol = -1;
          let fatherPhoneCol = -1;

          for (let r = 0; r < Math.min(rows.length, 15); r++) {
            const row = rows[r];
            if (!Array.isArray(row)) continue;

            for (let c = 0; c < row.length; c++) {
              const cellText = String(row[c] || "").trim().toUpperCase();
              if (!cellText) continue;

              if (cellText.includes("SBD") || cellText.includes("SỐ BÁO DANH")) {
                sbdCol = c;
              } else if (
                cellText.includes("HỌ VÀ TÊN") ||
                cellText.includes("HỌ TÊN") ||
                cellText.includes("HO VA TEN") ||
                cellText.includes("HO TEN")
              ) {
                nameCol = c;
              } else if (
                cellText.includes("TRƯỜNG") ||
                cellText.includes("TRUONG")
              ) {
                schoolCol = c;
              } else if (
                cellText.includes("MẸ") || cellText.includes("ME")
              ) {
                if (
                  cellText.includes("SĐT") ||
                  cellText.includes("SDT") ||
                  cellText.includes("ĐIỆN THOẠI") ||
                  cellText.includes("ĐT") ||
                  cellText.includes("PHONE")
                ) {
                  motherPhoneCol = c;
                }
              } else if (
                cellText.includes("BỐ") || cellText.includes("BO") || cellText.includes("CHA")
              ) {
                if (
                  cellText.includes("SĐT") ||
                  cellText.includes("SDT") ||
                  cellText.includes("ĐIỆN THOẠI") ||
                  cellText.includes("ĐT") ||
                  cellText.includes("PHONE")
                ) {
                  fatherPhoneCol = c;
                }
              }
            }

            if (nameCol !== -1 || sbdCol !== -1) {
              headerRowIndex = r;
              break;
            }
          }

          const studentsInSheet: ExcelStudentPreview[] = [];

          if (headerRowIndex !== -1) {
            for (let r = headerRowIndex + 1; r < rows.length; r++) {
              const row = rows[r];
              if (!Array.isArray(row)) continue;

              const rawSbd = sbdCol !== -1 ? row[sbdCol] : "";
              const rawName = nameCol !== -1 ? row[nameCol] : "";
              const rawSchool = schoolCol !== -1 ? row[schoolCol] : "";
              const rawMotherPhone = motherPhoneCol !== -1 ? row[motherPhoneCol] : "";
              const rawFatherPhone = fatherPhoneCol !== -1 ? row[fatherPhoneCol] : "";

              const fullNameStr = String(rawName || "");
              const candidateNumber = parseSBD(rawSbd);

              // Nếu cả SBD và Họ tên đều rỗng/bằng 0 => dòng trống => bỏ qua
              if (!candidateNumber && !fullNameStr.trim()) continue;

              const schoolName = String(rawSchool || "").trim();
              const motherPhone = formatPhoneNumber(rawMotherPhone);
              const fatherPhone = formatPhoneNumber(rawFatherPhone);

              studentsInSheet.push({
                rowIndex: r + 1,
                candidateNumber,
                fullName: fullNameStr,
                schoolName,
                motherPhone,
                fatherPhone,
              });
            }
          } else {
            for (let r = 0; r < rows.length; r++) {
              const row = rows[r];
              if (!Array.isArray(row) || row.length === 0) continue;
              const rawSbd = row[0];
              const rawName = row[1];
              const candidateNumber = parseSBD(rawSbd);
              const fullNameStr = String(rawName || "");

              if (!candidateNumber && !fullNameStr.trim()) continue;
              if (fullNameStr.toUpperCase().includes("HỌ VÀ TÊN")) continue;

              studentsInSheet.push({
                rowIndex: r + 1,
                candidateNumber,
                fullName: fullNameStr,
                schoolName: String(row[2] || "").trim(),
                motherPhone: formatPhoneNumber(row[3]),
                fatherPhone: formatPhoneNumber(row[4]),
              });
            }
          }

          sheets.push({
            sheetName,
            students: studentsInSheet,
          });

          totalStudents += studentsInSheet.length;
        }

        resolve({
          fileName: file.name,
          totalSheets: sheets.length,
          totalStudents,
          sheets,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
