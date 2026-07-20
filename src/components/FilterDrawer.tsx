import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Filter, Calendar, User, Tag, UserSquare2, CheckCircle2, RotateCcw } from 'lucide-react';
import { useUsuarios, useCategorias, useEntidades } from '../hooks/useData';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
  onClear: () => void;
  currentFilters: any;
}

export default function FilterDrawer({ isOpen, onClose, onApply, onClear, currentFilters }: FilterDrawerProps) {
  const { data: usuarios = [] } = useUsuarios();
  const { data: categorias = [] } = useCategorias();
  const { data: entidades = [] } = useEntidades();

  const [filters, setFilters] = useState(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters, isOpen]);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    setFilters({
      responsibleId: 'all',
      categoryId: 'all',
      clientId: 'all',
      status: 'all',
      startDate: '',
      endDate: ''
    });
    onClear();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs"
          />

          {/* Slide body */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full md:w-[450px] h-full bg-surface shadow-2xl flex flex-col relative z-20"
          >
            <header className="flex items-center justify-between px-6 py-5 border-b border-surface-border bg-surface shrink-0">
              <div>
                <h2 className="text-headline-sm text-on-surface font-black tracking-tight uppercase">
                  Filtrar Lançamentos
                </h2>
                <span className="text-[10px] uppercase font-black text-primary block mt-0.5 tracking-widest">
                  Refine sua busca no banco de dados
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-secondary hover:text-on-surface p-2 rounded-xl hover:bg-neutral-100 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Responsável */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-secondary uppercase tracking-widest">
                  <User className="w-3.5 h-3.5" /> Responsável
                </label>
                <select
                  value={filters.responsibleId}
                  onChange={(e) => setFilters({ ...filters, responsibleId: e.target.value })}
                  className="w-full h-12 bg-white border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold focus:border-primary outline-none transition-all"
                >
                  <option value="all">Todos os Responsáveis</option>
                  {usuarios.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.nome || u.email}</option>
                  ))}
                </select>
              </div>

              {/* Categoria */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-secondary uppercase tracking-widest">
                  <Tag className="w-3.5 h-3.5" /> Categoria
                </label>
                <select
                  value={filters.categoryId}
                  onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                  className="w-full h-12 bg-white border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold focus:border-primary outline-none transition-all"
                >
                  <option value="all">Todas as Categorias</option>
                  {categorias.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Cliente/Entidade */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-secondary uppercase tracking-widest">
                  <UserSquare2 className="w-3.5 h-3.5" /> Cliente / Entidade
                </label>
                <select
                  value={filters.clientId}
                  onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
                  className="w-full h-12 bg-white border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold focus:border-primary outline-none transition-all"
                >
                  <option value="all">Todos os Clientes</option>
                  {entidades.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.nome_razao_social}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-secondary uppercase tracking-widest">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Status de Pagamento
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full h-12 bg-white border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold focus:border-primary outline-none transition-all"
                >
                  <option value="all">Todos os Status</option>
                  <option value="aberto">Aberto</option>
                  <option value="pago">Pago</option>
                  <option value="pago_parcial">Pago Parcial</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="bpi">BPI (Baixa por Inadimplência)</option>
                </select>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-black text-secondary uppercase tracking-widest">
                    <Calendar className="w-3.5 h-3.5" /> Início
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full h-12 bg-white border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-black text-secondary uppercase tracking-widest">
                    <Calendar className="w-3.5 h-3.5" /> Fim
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full h-12 bg-white border-2 border-neutral-100 rounded-xl px-4 text-xs font-bold focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <footer className="p-6 border-t border-surface-border bg-neutral-50 flex flex-col gap-3 shrink-0">
              <button
                type="button"
                onClick={handleApply}
                className="w-full h-12 font-black text-[10px] text-on-primary-container bg-primary-container hover:brightness-95 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <CheckCircle2 className="w-4 h-4" /> Aplicar Filtros
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="w-full h-12 font-black text-[10px] text-secondary border-2 border-neutral-200 rounded-xl hover:bg-neutral-100 hover:border-neutral-300 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Limpar Filtros
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
