import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  DollarSign,
  Calendar,
  Wallet
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useLancamentos, useContas } from '../hooks/useData';
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

  const { data: lancamentos = [], baixaLancamento } = useLancamentos();
  const { data: contas = [] } = useContas();

  const [loading, setLoading] = useState(false);
  const [valorPago, setValorPago] = useState('');
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [contaId, setContaId] = useState('');
  const [showPartialWarning, setShowPartialWarning] = useState(false);

  const lancamento = lancamentos.find(l => l.id === selectedLancamentoIdForModal);

  useEffect(() => {
    if (lancamento) {
      setValorPago(formatBRL(lancamento.valor_previsto));
      setContaId(lancamento.conta_bancaria_id || (contas[0]?.id || ''));
    }
  }, [lancamento, contas]);

  if (!lancamento) return null;

  const handleClose = () => {
    setModalOpen('isBaixaLancamentoOpen', false);
    setSelectedLancamentoIdForModal(null);
    setShowPartialWarning(false);
  };

  const totalOriginal = lancamento.valor_previsto;
  const valorDigitado = parseMoney(valorPago);
  const isPartial = valorDigitado < totalOriginal;
  const saldoRestante = totalOriginal - valorDigitado;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (valorDigitado <= 0) {
      alert('Informe um valor válido.');
      return;
    }

    if (isPartial && !showPartialWarning) {
      setShowPartialWarning(true);
      return;
    }

    setLoading(true);
    try {
      await baixaLancamento({
        id: lancamento.id,
        data: {
          valor_pago: valorDigitado,
          data_pagamento: dataPagamento,
          conta_bancaria_id: contaId
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
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
          />

          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white w-full max-w-[480px] rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-neutral-100"
          >
            <header className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">Confirmar Liquidação</h3>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-0.5">Dando baixa no título financeiro</p>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-neutral-200 rounded-xl transition-all">
                <X className="w-5 h-5 text-secondary" />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-secondary uppercase tracking-widest block">Valor Total do Título</span>
                  <span className="text-xl font-black text-on-surface">R$ {formatBRL(totalOriginal)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-secondary tracking-widest flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Valor a ser Pago
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-secondary">R$</span>
                    <MoneyInput 
                      value={valorPago}
                      onChange={setValorPago}
                      className="w-full h-14 pl-10 pr-4 bg-neutral-50 border-2 border-neutral-100 rounded-2xl text-lg font-black text-on-surface focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-secondary tracking-widest flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Data do Pagamento
                    </label>
                    <input 
                      type="date"
                      value={dataPagamento}
                      onChange={(e) => setDataPagamento(e.target.value)}
                      className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-secondary tracking-widest">Conta de Destino</label>
                    <select 
                      value={contaId}
                      onChange={(e) => setContaId(e.target.value)}
                      className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold outline-none focus:border-primary appearance-none cursor-pointer"
                    >
                      {contas.map(c => (
                        <option key={c.id} value={c.id}>{c.nome_banco}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {showPartialWarning && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-alert-red/5 border-2 border-alert-red/20 rounded-2xl flex gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-alert-red shrink-0" />
                  <div>
                    <p className="text-xs font-black text-alert-red uppercase tracking-tight">Pagamento Parcial Detectado!</p>
                    <p className="text-[10px] font-bold text-on-surface-variant mt-1">
                      Você está pagando R$ {formatBRL(valorDigitado)}. 
                      Ficará um saldo em aberto de <strong className="text-alert-red">R$ {formatBRL(saldoRestante)}</strong>. 
                      Deseja confirmar?
                    </p>
                  </div>
                </motion.div>
              )}
            </form>

            <footer className="px-8 py-6 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={handleClose} 
                className="px-6 py-3 text-[10px] font-black uppercase text-secondary hover:text-on-surface transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="px-10 py-3 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg hover:bg-black transition-all active:scale-[0.98] flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {showPartialWarning ? 'Confirmar Parcial' : 'Baixar Título'}
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
