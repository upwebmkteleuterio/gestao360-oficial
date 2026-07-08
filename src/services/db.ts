import { mockUsers } from '../mocks/users';
import { mockEntidades } from '../mocks/entidades';
import { mockCentrosCusto } from '../mocks/centrosCusto';
import { mockCategorias } from '../mocks/categorias';
import { mockContas } from '../mocks/contas';
import { mockLancamentos } from '../mocks/lancamentos';
import { mockTransacoes } from '../mocks/transacoes';
import { 
  UserProfile, 
  EntidadeNegocio, 
  CentroCusto, 
  CategoriaFinanceira, 
  ContaBancaria, 
  LancamentoFinanceiro, 
  TransacaoBanco, 
  Conciliacao, 
  DiferencaFinanceira, 
  Recorrencia, 
  AuditoriaLog 
} from '../types';

const KEYS = {
  USERS: 'gestao360_users',
  ENTIDADES: 'gestao360_entidades',
  CENTROS_CUSTO: 'gestao360_centros_custo',
  CATEGORIAS: 'gestao360_categorias',
  CONTAS: 'gestao360_contas',
  LANCAMENTOS: 'gestao360_lancamentos',
  TRANSACOES: 'gestao360_transacoes',
  CONCILIACOES: 'gestao360_conciliacoes',
  DIFERENCAS: 'gestao360_diferencas',
  RECORRENCIAS: 'gestao360_recorrencias',
  AUDITORIA_LOGS: 'gestao360_auditoria_logs',
  INITIALIZED: 'gestao360_initialized'
};

export function initializeDatabase() {
  const isInitialized = localStorage.getItem(KEYS.INITIALIZED);
  
  if (!isInitialized) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(mockUsers));
    localStorage.setItem(KEYS.ENTIDADES, JSON.stringify(mockEntidades));
    localStorage.setItem(KEYS.CENTROS_CUSTO, JSON.stringify(mockCentrosCusto));
    localStorage.setItem(KEYS.CATEGORIAS, JSON.stringify(mockCategorias));
    localStorage.setItem(KEYS.CONTAS, JSON.stringify(mockContas));
    localStorage.setItem(KEYS.LANCAMENTOS, JSON.stringify(mockLancamentos));
    localStorage.setItem(KEYS.TRANSACOES, JSON.stringify(mockTransacoes));
    
    // Create pre-existing matches in mock db: Gamma and Beta
    const initialConciliacoes: Conciliacao[] = [
      {
        id: 'con_1',
        lancamento_id: 'lanc_3',
        transacao_banco_id: 'tx_banco_1',
        usuario_conciliador_id: 'user_gerente_1',
        data_conciliacao: '2023-10-20T17:00:00Z'
      },
      {
        id: 'con_2',
        lancamento_id: 'lanc_2',
        transacao_banco_id: 'tx_banco_2',
        usuario_conciliador_id: 'user_colab_1',
        data_conciliacao: '2023-10-18T16:30:00Z'
      }
    ];

    const initialRecorrencias: Recorrencia[] = [
      {
        id: 'rec_erp_software',
        periodicidade: 'mensal',
        quantidade_total_parcelas: 12,
        data_inicio: '2023-08-20'
      }
    ];

    const initialAuditoriaLogs: AuditoriaLog[] = [
      {
        id: 'audit_1',
        tabela_afetada: 'lancamentos_financeiros',
        registro_id: 'lanc_3',
        usuario_id: 'user_gerente_1',
        acao: 'UPDATE',
        dados_anteriores: { status_aprovacao: 'digital' },
        dados_novos: { status_aprovacao: 'confirmado_master' },
        data_hora: '2023-10-20T17:00:00Z'
      },
      {
        id: 'audit_2',
        tabela_afetada: 'conciliacoes',
        registro_id: 'con_1',
        usuario_id: 'user_gerente_1',
        acao: 'INSERT',
        dados_novos: { id: 'con_1', lancamento_id: 'lanc_3', transacao_banco_id: 'tx_banco_1' },
        data_hora: '2023-10-20T17:00:00Z'
      }
    ];

    localStorage.setItem(KEYS.CONCILIACOES, JSON.stringify(initialConciliacoes));
    localStorage.setItem(KEYS.DIFERENCAS, JSON.stringify([]));
    localStorage.setItem(KEYS.RECORRENCIAS, JSON.stringify(initialRecorrencias));
    localStorage.setItem(KEYS.AUDITORIA_LOGS, JSON.stringify(initialAuditoriaLogs));
    
    localStorage.setItem(KEYS.INITIALIZED, 'true');
  }
}

// Simulates network latency with a promise
export function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

// Generic storage getters/setters
export function getData<T>(key: string): T[] {
  initializeDatabase();
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

export function setData<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Entity API access for DB
export const db = {
  users: {
    getAll: () => delay(getData<UserProfile>(KEYS.USERS)),
    save: (items: UserProfile[]) => {
      setData(KEYS.USERS, items);
      return delay(items);
    }
  },
  entidades: {
    getAll: () => delay(getData<EntidadeNegocio>(KEYS.ENTIDADES)),
    save: (items: EntidadeNegocio[]) => {
      setData(KEYS.ENTIDADES, items);
      return delay(items);
    }
  },
  centrosCusto: {
    getAll: () => delay(getData<CentroCusto>(KEYS.CENTROS_CUSTO)),
    save: (items: CentroCusto[]) => {
      setData(KEYS.CENTROS_CUSTO, items);
      return delay(items);
    }
  },
  categorias: {
    getAll: () => delay(getData<CategoriaFinanceira>(KEYS.CATEGORIAS)),
    save: (items: CategoriaFinanceira[]) => {
      setData(KEYS.CATEGORIAS, items);
      return delay(items);
    }
  },
  contas: {
    getAll: () => delay(getData<ContaBancaria>(KEYS.CONTAS)),
    save: (items: ContaBancaria[]) => {
      setData(KEYS.CONTAS, items);
      return delay(items);
    }
  },
  lancamentos: {
    getAll: () => delay(getData<LancamentoFinanceiro>(KEYS.LANCAMENTOS)),
    save: (items: LancamentoFinanceiro[]) => {
      setData(KEYS.LANCAMENTOS, items);
      return delay(items);
    }
  },
  transacoes: {
    getAll: () => delay(getData<TransacaoBanco>(KEYS.TRANSACOES)),
    save: (items: TransacaoBanco[]) => {
      setData(KEYS.TRANSACOES, items);
      return delay(items);
    }
  },
  conciliacoes: {
    getAll: () => delay(getData<Conciliacao>(KEYS.CONCILIACOES)),
    save: (items: Conciliacao[]) => {
      setData(KEYS.CONCILIACOES, items);
      return delay(items);
    }
  },
  diferencas: {
    getAll: () => delay(getData<DiferencaFinanceira>(KEYS.DIFERENCAS)),
    save: (items: DiferencaFinanceira[]) => {
      setData(KEYS.DIFERENCAS, items);
      return delay(items);
    }
  },
  recorrencias: {
    getAll: () => delay(getData<Recorrencia>(KEYS.RECORRENCIAS)),
    save: (items: Recorrencia[]) => {
      setData(KEYS.RECORRENCIAS, items);
      return delay(items);
    }
  },
  auditoriaLogs: {
    getAll: () => delay(getData<AuditoriaLog>(KEYS.AUDITORIA_LOGS)),
    save: (items: AuditoriaLog[]) => {
      setData(KEYS.AUDITORIA_LOGS, items);
      return delay(items);
    }
  }
};
export { KEYS };
