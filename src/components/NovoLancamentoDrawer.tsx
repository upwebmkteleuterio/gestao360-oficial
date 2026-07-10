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
  ChevronRight,
  FileText,
  Paperclip,
  TrendingDown,
  TrendingUp,
  Percent,
  Banknote,
  Repeat,
  Calendar,
  CreditCard,
  Hash
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useLancamentos, useEntidades, useCentrosCusto, useCategorias, useContas, useLancamentoAnexos } from '../hooks/useData';
import MoneyInput from './MoneyInput';
import { supabase } from '@/integrations/supabase/client';
import Button from './Button';

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

function parseMoney(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const cleanStr = value.toString().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleanStr) || 0;
}

const SearchableSelect = ({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder, 
  required,
  onAddClick,
  onQuickAddClick,
  quickAddLabel
}: { 
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { id: string; label: string; sublabel?: string }[];
  placeholder: string;
  required?: boolean;
  onAddClick?: () => void;
  onQuickAddClick?: () => void;
  quickAddLabel?: string;
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
        <label className="text-[10px] font-black text-secondary uppercase tracking-widest">{label} {required && <span className="text-alert-red">*</span>}</label>
        <div className="flex gap-3">
          {onAddClick && (
            <button
              type="button"
              onClick={onAddClick}
              className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1 z-50 relative"
            >
              <Plus className="w-3.5 h-3.5" /> Cadastro Rápido
            </button>
          )}
          {onQuickAddClick && (
            <button
              type="button"
              onClick={onQuickAddClick}
              className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1 z-50 relative"
            >
              <Plus className="w-3.5 h-3.5" /> {quickAddLabel || 'Novo'}
            </button>
          )}
        </div>
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

interface LocalFile {
  name: string;
  size: number;
  type: string;
  file: File;
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
  const { data: rawCentros = [] } = useCentrosCusto();
  const { data: rawCategorias = [] } = useCategorias();
  const { data: rawContas = [] } = useContas();

  const { createCC } = useCentrosCusto();
  const { createCategory } = useCategorias();
  const { createAccount } = useContas();

  const { anexos: existingAnexos, deleteAnexo } = useLancamentoAnexos(selectedLancamentoIdForModal);

  const [attachments, setAttachments] = useState<LocalFile[]>([]);
  const [parcelasManuais, setParcelasManuais] = useState<Array<{ numero: number; data: string; valor: string }>>([]);

  // Filter out soft-deleted items for new selection
  const centros = useMemo(() => rawCentros.filter((c: any) => c.status !== 'excluido'), [rawCentros]);
  const categorias = useMemo(() => rawCategorias.filter((c: any) => c.status !== 'excluido'), [rawCategorias]);
  const contas = useMemo(() => rawContas.filter((c: any) => c.status !== 'excluido'), [rawContas]);

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
        data_competencia: editingItem.data_competencia || editingItem.data_emissao,
        data_pagamento: editingItem.data_pagamento || editingItem.data_vencimento,
        entidade_id: editingItem.entidade_id,
        centro_custo_id: editingItem.centro_custo_id,
        categoria_id: editingItem.categoria_id,
        conta_bancaria_id: editingItem.conta_bancaria_id,
        observacoes: editingItem.observacoes,
        condicao: editingItem.condicao || 'a_prazo',
        ja_recebido: editingItem.ja_recebido || false,
        desconto_valor: formatBRL(editingItem.desconto_valor || 0),
        desconto_tipo: editingItem.desconto_tipo || 'valor',
        acrescimo_valor: formatBRL(editingItem.acrescimo_valor || 0),
        acrescimo_tipo: editingItem.acrescimo_tipo || 'valor',
        valor_recebido: formatBRL(editingItem.valor_recebido || 0),
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
    if (filteredCategorias.length > 0 && !editingItem && !lancamentoFormDraft.categoria_id) {
      setLancamentoFormDraft({ categoria_id: filteredCategorias[0].id });
    }
  }, [filteredCategorias, editingItem]);

  // Parcel Generation Logic
  useEffect(() => {
    if (editingItem) return; // Don't auto-generate when editing an existing one
    
    // Condition to show/generate parcels: either "A Prazo" OR "Repetir" (with more than 1 parcel)
    const isAPrazo = lancamentoFormDraft.condicao === 'a_prazo';
    const isRepeat = lancamentoFormDraft.recorrencia_repeat;
    const totalParcelas = parseInt(lancamentoFormDraft.quantidade_total_parcelas) || 1;

    if (!isAPrazo && !isRepeat) {
      setParcelasManuais([]);
      return;
    }

    if (totalParcelas < 1) return;

    const valorTotal = parseMoney(lancamentoFormDraft.valor_previsto);
    const novasParcelas = [];
    let currentDate = new Date(lancamentoFormDraft.data_vencimento + 'T00:00:00');
    
    if (lancamentoFormDraft.recorrencia_com_entrada) {
      currentDate = new Date(lancamentoFormDraft.data_emissao + 'T00:00:00');
    }

    const valorPorParcela = isRepeat
      ? valorTotal
      : valorTotal / totalParcelas;

    for (let i = 1; i <= totalParcelas; i++) {
      novasParcelas.push({
        numero: i,
        data: currentDate.toISOString().split('T')[0],
        valor: formatBRL(valorPorParcela)
      });

      // Advance date
      if (lancamentoFormDraft.periodicidade === 'diario') currentDate.setDate(currentDate.getDate() + 1);
      else if (lancamentoFormDraft.periodicidade === 'semanal') currentDate.setDate(currentDate.getDate() + 7);
      else if (lancamentoFormDraft.periodicidade === 'quinzenal') currentDate.setDate(currentDate.getDate() + 15);
      else if (lancamentoFormDraft.periodicidade === 'mensal') currentDate.setMonth(currentDate.getMonth() + 1);
      else if (lancamentoFormDraft.periodicidade === 'bimestral') currentDate.setMonth(currentDate.getMonth() + 2);
      else if (lancamentoFormDraft.periodicidade === 'trimestral') currentDate.setMonth(currentDate.getMonth() + 3);
      else if (lancamentoFormDraft.periodicidade === 'semestral') currentDate.setMonth(currentDate.getMonth() + 6);
      else if (lancamentoFormDraft.periodicidade === 'anual') currentDate.setFullYear(currentDate.getFullYear() + 1);
      else if (lancamentoFormDraft.periodicidade === 'personalizado') {
        const dias = parseInt(lancamentoFormDraft.periodicidade_customizada_dias) || 30;
        currentDate.setDate(currentDate.getDate() + dias);
      }
    }

    setParcelasManuais(novasParcelas);
  }, [
    lancamentoFormDraft.condicao,
    lancamentoFormDraft.recorrencia_repeat,
    lancamentoFormDraft.valor_previsto,
    lancamentoFormDraft.quantidade_total_parcelas,
    lancamentoFormDraft.periodicidade,
    lancamentoFormDraft.periodicidade_customizada_dias,
    lancamentoFormDraft.data_vencimento,
    lancamentoFormDraft.data_emissao,
    lancamentoFormDraft.recorrencia_com_entrada,
    editingItem
  ]);

  // Financial Calculations
  const calculations = useMemo(() => {
    const valorBase = parseMoney(lancamentoFormDraft.valor_previsto);
    
    let desconto = parseMoney(lancamentoFormDraft.desconto_valor);
    if (lancamentoFormDraft.desconto_tipo === 'porcentagem') {
      desconto = (valorBase * desconto) / 100;
    }

    let acrescimo = parseMoney(lancamentoFormDraft.acrescimo_valor);
    if (lancamentoFormDraft.acrescimo_tipo === 'porcentagem') {
      acrescimo = (valorBase * acrescimo) / 100;
    }

    const subtotal = valorBase - desconto + acrescimo;
    const recebido = parseMoney(lancamentoFormDraft.valor_recebido);
    const diferenca = recebido - subtotal;
    
    return {
      subtotal,
      diferenca,
      isTroco: diferenca > 0,
      isDevedor: diferenca < 0
    };
  }, [
    lancamentoFormDraft.valor_previsto,
    lancamentoFormDraft.desconto_valor,
    lancamentoFormDraft.desconto_tipo,
    lancamentoFormDraft.acrescimo_valor,
    lancamentoFormDraft.acrescimo_tipo,
    lancamentoFormDraft.valor_recebido
  ]);

  const handleClose = () => {
    setModalOpen('isNovoLancamentoOpen', false);
    setSelectedLancamentoIdForModal(null);
    setSelectedRecorrenciaAction(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const val = parseMoney(lancamentoFormDraft.valor_previsto);
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
      data_competencia: lancamentoFormDraft.data_competencia,
      data_pagamento: lancamentoFormDraft.ja_recebido ? lancamentoFormDraft.data_pagamento : null,
      entidade_id: lancamentoFormDraft.entidade_id || null,
      centro_custo_id: lancamentoFormDraft.centro_custo_id || null,
      categoria_id: lancamentoFormDraft.categoria_id || null,
      conta_bancaria_id: lancamentoFormDraft.conta_bancaria_id || null,
      status_pagamento: lancamentoFormDraft.ja_recebido ? 'pago' : 'aberto',
      status_aprovacao: editingItem?.status_aprovacao || 'pendente_digital',
      observacoes: lancamentoFormDraft.observacoes,
      condicao: lancamentoFormDraft.condicao,
      ja_recebido: lancamentoFormDraft.ja_recebido,
      desconto_valor: parseMoney(lancamentoFormDraft.desconto_valor),
      desconto_tipo: lancamentoFormDraft.desconto_tipo,
      acrescimo_valor: parseMoney(lancamentoFormDraft.acrescimo_valor),
      acrescimo_tipo: lancamentoFormDraft.acrescimo_tipo,
      valor_recebido: parseMoney(lancamentoFormDraft.valor_recebido)
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let createdItem;

      if (editingItem) {
        createdItem = await updateLancamento({
          id: editingItem.id,
          data: itemDetails,
          mode: selectedRecorrenciaAction || undefined
        });
        showToast('Lançamento atualizado com sucesso!', 'success');
      } else {
        let recurrencePayload = undefined;
        const isRecurrent = lancamentoFormDraft.condicao === 'a_prazo' || lancamentoFormDraft.recorrencia_repeat;
        
        if (isRecurrent && parcelasManuais.length > 0) {
          recurrencePayload = {
            periodicidade: lancamentoFormDraft.periodicidade,
            periodicidade_customizada_dias: lancamentoFormDraft.periodicidade === 'personalizado' ? parseInt(lancamentoFormDraft.periodicidade_customizada_dias) : undefined,
            quantidade_total_parcelas: parcelasManuais.length,
            parcelas: parcelasManuais.map(p => ({
              data_vencimento: p.data,
              valor_previsto: parseMoney(p.valor)
            }))
          };
        }

        createdItem = await createLancamento({
          item: itemDetails,
          recorrencia: recurrencePayload
        });
      }

      // Handle Attachments
      const lancamentoId = editingItem ? editingItem.id : (createdItem as any)?.id;
      if (lancamentoId && attachments.length > 0) {
        for (const attachment of attachments) {
          const fileExt = (attachment as LocalFile).name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `lancamentos/${lancamentoId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, (attachment as LocalFile).file);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('documents')
              .getPublicUrl(filePath);

            await (supabase.from('lancamento_anexos') as any).insert({
              lancamento_id: lancamentoId,
              nome: (attachment as LocalFile).name,
              url: publicUrl,
              tamanho: (attachment as LocalFile).size,
              tipo_arquivo: (attachment as LocalFile).type,
              user_id: user?.id
            });
          } else {
            console.error('Erro ao subir anexo:', uploadError);
          }
        }
      }

      showToast(editingItem ? 'Lançamento atualizado!' : 'Lançamento cadastrado com sucesso!', 'success');
      resetAllDrafts();
      setAttachments([]);
      handleClose();
    } catch (err: any) {
      showToast('Ocorreu um problema: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Action Modal States
  const [isQuickCatOpen, setIsQuickCatOpen] = useState(false);
  const [isQuickCCOpen, setIsQuickCCOpen] = useState(false);
  const [isQuickAccountOpen, setIsQuickAccountOpen] = useState(false);

  // Quick Action Form States
  const [quickCatName, setQuickCatName] = useState('');
  const [quickCCName, setQuickCCName] = useState('');
  const [quickAccountName, setQuickAccountName] = useState('');
  const [quickAccountSaldo, setQuickAccountSaldo] = useState('0,00');

  const handleQuickCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newCat = await createCategory({ nome: quickCatName, tipo: lancamentoFormDraft.tipo });
      if (newCat) setLancamentoFormDraft({ categoria_id: (newCat as any).id });
      setIsQuickCatOpen(false);
      setQuickCatName('');
      showToast('Categoria criada!', 'success');
    } catch (err) { showToast('Erro ao criar categoria', 'error'); }
  };

  const handleQuickCCSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newCC = await createCC({ nome: quickCCName, descricao: '' });
      if (newCC) setLancamentoFormDraft({ centro_custo_id: (newCC as any).id });
      setIsQuickCCOpen(false);
      setQuickCCName('');
      showToast('Centro de custo criado!', 'success');
    } catch (err) { showToast('Erro ao criar centro', 'error'); }
  };

  const handleQuickAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newAccount = await createAccount({
        nome_banco: quickAccountName,
        nome: quickAccountName,
        saldo_inicial: parseMoney(quickAccountSaldo),
        agencia: '0001',
        conta: '0-0',
        data_abertura: new Date().toISOString()
      });
      if (newAccount) setLancamentoFormDraft({ conta_bancaria_id: (newAccount as any).id });
      setIsQuickAccountOpen(false);
      setQuickAccountName('');
      setQuickAccountSaldo('0,00');
      showToast('Conta bancária criada!', 'success');
    } catch (err) { showToast('Erro ao criar conta', 'error'); }
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
              className="w-full md:w-[550px] h-full bg-surface shadow-2xl flex flex-col relative z-20"
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
                  <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Direcionador de Fluxo Contábil</label>
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
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Valor Estimado <span className="text-alert-red">*</span></label>
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
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Condição</label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={lancamentoFormDraft.recorrencia_repeat}
                          onChange={(e) => setLancamentoFormDraft({ recorrencia_repeat: e.target.checked })}
                          className="rounded-md border-neutral-300 text-primary focus:ring-primary w-4 h-4 transition-all"
                        />
                        <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Repetir</span>
                      </label>
                    </div>
                    <div className="flex bg-neutral-100 dark:bg-surface-container border-2 border-neutral-100 dark:border-surface-border rounded-xl p-1 h-12 select-none">
                      <button 
                        type="button"
                        onClick={() => setLancamentoFormDraft({ condicao: 'a_vista' })}
                        className={`flex-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-tighter ${
                          lancamentoFormDraft.condicao === 'a_vista' 
                            ? 'bg-white dark:bg-surface text-primary shadow-sm' 
                            : 'text-secondary hover:text-on-surface'
                        }`}
                      >
                        À Vista
                      </button>
                      <button 
                        type="button"
                        onClick={() => setLancamentoFormDraft({ condicao: 'a_prazo' })}
                        className={`flex-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-tighter ${
                          lancamentoFormDraft.condicao === 'a_prazo' 
                            ? 'bg-white dark:bg-surface text-primary shadow-sm' 
                            : 'text-secondary hover:text-on-surface'
                        }`}
                      >
                        A Prazo
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-neutral-50 rounded-2xl border-2 border-neutral-100 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={lancamentoFormDraft.ja_recebido} 
                      onChange={(e) => setLancamentoFormDraft({ ja_recebido: e.target.checked })}
                      className="rounded-md border-neutral-300 text-primary focus:ring-primary w-5 h-5 transition-all"
                    />
                    <span className="font-black text-[10px] text-on-background uppercase tracking-wider">Já foi recebido / pago?</span>
                  </label>

                  {lancamentoFormDraft.ja_recebido && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Data do Recebimento</label>
                        <input 
                          type="date"
                          value={lancamentoFormDraft.data_pagamento}
                          onChange={(e) => setLancamentoFormDraft({ data_pagamento: e.target.value })}
                          className="w-full h-10 bg-white border-2 border-neutral-200 text-xs font-bold rounded-lg px-3 focus:outline-none focus:border-primary shadow-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Valor Recebido</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-secondary font-black">R$</span>
                          <MoneyInput
                            value={lancamentoFormDraft.valor_recebido}
                            onChange={(val) => setLancamentoFormDraft({ valor_recebido: val })}
                            className="w-full h-10 pl-8 pr-3 bg-white border-2 border-neutral-200 rounded-lg font-mono text-xs font-black text-on-surface focus:outline-none focus:border-primary shadow-xs"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Data de Competência</label>
                    <input 
                      type="date"
                      value={lancamentoFormDraft.data_competencia}
                      onChange={(e) => setLancamentoFormDraft({ data_competencia: e.target.value })}
                      className="w-full h-12 bg-white border-2 border-neutral-200 text-sm font-bold rounded-xl focus:outline-none focus:border-primary transition-all px-4 shadow-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Data de Vencimento <span className="text-alert-red">*</span></label>
                    <input 
                      type="date"
                      required
                      value={lancamentoFormDraft.data_vencimento}
                      onChange={(e) => setLancamentoFormDraft({ data_vencimento: e.target.value })}
                      className="w-full h-12 bg-white border-2 border-neutral-200 text-sm font-bold rounded-xl focus:outline-none focus:border-primary transition-all px-4 shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Desconto</label>
                      <div className="flex bg-neutral-100 rounded-lg p-0.5">
                        <button type="button" onClick={() => setLancamentoFormDraft({ desconto_tipo: 'valor' })} className={`px-1.5 py-0.5 text-[9px] font-black rounded ${lancamentoFormDraft.desconto_tipo === 'valor' ? 'bg-white shadow-sm text-primary' : 'text-neutral-400'}`}>R$</button>
                        <button type="button" onClick={() => setLancamentoFormDraft({ desconto_tipo: 'porcentagem' })} className={`px-1.5 py-0.5 text-[9px] font-black rounded ${lancamentoFormDraft.desconto_tipo === 'porcentagem' ? 'bg-white shadow-sm text-primary' : 'text-neutral-400'}`}>%</button>
                      </div>
                    </div>
                    <MoneyInput
                      value={lancamentoFormDraft.desconto_valor}
                      onChange={(val) => setLancamentoFormDraft({ desconto_valor: val })}
                      className="w-full h-12 px-4 bg-white border-2 border-neutral-200 rounded-xl font-mono text-sm font-black text-on-surface focus:outline-none focus:border-primary transition-all shadow-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Acréscimo</label>
                      <div className="flex bg-neutral-100 rounded-lg p-0.5">
                        <button type="button" onClick={() => setLancamentoFormDraft({ acrescimo_tipo: 'valor' })} className={`px-1.5 py-0.5 text-[9px] font-black rounded ${lancamentoFormDraft.acrescimo_tipo === 'valor' ? 'bg-white shadow-sm text-primary' : 'text-neutral-400'}`}>R$</button>
                        <button type="button" onClick={() => setLancamentoFormDraft({ acrescimo_tipo: 'porcentagem' })} className={`px-1.5 py-0.5 text-[9px] font-black rounded ${lancamentoFormDraft.acrescimo_tipo === 'porcentagem' ? 'bg-white shadow-sm text-primary' : 'text-neutral-400'}`}>%</button>
                      </div>
                    </div>
                    <MoneyInput
                      value={lancamentoFormDraft.acrescimo_valor}
                      onChange={(val) => setLancamentoFormDraft({ acrescimo_valor: val })}
                      className="w-full h-12 px-4 bg-white border-2 border-neutral-200 rounded-xl font-mono text-sm font-black text-on-surface focus:outline-none focus:border-primary transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-y-2 border-neutral-50 py-4">
                  <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Subtotal</span>
                    <span className="text-sm font-black text-neutral-900">R$ {formatBRL(calculations.subtotal)}</span>
                  </div>
                  
                  {lancamentoFormDraft.ja_recebido && (
                    <div className="flex justify-between items-center px-2 mt-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${calculations.isTroco ? 'text-bank-truth-green' : calculations.isDevedor ? 'text-alert-red' : 'text-secondary'}`}>
                        {calculations.isTroco ? 'Troco' : calculations.isDevedor ? 'Devedor' : 'Saldo'}
                      </span>
                      <span className={`text-sm font-black ${calculations.isTroco ? 'text-bank-truth-green' : calculations.isDevedor ? 'text-alert-red' : 'text-neutral-900'}`}>
                        R$ {formatBRL(Math.abs(calculations.diferenca))}
                      </span>
                    </div>
                  )}
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
                    onQuickAddClick={() => setIsQuickCatOpen(true)}
                    quickAddLabel="Nova Categoria"
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
                    onQuickAddClick={() => setIsQuickCCOpen(true)}
                    quickAddLabel="Novo Centro de Custo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Conta Bancária <span className="text-alert-red">*</span></label>
                      <button type="button" onClick={() => setIsQuickAccountOpen(true)} className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1"><Plus className="w-3 h-3" /> Nova Conta</button>
                    </div>
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
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Data de Emissão</label>
                    <input 
                      type="date"
                      value={lancamentoFormDraft.data_emissao}
                      onChange={(e) => setLancamentoFormDraft({ data_emissao: e.target.value })}
                      className="w-full h-12 bg-white border-2 border-neutral-200 text-sm font-bold rounded-xl focus:outline-none focus:border-primary transition-all px-4 shadow-xs"
                    />
                  </div>
                </div>

                {/* Seção de Parcelamento / Repetição */}
                {!editingItem && (lancamentoFormDraft.condicao === 'a_prazo' || lancamentoFormDraft.recorrencia_repeat) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-neutral-50 dark:bg-surface-container border-2 border-neutral-100 dark:border-surface-border rounded-2xl space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          {lancamentoFormDraft.recorrencia_repeat ? <Repeat className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-tight text-on-surface">
                            {lancamentoFormDraft.recorrencia_repeat ? 'Configuração de Repetição' : 'Configuração de Parcelas'}
                          </h3>
                          <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">Defina como os lançamentos serão gerados</p>
                        </div>
                      </div>
                      
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Com Entrada?</span>
                        <div
                          onClick={() => setLancamentoFormDraft({ recorrencia_com_entrada: !lancamentoFormDraft.recorrencia_com_entrada })}
                          className={`w-10 h-5 rounded-full transition-all relative ${lancamentoFormDraft.recorrencia_com_entrada ? 'bg-primary' : 'bg-neutral-300'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${lancamentoFormDraft.recorrencia_com_entrada ? 'left-6' : 'left-1'}`} />
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Nº vezes</span>
                        <div className="relative">
                          <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={lancamentoFormDraft.quantidade_total_parcelas}
                            onChange={(e) => setLancamentoFormDraft({ quantidade_total_parcelas: e.target.value })}
                            className="w-full h-10 pl-9 pr-3 bg-white border-2 border-neutral-200 text-xs font-bold rounded-lg focus:outline-none focus:border-primary shadow-xs"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Intervalo</span>
                        <select
                          value={lancamentoFormDraft.periodicidade}
                          onChange={(e) => setLancamentoFormDraft({ periodicidade: e.target.value as any })}
                          className="w-full h-10 bg-white border-2 border-neutral-200 text-xs font-bold rounded-lg px-3 focus:outline-none focus:border-primary shadow-xs cursor-pointer appearance-none"
                        >
                          <option value="diario">Diário</option>
                          <option value="semanal">Semanal</option>
                          <option value="quinzenal">Quinzenal</option>
                          <option value="mensal">Mensal</option>
                          <option value="bimestral">Bimestral</option>
                          <option value="trimestral">Trimestral</option>
                          <option value="semestral">Semestral</option>
                          <option value="anual">Anual</option>
                          <option value="personalizado">Personalizado</option>
                        </select>
                      </div>

                      {lancamentoFormDraft.periodicidade === 'personalizado' && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Qtd Dias</span>
                          <input
                            type="number"
                            min="1"
                            value={lancamentoFormDraft.periodicidade_customizada_dias}
                            onChange={(e) => setLancamentoFormDraft({ periodicidade_customizada_dias: e.target.value })}
                            className="w-full h-10 bg-white border-2 border-neutral-200 text-xs font-bold rounded-lg px-3 focus:outline-none focus:border-primary shadow-xs"
                          />
                        </div>
                      )}
                    </div>

                    {parcelasManuais.length > 0 && (
                      <div className="mt-4 border-2 border-neutral-100 rounded-xl overflow-hidden bg-white">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-100">
                              <th className="px-3 py-2 text-[9px] font-black text-secondary uppercase tracking-widest text-left w-16">Parc.</th>
                              <th className="px-3 py-2 text-[9px] font-black text-secondary uppercase tracking-widest text-left">Vencimento</th>
                              <th className="px-3 py-2 text-[9px] font-black text-secondary uppercase tracking-widest text-left">Valor (R$)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {parcelasManuais.map((parc, idx) => (
                              <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                                <td className="px-3 py-2 text-xs font-black text-neutral-400">#{parc.numero}</td>
                                <td className="px-2 py-1.5">
                                  <input
                                    type="date"
                                    value={parc.data}
                                    onChange={(e) => {
                                      const newParcels = [...parcelasManuais];
                                      newParcels[idx].data = e.target.value;
                                      setParcelasManuais(newParcels);
                                    }}
                                    className="w-full bg-transparent border-none text-[11px] font-bold text-on-surface focus:ring-0 p-1"
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  <MoneyInput
                                    value={parc.valor}
                                    onChange={(val) => {
                                      const newParcels = [...parcelasManuais];
                                      newParcels[idx].valor = val;
                                      setParcelasManuais(newParcels);
                                    }}
                                    className="w-full bg-transparent border-none text-[11px] font-black text-on-surface focus:ring-0 p-1 font-mono"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Nota Fiscal / Produto</label>
                  <div className="relative group cursor-pointer h-12 border-2 border-dashed border-neutral-200 rounded-xl hover:border-primary transition-all flex items-center justify-center gap-2 text-secondary hover:text-primary bg-neutral-50/50">
                    <Paperclip className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase">{(attachments.length + (existingAnexos?.length || 0)) > 0 ? `${attachments.length + (existingAnexos?.length || 0)} Anexo(s)` : 'Anexar Documento'}</span>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          const fileList = Array.from(e.target.files) as File[];
                          const newFiles: LocalFile[] = fileList.map(f => ({
                            name: f.name,
                            size: f.size,
                            type: f.type,
                            file: f
                          }));
                          setAttachments(prev => [...prev, ...newFiles]);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Existing Remote Attachments */}
                  {existingAnexos && existingAnexos.map((anexo: any) => (
                    <div key={anexo.id} className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <a
                          href={anexo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold truncate max-w-[150px] hover:underline text-primary"
                        >
                          {anexo.nome} (Salvo)
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Excluir este anexo permanentemente?')) {
                            const path = anexo.url.split('documents/')[1];
                            deleteAnexo({ id: anexo.id, path });
                          }
                        }}
                        className="text-neutral-400 hover:text-alert-red transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Local Files to be Uploaded */}
                  {attachments.map((f, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-bold truncate max-w-[150px]">{(f as LocalFile).name}</span>
                      </div>
                      <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-neutral-400 hover:text-alert-red transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Observações Contábeis</label>
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
                  className="px-6 py-3 font-black text-[10px] text-secondary border-2 border-neutral-200 rounded-xl hover:bg-neutral-100 hover:border-neutral-300 transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                
                <button 
                  type="submit"
                  disabled={isSubmitting || isCreating || isUpdating}
                  className="px-8 py-3 font-black text-[10px] text-on-primary-container bg-primary-container hover:brightness-95 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2 uppercase tracking-widest"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isSubmitting ? 'Salvando...' : 'Salvar Registro'}
                </button>
              </footer>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Action Modals */}
      <AnimatePresence>
        {isQuickCatOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsQuickCatOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.form initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onSubmit={handleQuickCatSubmit} className="bg-white w-full max-w-[400px] rounded-3xl shadow-2xl relative z-10 overflow-hidden">
              <header className="px-8 py-5 border-b border-neutral-100 flex justify-between items-center"><h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">Nova Categoria</h3><button type="button" onClick={() => setIsQuickCatOpen(false)}><X className="w-5 h-5 text-neutral-400" /></button></header>
              <div className="p-8 space-y-4">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400">Nome</label><input type="text" required value={quickCatName} onChange={(e) => setQuickCatName(e.target.value)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold outline-none focus:border-primary" /></div>
              </div>
              <footer className="px-8 py-6 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsQuickCatOpen(false)} className="px-4 py-2 text-[10px] font-black uppercase text-neutral-500">Cancelar</button>
                <Button type="submit">Adicionar</Button>
              </footer>
            </motion.form>
          </div>
        )}

        {isQuickCCOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsQuickCCOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.form initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onSubmit={handleQuickCCSubmit} className="bg-white w-full max-w-[400px] rounded-3xl shadow-2xl relative z-10 overflow-hidden">
              <header className="px-8 py-5 border-b border-neutral-100 flex justify-between items-center"><h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">Novo Centro de Custo</h3><button type="button" onClick={() => setIsQuickCCOpen(false)}><X className="w-5 h-5 text-neutral-400" /></button></header>
              <div className="p-8 space-y-4">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400">Nome</label><input type="text" required value={quickCCName} onChange={(e) => setQuickCCName(e.target.value)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold outline-none focus:border-primary" /></div>
              </div>
              <footer className="px-8 py-6 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsQuickCCOpen(false)} className="px-4 py-2 text-[10px] font-black uppercase text-neutral-500">Cancelar</button>
                <Button type="submit">Adicionar</Button>
              </footer>
            </motion.form>
          </div>
        )}

        {isQuickAccountOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsQuickAccountOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.form initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onSubmit={handleQuickAccountSubmit} className="bg-white w-full max-w-[400px] rounded-3xl shadow-2xl relative z-10 overflow-hidden">
              <header className="px-8 py-5 border-b border-neutral-100 flex justify-between items-center"><h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">Nova Conta Bancária</h3><button type="button" onClick={() => setIsQuickAccountOpen(false)}><X className="w-5 h-5 text-neutral-400" /></button></header>
              <div className="p-8 space-y-4">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400">Nome do Banco / Conta</label><input type="text" required value={quickAccountName} onChange={(e) => setQuickAccountName(e.target.value)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold outline-none focus:border-primary" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400">Saldo Inicial</label><MoneyInput value={quickAccountSaldo} onChange={setQuickAccountSaldo} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold outline-none focus:border-primary" /></div>
              </div>
              <footer className="px-8 py-6 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsQuickAccountOpen(false)} className="px-4 py-2 text-[10px] font-black uppercase text-neutral-500">Cancelar</button>
                <Button type="submit">Adicionar</Button>
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
