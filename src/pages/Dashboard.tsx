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
  Clock,
  RefreshCw,
  Eye,
  User,
  X
} from 'lucide-react';
import { useLancamentos, useContas, useCentrosCusto, useAuditoriaLogs, useEntidades } from '../hooks/useData';
import { useUIStore } from '../store/uiStore';
import { useDragScroll } from '../hooks/useDragScroll';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const dragScrollAccounts = useDragScroll();
  const dragScrollTabs = useDragScroll();

  const [currentTab, setCurrentTab] = useState<'general' | 'cashflow' | 'audit'>('general');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedCCId, setSelectedCCId] = useState<string | null>(null);

  const { data: lancamentos = [], isLoading: loadingLancamentos } = useLancamentos();
  const { data: rawContas = [], isLoading: loadingContas } = useContas();
  const { data: rawCentrosCusto = [] } = useCentrosCusto();
  const { data: auditoriaLogs = [], refetch: refetchAudit, isFetching: fetchingAudit } = useAuditoriaLogs();
  const { data: entidades = [] } = useEntidades();

  const contas = useMemo(() => rawContas.filter((c: any) => c.status !== 'excluido'), [rawContas]);
  const centrosCusto = useMemo(() => rawCentrosCusto.filter((c: any) => c.status !== 'excluido'), [rawCentrosCusto]);

  // Detail modal state for audit
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.rpc('get_dashboard_stats', { p_user_id: user.id });
      if (error) throw error;
      return data;
    }
  });
  
  const { setModalOpen, setActiveTab } = useUIStore();

  const [periodFilter, setPeriodFilter] = useState<'all' | 'este-mes' | '2023-10' | '2026-06' | '90-dias'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter(item => {
      if (periodFilter === 'este-mes') {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return item.data_vencimento.startsWith(yearMonth);
      }
      if (periodFilter === '90-dias') {
        const now = new Date();
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(now.getDate() - 90);
        const dateStr = item.data_vencimento;
        const launchDate = new Date(dateStr);
        return launchDate >= ninetyDaysAgo && launchDate <= now;
      }
      if (periodFilter === '2023-10') return item.data_vencimento.startsWith('2023-10');
      if (periodFilter === '2026-06') return item.data_vencimento.startsWith('2026-06');
      if (customStart && customEnd) return item.data_vencimento >= customStart && item.data_vencimento <= customEnd;
      return true;
    });
  }, [lancamentos, periodFilter, customStart, customEnd]);

  const valueFormatter = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const totals = useMemo(() => {
    const paidSum = filteredLancamentos.filter(l => l.status_pagamento === 'pago').length;
    const unpaidSum = filteredLancamentos.filter(l => l.status_pagamento === 'aberto').length;
    const bpiSum = filteredLancamentos.filter(l => l.status_pagamento === 'bpi').length;
    const totalStatusCount = paidSum + unpaidSum + bpiSum || 1;

    return {
      paidPercent: Math.round((paidSum / totalStatusCount) * 100),
      unpaidPercent: Math.round((unpaidSum / totalStatusCount) * 100),
      bpiPercent: Math.round((bpiSum / totalStatusCount) * 100),
      paidCount: paidSum,
      unpaidCount: unpaidSum,
      bpiCount: bpiSum
    };
  }, [filteredLancamentos]);

  const accountsBalances = useMemo(() => {
    return contas.map(account => {
      const accLaunches = lancamentos.filter(l => l.conta_bancaria_id === account.id);
      const consolidatedChange = accLaunches
        .filter(l => l.status_pagamento === 'pago' || l.status_aprovacao === 'confirmado_master')
        .reduce((acc, item) => item.tipo === 'entrada' ? acc + item.valor_previsto : acc - item.valor_previsto, 0);
      return { ...account, consolidated: (account.saldo_inicial || 0) + consolidatedChange };
    });
  }, [contas, lancamentos]);

  const costCenterBreakdown = useMemo(() => {
    return centrosCusto.map(cc => {
      const ccLaunches = filteredLancamentos.filter(l => l.centro_custo_id === cc.id);
      const entradas = ccLaunches.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor_previsto, 0);
      const saidas = ccLaunches.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor_previsto, 0);
      return { ...cc, entradas, saidas };
    });
  }, [centrosCusto, filteredLancamentos]);

  if (loadingLancamentos || loadingContas || loadingStats) {
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border/50 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-primary uppercase">Dashboard Real-Time</h1>
            <div className="h-6 w-px bg-surface-border hidden sm:block" />
            <nav ref={dragScrollTabs.ref} {...dragScrollTabs.props} className="flex gap-4 sm:gap-6 select-none overflow-x-auto scrollbar-none whitespace-nowrap scroll-smooth pb-0.5">
              <button type="button" onClick={() => setCurrentTab('general')} className={`text-xs font-bold pb-2 transition-colors border-b-2 ${currentTab === 'general' ? 'text-primary border-primary' : 'text-secondary hover:text-primary border-transparent'}`}>Visão Geral</button>
              <button type="button" onClick={() => setCurrentTab('cashflow')} className={`text-xs font-bold pb-2 transition-colors border-b-2 ${currentTab === 'cashflow' ? 'text-primary border-primary' : 'text-secondary hover:text-primary border-transparent'}`}>Fluxo de Caixa</button>
              <button type="button" onClick={() => setCurrentTab('audit')} className={`text-xs font-bold pb-2 transition-colors border-b-2 ${currentTab === 'audit' ? 'text-primary border-primary' : 'text-secondary hover:text-primary border-transparent'}`}>Auditoria</button>
            </nav>
          </div>
        </div>

        {currentTab === 'general' && (
          <>
            <section className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-surface p-4 rounded-lg border border-surface-border shadow-sm animate-fade-in">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col"><span className="text-xs font-medium text-secondary mb-1">Seletor de Período</span><div className="flex items-center gap-2 border border-surface-border rounded-lg px-3 py-2 bg-surface"><Calendar className="w-5 h-5 text-secondary" /><select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value as any)} className="bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 w-48 text-on-surface outline-none cursor-pointer"><option value="all">Todo o Período</option><option value="este-mes">Este Mês</option><option value="2023-10">Outubro 2023</option><option value="2026-06">Junho 2026</option></select></div></div>
              </div>
              <button onClick={() => {
                const headers = 'KPI,Valor\n';
                const rows = [['Saldo Consolidado', valueFormatter(stats?.total_consolidado || 0)], ['Expectativa Final', valueFormatter(stats?.total_simulado || 0)], ['Pendentes Master', valueFormatter(stats?.total_pendente_master || 0)]].map(r => r.join(',')).join('\n');
                const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'dashboard_real.csv'; link.click();
              }} className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-neutral-700 text-white rounded-lg text-sm font-semibold transition-all"><Download className="w-5 h-5" /> Exportar CSV</button>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
              <div className="bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-bank-truth-green"></div>
                <div className="flex justify-between items-start mb-4"><span className="text-xs font-bold text-secondary uppercase tracking-wider">Saldo Atual Consolidado</span><Landmark className="w-5 h-5 text-bank-truth-green" /></div>
                <h3 className="text-2xl font-bold font-mono text-on-surface">{valueFormatter(stats?.total_consolidado || 0)}</h3>
                <div className="text-xs font-semibold mt-2 text-bank-truth-green flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Dados em tempo real</div>
              </div>
              <div className="bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                <div className="flex justify-between items-start mb-4"><span className="text-xs font-bold text-secondary uppercase tracking-wider">Expectativa Final</span><LineChart className="w-5 h-5 text-primary" /></div>
                <h3 className="text-2xl font-bold font-mono text-on-surface">{valueFormatter(stats?.total_simulado || 0)}</h3>
                <p className="text-xs text-secondary mt-2">Cenário previsto para final do período</p>
              </div>
              <div className="bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#FFA000]"></div>
                <div className="flex justify-between items-start mb-4"><span className="text-xs font-bold text-secondary uppercase tracking-wider">Pendentes Master</span><AlertTriangle className="w-5 h-5 text-[#FFA000]" /></div>
                <h3 className="text-2xl font-bold font-mono text-on-surface">{valueFormatter(stats?.total_pendente_master || 0)}</h3>
                <p className="text-xs text-[#FFA000] mt-2 font-semibold">Aguardando aprovação</p>
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-secondary flex items-center gap-2"><Building2 className="w-5 h-5 text-secondary" /> SALDO POR CONTA</h4>
              <div ref={dragScrollAccounts.ref} {...dragScrollAccounts.props} className="flex gap-4 overflow-x-auto pb-2 scroll-smooth select-none">
                {accountsBalances.map((acc, i) => (
                  <div key={acc.id} className="flex-shrink-0 w-64 bg-white dark:bg-surface p-4 border border-surface-border rounded-lg flex items-center justify-between group cursor-pointer hover:border-primary transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary uppercase">{(acc.nome || '').substring(0, 2)}</div>
                      <div><p className="text-sm font-bold text-on-surface truncate w-24">{acc.nome}</p><p className="text-xs text-secondary">{acc.agencia} {acc.conta}</p></div>
                    </div>
                    <p className="text-sm font-bold font-mono text-on-surface">{valueFormatter(acc.consolidated || 0)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              <div className="lg:col-span-2 bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm">
                <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface mb-6">Performance por Centro de Custo</h4>
                <div className="relative h-64 w-full flex items-end justify-around gap-2 px-4 border-b border-surface-border pt-10">
                  {costCenterBreakdown.map((cc, i) => {
                    const maxVal = Math.max(...costCenterBreakdown.map(c => Math.max(c.entradas, c.saidas, 1))) * 1.1;
                    return (
                      <div key={cc.id} className="flex flex-col items-center gap-1 flex-1 h-full justify-end group">
                        <div className="w-full flex justify-center items-end gap-1.5 h-44">
                          <div className="bg-bank-truth-green w-6 rounded-t-sm relative transition-all duration-300" style={{ height: `${(cc.entradas / maxVal) * 100}%` }} />
                          <div className="bg-alert-red w-6 rounded-t-sm relative transition-all duration-300" style={{ height: `${(cc.saidas / maxVal) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-secondary mt-2 truncate max-w-full">{cc.nome}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm flex flex-col h-full">
                <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface mb-6">Status da Carteira</h4>
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                  <div className="relative w-40 h-40 rounded-full border-[16px] border-neutral-100 flex items-center justify-center">
                    <div className="text-center"><p className="text-2xl font-black text-on-surface">100%</p><p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Base Real</p></div>
                  </div>
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs font-bold"><span>Pagos</span><span className="text-bank-truth-green">{totals.paidPercent}%</span></div>
                    <div className="flex justify-between text-xs font-bold"><span>Atrasados</span><span className="text-alert-red">{totals.unpaidPercent}%</span></div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {currentTab === 'cashflow' && (
          <section className="bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm animate-fade-in">
             <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface">Histórico Recente de Fluxo</h4>
              <button
                onClick={() => { setActiveTab('lancamentos'); window.scrollTo(0, 0); }}
                className="text-xs font-black text-primary hover:underline uppercase tracking-widest"
              >
                Ver Tudo →
              </button>
            </div>
             <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-neutral-50 text-neutral-400 border-b border-neutral-100 text-[9px] font-black uppercase tracking-widest"><th className="py-4 px-8">Data</th><th className="py-4 px-8">Descrição</th><th className="py-4 px-8">Entidade</th><th className="py-4 px-8 text-right">Valor</th></tr></thead>
                <tbody className="text-[11px] font-bold">
                  {lancamentos.slice(0, 50).map(l => (
                    <tr key={l.id} className="border-b border-neutral-50 hover:bg-neutral-50">

                      <td className="py-4 px-8 font-mono">{l.data_vencimento.split('-').reverse().join('/')}</td>
                      <td className="py-4 px-8 uppercase">{l.observacoes || 'Lançamento'}</td>
                      <td className="py-4 px-8">{entidades.find(e => e.id === l.entidade_id)?.nome_razao_social || '-'}</td>
                      <td className={`py-4 px-8 text-right font-black ${l.tipo === 'saida' ? 'text-alert-red' : 'text-bank-truth-green'}`}>{valueFormatter(l.valor_previsto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {currentTab === 'audit' && (
          <section className="bg-white dark:bg-surface p-6 rounded-xl border border-surface-border shadow-sm animate-fade-in relative">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface">Rastro de Auditoria</h4>
              <button
                onClick={() => refetchAudit()}
                disabled={fetchingAudit}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${fetchingAudit ? 'animate-spin' : ''}`} />
                Atualizar Dados
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-400 border-b border-neutral-100 text-[9px] font-black uppercase tracking-widest">
                    <th className="py-4 px-8">Data/Hora</th>
                    <th className="py-4 px-8">Usuário</th>
                    <th className="py-4 px-8">Ação Realizada</th>
                    <th className="py-4 px-8">Módulo</th>
                    <th className="py-4 px-8 text-right">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-bold">
                  {auditoriaLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-secondary opacity-40 uppercase tracking-widest text-[10px]">Nenhum log registrado ainda</td>
                    </tr>
                  ) : (
                    auditoriaLogs.slice(0, 50).map(log => (
                      <tr key={log.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">

                        <td className="py-4 px-8 font-mono text-secondary">
                          {new Date(log.data_hora).toLocaleDateString()} {new Date(log.data_hora).toLocaleTimeString()}
                        </td>
                        <td className="py-4 px-8">
                          <div className="flex flex-col">
                            <span className="text-on-surface uppercase">{log.profiles?.nome || 'Sistema'}</span>
                            <span className="text-[9px] text-secondary font-medium">{log.profiles?.email || 'automático'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-8">
                          <span className={`px-2 py-1 rounded text-[9px] uppercase font-black ${
                            log.acao.includes('Aprovação') ? 'bg-bank-truth-green/10 text-bank-truth-green' :
                            log.acao.includes('Exclusão') ? 'bg-alert-red/10 text-alert-red' :
                            log.acao.includes('Novo') ? 'bg-blue-50 text-blue-600' : 'bg-neutral-100 text-neutral-600'
                          }`}>
                            {log.acao}
                          </span>
                        </td>
                        <td className="py-4 px-8 uppercase text-secondary/60 text-[10px]">{log.tabela_afetada.replace('_', ' ')}</td>
                        <td className="py-4 px-8 text-right">
                          <button
                            onClick={() => setSelectedAuditLog(log)}
                            className="p-2 text-secondary hover:text-primary transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Simple Detail Modal */}
            {selectedAuditLog && (
              <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-surface-border">
                  <header className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-neutral-50">
                    <h3 className="text-xs font-black uppercase tracking-widest">Detalhes da Auditoria</h3>
                    <button onClick={() => setSelectedAuditLog(null)} className="p-2 hover:bg-neutral-200 rounded-lg"><X className="w-5 h-5" /></button>
                  </header>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-secondary uppercase">Ação</p>
                        <p className="text-xs font-bold">{selectedAuditLog.acao}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-secondary uppercase">Horário</p>
                        <p className="text-xs font-bold">{new Date(selectedAuditLog.data_hora).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-secondary uppercase">Usuário Responsável</p>
                      <div className="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                        <User className="w-4 h-4 text-secondary" />
                        <span className="text-xs font-bold">{selectedAuditLog.profiles?.nome} ({selectedAuditLog.profiles?.email})</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-secondary uppercase">Alterações Detectadas</p>
                      <div className="p-4 bg-neutral-900 rounded-xl font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-48 scrollbar-thin">
                        <pre>{JSON.stringify({
                          de: selectedAuditLog.dados_anteriores,
                          para: selectedAuditLog.dados_novos
                        }, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                  <footer className="px-6 py-4 border-t border-surface-border bg-neutral-50 flex justify-end">
                    <button onClick={() => setSelectedAuditLog(null)} className="px-6 py-2 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">Fechar</button>
                  </footer>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
