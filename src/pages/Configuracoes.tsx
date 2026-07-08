import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  History, 
  Database, 
  UserCheck, 
  Search, 
  ShieldAlert, 
  User, 
  X,
  FileCode,
  Check,
  UserPlus,
  Filter,
  Download,
  Calendar,
  DollarSign,
  Briefcase,
  FileText,
  Mail,
  Info,
  ChevronLeft,
  ChevronRight,
  Upload,
  Clock,
  Eye,
  Key,
  Webhook,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useUsuarios, useAuditoriaLogs } from '../hooks/useData';
import { useUIStore } from '../store/uiStore';
import { UserPerfil, AuditoriaLog } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';

export default function Configuracoes() {
  const dragScrollTabs = useDragScroll();
  const { data: usuarios = [], inviteUser, updateUser, isInviting } = useUsuarios();
  const { data: auditLogs = [], isLoading: loadingAudit } = useAuditoriaLogs();

  // Zustand stores
  const { 
    activeConfigSubTab, 
    setActiveConfigSubTab, 
    currentUserId, 
    setCurrentUserId,
    isNovoUsuarioOpen,
    isLegacyImportOpen,
    setModalOpen
  } = useUIStore();

  // Active sub-tab can be mapped as:
  // 'equipe' -> Usuários e Permissões
  // 'auditoria' -> Log de Auditoria
  // 'legacy' -> Integrações API / Legacy Data

  // Screen 6 - Search & team filters state
  const [teamSearch, setTeamSearch] = useState('');
  const [teamPage, setTeamPage] = useState(1);

  // Screen 6.1 - Invite user modal form state
  const [newUserNome, setNewUserNome] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPerfil, setNewUserPerfil] = useState<UserPerfil>('colaborador');

  // Toasts state and controller
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Screen 6.2 - Audit log states
  const [auditSearchUser, setAuditSearchUser] = useState('all');
  const [auditSearchAction, setAuditSearchAction] = useState('all');
  const [auditStartDate, setAuditStartDate] = useState('2023-10-01');
  const [auditEndDate, setAuditEndDate] = useState('2023-10-31');
  const [auditPage, setAuditPage] = useState(1);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditoriaLog | null>(null);

  // Screen 6.3 - Legacy drag-n-drop simulated files
  const [dragActive, setDragActive] = useState(false);
  const [selectedCSVFile, setSelectedCSVFile] = useState<File | null>(null);
  const [isImportingProgress, setIsImportingProgress] = useState(false);

  // Google OAuth states
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  // Active simulator user perfil
  const activeUserProfile = usuarios.find(u => u.id === currentUserId);

  // Handle Google Connection
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin is from AI Studio preview or localhost
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsGoogleConnected(true);
        showToast('Conta do Google conectada com sucesso!', 'success');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        alert('Por favor, permita popups para este site para conectar sua conta.');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      showToast('Erro ao iniciar conexão com o Google.', 'error');
    }
  };

  // Filtered team members list based on query
  const filteredUsers = useMemo(() => {
    return usuarios.filter(u => {
      const matchQuery = teamSearch.toLowerCase();
      const nome = (u.nome || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return (
        nome.includes(matchQuery) ||
        email.includes(matchQuery)
      );
    });
  }, [usuarios, teamSearch]);

  const paginatedUsers = useMemo(() => {
    const start = (teamPage - 1) * 4;
    return filteredUsers.slice(start, start + 4);
  }, [filteredUsers, teamPage]);

  // Seeding precise audit logs matching Slide 6.2 + live ones
  const finalAuditLogs = useMemo(() => {
    // We build the exactly 5 logs from Slide 6.2 and merge them
    const historicalLogs = [
      {
        id: 'mock_audit_1',
        tabela_afetada: 'lancamentos_financeiros #8921',
        registro_id: '8921',
        usuario_id: 'user_gerente_1', // Mariana Ribeiro
        usuario_nome: 'Mariana Ribeiro',
        usuario_avatar_letter: 'MR',
        usuario_avatar_color: 'bg-amber-500',
        acao: 'UPDATE' as const,
        acao_label: 'Valor Alterado',
        acao_badge_color: 'bg-amber-100 text-amber-800 border-amber-300',
        acao_dot_color: 'bg-amber-500',
        modulo: 'Conciliação Motor',
        info: 'Alterou o valor previsto de R$ 15.415,00 para R$ 15.430,00',
        data_hora: '2023-10-24 14:32:01',
        dados_anteriores: { valor_previsto: 15415.00 },
        dados_novos: { valor_previsto: 15430.00 }
      },
      {
        id: 'mock_audit_2',
        tabela_afetada: 'extrato_bpi #10294',
        registro_id: '10294',
        usuario_id: 'user_master_1', // Carlos Silva
        usuario_nome: 'Carlos Silva',
        usuario_avatar_letter: 'CS',
        usuario_avatar_color: 'bg-purple-600',
        acao: 'DELETE' as const,
        acao_label: 'Excluiu Registro',
        acao_badge_color: 'bg-red-100 text-red-800 border-red-300',
        acao_dot_color: 'bg-red-500',
        modulo: 'Importação OFX',
        info: 'Deletou a transação bancária duplicada #10294 devido a estorno técnico.',
        data_hora: '2023-10-24 11:15:44',
        dados_anteriores: { valor: -154.30, Descricao: 'Tarifa mensal duplicada' },
        dados_novos: null
      },
      {
        id: 'mock_audit_3',
        tabela_afetada: 'lote_fechamento #299',
        registro_id: '299',
        usuario_id: 'user_system',
        usuario_nome: 'Sistema (Auto)',
        usuario_avatar_letter: 'SY',
        usuario_avatar_color: 'bg-emerald-600',
        acao: 'INSERT' as const,
        acao_label: 'Conciliação Automática',
        acao_badge_color: 'bg-green-100 text-green-800 border-green-300',
        acao_dot_color: 'bg-green-500',
        modulo: 'Processamento Noturno',
        info: 'Conciliação realizada por IA baseando cross-match de ID e Valor.',
        data_hora: '2023-10-24 09:00:12',
        dados_anteriores: null,
        dados_novos: { conciliados: 12, valor_total: 82340.50 }
      },
      {
        id: 'mock_audit_4',
        tabela_afetada: 'sessao_usuario #882',
        registro_id: '882',
        usuario_id: 'user_gerente_1', // Mariana Ribeiro
        usuario_nome: 'Mariana Ribeiro',
        usuario_avatar_letter: 'MR',
        usuario_avatar_color: 'bg-amber-500',
        acao: 'UPDATE' as const,
        acao_label: 'Acesso ao Sistema',
        acao_badge_color: 'bg-teal-100 text-teal-800 border-teal-300',
        acao_dot_color: 'bg-teal-500',
        modulo: 'Autenticação',
        info: 'Usuário realizou login via IP 189.32.44.11',
        data_hora: '2023-10-23 16:45:30',
        dados_anteriores: null,
        dados_novos: { ipv4: '189.32.44.11', user_agent: 'Chrome/OSX' }
      },
      {
        id: 'mock_audit_5',
        tabela_afetada: 'fatura_fornecedor #401',
        registro_id: '401',
        usuario_id: 'user_master_1', // Carlos Silva
        usuario_nome: 'Carlos Silva',
        usuario_avatar_letter: 'CS',
        usuario_avatar_color: 'bg-purple-600',
        acao: 'UPDATE' as const,
        acao_label: 'Alteração de Status',
        acao_badge_color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        acao_dot_color: 'bg-yellow-500',
        modulo: 'Contas a Pagar',
        info: 'Status atualizado de Aberto para Pago Parcial.',
        data_hora: '2023-10-23 14:20:05',
        dados_anteriores: { status: 'aberto' },
        dados_novos: { status: 'pago_parcial' }
      }
    ];

    // Combine with real audit log data if any is created in memory
    const actualLogsMapped = auditLogs.map((log: any) => {
      const user = usuarios.find(u => u.id === log.usuario_id);
      return {
        id: log.id,
        tabela_afetada: log.tabela_afetada,
        registro_id: log.registro_id,
        usuario_id: log.usuario_id,
        usuario_nome: user?.nome || 'Sistema (Auto)',
        usuario_avatar_letter: user ? user.nome.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : 'SY',
        usuario_avatar_color: 'bg-slate-500',
        acao: log.acao,
        acao_label: log.acao === 'INSERT' ? 'Novo Registro' : log.acao === 'UPDATE' ? 'Atualização' : 'Exclusão',
        acao_badge_color: log.acao === 'INSERT' ? 'bg-green-100 text-green-800 border-green-300' : log.acao === 'UPDATE' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-red-100 text-red-800 border-red-300',
        acao_dot_color: log.acao === 'INSERT' ? 'bg-emerald-500' : log.acao === 'UPDATE' ? 'bg-blue-500' : 'bg-red-500',
        modulo: 'Financeiro Principal',
        info: `Registro editado no módulo ${log.tabela_afetada}`,
        data_hora: log.data_hora.substring(0, 19).replace('T', ' '),
        dados_anteriores: log.dados_anteriores,
        dados_novos: log.dados_novos
      };
    });

    const combined = [...actualLogsMapped, ...historicalLogs];

    // Apply filtering based on filters
    return combined.filter(log => {
      // Filter by responsible user
      if (auditSearchUser !== 'all') {
        if (auditSearchUser === 'master' && log.usuario_nome !== 'Carlos Silva') return false;
        if (auditSearchUser === 'gerente' && log.usuario_nome !== 'Mariana Ribeiro') return false;
        if (auditSearchUser === 'system' && log.usuario_nome !== 'Sistema (Auto)') return false;
      }

      // Filter by action done
      if (auditSearchAction !== 'all') {
        if (auditSearchAction === 'UPDATE' && log.acao !== 'UPDATE') return false;
        if (auditSearchAction === 'DELETE' && log.acao !== 'DELETE') return false;
        if (auditSearchAction === 'INSERT' && log.acao !== 'INSERT') return false;
      }

      // Filter by period date (if specified)
      if (auditStartDate && auditEndDate) {
        const logDateStr = log.data_hora.split(' ')[0];
        if (logDateStr < auditStartDate || logDateStr > auditEndDate) return false;
      }

      return true;
    });

  }, [auditLogs, usuarios, auditSearchUser, auditSearchAction, auditStartDate, auditEndDate]);

  const paginatedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * 5;
    return finalAuditLogs.slice(start, start + 5);
  }, [finalAuditLogs, auditPage]);

  // Inviting user flow
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserNome || !newUserEmail) return;

    try {
      await inviteUser({
        nome: newUserNome,
        email: newUserEmail,
        perfil: newUserPerfil,
        status: true
      });

      setNewUserNome('');
      setNewUserEmail('');
      setModalOpen('isNovoUsuarioOpen', false);
      showToast('Membro convocado com sucesso para Gestão 360!', 'success');
    } catch (err: any) {
      showToast('Erro ao convidar: ' + err.message, 'error');
    }
  };

  // Switch status (Ativo / Inativo Toggles matching Slide 6 style)
  const handleToggleUserActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateUser({ id, data: { status: !currentStatus } });
      alert(`Status do usuário alterado para ${!currentStatus ? 'ATIVO' : 'INATIVO'} com sucesso!`);
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    }
  };

  // Change security role instantly
  const handleRoleChange = async (id: string, newRole: UserPerfil) => {
    try {
      await updateUser({ id, data: { perfil: newRole } });
      alert(`Cargo atualizado com sucesso para ${newRole.toUpperCase()}!`);
    } catch (err: any) {
      alert('Erro ao alterar permissão: ' + err.message);
    }
  };

  // Legacy CSV importer flow matching Slide 6.3 style
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        setSelectedCSVFile(file);
      } else {
        alert('Por favor, envie exclusivamente arquivos no formato .csv!');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.csv')) {
        setSelectedCSVFile(file);
      } else {
        alert('Por favor, envie exclusivamente arquivos no formato .csv!');
      }
    }
  };

  const executeLegacyCSVImport = () => {
    if (!selectedCSVFile) {
      alert('Por favor, selecione ou arraste um CSV antes de iniciar!');
      return;
    }

    setIsImportingProgress(true);

    // Simulated parsing delay (500ms network emulation)
    setTimeout(() => {
      try {
        const currentStorage = localStorage.getItem('gestao360_lancamentos');
        const list = currentStorage ? JSON.parse(currentStorage) : [];
        
        // Generate pre-populated 3 entries matching legacy standards
        const legacyItems = [
          {
            id: 'legacy_1_' + Math.floor(Math.random() * 1000),
            tipo: 'entrada' as const,
            valor_previsto: 25000.00,
            data_emissao: '2021-04-10',
            data_vencimento: '2021-04-15',
            status_pagamento: 'pago' as const,
            status_aprovacao: 'confirmado_master' as const,
            entidade_id: 'ent_produtores_reunidos', // entity from seed
            centro_custo_id: 'cc_vendas',
            categoria_id: 'cat_vendas',
            conta_bancaria_id: 'conta_itau',
            observacoes: `Dados legados migrados de ${selectedCSVFile.name}`,
            status_sincronizacao: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'legacy_2_' + Math.floor(Math.random() * 1000),
            tipo: 'saida' as const,
            valor_previsto: 1450.00,
            data_emissao: '2021-05-18',
            data_vencimento: '2021-05-20',
            status_pagamento: 'pago' as const,
            status_aprovacao: 'confirmado_master' as const,
            entidade_id: 'ent_distribuidora_sp',
            centro_custo_id: 'cc_infra',
            categoria_id: 'cat_servicos',
            conta_bancaria_id: 'conta_bradesco',
            observacoes: 'Importação ERP Legado (Histórico)',
            status_sincronizacao: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];

        localStorage.setItem('gestao360_lancamentos', JSON.stringify([...list, ...legacyItems]));
        
        setIsImportingProgress(false);
        setModalOpen('isLegacyImportOpen', false);
        setSelectedCSVFile(null);
        alert('Carga concluída com sucesso! 2 lançamentos antigos importados e marcados automaticamente como confirmados e conciliados.');
        window.location.reload();
      } catch (err: any) {
        setIsImportingProgress(false);
        alert('Erro ao processar estrutura do CSV: ' + err.message);
      }
    }, 6000); // 600ms network simulation
  };

  return (
    <div className="space-y-6 text-on-surface select-none font-sans" id="configuracoes-root">
      
      {/* SIMULADOR DE HIERARQUIA BOX (RLS Controller) */}
      <div className="bg-[#fcfbf9] border border-amber-200/50 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#8a6c11] tracking-wider block">Simulador de Nível de Acesso (Segurança RLS)</span>
          <p className="text-xs text-on-surface-variant font-medium">
            Alterne o usuário ativo para testar níveis de permissão (Master vê tudo, Colaborador possui limitações):
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="font-bold text-xs text-neutral-800">
              Usuário Simulado Activo: {activeUserProfile?.nome || 'Anônimo'} ({activeUserProfile?.perfil.toUpperCase()})
            </span>
          </div>
        </div>

        <select 
          value={currentUserId} 
          onChange={(e) => {
            setCurrentUserId(e.target.value);
            setTeamPage(1);
          }}
          className="bg-white text-neutral-800 text-xs font-bold rounded border border-neutral-300 px-3 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {usuarios.map(u => (
            <option key={u.id} value={u.id}>{u.nome} ({u.perfil})</option>
          ))}
        </select>
      </div>

      {/* TOP NAVIGATION SUB-TABS (MAPPED EXACTLY FROM SCREEN 6 / 6.2) */}
      <div ref={dragScrollTabs.ref} {...dragScrollTabs.props} className="flex border-b border-surface-border overflow-x-auto scrollbar-none whitespace-nowrap scroll-smooth pb-0.5 select-none" style={{ cursor: 'grab', userSelect: 'none' }}>
        <button 
          type="button"
          onClick={() => setActiveConfigSubTab('equipe')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            activeConfigSubTab === 'equipe' 
              ? 'border-[#8b6d11] text-[#8b6d11]' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuários e Permissões
        </button>

        <button 
          type="button"
          onClick={() => setActiveConfigSubTab('auditoria')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            activeConfigSubTab === 'auditoria' 
              ? 'border-[#8b6d11] text-[#8b6d11]' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Clock className="w-4 h-4 text-secondary" />
          Log de Auditoria
        </button>

        <button 
          type="button"
          onClick={() => setActiveConfigSubTab('legacy')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            activeConfigSubTab === 'legacy' 
              ? 'border-[#8b6d11] text-[#8b6d11]' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Key className="w-4 h-4" />
          Integrações API
        </button>
      </div>

      {/* SUB-TAB 1: USUÁRIOS E PERMISSÕES (TELA 6) */}
      {activeConfigSubTab === 'equipe' && (
        <div className="space-y-6" id="usuarios-permissoes-section">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-on-background">Gestão de Equipe</h1>
              <p className="text-xs text-on-surface-variant leading-relaxed font-semibold">
                Gerencie os acessos e permissões dos colaboradores da sua organização. O controle de privilégios é vital para a integridade da verdade bancária.
              </p>
            </div>
            
            {/* Direct match to Convidar Novo Usuário button color and shape */}
            <button 
              type="button"
              onClick={() => setModalOpen('isNovoUsuarioOpen', true)}
              className="px-4 py-2.5 bg-[#8b6d11] hover:bg-[#725a0e] text-white text-xs font-extrabold rounded-lg shadow-sm inline-flex items-center gap-2 cursor-pointer border border-[#725a0e] shrink-0 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Convidar Novo Usuário
            </button>
          </div>

          {/* Search, filters, grid panel */}
          <div className="bg-surface-container-lowest border border-surface-border rounded-2xl shadow-xs overflow-hidden">
            {/* Inline controls */}
            <div className="p-4 border-b border-surface-border flex flex-col md:flex-row gap-3 items-center justify-between bg-surface bg-surface-container-lowest">
              <div className="relative w-full md:max-w-md">
                <Search className="w-4 h-4 absolute left-3 w-5 text-on-surface-variant/70 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={teamSearch}
                  onChange={(e) => {
                    setTeamSearch(e.target.value);
                    setTeamPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-surface border border-surface-border rounded-lg text-xs font-semibold text-on-surface focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button 
                  type="button"
                  onClick={() => alert('Filtros adicionais de perfil ativados.')}
                  className="px-3 py-2 bg-white text-on-surface hover:bg-neutral-50 border border-surface-border text-xs font-bold rounded-lg flex items-center gap-2"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filtros
                </button>
                <button 
                  type="button"
                  onClick={() => alert('Exportando lista de usuários em formato CSV...')}
                  className="px-3 py-2 bg-white text-on-surface hover:bg-neutral-50 border border-surface-border text-xs font-bold rounded-lg flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar
                </button>
              </div>
            </div>

            {/* Table layout matching original image screen 6 */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-[#8a94a2] border-b border-surface-border text-[10px] font-black uppercase tracking-wider">
                    <th className="py-3 px-6">Usuário</th>
                    <th className="py-3 px-6">Email</th>
                    <th className="py-3 px-6">Nível de Acesso</th>
                    <th className="py-3 px-6 text-center">Status</th>
                    <th className="py-3 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-surface-border text-on-surface">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-on-surface-variant font-semibold">Nenhum usuário coincide com sua consulta.</td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => {
                      // Get custom initials
                      const nameParts = u.nome.split(' ');
                      const initials = nameParts.map(p => p[0]).join('').substring(0, 2).toUpperCase();

                      // Render beautiful visual profiles matching Screenshot 6 exactly
                      return (
                        <tr key={u.id} className="hover:bg-neutral-50/50 transition-colors">
                          {/* Col 1 User */}
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              {/* Circle Container */}
                              <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center text-white shrink-0 shadow-xs border border-white/25 uppercase ${
                                u.perfil === 'master' ? 'bg-neutral-900 border-neutral-950' : 
                                u.perfil === 'gerente' ? 'bg-[#f3b233] border-amber-600' : 'bg-slate-400'
                              }`}>
                                {initials}
                              </div>
                              <span className="font-bold text-[#1b2531] text-xs">{u.nome}</span>
                            </div>
                          </td>

                          {/* Col 2 Email */}
                          <td className="py-3.5 px-6 font-semibold text-on-surface-variant font-sans select-all">
                            {u.email}
                          </td>

                          {/* Col 3 Role Badges conforming exactly to Slide 6 */}
                          <td className="py-3.5 px-6">
                            {u.perfil === 'master' && (
                              <span className="rounded bg-[#1a1c1e] text-white text-[10px] uppercase font-black px-3 py-1 select-none">
                                Master
                              </span>
                            )}
                            {u.perfil === 'gerente' && (
                              <span className="rounded bg-[#f3b233] text-white text-[10px] uppercase font-black px-3 py-1 select-none border border-amber-500 shadow-2xs">
                                Gerente
                              </span>
                            )}
                            {u.perfil === 'colaborador' && (
                              <span className="rounded bg-neutral-200 text-neutral-800 text-[10px] uppercase font-black px-3 py-1 select-none">
                                Colaborador
                              </span>
                            )}
                          </td>

                          {/* Col 4 Status active indicator toggle switch matching screen 6 */}
                          <td className="py-3.5 px-6 text-center select-none">
                            <div className="inline-flex items-center gap-2">
                              {/* Visual toggle switch */}
                              <button 
                                type="button"
                                disabled={u.id === currentUserId}
                                onClick={() => handleToggleUserActive(u.id, u.status)}
                                className={`w-10 h-5 flex items-center rounded-full px-0.5 transition-colors duration-300 relative focus:outline-none ${
                                  u.status 
                                    ? 'bg-emerald-600 cursor-pointer' 
                                    : 'bg-neutral-300 cursor-pointer disabled:cursor-not-allowed'
                                }`}
                              >
                                <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                                  u.status ? 'translate-x-5' : 'translate-x-0'
                                }`} />
                              </button>
                              
                              <span className="text-[11px] font-bold text-[#4a5568]">
                                {u.status ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                          </td>

                          {/* Col 5 Quick controls */}
                          <td className="py-3.5 px-6 text-right select-none">
                            <div className="flex justify-end gap-2">
                              {activeUserProfile?.perfil === 'master' ? (
                                <select 
                                  value={u.perfil}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                                  className="bg-white border border-neutral-300 rounded text-[11px] font-bold px-2 py-1 focus:outline-none text-[#1b2531] cursor-pointer"
                                >
                                  <option value="colaborador">Promover Analista</option>
                                  <option value="gerente">Elevar para Gestor</option>
                                  <option value="master">Definir como Master</option>
                                </select>
                              ) : (
                                <span className="text-[10px] text-on-surface-variant font-semibold uppercase italic tracking-wider">Controle Bloqueado</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination block */}
            <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between text-xs bg-neutral-50/50">
              <span className="text-on-surface-variant font-bold">
                Mostrando 1 a {Math.min(filteredUsers.length, 4)} de {filteredUsers.length} usuários
              </span>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setTeamPage(p => Math.max(1, p - 1))}
                  disabled={teamPage === 1}
                  className="p-1 px-2.5 rounded border border-surface-border hover:bg-neutral-100 font-bold bg-white text-on-surface disabled:opacity-50 disabled:cursor-not-allowed text-[11px]"
                >
                  Anterior
                </button>
                <span className="px-2.5 py-1 text-[11px] font-extrabold bg-[#121212] text-white rounded shadow-sm">
                  {teamPage}
                </span>
                <button 
                  onClick={() => setTeamPage(p => p + 1)}
                  disabled={teamPage * 4 >= filteredUsers.length}
                  className="p-1 px-2.5 rounded border border-surface-border hover:bg-neutral-100 font-bold bg-white text-on-surface disabled:opacity-50 disabled:cursor-not-allowed text-[11px]"
                >
                  Próximo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: LOGS DE AUDITORIA (TELA 6.2) */}
      {activeConfigSubTab === 'auditoria' && (
        <div className="space-y-6" id="logs-auditoria-section">
          {/* Section Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-on-background">Histórico Imutável de Auditoria</h1>
            <p className="text-xs text-on-surface-variant font-semibold">
              Rastreamento sistêmico obrigatório para conformidade de diretoria fiscal, garantindo a transparência das consolidações.
            </p>
          </div>

          {/* Table filters box (Slide 6.2 style matching screenshot) */}
          <div className="bg-surface-container-lowest border border-surface-border p-6 rounded-2xl shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Field 1 Date picker */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#8a94a2] uppercase tracking-wider">Período de Auditoria</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="date"
                    value={auditStartDate}
                    onChange={(e) => setAuditStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-surface border border-surface-border text-on-surface text-xs font-semibold rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Field 2 Responsáveis */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#8a94a2] uppercase tracking-wider font-sans">Usuário Responsável</label>
                <select 
                  value={auditSearchUser}
                  onChange={(e) => { setAuditSearchUser(e.target.value); setAuditPage(1); }}
                  className="bg-surface border border-surface-border text-on-surface text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
                >
                  <option value="all">Todos os usuários</option>
                  <option value="master">Carlos Silva (Master)</option>
                  <option value="gerente">Mariana Ribeiro (Gerente)</option>
                  <option value="system">Sistema (Auto)</option>
                </select>
              </div>

              {/* Field 3 Ação Realizada */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#8a94a2] uppercase tracking-wider">Ação Realizada</label>
                <select 
                  value={auditSearchAction}
                  onChange={(e) => { setAuditSearchAction(e.target.value); setAuditPage(1); }}
                  className="bg-surface border border-surface-border text-on-surface text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
                >
                  <option value="all">Todas as ações</option>
                  <option value="UPDATE">Valor Alterado (UPDATE)</option>
                  <option value="DELETE">Excluiu Registro (DELETE)</option>
                  <option value="INSERT">Nova Ingestão (INSERT)</option>
                </select>
              </div>

              {/* Clean Filters links */}
              <div className="flex items-end gap-3 justify-end h-full md:pb-1">
                <button 
                  type="button" 
                  onClick={() => {
                    setAuditSearchUser('all');
                    setAuditSearchAction('all');
                    setAuditStartDate('2023-10-01');
                    setAuditEndDate('2023-10-31');
                  }}
                  className="text-xs font-bold text-neutral-500 hover:text-black hover:underline px-3 py-2"
                >
                  Limpar
                </button>
                <button 
                  type="button"
                  onClick={() => alert('Filtros de logs de auditoria recalculados com sucesso.')}
                  className="bg-[#121212] hover:bg-neutral-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filtrar
                </button>
              </div>
            </div>
          </div>

          {/* Audit table logs matches exactly style 6.2 */}
          <div className="bg-surface-container-lowest border border-surface-border rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-[#8a94a2] border-b border-surface-border text-[10px] font-black uppercase tracking-wider">
                    <th className="py-3.5 px-6">Data / Hora</th>
                    <th className="py-3.5 px-6">Usuário Responsável</th>
                    <th className="py-3.5 px-6">Ação</th>
                    <th className="py-3.5 px-6">Registro Afetado</th>
                    <th className="py-3.5 px-6">Módulo</th>
                    <th className="py-3.5 px-6 text-right">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-surface-border">
                  {paginatedAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-on-surface-variant font-semibold">Sem registros encontrados para o período estabelecido.</td>
                    </tr>
                  ) : (
                    paginatedAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-50/50 transition-colors">
                        {/* Data / Hora */}
                        <td className="py-4 px-6 font-semibold font-mono text-[#4a5568] whitespace-nowrap">
                          {log.data_hora}
                        </td>

                        {/* Usuário */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${log.usuario_avatar_color}`}>
                              {log.usuario_avatar_letter}
                            </div>
                            <span className="font-bold text-[#1b2531]">{log.usuario_nome}</span>
                          </div>
                        </td>

                        {/* Ação badge with dot indicator */}
                        <td className="py-4 px-6">
                          <div className="inline-flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${log.acao_dot_color}`} />
                            <span className="font-extrabold text-[#111827]">{log.acao_label}</span>
                          </div>
                        </td>

                        {/* Registro Afetado */}
                        <td className="py-4 px-6 font-mono font-semibold text-neutral-600 text-[11px] whitespace-nowrap">
                          {log.tabela_afetada}
                        </td>

                        {/* Módulo */}
                        <td className="py-4 px-6 font-semibold text-[#1a1c1e] whitespace-nowrap">
                          {log.modulo}
                        </td>

                        {/* Detalhes action */}
                        <td className="py-4 px-6 text-right select-none">
                          <button 
                            type="button"
                            onClick={() => setSelectedAuditLog(log as any)}
                            className="p-1 px-3 bg-neutral-100 hover:bg-[#121212] hover:text-white rounded border border-neutral-300 transition-all font-bold text-[10px]"
                          >
                            VER ALTERAÇÕES
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination log footer conforming to mockup 6.2 */}
            <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between text-xs bg-neutral-50/50">
              <span className="text-on-surface-variant font-bold">
                Exibindo {(auditPage-1)*5 + 1} a {Math.min(finalAuditLogs.length, auditPage*5)} de {finalAuditLogs.length} registros de auditoria
              </span>

              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                  disabled={auditPage === 1}
                  className="p-1 px-2 bg-white border border-neutral-300 rounded text-[11px] text-[#4a5568] hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                  &lt;
                </button>
                <span className="px-3 py-1 font-bold bg-[#121212] text-white rounded text-[11px]">
                  {auditPage}
                </span>
                <button 
                  onClick={() => setAuditPage(p => p + 1)}
                  disabled={auditPage * 5 >= finalAuditLogs.length}
                  className="p-1 px-2 bg-white border border-neutral-300 rounded text-[11px] text-[#4a5568] hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: INTEGRAÇÕES API & LEGACY IMPORTER */}
      {activeConfigSubTab === 'legacy' && (
        <div className="space-y-6" id="api-legacy-section">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest border border-surface-border p-5 rounded-2xl">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-on-background">Parâmetros de Integração de ERP e Bancos</h2>
              <p className="text-xs text-on-surface-variant">Configure os endpoints ou sincronize as contas históricas do seu sistema legado.</p>
            </div>
            
            <button 
              type="button"
              onClick={() => setModalOpen('isLegacyImportOpen', true)}
              className="px-4 py-2.5 bg-[#8b6d11] hover:bg-[#725a0e] text-white text-xs font-bold rounded-lg flex items-center gap-2 border border-[#725a0e] transition-colors cursor-pointer shrink-0"
            >
              <Upload className="w-4 h-4" />
              Sincronizar Legado (.CSV)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Google Workspace Integration */}
            <div className="bg-surface-container-lowest border border-surface-border p-6 rounded-2xl relative">
              <svg className="w-8 h-8 mb-3" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <h3 className="text-sm font-bold text-on-background mb-1">Google Workspace</h3>
              <p className="text-xs text-on-surface-variant/80 mb-4 leading-relaxed">
                Integre Google Chat e Google Calendar para notificações e gestão de compromissos na plataforma.
              </p>
              
              {isGoogleConnected ? (
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-2 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" /> Conta Conectada
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  className="w-full bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-bold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  Conectar com Google
                </button>
              )}
            </div>

            {/* API Webhooks configuration boxes */}
            <div className="bg-surface-container-lowest border border-surface-border p-6 rounded-2xl relative">
              <Webhook className="w-8 h-8 text-[#8b6d11] mb-3" />
              <h3 className="text-sm font-bold text-on-background mb-1">Webhooks de Conciliação em Tempo Real (Live API)</h3>
              <p className="text-xs text-on-surface-variant/80 mb-4 leading-relaxed">
                Utilize nossa arquitetura baseada em eventos para disparar notificações automáticas quando conciliações ou alterações BPI ocorrerem.
              </p>
              
              <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-lg font-mono text-[11px] select-all truncate text-neutral-800">
                https://api.gestao360.com/v1/webhooks/reconciliation?token=auth_...
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-surface-border p-6 rounded-2xl">
              <Activity className="w-8 h-8 text-[#8b6d11] mb-3" />
              <h3 className="text-sm font-bold text-on-background mb-1">Sincronizador Bancário Open Finance</h3>
              <p className="text-xs text-on-surface-variant/80 mb-4 leading-relaxed">
                Nossos conectores nativos realizam conexão automática via API com o Banco Itaú, Bradesco e NuBank para capturar arquivos de extrato sem planilhas manuais.
              </p>

              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase select-all">
                ● Ativo via Certificado A1
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TELA 6.1: MODAL NOVO USUÁRIO (CONVITE)     */}
      {/* ========================================== */}
      {isNovoUsuarioOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="modal-novo-usuario">
          <form 
            onSubmit={handleInviteSubmit}
            className="bg-white w-full max-w-[480px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200 animate-slide-in text-neutral-800"
          >
            {/* Header matches title + icon in screenshot */}
            <header className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-[#8b6d11] flex items-center justify-center border border-amber-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#1b2531] uppercase tracking-wider">Novo Usuário (Convite)</h2>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setModalOpen('isNovoUsuarioOpen', false)}
                className="text-neutral-400 hover:text-neutral-700 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Form body */}
            <div className="p-6 space-y-5 bg-white">
              {/* Field 1 Nome */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Nome Completo</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={newUserNome}
                  onChange={(e) => setNewUserNome(e.target.value)}
                  className="w-full bg-neutral-50 focus:bg-white text-xs font-semibold rounded-lg px-3.5 py-3 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#8b6d11]/20 transition-all text-neutral-900 placeholder:text-neutral-400"
                />
              </div>

              {/* Field 2 Email with mail icon */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">E-mail Corporativo</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="email"
                    required
                    placeholder="nome@empresa.com.br"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full bg-neutral-50 focus:bg-white pl-9 pr-3.5 py-3 text-xs font-semibold rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#8b6d11]/20 transition-all text-neutral-900 placeholder:text-neutral-400"
                  />
                </div>
              </div>

              {/* Field 3 Nível select */}
              <div className="flex flex-col gap-1.5 font-sans">
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Nível de Acesso</label>
                <select 
                  value={newUserPerfil}
                  onChange={(e) => setNewUserPerfil(e.target.value as any)}
                  className="w-full bg-neutral-50 px-3.5 py-3 text-xs font-bold rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#8b6d11]/20 text-neutral-900 cursor-pointer"
                >
                  <option value="colaborador">Colaborador</option>
                  <option value="gerente">Gerente</option>
                  <option value="master">Master</option>
                </select>
                
                {/* Visual matching helper text in screenshot */}
                <p className="text-[11px] font-medium text-neutral-500 leading-relaxed pt-1 flex items-start gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0 text-[#8b6d11] mt-0.5" />
                  <span>O nível Master possui acesso total a conciliações e configurações do sistema.</span>
                </p>
              </div>
            </div>

            {/* Footer buttons matches slide 6.1 */}
            <footer className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 flex justify-end items-center gap-3 select-none">
              <button 
                type="button" 
                onClick={() => setModalOpen('isNovoUsuarioOpen', false)}
                className="px-5 py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isInviting}
                className="px-6 py-2.5 bg-[#8b6d11] hover:bg-[#725a0e] text-white text-xs font-extrabold rounded-lg flex items-center gap-2 border border-[#725a0e] shadow-md transition-all cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                {isInviting ? 'Enviando...' : 'Enviar Convite'}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* =================================================== */}
      {/* TELA 6.3 - MODAL IMPORTAÇÃO DE SISTEMA LEGADO (.CSV) */}
      {/* =================================================== */}
      {isLegacyImportOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="modal-importacao-legado">
          <div className="bg-white w-full max-w-[550px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200 animate-slide-in text-neutral-800">
            {/* Header */}
            <header className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <h2 className="text-sm font-black text-[#1b2531] uppercase tracking-wider">Importar Dados Legados</h2>
              <button 
                type="button" 
                onClick={() => {
                  if (!isImportingProgress) {
                    setModalOpen('isLegacyImportOpen', false);
                    setSelectedCSVFile(null);
                  }
                }}
                className="text-neutral-400 hover:text-neutral-700 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Core Body */}
            <div className="p-6 space-y-6">
              {/* Drag Area matches exactly the mockup look */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                  dragActive 
                    ? 'border-[#8b6d11] bg-amber-50/20' 
                    : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100/50'
                }`}
              >
                <input 
                  type="file"
                  id="legacy-file-input"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <label htmlFor="legacy-file-input" className="cursor-pointer flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-neutral-200/60 text-neutral-500 flex items-center justify-center shadow-xs">
                    <Upload className="w-6 h-6 text-neutral-500" />
                  </div>
                  
                  {selectedCSVFile ? (
                    <div>
                      <p className="text-xs font-black text-[#8b6d11]">{selectedCSVFile.name}</p>
                      <p className="text-[10px] text-neutral-400 font-mono">{(selectedCSVFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-neutral-800 leading-normal">
                        Arraste e solte o arquivo .csv aqui
                      </p>
                      <p className="text-[11px] text-neutral-400 leading-normal mt-0.5">
                        ou clique para procurar no seu computador
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {/* Colunas obrigatórias com visual similar ao slide */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Colunas Obrigatórias no CSV</span>
                <div className="flex flex-wrap gap-2.5">
                  <div className="bg-neutral-100 text-neutral-700 px-3.5 py-2 rounded-lg text-xs font-bold border border-neutral-200 inline-flex items-center gap-1.5 select-all">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    Data
                  </div>
                  <div className="bg-neutral-100 text-neutral-700 px-3.5 py-2 rounded-lg text-xs font-bold border border-neutral-200 inline-flex items-center gap-1.5 select-all">
                    <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                    Valor
                  </div>
                  <div className="bg-neutral-100 text-neutral-700 px-3.5 py-2 rounded-lg text-xs font-bold border border-neutral-200 inline-flex items-center gap-1.5 select-all">
                    <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                    Entidade
                  </div>
                  <div className="bg-neutral-100 text-neutral-700 px-3.5 py-2 rounded-lg text-xs font-bold border border-neutral-200 inline-flex items-center gap-1.5 select-all">
                    <FileText className="w-3.5 h-3.5 text-neutral-400" />
                    Descrição
                  </div>
                </div>
              </div>

              {/* Alert note style box exactly matching mockup */}
              <div className="p-4 bg-neutral-100 rounded-xl border border-neutral-200 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-neutral-600 leading-relaxed">
                  Lançamentos importados serão marcados como aprovados e conciliados automaticamente.
                </span>
              </div>
            </div>

            {/* Footer matching exactly color and shape */}
            <footer className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 flex justify-end items-center gap-3 select-none">
              <button 
                type="button" 
                disabled={isImportingProgress}
                onClick={() => {
                  setModalOpen('isLegacyImportOpen', false);
                  setSelectedCSVFile(null);
                }}
                className="px-5 py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              
              <button 
                type="button"
                onClick={executeLegacyCSVImport}
                disabled={isImportingProgress || !selectedCSVFile}
                className="px-6 py-2.5 bg-[#f3b233] hover:bg-[#e2a225] text-on-background font-extrabold text-xs rounded-lg flex items-center gap-2 border border-[#d69614] shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {isImportingProgress ? 'Processando Ingestão...' : 'Iniciar Importação'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* POPUP MODAL: DETALHES DE REGISTRO DE AUDITORIA */}
      {selectedAuditLog && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="log-details-modal">
          <div className="bg-white w-full max-w-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200 text-neutral-800 animate-slide-in">
            <header className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
              <div className="flex items-center gap-2 text-neutral-800 font-bold">
                <ShieldAlert className="w-5 h-5 text-[#8b6d11]" />
                <h3 className="text-xs font-black uppercase tracking-wider">Inspetor de Metadados de Auditoria</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedAuditLog(null)}
                className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Registro Alvo</span>
                <p className="font-mono text-xs font-bold text-[#1b2531]">{selectedAuditLog.tabela_afetada}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Ação Realizada</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold select-all ${selectedAuditLog.acao_badge_color}`}>
                  {selectedAuditLog.acao_label}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Modificações Identificadas (Detalhamento)</span>
                
                {selectedAuditLog.dados_anteriores || selectedAuditLog.dados_novos ? (
                  <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 space-y-3 font-mono text-[11px] text-neutral-700 leading-relaxed max-h-56 overflow-y-auto select-text">
                    {selectedAuditLog.dados_anteriores && (
                      <div>
                        <span className="text-red-600 font-bold block uppercase text-[8px] tracking-wider mb-0.5">--- VALOR ANTIGO ---</span>
                        <pre className="whitespace-pre-wrap">{JSON.stringify(selectedAuditLog.dados_anteriores, null, 2)}</pre>
                      </div>
                    )}
                    {selectedAuditLog.dados_novos && (
                      <div className="border-t border-dashed border-neutral-300 pt-2.5 mt-2.5">
                        <span className="text-emerald-600 font-bold block uppercase text-[8px] tracking-wider mb-0.5">--- VALOR NOVO ---</span>
                        <pre className="whitespace-pre-wrap">{JSON.stringify(selectedAuditLog.dados_novos, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 font-semibold italic">Este log não envolveu alterações adicionais estruturais.</p>
                )}
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/65 flex items-start gap-2 text-neutral-700">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-[11px] font-semibold leading-relaxed">
                  Esses dados foram assinados digitalmente através de hash SHA256 na data {selectedAuditLog.data_hora} pelo operador ({selectedAuditLog.usuario_nome}).
                </span>
              </div>
            </div>

            <footer className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex justify-end select-none">
              <button 
                type="button" 
                onClick={() => setSelectedAuditLog(null)}
                className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold text-xs rounded-lg transition-colors h-9 shrink-0 flex items-center justify-center shadow-xs cursor-pointer"
              >
                Fechar Painel
              </button>
            </footer>
          </div>
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
