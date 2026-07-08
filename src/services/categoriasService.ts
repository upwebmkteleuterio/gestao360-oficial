import { db, getData, KEYS } from './db';
import { CategoriaFinanceira } from '../types';

export const categoriasService = {
  getAll: async (): Promise<CategoriaFinanceira[]> => {
    return db.categorias.getAll();
  },

  getById: async (id: string): Promise<CategoriaFinanceira | undefined> => {
    const list = await db.categorias.getAll();
    return list.find(item => item.id === id);
  },

  create: async (item: Omit<CategoriaFinanceira, 'id'>): Promise<CategoriaFinanceira> => {
    const list = getData<CategoriaFinanceira>(KEYS.CATEGORIAS);
    const newItem: CategoriaFinanceira = {
      ...item,
      id: 'cat_' + Math.random().toString(36).substr(2, 9),
    };
    list.push(newItem);
    await db.categorias.save(list);
    return newItem;
  },

  update: async (id: string, item: Partial<Omit<CategoriaFinanceira, 'id'>>): Promise<CategoriaFinanceira> => {
    const list = getData<CategoriaFinanceira>(KEYS.CATEGORIAS);
    const index = list.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Categoria não encontrada');
    const updated = { ...list[index], ...item };
    list[index] = updated;
    await db.categorias.save(list);
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    const list = getData<CategoriaFinanceira>(KEYS.CATEGORIAS);
    const filtered = list.filter(r => r.id !== id);
    if (filtered.length === list.length) return false;
    await db.categorias.save(filtered);
    return true;
  }
};
