import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  AlertCircle, 
  Inbox, 
  CheckCircle2, 
  Briefcase,
  Bell,
  Settings,
  Calendar,
  Filter,
  Download,
  Building2,
  AlertTriangle,
  BellRing,
  X,
  LineChart,
  Landmark
} from 'lucide-react';
import { useLancamentos, useContas, useCentrosCusto, useFinancialSummary } from '../hooks/useData';
import { useUIStore } from '../store/uiStore';
import { useDragScroll } from '../hooks/useDragScroll';

export default function Dashboard() {
  const dragScrollAccounts = useDragScroll();
  const dragScrollTabs = useDragScroll();
  const { data: lancamentos = [], isLoading: loadingLancamentos } = useLancamentos();
  const { data: contas = [], isLoading: loadingContas } = useContas();
  const { data: centrosCusto = [] } = useCentrosCusto();
  const { data: summary, isLoading: loadingSummary } = useFinancialSummary();
  
  const { setActiveTab, setModalOpen } = useUIStore();

  // Seletor de Período State
  const [periodFilter, setPeriodFilter] = useState<'all' | '2023-10' | '2026-06'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showToast, setShowToast] = useState(true);

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

  // CALCULATION 1: Consolidated cash balance (initial balance of all accounts + master_confirmed launches)
  const totals = useMemo(() => {
    // Se o summary estiver disponível, usamos os dados do banco, senão calculamos localmente (fallback)
    const consolidatedBalance = summary?.consolidated_balance ?? 0;
    const simulatedBalance = summary?.simulated_balance ?? 0;
    const outPending = summary?.pending_payments ?? 0;

    // Inadimplência breakdowns
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
        consolidated: account.saldo_inicial + consolidatedChange,
        simulated: account.saldo_inicial + simulatedChange
      };
    });
  }, [contas, filteredLancamentos]);

  // Cost Center analysis (Receitas e Despesas por Centro de Custo)
  const costCenterBreakdown = useMemo(() => {
    return centrosCusto.map(cc => {
      const ccLaunches = filteredLancamentos.filter(l => l.centro_custo_id === cc.id);
      
      const entradas = ccLaunches
        .filter(l => l.tipo === 'entrada')
        .reduce((acc, l) => acc + l.valor_previsto, 0);

      const saidas = ccLaunches
        .filter(l => l.tipo === 'saida')
        .reduce((acc, l) => acc + l.valor_previsto, 0);

      const maxVal = Math.max(entradas, saidas, 1);

      return {
        ...cc,
        entradas,
        saidas,
        maxVal
      };
    });
  }, [centrosCusto, filteredLancamentos]);

  // Approval notifications metrics
  const pendingApprovalsCount = useMemo(() => {
    return lancamentos.filter(l => l.status_aprovacao !== 'confirmado_master').length;
  }, [lancamentos]);

  const valueFormatter = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleAlertClick = () => {
    setActiveTab('lancamentos');
  };

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
                onClick={() => setPeriodFilter('all')}
                className={`text-xs font-bold pb-1 sm:pb-2 pt-1 sm:pt-2 transition-colors border-b-2 shrink-0 whitespace-nowrap ${
                  periodFilter === 'all' 
                    ? 'text-primary border-primary' 
                    : 'text-secondary hover:text-primary border-transparent'
                }`}
              >
                Visão Geral
              </button>
              <button 
                type="button" 
                onClick={() => { setActiveTab('relatorios'); }}
                className="text-xs font-bold text-secondary hover:text-primary pb-1 sm:pb-2 pt-1 sm:pt-2 transition-colors border-b-2 border-transparent shrink-0 whitespace-nowrap"
              >
                Fluxo de Caixa
              </button>
              <button 
                type="button" 
                onClick={() => { setActiveTab('configuracoes'); }}
                className="text-xs font-bold text-secondary hover:text-primary pb-1 sm:pb-2 pt-1 sm:pt-2 transition-colors border-b-2 border-transparent shrink-0 whitespace-nowrap"
              >
                Auditoria
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Quick indicators */}
            <button className="text-secondary hover:text-primary relative p-1.5 rounded-full hover:bg-neutral-100 transition-colors">
              <Bell className="w-5 h-5" />
              {pendingApprovalsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-alert-red rounded-full" />
              )}
            </button>
            <button className="text-secondary hover:text-primary p-1.5 rounded-full hover:bg-neutral-100 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Filter Bar styled exactly like original HTML */}
        <section className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-surface p-4 rounded-lg border border-surface-border shadow-sm">
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-secondary mb-1">Período de Análise</span>
              <div className="flex items-center gap-2 border border-surface-border rounded-lg px-3 py-2 bg-surface">
                <Calendar className="w-5 h-5 text-secondary" />
                <input 
                  type="text" 
                  readOnly
                  value={periodFilter === 'all' ? 'Todo o Período' : periodFilter === '2023-10' ? 'Outubro 2023' : periodFilter === '2026-06' ? 'Junho 2026' : customStart ? `${customStart} até ${customEnd}` : 'Filtrar'}
                  className="bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 w-48 text-on-surface focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-medium text-secondary mb-1">Atalho</span>
              <select 
                value={periodFilter}
                onChange={(e) => {
                  setPeriodFilter(e.target.value as any);
                  if (e.target.value !== 'custom') {
                    setCustomStart('');
                    setCustomEnd('');
                  }
                }}
                className="border border-surface-border rounded-lg px-3 py-2 bg-surface text-sm font-semibold focus:ring-2 focus:ring-primary-container outline-none min-w-[140px] text-on-surface cursor-pointer"
              >
                <option value="all">Este Mês</option>
                <option value="2023-10">Mês Passado</option>
                <option value="2026-06">Últimos 90 dias</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-surface-border rounded-lg text-sm font-semibold text-secondary hover:bg-neutral-50 transition-all">
              <Filter className="w-5 h-5 text-secondary" />
              Filtros Avançados
            </button>
            <button 
              onClick={() => alert('Download do relatório em formato CSV iniciado.')}
              className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-neutral-700 text-white rounded-lg text-sm font-semibold transition-all"
            >
              <Download className="w-5 h-5" />
              Exportar CSV
            </button>
          </div>
        </section>
      </div>

      {/* Main KPIs Row (Three Cards styled exactly like original HTML) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-bank-truth-green"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Saldo Atual Consolidado</span>
            <Landmark className="w-5 h-5 text-bank-truth-green" />
          </div>
          <h3 className="text-2xl font-bold font-mono text-on-surface">
            {valueFormatter(totals.consolidatedBalance)}
          </h3>
          <p className="text-xs font-semibold text-bank-truth-green mt-2 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            +4.2% em relação a ontem
          </p>
        </div>

        {/* Card 2 */}
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

        {/* Card 3 */}
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

      {/* Account Balances Row (Scrollable Row exactly like original HTML) */}
      <section className="space-y-4">
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

      {/* Analytics (Row 3 - Bar Chart & Circular Donut Chart exactly like original HTML) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Bar Chart: Receitas e Despesas */}
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
              const ccNameStr = cc.nome;
              let ccEntrada = cc.entradas;
              let ccSaida = cc.saidas;

              // Find maximum value to normalize
              const maxGlobal = costCenterBreakdown.length > 0 ? Math.max(...costCenterBreakdown.map(c => Math.max(c.entradas, c.saidas, 1))) : 1;
              const maxLimit = maxGlobal * 1.1; // Add 10% headroom

              const rPct = Math.min((ccEntrada / maxLimit) * 100, 100);
              const dPct = Math.min((ccSaida / maxLimit) * 100, 100);

              return (
                <div key={cc.id || i} className="flex flex-col items-center gap-1 flex-1 h-full justify-end group">
                  <div className="w-full flex justify-center items-end gap-1.5 px-1 sm:px-2 h-44">
                    {/* Receitas */}
                    <div 
                      className="bg-bank-truth-green w-6 sm:w-8 rounded-t-sm relative transition-all duration-300 hover:opacity-90 cursor-pointer"
                      style={{ height: `${Math.max(rPct, 5)}%` }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-neutral-900 text-white text-[10px] px-2 py-1 rounded transition-opacity shadow-md pointer-events-none whitespace-nowrap z-10 font-bold">
                        {valueFormatter(ccEntrada)}
                      </div>
                    </div>
                    {/* Despesas */}
                    <div 
                      className="bg-alert-red w-6 sm:w-8 rounded-t-sm relative transition-all duration-300 hover:opacity-90 cursor-pointer"
                      style={{ height: `${Math.max(dPct, 5)}%` }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-neutral-900 text-white text-[10px] px-2 py-1 rounded transition-opacity shadow-md pointer-events-none whitespace-nowrap z-10 font-bold">
                        {valueFormatter(ccSaida)}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-secondary mt-2">
                    {ccNameStr}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Composição da Carteira: Styled circular donut layout matching image */}
        <div className="bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm flex flex-col h-full">
          <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface mb-6">
            Composição da Carteira
          </h4>
          
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            {/* Styled Circular Donut Meter */}
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

            {/* Legend List */}
            <div className="mt-8 grid grid-cols-1 gap-3 w-full border-t border-surface-border pt-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-bank-truth-green"></span>
                  <span className="text-sm font-medium text-secondary">Pagos</span>
                </div>
                <span className="font-mono text-sm font-bold">85%</span>
              </div>
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-alert-red"></span>
                  <span className="text-sm font-medium text-secondary">Atrasados</span>
                </div>
                <span className="font-mono text-sm font-bold">10%</span>
              </div>
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#FFA000]"></span>
                  <span className="text-sm font-medium text-secondary">BPI</span>
                </div>
                <span className="font-mono text-sm font-bold">5%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Action/Alert Card exactly like original HTML */}
      {showToast && pendingApprovalsCount > 0 && (
        <div className="fixed bottom-8 right-8 z-40 animate-bounce hover:animate-none">
          <div className="bg-white dark:bg-surface p-4 rounded-2xl border-2 border-primary shadow-xl flex items-center gap-4 max-w-sm relative">
            <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center shrink-0">
              <BellRing className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-on-surface uppercase">Ação Requerida</h5>
              <p className="text-xs text-secondary font-semibold mt-0.5">
                {pendingApprovalsCount} lançamentos pendentes de aprovação
              </p>
              <button 
                onClick={handleAlertClick}
                className="mt-2 w-full py-2 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold uppercase tracking-tight hover:brightness-95 transition-all"
              >
                Ver Lançamentos
              </button>
            </div>
            
            <button 
              onClick={() => setShowToast(false)}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-neutral-200 hover:bg-neutral-300 flex items-center justify-center text-secondary hover:text-on-surface transition-colors shadow-sm"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
