import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock 
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useLancamentos, useEntidades, useCentrosCusto, useCategorias, useContas } from '../hooks/useData';

function formatBRL(value: string): string {
  if (!value) return '';

  if (/^\d+(\.\d+)?$/.test(value)) {
    const num = parseFloat(value);
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const clean = value.replace(/\D/g, '');
  if (!clean) return '';
  const parsed = parseInt(clean, 10);
  const formatted = (parsed / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatted;
}

export default function NovoLancamentoDrawer() {
  const { 
    isNovoLancamentoOpen, 
    setModalOpen, 
    selectedLancamentoIdForModal,
    setSelectedLancamentoIdForModal,
    selectedRecorrenciaAction,
    setSelectedRecorrenciaAction,
    lancamentoFormDraft, 
    setLancamentoFormDraft, 
    resetAllDrafts 
  } = useUIStore();

  const { createLancamento, updateLancamento, isCreating, isUpdating, data: lancamentos = [] } = useLancamentos();
  const { data: entidades = [] } = useEntidades();
  const { data: centros = [] } = useCentrosCusto();
  const { data: categorias = [] } = useCategorias();
  const { data: contas = [] } = useContas();

  // Toasts state and controller
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Selected item if editing
  const editingItem = useMemo(() => {
    if (!selectedLancamentoIdForModal) return null;
    return lancamentos.find(l => l.id === selectedLancamentoIdForModal) || null;
  }, [selectedLancamentoIdForModal, lancamentos]);

  // Set default account / classification if empty and collections exist
  useEffect(() => {
    if (contas.length > 0 && !lancamentoFormDraft.conta_bancaria_id) {
      setLancamentoFormDraft({ conta_bancaria_id: contas[0].id });
    }
    if (centros.length > 0 && !lancamentoFormDraft.centro_custo_id) {
      setLancamentoFormDraft({ centro_custo_id: centros[0].id });
    }
  }, [contas, centros, isNovoLancamentoOpen]);

  // Check categories based on type (entrada or saida)
  const filteredCategorias = useMemo(() => {
    return categorias.filter(c => c.tipo === lancamentoFormDraft.tipo);
  }, [categorias, lancamentoFormDraft.tipo]);

  // Update categorical select first value
  useEffect(() => {
    if (filteredCategorias.length > 0) {
      setLancamentoFormDraft({ categoria_id: filteredCategorias[0].id });
    }
  }, [filteredCategorias]);

  const handleClose = () => {
    // Keep draft for convenience but close and reset identifiers
    setModalOpen('isNovoLancamentoOpen', false);
    setSelectedLancamentoIdForModal(null);
    setSelectedRecorrenciaAction(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
        setIsSubmitting(true);
    
    const cleanStr = lancamentoFormDraft.valor_previsto.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(cleanStr);
    if (isNaN(val) || val <= 0) {
      showToast('Por favor, informe seu valor monetário válido acima de zero.', 'warning');
      setIsSubmitting(false);
      return;
    }

    if (!lancamentoFormDraft.entidade_id) {
      showToast('Por favor, preencha o destinatário / entidade.', 'warning');
      setIsSubmitting(false);
      return;
    }

    const itemDetails = {
      tipo: lancamentoFormDraft.tipo,
      valor_previsto: val,
      data_emissao: lancamentoFormDraft.data_emissao,
      data_vencimento: lancamentoFormDraft.data_vencimento,
      entidade_id: lancamentoFormDraft.entidade_id,
      centro_custo_id: lancamentoFormDraft.centro_custo_id,
      categoria_id: lancamentoFormDraft.categoria_id,
      conta_bancaria_id: lancamentoFormDraft.conta_bancaria_id,
      status_pagamento: 'aberto' as const,
      status_aprovacao: 'pendente_digital' as const, // default initial approval
      observacoes: lancamentoFormDraft.observacoes
    };

    try {
      if (editingItem) {
        // Updating
        await updateLancamento({
          id: editingItem.id,
          data: itemDetails,
          mode: selectedRecorrenciaAction || undefined
        });
        showToast('Lançamento atualizado com sucesso!', 'success');
      } else {
        // Creating
        let recurrencePayload = undefined;
        if (lancamentoFormDraft.recorrencia) {
          recurrencePayload = {
            periodicidade: lancamentoFormDraft.periodicidade,
            quantidade_total_parcelas: parseInt(lancamentoFormDraft.quantidade_total_parcelas) || 12
          };
        }

        await createLancamento({
          item: itemDetails,
          recorrencia: recurrencePayload
        });
        showToast(lancamentoFormDraft.recorrencia ? 'Parcelas recorrentes inseridas no fluxo!' : 'Previsão cadastrada com sucesso!', 'success');
      }

      resetAllDrafts();
      handleClose();
    } catch (err: any) {
      showToast('Erro ao persistir lançamento: ' + err.message, 'error');
    }
  };

  if (!isNovoLancamentoOpen && toasts.length === 0) return null;

  return (
    <>
      {isNovoLancamentoOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-fade-in">
          {/* Outer Click helper */}
          <div className="absolute inset-0 z-10" onClick={handleClose}></div>

          {/* Slide body */}
          <form 
            onSubmit={handleFormSubmit}
            className="w-full md:w-[500px] h-full bg-surface-container-lowest border-l border-surface-border shadow-2xl flex flex-col relative z-20 animate-slide-in"
          >
            <header className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface shrink-0">
              <div>
                <h2 className="text-headline-sm text-on-surface font-extrabold tracking-tight">
                  {editingItem ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h2>
                <span className="text-[10px] uppercase font-bold text-primary block leading-none">
                  {editingItem ? 'Modificação Filtrada' : 'Inserir Nova Previsão Financeira'}
                </span>
              </div>

              <button 
                type="button" 
                onClick={handleClose}
                className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Scroll Form container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Recurrency Scope Notification Header */}
              {editingItem && editingItem.recorrencia_id && (
                <div className="p-3.5 bg-pending-amber/10 border border-pending-amber/30 rounded-lg text-xs text-on-surface-variant flex gap-2">
                  <AlertCircle className="w-5 h-5 text-pending-amber shrink-0 mt-0.5" />
                  <span>
                    <strong>Edição de Recorrência Ativa:</strong> Você optou por aplicar modificações no modo: <strong>{selectedRecorrenciaAction === 'all' ? 'Esta e Futuras Parcelas' : 'Apenas esta parcela'}</strong>. Nova configuração se estenderá conforme determinado.
                  </span>
                </div>
              )}

              {/* Direction toggle standard */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant">Direcionador de Fluxo Contábil</label>
                <div className="flex bg-surface-container border border-surface-border rounded p-0.5 h-10 select-none">
                  <button 
                    type="button"
                    onClick={() => setLancamentoFormDraft({ tipo: 'entrada' })}
                    className={`flex-1 text-xs font-bold rounded transition-all ${
                      lancamentoFormDraft.tipo === 'entrada' 
                        ? 'bg-surface-container-lowest text-bank-truth-green shadow-xs' 
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Receita / Entrada
                  </button>
                  <button 
                    type="button"
                    onClick={() => setLancamentoFormDraft({ tipo: 'saida' })}
                    className={`flex-1 text-xs font-bold rounded transition-all ${
                      lancamentoFormDraft.tipo === 'saida' 
                        ? 'bg-surface-container-lowest text-alert-red shadow-xs' 
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Despesa / Saída
                  </button>
                </div>
              </div>

              {/* Two-cell: Valor and Vencimento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant">Valor Estimado <span className="text-alert-red">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-on-surface-variant/60 font-bold">R$</span>
                    <input 
                      type="text"
                      required
                      placeholder="0,00"
                      value={formatBRL(lancamentoFormDraft.valor_previsto)}
                      onChange={(e) => setLancamentoFormDraft({ valor_previsto: formatBRL(e.target.value) })}
                      className="w-full pl-8 pr-3 py-2 bg-surface border border-surface-border font-mono text-xs font-bold rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant">Data de Vencimento <span className="text-alert-red">*</span></label>
                  <input 
                    type="date"
                    required
                    value={lancamentoFormDraft.data_vencimento}
                    onChange={(e) => setLancamentoFormDraft({ data_vencimento: e.target.value })}
                    className="w-full bg-surface border border-surface-border text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all px-3 py-2"
                  />
                </div>
              </div>

              {/* Entidade / Destinatário */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                  <span>Entidade / Destinatário <span className="text-alert-red">*</span></span>
                  <button 
                    type="button" 
                    onClick={() => setModalOpen('isCadastroRapidoOpen', true)}
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Cadastro Rápido
                  </button>
                </div>
                <select 
                  value={lancamentoFormDraft.entidade_id}
                  onChange={(e) => setLancamentoFormDraft({ entidade_id: e.target.value })}
                  className="w-full bg-surface border border-surface-border text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all px-3 py-2.5 font-sans"
                  required
                >
                  <option value="" disabled>Selecione um cliente / fornecedor</option>
                  {entidades.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.nome_razao_social} ({e.tipo.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Categorias & Centros de Custo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant">Categoria Contábil <span className="text-alert-red">*</span></label>
                  <select 
                    value={lancamentoFormDraft.categoria_id}
                    onChange={(e) => setLancamentoFormDraft({ categoria_id: e.target.value })}
                    className="w-full bg-surface border border-surface-border text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all px-3 py-2.5 font-sans"
                    required
                  >
                    {filteredCategorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant">Centro de Custo <span className="text-alert-red">*</span></label>
                  <select 
                    value={lancamentoFormDraft.centro_custo_id}
                    onChange={(e) => setLancamentoFormDraft({ centro_custo_id: e.target.value })}
                    className="w-full bg-surface border border-surface-border text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all px-3 py-2.5 font-sans"
                    required
                  >
                    {centros.map(cc => (
                      <option key={cc.id} value={cc.id}>{cc.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conta Bancária & Emissão */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant">Conta Bancária Proposta <span className="text-alert-red">*</span></label>
                  <select 
                    value={lancamentoFormDraft.conta_bancaria_id}
                    onChange={(e) => setLancamentoFormDraft({ conta_bancaria_id: e.target.value })}
                    className="w-full bg-surface border border-surface-border text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all px-3 py-2.5 font-sans"
                    required
                  >
                    {contas.map(cnt => (
                      <option key={cnt.id} value={cnt.id}>{cnt.nome_banco}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant font-sans">Data de Emissão (Fatura)</label>
                  <input 
                    type="date"
                    value={lancamentoFormDraft.data_emissao}
                    onChange={(e) => setLancamentoFormDraft({ data_emissao: e.target.value })}
                    className="w-full bg-surface border border-surface-border text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all px-3 py-2"
                  />
                </div>
              </div>

              {/* Lançamento Recorrente checkbox switcher (Visible strictly on creation of items only) */}
              {!editingItem && (
                <div className="p-4 bg-surface border border-surface-border rounded-xl space-y-4 shadow-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer user-select-none">
                    <input 
                      type="checkbox"
                      checked={lancamentoFormDraft.recorrencia} 
                      onChange={(e) => setLancamentoFormDraft({ recorrencia: e.target.checked })}
                      className="rounded border-surface-border text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="font-bold text-xs text-on-background">Geração de Série Recorrente?</span>
                  </label>

                  {lancamentoFormDraft.recorrencia && (
                    <div className="grid grid-cols-2 gap-3 animate-fade-in pt-1">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-on-surface-variant">Periodicidade</span>
                        <select 
                          value={lancamentoFormDraft.periodicidade}
                          onChange={(e) => setLancamentoFormDraft({ periodicidade: e.target.value as any })}
                          className="bg-surface-container border border-surface-border text-xs rounded p-2"
                        >
                          <option value="diario">Diária</option>
                          <option value="semanal">Semanal</option>
                          <option value="mensal">Mensal</option>
                          <option value="anual">Anual</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-on-surface-variant">Nº de Parcelas</span>
                        <input 
                          type="number"
                          min="2"
                          max="120"
                          value={lancamentoFormDraft.quantidade_total_parcelas}
                          onChange={(e) => setLancamentoFormDraft({ quantidade_total_parcelas: e.target.value })}
                          className="bg-surface-container border border-surface-border text-xs rounded p-2 text-on-background"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Text Area observations */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant">Observações Contábeis / Descrições</label>
                <textarea 
                  rows={3}
                  placeholder="Digite descrições para facilitação da análise..."
                  value={lancamentoFormDraft.observacoes}
                  onChange={(e) => setLancamentoFormDraft({ observacoes: e.target.value })}
                  className="w-full bg-surface border border-surface-border text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all p-3 resize-none font-sans"
                />
              </div>
            </div>

            <footer className="p-4 border-t border-surface-border bg-surface flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={handleClose}
                className="px-4 py-2 font-bold text-xs text-on-surface border border-surface-border rounded-lg hover:bg-surface-container transition-all"
              >
                Cancelar
              </button>
              
              <button 
                type="submit"
                disabled={isCreating || isUpdating}
                className="px-5 py-2 font-bold text-xs text-on-primary-fixed bg-primary-container hover:bg-primary-fixed-dim rounded-lg shadow-sm transition-all"
              >
                {isCreating || isUpdating ? 'Persistindo...' : 'Salvar Registro'}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Toast Portal/Container with fluid motion animations */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none select-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
              layout
              className={`pointer-events-auto p-4 rounded-xl border shadow-lg flex items-start gap-3 bg-white dark:bg-surface-container-lowest transition-colors ${
                toast.type === 'success' 
                  ? 'border-emerald-500/30 bg-emerald-50/10 text-emerald-800 dark:text-emerald-300' 
                  : toast.type === 'error'
                  ? 'border-alert-red/30 bg-red-50/10 text-alert-red'
                  : toast.type === 'warning'
                  ? 'border-amber-500/30 bg-amber-50/10 text-amber-900 dark:text-amber-300'
                  : 'border-blue-500/30 bg-blue-50/10 text-blue-800 dark:text-blue-300'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5 text-alert-red" />}
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-[#f3b233]" />}
                {toast.type === 'info' && <Clock className="w-5 h-5 text-blue-500" />}
              </div>
              <div className="flex-1 text-xs font-semibold leading-relaxed">
                {toast.type === 'success' && <div className="font-bold text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">Sucesso</div>}
                {toast.type === 'error' && <div className="font-bold text-[10px] uppercase tracking-wider text-alert-red mb-0.5">Erro</div>}
                {toast.type === 'warning' && <div className="font-bold text-[10px] uppercase tracking-wider text-[#d69614] mb-0.5">Aviso</div>}
                {toast.type === 'info' && <div className="font-bold text-[10px] uppercase tracking-wider text-blue-500 mb-0.5">Informação</div>}
                {toast.message}
              </div>
              <button 
                type="button"
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="shrink-0 opacity-40 hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-neutral-100 dark:hover:bg-surface-variant cursor-pointer"
              >
                <X className="w-4 h-4 cursor-pointer" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
