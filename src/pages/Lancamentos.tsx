"use client";

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
  Banknote,
  ThumbsUp,
  ShieldCheck,
  Eye
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
  statusPagamentoOverride?: 'aberto' | 'pago';
}

export default function Lancamentos({ typeOverride, titleOverride, statusPagamentoOverride }: LancamentosProps) {
  const { role } = useAuth();
  const isMaster = role === 'master';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(() => {
    if (statusPagamentoOverride === 'aberto') return '';
    const d = new Date();
    d.setDate(d.getDate() - 15);
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    if (statusPagamentoOverride === 'aberto') return '2099-12-31';
    return new Date().toISOString().split('T')[0];
  });
  
  const [approvalStatus, setApprovalStatus] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entrada' | 'saida'>(typeOverride || 'all');

  const {
    data: allLancamentos = [],
    deleteLancamento,
    batchApprove,
    isLoading
  } = useLancamentos({
    searchTerm,
    startDate,
    endDate,
    approvalStatus,
    type: typeFilter === 'all' ? undefined : typeFilter
  });

  const lancamentos = useMemo(() => {
    let list = allLancamentos;
    if (selectedAccountId) list = list.filter(l => l.conta_bancaria_id === selectedAccountId);
    if (statusPagamentoOverride) list = list.filter(l => l.status_pagamento === statusPagamentoOverride);
    return list;
  }, [allLancamentos, selectedAccountId, statusPagamentoOverride]);
  
  const { data: rawContas = [] } = useContas();
  const { data: entidades = [] } = useEntidades();
  const { data: categorias = [] } = useCategorias();

  const { setModalOpen, setSelectedLancamentoIdForModal } = useUIStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const getEntidadeName = (id: string) => entidades.find(e => e.id === id)?.nome_razao_social || 'Entidade Desconhecida';
  const getCategoriaName = (id: string) => categorias.find(c => c.id === id)?.nome || 'Sem Categoria';

  const paginatedGroups = useMemo(() => {
    const result: { date: string, items: LancamentoFinanceiro[] }[] = [];
    lancamentos.slice(0, 50).forEach(item => {
      const date = item.data_vencimento;
      const lastGroup = result[result.length - 1];
      if (lastGroup && lastGroup.date === date) lastGroup.items.push(item);
      else result.push({ date, items: [item] });
    });
    return result;
  }, [lancamentos]);

  return (
    <div className="space-y-6 relative" onClick={() => setActiveMenuId(null)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface uppercase">
            {titleOverride || 'Histórico Global'}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 font-medium italic">
            {statusPagamentoOverride === 'aberto' ? 'Tesouraria Ativa: Títulos pendentes de liquidação.' : 'Visão completa de todos os movimentos financeiros.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {selectedIds.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex gap-2">
              {isMaster && (
                <Button onClick={() => batchApprove({ ids: selectedIds, targetStatus: 'confirmado_master' })}>
                  Aprovar Selecionados
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-surface border border-surface-border p-4 rounded-xl shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-surface border border-surface-border text-sm font-semibold rounded-lg text-on-surface focus:outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-surface border border-surface-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface border-b border-surface-border">
                <th className="py-4 px-4 w-12 text-center">
                  <input type="checkbox" className="rounded w-4 h-4" onChange={(e) => {
                    if (e.target.checked) setSelectedIds(lancamentos.map(l => l.id));
                    else setSelectedIds([]);
                  }} />
                </th>
                <th className="py-4 px-4 text-[10px] font-black uppercase text-secondary">Tipo</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase text-secondary">Vencimento</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase text-secondary">Local/Cliente</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase text-secondary text-right">Valor</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase text-secondary text-center">Aprovação</th>
                <th className="py-4 px-4 w-14"></th>
              </tr>
            </thead>
            <tbody className="text-xs text-on-surface">
              {isLoading ? (
                <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" /></td></tr>
              ) : (
                paginatedGroups.map((group) => (
                  <React.Fragment key={group.date}>
                    <tr className="bg-neutral-50/80 border-y border-surface-border/50">
                      <td colSpan={7} className="py-2 px-4 text-[10px] font-black uppercase text-secondary text-center">
                        {group.date.split('-').reverse().join(' / ')}
                      </td>
                    </tr>
                    {group.items.map(item => (
                      <tr key={item.id} className="border-b border-surface-border hover:bg-neutral-50/50 cursor-pointer" onClick={() => {
                        setSelectedLancamentoIdForModal(item.id);
                        setModalOpen('isComprovanteOpen', true);
                      }}>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="w-4 h-4" checked={selectedIds.includes(item.id)} onChange={(e) => {
                            if (e.target.checked) setSelectedIds(prev => [...prev, item.id]);
                            else setSelectedIds(prev => prev.filter(id => id !== item.id));
                          }} />
                        </td>
                        <td className="py-3 px-4">
                          {item.tipo === 'entrada' ? <ArrowUpRight className="text-bank-truth-green" /> : <ArrowDownLeft className="text-alert-red" />}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-secondary">
                          {item.data_vencimento.split('-').reverse().join('/')}
                        </td>
                        <td className="py-3 px-4 font-black text-on-background uppercase">{getEntidadeName(item.entidade_id)}</td>
                        <td className={`py-3 px-4 font-mono font-black text-right ${item.tipo === 'saida' ? 'text-alert-red' : 'text-bank-truth-green'}`}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_previsto)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.status_aprovacao === 'confirmado_master' ? (
                            <span className="bg-neutral-900 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase">Confirmado</span>
                          ) : (
                            <span className="bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded text-[9px] font-black uppercase">Pendente</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setActiveMenuId(item.id === activeMenuId ? null : item.id)} className="p-1.5 hover:bg-neutral-100 rounded-lg">
                            <MoreVertical className="w-5 h-5 text-secondary" />
                          </button>

                          <AnimatePresence>
                            {activeMenuId === item.id && (
                              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-full top-0 mt-0 mr-2 w-48 bg-white border border-surface-border rounded-xl shadow-2xl z-[100] overflow-hidden py-1 text-left">
                                <button onClick={() => { setModalOpen('isComprovanteOpen', true); setSelectedLancamentoIdForModal(item.id); setActiveMenuId(null); }} className="w-full px-4 py-2 hover:bg-neutral-50 text-[11px] font-bold text-on-surface flex items-center gap-3">
                                  <Eye className="w-4 h-4 text-secondary" /> Ver Detalhes
                                </button>
                                
                                {item.status_pagamento === 'aberto' && (
                                  <button onClick={() => { setModalOpen('isBaixaLancamentoOpen', true); setSelectedLancamentoIdForModal(item.id); setActiveMenuId(null); }} className="w-full px-4 py-2 hover:bg-neutral-50 text-[11px] font-bold text-bank-truth-green flex items-center gap-3">
                                    <CheckCircle2 className="w-4 h-4" /> Dar Baixa
                                  </button>
                                )}

                                {isMaster && item.status_aprovacao !== 'confirmado_master' && (
                                  <button onClick={() => { setModalOpen('isAprovarModalOpen' as any, true); setSelectedLancamentoIdForModal(item.id); setActiveMenuId(null); }} className="w-full px-4 py-2 hover:bg-neutral-50 text-[11px] font-bold text-primary flex items-center gap-3 border-t border-neutral-50">
                                    <ShieldCheck className="w-4 h-4" /> Aprovar Master
                                  </button>
                                )}

                                {isMaster && (
                                  <button onClick={() => { if(confirm('Excluir?')) deleteLancamento({ id: item.id }); setActiveMenuId(null); }} className="w-full px-4 py-2 hover:bg-red-50 text-[11px] font-bold text-alert-red flex items-center gap-3">
                                    <Trash2 className="w-4 h-4" /> Excluir
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  function handleExportCSV() { alert('Iniciando exportação CSV...'); }
}