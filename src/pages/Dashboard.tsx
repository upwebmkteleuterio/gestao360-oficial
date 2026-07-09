import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Calendar,
  Filter,
  Download,
  Building2,
  AlertTriangle,
  LineChart,
  Landmark,
  Shield,
  Clock
} from 'lucide-react';
import { useLancamentos, useContas, useCentrosCusto, useFinancialSummary, useAuditoriaLogs } from '../hooks/useData';
import { useUIStore } from '../store/uiStore';
import { useDragScroll } from '../hooks/useDragScroll';

export default function Dashboard() {
  const dragScrollAccounts = useDragScroll();
  const dragScrollTabs = useDragScroll();

  // Dashboard Sub-Tabs State (Local for page context)
  const [currentTab, setCurrentTab] = useState<'general' | 'cashflow' | 'audit'>('general');

  // Advanced Filter States
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedCCId, setSelectedCCId] = useState<string | null>(null);

  const { data: lancamentos = [], isLoading: loadingLancamentos } = useLancamentos();
  const { data: contas = [], isLoading: loadingContas } = useContas();
  const { data: centrosCusto = [] } = useCentrosCusto();
  const { data: auditoriaLogs = [] } = useAuditoriaLogs();
  const { data: summary, isLoading: loadingSummary } = useFinancialSummary({
    accountId: selectedAccountId || undefined,
    costCenterId: selectedCCId || undefined
  });
  
  const { setModalOpen } = useUIStore();

  // Seletor de Período State
  const [periodFilter, setPeriodFilter] = useState<'all' | 'este-mes' | '2023-10' | '2026-06' | '90-dias'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Filtering lancamentos based on selected period
  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter(item => {
      if (periodFilter === '2023-10') {
        return item.data_vencimento.startsWith('2023-10');
      }
      if (periodFilter === '2026-06') {
        return item.data_vencimento.startsWith('2026-06');
      }
      if (customStart && customEnd) {
        return item.data_vencimento >= customStart && item.data_vencimento <= customEnd;
      }
      return true;
    });
  }, [lancamentos, periodFilter, customStart, customEnd]);

  const valueFormatter = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // CALCULATION 1: Consolidated cash balance
  const totals = useMemo(() => {
    const consolidatedBalance = summary?.consolidated_balance ?? 0;
    const simulatedBalance = summary?.simulated_balance ?? 0;
    const outPending = summary?.pending_payments ?? 0;

    const paidSum = filteredLancamentos.filter(l => l.status_pagamento === 'pago').length;
    const unpaidSum = filteredLancamentos.filter(l => l.status_pagamento === 'aberto').length;
    const bpiSum = filteredLancamentos.filter(l => l.status_pagamento === 'bpi').length;
    const totalStatusCount = paidSum + unpaidSum + bpiSum || 1;

    return {
      consolidatedBalance,
      simulatedBalance,
      outPending,
      paidPercent: Math.round((paidSum / totalStatusCount) * 100),
      unpaidPercent: Math.round((unpaidSum / totalStatusCount) * 100),
      bpiPercent: Math.round((bpiSum / totalStatusCount) * 100),
      paidCount: paidSum,
      unpaidCount: unpaidSum,
      bpiCount: bpiSum
    };
  }, [summary, filteredLancamentos]);

  // Balance breakdown per account
  const accountsBalances = useMemo(() => {
    return contas.map(account => {
      const accLaunches = filteredLancamentos.filter(l => l.conta_bancaria_id === account.id);
      
      const consolidatedChange = accLaunches
        .filter(l => l.status_aprovacao === 'confirmado_master')
        .reduce((acc, item) => {
          return item.tipo === 'entrada' ? acc + item.valor_previsto : acc - item.valor_previsto;
        }, 0);

      const simulatedChange = accLaunches
        .reduce((acc, item) => {
          return item.tipo === 'entrada' ? acc + item.valor_previsto : acc - item.valor_previsto;
        }, 0);

      return {
        ...account,
        consolidated: (account.saldo_inicial || 0) + consolidatedChange,
        simulated: (account.saldo_inicial || 0) + simulatedChange
      };
    });
  }, [contas, filteredLancamentos]);

  // Cost Center analysis
  const costCenterBreakdown = useMemo(() => {
    return centrosCusto.map(cc => {
      const ccLaunches = filteredLancamentos.filter(l => l.centro_custo_id === cc.id);
      
      const entradas = ccLaunches
        .filter(l => l.tipo === 'entrada')
        .reduce((acc, l) => acc + l.valor_previsto, 0);

      const saidas = ccLaunches
        .filter(l => l.tipo === 'saida')
        .reduce((acc, l) => acc + l.valor_previsto, 0);

      return {
        ...cc,
        entradas,
        saidas,
      };
    });
  }, [centrosCusto, filteredLancamentos]);

  if (loadingLancamentos || loadingContas || loadingSummary) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-on-surface-variant font-medium text-sm">Carregando painel financeiro...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Sub-tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border/50 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-primary uppercase">Dashboard</h1>
            <div className="h-6 w-px bg-surface-border hidden sm:block" />
            <nav ref={dragScrollTabs.ref} {...dragScrollTabs.props} className="flex gap-4 sm:gap-6 select-none overflow-x-auto scrollbar-none whitespace-nowrap scroll-smooth pb-0.5" style={{ cursor: 'grab', userSelect: 'none' }}>
              <button 
                type="button" 
                onClick={() => { setPeriodFilter('all'); setCurrentTab('general'); }}
                className={`text-xs font-bold pb-1 sm:pb-2 pt-1 sm:pt-2 transition-colors border-b-2 shrink-0 whitespace-nowrap ${
                  currentTab === 'general'
                    ? 'text-primary border-primary' 
                    : 'text-secondary hover:text-primary border-transparent'
                }`}
              >
                Visão Geral
              </button>
              <button 
                type="button" 
                onClick={() => { setCurrentTab('cashflow'); }}
                className={`text-xs font-bold pb-1 sm:pb-2 pt-1 sm:pt-2 transition-colors border-b-2 shrink-0 whitespace-nowrap ${
                  currentTab === 'cashflow'
                    ? 'text-primary border-primary' 
                    : 'text-secondary hover:text-primary border-transparent'
                }`}
              >
                Fluxo de Caixa
              </button>
              <button 
                type="button" 
                onClick={() => { setCurrentTab('audit'); }}
                className={`text-xs font-bold pb-1 sm:pb-2 pt-1 sm:pt-2 transition-colors border-b-2 shrink-0 whitespace-nowrap ${
                  currentTab === 'audit'
                    ? 'text-primary border-primary' 
                    : 'text-secondary hover:text-primary border-transparent'
                }`}
              >
                Auditoria
              </button>
            </nav>
          </div>
        </div>

        {currentTab === 'general' && (
          <>
            <section className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-surface p-4 rounded-lg border border-surface-border shadow-sm animate-fade-in">
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-secondary mb-1">Seletor de Período</span>
                  <div className="flex items-center gap-2 border border-surface-border rounded-lg px-3 py-2 bg-surface">
                    <Calendar className="w-5 h-5 text-secondary" />
                    <select 
                      value={periodFilter}
                      onChange={(e) => {
                        setPeriodFilter(e.target.value as any);
                        if (e.target.value !== 'custom') {
                          setCustomStart('');
                          setCustomEnd('');
                        }
                      }}
                      className="bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 w-48 text-on-surface focus:outline-none cursor-pointer"
                    >
                      <option value="all">Todo o Período</option>
                      <option value="este-mes">Este Mês</option>
                      <option value="2023-10">Outubro 2023</option>
                      <option value="2026-06">Junho 2026</option>
                      <option value="90-dias">Últimos 90 dias</option>
                    </select>
                  </div>
                </div>

                {periodFilter === 'all' && (
                  <div className="flex flex-col animate-fade-in">
                    <span className="text-xs font-medium text-secondary mb-1">Status de Dados</span>
                    <div className="flex items-center gap-2 px-3 py-2 bg-bank-truth-green/10 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-bank-truth-green" />
                      <span className="text-xs font-bold text-bank-truth-green">Visão Consolidada</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-all ${
                    showAdvancedFilters || selectedAccountId || selectedCCId
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'border-surface-border text-secondary hover:bg-neutral-50'
                  }`}
                >
                  <Filter className="w-5 h-5" />
                  Filtros Avançados {(selectedAccountId || selectedCCId) && '•'}
                </button>
                <button 
                  onClick={() => {
                    const headers = 'KPI,Valor\n';
                    const rows = [
                      ['Saldo Consolidado', valueFormatter(totals.consolidatedBalance)],
                      ['Saldo Simulado', valueFormatter(totals.simulatedBalance)],
                      ['Pendentes Master', valueFormatter(totals.outPending)],
                    ].map(r => r.join(',')).join('\n');
                    
                    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', 'resumo_financeiro_dashboard.csv');
                    link.click();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-neutral-700 text-white rounded-lg text-sm font-semibold transition-all"
                >
                  <Download className="w-5 h-5" />
                  Exportar CSV
                </button>
              </div>
            </section>

            {showAdvancedFilters && (
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface-low-low p-4 rounded-lg border border-surface-border animate-fade-in">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-secondary uppercase">Filtrar por Conta</label>
                  <select 
                    value={selectedAccountId || ''} 
                    onChange={(e) => setSelectedAccountId(e.target.value || null)}
                    className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Todas as Contas</option>
                    {contas.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-secondary uppercase">Centro de Custo</label>
                  <select 
                    value={selectedCCId || ''} 
                    onChange={(e) => setSelectedCCId(e.target.value || null)}
                    className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Todos os Centros</option>
                    {centrosCusto.map(cc => (
                      <option key={cc.id} value={cc.id}>{cc.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={() => { setSelectedAccountId(null); setSelectedCCId(null); }}
                    className="text-xs font-bold text-alert-red hover:underline mb-3"
                  >
                    Limpar Filtros Avançados
                  </button>
                </div>
              </section>
            )}

            {totals.simulatedBalance < 0 && (
              <section className="bg-alert-red/10 border-l-4 border-alert-red p-4 rounded-r-lg flex items-center gap-4 animate-bounce">
                <AlertTriangle className="w-8 h-8 text-alert-red shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-alert-red uppercase">Alerta de Fluxo de Caixa Negativo</h4>
                  <p className="text-xs text-alert-red/80 font-medium">O saldo simulado para o final do período está negativo ({valueFormatter(totals.simulatedBalance)}). Revise seus lançamentos pendentes.</p>
                </div>
              </section>
            )}

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
              <div className="bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-bank-truth-green"></div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">Saldo Atual Consolidado</span>
                  <Landmark className="w-5 h-5 text-bank-truth-green" />
                </div>
                <h3 className="text-2xl font-bold font-mono text-on-surface">
                  {valueFormatter(totals.consolidatedBalance)}
                </h3>
                <div className={`text-xs font-semibold mt-2 flex items-center gap-1 ${
                  (summary?.trend_percentage || 0) >= 0 ? 'text-bank-truth-green' : 'text-alert-red'
                }`}>
                  {(summary?.trend_percentage || 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {summary?.trend_percentage > 0 ? '+' : ''}{summary?.trend_percentage || 0}% em relação aos últimos 30 dias
                </div>
              </div>

              <div className="bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">Saldo Simulado</span>
                  <LineChart className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-2xl font-bold font-mono text-on-surface">
                  {valueFormatter(totals.simulatedBalance)}
                </h3>
                <p className="text-xs text-secondary mt-2">Expectativa para final do mês</p>
              </div>

              <div className="bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#FFA000]"></div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">Pagamentos Não Consolidados</span>
                  <AlertTriangle className="w-5 h-5 text-[#FFA000]" />
                </div>
                <h3 className="text-2xl font-bold font-mono text-on-surface">
                  {valueFormatter(totals.outPending)}
                </h3>
                <p className="text-xs text-[#FFA000] mt-2 font-semibold">Aguardando aprovação master</p>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in">
              <h4 className="text-xs font-black uppercase tracking-wider text-secondary flex items-center gap-2">
                <Building2 className="w-5 h-5 text-secondary" />
                SALDOS POR CONTA BANCÁRIA
              </h4>
              
              <div ref={dragScrollAccounts.ref} {...dragScrollAccounts.props} className="flex gap-4 overflow-x-auto pb-2 scroll-smooth select-none" style={{ cursor: 'grab', userSelect: 'none' }}>
                {accountsBalances.length === 0 ? (
                  <div className="text-sm text-secondary bg-surface-container p-4 rounded-lg flex-1 text-center border border-dashed border-surface-border">
                    Nenhuma conta bancária cadastrada.
                  </div>
                ) : (
                  accountsBalances.map((acc, index) => {
                    const bgColors = ['bg-[#FF6200]/10', 'bg-[#cc092f]/10', 'bg-[#8a05be]/10', 'bg-blue-500/10'];
                    const textColors = ['text-[#FF6200]', 'text-[#cc092f]', 'text-[#8a05be]', 'text-blue-500'];
                    const colorIdx = index % bgColors.length;
                    return (
                      <div key={acc.id} className="flex-shrink-0 w-64 bg-white dark:bg-surface p-4 border border-surface-border rounded-lg flex items-center justify-between group cursor-pointer hover:border-primary transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${bgColors[colorIdx]} flex items-center justify-center font-bold ${textColors[colorIdx]} shrink-0 uppercase`}>
                            {(acc.nome || '').substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface truncate w-24" title={acc.nome || ''}>{acc.nome || 'N/A'}</p>
                            <p className="text-xs text-secondary truncate w-24">{acc.agencia || ''} {acc.conta || ''}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold font-mono text-on-surface">
                          {valueFormatter(acc.consolidated || 0)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
              <div className="lg:col-span-2 bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm">
                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface">
                    Receitas e Despesas por Centro de Custo
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-bank-truth-green"></span>
                      <span className="text-xs font-semibold text-secondary">Receitas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-alert-red"></span>
                      <span className="text-xs font-semibold text-secondary">Despesas</span>
                    </div>
                  </div>
                </div>

                <div className="relative h-64 w-full flex items-end justify-around gap-2 px-4 border-b border-surface-border pt-10">
                  {costCenterBreakdown.map((cc, i) => {
                    const maxGlobal = costCenterBreakdown.length > 0 ? Math.max(...costCenterBreakdown.map(c => Math.max(c.entradas, c.saidas, 1))) : 1;
                    const maxLimit = maxGlobal * 1.1;

                    const rPct = Math.min((cc.entradas / maxLimit) * 100, 100);
                    const dPct = Math.min((cc.saidas / maxLimit) * 100, 100);

                    return (
                      <div key={cc.id || i} className="flex flex-col items-center gap-1 flex-1 h-full justify-end group">
                        <div className="w-full flex justify-center items-end gap-1.5 px-1 sm:px-2 h-44">
                          <div 
                            className="bg-bank-truth-green w-6 sm:w-8 rounded-t-sm relative transition-all duration-300 hover:opacity-90 cursor-pointer"
                            style={{ height: `${Math.max(rPct, 5)}%` }}
                          >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-neutral-900 text-white text-[10px] px-2 py-1 rounded transition-opacity shadow-md pointer-events-none whitespace-nowrap z-10 font-bold">
                              {valueFormatter(cc.entradas)}
                            </div>
                          </div>
                          <div 
                            className="bg-alert-red w-6 sm:w-8 rounded-t-sm relative transition-all duration-300 hover:opacity-90 cursor-pointer"
                            style={{ height: `${Math.max(dPct, 5)}%` }}
                          >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-neutral-900 text-white text-[10px] px-2 py-1 rounded transition-opacity shadow-md pointer-events-none whitespace-nowrap z-10 font-bold">
                              {valueFormatter(cc.saidas)}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-secondary mt-2">
                          {cc.nome}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm flex flex-col h-full">
                <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface mb-6">
                  Composição da Carteira
                </h4>
                
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <div 
                      className="absolute inset-0 rounded-full border-[16px] border-bank-truth-green flex items-center justify-center overflow-visible"
                      style={{ 
                        background: `conic-gradient(
                          #4CAF50 0% ${totals.paidPercent}%, 
                          #D32F2F ${totals.paidPercent}% ${totals.paidPercent + totals.unpaidPercent}%, 
                          #FFA000 ${totals.paidPercent + totals.unpaidPercent}% 100%
                        )`,
                        border: 'none',
                        borderRadius: '50%'
                      }}
                    >
                      <div className="absolute inset-4 bg-white dark:bg-surface rounded-full"></div>
                    </div>
                    <div className="text-center z-10">
                      <p className="text-xl md:text-2xl font-black leading-none text-on-surface">{(totals.paidCount + totals.unpaidCount + totals.bpiCount) > 0 ? '100%' : '0%'}</p>
                      <p className="text-xs font-bold text-secondary mt-1">
                        Total Lançado
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-1 gap-3 w-full border-t border-surface-border pt-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-bank-truth-green"></span>
                        <span className="text-sm font-medium text-secondary">Pagos</span>
                      </div>
                      <span className="font-mono text-sm font-bold">{totals.paidPercent}%</span>
                    </div>
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-alert-red"></span>
                        <span className="text-sm font-medium text-secondary">Atrasados</span>
                      </div>
                      <span className="font-mono text-sm font-bold">{totals.unpaidPercent}%</span>
                    </div>
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#FFA000]"></span>
                        <span className="text-sm font-medium text-secondary">BPI</span>
                      </div>
                      <span className="font-mono text-sm font-bold">{totals.bpiPercent}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {currentTab === 'cashflow' && (
          <section className="bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
                <LineChart className="w-5 h-5 text-primary" />
                Histórico de Fluxo de Caixa
              </h4>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant border-b border-surface-border">
                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider">Data</th>
                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider">Descrição</th>
                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider">Entidade</th>
                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-right">Valor</th>
                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {lancamentos.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-on-surface-variant font-medium">Nenhum dado real encontrado. Realize lançamentos para visualizar.</td></tr>
                  ) : (
                    lancamentos.slice(0, 10).map(l => (
                      <tr key={l.id} className="border-b border-surface-border hover:bg-neutral-50">
                        <td className="py-3 px-4 font-mono">{l.data_vencimento.split('-').reverse().join('/')}</td>
                        <td className="py-3 px-4 font-bold">{l.observacoes || 'Lançamento Operacional'}</td>
                        <td className="py-3 px-4">{entidades.find(e => e.id === l.entidade_id)?.nome_razao_social || '-'}</td>
                        <td className={`py-3 px-4 text-right font-bold ${l.tipo === 'saida' ? 'text-alert-red' : 'text-bank-truth-green'}`}>
                          {valueFormatter(l.valor_previsto)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            l.status_aprovacao === 'confirmado_master' ? 'bg-bank-truth-green/10 text-bank-truth-green' : 'bg-pending-amber/10 text-pending-amber'
                          }`}>
                            {l.status_aprovacao === 'confirmado_master' ? 'Consolidado' : 'Simulado'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {currentTab === 'audit' && (
          <section className="bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Logs de Auditoria do Sistema
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant border-b border-surface-border">
                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider">Data e Hora</th>
                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider">Ação</th>
                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider">Tabela</th>
                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {auditoriaLogs.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-on-surface-variant font-medium">Nenhum log real registrado no banco de dados.</td></tr>
                  ) : (
                    auditoriaLogs.slice(0, 10).map(log => (
                      <tr key={log.id} className="border-b border-surface-border hover:bg-neutral-50">
                        <td className="py-3 px-4 font-mono">{new Date(log.data_hora).toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            log.acao === 'INSERT' ? 'bg-emerald-100 text-emerald-700' : 
                            log.acao === 'UPDATE' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {log.acao}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant">{log.tabela_afetada}</td>
                        <td className="py-3 px-4 font-mono text-[10px] truncate max-w-[200px]">
                          {JSON.stringify(log.dados_novos)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
