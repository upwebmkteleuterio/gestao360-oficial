import { db, getData, KEYS, setData } from './db';
import { EntidadeNegocio } from '../types';

export const entidadesService = {
  getAll: async (): Promise<EntidadeNegocio[]> => {
    return db.entidades.getAll();
  },

  getById: async (id: string): Promise<EntidadeNegocio | undefined> => {
    const list = await db.entidades.getAll();
    return list.find(item => item.id === id);
  },

  create: async (item: Omit<EntidadeNegocio, 'id' | 'created_at'>): Promise<EntidadeNegocio> => {
    const list = getData<EntidadeNegocio>(KEYS.ENTIDADES);
    const newItem: EntidadeNegocio = {
      ...item,
      id: 'ent_' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };
    list.push(newItem);
    await db.entidades.save(list);
    return newItem;
  },

  update: async (id: string, item: Partial<Omit<EntidadeNegocio, 'id' | 'created_at'>>): Promise<EntidadeNegocio> => {
    const list = getData<EntidadeNegocio>(KEYS.ENTIDADES);
    const index = list.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Entidade não encontrada');
    const updated = { ...list[index], ...item };
    list[index] = updated;
    await db.entidades.save(list);
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    const list = getData<EntidadeNegocio>(KEYS.ENTIDADES);
    const filtered = list.filter(r => r.id !== id);
    if (filtered.length === list.length) return false;
    await db.entidades.save(filtered);
    return true;
  }
};
