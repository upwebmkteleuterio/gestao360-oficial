"use client";

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Printer,
  Download,
  X,
  Calendar,
  User,
  Wallet,
  Tag,
  FileText,
  ExternalLink,
  Hash,
  Clock,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Loader2
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useLancamentos, useEntidades, useCategorias, useContas, useLancamentoAnexos, useUsuarios } from '../hooks/useData';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ComprovanteDrawer() {
  const { isComprovanteOpen, setModalOpen, selectedLancamentoIdForModal, setSelectedLancamentoIdForModal } = useUIStore();
  const { data: lancamentos = [] } = useLancamentos();
  const { data: entidades = [] } = useEntidades();
  const { data: categorias = [] } = useCategorias();
  const { data: contas = [] } = useContas();
  const { data: usuarios = [] } = useUsuarios();
  const { anexos = [] } = useLancamentoAnexos(selectedLancamentoIdForModal);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const lancamento = lancamentos.find(l => l.id === selectedLancamentoIdForModal);

  const handleClose = () => {
    setModalOpen('isComprovanteOpen', false);
    setSelectedLancamentoIdForModal(null);
  };

  const handleGeneratePDF = async () => {
    if (!receiptRef.current || !lancamento) return;
    
    setIsGenerating(true);
    try {
      const element = receiptRef.current;
      
      // Captura apenas o card interno branco
      const canvas = await html2canvas(element, {
        scale: 3, // Aumentado para máxima nitidez
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800 // Força um contexto de largura fixa para o layout não quebrar
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Centraliza levemente se o conteúdo for menor que a página
      const margin = (pdf.internal.pageSize.getHeight() - pdfHeight) / 2;
      const yPos = margin > 10 ? margin : 10;

      pdf.addImage(imgData, 'PNG', 0, yPos, pdfWidth, pdfHeight);
      pdf.save(`comprovante_${lancamento.id.slice(0, 8)}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Falha ao gerar o PDF. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!lancamento) return null;

  const entidade = entidades.find(e => e.id === lancamento.entidade_id);
  const categoria = categorias.find(c => c.id === lancamento.categoria_id);
  const conta = contas.find(c => c.id === lancamento.conta_bancaria_id);
  const autor = usuarios.find(u => u.id === lancamento.usuario_criador_id);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    return dateStr.split('-').reverse().join('/');
  };

  return (
    <AnimatePresence>
      {isComprovanteOpen && (
        <div className="fixed inset-0 z-[250] overflow-hidden font-sans select-none print:bg-white">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity duration-300 print:hidden"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-y-0 right-0 max-w-xl w-full bg-surface shadow-2xl flex flex-col h-full transform transition-transform duration-300 print:static print:w-full print:shadow-none print:max-w-none"
          >
            {/* Header fixo do Drawer - OCULTO NO PRINT */}
            <div className="px-6 py-5 border-b border-surface-border flex items-center justify-between bg-white shrink-0 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white font-black text-lg">
                  G
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase text-on-surface tracking-wider">Visualizar Lançamento</h2>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-0.5">Gestão 360 • ERP Financeiro</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl text-secondary hover:bg-neutral-100 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-neutral-50/50 p-6 space-y-6 print:p-0 print:bg-white">
              
              {/* ÁREA DE CAPTURA DO PDF - Apenas este bloco será capturado */}
              <div ref={receiptRef} className="bg-white border border-neutral-100 rounded-[32px] overflow-hidden shadow-sm p-8 space-y-8 print:border-none print:shadow-none print:rounded-none">
                
                {/* Branding do PDF */}
                <div className="flex justify-between items-start border-b border-neutral-100 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary flex items-center justify-center rounded-2xl text-white font-black text-xl">G</div>
                    <div>
                      <h1 className="text-sm font-black uppercase tracking-tighter text-neutral-900 leading-none">Gestão 360</h1>
                      <p className="text-[8px] font-bold text-primary uppercase tracking-[0.2em] mt-1">CFO ERP Headquarters</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">Protocolo de Operação</p>
                    <p className="text-[11px] font-bold text-neutral-900 font-mono mt-1">#{lancamento.id.slice(0, 12).toUpperCase()}</p>
                  </div>
                </div>

                {/* Valor e Status Central */}
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    lancamento.tipo === 'entrada' ? 'bg-bank-truth-green/10 text-bank-truth-green' : 'bg-alert-red/10 text-alert-red'
                  }`}>
                    <Wallet className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      {lancamento.tipo === 'entrada' ? 'Valor Recebido / Previsto' : 'Valor Pago / Previsto'}
                    </span>
                    <h3 className={`text-4xl font-black mt-1 ${lancamento.tipo === 'entrada' ? 'text-bank-truth-green' : 'text-alert-red'}`}>
                      {formatBRL(lancamento.valor_previsto)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      lancamento.status_pagamento === 'pago' ? 'bg-bank-truth-green text-white' : 'bg-pending-amber/10 text-pending-amber'
                    }`}>
                      {lancamento.status_pagamento === 'pago' ? 'Liquidado' : 'Em Aberto'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-neutral-900 text-white">
                      {lancamento.status_aprovacao === 'confirmado_master' ? 'Confirmado Master' : 'Pendente'}
                    </span>
                  </div>
                </div>

                {/* Detalhes da Transação */}
                <div className="grid grid-cols-2 gap-6 pt-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Beneficiário / Cliente
                    </span>
                    <p className="text-xs font-black text-neutral-900 uppercase">{entidade?.nome_razao_social || 'N/A'}</p>
                    <p className="text-[9px] text-neutral-400 font-mono">{entidade?.documento || 'Sem doc.'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest flex items-center justify-end gap-1.5">
                      <Tag className="w-3 h-3" /> Categoria
                    </span>
                    <p className="text-xs font-black text-neutral-900 uppercase">{categoria?.nome || 'N/A'}</p>
                    <p className="text-[9px] text-neutral-400 uppercase tracking-widest">{lancamento.tipo === 'entrada' ? 'Receita' : 'Despesa'}</p>
                  </div>
                </div>

                {/* Cronograma */}
                <div className="bg-neutral-50 rounded-2xl p-5 grid grid-cols-2 gap-y-5 gap-x-4">
                  <div>
                    <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block mb-1">Emissão</span>
                    <p className="text-xs font-bold text-neutral-900">{formatDate(lancamento.data_emissao)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block mb-1">Vencimento</span>
                    <p className="text-xs font-bold text-neutral-900">{formatDate(lancamento.data_vencimento)}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block mb-1">Competência</span>
                    <p className="text-xs font-bold text-neutral-900">{formatDate(lancamento.data_competencia || lancamento.data_emissao)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block mb-1">Liquidação</span>
                    <p className={`text-xs font-bold ${lancamento.data_pagamento ? 'text-bank-truth-green' : 'text-neutral-400'}`}>
                      {formatDate(lancamento.data_pagamento)}
                    </p>
                  </div>
                </div>

                {/* Origem e Auditoria */}
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-1.5">
                      <Banknote className="w-3 h-3" /> Conta Bancária
                    </span>
                    <p className="text-xs font-black text-neutral-900 uppercase truncate">{conta?.nome_banco || 'N/A'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest flex items-center justify-end gap-1.5">
                      <User className="w-3 h-3" /> Operador
                    </span>
                    <p className="text-xs font-black text-neutral-900 uppercase truncate">{autor?.nome || 'Sistema'}</p>
                  </div>
                </div>

                {/* Observações */}
                {lancamento.observacoes && (
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-1.5">
                    <span className="text-[8px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-1.5">
                      <Hash className="w-3 h-3" /> Notas Técnicas
                    </span>
                    <p className="text-[10px] font-medium text-neutral-600 leading-relaxed italic">
                      "{lancamento.observacoes}"
                    </p>
                  </div>
                )}

                {/* Rodapé Interno do PDF */}
                <div className="pt-6 border-t border-neutral-100 flex justify-between items-center opacity-40">
                  <span className="text-[7px] font-bold uppercase tracking-[0.3em]">Gestão 360 Document Verification</span>
                  <span className="text-[7px] font-bold uppercase tracking-[0.3em]">Gerado em: {new Date().toLocaleString()}</span>
                </div>
              </div>

              {/* Seção de Anexos - OCULTO NO PRINT */}
              <div className="space-y-3 print:hidden">
                <span className="text-[9px] font-black uppercase text-secondary tracking-widest flex items-center gap-1.5 ml-2">
                  <ExternalLink className="w-3 h-3" /> Documentos Digitais ({anexos.length})
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
                            <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">{(anexo.tamanho / 1024 / 1024).toFixed(2)} MB • Cloud Store</p>
                          </div>
                        </div>
                        <Download className="w-4 h-4 text-neutral-300 group-hover:text-primary transition-all" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="bg-neutral-100 border-2 border-dashed border-neutral-200 p-6 rounded-3xl text-center">
                    <FileText className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Nenhum documento digital anexado</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ações do Drawer - OCULTO NO PRINT */}
            <div className="p-6 bg-white border-t border-surface-border grid grid-cols-2 gap-3 shrink-0 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-12 border-2 border-neutral-100 text-neutral-600 font-black text-xs uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGeneratePDF}
                className="h-12 bg-neutral-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-primary" />
                )}
                {isGenerating ? 'Gerando...' : 'Baixar PDF'}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}