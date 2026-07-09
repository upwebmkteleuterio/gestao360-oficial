import { supabase } from '@/integrations/supabase/client';
import { AuditoriaLog } from '../types';

export const auditoriaService = {
  getAll: async (): Promise<AuditoriaLog[]> => {
    const { data, error } = await supabase
      .from('auditoria_logs')
      .select('*')
      .order('data_hora', { ascending: false });
    
    if (error) throw error;
    return data as AuditoriaLog[];
  }
};
