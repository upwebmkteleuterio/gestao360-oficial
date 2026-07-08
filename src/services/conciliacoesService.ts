import { db, getData, KEYS } from './db';
import { Conciliacao, TransacaoBanco, LancamentoFinanceiro, DiferencaFinanceira, TipoDiferenca } from '../types';

export const conciliacoesService = {
  getConciliacoes: async (): Promise<Conciliacao[]> => {
    return db.conciliacoes.getAll();
  },

  getDiferencas: async (): Promise<DiferencaFinanceira[]> => {
    return db.diferencas.getAll();
  },

  getAllTransacoes: async (): Promise<TransacaoBanco[]> => {
    return db.transacoes.getAll();
  },

  importCSV: async (contaBancariaId: string, rows: Omit<TransacaoBanco, 'id' | 'conta_bancaria_id' | 'status_conciliacao'>[]): Promise<number> => {
    const list = getData<TransacaoBanco>(KEYS.TRANSACOES);
    let count = 0;
    
    for (const row of rows) {
      // Check duplicate hash
      const exists = list.some(tx => tx.hash_transacao === row.hash_transacao);
      if (!exists) {
        const newTx: TransacaoBanco = {
          ...row,
          id: 'tx_' + Math.random().toString(36).substr(2, 9),
          conta_bancaria_id: contaBancariaId,
          status_conciliacao: false
        };
        list.push(newTx);
        count++;
      }
    }
    
    await db.transacoes.save(list);
    return count;
  },

  linkConciliacao: async (lancamentoId: string, transacaoBancoId: string, usuarioId: string): Promise<Conciliacao> => {
    const conciliacoesList = getData<Conciliacao>(KEYS.CONCILIACOES);
    const transacoesList = getData<TransacaoBanco>(KEYS.TRANSACOES);
    const lancamentosList = getData<LancamentoFinanceiro>(KEYS.LANCAMENTOS);
    const auditLogs = getData<any>(KEYS.AUDITORIA_LOGS);

    // Validate states
    const txIdx = transacoesList.findIndex(tx => tx.id === transacaoBancoId);
    if (txIdx === -1) throw new Error('Transação bancária não encontrada');
    const lancIdx = lancamentosList.findIndex(l => l.id === lancamentoId);
    if (lancIdx === -1) throw new Error('Lançamento não encontrado');

    // Create the linkage
    const conId = 'con_' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    const newConciliation: Conciliacao = {
      id: conId,
      lancamento_id: lancamentoId,
      transacao_banco_id: transacaoBancoId,
      usuario_conciliador_id: usuarioId,
      data_conciliacao: now
    };

    // Update status in other tables
    transacoesList[txIdx].status_conciliacao = true;
    
    // Auto-update status to payed and master confirmed as match is verified
    lancamentosList[lancIdx].status_pagamento = 'pago';
    lancamentosList[lancIdx].status_aprovacao = 'confirmado_master';
    lancamentosList[lancIdx].updated_at = now;

    conciliacoesList.push(newConciliation);

    // Save
    await db.conciliacoes.save(conciliacoesList);
    await db.transacoes.save(transacoesList);
    await db.lancamentos.save(lancamentosList);

    // Auditoria
    auditLogs.push({
      id: 'audit_' + Math.random().toString(36).substr(2, 9),
      tabela_afetada: 'conciliacoes',
      registro_id: conId,
      usuario_id: usuarioId,
      acao: 'INSERT',
      dados_novos: newConciliation,
      data_hora: now
    });
    db.auditoriaLogs.save(auditLogs);

    return newConciliation;
  },

  unlinkConciliacao: async (conciliacaoId: string, usuarioId: string): Promise<boolean> => {
    const conciliacoesList = getData<Conciliacao>(KEYS.CONCILIACOES);
    const transacoesList = getData<TransacaoBanco>(KEYS.TRANSACOES);
    const lancamentosList = getData<LancamentoFinanceiro>(KEYS.LANCAMENTOS);
    const diferencasList = getData<DiferencaFinanceira>(KEYS.DIFERENCAS);
    const auditLogs = getData<any>(KEYS.AUDITORIA_LOGS);

    const conIdx = conciliacoesList.findIndex(c => c.id === conciliacaoId);
    if (conIdx === -1) return false;

    const targetCon = conciliacoesList[conIdx];
    const now = new Date().toISOString();

    // Reset status_conciliacao on transaction
    const txIdx = transacoesList.findIndex(t => t.id === targetCon.transacao_banco_id);
    if (txIdx !== -1) {
      transacoesList[txIdx].status_conciliacao = false;
    }

    // Reset payment / approval state on launch
    const lancIdx = lancamentosList.findIndex(l => l.id === targetCon.lancamento_id);
    if (lancIdx !== -1) {
      lancamentosList[lancIdx].status_pagamento = 'aberto';
      // Change status approval back to digital or keep master based on preference. Let's keep master but reopen payout.
      lancamentosList[lancIdx].updated_at = now;
    }

    // Remove associated differences if any
    const filteredDiferencas = diferencasList.filter(d => d.conciliacao_id !== conciliacaoId);

    // Remove match item
    const filteredCon = conciliacoesList.filter(c => c.id !== conciliacaoId);

    // Save
    await db.conciliacoes.save(filteredCon);
    await db.transacoes.save(transacoesList);
    await db.lancamentos.save(lancamentosList);
    await db.diferencas.save(filteredDiferencas);

    // Auditoria
    auditLogs.push({
      id: 'audit_' + Math.random().toString(36).substr(2, 9),
      tabela_afetada: 'conciliacoes',
      registro_id: conciliacaoId,
      usuario_id: usuarioId,
      acao: 'DELETE',
      dados_anteriores: targetCon,
      data_hora: now
    });
    db.auditoriaLogs.save(auditLogs);

    return true;
  },

  classifyDifference: async (
    conciliacaoId: string, 
    tipoDiferenca: TipoDiferenca, 
    valorDiferenca: number, 
    observacaoJustificativa: string
  ): Promise<DiferencaFinanceira> => {
    const list = getData<DiferencaFinanceira>(KEYS.DIFERENCAS);
    
    const newDif: DiferencaFinanceira = {
      id: 'dif_' + Math.random().toString(36).substr(2, 9),
      conciliacao_id: conciliacaoId,
      tipo_diferenca: tipoDiferenca,
      valor_diferenca: valorDiferenca,
      observacao_justificativa: observacaoJustificativa
    };
    
    list.push(newDif);
    await db.diferencas.save(list);
    return newDif;
  }
};
