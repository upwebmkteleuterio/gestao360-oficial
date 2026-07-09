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
      .order('data_vencimento', { ascending: false })
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
        query = query.or(`entidades_negocio.nome_razao_social.ilike.%${filters.searchTerm}%,entidades_negocio.documento.ilike.%${filters.searchTerm}%,observacoes.ilike.%${filters.searchTerm}%`);
      }
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data as any[];
  },

  create: async (item: any, recorrencia?: any): Promise<LancamentoFinanceiro> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    if (recorrencia) {
      // 1. Create Recurrence Record
      const { data: recData, error: recError } = await supabase
        .from('recorrencias')
        .insert([{
          user_id: user.id,
          periodicidade: recorrencia.periodicidade,
          quantidade_total_parcelas: recorrencia.quantidade_total_parcelas,
          data_inicio: item.data_vencimento
        }])
        .select()
        .single();

      if (recError) throw recError;

      // 2. Generate Installments
      const installments = [];
      let currentDate = new Date(item.data_vencimento + 'T00:00:00');

      for (let i = 1; i <= recorrencia.quantidade_total_parcelas; i++) {
        installments.push({
          ...item,
          user_id: user.id,
          usuario_criador_id: user.id,
          recorrencia_id: recData.id,
          numero_parcela: i,
          data_vencimento: currentDate.toISOString().split('T')[0]
        });

        // Advance date based on periodicity
        if (recorrencia.periodicidade === 'diario') currentDate.setDate(currentDate.getDate() + 1);
        else if (recorrencia.periodicidade === 'semanal') currentDate.setDate(currentDate.getDate() + 7);
        else if (recorrencia.periodicidade === 'mensal') currentDate.setMonth(currentDate.getMonth() + 1);
        else if (recorrencia.periodicidade === 'anual') currentDate.setFullYear(currentDate.getFullYear() + 1);
      }

      const { data: createdItems, error: itemsError } = await supabase
        .from('lancamentos_financeiros')
        .insert(installments)
        .select();

      if (itemsError) throw itemsError;
      return createdItems[0] as LancamentoFinanceiro;
    }

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
    if (mode === 'all') {
      const { data: current } = await supabase
        .from('lancamentos_financeiros')
        .select('recorrencia_id, data_vencimento')
        .eq('id', id)
        .single();

      if (current?.recorrencia_id) {
        // Update this and all future installments of the same recurrence
        const { error } = await supabase
          .from('lancamentos_financeiros')
          .update(data)
          .eq('recorrencia_id', current.recorrencia_id)
          .gte('data_vencimento', current.data_vencimento);
        
        if (error) throw error;
        return { id } as any;
      }
    }

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
    if (mode === 'all') {
      const { data: current } = await supabase
        .from('lancamentos_financeiros')
        .select('recorrencia_id, data_vencimento')
        .eq('id', id)
        .single();

      if (current?.recorrencia_id) {
        const { error } = await supabase
          .from('lancamentos_financeiros')
          .delete()
          .eq('recorrencia_id', current.recorrencia_id)
          .gte('data_vencimento', current.data_vencimento);
        
        if (error) throw error;
        return true;
      }
    }

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
