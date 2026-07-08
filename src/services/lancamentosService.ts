import { db, getData, KEYS } from './db';
import { LancamentoFinanceiro, Recorrencia } from '../types';

export const lancamentosService = {
  getAll: async (): Promise<LancamentoFinanceiro[]> => {
    return db.lancamentos.getAll();
  },

  getById: async (id: string): Promise<LancamentoFinanceiro | undefined> => {
    const list = await db.lancamentos.getAll();
    return list.find(item => item.id === id);
  },

  create: async (
    item: Omit<LancamentoFinanceiro, 'id' | 'created_at' | 'updated_at' | 'status_sincronizacao'>,
    recorrencia?: Omit<Recorrencia, 'id' | 'data_inicio'>
  ): Promise<LancamentoFinanceiro[]> => {
    const list = getData<LancamentoFinanceiro>(KEYS.LANCAMENTOS);
    const createdList: LancamentoFinanceiro[] = [];
    const now = new Date().toISOString();

    if (recorrencia && recorrencia.quantidade_total_parcelas > 1) {
      // It is a recurring series
      const recId = 'rec_' + Math.random().toString(36).substr(2, 9);
      
      // Save the Recorrencia object
      const recList = getData<Recorrencia>(KEYS.RECORRENCIAS);
      const newRecObject: Recorrencia = {
        id: recId,
        periodicidade: recorrencia.periodicidade,
        quantidade_total_parcelas: recorrencia.quantidade_total_parcelas,
        data_inicio: item.data_vencimento
      };
      recList.push(newRecObject);
      db.recorrencias.save(recList);

      // Generate all installments
      const baseDate = new Date(item.data_vencimento + 'T00:00:00');
      
      for (let p = 1; p <= recorrencia.quantidade_total_parcelas; p++) {
        // Calculate date offset
        const installmentDate = new Date(baseDate);
        if (recorrencia.periodicidade === 'mensal') {
          installmentDate.setMonth(baseDate.getMonth() + (p - 1));
        } else if (recorrencia.periodicidade === 'semanal') {
          installmentDate.setDate(baseDate.getDate() + (p - 1) * 7);
        } else if (recorrencia.periodicidade === 'diario') {
          installmentDate.setDate(baseDate.getDate() + (p - 1));
        } else if (recorrencia.periodicidade === 'anual') {
          installmentDate.setFullYear(baseDate.getFullYear() + (p - 1));
        }

        const dateStr = installmentDate.toISOString().split('T')[0];

        const installmentItem: LancamentoFinanceiro = {
          ...item,
          id: `lanc_${recId}_p${p}`,
          data_vencimento: dateStr,
          recorrencia_id: recId,
          numero_parcela: p,
          status_sincronizacao: true,
          created_at: now,
          updated_at: now
        };
        
        list.push(installmentItem);
        createdList.push(installmentItem);
      }
    } else {
      // Single launch
      const newElement: LancamentoFinanceiro = {
        ...item,
        id: 'lanc_' + Math.random().toString(36).substr(2, 9),
        status_sincronizacao: true,
        created_at: now,
        updated_at: now
      };
      list.push(newElement);
      createdList.push(newElement);
    }

    await db.lancamentos.save(list);
    return createdList;
  },

  update: async (
    id: string, 
    item: Partial<Omit<LancamentoFinanceiro, 'id' | 'created_at'>>, 
    mode: 'single' | 'all' = 'single'
  ): Promise<LancamentoFinanceiro[]> => {
    const list = getData<LancamentoFinanceiro>(KEYS.LANCAMENTOS);
    const targetIdx = list.findIndex(r => r.id === id);
    if (targetIdx === -1) throw new Error('Lançamento não encontrado');
    
    const target = list[targetIdx];
    const now = new Date().toISOString();
    const updatedItems: LancamentoFinanceiro[] = [];

    // Log old details for auditing
    const auditLogs = getData<any>(KEYS.AUDITORIA_LOGS);

    if (mode === 'all' && target.recorrencia_id) {
      // Modify all matching subsequent parcels
      const currentParcelNum = target.numero_parcela || 1;
      
      list.forEach((elem, index) => {
        if (elem.recorrencia_id === target.recorrencia_id && (elem.numero_parcela || 1) >= currentParcelNum) {
          const oldData = { ...elem };
          
          // Modify fields but keep parcel structures intact
          const updatedElem = {
            ...elem,
            ...item,
            // Keep original date structure, but maybe offset or modify other aspects if needed
            // Standard approach: only modify values, categories, accounts, descriptions, not installment indexes.
            id: elem.id,
            recorrencia_id: elem.recorrencia_id,
            numero_parcela: elem.numero_parcela,
            created_at: elem.created_at,
            updated_at: now
          };
          
          list[index] = updatedElem;
          updatedItems.push(updatedElem);

          // Audit Log
          auditLogs.push({
            id: 'audit_' + Math.random().toString(36).substr(2, 9),
            tabela_afetada: 'lancamentos_financeiros',
            registro_id: elem.id,
            usuario_id: item.usuario_criador_id || 'system',
            acao: 'UPDATE',
            dados_anteriores: oldData,
            dados_novos: updatedElem,
            data_hora: now
          });
        }
      });
    } else {
      // Just modify this single parcel
      const oldData = { ...target };
      const updated = {
        ...target,
        ...item,
        id: target.id,
        updated_at: now
      };
      
      list[targetIdx] = updated;
      updatedItems.push(updated);

      // Audit Log
      auditLogs.push({
        id: 'audit_' + Math.random().toString(36).substr(2, 9),
        tabela_afetada: 'lancamentos_financeiros',
        registro_id: target.id,
        usuario_id: item.usuario_criador_id || 'system',
        acao: 'UPDATE',
        dados_anteriores: oldData,
        dados_novos: updated,
        data_hora: now
      });
    }

    await db.lancamentos.save(list);
    db.auditoriaLogs.save(auditLogs);
    return updatedItems;
  },

  delete: async (id: string, mode: 'single' | 'all' = 'single'): Promise<boolean> => {
    const list = getData<LancamentoFinanceiro>(KEYS.LANCAMENTOS);
    const target = list.find(r => r.id === id);
    if (!target) return false;

    let filtered: LancamentoFinanceiro[] = [];
    const now = new Date().toISOString();
    const auditLogs = getData<any>(KEYS.AUDITORIA_LOGS);

    if (mode === 'all' && target.recorrencia_id) {
      const currentParcelNum = target.numero_parcela || 1;
      
      // Keep items that aren't part of this recurrence series, or are older than the deleted installment
      filtered = list.filter(elem => {
        const isRecur = elem.recorrencia_id === target.recorrencia_id;
        const isFutureOrCurrent = (elem.numero_parcela || 1) >= currentParcelNum;
        return !(isRecur && isFutureOrCurrent);
      });

      auditLogs.push({
        id: 'audit_' + Math.random().toString(36).substr(2, 9),
        tabela_afetada: 'lancamentos_financeiros',
        registro_id: target.id,
        usuario_id: 'system',
        acao: 'DELETE',
        dados_anteriores: target,
        data_hora: now
      });
    } else {
      filtered = list.filter(r => r.id !== id);
      auditLogs.push({
        id: 'audit_' + Math.random().toString(36).substr(2, 9),
        tabela_afetada: 'lancamentos_financeiros',
        registro_id: target.id,
        usuario_id: 'system',
        acao: 'DELETE',
        dados_anteriores: target,
        data_hora: now
      });
    }

    await db.lancamentos.save(filtered);
    db.auditoriaLogs.save(auditLogs);
    return true;
  },

  approveInBatch: async (ids: string[], targetStatus: 'digital' | 'confirmado_master'): Promise<LancamentoFinanceiro[]> => {
    const list = getData<LancamentoFinanceiro>(KEYS.LANCAMENTOS);
    const now = new Date().toISOString();
    const updated: LancamentoFinanceiro[] = [];
    const auditLogs = getData<any>(KEYS.AUDITORIA_LOGS);

    list.forEach((elem, index) => {
      if (ids.includes(elem.id)) {
        const oldData = { ...elem };
        elem.status_aprovacao = targetStatus;
        elem.updated_at = now;
        updated.push(elem);

        auditLogs.push({
          id: 'audit_' + Math.random().toString(36).substr(2, 9),
          tabela_afetada: 'lancamentos_financeiros',
          registro_id: elem.id,
          usuario_id: 'user_master_1', // Simulated as master batch approve
          acao: 'UPDATE',
          dados_anteriores: oldData,
          dados_novos: { ...elem },
          data_hora: now
        });
      }
    });

    await db.lancamentos.save(list);
    db.auditoriaLogs.save(auditLogs);
    return updated;
  }
};
