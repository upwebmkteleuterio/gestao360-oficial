"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CheckCircle2, AlertTriangle, User, Calendar, 
  Tag, Banknote, FileText, Info, Loader2, ThumbsDown 
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useLancamentos, useEntidades, useCategorias, useLancamentoAnexos } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import Button from './Button';

export default function AprovarLancamentoModal() {
  const { isAprovarModalOpen, setModalOpen, selectedLancamentoIdForModal } = useUIStore() as any;
  const { user } = useAuth();
  const { data: lancamentos = [], updateLancamento } = useLancamentos();
  const { data: entidades = [] } = useEntidades();
  const { data: categorias = [] } = useCategorias();
  const { anexos = [] } = useLancamentoAnexos(selectedLancamentoIdForModal);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [motivoReprovacao, setMotivoReprovacao] = useState('');
  const [showReprovarForm, setShowReprovarForm] = useState(false);

  const lanc = lancamentos.find(l => l.id === selectedLancamentoIdForModal);
  if (!lanc) return null;

  const entidade = entidades.find(e => e.id === lanc.entidade_id);
  const categoria = categorias.find(c => c.id === lanc.categoria_id);

  const handleAprovar = async () => {
    setIsSubmitting(true);
    try {
      await updateLancamento({
        id: lanc.id,
        data: { 
          status_aprovacao: 'confirmado_master',
          data_aprovacao: new Date().toISOString(),
          usuario_aprovador_id: user?.id
        }
      });
      setModalOpen('isAprovarModalOpen' as any, false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReprovar = async () => {
    if (!motivoReprovacao) return alert('Informe o motivo da reprovação');
    setIsSubmitting(true);
    try {
      await updateLancamento({
        id: lanc.id,
        data: { 
          status_aprovacao: 'pendente_digital',
          observacoes: `${lanc.observacoes}\n[REPROVADO EM ${new Date().toLocaleDateString()}]: ${motivoReprovacao}`
        }
      });
      setModalOpen('isAprovarModalOpen' as any, false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isAprovarModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border border-neutral-100">
            <header className="p-6 border-b flex justify-between items-center bg-neutral-50">
              <h3 className="text-sm font-black uppercase tracking-widest">Verificação de Conformidade</h3>
              <button onClick={() => setModalOpen('isAprovarModalOpen' as any, false)}><X className="w-5 h-5 text-secondary" /></button>
            </header>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <span className="text-[9px] font-black text-secondary uppercase block mb-1">Local/Cliente</span>
                  <p className="text-xs font-black uppercase truncate">{entidade?.nome_razao_social}</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <span className="text-[9px] font-black text-secondary uppercase block mb-1">Valor do Título</span>
                  <p className="text-sm font-black text-primary">R$ {lanc.valor_previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black text-secondary uppercase flex items-center gap-2"><FileText className="w-4 h-4" /> Comprovante Vinculado</span>
                {anexos.length > 0 ? (
                  <a href={anexos[0].url} target="_blank" className="block p-4 border-2 border-dashed border-primary/30 rounded-2xl hover:bg-primary/5 transition-all text-center">
                    <p className="text-xs font-bold text-primary uppercase">Visualizar Documento Digital</p>
                  </a>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-alert-red">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase">Atenção: Título sem comprovante digital!</span>
                  </div>
                )}
              </div>

              {showReprovarForm && (
                <textarea 
                  placeholder="Descreva o motivo da reprovação..."
                  className="w-full p-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold outline-none focus:border-alert-red"
                  value={motivoReprovacao}
                  onChange={e => setMotivoReprovacao(e.target.value)}
                />
              )}
            </div>

            <footer className="p-6 bg-neutral-50 border-t flex gap-3">
              {!showReprovarForm ? (
                <>
                  <button onClick={() => setShowReprovarForm(true)} className="flex-1 h-12 rounded-xl border-2 border-neutral-200 text-[10px] font-black uppercase text-alert-red hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                    <ThumbsDown className="w-4 h-4" /> Reprovar
                  </button>
                  <button onClick={handleAprovar} disabled={isSubmitting} className="flex-[2] h-12 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirmar Aprovação
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowReprovarForm(false)} className="px-6 text-[10px] font-black uppercase text-secondary">Voltar</button>
                  <button onClick={handleReprovar} className="flex-1 h-12 bg-alert-red text-white rounded-xl text-[10px] font-black uppercase">Confirmar Reprovação</button>
                </>
              )}
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}