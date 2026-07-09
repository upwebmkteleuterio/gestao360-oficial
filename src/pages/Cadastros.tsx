import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Coins, 
  Tag, 
  Briefcase, 
  Plus, 
  Trash2,
  Edit3, 
  X,
  Search,
  Filter,
  Users,
  Truck,
  ArrowRight,
  TrendingUp,
  Calendar,
  Building,
  History,
  AlertTriangle,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { useEntidades, useContas, useCentrosCusto, useCategorias } from '../hooks/useData';
import { useUIStore } from '../store/uiStore';
import { EntidadeNegocio } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';

function formatCPFOrCNPJ(value: string): string {
  let clean = value.replace(/\D/g, '');
  if (clean.length > 14) clean = clean.slice(0, 14);
  if (clean.length <= 11) {
    if (clean.length > 9) return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    if (clean.length > 6) return clean.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    if (clean.length > 3) return clean.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    return clean;
  } else {
    if (clean.length > 12) return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
    if (clean.length > 8) return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
    if (clean.length > 5) return clean.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
    return clean.replace(/(\d{2})(\d{1,3})/, '$1.$2');
  }
}

function formatBRL(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (!clean) return '';
  const parsed = parseInt(clean, 10);
  return (parsed / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type SubTabType = 'entidades' | 'contas' | 'centros' | 'categorias';

export default function Cadastros() {
  const dragScrollTabs = useDragScroll();
  const { data: entidades = [], createEntity, updateEntity, deleteEntity } = useEntidades();
  const { data: contas = [], createAccount } = useContas();
  const { data: centrosCusto = [], createCC, deleteCC } = useCentrosCusto();
  const { data: categorias = [], createCategory } = useCategorias();

  const { isCadastroRapidoOpen, setModalOpen, entidadeFormDraft, setEntidadeFormDraft, resetAllDrafts, setActiveTab } = useUIStore();
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('entidades');
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'all' | 'cliente' | 'fornecedor'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo' | 'bpi'>('all');
  const [selectedEntityForProfile, setSelectedEntityForProfile] = useState<EntidadeNegocio | null>(null);
  const [profileNome, setProfileNome] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileTelefone, setProfileTelefone] = useState('');
  const [profileBirthdate, setProfileBirthdate] = useState('');
  const [profileStatusBase, setProfileStatusBase] = useState<'ativo' | 'inativo' | 'bpi'>('ativo');
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [isNewCCOpen, setIsNewCCOpen] = useState(false);
  const [isNewCatOpen, setIsNewCatOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankOpenDate, setBankOpenDate] = useState('2026-05-06');
  const [bankInitial, setBankInitial] = useState('');
  const [ccName, setCCName] = useState('');
  const [ccDesc, setCCDesc] = useState('');
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'entrada' | 'saida'>('entrada');

  const valueFormatter = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleOpenProfile = (ent: EntidadeNegocio) => {
    setSelectedEntityForProfile(ent);
    setProfileNome(ent.nome_razao_social || '');
    setProfileEmail(ent.email || 'contato@exemplo.com.br');
    setProfileTelefone(ent.telefone || '(11) 98765-4321');
    setProfileBirthdate(ent.data_nascimento || '1985-04-15');
    setProfileStatusBase(ent.status_base || 'ativo');
  };

  const handleEntidadeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entidadeFormDraft.tipo || !entidadeFormDraft.nome_razao_social) return;
    try {
      await createEntity({
        tipo: entidadeFormDraft.tipo as any,
        nome_razao_social: entidadeFormDraft.nome_razao_social,
        documento: entidadeFormDraft.documento || '-',
        status_sincronizacao: true,
        email: 'contato@empresa.com',
        status_base: 'ativo'
      });
      resetAllDrafts();
      setModalOpen('isCadastroRapidoOpen', false);
      showToast('Cadastro realizado!', 'success');
    } catch (err: any) {
      showToast('Erro: ' + err.message, 'error');
    }
  };

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntityForProfile) return;
    try {
      await updateEntity({
        id: selectedEntityForProfile.id,
        data: { nome_razao_social: profileNome, email: profileEmail, telefone: profileTelefone, data_nascimento: profileBirthdate, status_base: profileStatusBase }
      });
      setSelectedEntityForProfile(null);
      showToast('Cadastro atualizado!', 'success');
    } catch (err: any) {
      showToast('Erro ao atualizar.', 'error');
    }
  };

  const handleBankAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAccount({ nome_banco: bankName, nome: bankName, agencia: '0001', conta: '00000-0', data_abertura: bankOpenDate, saldo_inicial: parseFloat(bankInitial.replace(/\./g, '').replace(',', '.')) || 0 });
      setIsNewAccountOpen(false);
      showToast('Conta cadastrada!', 'success');
    } catch (err: any) {
      showToast('Erro ao cadastrar conta.', 'error');
    }
  };

  const filteredEntidades = entidades.filter(ent => {
    const matchesSearch = ent.nome_razao_social.toLowerCase().includes(searchTerm.toLowerCase()) || ent.documento.includes(searchTerm);
    const matchesTipo = tipoFilter === 'all' ? true : ent.tipo === tipoFilter;
    const matchesStatus = statusFilter === 'all' ? true : (ent.status_base || 'ativo') === statusFilter;
    return matchesSearch && matchesTipo && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-neutral-900">CRM & Cadastros</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">Gerenciamento centralizado de entidades e classificadores</p>
        </div>
        <button onClick={() => activeSubTab === 'entidades' ? setModalOpen('isCadastroRapidoOpen', true) : activeSubTab === 'contas' ? setIsNewAccountOpen(true) : activeSubTab === 'centros' ? setIsNewCCOpen(true) : setIsNewCatOpen(true)} className="px-8 py-3 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:brightness-95 shadow-md flex items-center gap-2"><Plus className="w-4 h-4" /> Novo Registro</button>
      </div>

      <div ref={dragScrollTabs.ref} {...dragScrollTabs.props} className="flex border-b border-neutral-200 overflow-x-auto scrollbar-none whitespace-nowrap">
        {['entidades', 'centros', 'contas', 'categorias'].map(tab => (
          <button key={tab} onClick={() => setActiveSubTab(tab as any)} className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all ${activeSubTab === tab ? 'border-primary text-primary' : 'border-transparent text-neutral-400 hover:text-neutral-900'}`}>
            {tab === 'entidades' ? 'Clientes e Fornecedores' : tab === 'centros' ? 'Centros de Custo' : tab === 'contas' ? 'Contas Bancárias' : 'Categorias'}
          </button>
        ))}
      </div>

      <div className="bg-white border-2 border-neutral-100 rounded-3xl overflow-hidden">
        {activeSubTab === 'entidades' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-neutral-50 text-neutral-400 border-b border-neutral-100 text-[9px] font-black uppercase tracking-widest"><th className="py-4 px-8">Entidade</th><th className="py-4 px-8">Documento</th><th className="py-4 px-8 text-center">Tipo</th><th className="py-4 px-8 text-center">Status</th></tr></thead>
              <tbody className="text-[11px] font-bold">
                {filteredEntidades.length === 0 ? <tr><td colSpan={4} className="py-20 text-center opacity-40 uppercase tracking-widest">Vazio</td></tr> : 
                filteredEntidades.map(ent => (
                  <tr key={ent.id} onClick={() => handleOpenProfile(ent)} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-all cursor-pointer">
                    <td className="py-4 px-8"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black uppercase shadow-sm">{ent.nome_razao_social.substring(0, 2)}</div><p className="text-neutral-900 font-black uppercase tracking-tighter">{ent.nome_razao_social}</p></div></td>
                    <td className="py-4 px-8 font-mono text-neutral-500">{ent.documento}</td>
                    <td className="py-4 px-8 text-center"><span className="rounded-lg bg-neutral-100 px-3 py-1.5 uppercase font-black text-[9px] tracking-widest">{ent.tipo}</span></td>
                    <td className="py-4 px-8 text-center"><span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-black uppercase text-[9px] ${ent.status_base === 'bpi' ? 'bg-red-50 text-alert-red' : 'bg-emerald-50 text-bank-truth-green'}`}><span className={`w-1.5 h-1.5 rounded-full ${ent.status_base === 'bpi' ? 'bg-alert-red' : 'bg-bank-truth-green'}`} />{ent.status_base || 'Ativo'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Simplified views for other tabs to focus on animations */}
        {activeSubTab !== 'entidades' && <div className="py-20 text-center opacity-40 uppercase tracking-widest font-black text-xs">Módulo em Operação Real</div>}
      </div>

      <AnimatePresence>
        {selectedEntityForProfile && (
          <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedEntityForProfile(null)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.form initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} onSubmit={handleUpdateProfileSubmit} className="w-full md:w-[500px] h-full bg-white shadow-2xl flex flex-col relative z-20">
              <header className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50 shrink-0">
                <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center font-black text-lg">{profileNome.substring(0, 2)}</div><div><h2 className="text-sm font-black uppercase tracking-widest text-neutral-900">{profileNome}</h2><p className="text-[10px] text-neutral-400 font-mono">{selectedEntityForProfile.documento}</p></div></div>
                <button type="button" onClick={() => setSelectedEntityForProfile(null)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors"><X className="w-6 h-6" /></button>
              </header>
              <div className="flex-1 overflow-y-auto p-10 space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Nome Completo</label><input type="text" value={profileNome} onChange={(e) => setProfileNome(e.target.value)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none" /></div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Email</label><input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none" /></div><div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Telefone</label><input type="text" value={profileTelefone} onChange={(e) => setProfileTelefone(e.target.value)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none" /></div></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Status na Base</label><select value={profileStatusBase} onChange={(e) => setProfileStatusBase(e.target.value as any)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none cursor-pointer"><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="bpi">BPI (Baixado)</option></select></div>
                </div>
              </div>
              <footer className="px-10 py-8 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3"><button type="button" onClick={() => setSelectedEntityForProfile(null)} className="px-6 py-2 font-black text-[10px] uppercase tracking-widest text-neutral-500">Descartar</button><button type="submit" className="px-10 py-3 bg-neutral-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl">Salvar Cadastro</button></footer>
            </motion.form>
          </div>
        )}

        {isCadastroRapidoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen('isCadastroRapidoOpen', false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.form initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onSubmit={handleEntidadeSubmit} className="bg-white w-full max-w-[440px] rounded-3xl shadow-2xl border-2 border-neutral-100 flex flex-col relative z-20 overflow-hidden">
              <header className="px-8 py-6 border-b border-neutral-50 flex justify-between items-center bg-neutral-50/50"><h2 className="text-sm font-black uppercase tracking-widest text-neutral-900">Novo Cadastro</h2><button type="button" onClick={() => setModalOpen('isCadastroRapidoOpen', false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors"><X className="w-6 h-6" /></button></header>
              <div className="p-10 space-y-6">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Tipo</label><select value={entidadeFormDraft.tipo} onChange={(e) => setEntidadeFormDraft({ tipo: e.target.value as any })} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none cursor-pointer"><option value="" disabled>Selecione...</option><option value="cliente">Cliente</option><option value="fornecedor">Fornecedor</option><option value="ambos">Ambos</option></select></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Nome / Razão Social</label><input type="text" required value={entidadeFormDraft.nome_razao_social} onChange={(e) => setEntidadeFormDraft({ nome_razao_social: e.target.value })} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none focus:border-primary transition-all" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">CPF / CNPJ</label><input type="text" value={entidadeFormDraft.documento} onChange={(e) => setEntidadeFormDraft({ documento: formatCPFOrCNPJ(e.target.value) })} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none font-mono" /></div>
              </div>
              <footer className="px-10 py-8 border-t border-neutral-50 bg-neutral-50/50 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen('isCadastroRapidoOpen', false)} className="px-6 py-2 font-black text-[10px] uppercase tracking-widest text-neutral-500">Voltar</button><button type="submit" className="px-10 py-3 bg-[#f3b233] text-on-background font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg border-2 border-[#df9d1d] hover:bg-[#e2a225] transition-all">Finalizar</button></footer>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none select-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div key={toast.id} initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} className="pointer-events-auto p-5 rounded-2xl border-2 shadow-2xl flex items-start gap-4 bg-white border-neutral-100">
              <div className="shrink-0 mt-1">{toast.type === 'success' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <XCircle className="w-6 h-6 text-alert-red" />}</div>
              <div><p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">{toast.type}</p><p className="text-xs font-black text-neutral-900">{toast.message}</p></div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
