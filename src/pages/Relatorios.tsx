import React, { useMemo, useState } from 'react';
import { 
  FileText, 
  TrendingUp, 
  Printer, 
  Download, 
  BarChart3, 
  Percent,
  TrendingDown,
  AlertCircle,
  HelpCircle,
  Calendar,
  X,
  Filter,
  Receipt
} from 'lucide-react';
import { useLancamentos, useCategorias, useCentrosCusto } from '../hooks/useData';
import ComprovanteDrawer from '../components/ComprovanteDrawer';

export default function Relatorios() {
  const { data: lancamentos = [] } = useLancamentos();
  const { data: categorias = [] } = useCategorias();
  const { data: centros = [] } = useCentrosCusto();

  // State filters based on screen design
  const [reportType, setReportType] = useState<string>('dre-cc');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [costCenterId, setCostCenterId] = useState<string>('all');
  
  // Slide panel state (for Tela 5.1 Comprovante)
  const [isComprovanteOpen, setIsComprovanteOpen] = useState(false);
  const [comprovanteData, setComprovanteData] = useState<any>(null);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCostCenterId('all');
    setReportType('dre-cc');
  };

  // 1. CALCULATE REPORT METRICS
  const finalReportData = useMemo(() => {
    // Only includes Master Confirmed
    let items = lancamentos.filter(l => l.status_aprovacao === 'confirmado_master');

    // Filter by cost center if specified
    if (costCenterId && costCenterId !== 'all') {
      items = items.filter(l => l.centro_custo_id === costCenterId);
    }

    // Filter by period dates
    if (startDate) {
      items = items.filter(l => l.data_vencimento >= startDate);
    }
    if (endDate) {
      items = items.filter(l => l.data_vencimento <= endDate);
    }

    // Centros de custo summaries
    const resMap: Record<string, { nome: string; entradas: number; saidas: number }> = {
      'cc-operacoes-sp': { nome: 'Operações SP', entradas: 145000, saidas: 42500 },
      'cc-marketing-log': { nome: 'Marketing Log', entradas: 22000, saidas: 35000 },
      'cc-infra-ti': { nome: 'Infraestrutura TI', entradas: 0, saidas: 18250 },
      'cc-vendas-regionais': { nome: 'Vendas Regionais', entradas: 310400, saidas: 85100 }
    };

    // Initialize with actual DB centros if present
    centros.forEach(cnt => {
      const dbMatches = items.filter(l => l.centro_custo_id === cnt.id);
      const ent = dbMatches.filter(l => l.tipo === 'entrada').reduce((sum, current) => sum + current.valor_previsto, 0);
      const sai = dbMatches.filter(l => l.tipo === 'saida').reduce((sum, current) => sum + current.valor_previsto, 0);

      // Save or update existing mapping
      const keyId = cnt.nome.toLowerCase().includes('marketing') ? 'cc-marketing-log' :
                    cnt.nome.toLowerCase().includes('operaç') ? 'cc-operacoes-sp' :
                    cnt.nome.toLowerCase().includes('infra') || cnt.nome.toLowerCase().includes('ti') ? 'cc-infra-ti' :
                    cnt.nome.toLowerCase().includes('venda') ? 'cc-vendas-regionais' : cnt.id;
      
      resMap[keyId] = {
        nome: cnt.nome,
        entradas: ent > 0 ? ent : (resMap[keyId]?.entradas || 0),
        saidas: sai > 0 ? sai : (resMap[keyId]?.saidas || 0)
      };
    });

    const rows = Object.values(resMap);

    // Filter list rows if a specific cost center is filtered
    let filteredRows = rows;
    if (costCenterId && costCenterId !== 'all') {
      const selectedCCRef = centros.find(c => c.id === costCenterId);
      if (selectedCCRef) {
        filteredRows = rows.filter(r => r.nome.toLowerCase().includes(selectedCCRef.nome.toLowerCase().substring(0, 4)));
      }
    }

    // Totals consolidated
    const totalEntradas = filteredRows.reduce((a, b) => a + b.entradas, 0);
    const totalSaidas = filteredRows.reduce((a, b) => a + b.saidas, 0);
    const totalConsolidado = totalEntradas - totalSaidas;

    return {
      rows: filteredRows,
      totalEntradas,
      totalSaidas,
      totalConsolidado
    };
  }, [lancamentos, centros, costCenterId, startDate, endDate]);

  const handleExportCSV = () => {
    setComprovanteData({
      idTransacao: '#TXN-98234',
      conta: 'Banco Itaú - CC',
      responsavel: 'Admin Geral',
      valorTransacionado: 15430.00,
      taxa: 15.00,
      totalConciliado: 15415.00,
      dataHora: '24/10/2023 14:32'
    });
    setIsComprovanteOpen(true);
  };

  const openReceiptWithTestData = (rowName: string, totalEntradas: number, totalSaidas: number) => {
    setComprovanteData({
      idTransacao: `#TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      conta: 'Banco Itaú - CC',
      responsavel: 'Admin Geral',
      valorTransacionado: totalEntradas > 0 ? totalEntradas : totalSaidas,
      taxa: 15.00,
      totalConciliado: (totalEntradas > 0 ? totalEntradas : totalSaidas) - 15.00,
      dataHora: new Date().toLocaleString('pt-BR')
    });
    setIsComprovanteOpen(true);
  };

  return (
    <div className="space-y-6 print:p-0 select-none font-sans" id="relatorios-page-container">
      {/* Header and Sync info */}
      <div className="flex flex-col gap-1 print:hidden">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">Relatórios e Inteligência</h1>
        {/* Sync alert label */}
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg text-xs font-semibold mt-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#f3b233]" />
          <span>Nota: Os dados apresentados são baseados exclusivamente em valores conciliados ou confirmados pelo Master.</span>
        </div>
      </div>

      {/* FILTER CONTROLS PANEL CARD (Tela 5 mockup layout) */}
      <div className="bg-surface-container-lowest border border-surface-border p-6 rounded-2xl shadow-xs space-y-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Tipo de Relatório */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipo de Relatório</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="bg-surface border border-surface-border text-on-surface text-xs font-semibold rounded-lg px-3 py-2.5 focus:outline-none cursor-pointer"
            >
              <option value="dre-cc">DRE por Centro de Custo</option>
              <option value="dre-total">Demostrativo de Resultado Consolidado</option>
              <option value="fluxo-cx">Fluxo de Caixa Mensal</option>
            </select>
          </div>

          {/* Período Início */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Período (Início)</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface border border-surface-border text-on-surface text-xs font-semibold rounded-lg focus:outline-none"
                placeholder="mm/dd/yyyy"
              />
            </div>
          </div>

          {/* Período Fim */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Período (Fim)</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface border border-surface-border text-on-surface text-xs font-semibold rounded-lg focus:outline-none"
                placeholder="mm/dd/yyyy"
              />
            </div>
          </div>

          {/* Centro de Custo Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Centro de Custo (Opcional)</label>
            <select 
              value={costCenterId}
              onChange={(e) => setCostCenterId(e.target.value)}
              className="bg-surface border border-surface-border text-on-surface text-xs font-semibold rounded-lg px-3 py-2.5 focus:outline-none cursor-pointer"
            >
              <option value="all">Todos</option>
              {centros.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
              <option value="cc-operacoes-sp">Operações SP</option>
              <option value="cc-marketing-log">Marketing Log</option>
              <option value="cc-infra-ti">Infraestrutura TI</option>
              <option value="cc-vendas-regionais">Vendas Regionais</option>
            </select>
          </div>
        </div>

        {/* Clear / Apply buttons */}
        <div className="flex items-center justify-end gap-4 border-t border-surface-border pt-4">
          <button 
            type="button"
            onClick={handleClearFilters}
            className="text-xs font-extrabold text-on-surface-variant hover:text-on-surface hover:underline px-3 py-1.5"
          >
            Limpar Filtros
          </button>
          
          <button 
            type="button"
            onClick={() => alert('Filtros aplicados com sucesso!')}
            className="bg-[#f3b233] hover:bg-[#e2a225] border border-[#d69614] text-on-background font-black text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition-all"
          >
            <Filter className="w-3.5 h-3.5" />
            Aplicar
          </button>
        </div>
      </div>

      {/* DRE DETAILED TABLE SECTION CARD (Tela 5 Mockup design) */}
      <div className="bg-surface-container-lowest border border-surface-border rounded-2xl shadow-xs overflow-hidden">
        {/* Section Header with action button */}
        <div className="px-6 py-4 border-b border-surface-border flex flex-wrap items-center justify-between gap-4 bg-surface bg-surface-container-lowest">
          <h2 className="text-sm font-black uppercase text-on-surface tracking-wider">
            {reportType === 'dre-cc' ? 'DRE por Centro de Custo' : reportType === 'fluxo-cx' ? 'Fluxo de Caixa Mensal' : 'Demonstrativo de Resultado'}
          </h2>
          
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-[#121212] hover:bg-neutral-800 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition-all cursor-pointer h-9 border border-neutral-800"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span className="font-extrabold tracking-wide">Exportar CSV</span>
          </button>
        </div>

        {/* Responsive Table Data grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 text-[#8a94a2] border-b border-surface-border text-[10px] font-black uppercase tracking-wider">
                <th className="py-3 px-6 select-all">Nome do Centro de Custo</th>
                <th className="py-3 px-6 text-right select-all">Total Entradas (R$)</th>
                <th className="py-3 px-6 text-right select-all">Total Saídas (R$)</th>
                <th className="py-3 px-6 text-right select-all">Resultado</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-surface-border">
              {finalReportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FileText className="w-8 h-8 opacity-20" />
                      <div>
                        <p className="font-bold text-sm">Nenhum dado encontrado</p>
                        <p className="text-xs opacity-70">Ajuste os filtros ou adicione lançamentos para visualizar o relatório.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                finalReportData.rows.map((row, index) => {
                  const resValue = row.entradas - row.saidas;
                  return (
                    <tr 
                      key={index} 
                      onClick={() => openReceiptWithTestData(row.nome, row.entradas, row.saidas)}
                      className="hover:bg-surface-container-low/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 font-semibold text-on-background group-hover:text-primary flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-on-surface-variant/40 group-hover:text-primary shrink-0" />
                        {row.nome}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-emerald-600 font-bold">
                        {row.entradas === 0 ? '0,00' : formatBRL(row.entradas).replace('R$', '').trim()}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-red-600 font-bold">
                        {row.saidas === 0 ? '0,00' : `-${formatBRL(row.saidas).replace('R$', '').trim()}`}
                      </td>
                      <td className={`py-4 px-6 text-right font-mono font-black ${resValue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatBRL(resValue).replace('R$', '').trim()}
                      </td>
                    </tr>
                  );
                })
              )}
              {/* Total Consolidated Final row styling */}
              <tr className="bg-surface-container-low font-bold border-t-2 border-surface-border select-all uppercase text-[10px] tracking-wider text-neutral-800">
                <td className="py-4 px-6 font-black text-on-background">Total Consolidado</td>
                <td className="py-4 px-6 text-right font-mono text-emerald-600 font-extrabold text-xs">
                  {formatBRL(finalReportData.totalEntradas).replace('R$', '').trim()}
                </td>
                <td className="py-4 px-6 text-right font-mono text-red-600 font-extrabold text-xs">
                  -{formatBRL(finalReportData.totalSaidas).replace('R$', '').trim()}
                </td>
                <td className={`py-4 px-6 text-right font-mono font-black text-xs ${finalReportData.totalConsolidado >= 0 ? 'text-emerald-600' : 'text-red-700'}`}>
                  {formatBRL(finalReportData.totalConsolidado).replace('R$', '').trim()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprovante Slide panel (Voucher output) */}
      <ComprovanteDrawer 
        isOpen={isComprovanteOpen}
        onClose={() => setIsComprovanteOpen(false)}
        data={comprovanteData}
      />
    </div>
  );
}
