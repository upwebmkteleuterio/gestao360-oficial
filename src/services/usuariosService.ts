import { db, getData, KEYS } from './db';
import { UserProfile, UserPerfil } from '../types';

export const usuariosService = {
  getAll: async (): Promise<UserProfile[]> => {
    return db.users.getAll();
  },

  getById: async (id: string): Promise<UserProfile | undefined> => {
    const list = await db.users.getAll();
    return list.find(item => item.id === id);
  },

  create: async (item: Omit<UserProfile, 'id' | 'created_at'>): Promise<UserProfile> => {
    const list = getData<UserProfile>(KEYS.USERS);
    const newUser: UserProfile = {
      ...item,
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };
    list.push(newUser);
    await db.users.save(list);
    return newUser;
  },

  update: async (id: string, item: Partial<Omit<UserProfile, 'id' | 'created_at'>>): Promise<UserProfile> => {
    const list = getData<UserProfile>(KEYS.USERS);
    const index = list.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Usuário não encontrado');
    const updated = { ...list[index], ...item };
    list[index] = updated;
    await db.users.save(list);
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    const list = getData<UserProfile>(KEYS.USERS);
    const filtered = list.filter(r => r.id !== id);
    if (filtered.length === list.length) return false;
    await db.users.save(filtered);
    return true;
  }
};
