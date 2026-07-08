import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LancamentoFinanceiro } from '../types';

export type TabType = 'dashboard' | 'lancamentos' | 'conciliacao' | 'cadastros' | 'relatorios' | 'configuracoes';

interface UIState {
  // Theme and routing
  theme: 'light' | 'dark';
  activeTab: TabType;
  activeConfigSubTab: 'equipe' | 'auditoria' | 'legacy';
  currentUserId: string; // Enables easy testing of RLS (Master vs Gerente vs Colaborador)
  
  // Modals / Panels toggles
  isNovoLancamentoOpen: boolean;
  isCadastroRapidoOpen: boolean;
  isInterceptorRecorrenciaOpen: boolean;
  isImportarCSVOpen: boolean;
  isClassificarDiferencaOpen: boolean;
  isVincularConciliarOpen: boolean;
  isTransferenciaBancariaOpen: boolean;
  isNovoUsuarioOpen: boolean;
  isLegacyImportOpen: boolean;

  // Selected item contexts for modals
  selectedLancamentoIdForModal: string | null;
  selectedRecorrenciaAction: 'single' | 'all' | null;
  selectedTransacaoForConciliationId: string | null;
  selectedLancamentoForConciliationId: string | null;
  currentConciliationDifferenceValue: number;
  currentConciliationId: string | null;

  // Temp Draft states so users don't lose typed progress
  lancamentoFormDraft: {
    tipo: 'entrada' | 'saida';
    valor_previsto: string;
    data_emissao: string;
    data_vencimento: string;
    entidade_id: string;
    centro_custo_id: string;
    categoria_id: string;
    conta_bancaria_id: string;
    recorrencia: boolean;
    periodicidade: 'diario' | 'semanal' | 'mensal' | 'anual';
    quantidade_total_parcelas: string;
    observacoes: string;
  };
  
  entidadeFormDraft: {
    tipo: 'cliente' | 'fornecedor' | 'ambos' | '';
    nome_razao_social: string;
    documento: string;
  };

  // Scroll locations to preserve context
  scrollPositions: Record<string, number>;

  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  setActiveTab: (tab: TabType) => void;
  setActiveConfigSubTab: (sub: 'equipe' | 'auditoria' | 'legacy') => void;
  setCurrentUserId: (id: string) => void;
  
  setModalOpen: (modal: keyof Omit<UIState, 'theme' | 'activeTab' | 'activeConfigSubTab' | 'currentUserId' | 'scrollPositions' | 'selectedLancamentoIdForModal' | 'selectedRecorrenciaAction' | 'selectedTransacaoForConciliationId' | 'selectedLancamentoForConciliationId' | 'currentConciliationDifferenceValue' | 'currentConciliationId' | 'lancamentoFormDraft' | 'entidadeFormDraft' | 'setTheme' | 'setActiveTab' | 'setActiveConfigSubTab' | 'setCurrentUserId' | 'setModalOpen' | 'setSelectedLancamentoIdForModal' | 'setSelectedRecorrenciaAction' | 'setSelectedTransacaoForConciliaId' | 'setSelectedLancamentoForConciliaId' | 'setCurrentConciliationId' | 'setLancamentoFormDraft' | 'setEntidadeFormDraft' | 'setScrollPosition'>, value: boolean) => void;
  
  setSelectedLancamentoIdForModal: (id: string | null) => void;
  setSelectedRecorrenciaAction: (action: 'single' | 'all' | null) => void;
  
  setSelectedTransacaoForConciliationId: (id: string | null) => void;
  setSelectedLancamentoForConciliationId: (id: string | null) => void;
  setCurrentConciliationDifferenceValue: (val: number) => void;
  setCurrentConciliationId: (id: string | null) => void;

  setLancamentoFormDraft: (draft: Partial<UIState['lancamentoFormDraft']>) => void;
  setEntidadeFormDraft: (draft: Partial<UIState['entidadeFormDraft']>) => void;
  setScrollPosition: (key: string, position: number) => void;
  resetAllDrafts: () => void;
}

const initialDrafts = {
  lancamentoFormDraft: {
    tipo: 'entrada' as const,
    valor_previsto: '',
    data_emissao: new Date().toISOString().split('T')[0],
    data_vencimento: new Date().toISOString().split('T')[0],
    entidade_id: '',
    centro_custo_id: '',
    categoria_id: '',
    conta_bancaria_id: '',
    recorrencia: false,
    periodicidade: 'mensal' as const,
    quantidade_total_parcelas: '12',
    observacoes: '',
  },
  entidadeFormDraft: {
    tipo: '' as const,
    nome_razao_social: '',
    documento: '',
  }
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      activeTab: 'dashboard',
      activeConfigSubTab: 'equipe',
      currentUserId: 'user_master_1', // Lucas da Vitória (Default)

      isNovoLancamentoOpen: false,
      isCadastroRapidoOpen: false,
      isInterceptorRecorrenciaOpen: false,
      isImportarCSVOpen: false,
      isClassificarDiferencaOpen: false,
      isVincularConciliarOpen: false,
      isTransferenciaBancariaOpen: false,
      isNovoUsuarioOpen: false,
      isLegacyImportOpen: false,

      selectedLancamentoIdForModal: null,
      selectedRecorrenciaAction: null,
      selectedTransacaoForConciliationId: null,
      selectedLancamentoForConciliationId: null,
      currentConciliationDifferenceValue: 0,
      currentConciliationId: null,

      lancamentoFormDraft: initialDrafts.lancamentoFormDraft,
      entidadeFormDraft: initialDrafts.entidadeFormDraft,
      scrollPositions: {},

      setTheme: (theme) => set({ theme }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setActiveConfigSubTab: (activeConfigSubTab) => set({ activeConfigSubTab }),
      setCurrentUserId: (currentUserId) => set({ currentUserId }),

      setModalOpen: (modal, value) => set({ [modal]: value }),
      
      setSelectedLancamentoIdForModal: (id) => set({ selectedLancamentoIdForModal: id }),
      setSelectedRecorrenciaAction: (action) => set({ selectedRecorrenciaAction: action }),
      
      setSelectedTransacaoForConciliationId: (id) => set({ selectedTransacaoForConciliationId: id }),
      setSelectedLancamentoForConciliationId: (id) => set({ selectedLancamentoForConciliationId: id }),
      setCurrentConciliationDifferenceValue: (currentConciliationDifferenceValue) => set({ currentConciliationDifferenceValue }),
      setCurrentConciliationId: (currentConciliationId) => set({ currentConciliationId }),

      setLancamentoFormDraft: (draft) => set((state) => ({ 
        lancamentoFormDraft: { ...state.lancamentoFormDraft, ...draft } 
      })),
      
      setEntidadeFormDraft: (draft) => set((state) => ({ 
        entidadeFormDraft: { ...state.entidadeFormDraft, ...draft } 
      })),
      
      setScrollPosition: (key, position) => set((state) => ({
        scrollPositions: { ...state.scrollPositions, [key]: position }
      })),

      resetAllDrafts: () => set({
        lancamentoFormDraft: {
          tipo: 'entrada',
          valor_previsto: '',
          data_emissao: new Date().toISOString().split('T')[0],
          data_vencimento: new Date().toISOString().split('T')[0],
          entidade_id: '',
          centro_custo_id: '',
          categoria_id: '',
          conta_bancaria_id: '',
          recorrencia: false,
          periodicidade: 'mensal',
          quantidade_total_parcelas: '12',
          observacoes: '',
        },
        entidadeFormDraft: {
          tipo: '',
          nome_razao_social: '',
          documento: '',
        }
      })
    }),
    {
      name: 'gestao360_ui_state',
    }
  )
);
export { initialDrafts };
