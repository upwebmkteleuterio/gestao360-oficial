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

  importCSV: async (contaBancariaId: string, rows: any[]): Promise<boolean> => {
    const transacoes = rows.map(row => ({
      conta_bancaria_id: contaBancariaId,
      data_transacao: row.data,
      valor: row.valor,
      descricao_banco: row.descricao,
      tipo_movimento: row.valor < 0 ? 'debito' : 'credito',
      hash_transacao: `${contaBancariaId}-${row.data}-${row.valor}-${row.descricao}`,
      status_conciliacao: false
    }));

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

    // Update statuses - depends on whether it's a master or not
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
