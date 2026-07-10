import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer, Download, X, Bluetooth, Calendar, User, Wallet, Tag, FileText, ExternalLink, Hash, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useLancamentos, useEntidades, useCategorias, useContas, useLancamentoAnexos, useUsuarios } from '../hooks/useData';

export default function ComprovanteDrawer() {
  const { isComprovanteOpen, setModalOpen, selectedLancamentoIdForModal, setSelectedLancamentoIdForModal } = useUIStore();
  const { data: lancamentos = [] } = useLancamentos();
  const { data: entidades = [] } = useEntidades();
  const { data: categorias = [] } = useCategorias();
  const { data: contas = [] } = useContas();
  const { data: usuarios = [] } = useUsuarios();
  const { anexos = [] } = useLancamentoAnexos(selectedLancamentoIdForModal);

  const lancamento = lancamentos.find(l => l.id === selectedLancamentoIdForModal);

  const handleClose = () => {
    setModalOpen('isComprovanteOpen', false);
    setSelectedLancamentoIdForModal(null);
  };

  if (!lancamento) return null;

  const entidade = entidades.find(e => e.id === lancamento.entidade_id);
  const categoria = categorias.find(c => c.id === lancamento.categoria_id);
  const conta = contas.find(c => c.id === lancamento.conta_bancaria_id);
  const autor = usuarios.find(u => u.id === lancamento.usuario_criador_id);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return dateStr.split('-').reverse().join('/');
  };

  return (
    <AnimatePresence>
      {isComprovanteOpen && (
        <div className="fixed inset-0 z-[250] overflow-hidden font-sans select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-y-0 right-0 max-w-lg w-full bg-surface shadow-2xl flex flex-col h-full transform transition-transform duration-300"
          >
            <div className="px-6 py-5 border-b border-surface-border flex items-center justify-between bg-white shrink-0">
              <div>
                <h2 className="text-sm font-black uppercase text-on-surface tracking-wider">Detalhes do Lançamento</h2>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-0.5">Visão completa do registro financeiro</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl text-secondary hover:bg-neutral-100 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-neutral-50/50 p-6 space-y-6">
              {/* Resumo de Valor e Status */}
              <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 ${lancamento.tipo === 'entrada' ? 'bg-bank-truth-green' : 'bg-alert-red'}`} />
                
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                  lancamento.tipo === 'entrada' ? 'bg-bank-truth-green/10 text-bank-truth-green' : 'bg-alert-red/10 text-alert-red'
                }`}>
                  <Wallet className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
                    {lancamento.tipo === 'entrada' ? 'Total a Receber' : 'Total a Pagar'}
                  </span>
                  <h3 className={`text-3xl font-black ${lancamento.tipo === 'entrada' ? 'text-bank-truth-green' : 'text-alert-red'}`}>
                    {formatBRL(lancamento.valor_previsto)}
                  </h3>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    lancamento.status_pagamento === 'pago' ? 'bg-bank-truth-green text-white' : 'bg-pending-amber/10 text-pending-amber border border-pending-amber/20'
                  }`}>
                    {lancamento.status_pagamento === 'pago' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {lancamento.status_pagamento === 'pago' ? 'Liquidado' : 'Em Aberto'}
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-neutral-900 text-white">
                    {lancamento.status_aprovacao === 'confirmado_master' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {lancamento.status_aprovacao.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Grid de Informações */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-neutral-100 space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-secondary tracking-widest flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Entidade
                  </span>
                  <p className="text-xs font-black text-on-surface truncate">{entidade?.nome_razao_social || 'N/A'}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-neutral-100 space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-secondary tracking-widest flex items-center gap-1.5">
                    <Tag className="w-3 h-3" /> Categoria
                  </span>
                  <p className="text-xs font-black text-on-surface truncate">{categoria?.nome || 'N/A'}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-neutral-100 space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-secondary tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Vencimento
                  </span>
                  <p className="text-xs font-black text-on-surface">{formatDate(lancamento.data_vencimento)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-neutral-100 space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-secondary tracking-widest flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Conta Bancária
                  </span>
                  <p className="text-xs font-black text-on-surface truncate">{conta?.nome_banco || 'N/A'}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-neutral-100 space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-secondary tracking-widest flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Responsável
                  </span>
                  <p className="text-xs font-black text-on-surface truncate">{autor?.nome || 'Sistema'}</p>
                </div>
              </div>

              {/* Observações */}
              {lancamento.observacoes && (
                <div className="bg-white p-5 rounded-3xl border border-neutral-100 space-y-3">
                  <span className="text-[9px] font-black uppercase text-secondary tracking-widest flex items-center gap-1.5">
                    <Hash className="w-3 h-3" /> Observações Contábeis
                  </span>
                  <p className="text-xs font-medium text-on-surface leading-relaxed">
                    {lancamento.observacoes}
                  </p>
                </div>
              )}

              {/* Anexos */}
              <div className="space-y-3">
                <span className="text-[9px] font-black uppercase text-secondary tracking-widest flex items-center gap-1.5 ml-2">
                  <ExternalLink className="w-3 h-3" /> Documentos e Anexos ({anexos.length})
                </span>
                {anexos.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {anexos.map((anexo: any) => (
                      <a
                        key={anexo.id}
                        href={anexo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white p-4 rounded-2xl border border-neutral-100 hover:border-primary transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-on-surface truncate max-w-[200px]">{anexo.nome}</p>
                            <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">{(anexo.tamanho / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Download className="w-4 h-4 text-neutral-300 group-hover:text-primary transition-all" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="bg-neutral-100 border-2 border-dashed border-neutral-200 p-6 rounded-3xl text-center">
                    <FileText className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Nenhum anexo vinculado</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-white border-t border-surface-border grid grid-cols-2 gap-3 shrink-0">
              <button
                type="button"
                className="h-12 bg-neutral-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-all"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              <button
                type="button"
                className="h-12 bg-primary text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md"
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

