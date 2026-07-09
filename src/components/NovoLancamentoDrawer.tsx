import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Loader2,
  Search,
  ChevronRight
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useLancamentos, useEntidades, useCentrosCusto, useCategorias, useContas } from '../hooks/useData';
import MoneyInput from './MoneyInput';

function formatBRL(value: any): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const clean = value.toString().replace(/\D/g, '');
  if (!clean) return '';
  const parsed = parseInt(clean, 10);
  const formatted = (parsed / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatted;
}

const SearchableSelect = ({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder, 
  required,
  onAddClick
}: { 
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { id: string; label: string; sublabel?: string }[];
  placeholder: string;
  required?: boolean;
  onAddClick?: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    o.sublabel?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(o => o.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-2 relative" ref={containerRef}>
      <div className="flex justify-between items-center">
        <label className="text-xs font-black text-secondary uppercase tracking-widest">{label} {required && <span className="text-alert-red">*</span>}</label>
        {onAddClick && (
          <button
            type="button"
            onClick={onAddClick}
            className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1 z-50 relative"
          >
            <Plus className="w-3.5 h-3.5" /> Cadastro Rápido
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 bg-white border-2 border-neutral-200 rounded-xl px-4 flex items-center justify-between text-sm font-bold transition-all shadow-xs ${isOpen ? 'border-primary' : ''}`}
      >
        <span className={selectedOption ? 'text-on-surface' : 'text-secondary/50'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronRight className={`w-4 h-4 text-secondary transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border-2 border-neutral-100 rounded-2xl shadow-2xl z-[100] overflow-hidden"
          >
            <div className="p-3 border-b border-neutral-100 bg-neutral-50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Pesquisar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 bg-white border border-neutral-200 rounded-lg text-xs font-bold focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-1.5 scrollbar-thin">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-[10px] font-black uppercase text-neutral-300">Nenhum resultado</div>
              ) : (
                filtered.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full p-3 text-left rounded-xl transition-all flex flex-col gap-0.5 ${value === opt.id ? 'bg-primary/5 border border-primary/20' : 'hover:bg-neutral-50 border border-transparent'}`}
                  >
                    <span className="text-xs font-black uppercase tracking-tight text-neutral-900">{opt.label}</span>
                    {opt.sublabel && <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{opt.sublabel}</span>}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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

  // Toasts state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const editingItem = useMemo(() => {
    if (!selectedLancamentoIdForModal) return null;
    return lancamentos.find(l => l.id === selectedLancamentoIdForModal) || null;
  }, [selectedLancamentoIdForModal, lancamentos]);

  useEffect(() => {
    if (editingItem) {
      setLancamentoFormDraft({
        tipo: editingItem.tipo,
        valor_previsto: formatBRL(editingItem.valor_previsto),
        data_emissao: editingItem.data_emissao,
        data_vencimento: editingItem.data_vencimento,
        entidade_id: editingItem.entidade_id,
        centro_custo_id: editingItem.centro_custo_id,
        categoria_id: editingItem.categoria_id,
        conta_bancaria_id: editingItem.conta_bancaria_id,
        observacoes: editingItem.observacoes
      });
    }
  }, [editingItem]);

  useEffect(() => {
    if (contas.length > 0 && !lancamentoFormDraft.conta_bancaria_id) {
      setLancamentoFormDraft({ conta_bancaria_id: contas[0].id });
    }
    if (centros.length > 0 && !lancamentoFormDraft.centro_custo_id) {
      setLancamentoFormDraft({ centro_custo_id: centros[0].id });
    }
  }, [contas, centros, isNovoLancamentoOpen]);

  const filteredCategorias = useMemo(() => {
    return categorias.filter(c => c.tipo === lancamentoFormDraft.tipo);
  }, [categorias, lancamentoFormDraft.tipo]);

  useEffect(() => {
    if (filteredCategorias.length > 0 && !editingItem) {
      setLancamentoFormDraft({ categoria_id: filteredCategorias[0].id });
    }
  }, [filteredCategorias, editingItem]);

  const handleClose = () => {
    setModalOpen('isNovoLancamentoOpen', false);
    setSelectedLancamentoIdForModal(null);
    setSelectedRecorrenciaAction(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const cleanStr = lancamentoFormDraft.valor_previsto.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(cleanStr);
    if (isNaN(val) || val <= 0) {
      showToast('Por favor, informe um valor monetário válido.', 'warning');
      setIsSubmitting(false);
      return;
    }

    if (!lancamentoFormDraft.entidade_id) {
      showToast('Por favor, preencha o destinatário.', 'warning');
      setIsSubmitting(false);
      return;
    }

    const itemDetails = {
      tipo: lancamentoFormDraft.tipo,
      valor_previsto: val,
      data_emissao: lancamentoFormDraft.data_emissao,
      data_vencimento: lancamentoFormDraft.data_vencimento,
      entidade_id: lancamentoFormDraft.entidade_id || null,
      centro_custo_id: lancamentoFormDraft.centro_custo_id || null,
      categoria_id: lancamentoFormDraft.categoria_id || null,
      conta_bancaria_id: lancamentoFormDraft.conta_bancaria_id || null,
      status_pagamento: editingItem?.status_pagamento || 'aberto',
      status_aprovacao: editingItem?.status_aprovacao || 'pendente_digital',
      observacoes: lancamentoFormDraft.observacoes
    };

    try {
      if (editingItem) {
        await updateLancamento({
          id: editingItem.id,
          data: itemDetails,
          mode: selectedRecorrenciaAction || undefined
        });
        showToast('Lançamento atualizado com sucesso!', 'success');
      } else {
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
        showToast(lancamentoFormDraft.recorrencia ? 'Série recorrente gerada!' : 'Lançamento cadastrado!', 'success');
      }

      resetAllDrafts();
      handleClose();
    } catch (err: any) {
      showToast('Erro: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isNovoLancamentoOpen && (
          <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity duration-300"
            />

            {/* Slide body */}
            <motion.form 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onSubmit={handleFormSubmit}
              className="w-full md:w-[500px] h-full bg-surface shadow-2xl flex flex-col relative z-20"
            >
              <header className="flex items-center justify-between px-6 py-5 border-b border-surface-border bg-surface shrink-0">
                <div>
                  <h2 className="text-headline-sm text-on-surface font-black tracking-tight uppercase">
                    {editingItem ? 'Editar Lançamento' : 'Novo Lançamento'}
                  </h2>
                  <span className="text-[10px] uppercase font-black text-primary block mt-0.5 tracking-widest">
                    {editingItem ? 'Ajuste de registro' : 'Inserir nova previsão financeira'}
                  </span>
                </div>

                <button 
                  type="button" 
                  onClick={handleClose}
                  className="text-secondary hover:text-on-surface p-2 rounded-xl hover:bg-neutral-100 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {editingItem && editingItem.recorrencia_id && (
                  <div className="p-4 bg-pending-amber/10 border-2 border-pending-amber/20 rounded-xl text-xs text-on-surface-variant flex gap-3">
                    <AlertCircle className="w-5 h-5 text-pending-amber shrink-0" />
                    <span className="font-semibold">
                      <strong>Edição de Recorrência:</strong> Aplicando no modo: <span className="uppercase text-pending-amber font-black">{selectedRecorrenciaAction === 'all' ? 'Esta e Futuras' : 'Apenas esta'}</span>.
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-secondary uppercase tracking-widest">Direcionador de Fluxo Contábil</label>
                  <div className="flex bg-neutral-100 dark:bg-surface-container border-2 border-neutral-100 dark:border-surface-border rounded-xl p-1 h-12 select-none">
                    <button 
                      type="button"
                      onClick={() => setLancamentoFormDraft({ tipo: 'entrada' })}
                      className={`flex-1 text-xs font-black rounded-lg transition-all uppercase tracking-tighter ${
                        lancamentoFormDraft.tipo === 'entrada' 
                          ? 'bg-white dark:bg-surface text-bank-truth-green shadow-sm' 
                          : 'text-secondary hover:text-on-surface'
                      }`}
                    >
                      Receita / Entrada
                    </button>
                    <button 
                      type="button"
                      onClick={() => setLancamentoFormDraft({ tipo: 'saida' })}
                      className={`flex-1 text-xs font-black rounded-lg transition-all uppercase tracking-tighter ${
                        lancamentoFormDraft.tipo === 'saida' 
                          ? 'bg-white dark:bg-surface text-alert-red shadow-sm' 
                          : 'text-secondary hover:text-on-surface'
                      }`}
                    >
                      Despesa / Saída
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-secondary uppercase tracking-widest">Valor Estimado <span className="text-alert-red">*</span></label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-secondary font-black">R$</span>
                      <MoneyInput
                        value={lancamentoFormDraft.valor_previsto}
                        onChange={(val) => setLancamentoFormDraft({ valor_previsto: val })}
                        className="w-full h-12 pl-10 pr-4 bg-white border-2 border-neutral-200 rounded-xl font-mono text-sm font-black text-on-surface focus:outline-none focus:border-primary transition-all shadow-xs"
                        placeholder="0,00"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-secondary uppercase tracking-widest">Data de Vencimento <span className="text-alert-red">*</span></label>
                    <input 
                      type="date"
                      required
                      value={lancamentoFormDraft.data_vencimento}
                      onChange={(e) => setLancamentoFormDraft({ data_vencimento: e.target.value })}
                      className="w-full h-12 bg-white border-2 border-neutral-200 text-sm font-bold rounded-xl focus:outline-none focus:border-primary transition-all px-4 shadow-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <SearchableSelect
                    label="Entidade / Destinatário"
                    placeholder="Selecione um cliente / fornecedor"
                    value={lancamentoFormDraft.entidade_id}
                    onChange={(val) => setLancamentoFormDraft({ entidade_id: val })}
                    options={entidades
                      .filter(e => e.status_base !== 'inativo' && e.status_base !== 'bpi')
                      .map(e => ({

                        id: e.id,
                        label: e.nome_razao_social,
                        sublabel: e.tipo.toUpperCase()
                      }))}
                    required
                    onAddClick={() => setModalOpen('isCadastroRapidoOpen', true)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <SearchableSelect
                    label="Categoria Contábil"
                    placeholder="Selecione..."
                    value={lancamentoFormDraft.categoria_id}
                    onChange={(val) => setLancamentoFormDraft({ categoria_id: val })}
                    options={filteredCategorias.map(c => ({
                      id: c.id,
                      label: c.nome
                    }))}
                    required
                  />

                  <SearchableSelect
                    label="Centro de Custo"
                    placeholder="Selecione..."
                    value={lancamentoFormDraft.centro_custo_id}
                    onChange={(val) => setLancamentoFormDraft({ centro_custo_id: val })}
                    options={centros.map(cc => ({
                      id: cc.id,
                      label: cc.nome
                    }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-secondary uppercase tracking-widest">Conta Bancária <span className="text-alert-red">*</span></label>
                    <select 
                      value={lancamentoFormDraft.conta_bancaria_id}
                      onChange={(e) => setLancamentoFormDraft({ conta_bancaria_id: e.target.value })}
                      className="w-full h-12 bg-white border-2 border-neutral-200 text-sm font-bold rounded-xl focus:outline-none focus:border-primary transition-all px-4 shadow-xs appearance-none cursor-pointer"
                      required
                    >
                      {contas.map(cnt => (
                        <option key={cnt.id} value={cnt.id}>{cnt.nome_banco}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-secondary uppercase tracking-widest">Data de Emissão</label>
                    <input 
                      type="date"
                      value={lancamentoFormDraft.data_emissao}
                      onChange={(e) => setLancamentoFormDraft({ data_emissao: e.target.value })}
                      className="w-full h-12 bg-white border-2 border-neutral-200 text-sm font-bold rounded-xl focus:outline-none focus:border-primary transition-all px-4 shadow-xs"
                    />
                  </div>
                </div>

                {!editingItem && (
                  <div className="p-5 bg-neutral-50 dark:bg-surface-container border-2 border-neutral-100 dark:border-surface-border rounded-2xl space-y-5">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={lancamentoFormDraft.recorrencia} 
                        onChange={(e) => setLancamentoFormDraft({ recorrencia: e.target.checked })}
                        className="rounded-md border-neutral-300 text-primary focus:ring-primary w-5 h-5 transition-all"
                      />
                      <span className="font-black text-xs text-on-background uppercase tracking-wider">Geração de Série Recorrente?</span>
                    </label>

                    {lancamentoFormDraft.recorrencia && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-2 gap-4 pt-1"
                      >
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Periodicidade</span>
                          <select 
                            value={lancamentoFormDraft.periodicidade}
                            onChange={(e) => setLancamentoFormDraft({ periodicidade: e.target.value as any })}
                            className="w-full h-10 bg-white border-2 border-neutral-200 text-xs font-bold rounded-lg px-3 focus:outline-none focus:border-primary"
                          >
                            <option value="diario">Diária</option>
                            <option value="semanal">Semanal</option>
                            <option value="mensal">Mensal</option>
                            <option value="anual">Anual</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Nº de Parcelas</span>
                          <input 
                            type="number"
                            min="2"
                            max="120"
                            value={lancamentoFormDraft.quantidade_total_parcelas}
                            onChange={(e) => setLancamentoFormDraft({ quantidade_total_parcelas: e.target.value })}
                            className="w-full h-10 bg-white border-2 border-neutral-200 text-xs font-bold rounded-lg px-3 focus:outline-none focus:border-primary"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-secondary uppercase tracking-widest">Observações Contábeis</label>
                  <textarea 
                    rows={4}
                    placeholder="Digite descrições detalhadas..."
                    value={lancamentoFormDraft.observacoes}
                    onChange={(e) => setLancamentoFormDraft({ observacoes: e.target.value })}
                    className="w-full bg-white border-2 border-neutral-200 text-sm font-medium rounded-xl focus:outline-none focus:border-primary transition-all p-4 resize-none shadow-xs"
                  />
                </div>
              </div>

              <footer className="p-6 border-t border-surface-border bg-neutral-50 flex justify-end gap-4 shrink-0">
                <button 
                  type="button" 
                  onClick={handleClose}
                  className="px-6 py-3 font-black text-xs text-secondary border-2 border-neutral-200 rounded-xl hover:bg-neutral-100 hover:border-neutral-300 transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                
                <button 
                  type="submit"
                  disabled={isSubmitting || isCreating || isUpdating}
                  className="px-8 py-3 font-black text-xs text-on-primary-container bg-primary-container hover:brightness-95 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2 uppercase tracking-widest"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isSubmitting ? 'Salvando...' : 'Salvar Registro'}
                </button>
              </footer>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Portal */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none select-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={`pointer-events-auto p-4 rounded-2xl border-2 shadow-xl flex items-start gap-4 bg-white transition-all ${
                toast.type === 'success' ? 'border-emerald-100 bg-emerald-50/20 text-emerald-900' : 
                toast.type === 'error' ? 'border-alert-red/10 bg-red-50/20 text-alert-red' :
                'border-amber-100 bg-amber-50/20 text-amber-900'
              }`}
            >
              <div className="shrink-0 mt-1">
                {toast.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
                {toast.type === 'error' && <XCircle className="w-6 h-6 text-alert-red" />}
                {toast.type === 'warning' && <AlertTriangle className="w-6 h-6 text-pending-amber" />}
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest mb-0.5 opacity-50">{toast.type}</p>
                <p className="text-xs font-bold leading-tight">{toast.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
