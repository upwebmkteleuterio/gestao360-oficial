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
          periodicidade_customizada_dias: recorrencia.periodicidade_customizada_dias,
          quantidade_total_parcelas: recorrencia.quantidade_total_parcelas,
          data_inicio: recorrencia.parcelas?.[0]?.data_vencimento || item.data_vencimento
        }])
        .select()
        .single();

      if (recError) throw recError;

      // 2. Generate Installments
      const installments = [];
      
      if (recorrencia.parcelas && recorrencia.parcelas.length > 0) {
        // Use custom parcels provided
        for (let i = 0; i < recorrencia.parcelas.length; i++) {
          const p = recorrencia.parcelas[i];
          installments.push({
            ...item,
            user_id: user.id,
            usuario_criador_id: user.id,
            recorrencia_id: recData.id,
            numero_parcela: i + 1,
            data_vencimento: p.data_vencimento,
            valor_previsto: p.valor_previsto,
            quantidade_total_parcelas: recorrencia.quantidade_total_parcelas // helpful for UI
          });
        }
      } else {
        // Fallback to automatic generation if no custom parcels provided
        let currentDate = new Date(item.data_vencimento + 'T00:00:00');
        for (let i = 1; i <= recorrencia.quantidade_total_parcelas; i++) {
          installments.push({
            ...item,
            user_id: user.id,
            usuario_criador_id: user.id,
            recorrencia_id: recData.id,
            numero_parcela: i,
            data_vencimento: currentDate.toISOString().split('T')[0],
            quantidade_total_parcelas: recorrencia.quantidade_total_parcelas
          });

          // Advance date
          if (recorrencia.periodicidade === 'diario') currentDate.setDate(currentDate.getDate() + 1);
          else if (recorrencia.periodicidade === 'semanal') currentDate.setDate(currentDate.getDate() + 7);
          else if (recorrencia.periodicidade === 'quinzenal') currentDate.setDate(currentDate.getDate() + 15);
          else if (recorrencia.periodicidade === 'mensal') currentDate.setMonth(currentDate.getMonth() + 1);
          else if (recorrencia.periodicidade === 'bimestral') currentDate.setMonth(currentDate.getMonth() + 2);
          else if (recorrencia.periodicidade === 'trimestral') currentDate.setMonth(currentDate.getMonth() + 3);
          else if (recorrencia.periodicidade === 'semestral') currentDate.setMonth(currentDate.getMonth() + 6);
          else if (recorrencia.periodicidade === 'anual') currentDate.setFullYear(currentDate.getFullYear() + 1);
          else if (recorrencia.periodicidade === 'personalizado') {
            const dias = recorrencia.periodicidade_customizada_dias || 30;
            currentDate.setDate(currentDate.getDate() + dias);
          }
        }
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

  baixaLancamento: async (id: string, data: {
    valor_pago: number,
    data_pagamento: string,
    conta_bancaria_id: string,
    tipo_baixa?: 'financeira' | 'bpi' | 'avr',
    valor_desconto?: number,
    valor_acrescimo?: number,
    motivo_ajuste?: string
  }): Promise<LancamentoFinanceiro> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // 1. Get current record
    const { data: current, error: getError } = await supabase
      .from('lancamentos_financeiros')
      .select('*')
      .eq('id', id)
      .single();
    
    if (getError) throw getError;

    const subtotal = current.valor_previsto - (data.valor_desconto || 0) + (data.valor_acrescimo || 0);
    const isPartial = data.valor_pago < subtotal;
    const isBPI = data.tipo_baixa === 'bpi';
    const isAVR = data.tipo_baixa === 'avr';

    if (isPartial) {
      const saldoRestante = subtotal - data.valor_pago;

      // Keep original record ID as "aberto" (unpaid) but with the remaining amount (the resíduo)
      const { data: updatedOriginal, error: updateError } = await supabase
        .from('lancamentos_financeiros')
        .update({
          valor_previsto: saldoRestante,
          observacoes: (current.observacoes || '') + `\n[Abatido pagamento parcial de R$ ${data.valor_pago} em ${data.data_pagamento.split('-').reverse().join('/')}]`
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Create a NEW record for the paid portion
      const { id: _, created_at: __, updated_at: ___, ...rest } = current;
      const { error: insertError } = await supabase
        .from('lancamentos_financeiros')
        .insert([{
          ...rest,
          valor_previsto: data.valor_pago,
          valor_recebido: data.valor_pago,
          status_pagamento: isBPI ? 'bpi' : 'pago',
          data_pagamento: data.data_pagamento,
          conta_bancaria_id: data.conta_bancaria_id,
          tipo_baixa: data.tipo_baixa || 'financeira',
          desconto_valor: data.valor_desconto || 0,
          acrescimo_valor: data.valor_acrescimo || 0,
          motivo_ajuste: data.motivo_ajuste || null,
          vinculo_residuo_id: id,
          observacoes: (current.observacoes || '') + `\n[Pagamento parcial quitado. Referente à cobrança original de R$ ${current.valor_previsto}]`
        }]);

      if (insertError) throw insertError;
      return updatedOriginal as LancamentoFinanceiro;
    } else {
      // Full payment (or BPI / AVR)
      const { data: updated, error: updateError } = await supabase
        .from('lancamentos_financeiros')
        .update({
          valor_recebido: isBPI ? 0 : data.valor_pago,
          status_pagamento: isBPI ? 'bpi' : 'pago',
          data_pagamento: data.data_pagamento,
          conta_bancaria_id: data.conta_bancaria_id,
          tipo_baixa: data.tipo_baixa || 'financeira',
          desconto_valor: data.valor_desconto || 0,
          acrescimo_valor: data.valor_acrescimo || 0,
          motivo_ajuste: data.motivo_ajuste || null,
          // If AVR, adjust the final value
          valor_previsto: isAVR ? data.valor_pago : (isBPI ? current.valor_previsto : subtotal)
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updated as LancamentoFinanceiro;
    }
  },

    getAnexos: async (lancamentoId: string): Promise<any[]> => {
      const { data, error } = await supabase
        .from('lancamento_anexos')
        .select('*')
        .eq('lancamento_id', lancamentoId);
      
      if (error) throw error;
      return data;
    },
  
    deleteAnexo: async (anexoId: string, filePath: string): Promise<void> => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);
      
      if (storageError) console.error('Storage delete error:', storageError);
  
      // Delete from DB
      const { error: dbError } = await supabase
        .from('lancamento_anexos')
        .delete()
        .eq('id', anexoId);
      
      if (dbError) throw dbError;
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
