"use client";

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MoreVertical,
  CheckCircle2,
  History,
  Edit,
  Trash2,
  Download
} from 'lucide-react';
import { LancamentoFinanceiro } from '../../types';
import { useLancamentoAnexos } from '../../hooks/useData';

interface LancamentoActionMenuProps {
  item: LancamentoFinanceiro;
  isMaster: boolean;
  isActive: boolean;
  onToggle: () => void;
  onBaixa: (id: string) => void;
  onEstornar: (id: string) => void;
  onEdit: (item: LancamentoFinanceiro) => void;
  onDelete: (id: string) => void;
}

export default function LancamentoActionMenu({
  item,
  isMaster,
  isActive,
  onToggle,
  onBaixa,
  onEstornar,
  onEdit,
  onDelete
}: LancamentoActionMenuProps) {
  const { anexos = [] } = useLancamentoAnexos(item.id);
  const hasAnexo = anexos.length > 0;

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`p-2 rounded-xl transition-all ${
          isActive ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-900 hover:bg-white hover:shadow-sm'
        }`}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 top-full mt-2 w-48 bg-white border border-neutral-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[100] p-2 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {item.status_pagamento === 'aberto' && (
              <button
                onClick={() => onBaixa(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-bank-truth-green hover:bg-emerald-50 rounded-xl transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Dar Baixa</span>
              </button>
            )}

            {hasAnexo && (
              <a
                href={anexos[0].url}
                download
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 text-primary hover:bg-primary/5 rounded-xl transition-all"
              >
                <Download className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Baixar Arquivo</span>
              </a>
            )}
            
            {isMaster && item.status_pagamento === 'pago' && (
              <button 
                onClick={() => onEstornar(item.id)} 
                className="w-full flex items-center gap-3 px-4 py-3 text-alert-red hover:bg-red-50 rounded-xl transition-all"
              >
                <History className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Estornar</span>
              </button>
            )}
            
            <div className="h-px bg-neutral-50 my-1" />
            
            <button 
              onClick={() => onEdit(item)} 
              className="w-full flex items-center gap-3 px-4 py-3 text-neutral-600 hover:bg-neutral-50 rounded-xl transition-all"
            >
              <Edit className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Editar</span>
            </button>
            
            {isMaster && (
              <button 
                onClick={() => onDelete(item.id)} 
                className="w-full flex items-center gap-3 px-4 py-3 text-alert-red/50 hover:text-alert-red hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Excluir</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}