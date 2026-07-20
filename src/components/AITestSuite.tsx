"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, X, Maximize2, Minimize2, Loader2, 
  CheckCircle2, Sparkles, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';

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

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const testCases: TestCase[] = [
    {
      id: 'tesouraria-flow',
      name: 'Simulação: Fluxo de Tesouraria',
      description: 'Testa a navegação e o novo modal de baixa com trava de segurança.',
      steps: [
        { id: 'nav-pagar', description: 'Abrindo módulo Contas a Pagar', execute: async () => { navigate('/pagar'); setActiveTab('pagar' as any); await delay(1500); } },
        { id: 'open-baixa', description: 'Simulando clique em Dar Baixa', execute: async () => { setModalOpen('isBaixaLancamentoOpen', true); await delay(2000); } },
        { id: 'close-baixa', description: 'Validando interface de liquidação', execute: async () => { await delay(1500); setModalOpen('isBaixaLancamentoOpen', false); await delay(800); } },
        { id: 'nav-global', description: 'Retornando ao Histórico Global', execute: async () => { navigate('/lancamentos'); setActiveTab('lancamentos' as any); await delay(1000); } }
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
      <motion.div drag dragMomentum={false} className="fixed bottom-6 left-6 z-[400]">
        <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 px-5 h-14 bg-neutral-900 text-white rounded-full shadow-2xl border border-neutral-800 hover:bg-black transition-all">
          <Shield className="w-5 h-5 text-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Simulador de Fluxos</span>
        </button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className={`fixed bottom-24 left-6 w-[350px] bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans ${isMinimized ? 'h-16' : 'h-[500px]'}`}>
            <header className="px-6 py-4 bg-neutral-900 flex justify-between items-center border-b border-neutral-800">
              <div className="flex items-center gap-2 text-amber-500"><Sparkles className="w-4 h-4" /><span className="text-[10px] font-black uppercase">Automação Visual</span></div>
              <div className="flex gap-2">
                <button onClick={() => setIsMinimized(!isMinimized)} className="text-neutral-500 hover:text-white">{isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}</button>
                <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </header>

            {!isMinimized && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {status === 'idle' ? (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4">Escolha uma jornada para simular:</p>
                    {testCases.map(t => (
                      <button key={t.id} onClick={() => runTest(t)} className="w-full p-5 bg-neutral-900 rounded-2xl border border-neutral-800 text-left hover:border-amber-500/50 transition-all group flex justify-between items-center">
                        <div>
                          <h4 className="text-white text-xs font-black uppercase group-hover:text-amber-500">{t.name}</h4>
                          <p className="text-[9px] text-neutral-400 mt-1">{t.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-amber-500" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      {activeTest?.steps.map((s, idx) => (
                        <div key={s.id} className={`flex items-start gap-4 text-[10px] ${idx === currentStepIdx ? 'text-amber-500' : idx < currentStepIdx || status === 'success' ? 'text-emerald-500' : 'text-neutral-600'}`}>
                          <div className="mt-0.5">
                            {idx === currentStepIdx ? <Loader2 className="w-4 h-4 animate-spin" /> : idx < currentStepIdx || status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-current" />}
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className={idx === currentStepIdx ? 'font-black uppercase tracking-widest' : 'font-bold uppercase opacity-50'}>{s.description}</span>
                            {idx === currentStepIdx && <div className="w-24 h-1 bg-amber-500/20 rounded-full overflow-hidden"><motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 1.5 }} className="h-full bg-amber-500 w-1/2" /></div>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {status === 'success' && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                        <p className="text-xs font-black text-emerald-500 uppercase">Jornada Concluída com Sucesso</p>
                        <p className="text-[10px] text-neutral-400">Todos os elementos de UI responderam conforme o esperado.</p>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {status !== 'idle' && (
              <footer className="p-4 border-t border-neutral-800 bg-neutral-900 flex justify-between items-center">
                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{status === 'running' ? 'Em execução' : 'Finalizado'}</span>
                <button onClick={() => setStatus('idle')} className="text-[10px] text-neutral-500 hover:text-white uppercase font-black px-3 py-1 bg-white/5 rounded-lg">Reiniciar</button>
              </footer>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}