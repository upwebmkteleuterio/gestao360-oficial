"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { 
  X, 
  User, 
  Tag, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Info,
  Hash,
  ExternalLink,
  ShieldCheck,
  Eye,
  Paperclip,
  Check,
  AlertTriangle,
  Loader2,
  TrendingUp
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLancamento, useEntidades, useCategorias, useUsuarios, useLancamentoAnexos, useLancamentos } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LancamentoDetailsSlide() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    isComprovanteOpen, 
    setModalOpen, 
    selectedLancamentoIdForModal,
    setSelectedLancamentoIdForModal 
  } = useUIStore();

  const { role } = useAuth();
  const { updateLancamento } = useLancamentos();
  const { data: entidades = [] } = useEntidades();
  const { data: categorias = [] } = useCategorias();
  const { data: usuarios = [] } = useUsuarios();

  const isMaster = role === 'master';

  // Escutar a URL para abrir o painel globalmente
  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl && idFromUrl !== selectedLancamentoIdForModal) {
      setSelectedLancamentoIdForModal(idFromUrl);
      setModalOpen('isComprovanteOpen', true);
    }
  }, [searchParams]);

  const { data: lancamento, isLoading: loadingItem } = useLancamento(selectedLancamentoIdForModal);
  const { anexos = [] } = useLancamentoAnexos(selectedLancamentoIdForModal);

  const [dispensarComprovante, setDispensarComprovante] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const handleClose = () => {
    // Remover o ID da URL ao fechar
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('id');
    setSearchParams(newParams);
    
    setModalOpen('isComprovanteOpen', false);
    setSelectedLancamentoIdForModal(null);
    setDispensarComprovante(false);
  };

  if (!isComprovanteOpen) return null;

  const getEntidadeName = (id: string) => entidades.find(e => e.id === id)?.nome_razao_social || 'Desconhecido';
  const getCategoriaName = (id: string) => categorias.find(c => c.id === id)?.nome || 'Sem categoria';
  const getUsuarioName = (id: string) => usuarios.find(u => u.id === id)?.nome || 'Sistema / Desconhecido';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR });
    } catch { return dateStr; }
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch { return dateStr; }
  };

  const handleAprovar = async () => {
    if (!lancamento || !isMaster) return;
    setLoadingAction(true);
    try {
      const updateData: any = {
        status_aprovacao: 'confirmado_master',
        data_aprovacao: new Date().toISOString()
      };

      // REGRA DE NEGÓCIO: Se o título aguardava aprovação de quitação, ela é efetivada agora.
      if (lancamento.status_pagamento === 'quitação_pendente') {
        updateData.status_pagamento = 'pago';
      }

      await updateLancamento({
        id: lancamento.id,
        data: updateData
      });
      handleClose();
    } catch (err: any) {
      alert('Erro ao aprovar: ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReprovar = async () => {
    if (!lancamento || !isMaster) return;
    if (!confirm('Deseja realmente reprovar este lançamento? Ele voltará para o status Pendente.')) return;
    setLoadingAction(true);
    try {
      await updateLancamento({
        id: lancamento.id,
        data: {
          status_aprovacao: 'pendente_digital',
          data_aprovacao: null
        }
      });
      handleClose();
    } catch (err: any) {
      alert('Erro ao reprovar: ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const hasAnexo = anexos.length > 0;
  const isQuitacaoPendente = lancamento?.status_pagamento === 'quitação_pendente';
  const canApprove = hasAnexo || dispensarComprovante;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex justify-end">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs"
        />

        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-white w-full max-w-[500px] h-full shadow-2xl relative z-10 flex flex-col border-l border-neutral-100"
        >
          {loadingItem ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Localizando Lançamento...</p>
              </div>
            </div>
          ) : !lancamento ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <AlertTriangle className="w-12 h-12 text-alert-red mx-auto mb-4" />
                <h3 className="font-black uppercase text-neutral-900">Registro não encontrado</h3>
                <p className="text-xs text-secondary mt-2">O lançamento pode ter sido removido ou você não tem permissão para visualizá-lo.</p>
                <button onClick={handleClose} className="mt-6 px-6 py-2 bg-neutral-900 text-white text-[10px] font-black uppercase rounded-lg">Voltar</button>
              </div>
            </div>
          ) : (
            <>
              <header className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50 shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest ${
                      lancamento.tipo === 'entrada' ? 'bg-bank-truth-green/10 text-bank-truth-green' : 'bg-alert-red/10 text-alert-red'
                    }`}>
                      {lancamento.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-secondary flex items-center gap-1">
                      <Hash className="w-3 h-3" /> {lancamento.id.slice(0, 8)}...
                    </span>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">Detalhes da Operação</h3>
                </div>
                <button onClick={handleClose} className="p-2 hover:bg-neutral-200 rounded-xl transition-all">
                  <X className="w-5 h-5 text-secondary" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <span className="text-[9px] font-black text-secondary uppercase tracking-widest block mb-2">Status Aprovação</span>
                    <div className="flex items-center gap-2">
                      {lancamento.status_aprovacao === 'confirmado_master' ? (
                        <div className="flex items-center gap-1.5 text-neutral-900 font-black text-[10px] uppercase">
                          <ShieldCheck className="w-4 h-4 text-primary" /> Lançamento Aprovado
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-secondary font-black text-[10px] uppercase">
                          <Info className="w-4 h-4" /> Lançamento Pendente
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <span className="text-[9px] font-black text-secondary uppercase tracking-widest block mb-2">Status Pagamento</span>
                    <div className="flex items-center gap-2">
                      {lancamento.status_pagamento === 'bpi' ? (
                        <div className="flex items-center gap-1.5 text-alert-red font-black text-[10px] uppercase">
                          <AlertTriangle className="w-4 h-4" /> BPI
                        </div>
                      ) : lancamento.status_pagamento === 'quitação_pendente' ? (
                        <div className="flex items-center gap-1.5 text-amber-600 font-black text-[10px] uppercase">
                          <Clock className="w-4 h-4" /> {isMaster ? 'Confirme Baixa' : 'Pendente Gestor'}
                        </div>
                      ) : lancamento.status_pagamento === 'pago' ? (
                        <div className="flex items-center gap-1.5 text-bank-truth-green font-black text-[10px] uppercase">
                          <CheckCircle2 className="w-4 h-4" /> Liquidado
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-alert-red font-black text-[10px] uppercase">
                          <Clock className="w-4 h-4" /> Em Aberto
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <Info className="w-4 h-4" /> Informações Gerais
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-y-4">
                    <DetailItem icon={<User className="w-3.5 h-3.5" />} label="Responsável" value={getUsuarioName(lancamento.usuario_criador_id)} />
                    <DetailItem icon={<Tag className="w-3.5 h-3.5" />} label="Local / Cliente" value={getEntidadeName(lancamento.entidade_id)} />
                    <DetailItem icon={<FileText className="w-3.5 h-3.5" />} label="Categoria" value={getCategoriaName(lancamento.categoria_id)} />
                    <DetailItem icon={<CreditCard className="w-3.5 h-3.5" />} label="Conta / Caixa" value="Dados do Lançamento" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <DollarSign className="w-4 h-4" /> Financeiro e Datas
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem icon={<DollarSign className="w-3.5 h-3.5" />} label="Valor Previsto" value={formatCurrency(lancamento.valor_previsto)} highlight />
                    <DetailItem icon={<Calendar className="w-3.5 h-3.5" />} label="Vencimento" value={formatDate(lancamento.data_vencimento)} />
                    <DetailItem icon={<Calendar className="w-3.5 h-3.5" />} label="Data Competência" value={formatDate(lancamento.data_competencia)} />
                    <DetailItem icon={<Calendar className="w-3.5 h-3.5" />} label="Recebido em" value={formatDate(lancamento.data_pagamento)} />
                  </div>

                  <div className="p-4 bg-neutral-900 text-white rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block mb-1">Confirmado em</span>
                      <span className="text-xs font-black font-mono">
                        {lancamento.status_aprovacao === 'confirmado_master'
                          ? ((lancamento as any).data_aprovacao ? formatDateTime((lancamento as any).data_aprovacao) : 'Sem registro')
                          : 'Aguardando Aprovação'}
                      </span>
                    </div>
                    {(lancamento as any).usuario_aprovador_id && (
                      <div className="text-right">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block mb-1">Aprovado por</span>
                        <span className="text-xs font-black">{getUsuarioName((lancamento as any).usuario_aprovador_id)}</span>
                      </div>
                    )}
                  </div>
  
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <FileText className="w-4 h-4" /> Observações
                  </h4>
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 text-xs font-bold text-secondary leading-relaxed italic">
                    {lancamento.observacoes || 'Sem observações registradas.'}
                  </div>
                </div>

                <div className="space-y-4 pb-8">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <Paperclip className="w-4 h-4" /> Comprovantes e Anexos
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {anexos.length > 0 ? (
                      anexos.map((anexo: any) => (
                        <a 
                          key={anexo.id}
                          href={anexo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-center justify-between p-4 bg-neutral-50 hover:bg-neutral-100 border border-neutral-100 rounded-2xl transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-primary">
                              <Eye className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase text-neutral-900 truncate max-w-[200px]">{anexo.nome || 'Visualizar Comprovante'}</p>
                              <p className="text-[8px] font-bold text-secondary uppercase">Clique para abrir em nova aba</p>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                        </a>
                      ))
                    ) : (
                      <div className="p-8 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-center">
                        <Paperclip className="w-8 h-8 text-neutral-300 mb-2" />
                        <p className="text-[10px] font-black uppercase text-secondary">Nenhum comprovante anexado</p>
                        <p className="text-[8px] font-bold text-neutral-400 uppercase mt-1">É necessário um anexo para aprovação direta</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <footer className="p-8 border-t border-neutral-100 bg-neutral-50/50 space-y-4 shrink-0">
                {/* Widget de Impacto Financeiro Contextual - Apenas Master vê */}
                {isMaster && (lancamento.status_aprovacao !== 'confirmado_master' || isQuitacaoPendente) && (
                  <div className="mb-2 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`w-4 h-4 ${lancamento.tipo === 'entrada' ? 'text-bank-truth-green' : 'text-alert-red'}`} />
                      <span className="text-[10px] font-black uppercase text-secondary tracking-widest">
                        {isQuitacaoPendente ? 'Impacto no Saldo Real:' : 'Impacto no Saldo Auditado:'}
                      </span>
                    </div>
                    <span className={`text-sm font-black font-mono ${lancamento.tipo === 'entrada' ? 'text-bank-truth-green' : 'text-alert-red'}`}>
                      {lancamento.tipo === 'entrada' ? '+' : '-'} {formatCurrency(lancamento.valor_previsto)}
                    </span>
                  </div>
                )}

                {isMaster && !hasAnexo && (lancamento.status_aprovacao !== 'confirmado_master' || isQuitacaoPendente) && (
                  <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm">
                    <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 transition-all cursor-pointer ${
                      dispensarComprovante ? 'bg-primary border-primary' : 'bg-white border-neutral-200'
                    }`}
                    onClick={() => setDispensarComprovante(!dispensarComprovante)}
                    >
                      {dispensarComprovante && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1 cursor-pointer" onClick={() => setDispensarComprovante(!dispensarComprovante)}>
                      <p className="text-[10px] font-black uppercase text-neutral-900">Dispensar obrigatoriedade de comprovante</p>
                      <p className="text-[8px] font-bold text-secondary uppercase leading-tight mt-0.5">
                        Marque esta opção caso deseje aprovar este lançamento manualmente sem a necessidade de um anexo.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  {isMaster ? (
                    <>
                      {lancamento.status_aprovacao === 'confirmado_master' && !isQuitacaoPendente ? (
                        <button 
                          onClick={handleReprovar}
                          disabled={loadingAction}
                          className="flex-1 h-12 bg-white border-2 border-alert-red/20 text-alert-red hover:bg-alert-red hover:text-white transition-all rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                        >
                          <XCircle className="w-4 h-4" /> Reprovar Lançamento
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={handleReprovar}
                            disabled={loadingAction}
                            className="flex-1 h-12 bg-white border-2 border-neutral-200 text-secondary hover:border-alert-red hover:text-alert-red transition-all rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                          >
                            <XCircle className="w-4 h-4" /> Reprovar
                          </button>
                          <button 
                            onClick={handleAprovar}
                            disabled={!canApprove || loadingAction}
                            className={`flex-[2] h-12 text-white transition-all rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-primary/20 ${
                              canApprove ? 'bg-neutral-900 hover:bg-black' : 'bg-neutral-300 cursor-not-allowed'
                            }`}
                          >
                            {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            {isQuitacaoPendente ? 'Confirmar Quitação' : 'Aprovar Agora'}
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full p-4 bg-neutral-50 rounded-2xl border border-neutral-100 text-center">
                      <p className="text-[10px] font-black uppercase text-secondary tracking-widest">
                        Aprovação restrita ao nível Master Admin
                      </p>
                    </div>
                  )}
                </div>
              </footer>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function DetailItem({ icon, label, value, highlight = false }: { icon: any, label: string, value: string, highlight?: boolean }) {
  return (
    <div className="flex items-start gap-3 group">
      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
        highlight ? 'bg-primary/10 text-primary' : 'bg-neutral-50 text-secondary group-hover:bg-neutral-100'
      }`}>
        {icon}
      </div>
      <div>
        <span className="text-[8px] font-black text-secondary uppercase tracking-widest block mb-0.5">{label}</span>
        <span className={`text-[11px] font-black uppercase ${highlight ? 'text-primary' : 'text-neutral-900'}`}>{value}</span>
      </div>
    </div>
  );
}