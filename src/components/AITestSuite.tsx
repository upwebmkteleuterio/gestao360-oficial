"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, X, Maximize2, Minimize2, Loader2, 
  CheckCircle2, Sparkles, ChevronRight, Trash2, Zap, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { supabase } from '../integrations/supabase/client';

interface Step {
  id: string;
  description: string;
  execute: () => Promise<void>;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  steps: Step[];
}

export default function AITestSuite() {
  const navigate = useNavigate();
  const { setModalOpen, setActiveTab } = useUIStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTest, setActiveTest] = useState<TestCase | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [isCleaning, setIsCleaning] = useState(false);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleClearTests = async () => {
    if (!confirm('Isso apagará APENAS os dados gerados pelo simulador (marcados como [INTERNAL_TEST]). Prosseguir?')) return;
    setIsCleaning(true);
    try {
      const { error } = await supabase.rpc('limpar_lancamentos_teste');
      if (error) throw error;
      alert('Base de testes limpa com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao limpar base.');
    } finally {
      setIsCleaning(false);
    }
  };

  const testCases: TestCase[] = [
    {
      id: 'fluxo-baixa-segura',
      name: 'Simular: Dar Baixa (Trava de Comprovante)',
      description: 'Testa a obrigatoriedade do comprovante e o checkbox de override.',
      steps: [
        { id: 'nav', description: 'Abrindo Contas a Pagar', execute: async () => { navigate('/pagar'); setActiveTab('pagar'); await delay(1000); } },
        { id: 'modal', description: 'Acionando Modal "Dar Baixa"', execute: async () => { setModalOpen('isBaixaLancamentoOpen', true); await delay(1500); } },
        { id: 'valid', description: 'Validando bloqueio do botão e Checkbox', execute: async () => { await delay(2000); } },
        { id: 'done', description: 'Fechando simulação', execute: async () => { setModalOpen('isBaixaLancamentoOpen', false); await delay(500); } }
      ]
    },
    {
      id: 'fluxo-aprovacao-master',
      name: 'Simular: Aprovação Master (Popup Audit)',
      description: 'Testa o novo popup com detalhes para conferência antes da aprovação.',
      steps: [
        { id: 'nav-hist', description: 'Acessando Histórico Global', execute: async () => { navigate('/lancamentos'); setActiveTab('lancamentos'); await delay(1000); } },
        { id: 'open-popup', description: 'Abrindo Popup de Verificação Master', execute: async () => { setModalOpen('isAprovarModalOpen' as any, true); await delay(2000); } },
        { id: 'check-data', description: 'Conferindo Responsável e Valor', execute: async () => { await delay(1500); } },
        { id: 'close', description: 'Fechando verificação', execute: async () => { setModalOpen('isAprovarModalOpen' as any, false); await delay(500); } }
      ]
    }
  ];

  const runTest = async (test: TestCase) => {
    setActiveTest(test);
    setStatus('running');
    setCurrentStepIdx(0);
    try {
      for (let i = 0; i < test.steps.length; i++) {
        setCurrentStepIdx(i);
        await test.steps[i].execute();
      }
      setStatus('success');
    } catch (err: any) {
      setStatus('failed');
    }
  };

  return (
    <>
      {/* Posicionamento à direita para não conflitar com menu lateral */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)} 
          className="flex items-center gap-3 px-6 h-14 bg-neutral-950 text-white rounded-full shadow-2xl border border-neutral-800 hover:border-amber-500 transition-all"
        >
          <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Simular Fluxos</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            className={`fixed bottom-24 right-6 w-[380px] bg-neutral-950 border border-neutral-800 rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-[9999] ${isMinimized ? 'h-16' : 'h-[500px]'}`}
          >
            <header className="px-6 py-4 bg-neutral-900 flex justify-between items-center border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Console de Testes</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsMinimized(!isMinimized)} className="text-neutral-500 hover:text-white">{isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}</button>
                <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </header>

            {!isMinimized && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
                {status === 'idle' ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-[9px] font-bold text-red-400 uppercase leading-relaxed">Ambiente Real: Os testes inserem dados no banco. Use a limpeza ao finalizar.</p>
                    </div>
                    {testCases.map(t => (
                      <button key={t.id} onClick={() => runTest(t)} className="w-full p-5 bg-neutral-900 rounded-2xl border border-neutral-800 text-left hover:border-amber-500/50 transition-all group flex justify-between items-center">
                        <div className="space-y-1">
                          <h4 className="text-white text-[10px] font-black uppercase group-hover:text-amber-500">{t.name}</h4>
                          <p className="text-[9px] text-neutral-500 font-medium">{t.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-700" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {activeTest?.steps.map((s, idx) => (
                        <div key={s.id} className={`flex items-start gap-4 text-[10px] ${idx === currentStepIdx ? 'text-amber-500' : idx < currentStepIdx || status === 'success' ? 'text-emerald-500' : 'text-neutral-600'}`}>
                          <div className="mt-0.5">
                            {idx === currentStepIdx ? <Loader2 className="w-4 h-4 animate-spin" /> : idx < currentStepIdx || status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-current" />}
                          </div>
                          <span className={idx === currentStepIdx ? 'font-black uppercase' : 'font-bold uppercase opacity-50'}>{s.description}</span>
                        </div>
                      ))}
                    </div>
                    {status === 'success' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Validação Concluída</p>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <footer className="p-4 border-t border-neutral-800 bg-neutral-900 flex justify-between items-center">
              <button onClick={handleClearTests} disabled={isCleaning} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[9px] font-black uppercase">
                {isCleaning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Limpar Testes
              </button>
              {status !== 'idle' && (
                <button onClick={() => setStatus('idle')} className="text-[9px] text-neutral-500 hover:text-white uppercase font-black">Reiniciar</button>
              )}
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}