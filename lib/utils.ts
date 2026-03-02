import * as XLSX from "xlsx";

/**
 * Gera SQL básico de SELECT * para a tabela escolhida.
 */
export function gerarQuerySQL(
  dataset: string,
  tabela: string
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
    cols.join(","), 
    ...data.map(row => cols.map(c => JSON.stringify(row[c] ?? "")).join(","))
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
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
 * Copia texto para a prancheta.
 */
export async function copiarParaPrancheta(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

/**
 * Baixa conteudo textual para arquivo local.
 */
export function downloadTextFile(
  content: string,
  filename: string,
  mimeType = "application/json;charset=utf-8"
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Função utilitária para concatenar classes condicionalmente
export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}
