import { supabase } from '@/integrations/supabase/client';
import { LancamentoFinanceiro } from '../types';

export const lancamentosService = {
  getAll: async (): Promise<LancamentoFinanceiro[]> => {
    const { data, error } = await supabase
      .from('lancamentos_financeiros')
      .select('*')
      .order('data_vencimento', { ascending: false });
    
    if (error) throw error;
    return data as LancamentoFinanceiro[];
  },

  create: async (item: any, recorrencia?: any): Promise<LancamentoFinanceiro> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Se houver recorrência, poderíamos tratar aqui, mas vamos focar no lançamento simples primeiro
    const { data, error } = await supabase
      .from('lancamentos_financeiros')
      .insert([{ 
        ...item, 
        user_id: user.id,
        usuario_criador_id: user.id 
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data as LancamentoFinanceiro;
  },

  update: async (id: string, data: any, mode: 'single' | 'all' = 'single'): Promise<LancamentoFinanceiro> => {
    const { data: updatedData, error } = await supabase
      .from('lancamentos_financeiros')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return updatedData as LancamentoFinanceiro;
  },

  delete: async (id: string, mode: 'single' | 'all' = 'single'): Promise<boolean> => {
    const { error } = await supabase
      .from('lancamentos_financeiros')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  approveInBatch: async (ids: string[], targetStatus: string): Promise<boolean> => {
    const { error } = await supabase
      .from('lancamentos_financeiros')
      .update({ status_aprovacao: targetStatus })
      .in('id', ids);
    
    if (error) throw error;
    return true;
  }
};
