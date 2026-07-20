"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Shield, X, Maximize2, Minimize2, Loader2, 
  CheckCircle2, XCircle, Sparkles, GripVertical, FileText, Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import ReactMarkdown from 'react-markdown';

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
  const [report, setReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const testCases: TestCase[] = [
    {
      id: 'tesouraria-flow',
      name: 'Validação de Tesouraria & Baixas',
      description: 'Simula navegação em contas a pagar e abertura do novo fluxo de baixa.',
      steps: [
        { id: 'nav-pagar', description: 'Acessar Módulo Contas a Pagar', execute: async () => { navigate('/pagar'); setActiveTab('pagar' as any); await delay(1500); } },
        { id: 'check-trava', description: 'Abrir Modal de Baixa com Trava de Comprovante', execute: async () => { setModalOpen('isBaixaLancamentoOpen', true); await delay(2000); } },
        { id: 'toggle-override', description: 'Simular Aceite de Termo de Ausência', execute: async () => { await delay(1000); } },
        { id: 'close-modal', description: 'Finalizar Auditoria Visual', execute: async () => { setModalOpen('isBaixaLancamentoOpen', false); await delay(800); } }
      ]
    }
  ];

  const runTest = async (test: TestCase) => {
    setActiveTest(test);
    setReport(null);
    setStatus('running');
    setCurrentStepIdx(0);
    
    try {
      for (let i = 0; i < test.steps.length; i++) {
        setCurrentStepIdx(i);
        await test.steps[i].execute();
      }
      setStatus('success');
      generateAIReport(test, 'success');
    } catch (err: any) {
      setStatus('failed');
      generateAIReport(test, 'failed', err.message);
    }
  };

  const generateAIReport = async (test: TestCase, status: string, error?: string) => {
    setIsGeneratingReport(true);
    try {
      const res = await fetch('/api/generate-ux-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testName: test.name, steps: test.steps, status, error })
      });
      const data = await res.json();
      setReport(data.report);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <>
      <motion.div drag dragMomentum={false} className="fixed bottom-6 left-6 z-[400]">
        <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 px-5 h-14 bg-neutral-900 text-white rounded-full shadow-2xl border border-neutral-800 hover:bg-black transition-all">
          <Shield className="w-5 h-5 text-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">IA Test Suite</span>
        </button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className={`fixed bottom-24 left-6 w-[450px] bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-mono ${isMinimized ? 'h-16' : 'h-[600px]'}`}>
            <header className="px-6 py-4 bg-neutral-900 flex justify-between items-center border-b border-neutral-800">
              <div className="flex items-center gap-2 text-amber-500"><Sparkles className="w-4 h-4" /><span className="text-[10px] font-black uppercase">Simulação Real-Time</span></div>
              <div className="flex gap-2">
                <button onClick={() => setIsMinimized(!isMinimized)} className="text-neutral-500 hover:text-white">{isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}</button>
                <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </header>

            {!isMinimized && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {status === 'idle' ? (
                  <div className="space-y-4">
                    {testCases.map(t => (
                      <button key={t.id} onClick={() => runTest(t)} className="w-full p-5 bg-neutral-900 rounded-2xl border border-neutral-800 text-left hover:border-amber-500/50 transition-all group">
                        <h4 className="text-white text-xs font-black uppercase group-hover:text-amber-500">{t.name}</h4>
                        <p className="text-[10px] text-neutral-400 mt-1 font-sans">{t.description}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      {activeTest?.steps.map((s, idx) => (
                        <div key={s.id} className={`flex items-center gap-3 text-[10px] ${idx === currentStepIdx ? 'text-amber-500' : idx < currentStepIdx || status === 'success' ? 'text-emerald-500' : 'text-neutral-600'}`}>
                          {idx === currentStepIdx ? <Loader2 className="w-4 h-4 animate-spin" /> : idx < currentStepIdx || status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-current" />}
                          <span className={idx === currentStepIdx ? 'font-black' : ''}>{s.description}</span>
                        </div>
                      ))}
                    </div>

                    {(report || isGeneratingReport) && (
                      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl text-[11px] text-neutral-300 font-sans leading-relaxed prose prose-invert max-w-none">
                        <div className="flex items-center gap-2 mb-4 text-amber-500"><FileText className="w-4 h-4" /><span className="font-black uppercase text-[9px]">Laudo Técnico de UX (Gemini AI)</span></div>
                        {isGeneratingReport ? (
                          <div className="flex items-center gap-3 opacity-50"><Loader2 className="w-4 h-4 animate-spin" /> Gerando relatório especializado...</div>
                        ) : (
                          <ReactMarkdown>{report || ''}</ReactMarkdown>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {status !== 'idle' && (
              <footer className="p-4 border-t border-neutral-800 bg-neutral-900 flex justify-between items-center">
                <span className={`text-[9px] font-black uppercase ${status === 'success' ? 'text-emerald-500' : status === 'failed' ? 'text-red-500' : 'text-amber-500'}`}>{status}</span>
                <button onClick={() => setStatus('idle')} className="text-[10px] text-neutral-500 hover:text-white uppercase font-black">Nova Simulação</button>
              </footer>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}