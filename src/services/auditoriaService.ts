import { db } from './db';
import { AuditoriaLog } from '../types';

export const auditoriaService = {
  getAll: async (): Promise<AuditoriaLog[]> => {
    return db.auditoriaLogs.getAll();
  }
};
