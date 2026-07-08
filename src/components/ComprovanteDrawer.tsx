import React from 'react';
import { Printer, Download, X, Bluetooth } from 'lucide-react';

interface ComprovanteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data?: {
    idTransacao?: string;
    conta?: string;
    responsavel?: string;
    valorTransacionado?: number;
    taxa?: number;
    totalConciliado?: number;
    dataHora?: string;
  };
}

export default function ComprovanteDrawer({ isOpen, onClose, data }: ComprovanteDrawerProps) {
  if (!isOpen) return null;

  // Fallbacks if no data provided
  const idTransacao = data?.idTransacao || '#TXN-98234';
  const conta = data?.conta || 'Banco Itaú - CC';
  const responsavel = data?.responsavel || 'Admin Geral';
  const valorTransacionado = data?.valorTransacionado ?? 15430.00;
  const taxa = data?.taxa ?? 15.00;
  const totalConciliado = data?.totalConciliado ?? (valorTransacionado - taxa);
  const dataHora = data?.dataHora || '24/10/2023 14:32';

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans select-none" id="comprovante-drawer-container">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Slide body */}
      <div className="absolute inset-y-0 right-0 max-w-md w-full bg-surface shadow-2xl flex flex-col h-full transform transition-transform duration-300 animate-slide-in">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface bg-surface-container-lowest">
          <h2 className="text-sm font-black uppercase text-on-surface tracking-wider">Impressão de Comprovante</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body with the thermal print styled coupon */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-100 flex flex-col justify-start space-y-6">
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Preview do Recibo</span>
          </div>

          {/* Paper receipt container */}
          <div className="bg-[#fcfbf7] border border-amber-100 rounded-lg p-5 shadow-md border-dashed border-2 relative overflow-hidden text-neutral-800">
            {/* Soft shadow accent for depth */}
            <div className="text-center border-b border-dashed border-neutral-300 pb-4 mb-4">
              <h3 className="text-lg font-black tracking-tight text-neutral-900 uppercase">Gestão 360</h3>
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-700 block">Verdade Bancária</span>
              <div className="text-[10px] text-neutral-500 font-mono mt-1.5 space-y-0.5">
                <p>CNPJ: 00.000.000/0001-00</p>
                <p>Data: {dataHora}</p>
              </div>
            </div>

            {/* Receipt Core details */}
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-[10px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Comprovante de Conciliação
                </span>
              </div>

              {/* Attributes block */}
              <div className="space-y-2 text-[11px] font-mono border-b border-dashed border-neutral-300 pb-3">
                <div className="flex justify-between">
                  <span className="text-neutral-500">ID Transação:</span>
                  <span className="font-extrabold text-neutral-950">{idTransacao}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Conta:</span>
                  <span className="font-semibold text-neutral-900">{conta}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Responsável:</span>
                  <span className="font-semibold text-neutral-900">{responsavel}</span>
                </div>
              </div>

              {/* Values block with thermal layout */}
              <div className="space-y-2 text-xs font-mono py-1">
                <div className="flex justify-between">
                  <span className="uppercase text-neutral-500 text-[10px] font-bold">Valor Transacionado</span>
                  <span className="font-bold text-neutral-900">{formatBRL(valorTransacionado)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span className="uppercase text-[10px] font-bold">Taxa</span>
                  <span className="font-bold">-{formatBRL(taxa)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-neutral-300 pt-2.5 text-sm font-black text-neutral-950">
                  <span className="uppercase text-[11px]">Total Conciliado</span>
                  <span>{formatBRL(totalConciliado)}</span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="pt-2 text-center flex justify-center">
                <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-xs animate-pulse">
                  <span className="w-1.5 h-1.5 bg-white rounded-full" />
                  Confirmado
                </span>
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="mt-6 pt-4 border-t border-dashed border-neutral-300 text-center text-[9px] text-neutral-400 font-mono leading-relaxed">
              <p>Documento impresso via sistema Gestão 360.</p>
              <p className="truncate" title="8f92a1b3-4c5d-6e7f">Autenticação: 8f92a1b3-4c5d-6e7f</p>
            </div>
          </div>
        </div>

        {/* Drawer CTAs / Interaction buttons */}
        <div className="p-6 bg-surface border-t border-surface-border space-y-3 shrink-0">
          <button 
            type="button"
            onClick={() => alert(`Imprimindo comprovante ${idTransacao} via impressora térmica pareada...`)}
            className="w-full h-11 bg-[#f3b233] hover:bg-[#e2a225] text-on-background font-extrabold text-xs rounded-lg select-all flex items-center justify-center gap-2 transition-all border border-[#d69614]"
          >
            <Bluetooth className="w-4 h-4" />
            Imprimir via Bluetooth (58mm/80mm)
          </button>
          
          <button 
            type="button"
            onClick={() => alert(`Download do comprovante PDF em formato A4 iniciado para ${idTransacao}.`)}
            className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold text-xs rounded-lg select-all flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            Baixar em PDF (A4)
          </button>

          <button 
            type="button"
            onClick={onClose}
            className="w-full pt-2 pb-1 text-center text-xs font-bold text-on-surface-variant hover:text-on-surface hover:underline"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
