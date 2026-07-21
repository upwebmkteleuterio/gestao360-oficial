import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Loader2,
  Calendar,
  Hash
} from 'lucide-react';
import { useConciliacao, useContas, useLancamentos, useEntidades } from '../hooks/useData';
import { useUIStore } from '../store/uiStore';
import { TransacaoBanco, LancamentoFinanceiro } from '../types';
import Button from '../components/Button';

export default function Conciliacao() {
  // Hooks de Dados
  const { 
    conciliacoes = [], 
    transacoes = [], 
    importCSV, 
    linkConciliacao, 
    unlinkConciliacao, 
    classifyDifference,
    isLinking,
  } = useConciliacao();

  const { data: contas = [] } = useContas();
  const { data: lancamentos = [] } = useLancamentos();
  const { data: entidades = [] } = useEntidades();

  // Estados Globais (Zustand)
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

  // Estados Locais
  const [selectedContaId, setSelectedContaId] = useState<string>('');
  const [erpSearch, setErpSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'month' | 'custom'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Estados de Importação CSV
  const [csvContentText, setCsvContentText] = useState('');
  const [selectedImportContaId, setSelectedImportContaId] = useState('');
  const [importMode, setImportMode] = useState<'entrada' | 'saida' | 'ambos'>('ambos');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Classificação de Diferença
  const [diffType, setDiffType] = useState<'juros' | 'multa' | 'desconto' | 'tarifa' | 'pagamento_parcial' | 'ajuste_manual'>('tarifa');
  const [diffJustification, setDiffJustification] = useState('');

  // Inicialização Automática da Conta
  useEffect(() => {
    if (contas.length > 0 && !selectedContaId) {
      const firstId = contas[0].id;
      setSelectedContaId(firstId);
      setSelectedImportContaId(firstId);
    }
  }, [contas, selectedContaId]);

  // VARIÁVEIS DE WORKSPACE (Resolvendo o Uncaught ReferenceError)
  const selectedTxForWorkspace = useMemo(() => {
    if (!selectedTransacaoForConciliationId) return null;
    return transacoes.find(t => t.id === selectedTransacaoForConciliationId) || null;
  }, [selectedTransacaoForConciliationId, transacoes]);

  const selectedLancForWorkspace = useMemo(() => {
    if (!selectedLancamentoForConciliationId) return null;
    return lancamentos.find(l => l.id === selectedLancamentoForConciliationId) || null;
  }, [selectedLancamentoForConciliationId, lancamentos]);

  const draftDifferenceAmount = useMemo(() => {
    if (!selectedTxForWorkspace || !selectedLancForWorkspace) return 0;
    const erpVal = selectedLancForWorkspace.tipo === 'saida' ? -selectedLancForWorkspace.valor_previsto : selectedLancForWorkspace.valor_previsto;
    return selectedTxForWorkspace.valor - erpVal;
  }, [selectedTxForWorkspace, selectedLancForWorkspace]);

  // Listagem de Transações Filtradas
  const bankStatements = useMemo(() => {
    return transacoes
      .filter(tx => {
        if (tx.conta_bancaria_id !== selectedContaId) return false;
        if (periodFilter === 'month') return tx.data_transacao.startsWith(selectedMonth);
        const start = customStartDate || '1900-01-01';
        const end = customEndDate || '2100-12-31';
        return tx.data_transacao >= start && tx.data_transacao <= end;
      })
      .map(tx => {
        const con = conciliacoes.find(c => c.transacao_banco_id === tx.id);
        const matchedLaunch = con ? lancamentos.find(l => l.id === con.lancamento_id) : null;
        return { ...tx, conciliation: con || null, matchedLaunch };
      });
  }, [transacoes, selectedContaId, conciliacoes, lancamentos, periodFilter, selectedMonth, customStartDate, customEndDate]);

  // Listagem de Lançamentos ERP Disponíveis
  const availableLaunches = useMemo(() => {
    return lancamentos.filter(l => {
      if (l.conta_bancaria_id !== selectedContaId) return false;
      if (conciliacoes.some(con => con.lancamento_id === l.id)) return false;
      if (periodFilter === 'month') {
        if (!l.data_vencimento.startsWith(selectedMonth)) return false;
      } else {
        const start = customStartDate || '1900-01-01';
        const end = customEndDate || '2100-12-31';
        if (l.data_vencimento < start || l.data_vencimento > end) return false;
      }
      if (erpSearch.trim() !== '') {
        const entName = entidades.find(e => e.id === l.entidade_id)?.nome_razao_social || '';
        return entName.toLowerCase().includes(erpSearch.toLowerCase()) || l.observacoes.toLowerCase().includes(erpSearch.toLowerCase());
      }
      return true;
    });
  }, [lancamentos, conciliacoes, erpSearch, entidades, selectedContaId, periodFilter, selectedMonth, customStartDate, customEndDate]);

  // Funções Auxiliares
  const getEntidadeName = (id: string) => entidades.find(e => e.id === id)?.nome_razao_social || 'Desconhecido';
  
  const valueFormatter = (val: number, type?: 'entrada' | 'saida') => {
    const absVal = Math.abs(val);
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(absVal);
    return (type === 'saida' || (type === undefined && val < 0)) ? `-${formatted}` : formatted;
  };

  const formatShorthandDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${day} ${months[parseInt(parts[1], 10) - 1]}`;
    }
    return dateStr;
  };

  // Lógica de Preview e Mapeamento de CSV
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({ data: '', valor: '', descricao: '', documento: '' });

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setCsvContentText(text);
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
        const newMapping = { data: '', valor: '', descricao: '', documento: '' };
        headers.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes('dat') || lower.includes('venc')) newMapping.data = h;
          if (lower.includes('val') || lower.includes('quant') || lower.includes('amo')) newMapping.valor = h;
          if (lower.includes('desc') || lower.includes('hist') || lower.includes('obs')) newMapping.descricao = h;
          if (lower.includes('doc') || lower.includes('nsu') || lower.includes('id')) newMapping.documento = h;
        });
        setColumnMapping(newMapping);
      }
    };
    reader.readAsText(file);
  };

  // Ações de Conciliação
  const handleImportCSVSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContentText.trim() || !columnMapping.data || !columnMapping.valor || !columnMapping.descricao || !selectedImportContaId) return;
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
        return { data: rowData[columnMapping.data], valor: val, descricao: rowData[columnMapping.descricao], documento: rowData[columnMapping.documento] || '' };
      }).filter(r => r.data && !isNaN(r.valor));
      
      await importCSV({ contaBancariaId: selectedImportContaId, rows: rowsToImport, importMode });
      setCsvContentText(''); setCsvPreviewRows([]); setModalOpen('isImportarCSVOpen', false);
      alert(`${rowsToImport.length} transações importadas com sucesso!`);
    } catch (err: any) { alert('Falha: ' + err.message); }
  };

  const handleUnlink = async (conId: string) => {
    if (confirm('Desvincular conciliação?')) {
      try { await unlinkConciliacao({ conciliacaoId: conId, usuarioId: currentUserId }); } catch (err: any) { alert('Erro: ' + err.message); }
    }
  };

  const executeConciliationLink = async () => {
    if (!selectedTransacaoForConciliationId || !selectedLancamentoForConciliationId) return;
    try {
      const tx = transacoes.find(t => t.id === selectedTransacaoForConciliationId);
      const lanc = lancamentos.find(l => l.id === selectedLancamentoForConciliationId);
      if (!tx || !lanc) return;
      const newCon = await linkConciliacao({ lancamentoId: lanc.id, transacaoBancoId: tx.id, usuarioId: currentUserId });
      
      const erpVal = lanc.tipo === 'saida' ? -lanc.valor_previsto : lanc.valor_previsto;
      const diff = tx.valor - erpVal;
      
      if (Math.abs(diff) > 0.01) {
        setCurrentConciliationId(newCon.id); 
        setCurrentConciliationDifferenceValue(diff);
        setModalOpen('isVincularConciliarOpen', false); 
        setModalOpen('isClassificarDiferencaOpen', true);
      } else {
        setModalOpen('isVincularConciliarOpen', false);
      }
    } catch (err: any) { alert('Erro: ' + err.message); }
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
    } catch (err: any) { alert('Erro: ' + err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 uppercase">Concíliação Bancária</h1>
          <p className="text-sm text-neutral-500 mt-1 font-medium italic">"Sincronize a Verdade Bancária com suas previsões financeiras."</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 h-12 items-center">
            {contas.map(c => (
              <button key={c.id} onClick={() => setSelectedContaId(c.id)} className={`px-4 py-2 font-black text-[10px] uppercase tracking-widest rounded-lg transition-all h-full ${selectedContaId === c.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>{c.nome}</button>
            ))}
          </div>
          <button onClick={() => setModalOpen('isImportarCSVOpen', true)} className="px-6 py-2 bg-neutral-900 text-white font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-neutral-800 transition-all shadow-md flex items-center gap-2 h-12"><FileSpreadsheet className="w-4 h-4" /> Importar CSV</button>
        </div>
      </div>

      <div className="p-5 bg-primary/5 border-2 border-primary/10 rounded-2xl flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-white border border-primary/20 flex items-center justify-center shrink-0"><HelpCircle className="w-6 h-6 text-primary" /></div>
        <div className="space-y-1"><h4 className="text-xs font-black text-primary uppercase tracking-widest">Como conciliar?</h4><p className="text-[10px] font-medium text-neutral-600 leading-relaxed uppercase tracking-tight">1. Selecione a <strong>Conta</strong>. 2. Filtre o <strong>Mês</strong>. 3. Selecione o <strong>Extrato</strong> (Esq). 4. Escolha a <strong>Previsão</strong> (Dir) e clique em <strong>Vincular</strong>.</p></div>
      </div>

      <div className="bg-white border-2 border-neutral-100 p-4 rounded-2xl flex flex-wrap items-center gap-6 shadow-sm">
        <div className="flex items-center gap-3 border-r border-neutral-100 pr-6"><Calendar className="w-4 h-4 text-neutral-400" /><div className="flex bg-neutral-100 p-1 rounded-lg">
          <button onClick={() => setPeriodFilter('month')} className={`px-3 py-1.5 font-black text-[9px] uppercase tracking-widest rounded-md transition-all ${periodFilter === 'month' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500'}`}>Mês</button>
          <button onClick={() => setPeriodFilter('custom')} className={`px-3 py-1.5 font-black text-[9px] uppercase tracking-widest rounded-md transition-all ${periodFilter === 'custom' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500'}`}>Período</button>
        </div></div>
        {periodFilter === 'month' ? (
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="h-10 px-4 bg-neutral-50 border-2 border-neutral-100 rounded-xl text-xs font-bold outline-none" />
        ) : (
          <div className="flex gap-3"><input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="h-10 px-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl text-[10px] font-bold outline-none" /><input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="h-10 px-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl text-[10px] font-bold outline-none" /></div>
        )}
        <div className="flex-1"></div>
        <div className="relative w-64"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300" /><input type="text" placeholder="Pesquisar previsões..." value={erpSearch} onChange={(e) => setErpSearch(e.target.value)} className="w-full h-10 pl-9 pr-4 bg-neutral-50 border-2 border-neutral-100 rounded-xl text-[10px] font-bold focus:border-primary outline-none" /></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-neutral-200 flex justify-between bg-neutral-50/50"><div className="flex gap-2 items-center"><Building className="w-4 h-4 text-primary" /><span className="font-black text-[10px] uppercase">Extrato do Banco</span></div></div>
          <div className="p-5 space-y-3 max-h-[600px] overflow-y-auto">{bankStatements.length === 0 ? <div className="py-20 text-center opacity-60"><Upload className="w-8 h-8 mx-auto mb-4" /><p className="text-[10px] font-black uppercase">Nenhuma transação</p></div> : 
            bankStatements.map(tx => (
              <div key={tx.id} onClick={() => !tx.status_conciliacao && setSelectedTransacaoForConciliationId(tx.id)} className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${tx.status_conciliacao ? 'bg-white opacity-50' : selectedTransacaoForConciliationId === tx.id ? 'border-primary bg-primary/5' : 'border-neutral-100 bg-white hover:border-neutral-300 cursor-pointer shadow-sm'}`}>
                <div className="w-16 font-black text-[10px] text-neutral-500">{tx.data_transacao.split('-').reverse().slice(0,2).join('/')}</div>
                <div className="flex-1 min-w-0 pr-4"><p className={`text-sm font-black truncate ${tx.status_conciliacao ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>{tx.descricao_banco}</p><span className="text-[9px] uppercase text-neutral-400">{tx.status_conciliacao ? 'Conciliado' : tx.valor < 0 ? 'Débito' : 'Crédito'}</span></div>
                <div className="text-right flex items-center gap-4"><div><p className={`text-sm font-black ${tx.status_conciliacao ? 'line-through' : tx.valor < 0 ? 'text-alert-red' : 'text-bank-truth-green'}`}>{valueFormatter(tx.valor)}</p></div>{tx.status_conciliacao ? <button onClick={(e) => { e.stopPropagation(); handleUnlink(tx.conciliation!.id); }} className="p-2 hover:bg-red-50 text-neutral-400 hover:text-alert-red rounded-lg"><Unlink className="w-4 h-4" /></button> : <ChevronRight className="w-4 h-4 text-primary" />}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-neutral-200 flex justify-between bg-neutral-50/50"><div className="flex gap-2 items-center"><Coins className="w-4 h-4 text-amber-500" /><span className="font-black text-[10px] uppercase">Previsões do Sistema</span></div></div>
          <div className="p-5 space-y-3 max-h-[600px] overflow-y-auto">{availableLaunches.length === 0 ? <div className="py-20 text-center opacity-40 uppercase font-black text-[10px]">Totalmente Conciliado</div> : 
            availableLaunches.map(l => (
              <div key={l.id} className="bg-white border-2 border-neutral-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="w-16 font-black text-[10px] text-neutral-500">{l.data_vencimento.split('-').reverse().slice(0,2).join('/')}</div>
                <div className="flex-1 pr-4"><p className="text-sm font-black truncate">{getEntidadeName(l.entidade_id)}</p><span className="text-[9px] uppercase text-neutral-400">{l.observacoes}</span></div>
                <div className="text-right flex items-center gap-5"><div><p className="text-sm font-black">{valueFormatter(l.valor_previsto, l.tipo)}</p></div><button onClick={() => { setSelectedLancamentoForConciliationId(l.id); setModalOpen('isVincularConciliarOpen', true); }} className="px-4 py-2 font-black text-[9px] uppercase tracking-widest rounded-lg flex items-center gap-2 bg-neutral-900 text-white shadow-sm"><Link2 className="w-3.5 h-3.5" /> Vincular</button></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isImportarCSVOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen('isImportarCSVOpen', false)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
            <motion.form initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onSubmit={handleImportCSVSubmit} className="bg-white w-full max-w-[520px] rounded-3xl shadow-2xl border-2 border-neutral-100 flex flex-col relative z-20 overflow-hidden">
              <header className="px-8 py-6 border-b bg-neutral-50/50 flex justify-between"><div><h2 className="text-sm font-black uppercase">Importar Extrato</h2><p className="text-[9px] text-primary uppercase">Escolha a natureza do arquivo</p></div><button type="button" onClick={() => setModalOpen('isImportarCSVOpen', false)}><X className="w-5 h-5" /></button></header>
              <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-neutral-900">1. Natureza da Importação</h3>
                  <div className="flex bg-neutral-100 p-1 rounded-xl h-12">
                    <button type="button" onClick={() => setImportMode('ambos')} className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${importMode === 'ambos' ? 'bg-white text-primary shadow-sm' : 'text-neutral-400'}`}>Ambos (+/-)</button>
                    <button type="button" onClick={() => setImportMode('entrada')} className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${importMode === 'entrada' ? 'bg-white text-bank-truth-green shadow-sm' : 'text-neutral-400'}`}>Entradas (+)</button>
                    <button type="button" onClick={() => setImportMode('saida')} className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${importMode === 'saida' ? 'bg-white text-alert-red shadow-sm' : 'text-neutral-400'}`}>Saídas (-)</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-neutral-400 uppercase">Conta Destino</label><select value={selectedImportContaId} onChange={(e) => setSelectedImportContaId(e.target.value)} className="w-full h-11 bg-white border-2 border-neutral-200 rounded-xl px-3 text-[10px] font-black uppercase">{contas.map(cnt => <option key={cnt.id} value={cnt.id}>{cnt.nome_banco}</option>)}</select></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-neutral-900">2. Mapeamento de Colunas</h3>
                  {!csvContentText ? (
                    <div onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed rounded-3xl p-10 text-center cursor-pointer bg-neutral-50"><input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} accept=".csv" className="hidden" /><Upload className="w-7 h-7 mx-auto text-primary mb-2" /><p className="text-[9px] font-black uppercase">Clique para selecionar o CSV</p></div>
                  ) : (
                    <div className="space-y-6 animate-fade-in bg-white border-2 border-neutral-100 rounded-3xl p-6 shadow-sm">
                      <div className="space-y-4">
                        {[{f:'data',l:'Data',i:Calendar},{f:'valor',l:'Valor',i:Coins},{f:'descricao',l:'Descrição',i:FileSpreadsheet},{f:'documento',l:'Doc/NSU (Opc)',i:Hash}].map(it => (
                          <div key={it.f} className="flex items-center gap-4">
                            <div className="w-32 shrink-0 flex items-center gap-2 text-[9px] font-black text-neutral-600 uppercase">
                              <it.i className="w-3 h-3" />
                              {it.l}
                            </div>
                            <select value={columnMapping[it.f as keyof typeof columnMapping]} onChange={(e) => setColumnMapping(p => ({...p,[it.f]:e.target.value}))} className="flex-1 h-10 bg-neutral-50 border-2 rounded-xl px-3 text-[9px] font-black uppercase outline-none focus:border-primary">
                              <option value="">Não mapear</option>
                              {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-neutral-50">
                        <h3 className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">Preview dos Lançamentos</h3>
                        <div className="border border-neutral-100 rounded-xl overflow-hidden bg-neutral-50/50">
                          <table className="w-full text-[8px] text-left">
                            <thead className="bg-neutral-100 border-b border-neutral-100">
                              <tr>
                                {Object.entries(columnMapping).filter(([_, v]) => v).map(([k, h]) => (
                                  <th key={k} className="p-2 font-black uppercase text-neutral-500">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {csvPreviewRows.map((row, i) => (
                                <tr key={i} className="border-b border-neutral-100/50 last:border-0">
                                  {Object.values(columnMapping).filter(v => v).map((h: string) => (
                                    <td key={h} className="p-2 font-bold text-neutral-600 truncate max-w-[120px] uppercase">
                                      {h === columnMapping.valor ? (
                                        <span className={parseFloat(row[h]?.toString().replace(',', '.') || '0') < 0 ? 'text-alert-red' : 'text-bank-truth-green'}>
                                          {row[h]}
                                        </span>
                                      ) : row[h]}
                                    </td>
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
              </div>
              <footer className="px-8 py-6 border-t bg-neutral-50/50 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen('isImportarCSVOpen', false)} className="px-6 text-[10px] font-black uppercase text-neutral-400">Cancelar</button><Button type="submit" disabled={!csvContentText || !columnMapping.data || !columnMapping.valor} className="bg-neutral-900">Importar Agora</Button></footer>
            </motion.form>
          </div>
        )}

        {isVincularConciliarOpen && selectedTxForWorkspace && (
          <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen('isVincularConciliarOpen', false)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} className="w-full md:w-[520px] h-full bg-white shadow-2xl flex flex-col relative z-20">
              <header className="px-6 py-5 border-b bg-neutral-50 flex justify-between"><h2 className="text-lg font-black uppercase tracking-tighter">Confirmar Vínculo</h2><button onClick={() => setModalOpen('isVincularConciliarOpen', false)}><X className="w-6 h-6" /></button></header>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="p-5 rounded-2xl border-2 border-neutral-100 bg-neutral-50 space-y-2"><span className="text-[10px] font-black uppercase text-neutral-400">Banco</span><p className="font-black text-xs uppercase">{selectedTxForWorkspace.descricao_banco}</p><p className={`font-black text-xl ${selectedTxForWorkspace.valor < 0 ? 'text-alert-red' : 'text-bank-truth-green'}`}>{valueFormatter(selectedTxForWorkspace.valor)}</p></div>
                <div className="flex justify-center"><Link2 className="w-8 h-8 text-neutral-300" /></div>
                <div className="p-5 rounded-2xl border-2 border-primary bg-primary/5 space-y-2"><span className="text-[10px] font-black uppercase text-primary">Sistema</span><p className="font-black text-xs uppercase">{selectedLancForWorkspace ? getEntidadeName(selectedLancForWorkspace.entidade_id) : 'Selecione uma previsão'}</p><p className="font-black text-xl">{selectedLancForWorkspace ? valueFormatter(selectedLancForWorkspace.valor_previsto, selectedLancForWorkspace.tipo) : '-'}</p></div>
              </div>
              <footer className="p-6 border-t bg-neutral-50 space-y-4">
                <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase">Diferença</span><span className={`font-black text-xs px-4 py-1.5 rounded-full ${Math.abs(draftDifferenceAmount) < 0.01 ? 'bg-emerald-100 text-bank-truth-green' : 'bg-red-100 text-alert-red'}`}>{valueFormatter(draftDifferenceAmount)}</span></div>
                <div className="flex justify-end gap-3"><button onClick={() => setModalOpen('isVincularConciliarOpen', false)} className="px-6 text-[10px] font-black uppercase text-neutral-400">Cancelar</button><Button onClick={executeConciliationLink} className="bg-primary">Confirmar Vínculo</Button></div>
              </footer>
            </motion.div>
          </div>
        )}

        {isClassificarDiferencaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen('isClassificarDiferencaOpen', false)} className="absolute inset-0 bg-black/50 backdrop-blur-xs" />
            <motion.form initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onSubmit={handleClassifyDiffSubmit} className="bg-white w-full max-w-[440px] rounded-3xl shadow-2xl relative z-20">
              <header className="px-6 py-5 border-b bg-neutral-50 flex justify-between"><h2 className="text-sm font-black uppercase">Classificar Diferença</h2><button type="button" onClick={() => setModalOpen('isClassificarDiferencaOpen', false)}><X className="w-5 h-5" /></button></header>
              <div className="p-8 space-y-6">
                <div className="p-4 bg-amber-50 rounded-2xl text-[10px] font-black uppercase text-amber-700 flex gap-3"><AlertTriangle className="w-5 h-5 shrink-0" /><p>Divergência detectada. Identifique a natureza contábil.</p></div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-neutral-400">Valor Residual</label><div className="font-black text-lg text-alert-red">{valueFormatter(currentConciliationDifferenceValue)}</div></div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-neutral-400">Natureza</label><select value={diffType} onChange={(e) => setDiffType(e.target.value as any)} className="w-full h-12 border-2 rounded-2xl px-4 text-xs font-black uppercase"><option value="tarifa">Tarifa Bancária</option><option value="juros">Juros</option><option value="multa">Multa</option><option value="desconto">Desconto</option><option value="ajuste_manual">Ajuste Manual</option></select></div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-neutral-400">Justificativa</label><textarea required rows={3} value={diffJustification} onChange={(e) => setDiffJustification(e.target.value)} className="w-full p-4 border-2 rounded-2xl text-xs font-bold" /></div>
              </div>
              <footer className="px-8 py-6 border-t bg-neutral-50 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen('isClassificarDiferencaOpen', false)} className="text-[10px] font-black uppercase text-neutral-400">Cancelar</button><Button type="submit" className="bg-primary">Salvar Ajuste</Button></footer>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}