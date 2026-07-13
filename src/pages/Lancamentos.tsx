import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  MoreVertical,
  Plus,
  Trash2,
  Edit3,
  Check,
  Download,
  X,
  AlertOctagon,
  Loader2,
  Calendar,
  Filter,
  ChevronRight,
  Eraser,
  CheckCircle2,
  Clock,
  Landmark,
  Banknote
} from 'lucide-react';

import { useLancamentos, useContas, useEntidades, useCategorias } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { useUIStore } from '../store/uiStore';
import { useDragScroll } from '../hooks/useDragScroll';
import { LancamentoFinanceiro } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import Button from '../components/Button';

interface LancamentosProps {
  typeOverride?: 'entrada' | 'saida';
  titleOverride?: string;
}

export default function Lancamentos({ typeOverride, titleOverride }: LancamentosProps) {
  const { role } = useAuth();
  const dragScrollAccounts = useDragScroll();
  // Filter States

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  
  // Track active shortcut

  const [activeShortcut, setActiveShortcut] = useState<number | 'este-mes' | null>(15);

  // Set default filter to last 15 days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [approvalStatus, setApprovalStatus] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entrada' | 'saida'>(typeOverride || 'all');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Sync typeFilter if typeOverride changes
  useEffect(() => {
    if (typeOverride) {
      setTypeFilter(typeOverride);
    }
  }, [typeOverride]);

  const hasActiveFilters = searchTerm !== '' || approvalStatus !== 'all' || typeFilter !== 'all';

  // Quick select for periods
  const handleQuickPeriod = (days: number | 'este-mes') => {
    const end = new Date();
    const start = new Date();
    
    if (days === 'este-mes') {
      start.setDate(1);
    } else {
      start.setDate(end.getDate() - (days as number));
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setActiveShortcut(days);
  };

  const clearFiltersShortcut = () => {
    setSearchTerm('');
    handleQuickPeriod(15);
    setApprovalStatus('all');
    setTypeFilter('all');
    setSelectedIds([]);
    setSelectedAccountId(null);
  };

  // Query Hooks with server-side filters
  const {
    data: allLancamentos = [],
    updateLancamento,
    deleteLancamento,
    batchApprove,
    estornarLancamento,
    isUpdating,
    isDeleting,
    isBatchApproving,
    isLoading
  } = useLancamentos({

    searchTerm,
    startDate,
    endDate,
    approvalStatus,
    type: typeFilter === 'all' ? undefined : typeFilter
  });

  // Client-side filtering for Account Card selection
  const lancamentos = useMemo(() => {
    if (!selectedAccountId) return allLancamentos;
    return allLancamentos.filter(l => l.conta_bancaria_id === selectedAccountId);
  }, [allLancamentos, selectedAccountId]);
  
  const { data: rawContas = [] } = useContas();
  const { data: entidades = [] } = useEntidades();
  const { data: categorias = [] } = useCategorias();

  // For dropdowns, use active only
  const activeContas = useMemo(() => rawContas.filter((c: any) => c.status !== 'excluido'), [rawContas]);

  // Calculate Real Balance for cards
  const accountsWithBalances = useMemo(() => {
    return activeContas.map(conta => {
      const lancamentosDaConta = allLancamentos.filter(l => l.conta_bancaria_id === conta.id && l.status_pagamento === 'pago');
      
      const totalEntradas = lancamentosDaConta
        .filter(l => l.tipo === 'entrada')
        .reduce((sum, l) => sum + (l.valor_recebido || 0), 0);
        
      const totalSaidas = lancamentosDaConta
        .filter(l => l.tipo === 'saida')
        .reduce((sum, l) => sum + (l.valor_recebido || 0), 0);
        
      const saldoReal = (conta.saldo_inicial || 0) + totalEntradas - totalSaidas;
      
      return {
        ...conta,
        saldo_real: saldoReal
      };
    });
  }, [activeContas, allLancamentos]);

  // Zustand Store

  const { 
    setModalOpen,
    setSelectedLancamentoIdForModal,
    setLancamentoFormDraft,
    setSelectedRecorrenciaAction
  } = useUIStore();

  // Checkbox Selection State for Batch Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Row action dropdown active state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Recurrency interceptor local dialog state
  const [interceptorTarget, setInterceptorTarget] = useState<LancamentoFinanceiro | null>(null);
  const [interceptorType, setInterceptorType] = useState<'edit' | 'delete' | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Resolve Names
  const getEntidadeName = (id: string) => {
    return entidades.find(e => e.id === id)?.nome_razao_social || 'Entidade Desconhecida';
  };

  const getCategoriaName = (id: string) => {
    return categorias.find(c => c.id === id)?.nome || 'Sem Categoria';
  };

  const getContaName = (id: string) => {
    return rawContas.find(c => c.id === id)?.nome_banco || 'Sem Conta';
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Pagination logic
  const groupedLancamentos = useMemo(() => {
    const groups: { date: string, items: LancamentoFinanceiro[] }[] = [];
    
    // Sort all by created_at desc (already handled in service)
    // But here we need to group them by data_vencimento for the visual separators
    // Let's preserve the main order but group consecutive items of the same date
    lancamentos.forEach(item => {
      const date = item.data_vencimento;
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === date) {
        lastGroup.items.push(item);
      } else {
        groups.push({ date, items: [item] });
      }
    });
    
    return groups;
  }, [lancamentos]);

  const paginatedGroups = useMemo(() => {
    const flatList: (string | LancamentoFinanceiro)[] = [];
    groupedLancamentos.forEach(group => {
      flatList.push(group.date);
      group.items.forEach(item => flatList.push(item));
    });

    const startIdx = (currentPage - 1) * itemsPerPage * 2; // Rough estimate since titles aren't items
    // Actually pagination is tricky with groups. Let's paginate the raw list and group the result.
    const start = (currentPage - 1) * itemsPerPage;
    const slice = lancamentos.slice(start, start + itemsPerPage);
    
    const result: { date: string, items: LancamentoFinanceiro[] }[] = [];
    slice.forEach(item => {
      const date = item.data_vencimento;
      const lastGroup = result[result.length - 1];
      if (lastGroup && lastGroup.date === date) {
        lastGroup.items.push(item);
      } else {
        result.push({ date, items: [item] });
      }
    });
    return result;
  }, [lancamentos, currentPage, itemsPerPage]);

  const totalPages = Math.max(Math.ceil(lancamentos.length / itemsPerPage), 1);

  // Checkbox Handlers
  const handleSelectAll = (checked: boolean) => {
    const currentPageItems = paginatedGroups.flatMap(g => g.items);
    if (checked) {
      setSelectedIds(currentPageItems.map(l => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  // Batch action promoter
  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      await batchApprove({ ids: selectedIds, targetStatus: 'confirmado_master' });
      setSelectedIds([]);
      alert('Lançamentos selecionados aprovados por nível Master com sucesso!');
    } catch (e: any) {
      alert('Erro ao processar aprovações: ' + e.message);
    }
  };

  // Export CSV logic
  const handleExportCSV = () => {
    const headers = 'ID,Tipo,Vencimento,Emissao,Entidade,Categoria,Conta,Valor,StatusAproc,StatusPag\n';
    const csvContent = lancamentos.map(l => {
      const ent = getEntidadeName(l.entidade_id);
      const cat = getCategoriaName(l.categoria_id);
      const con = getContaName(l.conta_bancaria_id);
      return `"${l.id}","${l.tipo}","${l.data_vencimento}","${l.data_emissao}","${ent}","${cat}","${con}",${l.valor_previsto},"${l.status_aprovacao}","${l.status_pagamento}"`;
    }).join('\n');

    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'lancamentos_gestao360.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Action Menu Trigger helper
  const handleActionMenuToggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(prev => (prev === id ? null : id));
  };

  // Single edit trigger
  const handleEditClick = (item: LancamentoFinanceiro) => {
    setActiveMenuId(null);
    if (item.recorrencia_id) {
      setInterceptorTarget(item);
      setInterceptorType('edit');
    } else {
      setSelectedLancamentoIdForModal(item.id);
      setModalOpen('isNovoLancamentoOpen', true);
    }
  };

  // Single delete trigger
  const handleDeleteClick = (item: LancamentoFinanceiro) => {
    setActiveMenuId(null);
    if (item.recorrencia_id) {
      setInterceptorTarget(item);
      setInterceptorType('delete');
    } else {
      if (confirm('Tem certeza de que deseja excluir este lançamento?')) {
        deleteLancamento({ id: item.id });
      }
    }
  };

  // Interceptor Confirm execution
  const executeInterceptorAction = async (mode: 'single' | 'all') => {
    if (!interceptorTarget || !interceptorType) return;
    
    const target = interceptorTarget;
    setInterceptorTarget(null);
    setInterceptorType(null);

    if (interceptorType === 'delete') {
      try {
        await deleteLancamento({ id: target.id, mode });
        alert(mode === 'all' ? 'Esta e todas as parcelas futuras foram excluídas.' : 'Apenas esta parcela foi excluída.');
      } catch (err: any) {
        alert('Erro ao deletar: ' + err.message);
      }
    } else if (interceptorType === 'edit') {
      setSelectedRecorrenciaAction(mode);
      
      setSelectedLancamentoIdForModal(target.id);
      setModalOpen('isNovoLancamentoOpen', true);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    handleQuickPeriod(15);
    setApprovalStatus('all');
    setTypeFilter('all');
    setSelectedIds([]);
  };

  const valueFormatter = (l: LancamentoFinanceiro) => {
    const val = l.valor_previsto;
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    return l.tipo === 'saida' ? `-${formatted}` : formatted;
  };

  return (
    <div className="space-y-6 relative" onClick={() => setActiveMenuId(null)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-bold tracking-tight text-on-surface uppercase">
            {titleOverride || 'Gestão de Lançamentos'}
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1 font-medium">
            {typeOverride === 'saida'
              ? 'Gerencie e liquide suas obrigações financeiras.'
              : typeOverride === 'entrada'
                ? 'Monitore e confirme o recebimento de valores.'
                : 'Gerencie e aprove operações financeiras com precisão.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => handleExportCSV()}
          >
            Exportar CSV
            <Download className="w-4 h-4" />
          </Button>
          {role === 'master' && (
            <Button
              onClick={() => handleBatchApprove()}
              disabled={selectedIds.length === 0 || isBatchApproving}
            >
              Aprovar ({selectedIds.length})
            </Button>
          )}

        </div>

      </div>

      {/* Account Balance Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-secondary flex items-center gap-2">
            <Landmark className="w-4 h-4" /> Saldos Reais por Conta
          </h4>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedAccountId(null)}
              className={`text-[9px] font-black uppercase tracking-widest transition-all ${
                !selectedAccountId ? 'text-primary' : 'text-secondary hover:text-primary'
              }`}
            >
              Todas as Contas
            </button>
            {selectedAccountId && (
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            )}
          </div>
        </div>
        <div ref={dragScrollAccounts.ref} {...dragScrollAccounts.props} className="flex gap-4 overflow-x-auto pb-4 scrollbar-none select-none px-0.5">
          {/* Card Todas as Contas */}
          <div
            onClick={() => setSelectedAccountId(null)}
            className={`flex-shrink-0 w-48 bg-white dark:bg-surface p-4 border-2 rounded-2xl flex items-center justify-between group cursor-pointer transition-all ${
              selectedAccountId === null
                ? 'border-primary ring-4 ring-primary/5 shadow-xl scale-[1.02]'
                : 'border-surface-border hover:border-neutral-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                selectedAccountId === null ? 'bg-primary' : 'bg-neutral-50'
              }`}>
                <Landmark className={`w-5 h-5 ${selectedAccountId === null ? 'text-white' : 'text-secondary'}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-black font-mono transition-colors ${
                  selectedAccountId === null ? 'text-primary' : 'text-on-surface'
                }`}>
                  {formatCurrency(accountsWithBalances.reduce((sum, acc) => sum + (acc.saldo_real || 0), 0))}
                </p>
              </div>
            </div>
          </div>

          {accountsWithBalances.map((acc) => (
            <div
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id === selectedAccountId ? null : acc.id)}
              className={`flex-shrink-0 w-48 bg-white dark:bg-surface p-4 border-2 rounded-2xl flex items-center justify-between group cursor-pointer transition-all ${
                selectedAccountId === acc.id
                  ? 'border-primary ring-4 ring-primary/5 shadow-xl scale-[1.02]'
                  : 'border-surface-border hover:border-neutral-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-all ${
                  selectedAccountId === acc.id ? 'bg-primary' : 'bg-neutral-50'
                }`}>
                  {acc.logo_url ? (
                    <img src={acc.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Banknote className={`w-5 h-5 ${selectedAccountId === acc.id ? 'text-white' : 'text-secondary'}`} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-black font-mono transition-colors ${
                    selectedAccountId === acc.id ? 'text-primary' : 'text-on-surface'
                  }`}>
                    {formatCurrency(acc.saldo_real || 0)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Unified Search & Filters Bar */}

      <div className="bg-white dark:bg-surface border border-surface-border p-4 rounded-xl shadow-sm flex items-center gap-4">
        <div className="flex-1 relative group">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Buscar por entidade, documento ou observação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-surface border border-surface-border text-sm font-semibold rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-secondary/40"
          />
        </div>

        <div className="flex items-center gap-2 relative">
          {hasActiveFilters && (
            <button
              onClick={clearFiltersShortcut}
              className="absolute -top-7 right-0 flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all"
            >
              <Eraser className="w-3 h-3" />
              Limpar Filtros
            </button>
          )}

          <button
            onClick={() => setIsFilterPanelOpen(true)}
            className={`flex items-center gap-2 px-4 h-11 rounded-lg text-xs font-bold transition-all border ${
              isFilterPanelOpen || hasActiveFilters
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-secondary border-surface-border hover:bg-neutral-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros Avançados
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-white rounded-full ml-1 animate-pulse"></span>
            )}
          </button>
        </div>

      </div>

      {/* Filter Slide Panel */}
      <AnimatePresence>
        {isFilterPanelOpen && (
          <div className="fixed inset-0 z-[200] flex justify-end overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterPanelOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full md:w-[400px] h-full bg-white shadow-2xl flex flex-col relative z-20"
            >
              <header className="px-6 py-5 border-b border-surface-border flex items-center justify-between bg-neutral-50/50">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Filtros Avançados</h2>
                </div>
                <button
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-secondary" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Atalhos de Período */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Atalhos de Período
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleQuickPeriod(15)}
                      className={`px-3 py-2 border rounded-lg text-[10px] font-bold uppercase transition-all ${
                        activeShortcut === 15 ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-secondary'
                      }`}
                    >
                      Últimos 15 dias
                    </button>
                    <button
                      onClick={() => handleQuickPeriod(30)}
                      className={`px-3 py-2 border rounded-lg text-[10px] font-bold uppercase transition-all ${
                        activeShortcut === 30 ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-secondary'
                      }`}
                    >
                      Últimos 30 dias
                    </button>
                    <button
                      onClick={() => handleQuickPeriod(60)}
                      className={`px-3 py-2 border rounded-lg text-[10px] font-bold uppercase transition-all ${
                        activeShortcut === 60 ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-secondary'
                      }`}
                    >
                      Últimos 60 dias
                    </button>
                    <button
                      onClick={() => handleQuickPeriod('este-mes')}
                      className={`px-3 py-2 border rounded-lg text-[10px] font-bold uppercase transition-all ${
                        activeShortcut === 'este-mes' ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-secondary'
                      }`}
                    >
                      Este Mês
                    </button>
                  </div>
                </div>

                {/* Período de Vencimento */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Período de Vencimento
                  </label>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-secondary/60 uppercase">De:</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full h-11 px-4 bg-neutral-50 border border-surface-border text-xs font-bold rounded-lg text-on-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-secondary/60 uppercase">Até:</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full h-11 px-4 bg-neutral-50 border border-surface-border text-xs font-bold rounded-lg text-on-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Status de Aprovação */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Status de Aprovação
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {['all', 'pendente_digital', 'digital', 'confirmado_master'].map(status => (
                      <button
                        key={status}
                        onClick={() => setApprovalStatus(status)}
                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all text-left flex items-center justify-between ${
                          approvalStatus === status
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-neutral-100 bg-neutral-50 text-secondary hover:border-neutral-200'
                        }`}
                      >
                        {status === 'all' ? 'Todos os Status' : status.replace('_', ' ')}
                        {approvalStatus === status && <div className="w-2 h-2 bg-primary rounded-full" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tipo de Movimentação */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4" /> Tipo de Movimentação
                  </label>
                  <div className="flex bg-neutral-100 border border-neutral-200 rounded-xl p-1 w-full">
                    {['all', 'entrada', 'saida'].map(type => (
                      <button
                        key={type}
                        onClick={() => setTypeFilter(type as any)}
                        className={`flex-1 py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${
                          typeFilter === type
                            ? 'bg-white text-on-background shadow-sm'
                            : 'text-secondary hover:text-on-surface'
                        }`}
                      >
                        {type === 'all' ? 'Todos' : type === 'entrada' ? 'Entradas' : 'Saídas'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <footer className="p-6 border-t border-surface-border bg-neutral-50/50 flex flex-col gap-3">
                <button
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="w-full h-12 bg-neutral-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-black transition-all shadow-lg active:scale-[0.98]"
                >
                  Aplicar Filtros
                </button>
                <button
                  onClick={() => { clearFiltersShortcut(); setIsFilterPanelOpen(false); }}
                  className="w-full h-12 border-2 border-neutral-200 text-secondary font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-neutral-50 transition-all"
                >
                  Limpar Tudo
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* List Table Data */}
      <div className="bg-white dark:bg-surface border border-surface-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface border-b border-surface-border select-none">
                <th className="py-4 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-surface-border text-primary focus:ring-primary cursor-pointer w-4 h-4 align-middle"
                    checked={paginatedGroups.length > 0 && paginatedGroups.flatMap(g => g.items).every(l => selectedIds.includes(l.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-secondary">Tipo</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-secondary">Vencimento</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-secondary">Entidade</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-secondary text-center">Recorrência</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-secondary">Categoria</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-secondary">Conta</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-secondary text-right">Valor (R$)</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-secondary text-center">Status</th>
                <th className="py-4 px-4 w-14"></th>
              </tr>
            </thead>
            <tbody className="text-xs text-on-surface">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="text-secondary font-bold uppercase tracking-widest text-[10px]">Carregando Lançamentos...</span>
                    </div>
                  </td>
                </tr>
              ) : lancamentos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <AlertOctagon className="w-10 h-10 text-secondary" />
                      <p className="text-secondary font-bold uppercase tracking-widest text-[10px]">Nenhum lançamento encontrado</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((group) => (
                  <React.Fragment key={group.date}>
                    {/* Date Separator Row */}
                    <tr className="bg-neutral-50/80 border-y border-surface-border/50">
                      <td colSpan={10} className="py-2 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-surface-border/30"></div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary bg-white px-3 py-1 rounded-full border border-surface-border shadow-xs">
                            {group.date.split('-').reverse().join(' / ')}
                          </span>
                          <div className="h-px flex-1 bg-surface-border/30"></div>
                        </div>
                      </td>
                    </tr>
                    
                    {group.items.map(item => {
                      const isChecked = selectedIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            setSelectedLancamentoIdForModal(item.id);
                            setModalOpen('isComprovanteOpen', true);
                          }}
                          className={`border-b border-surface-border hover:bg-neutral-50/50 transition-colors group cursor-pointer ${
                            isChecked ? 'bg-primary/5' : ''
                          }`}
                        >
                          {/* Checkbox cell */}
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rounded border-surface-border text-primary focus:ring-primary cursor-pointer w-4 h-4 align-middle"
                              checked={isChecked}
                              onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                            />
                          </td>

                          {/* Direction Icon */}
                          <td className="py-3 px-4">
                            <div className={`flex justify-center w-8 h-8 rounded-lg items-center ${
                              item.tipo === 'entrada' ? 'bg-bank-truth-green/10 text-bank-truth-green' : 'bg-alert-red/10 text-alert-red'
                            }`}>
                              {item.tipo === 'entrada' ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : (
                                <ArrowDownLeft className="w-4 h-4" />
                              )}
                            </div>
                          </td>

                          {/* Due date (redundant but kept for structure) */}
                          <td className="py-3 px-4 font-mono font-bold text-secondary">
                            {item.data_vencimento.split('-').reverse().join('/')}
                          </td>

                          {/* Entity Name */}
                          <td className="py-3 px-4 font-black text-on-background max-w-[200px] truncate" title={getEntidadeName(item.entidade_id)}>
                            {getEntidadeName(item.entidade_id)}
                          </td>

                          {/* Recurrency indicator */}
                          <td className="py-3 px-4 text-center">
                            {item.recorrencia_id ? (
                              <div className="flex flex-col items-center">
                                <span
                                  className="inline-flex bg-neutral-100 text-neutral-600 font-black text-[9px] px-2 py-0.5 rounded border border-neutral-200 uppercase"
                                  title={`Parcela ${item.numero_parcela || 1} de ${item.quantidade_total_parcelas || '?'}`}
                                >
                                  {item.numero_parcela || 1} / {item.quantidade_total_parcelas || 1}
                                </span>
                                <span className="text-[8px] font-black text-secondary/40 uppercase mt-0.5">
                                  Doc: {item.id.slice(0, 4)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-secondary/20">-</span>
                            )}
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4 text-secondary font-semibold truncate max-w-[140px]" title={getCategoriaName(item.categoria_id)}>
                            {getCategoriaName(item.categoria_id)}
                          </td>

                          {/* Bank account */}
                          <td className="py-3 px-4 text-secondary font-bold">
                            {getContaName(item.conta_bancaria_id)}
                          </td>

                          {/* Monetary Value */}
                          <td className={`py-3 px-4 font-mono font-black text-right text-sm ${
                            item.tipo === 'saida' ? 'text-alert-red' : 'text-bank-truth-green'
                          }`}>
                            {valueFormatter(item)}
                          </td>

                          {/* Workflow state */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {item.status_aprovacao === 'pendente_digital' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-bold border border-neutral-200 text-[9px] uppercase tracking-tighter">
                                Pendente Digital
                              </span>
                            )}
                            {item.status_aprovacao === 'digital' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-pending-amber/10 text-pending-amber font-bold border border-pending-amber/30 text-[9px] uppercase tracking-tighter">
                                Digital
                              </span>
                            )}
                            {item.status_aprovacao === 'confirmado_master' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-neutral-900 text-white font-black text-[9px] uppercase tracking-tighter">
                                Confirmado Master
                              </span>
                            )}
                          </td>

                          {/* Action trigger menu */}
                          <td className="py-3 px-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              {item.status_pagamento === 'aberto' && (
                                <button
                                  type="button"
                                  disabled={item.status_aprovacao !== 'confirmado_master'}
                                  onClick={() => {
                                    setSelectedLancamentoIdForModal(item.id);
                                    setModalOpen('isBaixaLancamentoOpen', true);
                                  }}
                                  className={`h-8 px-3 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm flex items-center gap-1.5 ${
                                    item.status_aprovacao === 'confirmado_master'
                                      ? 'bg-bank-truth-green hover:brightness-110'
                                      : 'bg-neutral-300 cursor-not-allowed opacity-50'
                                  }`}
                                  title={
                                    item.status_aprovacao !== 'confirmado_master'
                                      ? 'Aguardando aprovação do Master'
                                      : (item.tipo === 'saida' ? 'Quitar Pagamento' : 'Confirmar Recebimento')
                                  }
                                >
                                  {item.status_aprovacao !== 'confirmado_master' && <Clock className="w-3 h-3" />}
                                  {item.tipo === 'saida' ? 'Quitar' : 'Receber'}
                                  {item.status_aprovacao === 'confirmado_master' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => handleActionMenuToggle(item.id, e)}
                                className="text-secondary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-neutral-100"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            </div>

                            {activeMenuId === item.id && (

                              <div className="absolute right-12 top-0 mt-0 bg-white border border-surface-border rounded-lg shadow-xl z-[100] py-2 w-36 animate-fade-in text-left">
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(item)}
                                  className="w-full px-4 py-2 hover:bg-neutral-50 text-left text-xs text-on-background font-bold flex items-center gap-2"
                                >
                                  <Edit3 className="w-4 h-4 text-primary" />
                                  Editar
                                </button>
                                {item.status_pagamento === 'aberto' && item.status_aprovacao === 'confirmado_master' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedLancamentoIdForModal(item.id);
                                      setModalOpen('isBaixaLancamentoOpen', true);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 hover:bg-neutral-50 text-left text-xs text-bank-truth-green font-bold flex items-center gap-2 border-t border-neutral-100"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Baixar / Receber
                                  </button>
                                )}
                                {role === 'master' && item.status_pagamento !== 'pago' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClick(item)}
                                    className="w-full px-4 py-2 hover:bg-neutral-50 text-left text-xs text-alert-red font-bold flex items-center gap-2 border-t border-neutral-100"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Excluir
                                  </button>
                                )}
                                {item.status_pagamento === 'pago' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (confirm('Deseja realmente estornar esta quitação? O registro voltará para Aberto.')) {
                                        try {
                                          await estornarLancamento(item.id);
                                          alert('Estorno realizado com sucesso!');
                                        } catch (err: any) {
                                          alert('Erro ao estornar: ' + err.message);
                                        }
                                        setActiveMenuId(null);
                                      }
                                    }}
                                    className="w-full px-4 py-2 hover:bg-neutral-50 text-left text-xs text-secondary font-bold flex items-center gap-2 border-t border-neutral-100"
                                  >
                                    <Clock className="w-4 h-4" />
                                    Estornar Baixa
                                  </button>
                                )}

                              </div>

                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="bg-surface px-6 py-4 border-t border-surface-border flex items-center justify-between">
          <span className="text-secondary font-bold text-[10px] uppercase tracking-widest">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, lancamentos.length)} de {lancamentos.length} registros
          </span>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="h-10 px-4 flex items-center justify-center rounded-lg border border-surface-border text-secondary font-bold hover:bg-neutral-50 disabled:opacity-50 text-xs gap-1"
            >
              Anterior
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <button 
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                    currentPage === pageNum 
                      ? 'bg-primary-container text-on-primary-container font-black shadow-sm' 
                      : 'border border-surface-border text-secondary hover:bg-neutral-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button 
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="h-10 px-4 flex items-center justify-center rounded-lg border border-surface-border text-secondary font-bold hover:bg-neutral-50 disabled:opacity-50 text-xs gap-1"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>

      {/* Recurrency Interceptor Modal */}
      {interceptorTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-[440px] rounded-2xl flex flex-col shadow-2xl relative overflow-hidden border border-surface-border animate-slide-in">
            <div className="h-2 w-full bg-pending-amber"></div>
            
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-pending-amber/10 flex items-center justify-center mb-6 border-4 border-pending-amber/20 text-pending-amber">
                <AlertOctagon className="w-10 h-10 shrink-0" />
              </div>
              
              <h2 className="text-2xl text-on-surface font-black tracking-tight leading-tight select-none">
                Aviso de Recorrência
              </h2>
              
              <p className="text-sm text-secondary font-medium mb-8 mt-3">
                Este lançamento faz parte de uma série recorrente.<br />
                <span className="mt-3 inline-block bg-neutral-100 py-2 px-4 rounded-lg border border-neutral-200 font-black text-on-background text-xs uppercase tracking-widest">
                  Parcela {interceptorTarget.numero_parcela || 1} de recorrente
                </span>
              </p>

              <div className="w-full flex flex-col gap-4">
                <button 
                  type="button"
                  onClick={() => executeInterceptorAction('all')}
                  className="w-full bg-primary-container text-on-primary-container font-black py-4 px-6 rounded-xl flex justify-center items-center gap-2 hover:brightness-95 transition-all shadow-md active:scale-[0.98]"
                >
                  Alterar esta e as futuras
                </button>
                <button 
                  type="button"
                  onClick={() => executeInterceptorAction('single')}
                  className="w-full border-2 border-neutral-200 text-secondary font-black py-3.5 px-6 rounded-xl flex justify-center items-center gap-2 hover:bg-neutral-50 transition-all active:scale-[0.98]"
                >
                  Alterar apenas esta parcela
                </button>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => { setInterceptorTarget(null); setInterceptorType(null); }}
              className="absolute top-6 right-6 text-secondary hover:text-on-surface transition-colors p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
