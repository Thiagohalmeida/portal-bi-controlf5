"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CatalogRow = {
  area: string;
  datasetId: string;
  datasetLabel: string;
  tableId: string;
  tableLabel: string;
  tableDescription: string;
  enabled: boolean;
};

export default function CatalogoBQPage() {
  const [projectId, setProjectId] = useState("");
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const [datasetId, setDatasetId] = useState("");
  const [tableId, setTableId] = useState("");

  const [area, setArea] = useState("");
  const [datasetLabel, setDatasetLabel] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const [tableDescription, setTableDescription] = useState("");
  const [enabled, setEnabled] = useState(false);

  const loadCatalog = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/catalog");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao carregar catalogo");

      const nextRows: CatalogRow[] = body.rows || [];
      setRows(nextRows);
      setProjectId(String(body.projectId || ""));

      if (nextRows.length > 0 && !datasetId) {
        setDatasetId(nextRows[0].datasetId);
        setTableId(nextRows[0].tableId);
      }
    } catch (e: any) {
      setErr(e.message || "Erro ao carregar catalogo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const datasets = useMemo(() => {
    const map = new Map<string, { datasetId: string; datasetLabel: string; area: string }>();
    rows.forEach((row) => {
      if (!map.has(row.datasetId)) {
        map.set(row.datasetId, {
          datasetId: row.datasetId,
          datasetLabel: row.datasetLabel,
          area: row.area,
        });
      }
    });
    return [...map.values()].sort((a, b) => a.datasetLabel.localeCompare(b.datasetLabel));
  }, [rows]);

  const tablesOfDataset = useMemo(
    () =>
      rows
        .filter((row) => row.datasetId === datasetId)
        .sort((a, b) => a.tableLabel.localeCompare(b.tableLabel)),
    [rows, datasetId]
  );

  const filteredTablesOfDataset = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return tablesOfDataset;

    return tablesOfDataset.filter((row) => {
      const haystack = `${row.tableId} ${row.tableLabel}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [tablesOfDataset, searchText]);

  useEffect(() => {
    if (!datasetId || filteredTablesOfDataset.length === 0) {
      setTableId("");
      return;
    }
    if (!filteredTablesOfDataset.some((t) => t.tableId === tableId)) {
      setTableId(filteredTablesOfDataset[0].tableId);
    }
  }, [datasetId, tableId, filteredTablesOfDataset]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.datasetId === datasetId && row.tableId === tableId) || null,
    [rows, datasetId, tableId]
  );

  useEffect(() => {
    if (!selectedRow) return;
    setArea(selectedRow.area || "Geral");
    setDatasetLabel(selectedRow.datasetLabel || selectedRow.datasetId);
    setTableLabel(selectedRow.tableLabel || selectedRow.tableId);
    setTableDescription(selectedRow.tableDescription || "");
    setEnabled(Boolean(selectedRow.enabled));
  }, [selectedRow]);

  const handleSave = async () => {
    if (!datasetId || !tableId) return;

    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetId,
          tableId,
          area,
          datasetLabel,
          tableLabel,
          tableDescription,
          enabled,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao salvar");

      setRows((prev) =>
        prev.map((row) => {
          if (row.datasetId === datasetId && row.tableId === tableId) {
            return {
              ...row,
              area,
              datasetLabel,
              tableLabel,
              tableDescription,
              enabled,
            };
          }
          if (row.datasetId === datasetId) {
            return {
              ...row,
              area,
              datasetLabel,
            };
          }
          return row;
        })
      );
    } catch (e: any) {
      setErr(e.message || "Erro ao salvar configuracao");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto py-10 px-4 lg:px-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Catalogo BigQuery</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Projeto conectado: <strong>{projectId || "nao informado"}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadCatalog}
            disabled={loading}
            className="px-3 py-2 rounded border bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            {loading ? "Recarregando..." : "Recarregar do BQ"}
          </button>
          <Link
            href="/consulta-banco"
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
          >
            Voltar para consulta
          </Link>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="border rounded p-4 bg-gray-50 dark:bg-gray-900 space-y-4">
          <h2 className="font-semibold">Selecao</h2>

          <div>
            <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Dataset</label>
            <select
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
            >
              <option value="">Selecione o dataset</option>
              {datasets.map((ds) => (
                <option key={ds.datasetId} value={ds.datasetId}>
                  {ds.datasetLabel} ({ds.datasetId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">
              Buscar tabela no dataset
            </label>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Ex.: engajamento"
              className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Tabela</label>
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              disabled={!datasetId}
              className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
            >
              <option value="">Selecione a tabela</option>
              {filteredTablesOfDataset.map((tb) => (
                <option key={tb.tableId} value={tb.tableId}>
                  {tb.tableLabel} ({tb.tableId})
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-300">
            {filteredTablesOfDataset.length} de {tablesOfDataset.length} tabela(s) exibida(s)
            neste dataset.
          </div>
        </section>

        <section className="border rounded p-4 bg-gray-50 dark:bg-gray-900 space-y-4">
          <h2 className="font-semibold">Configuracao da Tabela</h2>

          {!selectedRow && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Selecione um dataset e uma tabela para editar.
            </p>
          )}

          {selectedRow && (
            <>
              <div>
                <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Area</label>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">
                  Nome amigavel do dataset
                </label>
                <input
                  value={datasetLabel}
                  onChange={(e) => setDatasetLabel(e.target.value)}
                  className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">
                  Nome amigavel da tabela
                </label>
                <input
                  value={tableLabel}
                  onChange={(e) => setTableLabel(e.target.value)}
                  className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">
                  Descricao da tabela
                </label>
                <textarea
                  value={tableDescription}
                  onChange={(e) => setTableDescription(e.target.value)}
                  className="w-full border p-2 rounded bg-white text-black dark:bg-gray-800 dark:text-white min-h-[84px]"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                Exibir esta tabela na consulta do front
              </label>

              <div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar configuracao"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
