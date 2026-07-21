import { supabase } from '@/integrations/supabase/client';
import { Conciliacao, TransacaoBanco, DiferencaFinanceira, TipoDiferenca } from '../types';

export const conciliacoesService = {
  getConciliacoes: async (): Promise<Conciliacao[]> => {
    const { data, error } = await supabase
      .from('conciliacoes')
      .select('*');
    if (error) throw error;
    return data as Conciliacao[];
  },

  getDiferencas: async (): Promise<DiferencaFinanceira[]> => {
    const { data, error } = await supabase
      .from('diferencas_financeiras')
      .select('*');
    if (error) throw error;
    return data as DiferencaFinanceira[];
  },

  getAllTransacoes: async (): Promise<TransacaoBanco[]> => {
    const { data, error } = await supabase
      .from('transacoes_banco')
      .select('*')
      .order('data_transacao', { ascending: false });
    if (error) throw error;
    return data as TransacaoBanco[];
  },

  importCSV: async (
    contaBancariaId: string, 
    rows: any[], 
    importMode: 'entrada' | 'saida' | 'ambos' = 'ambos'
  ): Promise<boolean> => {
    const normalizeDate = (dateStr: string) => {
      if (!dateStr) return new Date().toISOString().split('T')[0];
      
      // 1. Remove horários (pega apenas a primeira parte antes do espaço)
      const cleanDate = dateStr.trim().split(' ')[0];
      
      // 2. Tenta converter DD/MM/YYYY para YYYY-MM-DD
      if (cleanDate.includes('/')) {
        const [day, month, year] = cleanDate.split('/');
        if (day && month && year) {
          // Garante que o ano tenha 4 dígitos e mes/dia tenham 2
          const y = year.length === 2 ? `20${year}` : year;
          return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
      
      // 3. Se já estiver no formato ISO ou similar, apenas retorna
      return cleanDate;
    };

    const transacoes = rows.map(row => {
      const dataIso = normalizeDate(row.data);
      let valor = row.valor || 0;
      
      // Ajuste de sinal baseado no modo de importação
      if (importMode === 'saida') {
        valor = -Math.abs(valor);
      } else if (importMode === 'entrada') {
        valor = Math.abs(valor);
      }
      
      const descricao = row.descricao || 'Sem descrição';
      const doc = row.documento || '';

      return {
        conta_bancaria_id: contaBancariaId,
        data_transacao: dataIso,
        valor: valor,
        descricao_banco: descricao,
        numero_documento: doc,
        tipo_movimento: valor < 0 ? 'saida' : 'entrada',
        hash_transacao: `${contaBancariaId}-${dataIso}-${valor}-${descricao}-${doc}`,
        status_conciliacao: false
      };
    });

    const { error } = await supabase
      .from('transacoes_banco')
      .upsert(transacoes, { onConflict: 'hash_transacao' });
    
    if (error) throw error;
    return true;
  },

  linkConciliacao: async (lancamentoId: string, transacaoBancoId: string, usuarioId: string, isMaster: boolean = true): Promise<Conciliacao> => {
    const { data, error } = await supabase
      .from('conciliacoes')
      .insert([{
        lancamento_id: lancamentoId,
        transacao_banco_id: transacaoBancoId,
        usuario_conciliador_id: usuarioId,
        data_conciliacao: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;

    const finalStatus = isMaster ? 'pago' : 'quitação_pendente';
    await supabase.from('lancamentos_financeiros').update({ status_pagamento: finalStatus }).eq('id', lancamentoId);
    await supabase.from('transacoes_banco').update({ status_conciliacao: true }).eq('id', transacaoBancoId);

    return data as Conciliacao;
  },

  unlinkConciliacao: async (conciliacaoId: string, usuarioId: string): Promise<boolean> => {
    const { data: conciliacao } = await supabase
      .from('conciliacoes')
      .select('*')
      .eq('id', conciliacaoId)
      .single();

    if (conciliacao) {
      await supabase.from('lancamentos_financeiros').update({ status_pagamento: 'aberto' }).eq('id', conciliacao.lancamento_id);
      await supabase.from('transacoes_banco').update({ status_conciliacao: false }).eq('id', conciliacao.transacao_banco_id);
      await supabase.from('conciliacoes').delete().eq('id', conciliacaoId);
    }

    return true;
  },

  classifyDifference: async (conciliacaoId: string, tipoDiferenca: TipoDiferenca, valorDiferenca: number, observacaoJustificativa: string): Promise<DiferencaFinanceira> => {
    const { data, error } = await supabase
      .from('diferencas_financeiras')
      .insert([{
        conciliacao_id: conciliacaoId,
        tipo_diferenca: tipoDiferenca,
        valor_diferenca: valorDiferenca,
        observacao_justificativa: observacaoJustificativa
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data as DiferencaFinanceira;
  }
};