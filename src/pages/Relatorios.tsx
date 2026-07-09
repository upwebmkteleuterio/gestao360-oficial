import React, { useMemo, useState } from 'react';
import { 
  FileText, 
  TrendingUp, 
  Download, 
  AlertCircle,
  Calendar,
  Filter,
  Receipt
} from 'lucide-react';
import { useLancamentos, useCentrosCusto } from '../hooks/useData';
import ComprovanteDrawer from '../components/ComprovanteDrawer';

export default function Relatorios() {
  const { data: lancamentos = [] } = useLancamentos();
  const { data: centros = [] } = useCentrosCusto();

  // State filters
  const [reportType, setReportType] = useState<string>('dre-cc');
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [costCenterId, setCostCenterId] = useState<string>('all');
  
  // Slide panel state
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

  // 1. CALCULATE REPORT METRICS FROM REAL DATA
  const finalReportData = useMemo(() => {
    // Only includes Master Confirmed
    let items = lancamentos.filter(l => l.status_aprovacao === 'confirmado_master');

    // Filter by period dates
    if (startDate) {
      items = items.filter(l => l.data_vencimento >= startDate);
    }
    if (endDate) {
      items = items.filter(l => l.data_vencimento <= endDate);
    }

    // Build breakdown by cost center
    const rows = centros.map(cnt => {
      const dbMatches = items.filter(l => l.centro_custo_id === cnt.id);
      const entradas = dbMatches.filter(l => l.tipo === 'entrada').reduce((sum, current) => sum + current.valor_previsto, 0);
      const saidas = dbMatches.filter(l => l.tipo === 'saida').reduce((sum, current) => sum + current.valor_previsto, 0);
      
      return {
        id: cnt.id,
        nome: cnt.nome,
        entradas,
        saidas
      };
    });

    // If "all" is NOT selected, filter the rows list
    let filteredRows = rows;
    if (costCenterId && costCenterId !== 'all') {
      filteredRows = rows.filter(r => r.id === costCenterId);
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
    const headers = 'Centro de Custo,Entradas,Saidas,Resultado\n';
    const csvContent = finalReportData.rows.map(r => 
      `"${r.nome}",${r.entradas},${r.saidas},${r.entradas - r.saidas}`
    ).join('\n');

    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'relatorio_dre.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openReceiptWithTestData = (row: any) => {
    setComprovanteData({
      idTransacao: `#REL-${row.id.substring(0,6).toUpperCase()}`,
      conta: 'Consolidado do Centro',
      responsavel: 'Relatório do Sistema',
      valorTransacionado: row.entradas - row.saidas,
      taxa: 0,
      totalConciliado: row.entradas - row.saidas,
      dataHora: new Date().toLocaleString('pt-BR')
    });
    setIsComprovanteOpen(true);
  };

  return (
    <div className="space-y-6 print:p-0 select-none font-sans">
      <div className="flex flex-col gap-1 print:hidden">
        <h1 className="text-2xl font-black uppercase tracking-tighter text-neutral-900">Relatórios de Inteligência</h1>
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg text-xs font-semibold mt-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Dados baseados em lançamentos confirmados pelo nível Master.</span>
        </div>
      </div>

      <div className="bg-white border-2 border-neutral-100 p-6 rounded-3xl shadow-sm space-y-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Tipo de Relatório</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="h-11 px-4 bg-neutral-50 border-2 border-neutral-100 rounded-xl text-xs font-bold outline-none cursor-pointer appearance-none"
            >
              <option value="dre-cc">DRE por Centro de Custo</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Início</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-neutral-300 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-neutral-50 border-2 border-neutral-100 rounded-xl text-xs font-bold outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Fim</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-neutral-300 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-neutral-50 border-2 border-neutral-100 rounded-xl text-xs font-bold outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Centro de Custo</label>
            <select 
              value={costCenterId}
              onChange={(e) => setCostCenterId(e.target.value)}
              className="h-11 px-4 bg-neutral-50 border-2 border-neutral-100 rounded-xl text-xs font-bold outline-none cursor-pointer appearance-none"
            >
              <option value="all">Todos</option>
              {centros.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-neutral-100 pt-4">
          <button 
            type="button"
            onClick={handleClearFilters}
            className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-all"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      <div className="bg-white border-2 border-neutral-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-4 bg-neutral-50/30">
          <h2 className="text-sm font-black uppercase text-neutral-900 tracking-widest">
            Detalhamento DRE
          </h2>
          
          <button 
            onClick={handleExportCSV}
            className="px-6 py-2.5 bg-neutral-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-md"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-400 border-b border-neutral-100 text-[9px] font-black uppercase tracking-widest">
                <th className="py-4 px-8">Nome do Centro de Custo</th>
                <th className="py-4 px-8 text-right">Entradas</th>
                <th className="py-4 px-8 text-right">Saídas</th>
                <th className="py-4 px-8 text-right">Resultado</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-bold">
              {finalReportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center opacity-40 uppercase tracking-widest font-black text-xs">
                    Nenhum dado encontrado para o período
                  </td>
                </tr>
              ) : (
                finalReportData.rows.map((row) => {
                  const resValue = row.entradas - row.saidas;
                  return (
                    <tr 
                      key={row.id} 
                      onClick={() => openReceiptWithTestData(row)}
                      className="hover:bg-neutral-50/50 transition-all cursor-pointer group border-b border-neutral-50"
                    >
                      <td className="py-4 px-8 font-black text-neutral-900 flex items-center gap-3">
                        <Receipt className="w-4 h-4 text-neutral-200 group-hover:text-primary transition-colors" />
                        {row.nome}
                      </td>
                      <td className="py-4 px-8 text-right font-mono text-bank-truth-green">
                        {formatBRL(row.entradas)}
                      </td>
                      <td className="py-4 px-8 text-right font-mono text-alert-red">
                        -{formatBRL(row.saidas)}
                      </td>
                      <td className={`py-4 px-8 text-right font-mono font-black ${resValue >= 0 ? 'text-bank-truth-green' : 'text-alert-red'}`}>
                        {formatBRL(resValue)}
                      </td>
                    </tr>
                  );
                })
              )}
              <tr className="bg-neutral-900 text-white">
                <td className="py-4 px-8 uppercase font-black tracking-widest">Total Consolidado</td>
                <td className="py-4 px-8 text-right font-mono text-emerald-400">
                  {formatBRL(finalReportData.totalEntradas)}
                </td>
                <td className="py-4 px-8 text-right font-mono text-red-400">
                  -{formatBRL(finalReportData.totalSaidas)}
                </td>
                <td className={`py-4 px-8 text-right font-mono font-black ${finalReportData.totalConsolidado >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatBRL(finalReportData.totalConsolidado)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ComprovanteDrawer 
        isOpen={isComprovanteOpen}
        onClose={() => setIsComprovanteOpen(false)}
        data={comprovanteData}
      />
    </div>
  );
}
