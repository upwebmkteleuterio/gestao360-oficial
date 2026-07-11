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
  ChevronDown
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useLancamentos, useContas } from '../hooks/useData';
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

  const [loading, setLoading] = useState(false);
  
  // Fields
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [contaId, setContaId] = useState('');
  
  const [tipoBaixa, setTipoBaixa] = useState<'financeira' | 'bpi' | 'avr'>('financeira');
  
  const [descontoValor, setDescontoValor] = useState('');
  const [descontoTipo, setDescontoTipo] = useState<'valor' | 'porcentagem'>('valor');
  
  const [acrescimoValor, setAcrescimoValor] = useState('');
  const [acrescimoTipo, setAcrescimoTipo] = useState<'valor' | 'porcentagem'>('valor');
  
  const [valorPago, setValorPago] = useState('');
  const [observacao, setObservacao] = useState('');

  const lancamento = lancamentos.find(l => l.id === selectedLancamentoIdForModal);

  useEffect(() => {
    if (lancamento) {
      setValorPago(formatBRL(lancamento.valor_previsto));
      setContaId(lancamento.conta_bancaria_id || (contas[0]?.id || ''));
      // Reset details
      setDescontoValor('');
      setDescontoTipo('valor');
      setAcrescimoValor('');
      setAcrescimoTipo('valor');
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
  
  // Validation for Save button active state
  const isBpiOrAvr = tipoBaixa === 'bpi' || tipoBaixa === 'avr';
  const hasChanges = calculatedDesconto > 0 || calculatedAcrescimo > 0 || isBpiOrAvr;
  const isObsRequired = hasChanges;
  const isObsFilled = observacao.trim().length > 0;
  
  const canSave = (!isObsRequired || isObsFilled) && !isOverpaid && valorDigitado > 0;

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
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">Módulo de Liquidação</h3>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-0.5">Operações de Baixa de Título</p>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-neutral-200 rounded-xl transition-all">
                <X className="w-5 h-5 text-secondary" />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
              
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
              <div className="grid grid-cols-2 gap-4">
                {/* Desconto */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-secondary tracking-widest flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-bank-truth-green" /> Desconto
                    </label>
                    {!isGerenteOrMaster && (
                      <span className="text-[8px] bg-red-50 text-alert-red font-black uppercase px-2 py-0.5 rounded">Gerência</span>
                    )}
                  </div>
                  <div className="flex bg-neutral-50 border-2 border-neutral-100 rounded-2xl overflow-hidden focus-within:border-primary transition-all">
                    <select
                      disabled={!isGerenteOrMaster || isBpiOrAvr}
                      value={descontoTipo}
                      onChange={(e) => setDescontoTipo(e.target.value as any)}
                      className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-3 border-r-2 border-neutral-100 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <option value="valor">R$</option>
                      <option value="porcentagem">%</option>
                    </select>
                    <MoneyInput 
                      disabled={!isGerenteOrMaster || isBpiOrAvr}
                      value={descontoValor}
                      onChange={setDescontoValor}
                      className="w-full h-12 bg-transparent border-none text-xs font-black text-on-surface focus:outline-none px-4 disabled:opacity-50"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {/* Acréscimo */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-secondary tracking-widest flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-alert-red" /> Acréscimo/Juros
                  </label>
                  <div className="flex bg-neutral-50 border-2 border-neutral-100 rounded-2xl overflow-hidden focus-within:border-primary transition-all">
                    <select
                      disabled={isBpiOrAvr}
                      value={acrescimoTipo}
                      onChange={(e) => setAcrescimoTipo(e.target.value as any)}
                      className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-3 border-r-2 border-neutral-100 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <option value="valor">R$</option>
                      <option value="porcentagem">%</option>
                    </select>
                    <MoneyInput 
                      disabled={isBpiOrAvr}
                      value={acrescimoValor}
                      onChange={setAcrescimoValor}
                      className="w-full h-12 bg-transparent border-none text-xs font-black text-on-surface focus:outline-none px-4 disabled:opacity-50"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              {/* Subtotal Calculado */}
              <div className="p-4 bg-neutral-900 text-white rounded-3xl flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block">Subtotal Calculado</span>
                  <span className="text-xl font-black font-mono">R$ {formatBRL(subtotalCalculado)}</span>
                </div>
                {hasChanges && (
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
                      disabled={isBpiOrAvr}
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

              {/* Data & Conta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-secondary tracking-widest flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Data do Pagamento
                  </label>
                  <input 
                    type="date"
                    disabled={isBpiOrAvr}
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-4 text-xs font-bold outline-none focus:border-primary disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-secondary tracking-widest">Conta / Caixa</label>
                  <select 
                    disabled={isBpiOrAvr}
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

              {/* Observação / Motivo Ajuste (Obrigatória se hasChanges) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase text-secondary tracking-widest">
                    Motivo / Observação
                  </label>
                  {isObsRequired && (
                    <span className="text-[8px] bg-red-50 text-alert-red font-black uppercase px-2 py-0.5 rounded">Obrigatório</span>
                  )}
                </div>
                <textarea
                  required={isObsRequired}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder={
                    isBpiOrAvr 
                      ? "Explique o motivo deste cancelamento ou ajuste de valor real..." 
                      : "Ex: Juros por atraso / Desconto por antecipação..."
                  }
                  className="w-full p-4 bg-neutral-50 border-2 border-neutral-100 rounded-2xl text-xs font-bold focus:border-primary outline-none resize-none"
                  rows={2}
                />
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
    </AnimatePresence>
  );
}
