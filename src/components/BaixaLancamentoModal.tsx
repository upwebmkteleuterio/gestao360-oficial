"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, CheckCircle2, AlertTriangle, Loader2, DollarSign, Calendar, Wallet, TrendingUp, TrendingDown, Info, Plus, User, Tag, CreditCard, FileWarning, Clock, FileText
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useLancamentos, useContas, useEntidades, useCategorias, useCategoriasAjuste, useLancamentoAnexos } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import MoneyInput from './MoneyInput';
import Button from './Button';

export default function BaixaLancamentoModal() {
  const { isBaixaLancamentoOpen, setModalOpen, selectedLancamentoIdForModal, setSelectedLancamentoIdForModal } = useUIStore();
  const { data: lancamentos = [], baixaLancamento } = useLancamentos();
  const { data: contas = [] } = useContas();
  const { anexos = [] } = useLancamentoAnexos(selectedLancamentoIdForModal);
  
  const [loading, setLoading] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [horaPagamento, setHoraPagamento] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [contaId, setContaId] = useState('');
  const [valorPago, setValorPago] = useState('');
  const [isAVR, setIsAVR] = useState(false);
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [declararSemComprovante, setDeclararSemComprovante] = useState(false);

  const lancamento = lancamentos.find(l => l.id === selectedLancamentoIdForModal);
  const hasComprovante = anexos.length > 0;

  useEffect(() => {
    if (lancamento) {
      const valorFormatado = lancamento.valor_previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      setValorPago(valorFormatado);
      setContaId(lancamento.conta_bancaria_id || (contas[0]?.id || ''));
      setDeclararSemComprovante(false);
      setIsAVR(false);
      setMotivoAjuste('');
      setHoraPagamento(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }));
    }
  }, [lancamento, contas]);

  if (!lancamento) return null;

  const currentValorPagoNumeric = parseFloat(valorPago.replace(/\D/g, '')) / 100;
  const isDiff = Math.abs(currentValorPagoNumeric - lancamento.valor_previsto) > 0.01;
  const canSave = (hasComprovante || declararSemComprovante) && currentValorPagoNumeric > 0 && (!isAVR || (isAVR && motivoAjuste.length > 3));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setLoading(true);
    try {
      await baixaLancamento({
        id: lancamento.id,
        data: {
          valor_pago: currentValorPagoNumeric,
          data_pagamento: dataPagamento,
          hora_pagamento: horaPagamento,
          conta_bancaria_id: contaId,
          tipo_baixa: isAVR ? 'avr' : 'financeira',
          motivo_ajuste: isAVR ? motivoAjuste : undefined
        }
      });
      setModalOpen('isBaixaLancamentoOpen', false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isBaixaLancamentoOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-[500px] rounded-[32px] shadow-2xl overflow-hidden border border-neutral-100 flex flex-col">
            <header className="px-8 py-6 border-b flex justify-between items-center bg-neutral-50/50">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">Dar Baixa no Título</h3>
                <p className="text-[9px] font-bold text-secondary uppercase tracking-widest mt-1">Confirme os detalhes da liquidação bancária</p>
              </div>
              <button onClick={() => setModalOpen('isBaixaLancamentoOpen', false)}><X className="w-5 h-5" /></button>
            </header>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="p-4 bg-neutral-900 text-white rounded-2xl flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Valor do Lançamento</span>
                <span className="text-xl font-black font-mono">R$ {lancamento.valor_previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-secondary">Data do Pagamento</label>
                  <input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold focus:border-primary outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-secondary">Horário</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input type="time" value={horaPagamento} onChange={e => setHoraPagamento(e.target.value)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-xl pl-11 pr-4 text-xs font-bold focus:border-primary outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-secondary">Valor Liquidado</label>
                <div className="relative">
                  <MoneyInput value={valorPago} onChange={setValorPago} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-xl px-4 text-xs font-black focus:border-primary outline-none" />
                  
                  <AnimatePresence>
                    {isDiff && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute -bottom-10 right-0"
                      >
                        <button
                          type="button"
                          onClick={() => setIsAVR(!isAVR)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all shadow-sm ${
                            isAVR
                              ? 'bg-primary text-white ring-2 ring-primary/20'
                              : 'bg-white text-primary border border-primary/20 hover:bg-primary/5'
                          }`}
                        >
                          {isAVR ? <CheckCircle2 className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                          {isAVR ? 'AVR Ativado (Valor Ajustado)' : 'Ativar Ajuste Real (AVR)'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <AnimatePresence>
                {isAVR && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-6">
                      <label className="text-[10px] font-black uppercase text-secondary flex items-center gap-2">
                        <FileText className="w-3 h-3" /> Motivo do Ajuste de Valor (Obrigatório)
                      </label>
                      <textarea
                        value={motivoAjuste}
                        onChange={e => setMotivoAjuste(e.target.value)}
                        placeholder="Descreva o motivo da divergência de valor..."
                        className="w-full h-24 bg-neutral-50 border-2 border-neutral-100 rounded-xl p-4 text-xs font-bold focus:border-primary outline-none resize-none"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black uppercase text-secondary">Conta Bancária</label>
                <select
                  value={contaId}
                  onChange={e => setContaId(e.target.value)}
                  className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold focus:border-primary outline-none"
                >
                  <option value="">Selecione uma conta</option>
                  {contas.map(c => (
                    <option key={c.id} value={c.id}>{c.nome_banco} - {c.nome}</option>
                  ))}
                </select>
              </div>

              {!hasComprovante && (
                <div className="p-5 rounded-2xl border-2 border-alert-red/10 bg-red-50/30 space-y-4">
                  <div className="flex items-center gap-3 text-alert-red">
                    <FileWarning className="w-5 h-5 shrink-0" />
                    <span className="text-[10px] font-black uppercase leading-tight">O comprovante digital é obrigatório para esta operação.</span>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer select-none p-3 bg-white rounded-xl border border-alert-red/20">
                    <input type="checkbox" checked={declararSemComprovante} onChange={e => setDeclararSemComprovante(e.target.checked)} className="w-5 h-5 rounded border-neutral-300 text-alert-red focus:ring-alert-red" />
                    <span className="text-[10px] font-black uppercase text-neutral-600">Declarar ausência de comprovante e liberar baixa</span>
                  </label>
                </div>
              )}
            </form>

            <footer className="px-8 py-6 border-t bg-neutral-50 flex justify-end gap-3">
              <button type="button" onClick={() => setModalOpen('isBaixaLancamentoOpen', false)} className="px-6 py-3 text-[10px] font-black uppercase text-secondary">Cancelar</button>
              <button type="submit" disabled={loading || !canSave} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all ${canSave ? 'bg-neutral-900 hover:bg-black' : 'bg-neutral-200 grayscale cursor-not-allowed'}`}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar e Dar Baixa'}
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}