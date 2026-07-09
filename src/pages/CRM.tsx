import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Search, 
  Plus, 
  Trash2, 
  X, 
  User,
  Users,
  Building,
  History,

  ShieldCheck, 
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
  ArrowRight
} from 'lucide-react';
import { useEntidades } from '../hooks/useData';
import { useUIStore } from '../store/uiStore';
import { EntidadeNegocio } from '../types';

export default function CRM() {
  const { data: entidades = [], createEntity, updateEntity, deleteEntity } = useEntidades();
  const { isCadastroRapidoOpen, setModalOpen, entidadeFormDraft, setEntidadeFormDraft, resetAllDrafts } = useUIStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'all' | 'cliente' | 'fornecedor'>('all');
  const [selectedEntity, setSelectedEntity] = useState<EntidadeNegocio | null>(null);

  // Form states for profile
  const [profileNome, setProfileNome] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileTelefone, setProfileTelefone] = useState('');
  const [profileStatus, setProfileStatus] = useState<'ativo' | 'inativo' | 'bpi'>('ativo');

  const filtered = useMemo(() => {
    return entidades.filter(ent => {
      const matchesSearch = ent.nome_razao_social.toLowerCase().includes(searchTerm.toLowerCase()) || ent.documento.includes(searchTerm);
      const matchesTipo = tipoFilter === 'all' ? true : ent.tipo === tipoFilter;
      return matchesSearch && matchesTipo;
    });
  }, [entidades, searchTerm, tipoFilter]);

  const handleOpenProfile = (ent: EntidadeNegocio) => {
    setSelectedEntity(ent);
    setProfileNome(ent.nome_razao_social);
    setProfileEmail(ent.email || '');
    setProfileTelefone(ent.telefone || '');
    setProfileStatus(ent.status_base || 'ativo');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity) return;
    try {
      await updateEntity({
        id: selectedEntity.id,
        data: { nome_razao_social: profileNome, email: profileEmail, telefone: profileTelefone, status_base: profileStatus }
      });
      setSelectedEntity(null);
    } catch (err) {
      alert('Erro ao atualizar');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEntity({
        ...entidadeFormDraft,
        status_base: 'ativo',
        status_sincronizacao: true,
        created_at: new Date().toISOString()
      } as any);

      resetAllDrafts();
      setModalOpen('isCadastroRapidoOpen', false);
    } catch (err) {
      alert('Erro ao criar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-neutral-900">CRM de Entidades</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">Gestão de Clientes, Fornecedores e Histórico de Relacionamento</p>
        </div>
        <button 
          onClick={() => setModalOpen('isCadastroRapidoOpen', true)}
          className="px-8 py-3 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:brightness-95 shadow-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Cadastro
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border-2 border-neutral-100 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Total Entidades</p>
            <p className="text-2xl font-black text-neutral-900">{entidades.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Users className="w-6 h-6" /></div>
        </div>
        <div className="bg-white border-2 border-neutral-100 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Clientes Ativos</p>
            <p className="text-2xl font-black text-emerald-600">{entidades.filter(e => e.tipo === 'cliente').length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-6 h-6" /></div>
        </div>
        <div className="bg-white border-2 border-neutral-100 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Inadimplência</p>
            <p className="text-2xl font-black text-alert-red">4.2%</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-alert-red flex items-center justify-center"><AlertTriangle className="w-6 h-6" /></div>
        </div>
      </div>

      <div className="bg-white border-2 border-neutral-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-neutral-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-neutral-50/30">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou documento..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-white border-2 border-neutral-100 rounded-xl text-xs font-bold focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={tipoFilter} 
              onChange={(e) => setTipoFilter(e.target.value as any)}
              className="h-11 px-4 bg-white border-2 border-neutral-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
            >
              <option value="all">Todos os Tipos</option>
              <option value="cliente">Clientes</option>
              <option value="fornecedor">Fornecedores</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-400 border-b border-neutral-100 text-[9px] font-black uppercase tracking-widest">
                <th className="py-4 px-8">Entidade / Razão Social</th>
                <th className="py-4 px-8">CPF / CNPJ</th>
                <th className="py-4 px-8 text-center">Tipo</th>
                <th className="py-4 px-8 text-center">Status</th>
                <th className="py-4 px-8 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-bold">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center opacity-40 uppercase tracking-widest font-black text-xs">Nenhum registro encontrado</td></tr>
              ) : (
                filtered.map(ent => (
                  <tr 
                    key={ent.id} 
                    onClick={() => handleOpenProfile(ent)}
                    className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-all cursor-pointer group"
                  >
                    <td className="py-4 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center font-black uppercase group-hover:bg-primary/10 group-hover:text-primary transition-colors shadow-sm">
                          {ent.nome_razao_social.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-neutral-900 font-black uppercase tracking-tighter">{ent.nome_razao_social}</p>
                          <p className="text-[9px] text-neutral-400 lowercase font-medium">{ent.email || 'sem e-mail cadastrado'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-8 font-mono text-neutral-500">{ent.documento}</td>
                    <td className="py-4 px-8 text-center">
                      <span className={`rounded-lg px-3 py-1.5 uppercase font-black text-[9px] tracking-widest ${ent.tipo === 'cliente' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                        {ent.tipo}
                      </span>
                    </td>
                    <td className="py-4 px-8 text-center">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-black uppercase text-[9px] ${ent.status_base === 'bpi' ? 'bg-red-50 text-alert-red' : 'bg-emerald-50 text-bank-truth-green'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ent.status_base === 'bpi' ? 'bg-alert-red' : 'bg-bank-truth-green'}`} />
                        {ent.status_base || 'Ativo'}
                      </span>
                    </td>
                    <td className="py-4 px-8 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteEntity(ent.id); }}
                        className="p-2 hover:bg-red-50 text-neutral-300 hover:text-alert-red rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {/* Profile Slide Panel */}
        {selectedEntity && (
          <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedEntity(null)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.form 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              onSubmit={handleUpdate}
              className="w-full md:w-[500px] h-full bg-white shadow-2xl flex flex-col relative z-20"
            >
              <header className="px-8 py-6 border-b border-neutral-100 bg-neutral-50 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xl shadow-lg">
                      {profileNome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-widest text-neutral-900">{profileNome}</h2>
                      <p className="text-[10px] text-neutral-400 font-mono">{selectedEntity.documento}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedEntity(null)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-10 space-y-10">
                {/* Form Section */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <User className="w-4 h-4" /> Informações do Cadastro
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Nome / Razão Social</label>
                      <input type="text" value={profileNome} onChange={(e) => setProfileNome(e.target.value)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Email Corporativo</label>
                        <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none focus:border-primary transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Telefone</label>
                        <input type="text" value={profileTelefone} onChange={(e) => setProfileTelefone(e.target.value)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none focus:border-primary transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Status na Base</label>
                      <select value={profileStatus} onChange={(e) => setProfileStatus(e.target.value as any)} className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none cursor-pointer appearance-none">
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                        <option value="bpi">BPI (Baixado)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Professionalized Timeline */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <History className="w-4 h-4" /> Timeline de Relacionamento
                  </h3>
                  <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-100">
                    <div className="relative pl-8">
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-emerald-50 border-4 border-white flex items-center justify-center shadow-sm z-10"><CheckCircle2 className="w-3 h-3 text-emerald-500" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-tight text-neutral-900">Conciliação Concluída</p>
                        <p className="text-[9px] text-neutral-400">Há 2 horas • Fatura #88293 quitada via Itaú</p>
                      </div>
                    </div>
                    <div className="relative pl-8">
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-blue-50 border-4 border-white flex items-center justify-center shadow-sm z-10"><Clock className="w-3 h-3 text-blue-500" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-tight text-neutral-900">Novo Lançamento Criado</p>
                        <p className="text-[9px] text-neutral-400">Ontem às 14:20 • R$ 12.450,00 (Venc. 15/10)</p>
                      </div>
                    </div>
                    <div className="relative pl-8">
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-neutral-50 border-4 border-white flex items-center justify-center shadow-sm z-10"><Plus className="w-3 h-3 text-neutral-400" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-tight text-neutral-900">Cadastro Realizado</p>
                        <p className="text-[9px] text-neutral-400">12 Out 2023 • Via CRM Interface</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <footer className="px-10 py-8 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setSelectedEntity(null)} className="px-6 py-2 font-black text-[10px] uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors">Cancelar</button>
                <button type="submit" className="px-10 py-3 bg-neutral-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:brightness-95 transition-all">Atualizar Cadastro</button>
              </footer>
            </motion.form>
          </div>
        )}

        {/* Create Modal */}
        {isCadastroRapidoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen('isCadastroRapidoOpen', false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.form 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              onSubmit={handleCreate}
              className="bg-white w-full max-w-[440px] rounded-3xl shadow-2xl border-2 border-neutral-100 flex flex-col relative z-20 overflow-hidden"
            >
              <header className="px-8 py-6 border-b border-neutral-50 flex justify-between items-center bg-neutral-50/50">
                <h2 className="text-sm font-black uppercase tracking-widest text-neutral-900">Novo Cadastro</h2>
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
                    onChange={(e) => setEntidadeFormDraft({ documento: e.target.value })}
                    className="w-full h-12 bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 text-xs font-black outline-none font-mono" 
                  />
                </div>
              </div>
              <footer className="px-10 py-8 border-t border-neutral-50 bg-neutral-50/50 flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen('isCadastroRapidoOpen', false)} className="px-6 py-2 font-black text-[10px] uppercase tracking-widest text-neutral-500">Cancelar</button>
                <button type="submit" className="px-10 py-3 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg hover:brightness-95 transition-all">Finalizar</button>
              </footer>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
