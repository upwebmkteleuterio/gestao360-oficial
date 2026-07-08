import { ContaBancaria } from '../types';

export const mockContas: ContaBancaria[] = [
  {
    id: 'conta_itau',
    nome_banco: 'Itaú CC 1234',
    data_abertura: '2025-01-01T09:00:00Z',
    saldo_inicial: 50000.00,
  },
  {
    id: 'conta_bradesco',
    nome_banco: 'Bradesco CC 5678',
    data_abertura: '2025-03-15T10:00:00Z',
    saldo_inicial: 25000.00,
  },
  {
    id: 'conta_santander',
    nome_banco: 'Santander CC 9012',
    data_abertura: '2025-06-01T14:00:00Z',
    saldo_inicial: 10000.00,
  }
];
