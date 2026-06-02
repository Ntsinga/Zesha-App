import * as XLSX from "xlsx";

export type TransactionExportCell = string | number;

export interface TransactionExportColumn {
  key: string;
  label: string;
}

export type TransactionExportRecord = Record<string, TransactionExportCell>;

function triggerDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("File download is only available in the web app.");
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function escapeCsvCell(value: TransactionExportCell): string {
  const stringValue = String(value);
  if (
    stringValue.includes(",") ||
    stringValue.includes("\n") ||
    stringValue.includes('"')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function downloadTransactionsCsv(
  filename: string,
  columns: TransactionExportColumn[],
  rows: TransactionExportRecord[],
): void {
  const headerLine = columns
    .map((column) => escapeCsvCell(column.label))
    .join(",");
  const dataLines = rows.map((row) =>
    columns.map((column) => escapeCsvCell(row[column.key] ?? "")).join(","),
  );
  const csv = [headerLine, ...dataLines].join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

export function downloadTransactionsXlsx(
  filename: string,
  columns: TransactionExportColumn[],
  rows: TransactionExportRecord[],
): void {
  const worksheet = XLSX.utils.json_to_sheet(
    rows.map((row) => {
      const orderedRow: Record<string, TransactionExportCell> = {};
      for (const column of columns) {
        orderedRow[column.label] = row[column.key] ?? "";
      }
      return orderedRow;
    }),
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const blob = new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, filename);
}
