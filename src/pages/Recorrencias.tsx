import React, { useState } from 'react';
import { 
  Repeat, 
  PauseCircle, 
  PlayCircle, 
  Trash2, 
  Calendar, 
  Building2, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Loader2,
  XCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useRecorrencias } from '../hooks/useData';
import { motion, AnimatePresence } from 'motion/react';
import Button from '../components/Button';

export default function Recorrencias() {
  const { data: recorrencias = [], isLoading, stopRecorrencia, isStopping } = useRecorrencias();
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);

  const valueFormatter = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleStop = async (id: string) => {
    if (confirm('Deseja realmente interromper esta recorrência? Todas as parcelas futuras em aberto serão removidas.')) {
      try {
        await stopRecorrencia(id);
        alert('Recorrência interrompida com sucesso!');
      } catch (err: any) {
        alert('Erro ao interromper: ' + err.message);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <span className="text-secondary font-bold text-sm uppercase tracking-widest">Carregando Assinaturas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border/50 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface uppercase flex items-center gap-3">
            <Repeat className="w-7 h-7 text-primary" />
            Gestão de Recorrências
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 font-medium">Controle suas assinaturas, contratos e despesas recorrentes em um só lugar.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-surface p-6 rounded-2xl border border-surface-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Repeat className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Contratos Ativos</p>
            <h3 className="text-xl font-bold text-on-surface">{recorrencias.length} Séries</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-surface p-6 rounded-2xl border border-surface-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-bank-truth-green/10 flex items-center justify-center text-bank-truth-green">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Comprometimento Mensal</p>
            <h3 className="text-xl font-bold text-on-surface">
              {valueFormatter(recorrencias.reduce((acc, r) => acc + r.valor_parcela, 0))}
            </h3>
          </div>
        </div>
        <div className="bg-white dark:bg-surface p-6 rounded-2xl border border-surface-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Total em Aberto</p>
            <h3 className="text-xl font-bold text-on-surface">
              {valueFormatter(recorrencias.reduce((acc, r) => acc + (r.valor_parcela * (r.quantidade_total_parcelas - r.parcelas_pagas)), 0))}
            </h3>
          </div>
        </div>
      </div>

      {/* Recurrences List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recorrencias.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white dark:bg-surface border-2 border-dashed border-surface-border rounded-3xl opacity-50 space-y-4">
            <Info className="w-12 h-12 mx-auto text-secondary" />
            <p className="text-sm font-black uppercase tracking-widest text-secondary">Nenhuma recorrência ativa encontrada</p>
          </div>
        ) : (
          recorrencias.map((rec) => (
            <div key={rec.id} className="bg-white dark:bg-surface border-2 border-surface-border rounded-3xl p-6 hover:border-primary/30 transition-all group relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-neutral-900 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-2xl">
                {rec.periodicidade}
              </div>

              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-50 dark:bg-surface-container border border-surface-border flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-on-surface uppercase tracking-tight">{rec.entidade_nome}</h3>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {rec.categoria_nome}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 bg-neutral-50 dark:bg-surface-container rounded-2xl border border-surface-border/50">
                  <p className="text-[8px] font-black text-secondary uppercase mb-1">Valor Parcela</p>
                  <p className="text-sm font-black text-on-surface">{valueFormatter(rec.valor_parcela)}</p>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-surface-container rounded-2xl border border-surface-border/50">
                  <p className="text-[8px] font-black text-secondary uppercase mb-1">Progresso</p>
                  <p className="text-sm font-black text-on-surface">{rec.parcelas_pagas}/{rec.quantidade_total_parcelas}</p>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-surface-container rounded-2xl border border-surface-border/50">
                  <p className="text-[8px] font-black text-secondary uppercase mb-1">Próximo Venc.</p>
                  <p className="text-sm font-black text-primary">{rec.proxima_data !== 'Finalizada' ? rec.proxima_data.split('-').reverse().join('/') : 'Encerrado'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-surface-border/50">
                <div>
                  <p className="text-[9px] font-black text-secondary uppercase">Comprometimento Total</p>
                  <p className="text-sm font-black text-on-surface opacity-60">{valueFormatter(rec.total_valor)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStop(rec.id)}
                    disabled={rec.proxima_data === 'Finalizada'}
                    className="flex items-center gap-2 px-6 h-11 bg-white border-2 border-alert-red text-alert-red font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-alert-red hover:text-white transition-all shadow-sm active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none"
                    title="Interromper Recorrência"
                  >
                    Encerrar Série
                    <PauseCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Banner */}
      <div className="p-6 bg-primary/5 border-2 border-primary/10 rounded-3xl flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-primary shrink-0" />
        <div className="space-y-1">
          <h4 className="text-sm font-black text-primary uppercase tracking-widest">Informação Importante</h4>
          <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
            Ao encerrar uma recorrência, o sistema irá remover todos os lançamentos futuros que ainda estão com o status <strong>"Em Aberto"</strong>. 
            Lançamentos que já foram liquidados (pagos) permanecerão no histórico para garantir a integridade dos seus relatórios passados.
          </p>
        </div>
      </div>
    </div>
  );
}
