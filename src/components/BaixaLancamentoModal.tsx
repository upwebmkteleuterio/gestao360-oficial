import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  DollarSign,
  Calendar,
  Wallet,
  Percent,
  TrendingUp,
  TrendingDown,
  Info,
  ChevronDown,
  Plus,
  User,
  Tag,
  CreditCard,
  MessageSquare
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useLancamentos, useContas, useEntidades, useCategorias, useCategoriasAjuste } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import MoneyInput from './MoneyInput';
import Button from './Button';

function formatBRL(value: any): string {
  if (value === null || value === undefined) return '0,00';
  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return value;
}

function parseMoney(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const cleanStr = value.toString().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleanStr) || 0;
}

export default function BaixaLancamentoModal() {
  const { 
    isBaixaLancamentoOpen, 
    setModalOpen, 
    selectedLancamentoIdForModal,
    setSelectedLancamentoIdForModal
  } = useUIStore();

  const { role } = useAuth();
  const { data: lancamentos = [], baixaLancamento } = useLancamentos();
  const { data: contas = [] } = useContas();
  const { data: entidades = [] } = useEntidades();
  const { data: categorias = [] } = useCategorias();
  const { categoriasAjuste, createCategoriaAjuste } = useCategoriasAjuste();

  const [loading, setLoading] = useState(false);
  
  // Fields
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [contaId, setContaId] = useState('');
  
  const [tipoBaixa, setTipoBaixa] = useState<'financeira' | 'bpi' | 'avr'>('financeira');
  
  const [descontoValor, setDescontoValor] = useState('');
  const [descontoTipo, setDescontoTipo] = useState<'valor' | 'porcentagem'>('valor');
  const [motivoDescontoId, setMotivoDescontoId] = useState('');
  
  const [acrescimoValor, setAcrescimoValor] = useState('');
  const [acrescimoTipo, setAcrescimoTipo] = useState<'valor' | 'porcentagem'>('valor');
  const [motivoAcrescimoId, setMotivoAcrescimoId] = useState('');
  
  const [valorPago, setValorPago] = useState('');
  const [observacao, setObservacao] = useState('');

  // Quick add states
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'desconto' | 'acrescimo'>('desconto');
  const [quickAddName, setQuickAddName] = useState('');

  const lancamento = lancamentos.find(l => l.id === selectedLancamentoIdForModal);

  useEffect(() => {
    if (lancamento) {
      setValorPago(formatBRL(lancamento.valor_previsto));
      setContaId(lancamento.conta_bancaria_id || (contas[0]?.id || ''));
      // Reset details
      setDescontoValor('');
      setDescontoTipo('valor');
      setMotivoDescontoId('');
      setAcrescimoValor('');
      setAcrescimoTipo('valor');
      setMotivoAcrescimoId('');
      setObservacao('');
      setTipoBaixa('financeira');
    }
  }, [lancamento, contas]);

  if (!lancamento) return null;

  const handleClose = () => {
    setModalOpen('isBaixaLancamentoOpen', false);
    setSelectedLancamentoIdForModal(null);
  };

  const isGerenteOrMaster = role === 'master' || role === 'gerente';

  // Math Calculations in Real-time
  const totalOriginal = lancamento.valor_previsto;
  
  // Calculate discount value
  const numericDesconto = parseMoney(descontoValor);
  const calculatedDesconto = descontoTipo === 'porcentagem' 
    ? (totalOriginal * numericDesconto) / 100 
    : numericDesconto;

  // Calculate increase value
  const numericAcrescimo = parseMoney(acrescimoValor);
  const calculatedAcrescimo = acrescimoTipo === 'porcentagem' 
    ? (totalOriginal * numericAcrescimo) / 100 
    : numericAcrescimo;

  const subtotalCalculado = Math.max(0, totalOriginal - calculatedDesconto + calculatedAcrescimo);
  const valorDigitado = parseMoney(valorPago);

  // Checks and balances
  const diff = subtotalCalculado - valorDigitado;
  const isPartial = valorDigitado < subtotalCalculado && valorDigitado > 0;
  const isOverpaid = valorDigitado > subtotalCalculado;
  
  // BPI locks everything, AVR allows editing valorPago
  const isBpi = tipoBaixa === 'bpi';
  const isAVR = tipoBaixa === 'avr';
  
  // Adjustment Reasons Logic
  const discReasons = (categoriasAjuste || []).filter(c => c.tipo === 'desconto');
  const incrReasons = (categoriasAjuste || []).filter(c => c.tipo === 'acrescimo');

  const isDescontoReasonRequired = calculatedDesconto > 0;
  const isAcrescimoReasonRequired = calculatedAcrescimo > 0;
  
  const isDescontoReasonSelected = !!motivoDescontoId;
  const isAcrescimoReasonSelected = !!motivoAcrescimoId;

  // Logic for mandatory observation: BPI, AVR or manual divergence
  const hasFinancialDivergence = calculatedDesconto > 0 || calculatedAcrescimo > 0 || isPartial;
  const isObsRequired = isBpi || isAVR || hasFinancialDivergence;
  const isObsFilled = observacao.trim().length > 0;
  
  const canSave = (!isObsRequired || isObsFilled) &&
                  (!isDescontoReasonRequired || isDescontoReasonSelected) &&
                  (!isAcrescimoReasonRequired || isAcrescimoReasonSelected) &&
                  !isOverpaid && valorDigitado > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    setLoading(true);
    try {
      await baixaLancamento({
        id: lancamento.id,
        data: {
          valor_pago: valorDigitado,
          data_pagamento: dataPagamento,
          conta_bancaria_id: contaId,
          tipo_baixa: tipoBaixa,
          valor_desconto: calculatedDesconto,
          valor_acrescimo: calculatedAcrescimo,
          motivo_desconto_id: motivoDescontoId || undefined,
          motivo_acrescimo_id: motivoAcrescimoId || undefined,
          motivo_ajuste: observacao
        }
      });

      handleClose();
    } catch (err: any) {
      alert('Erro ao processar baixa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddReason = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createCategoriaAjuste({ nome: quickAddName, tipo: quickAddType });
      if (quickAddType === 'desconto') setMotivoDescontoId(result.id);
      else setMotivoAcrescimoId(result.id);
      setIsQuickAddOpen(false);
      setQuickAddName('');
    } catch (err: any) {
      alert('Erro ao criar categoria: ' + err.message);
    }
  };

  const entName = entidades.find(e => e.id === lancamento.entidade_id)?.nome_razao_social || 'Desconhecido';
  const catName = categorias.find(c => c.id === lancamento.categoria_id)?.nome || 'Sem categoria';
  const accName = contas.find(c => c.id === lancamento.conta_bancaria_id)?.nome_banco || 'Sem conta';

  return (
    <AnimatePresence>
      {isBaixaLancamentoOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs"
          />

          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white w-full max-w-[560px] rounded-[32px] shadow-2xl relative z-10 overflow-hidden border border-neutral-100 flex flex-col max-h-[90vh]"
          >
            <header className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50 shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">Operações de Baixa de Título</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-secondary">
                    <User className="w-3 h-3" /> {entName}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-secondary">
                    <Tag className="w-3 h-3" /> {catName}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-secondary">
                    <CreditCard className="w-3 h-3" /> {accName}
                  </div>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-neutral-200 rounded-xl transition-all">
                <X className="w-5 h-5 text-secondary" />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin">
              
              {/* Resumo - ReadOnly */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <span className="text-[9px] font-black text-secondary uppercase tracking-widest block mb-1">Valor Original do Título</span>
                  <span className="text-lg font-black text-on-surface">R$ {formatBRL(totalOriginal)}</span>
                </div>
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <span className="text-[9px] font-black text-secondary uppercase tracking-widest block mb-1">Vencimento Original</span>
                  <span className="text-lg font-black text-primary">{lancamento.data_vencimento.split('-').reverse().join('/')}</span>
                </div>
              </div>

              {/* Tipo de Baixa */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-secondary tracking-widest">Tipo de Baixa</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'financeira', label: 'Quitar', desc: 'Liquidação normal' },
                    { id: 'bpi', label: 'BPI', desc: 'Baixa por inatividade' },
                    { id: 'avr', label: 'AVR', desc: 'Ajuste do valor real' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTipoBaixa(opt.id as any)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all ${
                        tipoBaixa === opt.id 
                          ? 'border-neutral-900 bg-neutral-900 text-white' 
                          : 'border-neutral-100 bg-neutral-50 text-neutral-600 hover:border-neutral-200'
                      }`}
                    >
                      <p className="text-xs font-black uppercase">{opt.label}</p>
                      <p className={`text-[8px] font-bold uppercase ${tipoBaixa === opt.id ? 'text-white/60' : 'text-neutral-400'}`}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Desconto & Acréscimo */}
              <div className="grid grid-cols-2 gap-6">
                {/* Desconto */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-secondary tracking-widest flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-bank-truth-green" /> Desconto
                    </label>
                  </div>
                  <div className="flex bg-neutral-50 border-2 border-neutral-100 rounded-2xl overflow-hidden focus-within:border-primary transition-all">
                    <select
                      disabled={!isGerenteOrMaster || isBpi}
                      value={descontoTipo}
                      onChange={(e) => setDescontoTipo(e.target.value as any)}
                      className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-3 border-r-2 border-neutral-100 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <option value="valor">R$</option>
                      <option value="porcentagem">%</option>
                    </select>
                    <MoneyInput
                      disabled={!isGerenteOrMaster || isBpi}
                      value={descontoValor}
                      onChange={setDescontoValor}
                      className="w-full h-12 bg-transparent border-none text-xs font-black text-on-surface focus:outline-none px-4 disabled:opacity-50"
                      placeholder="0,00"
                    />
                  </div>

                  {calculatedDesconto > 0 && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black uppercase text-secondary tracking-widest">Motivo Desconto <span className="text-alert-red">*</span></label>
                        <button
                          type="button"
                          onClick={() => { setQuickAddType('desconto'); setIsQuickAddOpen(true); }}
                          className="text-[8px] font-black uppercase text-primary hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-2.5 h-2.5" /> Novo
                        </button>
                      </div>
                      <select
                        value={motivoDescontoId}
                        onChange={(e) => setMotivoDescontoId(e.target.value)}
                        className={`w-full h-10 bg-neutral-50 border-2 rounded-xl px-3 text-[10px] font-bold outline-none appearance-none cursor-pointer transition-all ${
                          isDescontoReasonSelected ? 'border-neutral-100' : 'border-alert-red/30'
                        }`}
                      >
                        <option value="">Selecione o motivo...</option>
                        {discReasons.map(r => (
                          <option key={r.id} value={r.id}>{r.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Acréscimo */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-secondary tracking-widest flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-alert-red" /> Acréscimo/Juros
                  </label>
                  <div className="flex bg-neutral-50 border-2 border-neutral-100 rounded-2xl overflow-hidden focus-within:border-primary transition-all">
                    <select
                      disabled={isBpi}
                      value={acrescimoTipo}
                      onChange={(e) => setAcrescimoTipo(e.target.value as any)}
                      className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-3 border-r-2 border-neutral-100 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <option value="valor">R$</option>
                      <option value="porcentagem">%</option>
                    </select>
                    <MoneyInput
                      disabled={isBpi}
                      value={acrescimoValor}
                      onChange={setAcrescimoValor}
                      className="w-full h-12 bg-transparent border-none text-xs font-black text-on-surface focus:outline-none px-4 disabled:opacity-50"
                      placeholder="0,00"
                    />
                  </div>

                  {calculatedAcrescimo > 0 && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black uppercase text-secondary tracking-widest">Motivo Acréscimo <span className="text-alert-red">*</span></label>
                        <button
                          type="button"
                          onClick={() => { setQuickAddType('acrescimo'); setIsQuickAddOpen(true); }}
                          className="text-[8px] font-black uppercase text-primary hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-2.5 h-2.5" /> Novo
                        </button>
                      </div>
                      <select
                        value={motivoAcrescimoId}
                        onChange={(e) => setMotivoAcrescimoId(e.target.value)}
                        className={`w-full h-10 bg-neutral-50 border-2 rounded-xl px-3 text-[10px] font-bold outline-none appearance-none cursor-pointer transition-all ${
                          isAcrescimoReasonSelected ? 'border-neutral-100' : 'border-alert-red/30'
                        }`}
                      >
                        <option value="">Selecione o motivo...</option>
                        {incrReasons.map(r => (
                          <option key={r.id} value={r.id}>{r.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Subtotal Calculado */}
              <div className="p-4 bg-neutral-900 text-white rounded-3xl flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block">Subtotal Calculado</span>
                  <span className="text-xl font-black font-mono">R$ {formatBRL(subtotalCalculado)}</span>
                </div>
                {(calculatedDesconto > 0 || calculatedAcrescimo > 0) && (
                  <div className="text-right">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block">Diferença</span>
                    <span className={`text-xs font-black font-mono ${calculatedDesconto > calculatedAcrescimo ? 'text-bank-truth-green' : 'text-alert-red'}`}>
                      {calculatedDesconto > calculatedAcrescimo ? '-' : '+'} R$ {formatBRL(Math.abs(calculatedDesconto - calculatedAcrescimo))}
                    </span>
                  </div>
                )}
              </div>

              {/* Input de Valor Recebido/Pago */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-secondary tracking-widest flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Valor Recebido / Pago
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-secondary">R$</span>
                    <MoneyInput 
                      disabled={isBpi}
                      value={valorPago}
                      onChange={setValorPago}
                      className="w-full h-12 pl-10 pr-4 bg-neutral-50 border-2 border-neutral-100 rounded-2xl text-sm font-black text-on-surface focus:outline-none focus:border-primary transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  {/* Badges de Devedor / Troco */}
                  {isPartial && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-alert-red h-12">
                      <span className="w-2 h-2 rounded-full bg-alert-red animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-tight">Devedor: R$ {formatBRL(diff)}</span>
                    </div>
                  )}
                  {isOverpaid && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-alert-red h-12">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-tight">Excede o Subtotal!</span>
                    </div>
                  )}
                  {valorDigitado > 0 && !isPartial && !isOverpaid && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-bank-truth-green h-12">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-tight">Quitação Integral</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CONTEXTUAL JUSTIFICATION BOX */}
              <AnimatePresence>
                {isObsRequired && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className="space-y-2 p-5 bg-amber-50 rounded-3xl border-2 border-amber-100 shadow-sm overflow-hidden"
                  >
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase text-amber-700 tracking-widest flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Justificativa da Alteração <span className="text-alert-red">*</span>
                      </label>
                      <span className="text-[8px] bg-amber-200/50 text-amber-800 font-black uppercase px-2 py-0.5 rounded">Obrigatório</span>
                    </div>
                    <textarea
                      required
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      placeholder={
                        isBpi 
                          ? "Explique o motivo desta baixa por inatividade (Cancelamento)..." 
                          : isAVR 
                            ? "Justifique o ajuste do valor real do título..." 
                            : "Explique o motivo da diferença no pagamento (ex: Juros, arredondamento, taxa)..."
                      }
                      className="w-full p-4 bg-white border-2 border-amber-200 rounded-2xl text-xs font-bold text-neutral-800 focus:border-amber-400 outline-none resize-none shadow-inner"
                      rows={3}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Data & Conta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-secondary tracking-widest flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Data do Pagamento
                  </label>
                  <input 
                    type="date"
                    disabled={isBpi}
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-4 text-xs font-bold outline-none focus:border-primary disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-secondary tracking-widest">Conta / Caixa</label>
                  <select 
                    disabled={isBpi}
                    value={contaId}
                    onChange={(e) => setContaId(e.target.value)}
                    className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-4 text-xs font-bold outline-none focus:border-primary appearance-none cursor-pointer disabled:opacity-50"
                  >
                    {contas.map(c => (
                      <option key={c.id} value={c.id}>{c.nome_banco}</option>
                    ))}
                  </select>
                </div>
              </div>

            </form>

            <footer className="px-8 py-6 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={handleClose} 
                className="px-6 py-3 text-[10px] font-black uppercase text-secondary hover:text-on-surface transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmit}
                disabled={loading || !canSave}
                className={`px-10 py-3 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center gap-2 ${
                  canSave 
                    ? 'bg-neutral-900 hover:bg-black cursor-pointer' 
                    : 'bg-neutral-300 cursor-not-allowed opacity-50'
                }`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isPartial ? 'Confirmar Parcial' : 'Baixar Título'}
              </button>
            </footer>
          </motion.div>
        </div>
      )}

      {/* Quick Add Reason Modal */}
      <AnimatePresence>
        {isQuickAddOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsQuickAddOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.form
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleQuickAddReason}
              className="bg-white w-full max-w-[360px] rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <header className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Novo Motivo de {quickAddType}</h4>
                <button type="button" onClick={() => setIsQuickAddOpen(false)}><X className="w-4 h-4 text-neutral-400" /></button>
              </header>
              <div className="p-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-secondary tracking-widest">Nome do Motivo</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={quickAddName}
                    onChange={(e) => setQuickAddName(e.target.value)}
                    className="w-full h-11 bg-neutral-50 border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold outline-none focus:border-primary"
                    placeholder="Ex: Pagamento Antecipado"
                  />
                </div>
              </div>
              <footer className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-2">
                <button type="button" onClick={() => setIsQuickAddOpen(false)} className="px-4 py-2 text-[9px] font-black uppercase text-secondary">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-neutral-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg">Salvar</button>
              </footer>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>

  );
}