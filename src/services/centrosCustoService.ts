import { db, getData, KEYS } from './db';
import { CentroCusto } from '../types';

export const centrosCustoService = {
  getAll: async (): Promise<CentroCusto[]> => {
    return db.centrosCusto.getAll();
  },

  getById: async (id: string): Promise<CentroCusto | undefined> => {
    const list = await db.centrosCusto.getAll();
    return list.find(item => item.id === id);
  },

  create: async (item: Omit<CentroCusto, 'id'>): Promise<CentroCusto> => {
    const list = getData<CentroCusto>(KEYS.CENTROS_CUSTO);
    const newItem: CentroCusto = {
      ...item,
      id: 'cc_' + Math.random().toString(36).substr(2, 9),
    };
    list.push(newItem);
    await db.centrosCusto.save(list);
    return newItem;
  },

  update: async (id: string, item: Partial<Omit<CentroCusto, 'id'>>): Promise<CentroCusto> => {
    const list = getData<CentroCusto>(KEYS.CENTROS_CUSTO);
    const index = list.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Centro de custo não encontrado');
    const updated = { ...list[index], ...item };
    list[index] = updated;
    await db.centrosCusto.save(list);
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    const list = getData<CentroCusto>(KEYS.CENTROS_CUSTO);
    const filtered = list.filter(r => r.id !== id);
    if (filtered.length === list.length) return false;
    await db.centrosCusto.save(filtered);
    return true;
  }
};
