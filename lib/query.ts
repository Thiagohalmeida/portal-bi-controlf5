import { tableMap, TableMapEntry } from "./tableMap";
import { getPagePathByPropertyId } from "./propertyIdToPagePathMap";
import { buildInsightSQL } from "../app/api/query/route"; // Import buildInsightSQL from route.ts

const PROJECT_ID = process.env.BQ_PROJECT_ID || process.env.BQ_PROJECT || "worlddata-439415";

type BuildOpts = {
  origem: keyof typeof tableMap;
  dataInicio: string;          // "YYYY-MM-DD"
  dataFim: string;             // "YYYY-MM-DD"
  cliente: string;             // pode vir "string", mas pode representar INT64 (GA4)
};

// Esta função agora apenas chama a função buildInsightSQL do route.ts
export function buildInsightQuery({ origem, dataInicio, dataFim, cliente }: BuildOpts) {
  const entry = tableMap[origem];
  if (!entry) throw new Error(`Origem inválida: ${origem}`);

  // buildInsightSQL já lida com a construção completa da query, incluindo agregação e CASTs
  const { sql, params } = buildInsightSQL(
    PROJECT_ID,
    entry,
    dataInicio,
    dataFim,
    cliente
  );

  // Retorna a query SQL e os parâmetros
  return { sql, params };
}




