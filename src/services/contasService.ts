import { db, getData, KEYS } from './db';
import { ContaBancaria } from '../types';

export const contasService = {
  getAll: async (): Promise<ContaBancaria[]> => {
    return db.contas.getAll();
  },

  getById: async (id: string): Promise<ContaBancaria | undefined> => {
    const list = await db.contas.getAll();
    return list.find(item => item.id === id);
  },

  create: async (item: Omit<ContaBancaria, 'id'>): Promise<ContaBancaria> => {
    const list = getData<ContaBancaria>(KEYS.CONTAS);
    const newItem: ContaBancaria = {
      ...item,
      id: 'conta_' + Math.random().toString(36).substr(2, 9),
    };
    list.push(newItem);
    await db.contas.save(list);
    return newItem;
  },

  update: async (id: string, item: Partial<Omit<ContaBancaria, 'id'>>): Promise<ContaBancaria> => {
    const list = getData<ContaBancaria>(KEYS.CONTAS);
    const index = list.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Conta não encontrada');
    const updated = { ...list[index], ...item };
    list[index] = updated;
    await db.contas.save(list);
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    const list = getData<ContaBancaria>(KEYS.CONTAS);
    const filtered = list.filter(r => r.id !== id);
    if (filtered.length === list.length) return false;
    await db.contas.save(filtered);
    return true;
  }
};
