// lib/makeInsightPrompt.ts
import { tableMap, buildFacts, fmt, calcPacing } from "@/lib/tableMap";

type Args = {
  originKey: keyof typeof tableMap;
  rows: any[];
  dataInicio: string;
  dataFim: string;
  cliente?: string;
};

export function makeInsightPrompt({ originKey, rows, dataInicio, dataFim, cliente }: Args): string {
  const entry = tableMap[originKey];

  // 1) facts formatados a partir das métricas do origin
  const facts = buildFacts(rows, entry.metrics)
    .map(f => ({ label: f.label, value: f.formatted }));

  // 2) bloco extra de pacing (quando aplicável)
  let pacingBlock = "";
  if (originKey === "PacingOrcamento") {
    // tente obter valores brutos mínimos das linhas (se não tiver, use 0)
    const sum = (key: string) => rows.reduce((a, r) => a + (Number(r?.[key]) || 0), 0);
    const first = rows[0] || {};
    const orcamento = Number(first?.Orcamento_Total) || sum("Orcamento_Total") || 0;
    const gasto = Number(first?.Gasto_Acumulado) || sum("Gasto_Acumulado") || 0;

    const p = calcPacing({
      Orcamento_Total: orcamento,
      Gasto_Acumulado: gasto,
      Data_Inicio: dataInicio,
      Data_Fim: dataFim,
    });

    const pacing = {
      dias_totais: p.dias_totais,
      dias_passados: p.dias_passados,
      dias_restantes: p.dias_restantes,
      burn_atual_dia: fmt.brl2(p.burn_atual_dia),
      burn_ideal_dia: fmt.brl2(p.burn_ideal_dia),
      dif_burn_dia: fmt.brl2(p.dif_burn_dia),
      orcamento_restante: fmt.brl2(p.orcamento_restante),
      "%_consumido": fmt.percent1(p.perc_consumido),
    };

    pacingBlock = `\nPACING_JSON:\n${JSON.stringify({ pacing }, null, 2)}\n`;
  }

  // 3) payload de dados (sempre no mesmo formato)
  const payload = { facts };

  // 4) prompt final = prompt base + JSONs
  return (
    entry.prompt +
    `\n\n---\nPERÍODO: ${dataInicio}–${dataFim}${cliente ? ` | CLIENTE: ${cliente}` : ""}\n` +
    `FACTS_JSON:\n${JSON.stringify(payload, null, 2)}\n` +
    pacingBlock
  );
}
