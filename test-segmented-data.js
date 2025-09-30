// Teste específico para cliente IGB-Externa
console.log("=== TESTE CLIENTE IGB-EXTERNA ===\n");

// Simulação de funções necessárias
function fmt(value, format) {
  if (format === "brl2") return `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
  if (format === "float1") return value.toFixed(1);
  if (format === "float0") return Math.round(value).toString();
  if (format === "percent1") return `${(value * 100).toFixed(1)}%`;
  return value.toString();
}

function aggregateMetric(rows, field, aggType) {
  if (aggType === "sum") return rows.reduce((sum, row) => sum + (row[field] || 0), 0);
  if (aggType === "avg") return rows.reduce((sum, row) => sum + (row[field] || 0), 0) / rows.length;
  return 0;
}

function buildSegmentedAnalysis(rows, field, label) {
  const segments = {};
  rows.forEach(row => {
    const segmentValue = row[field];
    if (segmentValue && segmentValue !== 'N/A') {
      if (!segments[segmentValue]) segments[segmentValue] = 0;
      segments[segmentValue] += (row.sessions || 0);
    }
  });
  
  return Object.entries(segments)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([segment, value], index) => `${label} #${index + 1}: ${segment}: ${value.toLocaleString('pt-BR')}`);
}

// Métricas GA4 simplificadas
const GA4Metrics = [
  { field: "sessions", label: "Sessões", agg: { type: "sum" }, format: "float0" },
  { field: "active_users", label: "Usuários ativos", agg: { type: "sum" }, format: "float0" },
  { field: "screen_page_views", label: "Pageviews", agg: { type: "sum" }, format: "float0" },
  { field: "user_engagement_duration", label: "Tempo engajado total (s)", agg: { type: "sum" }, format: "float0" },
  { field: "engagement_rate", label: "Engagement rate", agg: { type: "avg" }, format: "percent1", optional: true },
  { field: "bounce_rate", label: "Bounce rate", agg: { type: "avg" }, format: "percent1", optional: true },
  { field: "conversions", label: "Conversões", agg: { type: "sum" }, format: "float0" },
  { field: "total_revenue", label: "Receita", agg: { type: "sum" }, format: "brl2" },
  { field: "devicecategory", label: "Dispositivo", agg: { type: "none" }, format: "string" },
  { field: "city", label: "Cidade", agg: { type: "none" }, format: "string" },
];

// Dados mockados para IGB-Externa com página /br/
const mockData = [
  {
    sessions: 2800,
    active_users: 2100,
    screen_page_views: 8400,
    user_engagement_duration: 168000,
    engagement_rate: 0.68,
    bounce_rate: 0.32,
    conversions: 84,
    total_revenue: 4200,
    devicecategory: "mobile",
    city: "São Paulo",
    page_path: "/br/"
  },
  {
    sessions: 1900,
    active_users: 1600,
    screen_page_views: 5700,
    user_engagement_duration: 114000,
    engagement_rate: 0.72,
    bounce_rate: 0.28,
    conversions: 76,
    total_revenue: 3800,
    devicecategory: "desktop",
    city: "Rio de Janeiro",
    page_path: "/br/"
  },
  {
    sessions: 450,
    active_users: 380,
    screen_page_views: 1350,
    user_engagement_duration: 27000,
    engagement_rate: 0.65,
    bounce_rate: 0.35,
    conversions: 18,
    total_revenue: 900,
    devicecategory: "tablet",
    city: "Brasília",
    page_path: "/br/"
  },
  {
    sessions: 1200,
    active_users: 950,
    screen_page_views: 3600,
    user_engagement_duration: 72000,
    engagement_rate: 0.70,
    bounce_rate: 0.30,
    conversions: 48,
    total_revenue: 2400,
    devicecategory: "mobile",
    city: "Belo Horizonte",
    page_path: "/br/"
  }
];

function buildFacts(rows, metrics) {
  const facts = [];
  
  metrics.forEach(metric => {
    if (metric.agg.type === "none") {
      // Campo categórico - análise segmentada
      const segments = buildSegmentedAnalysis(rows, metric.field, metric.label);
      if (segments.length > 0) {
        facts.push({ label: metric.label, formatted: "N/A" });
        segments.forEach(segment => {
          facts.push({ label: segment.split(':')[0], formatted: segment.split(':')[1].trim() });
        });
      } else {
        facts.push({ label: metric.label, formatted: "N/A" });
      }
    } else {
      // Métrica numérica
      const value = aggregateMetric(rows, metric.field, metric.agg.type);
      const formatted = fmt(value, metric.format);
      facts.push({ label: metric.label, formatted });
    }
  });
  
  // Métricas calculadas
  const totalSessions = aggregateMetric(rows, "sessions", "sum");
  const totalPageviews = aggregateMetric(rows, "screen_page_views", "sum");
  const totalConversions = aggregateMetric(rows, "conversions", "sum");
  const totalEngagementTime = aggregateMetric(rows, "user_engagement_duration", "sum");
  
  if (totalSessions > 0) {
    facts.push({ 
      label: "Conv./Sessão", 
      formatted: fmt(totalConversions / totalSessions, "float2") 
    });
    facts.push({ 
      label: "PV/Sessão", 
      formatted: fmt(totalPageviews / totalSessions, "float1") 
    });
    facts.push({ 
      label: "Tempo médio engajado (s)", 
      formatted: fmt(totalEngagementTime / totalSessions, "float0") + "s" 
    });
  }
  
  return facts;
}

// Executar teste
console.log("Cliente: IGB-Externa");
console.log("Página: /br/");
console.log("Período: 2024-01-01 a 2024-01-31\n");

const facts = buildFacts(mockData, GA4Metrics);

console.log("✅ Facts gerados com sucesso!\n");

console.log("=== FACTS PRINCIPAIS ===");
facts.slice(0, 13).forEach(fact => {
  console.log(`${fact.label}: ${fact.formatted}`);
});

console.log("\n=== VERIFICAÇÃO ===");
const segmentedFacts = facts.filter(f => 
  f.label.includes("Dispositivo #") || 
  f.label.includes("Cidade #")
);
console.log(`Contém dados segmentados: ${segmentedFacts.length > 0 ? '✅ SIM' : '❌ NÃO'}`);
console.log(`Total de facts segmentados: ${segmentedFacts.length}`);

if (segmentedFacts.length > 0) {
  console.log("\n=== DADOS SEGMENTADOS ENCONTRADOS ===");
  segmentedFacts.forEach(fact => {
    console.log(`${fact.label}: ${fact.formatted}`);
  });
}

console.log("\n=== ANÁLISE POR DISPOSITIVO ===");
const deviceAnalysis = {};
mockData.forEach(row => {
  if (!deviceAnalysis[row.devicecategory]) {
    deviceAnalysis[row.devicecategory] = { sessions: 0, revenue: 0 };
  }
  deviceAnalysis[row.devicecategory].sessions += row.sessions;
  deviceAnalysis[row.devicecategory].revenue += row.total_revenue;
});

Object.entries(deviceAnalysis).forEach(([device, data]) => {
  console.log(`${device}: ${data.sessions.toLocaleString('pt-BR')} sessões, R$ ${data.revenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})} receita`);
});

console.log("\n=== ANÁLISE POR CIDADE ===");
const cityAnalysis = {};
mockData.forEach(row => {
  if (!cityAnalysis[row.city]) {
    cityAnalysis[row.city] = { sessions: 0, revenue: 0 };
  }
  cityAnalysis[row.city].sessions += row.sessions;
  cityAnalysis[row.city].revenue += row.total_revenue;
});

Object.entries(cityAnalysis)
  .sort(([,a], [,b]) => b.sessions - a.sessions)
  .slice(0, 4)
  .forEach(([city, data]) => {
    console.log(`${city}: ${data.sessions.toLocaleString('pt-BR')} sessões, R$ ${data.revenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})} receita`);
  });

console.log("\n=== RESUMO GERAL ===");
const totalSessions = mockData.reduce((sum, row) => sum + row.sessions, 0);
const totalRevenue = mockData.reduce((sum, row) => sum + row.total_revenue, 0);
const totalConversions = mockData.reduce((sum, row) => sum + row.conversions, 0);
const avgEngagementRate = mockData.reduce((sum, row) => sum + row.engagement_rate, 0) / mockData.length;

console.log(`Total de Sessões: ${totalSessions.toLocaleString('pt-BR')}`);
console.log(`Receita Total: R$ ${totalRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
console.log(`Total de Conversões: ${totalConversions}`);
console.log(`Taxa de Engajamento Média: ${(avgEngagementRate * 100).toFixed(1)}%`);
console.log(`Taxa de Conversão: ${((totalConversions / totalSessions) * 100).toFixed(2)}%`);