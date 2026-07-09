import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, CheckCircle2, Loader2 } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useEntidades } from '../hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import Button from './Button';

export default function CadastroRapidoModal() {
  const { isCadastroRapidoOpen, setModalOpen, entidadeFormDraft, setEntidadeFormDraft, setLancamentoFormDraft, resetAllDrafts } = useUIStore();
  const { createEntity } = useEntidades();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maskCpfCnpj = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length <= 11) {
      return v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else {
      return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5').slice(0, 18);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newEntity = await createEntity({
        tipo: entidadeFormDraft.tipo as any,
        nome_razao_social: entidadeFormDraft.nome_razao_social,
        documento: entidadeFormDraft.documento || null,
        status_base: 'ativo',
        status_sincronizacao: true,
        user_id: user?.id
      } as any);

      // Auto-select in the launch form
      if (newEntity) {
        setLancamentoFormDraft({ entidade_id: (newEntity as any).id });
      }

      resetAllDrafts();
      setModalOpen('isCadastroRapidoOpen', false);
    } catch (err) {
      console.error(err);
      alert('Erro ao criar entidade. Verifique se os campos estão corretos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isCadastroRapidoOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setModalOpen('isCadastroRapidoOpen', false)} 
            className="absolute inset-0 bg-black/60 backdrop-blur-xs" 
          />
          <motion.form 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }} 
            onSubmit={handleCreate}
            className="bg-white w-full max-w-[440px] rounded-3xl shadow-2xl border-2 border-neutral-100 flex flex-col relative z-20 overflow-hidden"
          >
            <header className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest text-neutral-900">Novo Cadastro Rápido</h2>
              </div>
              <button type="button" onClick={() => setModalOpen('isCadastroRapidoOpen', false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </header>
            <div className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Tipo</label>
                <select 
                  value={entidadeFormDraft.tipo} 
                  onChange={(e) => setEntidadeFormDraft({ tipo: e.target.value as any })}
                  className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none cursor-pointer appearance-none"
                  required
                >
                  <option value="" disabled>Selecione...</option>
                  <option value="cliente">Cliente</option>
                  <option value="fornecedor">Fornecedor</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Nome / Razão Social</label>
                <input 
                  type="text" 
                  required 
                  value={entidadeFormDraft.nome_razao_social} 
                  onChange={(e) => setEntidadeFormDraft({ nome_razao_social: e.target.value })}
                  className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none focus:border-primary transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">CPF / CNPJ</label>
                <input
                  type="text"
                  value={entidadeFormDraft.documento}
                  onChange={(e) => setEntidadeFormDraft({ documento: maskCpfCnpj(e.target.value) })}
                  className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none focus:border-primary transition-all font-mono"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                />
              </div>
            </div>
            <footer className="px-10 py-8 border-t border-neutral-100 bg-neutral-50/50 flex justify-end gap-3">
              <button type="button" onClick={() => setModalOpen('isCadastroRapidoOpen', false)} className="px-6 py-2 font-black text-[10px] uppercase tracking-widest text-neutral-500">Cancelar</button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isSubmitting ? 'Salvando...' : 'Finalizar'}
              </Button>
            </footer>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
