import { supabase } from '@/integrations/supabase/client';
import { LancamentoFinanceiro } from '../types';

export interface LancamentoFilters {
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  approvalStatus?: string;
  type?: string;
}

export const lancamentosService = {
  getAll: async (filters?: LancamentoFilters): Promise<LancamentoFinanceiro[]> => {
    let query = supabase
      .from('lancamentos_financeiros')
      .select('*, entidades_negocio!inner(nome_razao_social)')
      .order('created_at', { ascending: false });

    if (filters) {
      if (filters.startDate) {
        query = query.gte('data_vencimento', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('data_vencimento', filters.endDate);
      }
      if (filters.approvalStatus && filters.approvalStatus !== 'all') {
        query = query.eq('status_aprovacao', filters.approvalStatus);
      }
      if (filters.type && filters.type !== 'all') {
        query = query.eq('tipo', filters.type);
      }
      if (filters.searchTerm) {
        query = query.ilike('entidades_negocio.nome_razao_social', `%${filters.searchTerm}%`);
      }
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data as any[];
  },

  create: async (item: any, recorrencia?: any): Promise<LancamentoFinanceiro> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

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
