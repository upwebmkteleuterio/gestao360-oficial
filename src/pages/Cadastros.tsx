import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Coins, 
  Tag, 
  Briefcase, 
  Plus, 
  Trash2, 
  X, 
  Building, 
  History, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  TrendingUp,
  Mail,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Receipt,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useContas, useCentrosCusto, useCategorias } from '../hooks/useData';
import { useUIStore } from '../store/uiStore';
import { useDragScroll } from '../hooks/useDragScroll';
import MoneyInput from '../components/MoneyInput';
import Button from '../components/Button';

type SubTabType = 'contas' | 'centros' | 'categorias';

export default function Cadastros() {
  const dragScrollTabs = useDragScroll();
  const { data: contas = [], createAccount } = useContas();
  const { data: centrosCusto = [], createCC, deleteCC } = useCentrosCusto();
  const { data: categorias = [], createCategory } = useCategorias();

  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('contas');
  
  // Modals visibility
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [isNewCCOpen, setIsNewCCOpen] = useState(false);
  const [isNewCatOpen, setIsNewCatOpen] = useState(false);

  // Form states
  const [bankName, setBankName] = useState('');
  const [bankInitial, setBankInitial] = useState('');
  const [ccName, setCCName] = useState('');
  const [ccDesc, setCCDesc] = useState('');
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'entrada' | 'saida'>('entrada');

  const valueFormatter = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAccount({
        nome_banco: bankName,
        nome: bankName,
        agencia: '0001',
        conta: '00000-0',
        saldo_inicial: parseFloat(bankInitial.replace(/\D/g, '')) / 100 || 0,
        data_abertura: new Date().toISOString()
      });

      setIsNewAccountOpen(false);
      setBankName('');
      setBankInitial('');
    } catch (err) { alert('Erro ao criar conta'); }
  };

  const handleCCSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCC({ nome: ccName, descricao: ccDesc });
      setIsNewCCOpen(false);
      setCCName('');
      setCCDesc('');
    } catch (err) { alert('Erro ao criar centro de custo'); }
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCategory({ nome: catName, tipo: catType });
      setIsNewCatOpen(false);
      setCatName('');
    } catch (err) { alert('Erro ao criar categoria'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-neutral-900">Configurações de Estrutura</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">Defina a espinha dorsal financeira do seu sistema</p>
        </div>
        <Button
          onClick={() => activeSubTab === 'contas' ? setIsNewAccountOpen(true) : activeSubTab === 'centros' ? setIsNewCCOpen(true) : setIsNewCatOpen(true)}
        >
          Novo Registro
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div ref={dragScrollTabs.ref} {...dragScrollTabs.props} className="flex border-b border-neutral-200 overflow-x-auto scrollbar-none whitespace-nowrap">
        <button onClick={() => setActiveSubTab('contas')} className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all ${activeSubTab === 'contas' ? 'border-primary text-primary' : 'border-transparent text-neutral-400 hover:text-neutral-900'}`}>Contas Bancárias</button>
        <button onClick={() => setActiveSubTab('centros')} className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all ${activeSubTab === 'centros' ? 'border-primary text-primary' : 'border-transparent text-neutral-400 hover:text-neutral-900'}`}>Centros de Custo</button>
        <button onClick={() => setActiveSubTab('categorias')} className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all ${activeSubTab === 'categorias' ? 'border-primary text-primary' : 'border-transparent text-neutral-400 hover:text-neutral-900'}`}>Categorias</button>
      </div>

      <div className="bg-white border-2 border-neutral-100 rounded-3xl overflow-hidden shadow-sm">
        {activeSubTab === 'contas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-neutral-50 text-neutral-400 border-b border-neutral-100 text-[9px] font-black uppercase tracking-widest"><th className="py-4 px-8">Instituição / Nome</th><th className="py-4 px-8">Data de Abertura</th><th className="py-4 px-8 text-right">Saldo Inicial</th><th className="py-4 px-8 text-center">Status</th></tr></thead>
              <tbody className="text-[11px] font-bold">
                {contas.length === 0 ? <tr><td colSpan={4} className="py-20 text-center opacity-40 uppercase tracking-widest">Nenhuma conta encontrada</td></tr> : 
                contas.map(c => (
                  <tr key={c.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-all">
                    <td className="py-4 px-8"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black uppercase shadow-sm"><Coins className="w-5 h-5" /></div><p className="text-neutral-900 font-black uppercase tracking-tighter">{c.nome_banco || c.nome}</p></div></td>
                    <td className="py-4 px-8 font-mono text-neutral-500">{new Date(c.data_abertura).toLocaleDateString()}</td>
                    <td className="py-4 px-8 text-right font-mono text-bank-truth-green">{valueFormatter(c.saldo_inicial)}</td>
                    <td className="py-4 px-8 text-center"><span className="rounded-lg bg-emerald-50 text-bank-truth-green px-3 py-1.5 uppercase font-black text-[9px] tracking-widest">Operacional</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === 'centros' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-neutral-50 text-neutral-400 border-b border-neutral-100 text-[9px] font-black uppercase tracking-widest"><th className="py-4 px-8">Nome do Centro</th><th className="py-4 px-8">Descrição / Finalidade</th><th className="py-4 px-8 text-right">Ações</th></tr></thead>
              <tbody className="text-[11px] font-bold">
                {centrosCusto.length === 0 ? <tr><td colSpan={3} className="py-20 text-center opacity-40 uppercase tracking-widest">Nenhum centro encontrado</td></tr> : 
                centrosCusto.map(cc => (
                  <tr key={cc.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-all">
                    <td className="py-4 px-8 font-black uppercase tracking-tighter text-neutral-900">{cc.nome}</td>
                    <td className="py-4 px-8 text-neutral-500">{cc.descricao || 'Sem descrição'}</td>
                    <td className="py-4 px-8 text-right"><button onClick={() => deleteCC(cc.id)} className="p-2 hover:bg-red-50 text-neutral-300 hover:text-alert-red rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === 'categorias' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-neutral-50 text-neutral-400 border-b border-neutral-100 text-[9px] font-black uppercase tracking-widest"><th className="py-4 px-8">Classificador</th><th className="py-4 px-8 text-center">Tipo de Fluxo</th><th className="py-4 px-8 text-right">Ações</th></tr></thead>
              <tbody className="text-[11px] font-bold">
                {categorias.length === 0 ? <tr><td colSpan={3} className="py-20 text-center opacity-40 uppercase tracking-widest">Nenhuma categoria encontrada</td></tr> : 
                categorias.map(cat => (
                  <tr key={cat.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-all">
                    <td className="py-4 px-8 font-black uppercase tracking-tighter text-neutral-900">{cat.nome}</td>
                    <td className="py-4 px-8 text-center"><span className={`rounded-lg px-3 py-1.5 uppercase font-black text-[9px] tracking-widest ${cat.tipo === 'entrada' ? 'bg-emerald-50 text-bank-truth-green' : 'bg-red-50 text-alert-red'}`}>{cat.tipo}</span></td>
                    <td className="py-4 px-8 text-right"><button className="p-2 hover:bg-red-50 text-neutral-300 hover:text-alert-red rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {/* Modal Nova Conta */}
        {isNewAccountOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewAccountOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.form initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onSubmit={handleAccountSubmit} className="bg-white w-full max-w-[440px] rounded-3xl shadow-2xl border-2 border-neutral-100 flex flex-col relative z-20 overflow-hidden">
              <header className="px-8 py-6 border-b border-neutral-50 flex justify-between items-center bg-neutral-50/50"><h2 className="text-sm font-black uppercase tracking-widest text-neutral-900">Nova Conta Bancária</h2><button type="button" onClick={() => setIsNewAccountOpen(false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors"><X className="w-6 h-6" /></button></header>
              <div className="p-10 space-y-6">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Nome do Banco</label><input type="text" required value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black focus:border-primary outline-none" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Saldo Inicial (R$)</label><MoneyInput value={bankInitial} onChange={setBankInitial} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black focus:border-primary outline-none" placeholder="0,00" required /></div>
              </div>

              <footer className="px-10 py-8 border-t border-neutral-50 bg-neutral-50/50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsNewAccountOpen(false)} className="px-6 py-2 font-black text-[10px] uppercase tracking-widest text-neutral-500">Cancelar</button>
                <Button type="submit">
                  Salvar
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </footer>

            </motion.form>
          </div>
        )}

        {/* Modal Novo Centro de Custo */}
        {isNewCCOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewCCOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.form initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onSubmit={handleCCSubmit} className="bg-white w-full max-w-[440px] rounded-3xl shadow-2xl border-2 border-neutral-100 flex flex-col relative z-20 overflow-hidden">
              <header className="px-8 py-6 border-b border-neutral-50 flex justify-between items-center bg-neutral-50/50"><h2 className="text-sm font-black uppercase tracking-widest text-neutral-900">Novo Centro de Custo</h2><button type="button" onClick={() => setIsNewCCOpen(false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors"><X className="w-6 h-6" /></button></header>
              <div className="p-10 space-y-6">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Nome do Centro</label><input type="text" required value={ccName} onChange={(e) => setCCName(e.target.value)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black focus:border-primary outline-none" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Descrição</label><textarea value={ccDesc} onChange={(e) => setCCDesc(e.target.value)} className="w-full p-5 bg-neutral-50 border-2 border-neutral-100 rounded-2xl text-xs font-black focus:border-primary outline-none resize-none" rows={3} /></div>
              </div>
              <footer className="px-10 py-8 border-t border-neutral-50 bg-neutral-50/50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsNewCCOpen(false)} className="px-6 py-2 font-black text-[10px] uppercase tracking-widest text-neutral-500">Cancelar</button>
                <Button type="submit">
                  Salvar
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </footer>

            </motion.form>
          </div>
        )}

        {/* Modal Nova Categoria */}
        {isNewCatOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewCatOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.form initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onSubmit={handleCatSubmit} className="bg-white w-full max-w-[440px] rounded-3xl shadow-2xl border-2 border-neutral-100 flex flex-col relative z-20 overflow-hidden">
              <header className="px-8 py-6 border-b border-neutral-50 flex justify-between items-center bg-neutral-50/50"><h2 className="text-sm font-black uppercase tracking-widest text-neutral-900">Nova Categoria</h2><button type="button" onClick={() => setIsNewCatOpen(false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors"><X className="w-6 h-6" /></button></header>
              <div className="p-10 space-y-6">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Nome da Categoria</label><input type="text" required value={catName} onChange={(e) => setCatName(e.target.value)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black focus:border-primary outline-none" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Fluxo</label><select value={catType} onChange={(e) => setCatType(e.target.value as any)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none cursor-pointer appearance-none"><option value="entrada">Entrada / Receita</option><option value="saida">Saída / Despesa</option></select></div>
              </div>
              <footer className="px-10 py-8 border-t border-neutral-50 bg-neutral-50/50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsNewCatOpen(false)} className="px-6 py-2 font-black text-[10px] uppercase tracking-widest text-neutral-500">Cancelar</button>
                <Button type="submit">
                  Salvar
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </footer>

            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
