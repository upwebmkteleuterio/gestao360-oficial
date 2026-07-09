import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  MoreVertical, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  Download,
  X,
  AlertOctagon,
  Loader2,
  Calendar,
  Filter
} from 'lucide-react';
import { useLancamentos, useContas, useEntidades, useCategorias } from '../hooks/useData';
import { useUIStore } from '../store/uiStore';
import { LancamentoFinanceiro } from '../types';

export default function Lancamentos() {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entrada' | 'saida'>('all');

  // Query Hooks with server-side filters
  const { 
    data: lancamentos = [], 
    updateLancamento, 
    deleteLancamento, 
    batchApprove,
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
  
  const { data: contas = [] } = useContas();
  const { data: entidades = [] } = useEntidades();
  const { data: categorias = [] } = useCategorias();

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
  const itemsPerPage = 8;

  // Resolve Names
  const getEntidadeName = (id: string) => {
    return entidades.find(e => e.id === id)?.nome_razao_social || 'Entidade Desconhecida';
  };

  const getCategoriaName = (id: string) => {
    return categorias.find(c => c.id === id)?.nome || 'Sem Categoria';
  };

  const getContaName = (id: string) => {
    return contas.find(c => c.id === id)?.nome_banco || 'Sem Conta';
  };

  // Pagination logic
  const paginatedLancamentos = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return lancamentos.slice(startIdx, startIdx + itemsPerPage);
  }, [lancamentos, currentPage]);

  const totalPages = Math.max(Math.ceil(lancamentos.length / itemsPerPage), 1);

  // Checkbox Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedLancamentos.map(l => l.id));
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
      setLancamentoFormDraft({
        tipo: item.tipo,
        valor_previsto: item.valor_previsto.toString(),
        data_emissao: item.data_emissao,
        data_vencimento: item.data_vencimento,
        entidade_id: item.entidade_id,
        centro_custo_id: item.centro_custo_id,
        categoria_id: item.categoria_id,
        conta_bancaria_id: item.conta_bancaria_id,
        recorrencia: false,
        observacoes: item.observacoes
      });
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
      
      setLancamentoFormDraft({
        tipo: target.tipo,
        valor_previsto: target.valor_previsto.toString(),
        data_emissao: target.data_emissao,
        data_vencimento: target.data_vencimento,
        entidade_id: target.entidade_id,
        centro_custo_id: target.centro_custo_id,
        categoria_id: target.categoria_id,
        conta_bancaria_id: target.conta_bancaria_id,
        recorrencia: true,
        observacoes: target.observacoes
      });
      setSelectedLancamentoIdForModal(target.id);
      setModalOpen('isNovoLancamentoOpen', true);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
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
          <h1 className="text-headline-lg font-bold tracking-tight text-on-surface uppercase">Gestão de Lançamentos</h1>
          <p className="text-body-md text-on-surface-variant mt-1 font-medium">Gerencie e aprove operações financeiras com precisão.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="px-6 py-2.5 bg-neutral-900 text-white font-bold hover:bg-neutral-800 rounded-lg text-xs transition-all shadow-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button 
            onClick={handleBatchApprove}
            disabled={selectedIds.length === 0 || isBatchApproving}
            className={`px-6 py-2.5 font-bold text-xs rounded-lg transition-all shadow-sm flex items-center gap-2 ${
              selectedIds.length > 0 
                ? 'bg-primary-container text-on-primary-container hover:brightness-95 cursor-pointer' 
                : 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed opacity-60'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Aprovar Selecionados ({selectedIds.length})
          </button>
        </div>
      </div>

      {/* Standardized Filters Bar (Matching Dashboard UI) */}
      <div className="bg-white dark:bg-surface border border-surface-border p-5 rounded-xl shadow-sm flex flex-col gap-6">
        <div className="flex flex-wrap items-end gap-6">
          {/* Buscar por Entidade */}
          <div className="flex-1 min-w-[280px] flex flex-col gap-2">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider">Buscar por Entidade</label>
            <div className="relative group">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary transition-colors">
                <Search className="w-5 h-5" />
              </span>
              <input 
                type="text"
                placeholder="Nome do Cliente ou Fornecedor"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-11 pr-4 bg-surface border border-surface-border text-sm font-semibold rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-secondary/40"
              />
            </div>
          </div>

          {/* Período */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider">Período de Vencimento</label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary pointer-events-none" />
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-12 pl-10 pr-4 bg-surface border border-surface-border text-sm font-semibold rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <span className="text-secondary font-black text-xs">ATÉ</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary pointer-events-none" />
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-12 pl-10 pr-4 bg-surface border border-surface-border text-sm font-semibold rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Status de Aprovação */}
          <div className="min-w-[200px] flex flex-col gap-2">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider">Status de Aprovação</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary pointer-events-none" />
              <select 
                value={approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value)}
                className="w-full h-12 pl-10 pr-4 bg-surface border border-surface-border text-sm font-bold rounded-lg text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="pendente_digital">Pendente Digital</option>
                <option value="digital">Digital (Aprovado Gerente)</option>
                <option value="confirmado_master">Confirmado Master</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
                <ArrowDownLeft className="w-4 h-4 rotate-[225deg]" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-surface-border/50">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider">Tipo de Movimentação</label>
            <div className="flex bg-surface-container border border-surface-border rounded-lg p-1 h-12 w-fit">
              <button 
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-6 text-xs font-black rounded-md transition-all uppercase tracking-tighter ${
                  typeFilter === 'all' 
                    ? 'bg-white dark:bg-surface text-on-background shadow-sm' 
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                Todos
              </button>
              <button 
                type="button"
                onClick={() => setTypeFilter('entrada')}
                className={`px-6 text-xs font-black rounded-md transition-all uppercase tracking-tighter ${
                  typeFilter === 'entrada' 
                    ? 'bg-white dark:bg-surface text-bank-truth-green shadow-sm' 
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                Entradas
              </button>
              <button 
                type="button"
                onClick={() => setTypeFilter('saida')}
                className={`px-6 text-xs font-black rounded-md transition-all uppercase tracking-tighter ${
                  typeFilter === 'saida' 
                    ? 'bg-white dark:bg-surface text-alert-red shadow-sm' 
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                Saídas
              </button>
            </div>
          </div>

          <button 
            type="button"
            onClick={clearFilters}
            className="px-6 h-12 border-2 border-neutral-200 text-secondary text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

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
                    checked={paginatedLancamentos.length > 0 && paginatedLancamentos.every(l => selectedIds.includes(l.id))}
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
              ) : paginatedLancamentos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <AlertOctagon className="w-10 h-10 text-secondary" />
                      <p className="text-secondary font-bold uppercase tracking-widest text-[10px]">Nenhum lançamento encontrado</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLancamentos.map(item => {
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <tr 
                      key={item.id} 
                      className={`border-b border-surface-border hover:bg-neutral-50/50 transition-colors group cursor-default ${
                        isChecked ? 'bg-primary/5' : ''
                      }`}
                    >
                      {/* Checkbox cell */}
                      <td className="py-3 px-4 text-center">
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

                      {/* Due date */}
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
                          <span 
                            className="inline-flex bg-neutral-100 text-neutral-600 font-black text-[9px] px-2 py-0.5 rounded border border-neutral-200 uppercase"
                            title={`Parcela ${item.numero_parcela || 1} de recorrência`}
                          >
                            Rec. p.{item.numero_parcela || 1}
                          </span>
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
                      <td className="py-3 px-4 text-right relative">
                        <button 
                          type="button"
                          onClick={(e) => handleActionMenuToggle(item.id, e)}
                          className="text-secondary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-neutral-100"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {activeMenuId === item.id && (
                          <div className="absolute right-12 top-2 bg-white border border-surface-border rounded-lg shadow-xl z-30 py-2 w-32 animate-fade-in text-left">
                            <button 
                              type="button"
                              onClick={() => handleEditClick(item)}
                              className="w-full px-4 py-2 hover:bg-neutral-50 text-left text-xs text-on-background font-bold flex items-center gap-2"
                            >
                              <Edit3 className="w-4 h-4 text-primary" />
                              Editar
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteClick(item)}
                              className="w-full px-4 py-2 hover:bg-neutral-50 text-left text-xs text-alert-red font-bold flex items-center gap-2 border-t border-neutral-100"
                            >
                              <Trash2 className="w-4 h-4" />
                              Excluir
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
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
