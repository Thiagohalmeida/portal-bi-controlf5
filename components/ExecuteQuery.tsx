"use client";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { exportCSV, exportXLSX, copiarParaPrancheta } from "@/lib/utils";

type TableField = {
  nome: string;
  tipo: string;
  descricao: string | null;
};

type CatalogRow = {
  area: string;
  datasetId: string;
  datasetLabel: string;
  tableId: string;
  tableLabel: string;
  tableDescription: string;
  enabled: boolean;
};

function toISODate(offsetDays: number): string {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

function flattenRow(row: any) {
  const flat: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v && typeof v === "object" && (v as any).value !== undefined) {
      flat[k] = (v as any).value;
    } else {
      flat[k] = v;
    }
  }
  return flat;
}

export function ExecuteQuery() {
  const [catalogRows, setCatalogRows] = useState<CatalogRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogErr, setCatalogErr] = useState<string | null>(null);

  const [area, setArea] = useState("");
  const [dataset, setDataset] = useState("");
  const [tabela, setTabela] = useState("");

  const [dateFields, setDateFields] = useState<string[]>([]);
  const [dateField, setDateField] = useState("");
  const [dataInicio, setDataInicio] = useState<string>(toISODate(-30));
  const [dataFim, setDataFim] = useState<string>(toISODate(0));
  const [limite, setLimite] = useState<number>(10);
  const [maxVisibleCols, setMaxVisibleCols] = useState<number>(12);

  const [rows, setRows] = useState<any[]>([]);
  const [fields, setFields] = useState<TableField[]>([]);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [tableDescription, setTableDescription] = useState("");
  const [hasExecuted, setHasExecuted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      setCatalogLoading(true);
      setCatalogErr(null);

      try {
        const res = await fetch("/api/catalog?mode=public");
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Falha ao carregar catalogo");
        if (cancelled) return;

        const nextRows: CatalogRow[] = body.rows || [];
        setCatalogRows(nextRows);
      } catch (e: any) {
        if (!cancelled) {
          setCatalogErr(e.message || "Erro ao carregar catalogo");
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    };

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const areas = useMemo(() => {
    const unique = [...new Set(catalogRows.map((r) => r.area).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [catalogRows]);

  const datasetsDaArea = useMemo(() => {
    const map = new Map<string, { datasetId: string; datasetLabel: string }>();

    catalogRows
      .filter((row) => row.area === area)
      .forEach((row) => {
        if (!map.has(row.datasetId)) {
          map.set(row.datasetId, {
            datasetId: row.datasetId,
            datasetLabel: row.datasetLabel,
          });
        }
      });

    return [...map.values()].sort((a, b) => a.datasetLabel.localeCompare(b.datasetLabel));
  }, [catalogRows, area]);

  const tabelasDoDataset = useMemo(() => {
    return catalogRows
      .filter((row) => row.area === area && row.datasetId === dataset)
      .sort((a, b) => a.tableLabel.localeCompare(b.tableLabel));
  }, [catalogRows, area, dataset]);

  const tabelaSelecionadaInfo = useMemo(
    () => tabelasDoDataset.find((t) => t.tableId === tabela) || null,
    [tabelasDoDataset, tabela]
  );

  useEffect(() => {
    setTableDescription(tabelaSelecionadaInfo?.tableDescription || "");
  }, [tabelaSelecionadaInfo]);

  useEffect(() => {
    if (!dataset || !tabela) {
      setFields([]);
      setDateFields([]);
      setDateField("");
      setLatestDate(null);
      return;
    }

    let cancelled = false;

    const loadMetadata = async () => {
      setMetaLoading(true);
      setErr(null);

      try {
        const res = await fetch("/api/bq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "metadata", dataset, tabela }),
        });

        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Falha ao buscar metadados");
        if (cancelled) return;

        setFields(body.fields || []);
        setDateFields(body.dateFields || []);
        setDateField(body.defaultDateField || "");
        setLatestDate(body.latestDate ? String(body.latestDate) : null);
        setTableDescription((current) => {
          if (current.trim()) return current;
          return String(body.tableDescription || "");
        });
      } catch (e: any) {
        if (!cancelled) {
          setErr(e.message || "Erro ao buscar metadados da tabela");
        }
      } finally {
        if (!cancelled) {
          setMetaLoading(false);
        }
      }
    };

    loadMetadata();

    return () => {
      cancelled = true;
    };
  }, [dataset, tabela]);

  const handleExecute = async () => {
    if (!dataset || !tabela) return;

    setErr(null);
    setLoading(true);
    setRows([]);
    setHasExecuted(true);

    try {
      const res = await fetch("/api/bq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tableData",
          dataset,
          tabela,
          dateField,
          dataInicio,
          dataFim,
          limite,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao executar");

      setRows(body.data || body.rows || []);
      setFields(body.fields || []);
      setDateFields(body.dateFields || []);
      setDateField(body.dateField || "");
      setLatestDate(body.latestDate ? String(body.latestDate) : null);
      setTableDescription((current) => {
        if (current.trim()) return current;
        return String(body.tableDescription || "");
      });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const rowsFlat = rows.map(flattenRow);
  const allColumns = rowsFlat.length > 0 ? Object.keys(rowsFlat[0]) : [];
  const visibleColumns =
    maxVisibleCols === 0 ? allColumns : allColumns.slice(0, maxVisibleCols);
  const hiddenColumnsCount = Math.max(0, allColumns.length - visibleColumns.length);
  const hasDateField = dateFields.length > 0;
  const missingDescriptionCount = useMemo(
    () => fields.filter((f) => !f.descricao).length,
    [fields]
  );

  return (
    <div className="w-full p-4 space-y-6">
      {catalogErr && <p className="text-red-600 text-sm">{catalogErr}</p>}

      {!catalogLoading && catalogRows.length === 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Nenhuma tabela habilitada para consulta. Acesse o catalogo em{" "}
          <Link className="underline" href="/consulta-banco/catalogo">
            /consulta-banco/catalogo
          </Link>
          .
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Area</label>
          <select
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setDataset("");
              setTabela("");
              setRows([]);
              setFields([]);
              setDateFields([]);
              setDateField("");
              setDataInicio(toISODate(-30));
              setDataFim(toISODate(0));
              setLatestDate(null);
              setTableDescription("");
              setHasExecuted(false);
              setErr(null);
            }}
            disabled={catalogLoading || catalogRows.length === 0}
            className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">Selecione a area</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Dataset</label>
          <select
            value={dataset}
            onChange={(e) => {
              setDataset(e.target.value);
              setTabela("");
              setRows([]);
              setFields([]);
              setDateFields([]);
              setDateField("");
              setLatestDate(null);
              setTableDescription("");
              setHasExecuted(false);
              setErr(null);
            }}
            disabled={!area}
            className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">Selecione o dataset</option>
            {datasetsDaArea.map((d) => (
              <option key={d.datasetId} value={d.datasetId}>
                {d.datasetLabel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Tabela</label>
          <select
            value={tabela}
            onChange={(e) => {
              setTabela(e.target.value);
              setRows([]);
              setLatestDate(null);
              setHasExecuted(false);
              setErr(null);
            }}
            disabled={!dataset}
            className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">Selecione a tabela</option>
            {tabelasDoDataset.map((t) => (
              <option key={t.tableId} value={t.tableId}>
                {t.tableLabel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Linhas</label>
          <select
            value={limite}
            onChange={(e) => setLimite(Number(e.target.value))}
            className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            {[10, 20, 30, 40, 50].map((n) => (
              <option key={n} value={n}>
                {n} linhas
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Data inicio</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Data fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Campo de data</label>
          <select
            value={dateField}
            onChange={(e) => setDateField(e.target.value)}
            disabled={!hasDateField || metaLoading}
            className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            {!hasDateField && <option value="">Sem campo de data detectado</option>}
            {hasDateField &&
              dateFields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Acao</label>
          <button
            onClick={handleExecute}
            disabled={!tabela || loading || metaLoading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Consultando..." : "Consultar"}
          </button>
        </div>
      </div>

      {err && <p className="text-red-600 text-sm">{err}</p>}

      {dataset && tabela && (
        <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-900">
            Ultima atualizacao
            {dateField ? ` (MAX ${dateField})` : ""}: {" "}
            <strong>{latestDate ?? (metaLoading ? "carregando..." : "nao disponivel")}</strong>
          </p>
          <p className="text-sm text-blue-900 mt-1">
            Descricao da tabela: <strong>{tableDescription || "nao informada"}</strong>
          </p>
        </div>
      )}

      {(fields.length > 0 || hasExecuted) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {fields.length > 0 && (
            <section className="border rounded p-4 bg-gray-50 dark:bg-gray-900">
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                Dicionario da tabela selecionada
              </h3>

              {missingDescriptionCount > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                  {missingDescriptionCount} campo(s) sem descricao cadastrada.
                </p>
              )}

              <div className="overflow-auto max-h-[520px] bg-white dark:bg-gray-800 border rounded">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-200 dark:bg-gray-700">
                    <tr>
                      <th className="border p-2 text-left">Campo</th>
                      <th className="border p-2 text-left">Tipo</th>
                      <th className="border p-2 text-left">Descricao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr key={f.nome}>
                        <td className="border p-2 font-mono">{f.nome}</td>
                        <td className="border p-2">{f.tipo}</td>
                        <td className="border p-2">
                          {f.descricao && f.descricao.trim() ? f.descricao : "Sem descricao"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="border rounded p-4 bg-gray-50 dark:bg-gray-900">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Valores da tabela</h3>

            {rowsFlat.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    onClick={() => exportCSV(rowsFlat)}
                    className="px-3 py-1 bg-green-500 text-white rounded"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => exportXLSX(rowsFlat)}
                    className="px-3 py-1 bg-green-700 text-white rounded"
                  >
                    XLSX
                  </button>
                  <button
                    onClick={() => copiarParaPrancheta(JSON.stringify(rowsFlat, null, 2))}
                    className="px-3 py-1 bg-gray-600 text-white rounded"
                  >
                    Copiar JSON
                  </button>
                  <select
                    value={maxVisibleCols}
                    onChange={(e) => setMaxVisibleCols(Number(e.target.value))}
                    className="border p-1 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
                  >
                    <option value={8}>8 colunas</option>
                    <option value={12}>12 colunas</option>
                    <option value={16}>16 colunas</option>
                    <option value={20}>20 colunas</option>
                    <option value={0}>Todas as colunas</option>
                  </select>
                </div>

                {hiddenColumnsCount > 0 && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                    Exibindo {visibleColumns.length} de {allColumns.length} colunas
                    ({hiddenColumnsCount} ocultas para melhorar visualizacao).
                  </p>
                )}

                <div className="overflow-auto max-h-[520px] bg-white dark:bg-gray-800 border rounded">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-200 dark:bg-gray-700">
                      <tr>
                        {visibleColumns.map((c) => (
                          <th key={c} className="border p-2 whitespace-nowrap text-left">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rowsFlat.map((r, i) => (
                        <tr key={i}>
                          {visibleColumns.map((col) => (
                            <td
                              key={`${i}-${col}`}
                              className="border p-1 whitespace-nowrap max-w-[320px] truncate"
                              title={r[col] == null ? "-" : String(r[col])}
                            >
                              {r[col] == null ? "-" : String(r[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {hasExecuted && !loading && !err && rowsFlat.length === 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Nenhum dado encontrado entre <strong>{dataInicio}</strong> e <strong>{dataFim}</strong>.
                Ultima data disponivel: <strong>{latestDate ?? "nao disponivel"}</strong>.
              </div>
            )}

            {!hasExecuted && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Clique em <strong>Consultar</strong> para carregar os valores da tabela.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
