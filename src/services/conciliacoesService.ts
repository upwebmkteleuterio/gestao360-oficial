import { supabase } from '@/integrations/supabase/client';
import { Conciliacao, TransacaoBanco, DiferencaFinanceira, TipoDiferenca } from '../types';

export const conciliacoesService = {
  // Função para Teste de Diagnóstico
  runDiagnostic: async () => {
    const logs: string[] = [];
    logs.push("Iniciando check-up de saúde da base de dados...");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada ou usuário deslogado.");
      logs.push("✅ Autenticação: OK");

      const { error: readError } = await supabase.from('transacoes_banco').select('id').limit(1);
      if (readError) throw readError;
      logs.push("✅ Permissão de Leitura (RLS): OK");

      // Teste de Escrita Temporário
      const testId = '00000000-0000-0000-0000-000000000000';
      const { error: writeError } = await supabase.from('transacoes_banco').upsert({
        id: testId,
        conta_bancaria_id: session.user.id, // Apenas para teste de tipo, falhará se FK for rígida, mas pegamos o erro
        data_transacao: '2026-01-01',
        valor: 0,
        descricao_banco: 'TESTE_DIAGNOSTICO',
        tipo_movimento: 'debito',
        hash_transacao: 'diagnostic_test_' + Date.now()
      });
      
      if (writeError && writeError.code !== '23503') { // Ignora erro de FK, foca em erro de estrutura/500
        throw writeError;
      }
      logs.push("✅ Estrutura de Tabela: OK (Campos e Tipos validados)");
      
      return { success: true, logs };
    } catch (err: any) {
      logs.push(`❌ FALHA: ${err.message}`);
      if (err.details) logs.push(`🔍 DETALHES: ${err.details}`);
      if (err.hint) logs.push(`💡 DICA: ${err.hint}`);
      return { success: false, logs };
    }
  },

  getConciliacoes: async (): Promise<Conciliacao[]> => {
    const { data, error } = await supabase.from('conciliacoes').select('*');
    if (error) throw error;
    return data as Conciliacao[];
  },

  getAllTransacoes: async (): Promise<TransacaoBanco[]> => {
    const { data, error } = await supabase.from('transacoes_banco').select('*').order('data_transacao', { ascending: false });
    if (error) throw error;
    return data as TransacaoBanco[];
  },

  importCSV: async (contaBancariaId: string, rows: any[], importMode: 'entrada' | 'saida' | 'ambos' = 'ambos'): Promise<boolean> => {
    const normalizeDate = (dateStr: string) => {
      if (!dateStr) return new Date().toISOString().split('T')[0];
      const cleanDate = dateStr.trim().split(' ')[0];
      if (cleanDate.includes('/')) {
        const [day, month, year] = cleanDate.split('/');
        const y = (year || '').length === 2 ? `20${year}` : year;
        return `${y}-${(month || '').padStart(2, '0')}-${(day || '').padStart(2, '0')}`;
      }
      return cleanDate;
    };

    const seenHashes = new Set<string>();
    const transacoes: any[] = [];

    rows.forEach(row => {
      const dataIso = normalizeDate(row.data);
      let valor = row.valor || 0;
      if (importMode === 'saida') valor = -Math.abs(valor);
      else if (importMode === 'entrada') valor = Math.abs(valor);
      
      const desc = (row.descricao || 'Sem descrição').substring(0, 255);
      const doc = (row.documento || '').substring(0, 50);
      const hash = `${contaBancariaId}-${dataIso}-${valor}-${desc}-${doc}`;

      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        transacoes.push({
          conta_bancaria_id: contaBancariaId,
          data_transacao: dataIso,
          valor: valor,
          descricao_banco: desc,
          numero_documento: doc,
          tipo_movimento: valor < 0 ? 'debito' : 'credito',
          hash_transacao: hash,
          status_conciliacao: false
        });
      }
    });

    if (transacoes.length === 0) return true;

    const { error } = await supabase.from('transacoes_banco').upsert(transacoes, { onConflict: 'hash_transacao' });
    
    if (error) {
      console.error("[CRITICAL IMPORT ERROR]", error);
      // Aqui está o "Pulo do Gato" do Senior: lançar o erro com todos os detalhes
      const technicalMsg = `[Erro ${error.code}] ${error.message}. Detalhes: ${error.details || 'N/A'}. Dica: ${error.hint || 'N/A'}`;
      throw new Error(technicalMsg);
    }
    return true;
  },

  linkConciliacao: async (lancamentoId: string, transacaoBancoId: string, usuarioId: string, isMaster: boolean = true): Promise<Conciliacao> => {
    const { data, error } = await supabase.from('conciliacoes').insert([{ lancamento_id: lancamentoId, transacao_banco_id: transacaoBancoId, usuario_conciliador_id: usuarioId, data_conciliacao: new Date().toISOString() }]).select().single();
    if (error) throw error;
    const finalStatus = isMaster ? 'pago' : 'quitação_pendente';
    await supabase.from('lancamentos_financeiros').update({ status_pagamento: finalStatus }).eq('id', lancamentoId);
    await supabase.from('transacoes_banco').update({ status_conciliacao: true }).eq('id', transacaoBancoId);
    return data as Conciliacao;
  },

  unlinkConciliacao: async (conciliacaoId: string, usuarioId: string): Promise<boolean> => {
    const { data: con } = await supabase.from('conciliacoes').select('*').eq('id', conciliacaoId).single();
    if (con) {
      await supabase.from('lancamentos_financeiros').update({ status_pagamento: 'aberto' }).eq('id', con.lancamento_id);
      await supabase.from('transacoes_banco').update({ status_conciliacao: false }).eq('id', con.transacao_banco_id);
      await supabase.from('conciliacoes').delete().eq('id', conciliacaoId);
    }
    return true;
  },

  classifyDifference: async (conciliacaoId: string, tipo: TipoDiferenca, valor: number, obs: string): Promise<DiferencaFinanceira> => {
    const { data, error } = await supabase.from('diferencas_financeiras').insert([{ conciliacao_id: conciliacaoId, tipo_diferenca: tipo, valor_diferenca: valor, observacao_justificativa: obs }]).select().single();
    if (error) throw error;
    return data as DiferencaFinanceira;
  }
};