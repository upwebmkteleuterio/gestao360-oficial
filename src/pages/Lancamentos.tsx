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
  Loader2
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
    type: typeFilter
  });
  
  const { data: contas = [] } = useContas();
  const { data: entidades = [] } = useEntidades();
  const { data: categorias = [] } = useCategorias();

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

  // Export CSV simulation
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
      // Dispatches recurrent modifier interceptor popup
      setInterceptorTarget(item);
      setInterceptorType('edit');
    } else {
      // Create draft and open Slide Panel
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
      // Dispatches recurrent modifier interceptor popup
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
      // Save parcel selector action to Zustand so saving in slide panel knows how to modify
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
          <h1 className="text-headline-lg font-bold tracking-tight text-on-surface">Gestão de Lançamentos</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Gerencie e aprove operações financeiras com precisão.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-on-background text-surface-container-lowest font-semibold hover:bg-secondary border border-transparent rounded text-xs transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
          <button 
            onClick={handleBatchApprove}
            disabled={selectedIds.length === 0 || isBatchApproving}
            className={`px-4 py-2 font-semibold text-xs rounded transition-all shadow-sm flex items-center gap-1.5 ${
              selectedIds.length > 0 
                ? 'bg-primary-container text-on-primary-fixed hover:bg-primary-fixed-dim cursor-pointer' 
                : 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed opacity-60'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Aprovar Selecionados ({selectedIds.length})
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-surface border border-surface-border p-5 rounded-xl shadow-sm flex flex-col md:flex-row flex-wrap md:items-end gap-4">
        {/* Buscar por Entidade */}
        <div className="flex-1 min-w-[210px] space-y-1.5">
          <label className="block text-xs font-semibold text-on-surface-variant">Buscar por Entidade</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-on-surface-variant">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text"
              placeholder="Nome do Cliente ou Fornecedor"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-surface-container-lowest border border-surface-border text-xs rounded text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-on-surface-variant/40"
            />
          </div>
        </div>

        {/* Período */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-on-surface-variant">Período de Vencimento</label>
          <div className="flex items-center gap-2">
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-surface-container-lowest border border-surface-border text-xs rounded px-3 py-1.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-on-surface-variant text-xs font-medium">até</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-surface-container-lowest border border-surface-border text-xs rounded px-3 py-1.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Status de Aprovação */}
        <div className="min-w-[150px] space-y-1.5">
          <label className="block text-xs font-semibold text-on-surface-variant">Status de Aprovação</label>
          <select 
            value={approvalStatus}
            onChange={(e) => setApprovalStatus(e.target.value)}
            className="w-full bg-surface-container-lowest border border-surface-border text-xs rounded px-3 py-2 text-on-surface font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Todos os Status</option>
            <option value="pendente_digital">Pendente Digital</option>
            <option value="digital">Digital (Aprovado Gerente)</option>
            <option value="confirmado_master">Confirmado Master</option>
          </select>
        </div>

        {/* Tipo Segment */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-on-surface-variant">Tipo</label>
          <div className="flex bg-surface-container border border-surface-border rounded p-0.5 h-9">
            <button 
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-4 text-xs font-bold rounded-sm transition-all ${
                typeFilter === 'all' 
                  ? 'bg-surface-container-lowest text-on-background shadow-xs' 
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Todos
            </button>
            <button 
              type="button"
              onClick={() => setTypeFilter('entrada')}
              className={`px-4 text-xs font-bold rounded-sm transition-all ${
                typeFilter === 'entrada' 
                  ? 'bg-surface-container-lowest text-bank-truth-green shadow-xs' 
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Entradas
            </button>
            <button 
              type="button"
              onClick={() => setTypeFilter('saida')}
              className={`px-4 text-xs font-bold rounded-sm transition-all ${
                typeFilter === 'saida' 
                  ? 'bg-surface-container-lowest text-alert-red shadow-xs' 
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Saídas
            </button>
          </div>
        </div>

        {/* Limpar */}
        <button 
          type="button"
          onClick={clearFilters}
          className="px-4 py-2 border border-surface-border text-on-surface text-xs font-semibold font-sans rounded hover:bg-surface-container-low transition-colors h-9"
        >
          Limpar
        </button>
      </div>

      {/* List Table Data */}
      <div className="bg-surface-container-lowest border border-surface-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface border-b border-surface-border select-none">
                <th className="py-3 px-4 w-12 text-center">
                  <input 
                    type="checkbox"
                    className="rounded border-surface-border text-primary focus:ring-primary cursor-pointer w-4 h-4 align-middle"
                    checked={paginatedLancamentos.length > 0 && paginatedLancamentos.every(l => selectedIds.includes(l.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-on-surface">Tipo</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-on-surface">Vencimento</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-on-surface">Entidade</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-on-surface text-center">Recorrência</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-on-surface">Categoria</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-on-surface">Conta</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-on-surface text-right">Valor (R$)</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-on-surface text-center">Status</th>
                <th className="py-3 px-4 w-14"></th>
              </tr>
            </thead>
            <tbody className="text-xs text-on-surface">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      <span className="text-on-surface-variant font-medium">Carregando lançamentos...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedLancamentos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-on-surface-variant font-medium">
                    Nenhum lançamento corresponde aos filtros configurados.
                  </td>
                </tr>
              ) : (
                paginatedLancamentos.map(item => {
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <tr 
                      key={item.id} 
                      className={`border-b border-surface-border hover:bg-primary/5 transition-colors group cursor-default ${
                        isChecked ? 'bg-primary/5' : ''
                      }`}
                    >
                      {/* Checkbox cell */}
                      <td className="py-2.5 px-4 text-center">
                        <input 
                          type="checkbox"
                          className="rounded border-surface-border text-primary focus:ring-primary cursor-pointer w-4 h-4 align-middle"
                          checked={isChecked}
                          onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                        />
                      </td>

                      {/* Direction Icon (entrada versus saida) */}
                      <td className="py-2.5 px-4">
                        <div className={`flex justify-center w-7 h-7 rounded-full items-center ${
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
                      <td className="py-2.5 px-4 font-mono font-medium whitespace-nowrap">
                        {item.data_vencimento.split('-').reverse().join('/')}
                      </td>

                      {/* Entity Name */}
                      <td className="py-2.5 px-4 font-bold text-on-background max-w-[180px] truncate" title={getEntidadeName(item.entidade_id)}>
                        {getEntidadeName(item.entidade_id)}
                      </td>

                      {/* Recurrency indicator block */}
                      <td className="py-2.5 px-4 text-center">
                        {item.recorrencia_id ? (
                          <span 
                            className="inline-flex bg-surface-container text-on-surface-variant font-bold text-[10px] px-2 py-0.5 rounded border border-surface-border"
                            title={`Parcela ${item.numero_parcela || 1} de recorrência`}
                          >
                            Rec. p.{item.numero_parcela || 1}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/40">-</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-4 text-on-surface-variant truncate max-w-[140px]" title={getCategoriaName(item.categoria_id)}>
                        {getCategoriaName(item.categoria_id)}
                      </td>

                      {/* Bank account forecast */}
                      <td className="py-2.5 px-4 text-on-surface-variant whitespace-nowrap">
                        {getContaName(item.conta_bancaria_id)}
                      </td>

                      {/* Monetary Value */}
                      <td className={`py-2.5 px-4 font-mono font-bold text-right text-sm ${
                        item.tipo === 'saida' ? 'text-alert-red' : 'text-bank-truth-green'
                      }`}>
                        {valueFormatter(item)}
                      </td>

                      {/* Workflow state display */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        {item.status_aprovacao === 'pendente_digital' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-semibold border border-surface-border text-[10px]">
                            Pendente Digital
                          </span>
                        )}
                        {item.status_aprovacao === 'digital' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-pending-amber/20 text-pending-amber font-semibold border border-pending-amber/30 text-[10px]">
                            Digital
                          </span>
                        )}
                        {item.status_aprovacao === 'confirmado_master' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-on-background text-primary-container font-extrabold text-[10px]">
                            Confirmado Master
                          </span>
                        )}
                      </td>

                      {/* Action trigger menu dot */}
                      <td className="py-2.5 px-4 text-right relative">
                        <button 
                          type="button"
                          onClick={(e) => handleActionMenuToggle(item.id, e)}
                          className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === item.id && (
                          <div className="absolute right-12 top-2 bg-surface-container-lowest border border-surface-border rounded-lg shadow-lg z-30 py-1.5 w-28 animate-fade-in text-left">
                            <button 
                              type="button"
                              onClick={() => handleEditClick(item)}
                              className="w-full px-3 py-1.5 hover:bg-surface-container text-left text-xs text-on-background font-semibold flex items-center gap-1.5"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-primary" />
                              Editar
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteClick(item)}
                              className="w-full px-3 py-1.5 hover:bg-surface-container text-left text-xs text-alert-red font-semibold flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        <div className="bg-surface px-4 py-3 border-t border-surface-border flex items-center justify-between">
          <span className="text-on-surface-variant font-medium text-xs">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, lancamentos.length)} de {lancamentos.length} registros
          </span>

          <div className="flex items-center gap-1">
            <button 
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="px-2 py-1 flex items-center justify-center rounded border border-surface-border text-on-surface-variant hover:bg-surface-container disabled:opacity-50 text-xs gap-0.5"
            >
              Anterior
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button 
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 flex items-center justify-center rounded text-xs font-semibold ${
                  currentPage === pageNum 
                    ? 'bg-primary-container text-on-primary-container font-extrabold' 
                    : 'border border-surface-border text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button 
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-2 py-1 flex items-center justify-center rounded border border-surface-border text-on-surface-variant hover:bg-surface-container disabled:opacity-50 text-xs gap-0.5"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL INTERCEPTOR DE RECORRÊNCIA (Tela 2.3) */}
      {/* ========================================== */}
      {interceptorTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface w-full max-w-[420px] rounded-xl flex flex-col shadow-xl relative overflow-hidden border border-surface-border animate-slide-in">
            {/* Top warning amber bar */}
            <div className="h-1.5 w-full bg-pending-amber absolute top-0 left-0"></div>
            
            <div className="p-6 flex flex-col items-center text-center pt-8">
              <div className="w-16 h-16 rounded-full bg-pending-amber flex items-center justify-center mb-6 border-4 border-surface shadow-sm text-on-background">
                <AlertOctagon className="w-8 h-8 shrink-0" />
              </div>
              
              <h2 className="text-headline-sm text-on-surface font-bold leading-tight select-none">
                Aviso de Recorrência
              </h2>
              
              <p className="text-body-md text-on-surface-variant mb-6 mt-2">
                Este lançamento faz parte de uma série recorrente.<br />
                <span className="mt-2 inline-block bg-surface-container py-1.5 px-3 rounded-lg border border-surface-border font-bold text-on-background text-sm">
                  Parcela {interceptorTarget.numero_parcela || 1} de recorrente
                </span>
              </p>

              <div className="w-full flex flex-col gap-3">
                <button 
                  type="button"
                  onClick={() => executeInterceptorAction('all')}
                  className="w-full bg-primary-container text-on-primary-fixed font-bold py-3 px-4 rounded-lg flex justify-center items-center gap-1.5 hover:bg-primary-fixed-dim transition-colors cursor-pointer"
                >
                  Alterar esta e as futuras
                </button>
                <button 
                  type="button"
                  onClick={() => executeInterceptorAction('single')}
                  className="w-full border-2 border-on-surface text-on-surface bg-transparent font-bold py-2.5 px-4 rounded-lg flex justify-center items-center gap-1.5 hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Alterar apenas esta parcela
                </button>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => { setInterceptorTarget(null); setInterceptorType(null); }}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
