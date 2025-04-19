// lib/utils.ts
import { DatasetMetadado } from "@/data/metadados";
import * as XLSX from "xlsx";

/**
 * Gera SQL básico de SELECT * para a tabela escolhida.
 */
export function gerarQuerySQL(
  area: string,
  dataset: string,
  tabela: string,
  metadados: DatasetMetadado[]
): string {
  return `
    SELECT *
    FROM \`worlddata-439415.${dataset}.${tabela}\`
    LIMIT 100
  `.trim();
}

/**
 * Exporta um array de objetos para CSV e dispara download.
 */
export function exportCSV(data: any[], filename = "export.csv") {
  if (!data.length) return;
  const cols = Object.keys(data[0]);
  const csvRows = [
    cols.join(","), // cabeçalho
    ...data.map((row) => cols.map((c) => JSON.stringify(row[c] ?? "")).join(",")),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta um array de objetos para XLSX e dispara download.
 */
export function exportXLSX(data: any[], filename = "export.xlsx") {
  if (!data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

/**
 * Copia texto para a prancheta (clipboard).
 */
export function copiarParaPrancheta(text: string) {
  navigator.clipboard.writeText(text);
}
