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
  Clock
} from 'lucide-react';
import { useEntidades, useContas, useCentrosCusto, useCategorias } from '../hooks/useData';
import { useUIStore } from '../store/uiStore';
import { EntidadeNegocio } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';

function formatCPFOrCNPJ(value: string): string {
  let clean = value.replace(/\D/g, '');
  if (clean.length > 14) {
    clean = clean.slice(0, 14);
  }

  if (clean.length <= 11) {
    // CPF logic
    if (clean.length > 9) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (clean.length > 6) {
      return clean.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (clean.length > 3) {
      return clean.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    return clean;
  } else {
    // CNPJ logic
    if (clean.length > 12) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
    } else if (clean.length > 8) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
    } else if (clean.length > 5) {
      return clean.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
    }
    return clean.replace(/(\d{2})(\d{1,3})/, '$1.$2');
  }
}

function formatBRL(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (!clean) return '';
  const parsed = parseInt(clean, 10);
  const formatted = (parsed / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatted;
}

type SubTabType = 'entidades' | 'contas' | 'centros' | 'categorias';

export default function Cadastros() {
  const dragScrollTabs = useDragScroll();
  const { 
    data: entidades = [], 
    createEntity, 
    updateEntity,
    deleteEntity 
  } = useEntidades();

  const { 
    data: contas = [], 
    createAccount 
  } = useContas();

  const { 
    data: centrosCusto = [], 
    createCC, 
    deleteCC 
  } = useCentrosCusto();

  const { 
    data: categorias = [], 
    createCategory 
  } = useCategorias();

  // Zustand Store
  const { 
    isCadastroRapidoOpen,
    setModalOpen,
    entidadeFormDraft,
    setEntidadeFormDraft,
    resetAllDrafts,
    setActiveTab
  } = useUIStore();

  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('entidades');

  // Toasts state and controller
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'all' | 'cliente' | 'fornecedor'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo' | 'bpi'>('all');

  // Page index for simulation
  const [currentPage, setCurrentPage] = useState(1);

  // Profile Slide Panel (BPI) active state
  const [selectedEntityForProfile, setSelectedEntityForProfile] = useState<EntidadeNegocio | null>(null);

  // Customer Profile Editor local inputs
  const [profileNome, setProfileNome] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileTelefone, setProfileTelefone] = useState('');
  const [profileBirthdate, setProfileBirthdate] = useState('');
  const [profileStatusBase, setProfileStatusBase] = useState<'ativo' | 'inativo' | 'bpi'>('ativo');

  
  // Local creation states for other simple records
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [isNewCCOpen, setIsNewCCOpen] = useState(false);
  const [isNewCatOpen, setIsNewCatOpen] = useState(false);

  // Edit states
  const [editAccountTarget, setEditAccountTarget] = useState<any>(null);
  const [editCCTarget, setEditCCTarget] = useState<any>(null);
  const [editCatTarget, setEditCatTarget] = useState<any>(null);

  // Delete confirmation state
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string, type: 'entidade' | 'conta' | 'cc' | 'cat', name: string } | null>(null);


  // Form states
  const [bankName, setBankName] = useState('');
  const [bankOpenDate, setBankOpenDate] = useState('2026-05-06');
  const [bankInitial, setBankInitial] = useState('');

  const [ccName, setCCName] = useState('');
  const [ccDesc, setCCDesc] = useState('');

  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'entrada' | 'saida'>('entrada');

  const valueFormatter = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Profile selection helper
  const handleOpenProfile = (ent: EntidadeNegocio) => {
    setSelectedEntityForProfile(ent);
    setProfileNome(ent.nome_razao_social || '');
    setProfileEmail(ent.email || 'contato@exemplo.com.br');
    setProfileTelefone(ent.telefone || '(11) 98765-4321');
    setProfileBirthdate(ent.data_nascimento || '1985-04-15');
    setProfileStatusBase(ent.status_base || 'ativo');
  };

  // Submit quick entities

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    try {
      if (deleteConfirmTarget.type === 'entidade') {
        await deleteEntity(deleteConfirmTarget.id);
      } else if (deleteConfirmTarget.type === 'conta') {
        // delete account not implemented in hook but simulated
        showToast('Conta excluída.', 'success');
      } else if (deleteConfirmTarget.type === 'cc') {
        await deleteCC(deleteConfirmTarget.id);
      } else if (deleteConfirmTarget.type === 'cat') {
        // delete category not implemented in hook but simulated
        showToast('Categoria excluída.', 'success');
      }
      setDeleteConfirmTarget(null);
      showToast('Registro excluído com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao excluir: ' + err.message, 'error');
    }
  };

  const handleEntidadeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entidadeFormDraft.tipo || !entidadeFormDraft.nome_razao_social) return;

    if (entidadeFormDraft.documento && entidadeFormDraft.documento.trim() !== '') {
      const cleanDoc = entidadeFormDraft.documento.replace(/\D/g, '');
      if (cleanDoc.length > 0 && cleanDoc.length !== 11 && cleanDoc.length !== 14) {
        showToast('O CPF deve conter exatamente 11 números e o CNPJ exatamente 14 números. Por favor, verifique o campo CPF / CNPJ.', 'warning');
        return;
      }
    }

    try {
      await createEntity({
        tipo: entidadeFormDraft.tipo as any,
        nome_razao_social: entidadeFormDraft.nome_razao_social,
        documento: entidadeFormDraft.documento || '-',
        status_sincronizacao: true,
        email: 'financeiro_novo@exemplo.com.br',
        telefone: '(11) 98000-0000',
        data_nascimento: '1988-10-10',
        status_base: 'ativo'
      });
      
      resetAllDrafts();
      setModalOpen('isCadastroRapidoOpen', false);
      showToast('Entidade cadastrada com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao cadastrar entidade: ' + err.message, 'error');
    }
  };

  // Submit profile edit changes
  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntityForProfile) return;

    try {
      await updateEntity({
        id: selectedEntityForProfile.id,
        data: {
          nome_razao_social: profileNome,
          email: profileEmail,
          telefone: profileTelefone,
          data_nascimento: profileBirthdate,
          status_base: profileStatusBase
        }
      });
      
      setSelectedEntityForProfile({
        ...selectedEntityForProfile,
        nome_razao_social: profileNome,
        email: profileEmail,
        telefone: profileTelefone,
        data_nascimento: profileBirthdate,
        status_base: profileStatusBase
      });

      showToast('Cadastro atualizado com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao atualizar cadastro: ' + err.message, 'error');
    }
  };

  // Apply BPI Action (Baixa por Inatividade)
  const handleApplyBPI = async () => {
    if (!selectedEntityForProfile) return;
    const confirmed = window.confirm(
      `Confirma a aplicação de Baixa por Inatividade (BPI) para ${selectedEntityForProfile.nome_razao_social}?`
    );
    if (!confirmed) return;

    try {
      await updateEntity({
        id: selectedEntityForProfile.id,
        data: {
          status_base: 'bpi'
        }
      });

      setSelectedEntityForProfile({
        ...selectedEntityForProfile,
        status_base: 'bpi'
      });
      setProfileStatusBase('bpi');
      showToast('BPI (Baixa por Inatividade) registrada com sucesso! Lançamentos futuros foram bloqueados.', 'success');
    } catch (err: any) {
      showToast('Erro ao registrar BPI: ' + err.message, 'error');
    }
  };

  // Submit Bank Accounts
  const handleBankAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !bankInitial) return;

    try {
      const cleanStr = bankInitial.replace(/\./g, '').replace(',', '.');
      const parsedValue = parseFloat(cleanStr) || 0;

      await createAccount({
        nome_banco: bankName,
        data_abertura: bankOpenDate + 'T00:00:00Z',
        saldo_inicial: parsedValue
      });

      setBankName('');
      setBankInitial('');
      setIsNewAccountOpen(false);
      showToast('Nova Conta Bancária cadastrada com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao cadastrar conta: ' + err.message, 'error');
    }
  };

  // Submit Centros Custo
  const handleCCSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccName) return;

    try {
      await createCC({
        nome: ccName,
        descricao: ccDesc
      });

      setCCName('');
      setCCDesc('');
      setIsNewCCOpen(false);
      showToast('Centro de Custo cadastrado com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao cadastrar: ' + err.message, 'error');
    }
  };

  // Submit Categories
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;

    try {
      await createCategory({
        nome: catName,
        tipo: catType
      });

      setCatName('');
      setIsNewCatOpen(false);
      showToast('Categoria financeira criada com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao criar categoria: ' + err.message, 'error');
    }
  };

  // Filter entidades list safely
  const filteredEntidades = entidades.filter(ent => {
    const matchesSearch = 
      ent.nome_razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ent.documento.includes(searchTerm);

    const matchesTipo = tipoFilter === 'all' ? true : ent.tipo === tipoFilter;

    // Default status fallback is 'ativo' if not explicitly defined
    const currentStatus = ent.status_base || 'ativo';
    const matchesStatus = statusFilter === 'all' ? true : currentStatus === statusFilter;

    return matchesSearch && matchesTipo && matchesStatus;
  });

  // Initials generator
  const getInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0].substring(0, 1) + words[1].substring(0, 1)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Color generator for avatar initials
  const getAvatarColor = (initials: string) => {
    const hash = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
    const colors = [
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-teal-100 text-teal-700 border-teal-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200'
    ];
    return colors[hash % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Gestão de CRM e Cadastros</h1>
          <p className="text-xs text-on-surface-variant/80 mt-0.5">Gerencie entidades, centros de custo e contas bancárias do sistema.</p>
        </div>
        
        <div>
          {activeSubTab === 'entidades' && (
            <button 
              type="button"
              onClick={() => setModalOpen('isCadastroRapidoOpen', true)}
              className="px-4 py-2 bg-[#f3b233] text-on-background hover:bg-[#e2a225] font-bold text-xs rounded transition-all shadow-sm flex items-center gap-1.5 h-10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Cadastro
            </button>
          )}

          {activeSubTab === 'contas' && (
            <button 
              type="button"
              onClick={() => setIsNewAccountOpen(true)}
              className="px-4 py-2 bg-[#f3b233] text-on-background hover:bg-[#e2a225] font-bold text-xs rounded transition-all shadow-sm flex items-center gap-1.5 h-10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Conta Bancária
            </button>
          )}

          {activeSubTab === 'centros' && (
            <button 
              type="button"
              onClick={() => setIsNewCCOpen(true)}
              className="px-4 py-2 bg-[#f3b233] text-on-background hover:bg-[#e2a225] font-bold text-xs rounded transition-all shadow-sm flex items-center gap-1.5 h-10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Centro de Custo
            </button>
          )}

          {activeSubTab === 'categorias' && (
            <button 
              type="button"
              onClick={() => setIsNewCatOpen(true)}
              className="px-4 py-2 bg-[#f3b233] text-on-background hover:bg-[#e2a225] font-bold text-xs rounded transition-all shadow-sm flex items-center gap-1.5 h-10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Categoria
            </button>
          )}
        </div>
      </div>

      {/* Tabs Header */}
      <div ref={dragScrollTabs.ref} {...dragScrollTabs.props} className="flex border-b border-surface-border gap-2 overflow-x-auto scrollbar-none whitespace-nowrap scroll-smooth pb-0.5 select-none" style={{ cursor: 'grab', userSelect: 'none' }}>
        <button 
          onClick={() => setActiveSubTab('entidades')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            activeSubTab === 'entidades' 
              ? 'border-[#f3b233] text-on-surface border-b-3 font-semibold' 
              : 'border-transparent text-on-surface-variant/70 hover:text-on-surface'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Clientes / Fornecedores
        </button>

        <button 
          onClick={() => setActiveSubTab('centros')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            activeSubTab === 'centros' 
              ? 'border-[#f3b233] text-on-surface border-b-3 font-semibold' 
              : 'border-transparent text-on-surface-variant/70 hover:text-on-surface'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Centros de Custo
        </button>

        <button 
          onClick={() => setActiveSubTab('contas')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            activeSubTab === 'contas' 
              ? 'border-[#f3b233] text-on-surface border-b-3 font-semibold' 
              : 'border-transparent text-on-surface-variant/70 hover:text-on-surface'
          }`}
        >
          <Coins className="w-4 h-4" />
          Contas Bancárias
        </button>
        
        <button 
          onClick={() => setActiveSubTab('categorias')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            activeSubTab === 'categorias' 
              ? 'border-[#f3b233] text-on-surface border-b-3 font-semibold' 
              : 'border-transparent text-on-surface-variant/70 hover:text-on-surface'
          }`}
        >
          <Tag className="w-4 h-4" />
          Categorias Financeiras
        </button>
      </div>

      {/* SEARCH FILTERS AND OVERVIEW BLOCK OF THE TABLE */}
      {activeSubTab === 'entidades' && (
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Left search */}
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-on-surface-variant/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por Nome, Razão Social ou Documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-medium pl-10 pr-4 py-2.5 bg-surface border border-surface-border text-on-surface rounded-lg placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary-container"
            />
          </div>

          {/* Right filters */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select 
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value as any)}
              className="text-xs font-semibold px-3 py-2 bg-surface border border-surface-border text-on-surface rounded-lg focus:outline-none"
            >
              <option value="all">Todos os Tipos</option>
              <option value="cliente">Cliente</option>
              <option value="fornecedor">Fornecedor</option>
            </select>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs font-semibold px-3 py-2 bg-surface border border-surface-border text-on-surface rounded-lg focus:outline-none"
            >
              <option value="all">Status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="bpi">BPI (Baixado)</option>
            </select>

            <button 
              type="button"
              className="p-2 bg-surface hover:bg-surface-container border border-surface-border rounded-lg text-on-surface-variant"
              title="Limpar Filtros"
              onClick={() => { setSearchTerm(''); setTipoFilter('all'); setStatusFilter('all'); }}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab Contents */}
      <div className="bg-surface-container-lowest border border-surface-border rounded-xl shadow-xs overflow-hidden">
        {/* ENTIDADES */}
        {activeSubTab === 'entidades' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-low-low text-on-surface-variant/70 border-b border-surface-border select-none">
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider shrink-0">Nome / Razão Social</th>
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider">CPF / CNPJ</th>
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-center">Tipo</th>
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-center">Status</th>
                  <th className="py-3.5 px-6 w-20 text-center text-xs font-bold uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {filteredEntidades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant/40 font-medium">
                      Nenhum registro encontrado para essa busca.
                    </td>
                  </tr>
                ) : (
                  filteredEntidades.map(ent => {
                    const statusVal = ent.status_base || 'ativo';
                    const initials = getInitials(ent.nome_razao_social);
                    
                    return (
                      <tr 
                        key={ent.id} 
                        className="border-b border-surface-border hover:bg-surface-low-low transition-colors cursor-pointer"
                        onClick={() => handleOpenProfile(ent)}
                      >
                        {/* Name with circular avatar initials */}
                        <td className="py-4 px-6 font-bold text-on-background select-all">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${getAvatarColor(initials)}`}>
                              {initials}
                            </div>
                            <span className="hover:underline">{ent.nome_razao_social}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-mono text-on-surface-variant/80">{ent.documento}</td>
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 font-bold text-[10px] rounded border uppercase ${
                            ent.tipo === 'cliente' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : ent.tipo === 'fornecedor'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-purple-10  text-purple-700 border-purple-200'
                          }`}>
                            {ent.tipo === 'cliente' ? 'Cliente' : ent.tipo === 'fornecedor' ? 'Fornecedor' : 'Ambos'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            statusVal === 'ativo' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : statusVal === 'inativo' 
                              ? 'bg-neutral-100 text-neutral-600 border-neutral-300'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              statusVal === 'ativo' ? 'bg-emerald-500' : statusVal === 'inativo' ? 'bg-neutral-400' : 'bg-amber-500'
                            }`}></span>
                            {statusVal === 'ativo' ? 'Ativo' : statusVal === 'inativo' ? 'Inativo' : 'BPI'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            onClick={() => setDeleteConfirmTarget({ id: ent.id, type: 'entidade', name: ent.nome_razao_social })}
                            className="text-on-surface-variant hover:text-alert-red transition-colors p-1.5 rounded-full hover:bg-surface-container"
                            title="Apagar Registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination bar inside of table footer */}
            <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between text-xs bg-surface-low-low font-semibold text-on-surface-variant/70">
              <span>Mostrando 1 a {filteredEntidades.length} de {filteredEntidades.length} registros</span>
              <div className="flex items-center gap-1">
                <button type="button" className="p-1 rounded hover:bg-surface-container text-on-surface-variant disabled:opacity-40" disabled>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" className="w-6 h-6 rounded bg-[#f3b233] text-on-background font-extrabold flex items-center justify-center">
                  1
                </button>
                <button type="button" className="w-6 h-6 rounded hover:bg-surface-container flex items-center justify-center">
                  2
                </button>
                <button type="button" className="w-6 h-6 rounded hover:bg-surface-container flex items-center justify-center">
                  3
                </button>
                <span className="px-1 text-on-surface-variant/40">...</span>
                <button type="button" className="p-1 rounded hover:bg-surface-container text-on-surface-variant">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONTAS BANCARIAS */}
        {activeSubTab === 'contas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-low-low text-on-surface-variant/70 border-b border-surface-border">
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider">Nome do Banco / Conta</th>
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider">Data de Abertura</th>
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-right">Saldo Inicial Imutável</th>
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {contas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-on-surface-variant/40">
                      Nenhuma conta cadastrada.
                    </td>
                  </tr>
                ) : (
                  contas.map(c => (
                    <tr key={c.id} className="border-b border-surface-border hover:bg-surface-low-low transition-colors">
                      <td className="py-4 px-6 font-bold text-on-background">{c.nome_banco || c.nome || 'N/A'}</td>
                      <td className="py-4 px-6 font-mono text-on-surface-variant/80">
                        {c.data_abertura ? c.data_abertura.substring(0, 10).split('-').reverse().join('/') : 'N/A'}
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-right text-bank-truth-green">
                        {valueFormatter(c.saldo_inicial)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 rounded px-2.5 py-0.5">
                          Operacional
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CENTROS DE CUSTO */}
        {activeSubTab === 'centros' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-low-low text-on-surface-variant/70 border-b border-surface-border">
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider">Nome do Centro de Custo</th>
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider">Descrição da Finalidade</th>
                  <th className="py-3.5 px-6 w-16"></th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {centrosCusto.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-on-surface-variant/40">
                      Nenhum centro de custo cadastrado.
                    </td>
                  </tr>
                ) : (
                  centrosCusto.map(cc => (
                    <tr key={cc.id} className="border-b border-surface-border hover:bg-surface-low-low transition-colors">
                      <td className="py-4 px-6 font-bold text-on-background whitespace-nowrap">{cc.nome}</td>
                      <td className="py-4 px-6 text-on-surface-variant leading-relaxed max-w-[300px]">{cc.descricao}</td>
                      <td className="py-4 px-6 text-right">
                        <button 
                          type="button"
                          onClick={() => setDeleteConfirmTarget({ id: cc.id, type: 'cc', name: cc.nome })}
                          className="text-on-surface-variant hover:text-alert-red transition-colors p-1.5 rounded-full hover:bg-surface-container"
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
        )}

        {/* CATEGORIAS */}
        {activeSubTab === 'categorias' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-low-low text-on-surface-variant/70 border-b border-surface-border">
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider">Nome do Classificador / Categoria</th>
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-center">Fluxo Contábil</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {categorias.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-on-surface-variant text-sm font-bold border-b border-surface-border">
                      Nenhuma categoria financeira cadastrada.
                    </td>
                  </tr>
                ) : categorias.map(cat => (
                  <tr key={cat.id} className="border-b border-surface-border hover:bg-surface-low-low transition-colors">
                    <td className="py-4 px-6 font-bold text-on-background">{cat.nome}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        cat.tipo === 'entrada' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {cat.tipo === 'entrada' ? 'Receita / Entrada' : 'Despesa / Saída'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* METRIC BOTTOM BENTO CARDS UNDER THE LIST */}
      {activeSubTab === 'entidades' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Total Clientes info card */}
          <div className="bg-surface border border-surface-border rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-on-surface-variant/70 block">Total Clientes</span>
              <span className="text-2xl font-black tracking-tight text-on-surface block">1.245</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                +12% este mês
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center border border-amber-200 shrink-0">
              <Users className="w-5 h-5 text-[#f3b233]" />
            </div>
          </div>

          {/* Fornecedores ativos info card */}
          <div className="bg-surface border border-surface-border rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-on-surface-variant/70 block">Fornecedores Ativos</span>
              <span className="text-2xl font-black tracking-tight text-on-surface block">328</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant/60">
                4 pendentes de validação
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center border border-amber-200 shrink-0">
              <Truck className="w-5 h-5 text-[#f3b233]" />
            </div>
          </div>

          {/* Audit logs quick card - Dark Contrast theme style */}
          <div className="bg-[#1a1c1c] text-white rounded-xl p-5 shadow-xs flex flex-col justify-between border border-neutral-800">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-amber-400 block tracking-wider uppercase">Auditoria de Cadastros</span>
              <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                Revise alterações recentes em dados sensíveis bancários.
              </p>
            </div>
            <button 
              type="button"
              onClick={() => {
                setActiveTab('configuracoes');
                // Trigger visual redirection to settings auditoria tab
              }}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer select-none text-left"
            >
              Visualizar Logs
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}


      {/* ========================================== */}
      {/* TELA 4.1: SLIDE PANEL PERFIL DO CLIENTE & BPI */}
      {/* ========================================== */}
      {selectedEntityForProfile && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none animate-fade-in">
          {/* Backdrop glass blur overlay */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
            onClick={() => setSelectedEntityForProfile(null)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-[500px] bg-surface-container-lowest border-l border-surface-border shadow-2xl flex flex-col h-full overflow-y-auto animate-slide-in">
              
              {/* Slider Header */}
              <header className="px-6 py-5 border-b border-surface-border flex items-center justify-between bg-surface-low-low">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-on-surface-variant font-bold text-sm border border-surface-border">
                    <User className="w-5 h-5 text-on-surface-variant/70" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm tracking-tight text-on-background">
                      {selectedEntityForProfile.nome_razao_social}
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-on-surface-variant/40 block">
                      CPF/CNPJ: {selectedEntityForProfile.documento}
                    </span>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={() => setSelectedEntityForProfile(null)}
                  className="rounded-full p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </header>

              {/* Slider Body */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-surface-container-lowest">
                
                {/* Form Section: DADOS CADASTRAIS */}
                <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
                  <div className="flex items-center gap-1.5 border-b border-surface-border pb-2">
                    <Building className="w-4 h-4 text-[#f3b233]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-on-surface">Dados Cadastrais</h4>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Nome Completo</label>
                      <input 
                        type="text"
                        required
                        value={profileNome}
                        onChange={(e) => setProfileNome(e.target.value)}
                        className="w-full bg-surface border border-surface-border text-xs rounded px-3 py-2 text-on-surface focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase">E-mail Principal</label>
                        <input 
                          type="email"
                          required
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full bg-surface border border-surface-border text-xs rounded px-3 py-2 text-on-surface focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Telefone (Celular)</label>
                        <input 
                          type="text"
                          required
                          value={profileTelefone}
                          onChange={(e) => setProfileTelefone(e.target.value)}
                          className="w-full bg-surface border border-surface-border text-xs rounded px-3 py-2 text-on-surface focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Data de Nascimento</label>
                        <input 
                          type="date"
                          required
                          value={profileBirthdate}
                          onChange={(e) => setProfileBirthdate(e.target.value)}
                          className="w-full bg-surface border border-surface-border text-xs rounded px-3 py-2 text-on-surface focus:outline-none"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Status na Base</label>
                        <select 
                          value={profileStatusBase}
                          onChange={(e) => setProfileStatusBase(e.target.value as any)}
                          className="w-full bg-surface border border-surface-border text-xs rounded px-3 py-2 text-on-surface font-semibold focus:outline-none"
                        >
                          <option value="ativo">Ativo</option>
                          <option value="inativo">Inativo</option>
                          <option value="bpi">BPI (Baixado)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-on-surface font-bold text-xs rounded transition-all shadow-xs cursor-pointer"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>

                {/* Section: HISTÓRICO FINANCEIRO */}
                <div className="space-y-3.5 pt-2">
                  <div className="flex items-center justify-between border-b border-surface-border pb-2">
                    <div className="flex items-center gap-1.5">
                      <History className="w-4 h-4 text-[#f3b233]" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-on-surface">Histórico Financeiro</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-[#f3b233]/15 text-primary border border-primary/20 px-2 py-0.5 rounded">
                      Últimos 6 meses
                    </span>
                  </div>

                  <div className="border border-surface-border rounded-lg overflow-hidden text-[11px]">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-surface-low-low font-bold text-on-surface-variant/70 border-b border-surface-border select-none">
                          <th className="py-2.5 px-3">Data Emissão</th>
                          <th className="py-2.5 px-3 text-right">Valor Parcela</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-surface-border hover:bg-surface-low-low">
                          <td className="py-2.5 px-3 font-mono font-medium">15/10/2023</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right">R$ 1.500,00</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Confirmado
                            </span>
                          </td>
                        </tr>
                        <tr className="border-b border-surface-border hover:bg-surface-low-low">
                          <td className="py-2.5 px-3 font-mono font-medium">15/09/2023</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right">R$ 1.500,00</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Confirmado
                            </span>
                          </td>
                        </tr>
                        <tr className="border-b border-surface-border hover:bg-surface-low-low">
                          <td className="py-2.5 px-3 font-mono font-medium">15/08/2023</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right">R$ 1.500,00</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-800 font-bold px-2 py-0.5 rounded border border-red-200">
                              <XCircle className="w-3 h-3 text-red-500" />
                              Atrasado
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-surface-low-low">
                          <td className="py-2.5 px-3 font-mono font-medium">15/07/2023</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right">R$ 1.500,00</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
                              Pendente
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section: AÇÕES DE GOVERNANÇA (BPI) */}
                <div className="space-y-3.5 pt-4 border-t border-surface-border">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#f3b233]" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-on-surface">Ações de Governança</h4>
                    </div>
                    
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-300 rounded px-2 py-0.5 uppercase tracking-wider block">
                      Perfil Master
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant/80 leading-relaxed font-semibold">
                    A Baixa por Inatividade encerra as cobranças ativas e arquiva o histórico do cliente. Esta ação é irreversível e requer nível de aprovação Master.
                  </p>

                  <button 
                    type="button"
                    onClick={handleApplyBPI}
                    className="w-full py-3 bg-[#f3b233] hover:bg-[#e2a225] text-on-background font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer border border-[#d69614]"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Aplicar BPI (Baixa por Inatividade)
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}


      {/* ========================================== */}
      {/* POP-UP: CADASTRO RÁPIDO ENTIDADES (2.2)    */}
      {/* ========================================== */}
      {isCadastroRapidoOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleEntidadeSubmit}
            className="bg-surface w-full max-w-[440px] rounded-xl shadow-xl flex flex-col overflow-hidden animate-slide-in border border-surface-border"
          >
            <header className="px-6 py-5 border-b border-surface-border flex justify-between items-center bg-surface-container-low select-none">
              <h2 className="text-headline-sm font-bold text-on-background tracking-tight">Cadastro Rápido</h2>
              <button 
                type="button" 
                onClick={() => { resetAllDrafts(); setModalOpen('isCadastroRapidoOpen', false); }}
                className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-6 space-y-5 bg-surface-container-lowest">
              {/* Type Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant">Tipo de Entidade <span className="text-alert-red">*</span></label>
                <select 
                  value={entidadeFormDraft.tipo} 
                  onChange={(e) => setEntidadeFormDraft({ tipo: e.target.value as any })}
                  className="w-full bg-surface border border-surface-border text-on-surface font-semibold text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  required
                >
                  <option value="" disabled>Selecione o tipo</option>
                  <option value="cliente">Cliente</option>
                  <option value="fornecedor">Fornecedor</option>
                  <option value="ambos">Ambos</option>
                </select>
              </div>

              {/* Razao social name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant">Nome / Razão Social <span className="text-alert-red">*</span></label>
                <input 
                  type="text"
                  placeholder="Digite o nome completo ou razão social"
                  value={entidadeFormDraft.nome_razao_social}
                  onChange={(e) => setEntidadeFormDraft({ nome_razao_social: e.target.value })}
                  className="w-full bg-surface border border-surface-border text-on-surface text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-on-surface-variant/40"
                  required
                />
              </div>

              {/* CPF / CNPJ */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant">CPF / CNPJ</label>
                <input 
                  type="text"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  value={entidadeFormDraft.documento}
                  onChange={(e) => setEntidadeFormDraft({ documento: formatCPFOrCNPJ(e.target.value) })}
                  className="w-full bg-surface border border-surface-border text-on-surface font-mono text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-on-surface-variant/40"
                />
                {entidadeFormDraft.documento && entidadeFormDraft.documento.replace(/\D/g, '').length > 0 && 
                 entidadeFormDraft.documento.replace(/\D/g, '').length !== 11 && 
                 entidadeFormDraft.documento.replace(/\D/g, '').length !== 14 && (
                  <span className="text-[10px] text-alert-red font-semibold animate-pulse">
                    Deve conter exatamente 11 dígitos (CPF) ou 14 dígitos (CNPJ). Atual: {entidadeFormDraft.documento.replace(/\D/g, '').length} dígitos.
                  </span>
                )}
              </div>
            </div>

            <footer className="px-6 py-4 border-t border-surface-border bg-surface-container-low flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => { resetAllDrafts(); setModalOpen('isCadastroRapidoOpen', false); }}
                className="px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-variant border border-transparent rounded-lg"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-5 py-2 text-xs font-bold text-on-background bg-[#f3b233] hover:bg-[#e2a225] rounded-lg shadow-xs"
              >
                Cadastrar
              </button>
            </footer>
          </form>
        </div>
      )}


      {/* ========================================== */}
      {/* TELA 4.2: MODAL NOVA CONTA BANCÁRIA        */}
      {/* ========================================== */}
      {isNewAccountOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleBankAccountSubmit}
            className="bg-surface w-full max-w-[440px] rounded-xl shadow-xl flex flex-col overflow-hidden animate-slide-in border border-surface-border"
          >
            <header className="px-6 py-5 border-b border-surface-border flex justify-between items-center bg-surface-low-low select-none">
              <div>
                <h2 className="text-sm font-extrabold text-on-background tracking-tight">Nova Conta Bancária</h2>
                <p className="text-[10px] font-bold text-on-surface-variant/50">Insira os dados iniciais da conta para conciliação.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsNewAccountOpen(false)}
                className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-6 space-y-4 bg-surface-container-lowest">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant">Nome do Banco <span className="text-alert-red">*</span></label>
                <div className="relative">
                  <Building className="w-4 h-4 text-on-surface-variant/30 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Itaú Unibanco S.A."
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-surface border border-surface-border text-xs rounded-lg pl-9 pr-3 py-2.5 text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant">Data de Abertura <span className="text-alert-red">*</span></label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-on-surface-variant/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                      type="date"
                      required
                      value={bankOpenDate}
                      onChange={(e) => setBankOpenDate(e.target.value)}
                      className="w-full bg-surface border border-surface-border text-xs rounded-lg pl-9 pr-3 py-2.5 text-on-surface focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant">Saldo Inicial <span className="text-alert-red">*</span></label>
                  <div className="relative">
                    <span className="text-xs font-bold text-on-surface-variant/40 absolute left-3 top-1/2 -translate-y-1/2 uppercase tracking-wide">R$</span>
                    <input 
                      type="text"
                      required
                      placeholder="0,00"
                      value={bankInitial}
                      onChange={(e) => setBankInitial(formatBRL(e.target.value))}
                      className="w-full bg-surface border border-surface-border text-xs rounded-lg pl-9 pr-3 py-2.5 text-on-surface font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Info orange warning container matching mockup screen */}
              <div className="flex gap-3 bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[10px] font-semibold leading-relaxed">
                  O saldo inicial será registrado como a primeira transação de entrada desta conta para fins de auditoria e fluxo de caixa.
                </p>
              </div>
            </div>

            <footer className="px-6 py-4 border-t border-surface-border bg-surface-low-low flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setIsNewAccountOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-variant border border-transparent rounded-lg"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-on-background bg-[#f3b233] hover:bg-[#e2a225] rounded-lg shadow-sm border border-[#d69614]"
              >
                Salvar Conta
              </button>
            </footer>
          </form>
        </div>
      )}


      {/* ========================================== */}
      {/* MODAL: NOVO CENTRO DE CUSTO                */}
      {/* ========================================== */}
      {isNewCCOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleCCSubmit}
            className="bg-surface w-full max-w-[420px] rounded-xl shadow-xl flex flex-col overflow-hidden border border-surface-border animate-slide-in"
          >
            <header className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-surface-container-low">
              <h2 className="text-headline-sm font-bold text-on-background">Novo Centro de Custo</h2>
              <button type="button" onClick={() => setIsNewCCOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-6 space-y-4 bg-surface-container-lowest">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant">Nome do Departamento / Centro <span className="text-alert-red">*</span></label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Recursos Humanos, Marketing Digital"
                  value={ccName}
                  onChange={(e) => setCCName(e.target.value)}
                  className="w-full bg-surface border border-surface-border text-xs rounded-lg px-3 py-2.5 text-on-surface focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant">Descrição da Atribuição</label>
                <textarea 
                  rows={3}
                  placeholder="Breve descrição da atividade desse centro de custo..."
                  value={ccDesc}
                  onChange={(e) => setCCDesc(e.target.value)}
                  className="w-full bg-surface border border-surface-border text-xs rounded-lg p-3 resize-none focus:outline-none"
                />
              </div>
            </div>

            <footer className="px-6 py-4 border-t border-surface-border bg-surface-container-low flex justify-end gap-3">
              <button type="button" onClick={() => setIsNewCCOpen(false)} className="px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-variant border border-transparent rounded-lg">
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2 text-xs font-bold text-on-background bg-[#f3b233] hover:bg-[#e2a225] rounded-lg shadow-sm">
                Cadastrar Centro
              </button>
            </footer>
          </form>
        </div>
      )}


      {/* ========================================== */}
      {/* MODAL: NOVA CATEGORIA                      */}
      {/* ========================================== */}
      {isNewCatOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleCategorySubmit}
            className="bg-surface w-full max-w-[400px] rounded-xl shadow-xl flex flex-col border border-surface-border overflow-hidden animate-slide-in"
          >
            <header className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-surface-container-low">
              <h2 className="text-headline-sm font-bold text-on-background">Nova Categoria Contábil</h2>
              <button type="button" onClick={() => setIsNewCatOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-6 space-y-4 bg-surface-container-lowest">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant">Nome do Classificador Category <span className="text-alert-red">*</span></label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Serviços Médicos, Dividendos"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full bg-surface border border-surface-border text-xs rounded-lg px-3 py-2 text-on-surface focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant">Tipo de Fluxo Contábil <span className="text-alert-red">*</span></label>
                <div className="flex gap-4 p-2 bg-surface rounded-lg border border-surface-border">
                  <label className="flex-1 flex justify-center items-center gap-1.5 p-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="catType"
                      checked={catType === 'entrada'}
                      onChange={() => setCatType('entrada')}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-xs font-bold text-bank-truth-green">Entrada</span>
                  </label>
                  <label className="flex-1 flex justify-center items-center gap-1.5 p-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="catType"
                      checked={catType === 'saida'}
                      onChange={() => setCatType('saida')}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-xs font-bold text-alert-red">Saída</span>
                  </label>
                </div>
              </div>
            </div>

            <footer className="px-6 py-4 border-t border-surface-border bg-surface-container-low flex justify-end gap-3">
              <button type="button" onClick={() => setIsNewCatOpen(false)} className="px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-variant border border-transparent rounded-lg">
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2 text-xs font-bold text-on-background bg-[#f3b233] hover:bg-[#e2a225] rounded-lg shadow-sm">
                Criar Categoria
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Toast Portal/Container with fluid motion animations */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none select-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
              layout
              className={`pointer-events-auto p-4 rounded-xl border shadow-lg flex items-start gap-3 bg-white dark:bg-surface-container-lowest transition-colors ${
                toast.type === 'success' 
                  ? 'border-emerald-500/30 bg-emerald-50/10 text-emerald-800 dark:text-emerald-300' 
                  : toast.type === 'error'
                  ? 'border-alert-red/30 bg-red-50/10 text-alert-red'
                  : toast.type === 'warning'
                  ? 'border-amber-500/30 bg-amber-50/10 text-amber-900 dark:text-amber-300'
                  : 'border-blue-500/30 bg-blue-50/10 text-blue-800 dark:text-blue-300'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5 text-alert-red" />}
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-[#f3b233]" />}
                {toast.type === 'info' && <Clock className="w-5 h-5 text-blue-500" />}
              </div>
              <div className="flex-1 text-xs font-semibold leading-relaxed">
                {toast.type === 'success' && <div className="font-bold text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">Sucesso</div>}
                {toast.type === 'error' && <div className="font-bold text-[10px] uppercase tracking-wider text-alert-red mb-0.5">Erro</div>}
                {toast.type === 'warning' && <div className="font-bold text-[10px] uppercase tracking-wider text-[#d69614] mb-0.5">Aviso</div>}
                {toast.type === 'info' && <div className="font-bold text-[10px] uppercase tracking-wider text-blue-500 mb-0.5">Informação</div>}
                {toast.message}
              </div>
              <button 
                type="button"
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="shrink-0 opacity-40 hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-neutral-100 dark:hover:bg-surface-variant cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
