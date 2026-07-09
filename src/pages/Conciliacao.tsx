import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  Check, 
  Link2, 
  Unlink, 
  ArrowRight, 
  Search, 
  Upload, 
  HelpCircle,
  AlertTriangle,
  ChevronRight,
  Info,
  X,
  Plus,
  Coins,
  ShieldCheck,
  Building,
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2
} from 'lucide-react';
import { useConciliacao, useContas, useLancamentos, useEntidades } from '../hooks/useData';
import { useUIStore } from '../store/uiStore';
import { TransacaoBanco, LancamentoFinanceiro } from '../types';

export default function Conciliacao() {
  // Query state hooks
  const { 
    conciliacoes = [], 
    diferencas = [], 
    transacoes = [], 
    importCSV, 
    linkConciliacao, 
    unlinkConciliacao, 
    classifyDifference,
    isLinking,
    isUnlinking
  } = useConciliacao();

  const { data: contas = [] } = useContas();
  const { data: lancamentos = [] } = useLancamentos();
  const { data: entidades = [] } = useEntidades();

  // Selected Switches / Store state
  const { 
    currentUserId,
    isImportarCSVOpen,
    isClassificarDiferencaOpen,
    isVincularConciliarOpen,
    setModalOpen,
    selectedTransacaoForConciliationId,
    selectedLancamentoForConciliationId,
    currentConciliationDifferenceValue,
    currentConciliationId,
    setSelectedTransacaoForConciliationId,
    setSelectedLancamentoForConciliationId,
    setCurrentConciliationDifferenceValue,
    setCurrentConciliationId
  } = useUIStore();

  const [selectedContaId, setSelectedContaId] = useState<string>('conta_itau');
  const [erpSearch, setErpSearch] = useState('');

  // Period filtering
  const [periodFilter, setPeriodFilter] = useState<'month' | 'custom'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // CSV Import Temp States
  const [csvContentText, setCsvContentText] = useState('');
  const [selectedImportContaId, setSelectedImportContaId] = useState('conta_itau');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Classify Difference Modal Temp states
  const [diffType, setDiffType] = useState<'juros' | 'multa' | 'desconto' | 'tarifa' | 'pagamento_parcial' | 'ajuste_manual'>('tarifa');
  const [diffJustification, setDiffJustification] = useState('');

  // Resolved list of bank statement records
  const bankStatements = useMemo(() => {
    return transacoes
      .filter(tx => {
        if (tx.conta_bancaria_id !== selectedContaId) return false;
        
        if (periodFilter === 'month') {
          return tx.data_transacao.startsWith(selectedMonth);
        } else {
          const start = customStartDate || '0000-00-00';
          const end = customEndDate || '9999-99-99';
          return tx.data_transacao >= start && tx.data_transacao <= end;
        }
      })
      .map(tx => {
        const con = conciliacoes.find(c => c.transacao_banco_id === tx.id);
        const matchedLaunch = con ? lancamentos.find(l => l.id === con.lancamento_id) : null;
        return {
          ...tx,
          conciliation: con || null,
          matchedLaunch
        };
      });
  }, [transacoes, selectedContaId, conciliacoes, lancamentos, periodFilter, selectedMonth, customStartDate, customEndDate]);

  // Available forecasts
  const availableLaunches = useMemo(() => {
    const activeTx = transacoes.find(t => t.id === selectedTransacaoForConciliationId);
    
    let filtered = lancamentos.filter(l => {
      if (l.conta_bancaria_id !== selectedContaId) return false;
      
      const isMatched = conciliacoes.some(con => con.lancamento_id === l.id);
      if (isMatched) return false;

      // Date filtering for ERP list
      if (periodFilter === 'month') {
        if (!l.data_vencimento.startsWith(selectedMonth)) return false;
      } else {
        const start = customStartDate || '0000-00-00';
        const end = customEndDate || '9999-99-99';
        if (l.data_vencimento < start || l.data_vencimento > end) return false;
      }

      if (erpSearch.trim() !== '') {
        const entName = entidades.find(e => e.id === l.entidade_id)?.nome_razao_social || '';
        return entName.toLowerCase().includes(erpSearch.toLowerCase()) ||
               l.observacoes.toLowerCase().includes(erpSearch.toLowerCase());
      }

      return true;
    });

    if (activeTx) {
      // Sort by relevance score
      filtered = [...filtered].sort((a, b) => {
        const score = (l: LancamentoFinanceiro) => {
          let s = 0;
          const erpVal = l.tipo === 'saida' ? -l.valor_previsto : l.valor_previsto;
          const valDiff = Math.abs(activeTx.valor - erpVal);
          
          // Exact value match
          if (valDiff < 0.01) s += 100;
          
          // Date matching
          const tDate = new Date(activeTx.data_transacao);
          const lDate = new Date(l.data_vencimento);
          const dayDiff = Math.abs((tDate.getTime() - lDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (dayDiff === 0) s += 50;
          else if (dayDiff <= 3) s += 20;
          
          return s;
        };
        return score(b) - score(a);
      });
    }

    return filtered;
  }, [lancamentos, conciliacoes, erpSearch, entidades, selectedTransacaoForConciliationId, transacoes]);

  const getEntidadeName = (id: string) => {
    return entidades.find(e => e.id === id)?.nome_razao_social || 'Desconhecido';
  };

  const valueFormatter = (val: number, type?: 'entrada' | 'saida') => {
    const absVal = Math.abs(val);
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(absVal);
    if (type === 'saida' || (type === undefined && val < 0)) {
      return `-${formatted}`;
    }
    return formatted;
  };

  const formatShorthandDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      const day = parseInt(parts[2], 10);
      const monthNum = parseInt(parts[1], 10);
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${day} ${months[monthNum - 1] || ''}`;
    }
    return dateStr;
  };

  const formatFullShorthandDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      const day = parseInt(parts[2], 10);
      const monthNum = parseInt(parts[1], 10);
      const year = parts[0];
      const monthsFull = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${day} ${monthsFull[monthNum - 1] || ''} ${year}`;
    }
    return dateStr;
  };

  const getTxSubtext = (tx: any) => {
    if (tx.status_conciliacao) return 'Lançamento Conciliado';
    return tx.valor < 0 ? 'Débito Bancário' : 'Crédito Recebido';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // CSV Import Mappings
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    data: '',
    valor: '',
    descricao: ''
  });

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setCsvContentText(text);
      
      // Parse for preview
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
        setCsvHeaders(headers);
        
        const preview = lines.slice(1, 6).map(line => {
          const parts = line.split(separator).map(p => p.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((h, i) => { row[h] = parts[i]; });
          return row;
        });
        setCsvPreviewRows(preview);

        // Auto-detection logic
        const newMapping = { data: '', valor: '', descricao: '' };
        headers.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes('dat') || lower.includes('venc')) newMapping.data = h;
          if (lower.includes('val') || lower.includes('quant') || lower.includes('amo')) newMapping.valor = h;
          if (lower.includes('desc') || lower.includes('hist') || lower.includes('obs')) newMapping.descricao = h;
        });
        setColumnMapping(newMapping);
      }
    };
    reader.readAsText(file);
  };

  const handleImportCSVSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContentText.trim() || !columnMapping.data || !columnMapping.valor || !columnMapping.descricao) return;

    try {
      const lines = csvContentText.split('\n').filter(l => l.trim());
      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
      
      const rowsToImport = lines.slice(1).map(line => {
        const parts = line.split(separator).map(p => p.trim().replace(/"/g, ''));
        const rowData: any = {};
        headers.forEach((h, i) => { rowData[h] = parts[i]; });

        const valRaw = rowData[columnMapping.valor] || '0';
        const val = parseFloat(valRaw.replace(',', '.').replace(/[^\d.-]/g, ''));
        
        return {
          data: rowData[columnMapping.data],
          valor: val,
          descricao: rowData[columnMapping.descricao]
        };
      }).filter(r => r.data && !isNaN(r.valor));

      if (rowsToImport.length === 0) {
        alert('Nenhum dado válido encontrado com o mapeamento atual.');
        return;
      }

      await importCSV({ contaBancariaId: selectedImportContaId, rows: rowsToImport });
      setCsvContentText('');
      setCsvPreviewRows([]);
      setModalOpen('isImportarCSVOpen', false);
      alert(`${rowsToImport.length} transações importadas com sucesso!`);
    } catch (err: any) {
      alert('Falha na importação: ' + err.message);
    }
  };

  const handleOpenLinkWorkspace = (tx: TransacaoBanco) => {
    setSelectedTransacaoForConciliationId(tx.id);
    setSelectedLancamentoForConciliationId(null);
    setModalOpen('isVincularConciliarOpen', true);
  };

  const handleSelectERPItemForLink = (lanc: LancamentoFinanceiro) => {
    setSelectedLancamentoForConciliationId(lanc.id);
  };

  const executeConciliationLink = async () => {
    if (!selectedTransacaoForConciliationId || !selectedLancamentoForConciliationId) return;

    try {
      const tx = transacoes.find(t => t.id === selectedTransacaoForConciliationId);
      const lanc = lancamentos.find(l => l.id === selectedLancamentoForConciliationId);

      if (!tx || !lanc) return;

      const newCon = await linkConciliacao({
        lancamentoId: lanc.id,
        transacaoBancoId: tx.id,
        usuarioId: currentUserId
      });

      const txVal = tx.valor;
      const erpVal = lanc.tipo === 'saida' ? -lanc.valor_previsto : lanc.valor_previsto;
      const differenceAmount = txVal - erpVal;

      if (Math.abs(differenceAmount) > 0.01) {
        setCurrentConciliationId(newCon.id);
        setCurrentConciliationDifferenceValue(differenceAmount);
        setModalOpen('isVincularConciliarOpen', false);
        setModalOpen('isClassificarDiferencaOpen', true);
      } else {
        setModalOpen('isVincularConciliarOpen', false);
        setSelectedTransacaoForConciliationId(null);
        setSelectedLancamentoForConciliationId(null);
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const handleClassifyDiffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConciliationId) return;

    try {
      await classifyDifference({
        conciliacaoId: currentConciliationId,
        tipoDiferenca: diffType,
        valorDiferenca: currentConciliationDifferenceValue,
        observacaoJustificativa: diffJustification
      });

      setModalOpen('isClassificarDiferencaOpen', false);
      setCurrentConciliationId(null);
      setCurrentConciliationDifferenceValue(0);
      setDiffJustification('');
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const handleUnlink = async (conId: string) => {
    if (confirm('Desvincular conciliação?')) {
      try {
        await unlinkConciliacao({ conciliacaoId: conId, usuarioId: currentUserId });
      } catch (err: any) {
        alert('Erro: ' + err.message);
      }
    }
  };

  const selectedTxForWorkspace = useMemo(() => {
    return transacoes.find(t => t.id === selectedTransacaoForConciliationId) || null;
  }, [selectedTransacaoForConciliationId, transacoes]);

  const selectedLancForWorkspace = useMemo(() => {
    return lancamentos.find(l => l.id === selectedLancamentoForConciliationId) || null;
  }, [selectedLancamentoForConciliationId, lancamentos]);

  const draftDifferenceAmount = useMemo(() => {
    if (!selectedTxForWorkspace || !selectedLancForWorkspace) return 0;
    const txVal = selectedTxForWorkspace.valor;
    const erpVal = selectedLancForWorkspace.tipo === 'saida' ? -selectedLancForWorkspace.valor_previsto : selectedLancForWorkspace.valor_previsto;
    return txVal - erpVal;
  }, [selectedTxForWorkspace, selectedLancForWorkspace]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 uppercase">Concíliação Bancária</h1>
          <p className="text-sm text-neutral-500 mt-1 font-medium">Sincronize a Verdade Bancária com suas previsões financeiras.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Period Selector */}
          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 h-12 items-center">
            <button
              onClick={() => setPeriodFilter('month')}
              className={`px-4 h-full font-black text-[10px] uppercase tracking-widest rounded-lg transition-all ${periodFilter === 'month' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Por Mês
            </button>
            <button
              onClick={() => setPeriodFilter('custom')}
              className={`px-4 h-full font-black text-[10px] uppercase tracking-widest rounded-lg transition-all ${periodFilter === 'custom' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Período
            </button>
          </div>

          {periodFilter === 'month' ? (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-12 px-4 bg-white border-2 border-neutral-100 rounded-xl text-xs font-bold focus:border-primary outline-none"
            />
          ) : (
            <div className="flex items-center gap-2">
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="h-12 px-3 bg-white border-2 border-neutral-100 rounded-xl text-[10px] font-bold outline-none w-32" />
              <span className="text-neutral-300 font-black">/</span>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="h-12 px-3 bg-white border-2 border-neutral-100 rounded-xl text-[10px] font-bold outline-none w-32" />
            </div>
          )}

          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 h-12 items-center">
            {contas.map(c => (
              <button 
                key={c.id}
                type="button" 
                onClick={() => setSelectedContaId(c.id)}
                className={`px-4 py-2 font-black text-[10px] uppercase tracking-widest rounded-lg transition-all cursor-pointer h-full ${
                  selectedContaId === c.id 
                    ? 'bg-white text-neutral-900 shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>

          <button 
            type="button"
            onClick={() => setModalOpen('isImportarCSVOpen', true)}
            className="px-6 py-2 bg-neutral-900 text-white font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-neutral-800 transition-all shadow-md flex items-center gap-2 h-12 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Importar CSV
          </button>
        </div>
      </div>

      {/* Split Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Left Half: BANCO */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" />
              <span className="font-black text-[10px] text-neutral-800 uppercase tracking-widest">Extrato do Banco</span>
            </div>
            <span className="text-[9px] font-black bg-white border border-neutral-200 text-neutral-500 px-3 py-1 rounded-full uppercase tracking-widest">Inalterável</span>
          </div>

          <div className="p-5 space-y-3 max-h-[600px] overflow-y-auto bg-neutral-50/20">
            {bankStatements.length === 0 ? (
              <div className="py-20 text-center opacity-40 space-y-3">
                <Upload className="w-10 h-10 mx-auto" />
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma transação</p>
              </div>
            ) : (
              bankStatements.map(tx => {
                const isReconciled = tx.status_conciliacao;
                const isSelected = selectedTransacaoForConciliationId === tx.id;
                return (
                  <div 
                    key={tx.id}
                    onClick={() => !isReconciled && handleOpenLinkWorkspace(tx)}
                    className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all select-none ${
                      isReconciled ? 'bg-white opacity-50' : 
                      isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-neutral-100 bg-white hover:border-neutral-300 cursor-pointer shadow-sm'
                    }`}
                  >
                    <div className="w-16 shrink-0 font-black text-[10px] text-neutral-500">{formatShorthandDate(tx.data_transacao)}</div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className={`text-sm font-black truncate ${isReconciled ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>{tx.descricao_banco}</p>
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">{getTxSubtext(tx)}</span>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-4">
                      <div>
                        <p className={`text-sm font-black ${isReconciled ? 'line-through text-neutral-400' : tx.valor < 0 ? 'text-alert-red' : 'text-bank-truth-green'}`}>
                          {valueFormatter(tx.valor)}
                        </p>
                        {isReconciled && <span className="text-[9px] text-bank-truth-green font-black uppercase block">✔ Conciliado</span>}
                      </div>
                      {isReconciled && tx.conciliation ? (
                        <button onClick={(e) => { e.stopPropagation(); handleUnlink(tx.conciliation!.id); }} className="p-2 hover:bg-red-50 text-neutral-400 hover:text-alert-red rounded-lg transition-colors"><Unlink className="w-4 h-4" /></button>
                      ) : <ChevronRight className="w-4 h-4 text-primary" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Half: ERP */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="font-black text-[10px] text-neutral-800 uppercase tracking-widest">Previsões do Sistema</span>
            </div>
            <span className="text-[9px] font-black bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full uppercase tracking-widest">Aguardando Vínculo</span>
          </div>

          <div className="p-5 space-y-3 max-h-[600px] overflow-y-auto bg-neutral-50/20">
            {availableLaunches.length === 0 ? (
              <div className="py-20 text-center opacity-40 space-y-3">
                <ShieldCheck className="w-10 h-10 mx-auto text-bank-truth-green" />
                <p className="text-[10px] font-black uppercase tracking-widest text-bank-truth-green">Totalmente Conciliado</p>
              </div>
            ) : (
              availableLaunches.map((l, index) => (
                <div key={l.id} className="bg-white border-2 border-neutral-100 rounded-xl p-4 flex items-center justify-between transition-all select-none shadow-sm hover:border-neutral-300">
                  <div className="w-16 shrink-0 font-black text-[10px] text-neutral-500">{formatShorthandDate(l.data_vencimento)}</div>
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-black text-neutral-900 truncate">{getEntidadeName(l.entidade_id)}</p>
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 truncate block">{l.observacoes}</span>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-5">
                    <div className="min-w-[90px]">
                      <p className="text-sm font-black text-neutral-950">{valueFormatter(l.valor_previsto, l.tipo)}</p>
                      <span className="text-[8px] bg-neutral-100 text-neutral-500 font-black px-1.5 py-0.5 rounded block mt-0.5 uppercase">{l.tipo === 'entrada' ? 'Receita' : 'Despesa'}</span>
                    </div>
                    <button
                      onClick={() => {
                        const matchingTx = transacoes.find(t => !t.status_conciliacao && t.conta_bancaria_id === selectedContaId);
                        setSelectedTransacaoForConciliationId(matchingTx?.id || transacoes.find(t => !t.status_conciliacao)?.id || null);
                        setSelectedLancamentoForConciliationId(l.id);
                        setModalOpen('isVincularConciliarOpen', true);
                      }}
                      className="px-4 py-2 font-black text-[9px] uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm"
                    >
                      <Link2 className="w-3.5 h-3.5" /> Vincular
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {/* SLIDE PANEL: VINCULAR */}
        {isVincularConciliarOpen && selectedTxForWorkspace && (
          <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen('isVincularConciliarOpen', false)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-full md:w-[520px] h-full bg-white shadow-2xl flex flex-col relative z-20">
              <header className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 bg-neutral-50 shrink-0">
                <h2 className="text-lg text-neutral-900 font-black uppercase tracking-tighter flex items-center gap-2"><Link2 className="w-5 h-5 text-primary" /> Vincular & Conciliar</h2>
                <button onClick={() => setModalOpen('isVincularConciliarOpen', false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors"><X className="w-6 h-6" /></button>
              </header>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Dado do Banco (Imutável)</label>
                  <div className="p-5 rounded-2xl border-l-8 border-primary border-2 border-neutral-100 bg-white shadow-sm space-y-4">
                    <div className="flex justify-between items-center"><span className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-neutral-800"><Building className="w-4 h-4" /> Extrato Bancário</span><span className="font-black text-[10px] text-neutral-400">{formatFullShorthandDate(selectedTxForWorkspace.data_transacao)}</span></div>
                    <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 font-mono text-[11px] font-black text-neutral-900 leading-relaxed uppercase">{selectedTxForWorkspace.descricao_banco}</div>
                    <div className="flex justify-between items-end pt-3 border-t border-neutral-100"><span className="text-[10px] font-black text-neutral-400 uppercase">Valor Total</span><span className={`font-black text-xl ${selectedTxForWorkspace.valor < 0 ? 'text-alert-red' : 'text-bank-truth-green'}`}>{valueFormatter(selectedTxForWorkspace.valor)}</span></div>
                  </div>
                </div>
                <div className="flex justify-center select-none"><div className="w-12 h-12 rounded-2xl bg-neutral-50 border-2 border-neutral-100 flex items-center justify-center shadow-sm text-neutral-400"><Link2 className="w-6 h-6" /></div></div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Previsões do Sistema</label><span className="text-[9px] text-amber-700 font-black bg-amber-50 px-3 py-1 rounded-full border border-amber-200 uppercase tracking-widest">{availableLaunches.length} Pendentes</span></div>
                  <div className="relative"><Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" /><input type="text" placeholder="Pesquisar registro..." value={erpSearch} onChange={(e) => setErpSearch(e.target.value)} className="w-full h-12 pl-11 pr-4 bg-white border-2 border-neutral-100 rounded-xl text-xs font-bold focus:border-primary focus:outline-none transition-all" /></div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {availableLaunches.length === 0 ? <div className="py-12 text-center text-[10px] font-black uppercase text-neutral-300 border-2 border-dashed border-neutral-100 rounded-2xl">Vazio</div> : 
                    availableLaunches.map(l => {
                      const isSelected = selectedLancamentoForConciliationId === l.id;
                      
                      // Match check for UI badge
                      const erpVal = l.tipo === 'saida' ? -l.valor_previsto : l.valor_previsto;
                      const isExactMatch = selectedTxForWorkspace &&
                                           Math.abs(selectedTxForWorkspace.valor - erpVal) < 0.01 &&
                                           selectedTxForWorkspace.data_transacao === l.data_vencimento;

                      return (
                        <div key={l.id} onClick={() => handleSelectERPItemForLink(l)} className={`p-4 border-2 rounded-2xl cursor-pointer transition-all shadow-sm relative overflow-hidden ${isSelected ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-neutral-50 bg-white hover:border-neutral-200'}`}>
                          {isExactMatch && (
                            <div className="absolute top-0 right-0 px-3 py-1 bg-bank-truth-green text-white text-[8px] font-black uppercase tracking-widest rounded-bl-xl">
                              Sugestão Ideal
                            </div>
                          )}
                          <div className="flex justify-between items-start mb-2"><h4 className="font-black text-xs text-neutral-900 uppercase tracking-tight">{getEntidadeName(l.entidade_id)}</h4>{isSelected && <Check className="w-4 h-4 text-primary" />}</div>
                          <p className="text-[10px] text-neutral-500 font-bold mb-3 uppercase tracking-tighter line-clamp-1">{l.observacoes}</p>
                          <div className="flex items-center justify-between pt-3 border-t border-neutral-50 text-[9px] font-black uppercase tracking-widest text-neutral-400"><span>Venc: {formatShorthandDate(l.data_vencimento)}</span><span className="text-neutral-900">{valueFormatter(l.valor_previsto, l.tipo)}</span></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <footer className="p-6 border-t border-neutral-100 bg-neutral-50 shrink-0 space-y-4">
                {selectedLancForWorkspace && (
                  <div className="flex justify-between items-center"><span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Diferença Calculada</span>
                    {Math.abs(draftDifferenceAmount) < 0.01 ? <span className="bg-emerald-50 text-bank-truth-green font-black text-xs px-4 py-1.5 rounded-full border border-emerald-200 uppercase tracking-widest flex items-center gap-2"><Check className="w-4 h-4" /> R$ 0,00</span> : <span className="bg-red-50 text-alert-red font-black text-xs px-4 py-1.5 rounded-full border border-alert-red uppercase tracking-widest">{valueFormatter(draftDifferenceAmount)}</span>}
                  </div>
                )}
                <div className="flex justify-end gap-3"><button onClick={() => setModalOpen('isVincularConciliarOpen', false)} className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-neutral-500 hover:text-neutral-800 transition-colors">Cancelar</button><button disabled={!selectedLancamentoForConciliationId || isLinking} onClick={executeConciliationLink} className="px-8 py-3 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md flex items-center gap-2 bg-primary text-white hover:brightness-95 disabled:opacity-50 transition-all">{isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirmar</button></div>
              </footer>
            </motion.div>
          </div>
        )}

        {/* MODAL: CLASSIFICAR */}
        {isClassificarDiferencaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen('isClassificarDiferencaOpen', false)} className="absolute inset-0 bg-black/50 backdrop-blur-xs" />
            <motion.form initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onSubmit={handleClassifyDiffSubmit} className="bg-white w-full max-w-[440px] rounded-3xl shadow-2xl border border-neutral-100 flex flex-col relative z-20 overflow-hidden">
              <header className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50"><h2 className="text-sm font-black uppercase tracking-widest text-neutral-900">Classificar Diferença</h2><button type="button" onClick={() => setModalOpen('isClassificarDiferencaOpen', false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors"><X className="w-5 h-5" /></button></header>
              <div className="p-8 space-y-6">
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-100 text-[10px] font-black uppercase tracking-widest text-amber-700 leading-relaxed flex gap-3"><AlertTriangle className="w-5 h-5 shrink-0" /><p>Divergência detectada entre extrato e ERP. Identifique a natureza contábil.</p></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Valor Residual</label><div className="w-full px-5 py-4 bg-neutral-100 border-2 border-neutral-200 rounded-2xl font-black text-lg text-alert-red">{valueFormatter(currentConciliationDifferenceValue)}</div></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Categoria da Diferença</label><select value={diffType} onChange={(e) => setDiffType(e.target.value as any)} className="w-full h-12 bg-white border-2 border-neutral-200 rounded-2xl px-4 text-xs font-black uppercase tracking-widest focus:border-primary focus:outline-none appearance-none cursor-pointer"><option value="tarifa">Tarifa Bancária</option><option value="juros">Juros Pagos/Rec</option><option value="multa">Multa por Atraso</option><option value="desconto">Desconto Obtido</option><option value="pagamento_parcial">Pagto Parcial</option><option value="ajuste_manual">Ajuste Manual</option></select></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Justificativa Técnica</label><textarea required rows={3} value={diffJustification} onChange={(e) => setDiffJustification(e.target.value)} placeholder="Motivo..." className="w-full p-5 bg-white border-2 border-neutral-200 rounded-2xl text-xs font-bold focus:border-primary focus:outline-none resize-none" /></div>
              </div>
              <footer className="px-8 py-6 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen('isClassificarDiferencaOpen', false)} className="px-6 py-2 font-black text-[10px] uppercase tracking-widest text-neutral-500">Cancelar</button><button type="submit" className="px-8 py-3 font-black text-[10px] uppercase tracking-widest bg-primary text-white rounded-xl shadow-md hover:brightness-95 transition-all">Salvar Ajuste</button></footer>
            </motion.form>
          </div>
        )}

        {/* MODAL: IMPORTAR */}
        {isImportarCSVOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen('isImportarCSVOpen', false)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
            <motion.form initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onSubmit={handleImportCSVSubmit} className="bg-white w-full max-w-[480px] rounded-3xl shadow-2xl border border-neutral-100 flex flex-col relative z-20 overflow-hidden">
              <header className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50"><h2 className="text-sm font-black uppercase tracking-widest text-neutral-900">Importar Extrato CSV</h2><button type="button" onClick={() => setModalOpen('isImportarCSVOpen', false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors"><X className="w-5 h-5" /></button></header>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Conta Bancária de Destino</label>
                  <select value={selectedImportContaId} onChange={(e) => setSelectedImportContaId(e.target.value)} className="w-full h-12 bg-white border-2 border-neutral-200 rounded-2xl px-4 text-xs font-black uppercase tracking-widest focus:border-primary focus:outline-none cursor-pointer">
                    {contas.map(cnt => <option key={cnt.id} value={cnt.id}>{cnt.nome_banco}</option>)}
                  </select>
                </div>

                {!csvContentText ? (
                  <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={triggerFileSelect} className={`border-4 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center gap-4 ${isDragging ? 'border-primary bg-primary/5' : 'border-neutral-100 bg-neutral-50 hover:border-neutral-300'}`}>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                    <div className="w-16 h-16 rounded-2xl bg-white border-2 border-neutral-100 shadow-sm flex items-center justify-center text-primary"><Upload className="w-8 h-8" /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-800">Arraste ou Selecione o CSV do Banco</p>
                    <span className="text-[9px] text-neutral-400 font-medium">O sistema detectará as colunas automaticamente</span>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fade-in">
                    <div className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-6 h-6 text-bank-truth-green" />
                        <div>
                          <p className="text-[10px] font-black text-bank-truth-green uppercase">Arquivo Carregado</p>
                          <p className="text-[9px] text-emerald-700 font-bold">{csvHeaders.length} colunas detectadas</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => { setCsvContentText(''); setCsvPreviewRows([]); }} className="text-xs font-black text-emerald-700 hover:underline uppercase tracking-widest">Trocar Arquivo</button>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Mapeamento de Colunas</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {['data', 'valor', 'descricao'].map((field) => (
                          <div key={field} className="flex items-center gap-3">
                            <div className="w-24 shrink-0 text-[10px] font-black text-neutral-600 uppercase">{field === 'data' ? 'Data' : field === 'valor' ? 'Valor' : 'Descrição'}</div>
                            <select
                              value={columnMapping[field as keyof typeof columnMapping]}
                              onChange={(e) => setColumnMapping(prev => ({ ...prev, [field]: e.target.value }))}
                              className="flex-1 h-10 bg-neutral-50 border-2 border-neutral-200 rounded-xl px-3 text-[10px] font-bold focus:border-primary outline-none"
                            >
                              <option value="">Selecionar Coluna...</option>
                              {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Preview dos Dados</h3>
                      <div className="border-2 border-neutral-100 rounded-2xl overflow-hidden bg-white">
                        <table className="w-full text-[9px] text-left">
                          <thead className="bg-neutral-50 border-b border-neutral-100">
                            <tr>
                              {Object.values(columnMapping).filter(v => v).map(h => <th key={h} className="p-2 font-black uppercase text-neutral-500">{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreviewRows.map((row, i) => (
                              <tr key={i} className="border-b border-neutral-50 last:border-0">
                                {Object.values(columnMapping).filter(v => v).map((h: string) => (
                                  <td key={h} className="p-2 font-medium text-neutral-700 truncate max-w-[100px]">{row[h]}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <footer className="px-8 py-6 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen('isImportarCSVOpen', false)} className="px-6 py-2 font-black text-[10px] uppercase tracking-widest text-neutral-500">Cancelar</button>
                <button
                  type="submit"
                  disabled={!csvContentText.trim() || !columnMapping.data || !columnMapping.valor || !columnMapping.descricao}
                  className="px-8 py-3 font-black text-[10px] uppercase tracking-widest bg-neutral-900 text-white rounded-xl shadow-md hover:brightness-95 disabled:opacity-50 transition-all"
                >
                  Confirmar Importação
                </button>
              </footer>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
