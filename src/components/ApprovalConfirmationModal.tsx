import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CheckCircle2, 
  Paperclip, 
  FileText, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ApprovalConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (attachments: LocalFile[]) => Promise<void>;
  title: string;
  description: string;
}

interface LocalFile {
  name: string;
  size: number;
  type: string;
  file: File;
}

export default function ApprovalConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description
}: ApprovalConfirmationModalProps) {
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<LocalFile[]>([]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(attachments);
      setAttachments([]);
      onClose();
    } catch (err) {
      console.error('Error during approval:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white w-full max-w-[420px] rounded-[32px] shadow-2xl relative z-10 overflow-hidden border border-neutral-100 flex flex-col"
        >
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-bank-truth-green/10 rounded-full flex items-center justify-center mx-auto text-bank-truth-green">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">{title}</h3>
              <p className="text-[10px] font-bold text-secondary uppercase leading-relaxed">
                {description}
              </p>
            </div>

            {/* Anexos Section */}
            <div className="text-left space-y-3 pt-4">
              <label className="text-[10px] font-black uppercase text-secondary tracking-widest flex items-center gap-2">
                <Paperclip className="w-4 h-4" /> Comprovante (Opcional)
              </label>
              
              <div className="relative group cursor-pointer h-12 border-2 border-dashed border-neutral-200 rounded-xl hover:border-primary transition-all flex items-center justify-center gap-2 text-secondary hover:text-primary bg-neutral-50/50">
                <Paperclip className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase">
                  {attachments.length > 0 ? `${attachments.length} Anexo(s)` : 'Anexar Comprovante'}
                </span>
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      const fileList = Array.from(e.target.files) as File[];
                      const newFiles: LocalFile[] = fileList.map(f => ({
                        name: f.name,
                        size: f.size,
                        type: f.type,
                        file: f
                      }));
                      setAttachments(prev => [...prev, ...newFiles]);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>

              <div className="max-h-[120px] overflow-y-auto space-y-2 scrollbar-thin">
                {attachments.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-100 rounded-xl">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-bold truncate max-w-[200px]">{f.name}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} 
                      className="text-neutral-400 hover:text-alert-red transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="w-full py-4 bg-neutral-900 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar Aprovação
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="text-[9px] font-black uppercase text-secondary hover:text-neutral-900 transition-colors pt-2 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
