// app/insights/page.tsx
"use client";

import { useState, useEffect } from "react";
import { tableMap } from "@/lib/tableMap";
import dynamic from "next/dynamic";

// Importação dinâmica para evitar problemas de SSR com html-to-image
const InfographicReport = dynamic(
  () => import("@/components/InfographicReport"),
  { ssr: false }
);

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalRecords: number;
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
}

interface Client {
  name: string;
  totalCampaigns: number;
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  primeiraData: string;
  ultimaData: string;
}

export default function InsightsPage() {
  const [table, setTable] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [pagepath, setPagepath] = useState<string>("");
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  
  // Estados para clientes
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  
  // Estados para campanhas
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [showCampaignSelection, setShowCampaignSelection] = useState(false);

  // Função para buscar clientes
  const fetchClients = async (search: string = "") => {
    if (table !== "CampanhaGoogleAds") {
      setClients([]);
      return;
    }

    setLoadingClients(true);
    try {
      const params = new URLSearchParams({
        ...(dataInicio && { dataInicio }),
        ...(dataFim && { dataFim }),
        ...(search && { search }),
      });

      const res = await fetch(`/api/clients?${params}`);
      const data = await res.json();

      if (res.ok) {
        setClients(data.clients || []);
      } else {
        console.error("Erro ao buscar clientes:", data.error);
        setClients([]);
      }
    } catch (err) {
      console.error("Erro ao buscar clientes:", err);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  // Função para selecionar/deselecionar cliente
  const handleClientSelect = (clientName: string) => {
    setSelectedClients(prev => 
      prev.includes(clientName)
        ? prev.filter(name => name !== clientName)
        : [...prev, clientName]
    );
    // Limpar campanhas selecionadas quando trocar de cliente
    setSelectedCampaigns([]);
  };

  // Função para selecionar todos os clientes
  const handleSelectAllClients = () => {
    const filteredClients = clients.filter(client => 
      client.name.toLowerCase().includes(clientSearch.toLowerCase())
    );
    
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map(c => c.name));
    }
    setSelectedCampaigns([]);
  };

  // Função para limpar seleção de clientes
  const handleClearClientSelection = () => {
    setSelectedClients([]);
    setSelectedCampaigns([]);
  };

  // Função para buscar campanhas quando cliente e datas mudarem
  const fetchCampaigns = async () => {
    if (selectedClients.length === 0 || table !== "CampanhaGoogleAds") {
      setCampaigns([]);
      setSelectedCampaigns([]);
      setShowCampaignSelection(false);
      return;
    }

    setLoadingCampaigns(true);
    try {
      // Buscar campanhas para todos os clientes selecionados
      const allCampaigns: Campaign[] = [];
      
      for (const cliente of selectedClients) {
        const params = new URLSearchParams({
          cliente: cliente.trim(),
          ...(dataInicio && { dataInicio }),
          ...(dataFim && { dataFim }),
        });

        const res = await fetch(`/api/campaigns-list?${params}`);
        const data = await res.json();

        if (res.ok) {
          allCampaigns.push(...(data.campaigns || []));
        } else {
          console.error(`Erro ao buscar campanhas para ${cliente}:`, data.error);
        }
      }
      
      // Remover campanhas duplicadas baseado no ID
      const uniqueCampaigns = allCampaigns.filter((campaign, index, self) => 
        index === self.findIndex(c => c.id === campaign.id)
      );
      
      setCampaigns(uniqueCampaigns);
      setShowCampaignSelection(uniqueCampaigns.length > 0);
    } catch (err) {
      console.error("Erro ao buscar campanhas:", err);
      setCampaigns([]);
      setShowCampaignSelection(false);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // Effect para buscar clientes quando a origem mudar para Google Ads
  useEffect(() => {
    if (table === "CampanhaGoogleAds") {
      fetchClients();
    } else {
      setClients([]);
      setShowClientDropdown(false);
    }
  }, [table, dataInicio, dataFim]);

  // Effect para buscar clientes com base na pesquisa
  useEffect(() => {
    if (table === "CampanhaGoogleAds" && showClientDropdown) {
      const timeoutId = setTimeout(() => {
        fetchClients(clientSearch);
      }, 300); // Debounce de 300ms

      return () => clearTimeout(timeoutId);
    }
  }, [clientSearch, showClientDropdown, table, dataInicio, dataFim]);

  // Effect para buscar campanhas quando os parâmetros mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCampaigns();
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [selectedClients, dataInicio, dataFim, table]);

  // Effect para fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.relative')) {
        setShowClientDropdown(false);
      }
    };

    if (showClientDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showClientDropdown]);

  // Função para gerenciar seleção de campanhas
  const handleCampaignSelection = (campaignId: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  // Função para selecionar/deselecionar todas as campanhas
  const handleSelectAllCampaigns = () => {
    if (selectedCampaigns.length === campaigns.length) {
      setSelectedCampaigns([]);
    } else {
      setSelectedCampaigns(campaigns.map(c => c.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInsight(null);
    setError(null);

    if (!table || !dataInicio || !dataFim || selectedClients.length === 0) {
      setError("Parâmetros obrigatórios: tabela, data início, data fim e pelo menos um cliente.");
      return;
    }

    setLoading(true);
    try {
      const requestBody: any = { table, dataInicio, dataFim, cliente: selectedClients.join(', '), pagepath };
      
      // Incluir campanhas selecionadas se for Google Ads e houver seleção
      if (table === "CampanhaGoogleAds" && selectedCampaigns.length > 0) {
        requestBody.selectedCampaigns = selectedCampaigns;
      }

      const res = await fetch("/api/insight-auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Erro ao gerar insight.");
      } else {
        setInsight(body.insight);
      }
    } catch (err: any) {
      setError(err.message || "Erro de comunicação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-semibold mb-6">Insight Inteligente</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
        {/* Origem (antes "Tabela") */}
        <div>
          <label htmlFor="table" className="block mb-1 font-medium text-gray-900 dark:text-gray-100">
            Origem <span className="text-red-500">*</span>
          </label>
          <select
            id="table"
            className="w-full border rounded px-3 py-2 bg-white text-black dark:bg-gray-800 dark:text-white"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {Object.entries(tableMap).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Data Início */}
        <div>
          <label htmlFor="dataInicio" className="block mb-1 font-medium text-gray-900 dark:text-gray-100">
            Data Início <span className="text-red-500">*</span>
          </label>
          <input
            id="dataInicio"
            type="date"
            className="w-full border rounded px-3 py-2 bg-white text-black dark:bg-gray-800 dark:text-white"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            required
          />
        </div>

        {/* Data Fim */}
        <div>
          <label htmlFor="dataFim" className="block mb-1 font-medium text-gray-900 dark:text-gray-100">
            Data Fim <span className="text-red-500">*</span>
          </label>
          <input
            id="dataFim"
            type="date"
            className="w-full border rounded px-3 py-2 bg-white text-black dark:bg-gray-800 dark:text-white"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            required
          />
        </div>

        {/* Cliente */}
        <div className="relative">
          <label htmlFor="cliente" className="block mb-1 font-medium text-gray-900 dark:text-gray-100">
            Cliente <span className="text-red-500">*</span>
          </label>
          
          {table === "CampanhaGoogleAds" ? (
            <div className="relative">
              {/* Mostrar clientes selecionados */}
              {selectedClients.length > 0 && (
                <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {selectedClients.length} cliente(s) selecionado(s)
                    </span>
                    <button
                      type="button"
                      onClick={handleClearClientSelection}
                      className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Limpar seleção
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedClients.map((client) => (
                      <span
                        key={client}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                      >
                        {client}
                        <button
                          type="button"
                          onClick={() => handleClientSelect(client)}
                          className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <input
                id="cliente"
                type="text"
                placeholder="Digite para buscar clientes..."
                className="w-full border rounded px-3 py-2 bg-white text-black dark:bg-gray-800 dark:text-white pr-8"
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowClientDropdown(!showClientDropdown)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown de clientes */}
              {showClientDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-80 overflow-y-auto">
                  {loadingClients ? (
                    <div className="px-3 py-2 text-gray-500 text-center">
                      Carregando clientes...
                    </div>
                  ) : clients.length > 0 ? (
                    <>
                      {/* Botões de ação */}
                      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 p-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAllClients}
                            className="flex-1 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          >
                            {selectedClients.length === clients.filter(client => 
                              client.name.toLowerCase().includes(clientSearch.toLowerCase())
                            ).length ? 'Desselecionar Todos' : 'Selecionar Todos'}
                          </button>
                          <button
                            type="button"
                            onClick={handleClearClientSelection}
                            className="flex-1 px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                          >
                            Limpar Seleção
                          </button>
                        </div>
                      </div>
                      
                      {/* Lista de clientes com checkboxes */}
                      {clients
                        .filter(client => 
                          client.name.toLowerCase().includes(clientSearch.toLowerCase())
                        )
                        .map((client) => (
                          <div
                            key={client.name}
                            className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                            onClick={() => handleClientSelect(client.name)}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selectedClients.includes(client.name)}
                                onChange={() => handleClientSelect(client.name)}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {client.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {client.totalCampaigns} campanhas • {client.totalImpressions.toLocaleString()} impressões • R$ {client.totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </>
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-center">
                      Nenhum cliente encontrado
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <input
              id="cliente"
              type="text"
              placeholder="Digite o nome do cliente..."
              className="w-full border rounded px-3 py-2 bg-white text-black dark:bg-gray-800 dark:text-white"
              value={selectedClients.join(', ')}
              onChange={(e) => setSelectedClients([e.target.value])}
              required
            />
          )}
        </div>

        {/* Pagepath */}
        <div>
          <label htmlFor="pagepath" className="block mb-1 font-medium text-gray-900 dark:text-gray-100">
            Página (opcional)
          </label>
          <input
            id="pagepath"
            type="text"
            placeholder="Deixe em branco para analisar todas as páginas"
            className="w-full border rounded px-3 py-2 bg-white text-black dark:bg-gray-800 dark:text-white"
            value={pagepath}
            onChange={(e) => setPagepath(e.target.value)}
          />
        </div>

        {/* Seleção de Campanhas (apenas para Google Ads) */}
        {showCampaignSelection && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block font-medium text-gray-900 dark:text-gray-100">
                Campanhas Disponíveis ({campaigns.length})
              </label>
              {loadingCampaigns && (
                <span className="text-sm text-gray-500">Carregando campanhas...</span>
              )}
            </div>
            
            {campaigns.length > 0 && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={handleSelectAllCampaigns}
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      {selectedCampaigns.length === campaigns.length ? "Deselecionar todas" : "Selecionar todas"}
                    </button>
                    <span className="text-sm text-gray-500">
                      ({selectedCampaigns.length} de {campaigns.length} selecionadas)
                    </span>
                  </div>
                  
                  {/* Filtros rápidos */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const activeCampaigns = campaigns.filter(c => c.status === "ENABLED").map(c => c.id);
                        setSelectedCampaigns(activeCampaigns);
                      }}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-800 dark:text-green-200"
                    >
                      Apenas Ativas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const topCampaigns = campaigns
                          .sort((a, b) => b.totalSpend - a.totalSpend)
                          .slice(0, 5)
                          .map(c => c.id);
                        setSelectedCampaigns(topCampaigns);
                      }}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200"
                    >
                      Top 5 Gasto
                    </button>
                  </div>
                </div>
                
                <div className="max-h-60 overflow-y-auto border rounded p-3 bg-gray-50 dark:bg-gray-800">
                  {campaigns
                    .sort((a, b) => b.totalSpend - a.totalSpend) // Ordenar por gasto decrescente
                    .map((campaign) => (
                    <div key={campaign.id} className="flex items-start space-x-3 mb-3 last:mb-0 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        id={`campaign-${campaign.id}`}
                        checked={selectedCampaigns.includes(campaign.id)}
                        onChange={() => handleCampaignSelection(campaign.id)}
                        className="mt-1 w-4 h-4"
                      />
                      <label 
                        htmlFor={`campaign-${campaign.id}`}
                        className="flex-1 text-sm cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate pr-2">
                            {campaign.name}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            campaign.status === "ENABLED" 
                              ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200" 
                              : "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200"
                          }`}>
                            {campaign.status === "ENABLED" ? "Ativa" : "Inativa"}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <div>
                            <span className="font-medium">Impressões:</span><br />
                            {campaign.totalImpressions.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Cliques:</span><br />
                            {campaign.totalClicks.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Gasto:</span><br />
                            R$ {campaign.totalSpend.toFixed(2)}
                          </div>
                        </div>
                        {campaign.totalImpressions > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            CTR: {((campaign.totalClicks / campaign.totalImpressions) * 100).toFixed(2)}%
                            {campaign.totalSpend > 0 && (
                              <span className="ml-2">
                                CPC: R$ {(campaign.totalSpend / campaign.totalClicks).toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
                
                {selectedCampaigns.length === 0 && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
                    <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Nenhuma campanha selecionada. A análise incluirá todas as campanhas do cliente.
                    </p>
                  </div>
                )}
                
                {selectedCampaigns.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      ✓ {selectedCampaigns.length} campanha(s) selecionada(s) para análise.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Gerando..." : "Gerar Insight"}
        </button>

        {error && <p className="text-red-600 mt-2">{error}</p>}
      </form>

      {insight && (
        <div className="mt-8 bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Insight Gerado</h2>
          <pre className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{insight}</pre>
          
          {/* Botão para mostrar/ocultar o relatório infográfico */}
          <div className="mt-4">
            <button
              onClick={() => setShowReport(!showReport)}
              className="bg-brand text-white px-4 py-2 rounded hover:bg-brand-dark"
            >
              {showReport ? "Ocultar Relatório Infográfico" : "Mostrar Relatório Infográfico"}
            </button>
          </div>
          
          {/* Componente de relatório infográfico */}
          {showReport && (
            <div className="mt-6">
              <InfographicReport 
                insight={insight} 
                cliente={selectedClients.join(', ')} 
                periodo={`${dataInicio} a ${dataFim}`}
                origem={tableMap[table]?.label || table}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
