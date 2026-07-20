"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, CheckCircle2, AlertTriangle, User, Calendar,
  Tag, Banknote, FileText, Info, Loader2, ThumbsDown, Clock, Hash
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useLancamentos, useEntidades, useCategorias, useLancamentoAnexos, useUsuarios } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';

export default function AprovarLancamentoModal() {
  const { isAprovarModalOpen, setModalOpen, selectedLancamentoIdForModal } = useUIStore() as any;
  const { user } = useAuth();
  const { data: lancamentos = [], updateLancamento } = useLancamentos();
  const { data: entidades = [] } = useEntidades();
  const { data: categorias = [] } = useCategorias();
  const { data: usuarios = [] } = useUsuarios();
  const { anexos = [] } = useLancamentoAnexos(selectedLancamentoIdForModal);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [motivoReprovacao, setMotivoReprovacao] = useState('');
  const [showReprovarForm, setShowReprovarForm] = useState(false);

  const lanc = lancamentos.find(l => l.id === selectedLancamentoIdForModal);
  if (!lanc) return null;

  const entidade = entidades.find(e => e.id === lanc.entidade_id);
  const categoria = categorias.find(c => c.id === lanc.categoria_id);
  const autor = usuarios.find(u => u.id === lanc.usuario_criador_id);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    return dateStr.split('-').reverse().join('/');
  };

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
          observacoes: `${lanc.observacoes || ''}\n[REPROVADO EM ${new Date().toLocaleDateString()}]: ${motivoReprovacao}`
        }
      });
      setModalOpen('isAprovarModalOpen' as any, false);
      setShowReprovarForm(false);
      setMotivoReprovacao('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isAprovarModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl border border-neutral-100 flex flex-col max-h-[90vh]">
            <header className="p-6 border-b flex justify-between items-center bg-neutral-50 shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">Verificação de Conformidade</h3>
                <p className="text-[9px] font-bold text-secondary uppercase tracking-widest mt-1">Validação Master para Liberação de Fluxo</p>
              </div>
              <button onClick={() => setModalOpen('isAprovarModalOpen' as any, false)}><X className="w-5 h-5 text-secondary" /></button>
            </header>
            
            <div className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-900 text-white rounded-2xl flex flex-col justify-center">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Valor do Título</span>
                  <p className="text-2xl font-black font-mono text-primary">R$ {lanc.valor_previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <span className="text-[10px] font-black text-secondary uppercase block mb-1">Tipo de Fluxo</span>
                  <p className={`text-xs font-black uppercase ${lanc.tipo === 'entrada' ? 'text-bank-truth-green' : 'text-alert-red'}`}>
                    {lanc.tipo === 'entrada' ? 'Receita / Entrada' : 'Despesa / Saída'}
                  </p>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase mt-1">ID: {lanc.id.slice(0,8)}...</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Local / Cliente
                  </span>
                  <p className="text-xs font-black uppercase truncate text-neutral-900">{entidade?.nome_razao_social || 'N/A'}</p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <Tag className="w-3 h-3" /> Categoria
                  </span>
                  <p className="text-xs font-black uppercase truncate text-neutral-900">{categoria?.nome || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <div>
                  <span className="text-[9px] font-black uppercase text-secondary tracking-widest block mb-1">Vencimento</span>
                  <p className="text-xs font-bold text-neutral-900">{formatDate(lanc.data_vencimento)}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-secondary tracking-widest block mb-1">Emissão</span>
                  <p className="text-xs font-bold text-neutral-900">{formatDate(lanc.data_emissao)}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-secondary tracking-widest block mb-1">Referência</span>
                  <p className="text-xs font-bold text-neutral-900">{formatDate(lanc.data_competencia || lanc.data_emissao)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black text-secondary uppercase flex items-center gap-2"><FileText className="w-4 h-4" /> Documentação Digital</span>
                {anexos.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {anexos.map((anexo: any) => (
                      <a key={anexo.id} href={anexo.url} target="_blank" className="flex items-center justify-between p-4 border-2 border-dashed border-primary/30 rounded-2xl hover:bg-primary/5 transition-all">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-xs font-black text-primary uppercase">{anexo.nome}</p>
                            <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">Clique para visualizar</p>
                          </div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-bank-truth-green" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-red-50 border-2 border-dashed border-alert-red/20 rounded-2xl flex flex-col items-center gap-2 text-alert-red text-center">
                    <AlertTriangle className="w-8 h-8" />
                    <span className="text-[10px] font-black uppercase leading-tight">Atenção: Título sem comprovante digital!<br/>A aprovação sem documento é de responsabilidade do Master.</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-secondary uppercase tracking-widest block mb-1">Responsável pela Inclusão</span>
                  <p className="text-xs font-black uppercase text-neutral-900">{autor?.nome || 'Sistema'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-secondary uppercase tracking-widest block mb-1">Data de Criação</span>
                  <p className="text-xs font-bold text-neutral-900">{new Date(lanc.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              {lanc.observacoes && (
                <div className="p-4 bg-white border border-neutral-100 rounded-2xl space-y-2">
                   <span className="text-[9px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5"><Hash className="w-3 h-3" /> Observações Internas</span>
                   <p className="text-xs font-medium text-neutral-600 italic">"{lanc.observacoes}"</p>
                </div>
              )}

              {showReprovarForm && (
                <div className="space-y-3 animate-fade-in">
                  <label className="text-[10px] font-black uppercase text-alert-red">Motivo da Reprovação</label>
                  <textarea
                    autoFocus
                    placeholder="Descreva o motivo da reprovação para o colaborador..."
                    className="w-full p-4 bg-red-50 border-2 border-alert-red/20 rounded-2xl text-xs font-bold outline-none focus:border-alert-red min-h-[100px]"
                    value={motivoReprovacao}
                    onChange={e => setMotivoReprovacao(e.target.value)}
                  />
                </div>
              )}
            </div>

            <footer className="p-6 bg-neutral-50 border-t flex gap-3 shrink-0">
              {!showReprovarForm ? (
                <>
                  <button onClick={() => setShowReprovarForm(true)} className="flex-1 h-12 rounded-xl border-2 border-neutral-200 text-[10px] font-black uppercase text-alert-red hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                    <ThumbsDown className="w-4 h-4" /> Reprovar
                  </button>
                  <button onClick={handleAprovar} disabled={isSubmitting} className="flex-[2] h-12 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-black transition-all">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirmar e Aprovar Master
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setShowReprovarForm(false); setMotivoReprovacao(''); }} className="px-6 text-[10px] font-black uppercase text-secondary">Voltar</button>
                  <button onClick={handleReprovar} disabled={isSubmitting || !motivoReprovacao} className="flex-1 h-12 bg-alert-red text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmar Reprovação'}
                  </button>
                </>
              )}
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}