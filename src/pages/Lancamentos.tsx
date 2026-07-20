import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Filter,
  Download,
  Plus,
  Search,
  MoreVertical,
  X,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  History,
  Trash2,
  Edit,
  Receipt,
  FileText,
  User,
  Tag,
  Coins
} from 'lucide-react';
import { useLancamentos, useContas, useEntidades, useCategorias, useUsuarios } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { useUIStore } from '../store/uiStore';
import { useDragScroll } from '../hooks/useDragScroll';
import { LancamentoFinanceiro } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import Button from '../components/Button';
import AccountFilterCards from '../components/Lancamentos/AccountFilterCards';

interface LancamentosProps {
  typeOverride?: 'entrada' | 'saida';
  titleOverride?: string;
  statusPagamentoOverride?: 'aberto' | 'pago' | 'pago_parcial' | 'bpi';
  statusAprovacaoOverride?: 'pendente_digital' | 'digital' | 'confirmado_master';
}

export default function Lancamentos({ 
  typeOverride, 
  titleOverride,
  statusPagamentoOverride,
  statusAprovacaoOverride
}: LancamentosProps) {
  const { role } = useAuth();
  const { setModalOpen, setSelectedLancamentoIdForModal, setActiveTab } = useUIStore();
  const dragScrollTabs = useDragScroll();

  // Search & Period States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Advanced Filters
  const [approvalStatus, setApprovalStatus] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entrada' | 'saida'>(typeOverride || 'all');
  const [authorIdFilter, setAuthorIdIdFilter] = useState('all');
  const [categoryIdFilter, setCategoryIdFilter] = useState('all');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  useEffect(() => {
    if (typeOverride) setTypeFilter(typeOverride);
  }, [typeOverride]);

  const hasActiveFilters = searchTerm !== '' || approvalStatus !== 'all' || typeFilter !== 'all' || authorIdFilter !== 'all' || categoryIdFilter !== 'all';

  // Selection state for Batch Approve
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const {
    data: fetchResult = { data: [], count: 0 },
    batchApprove,
    estornarLancamento,
    deleteLancamento,
    isBatchApproving,
    isLoading
  } = useLancamentos({
    searchTerm,
    startDate,
    endDate,
    approvalStatus: statusAprovacaoOverride || approvalStatus,
    statusPagamento: statusPagamentoOverride,
    type: typeFilter === 'all' ? undefined : typeFilter,
    authorId: authorIdFilter,
    categoryId: categoryIdFilter,
    page: currentPage,
    pageSize
  });

  const allLancamentos = fetchResult.data;
  const totalCount = fetchResult.count;
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

  const { data: entidades = [] } = useEntidades();
  const { data: categorias = [] } = useCategorias();
  const { data: usuarios = [] } = useUsuarios();
  const { data: rawContas = [] } = useContas();

  const activeContas = useMemo(() => rawContas.filter((c: any) => c.status !== 'excluido'), [rawContas]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const filteredLancamentos = useMemo(() => {
    return allLancamentos.filter(l => selectedAccountId ? l.conta_bancaria_id === selectedAccountId : true);
  }, [allLancamentos, selectedAccountId]);

  const valueFormatter = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const clearFiltersShortcut = () => {
    setSearchTerm('');
    setApprovalStatus('all');
    setTypeFilter(typeOverride || 'all');
    setAuthorIdIdFilter('all');
    setCategoryIdFilter('all');
    setSelectedIds([]);
    setSelectedAccountId(null);
    setCurrentPage(1);
  };

  const toggleSelectAll = () => {
    // Only select items that are PENDENTE (for batch approval)
    const pendentes = filteredLancamentos.filter(l => l.status_aprovacao !== 'confirmado_master' && l.status_pagamento !== 'bpi');
    if (selectedIds.length === pendentes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendentes.map(l => l.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBatchApprove = async () => {
    if (confirm(`Aprovar ${selectedIds.length} títulos selecionados?`)) {
      try {
        await batchApprove({ ids: selectedIds, targetStatus: 'confirmado_master' });
        setSelectedIds([]);
      } catch (err) { alert('Erro ao aprovar em lote'); }
    }
  };

  const handleOpenBaixa = (id: string) => {
    setSelectedLancamentoIdForModal(id);
    setModalOpen('isBaixaLancamentoOpen', true);
    setActiveMenuId(null);
  };

  const handleEstornar = async (id: string) => {
    if (confirm('Deseja estornar este lançamento? O saldo bancário será restaurado.')) {
      try {
        await estornarLancamento(id);
        setActiveMenuId(null);
      } catch (err) { alert('Erro ao estornar'); }
    }
  };

  const handleEdit = (l: LancamentoFinanceiro) => {
    setSelectedLancamentoIdForModal(l.id);
    setModalOpen('isNovoLancamentoOpen', true);
    setActiveMenuId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir este lançamento permanentemente?')) {
      try {
        await deleteLancamento({ id });
        setActiveMenuId(null);
      } catch (err) { alert('Erro ao excluir'); }
    }
  };

  // Calculate balances for account cards
  const accountCardsData = useMemo(() => {
    return activeContas.map(acc => {
      const accLaunches = allLancamentos.filter(l => l.conta_bancaria_id === acc.id);
      const balance = accLaunches.reduce((sum, l) => {
        const val = Number(l.valor_previsto) || 0;
        return l.tipo === 'entrada' ? sum + val : sum - val;
      }, 0);
      return { ...acc, filteredBalance: balance };
    });
  }, [activeContas, allLancamentos]);

  return (
    <div className="space-y-6 animate-fade-in" onClick={() => setActiveMenuId(null)}>
      
      <AccountFilterCards 
        accounts={accountCardsData}
        selectedId={selectedAccountId}
        onSelect={setSelectedAccountId}
        dragScrollProps={dragScrollTabs.props}
        dragScrollRef={dragScrollTabs.ref}
        valueFormatter={valueFormatter}
      />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-neutral-900 flex items-center gap-3">
            <Receipt className="w-8 h-8 text-primary" />
            {titleOverride || 'Extrato'}
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">Gestão centralizada de movimentações e conciliação</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {role === 'master' && (
            <Button
              onClick={() => handleBatchApprove()}
              disabled={selectedIds.length === 0 || isBatchApproving}
            >
              <ShieldCheck className="w-4 h-4" />
              Aprovar ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Main filter bar */}
      <div className="bg-white border-2 border-neutral-100 p-4 rounded-3xl flex flex-col lg:flex-row gap-4 shadow-sm items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
          <input
            type="text"
            placeholder="Pesquisar por entidade ou observação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-neutral-50 border-2 border-neutral-100 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="flex bg-neutral-100 p-1 rounded-xl h-12">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase px-3 outline-none" />
            <div className="w-px h-4 bg-neutral-200 self-center" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase px-3 outline-none" />
          </div>

          <button
            onClick={() => setIsFilterPanelOpen(true)}
            className={`h-12 w-12 flex items-center justify-center rounded-xl border-2 transition-all relative ${
              hasActiveFilters ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-neutral-100 text-neutral-400 hover:border-neutral-200'
            }`}
          >
            <Filter className="w-5 h-5" />
            {hasActiveFilters && <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />}
          </button>
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-white border-2 border-neutral-100 rounded-[32px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-neutral-50/50 text-neutral-400 border-b border-neutral-100 text-[9px] font-black uppercase tracking-widest select-none">
                <th className="py-5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredLancamentos.filter(l => l.status_aprovacao !== 'confirmado_master').length}
                    onChange={toggleSelectAll}
                    className="rounded-md border-neutral-300 text-primary focus:ring-primary w-4 h-4 transition-all"
                  />
                </th>
                <th className="py-5 px-4">Fluxo</th>
                <th className="py-5 px-4">Entidade</th>
                <th className="py-5 px-4">Vencimento</th>
                <th className="py-5 px-4">Pagamento</th>
                <th className="py-5 px-4 text-right">Valor</th>
                <th className="py-5 px-4 text-center">Aprovação</th>
                <th className="py-5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-bold">
              {isLoading ? (
                <tr><td colSpan={8} className="py-24 text-center"><div className="flex flex-col items-center gap-3 opacity-40"><Clock className="w-10 h-10 animate-spin text-primary" /><p className="font-black uppercase text-[10px] tracking-widest">Sincronizando registros...</p></div></td></tr>
              ) : filteredLancamentos.length === 0 ? (
                <tr><td colSpan={8} className="py-24 text-center"><div className="flex flex-col items-center gap-3 opacity-20"><Receipt className="w-12 h-12" /><p className="font-black uppercase text-[10px] tracking-widest">Nenhum lançamento localizado</p></div></td></tr>
              ) : (
                filteredLancamentos.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isPendente = item.status_aprovacao !== 'confirmado_master' && item.status_pagamento !== 'bpi';
                  
                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedLancamentoIdForModal(item.id);
                        setModalOpen('isComprovanteOpen', true);
                      }}
                      className={`border-b border-neutral-50 hover:bg-neutral-50/50 transition-all cursor-pointer group ${isSelected ? 'bg-primary/5 border-primary/10' : ''}`}
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {isPendente && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(item.id)}
                            className="rounded-md border-neutral-300 text-primary focus:ring-primary w-4 h-4 transition-all"
                          />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.tipo === 'entrada' ? 'bg-emerald-50 text-bank-truth-green' : 'bg-red-50 text-alert-red'}`}>
                          {item.tipo === 'entrada' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-neutral-900 font-black uppercase tracking-tighter truncate max-w-[200px]">{entidades.find(e => e.id === item.entidade_id)?.nome_razao_social || 'N/A'}</span>
                          <span className="text-[9px] text-neutral-400 uppercase tracking-widest font-bold">{item.observacoes || 'Sem descrição'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-neutral-500 font-mono">{item.data_vencimento.split('-').reverse().join('/')}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.status_pagamento === 'pago' ? (
                          <div className="flex flex-col">
                            <span className="text-bank-truth-green font-black text-[9px] uppercase">Liquidado</span>
                            <span className="text-[9px] text-neutral-400 font-mono">{item.data_pagamento?.split('-').reverse().join('/')}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-300 font-bold uppercase text-[9px] tracking-widest">Aguardando</span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-right font-black font-mono text-xs ${item.tipo === 'entrada' ? 'text-bank-truth-green' : 'text-neutral-950'}`}>
                        {valueFormatter(item.valor_previsto)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {item.status_pagamento === 'bpi' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-red-50 text-alert-red font-black border border-red-100 text-[9px] uppercase tracking-tighter">
                            BPI
                          </span>
                        ) : item.status_aprovacao === 'confirmado_master' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-neutral-900 text-white font-black text-[9px] uppercase tracking-tighter">
                            Confirmado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-bold border border-neutral-200 text-[9px] uppercase tracking-tighter">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex items-center gap-1.5 mr-2">
                            {role === 'master' && item.status_aprovacao !== 'confirmado_master' && item.status_pagamento !== 'bpi' && (
                              <button
                                onClick={() => {
                                  setSelectedLancamentoIdForModal(item.id);
                                  setModalOpen('isComprovanteOpen', true);
                                }}
                                className="px-3 py-1.5 bg-neutral-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-all flex items-center gap-1.5 shadow-sm"
                              >
                                <ShieldCheck className="w-3 h-3" /> Aprovar
                              </button>
                            )}

                            {(role === 'master' || role === 'gerente') && item.status_aprovacao === 'confirmado_master' && item.status_pagamento !== 'pago' && item.status_pagamento !== 'bpi' && (
                              <button
                                onClick={() => handleOpenBaixa(item.id)}
                                className="px-3 py-1.5 bg-bank-truth-green text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:brightness-110 transition-all flex items-center gap-1.5 shadow-sm"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Quitar
                              </button>
                            )}
                          </div>

                          <div className="relative">
                            <button
                              onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                              className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-neutral-400 hover:text-neutral-900 transition-all"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          
                            <AnimatePresence>
                              {activeMenuId === item.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute right-0 top-full mt-2 w-48 bg-white border border-neutral-100 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden"
                                >
                                  {(role === 'master' || role === 'gerente') && item.status_pagamento !== 'pago' && (
                                    <button onClick={() => handleOpenBaixa(item.id)} className="w-full flex items-center gap-3 px-4 py-3 text-bank-truth-green hover:bg-emerald-50 rounded-xl transition-all">
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Dar Baixa</span>
                                    </button>
                                  )}
                                  
                                  {item.status_pagamento === 'pago' && (
                                    <button onClick={() => handleEstornar(item.id)} className="w-full flex items-center gap-3 px-4 py-3 text-alert-red hover:bg-red-50 rounded-xl transition-all">
                                      <History className="w-4 h-4" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Estornar</span>
                                    </button>
                                  )}
                                  
                                  <div className="h-px bg-neutral-50 my-1" />
                                  
                                  <button onClick={() => handleEdit(item)} className="w-full flex items-center gap-3 px-4 py-3 text-neutral-600 hover:bg-neutral-50 rounded-xl transition-all">
                                    <Edit className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Editar</span>
                                  </button>
                                  
                                  {role === 'master' && (
                                    <button onClick={() => handleDelete(item.id)} className="w-full flex items-center gap-3 px-4 py-3 text-alert-red/50 hover:text-alert-red hover:bg-red-50 rounded-xl transition-all">
                                      <Trash2 className="w-4 h-4" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Excluir</span>
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-neutral-50/50 px-8 py-4 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-neutral-400 font-bold text-[9px] uppercase tracking-widest">
            Exibindo {filteredLancamentos.length} de {totalCount} registros
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="h-10 px-4 rounded-xl border-2 border-neutral-100 text-neutral-500 font-bold hover:bg-neutral-50 disabled:opacity-50 text-[10px] uppercase tracking-widest transition-all"
            >
              Anterior
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${
                      currentPage === pageNum
                        ? 'bg-neutral-900 text-white shadow-md'
                        : 'border-2 border-neutral-100 text-neutral-400 hover:bg-neutral-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="flex items-end pb-2 text-neutral-400">...</span>}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="h-10 px-4 rounded-xl border-2 border-neutral-100 text-neutral-500 font-bold hover:bg-neutral-50 disabled:opacity-50 text-[10px] uppercase tracking-widest transition-all"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isFilterPanelOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFilterPanelOpen(false)} className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-full md:w-[400px] h-full bg-white shadow-2xl relative z-10 flex flex-col">
              <header className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">Filtros Inteligentes</h3>
                  <p className="text-[10px] font-bold text-secondary uppercase mt-0.5">Refine sua busca no histórico</p>
                </div>
                <button onClick={() => setIsFilterPanelOpen(false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-all">
                  <X className="w-5 h-5 text-secondary" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
                    <Receipt className="w-4 h-4" /> Natureza do Fluxo
                  </label>
                  <div className="flex bg-neutral-100 p-1 rounded-xl h-11">
                    <button onClick={() => setTypeFilter('all')} className={`flex-1 rounded-lg text-[10px] font-black uppercase transition-all ${typeFilter === 'all' ? 'bg-white text-primary shadow-sm' : 'text-neutral-400'}`}>Todos</button>
                    <button onClick={() => setTypeFilter('entrada')} className={`flex-1 rounded-lg text-[10px] font-black uppercase transition-all ${typeFilter === 'entrada' ? 'bg-white text-bank-truth-green shadow-sm' : 'text-neutral-400'}`}>Entradas</button>
                    <button onClick={() => setTypeFilter('saida')} className={`flex-1 rounded-lg text-[10px] font-black uppercase transition-all ${typeFilter === 'saida' ? 'bg-white text-alert-red shadow-sm' : 'text-neutral-400'}`}>Saídas</button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Status de Aprovação
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'confirmado_master', label: 'Confirmado' },
                      { id: 'pendente', label: 'Pendente' },
                      { id: 'bpi', label: 'BPI' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setApprovalStatus(opt.id)}
                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all text-left flex items-center justify-between ${
                          approvalStatus === opt.id ? 'border-primary bg-primary/5 text-primary' : 'border-neutral-100 bg-neutral-50 text-secondary hover:border-neutral-200'
                        }`}
                      >
                        {opt.label}
                        {approvalStatus === opt.id && <div className="w-2 h-2 bg-primary rounded-full" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
                      <User className="w-4 h-4" /> Responsável
                    </label>
                    <select
                      value={authorIdFilter}
                      onChange={(e) => setAuthorIdIdFilter(e.target.value)}
                      className="w-full h-11 bg-neutral-50 border border-surface-border text-xs font-bold rounded-lg px-3 outline-none focus:border-primary"
                    >
                      <option value="all">Todos os Usuários</option>
                      {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome || u.email}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
                      <Tag className="w-4 h-4" /> Categoria
                    </label>
                    <select
                      value={categoryIdFilter}
                      onChange={(e) => setCategoryIdFilter(e.target.value)}
                      className="w-full h-11 bg-neutral-50 border border-surface-border text-xs font-bold rounded-lg px-3 outline-none focus:border-primary"
                    >
                      <option value="all">Todas as Categorias</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <footer className="p-8 border-t border-neutral-100 bg-neutral-50/50 flex flex-col gap-3">
                <button onClick={clearFiltersShortcut} className="w-full h-12 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors">Limpar Filtros</button>
                <button onClick={() => { setIsFilterPanelOpen(false); setCurrentPage(1); }} className="w-full h-14 bg-neutral-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">Aplicar e Fechar</button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}