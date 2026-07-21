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
  Hash,
  Terminal,
  Activity,
  Zap
} from 'lucide-react';
import { useConciliacao, useContas, useLancamentos, useEntidades } from '../hooks/useData';
import { useUIStore } from '../store/uiStore';
import { TransacaoBanco, LancamentoFinanceiro } from '../types';
import Button from '../components/Button';
import { conciliacoesService } from '../services/conciliacoesService';

export default function Conciliacao() {
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

  const { 
    currentUserId, isImportarCSVOpen, setModalOpen, selectedTransacaoForConciliationId, selectedLancamentoForConciliationId,
    isVincularConciliarOpen, isClassificarDiferencaOpen,
    setSelectedTransacaoForConciliationId, setSelectedLancamentoForConciliationId,
    setCurrentConciliationDifferenceValue, setCurrentConciliationId,
    currentConciliationId, currentConciliationDifferenceValue
  } = useUIStore();

  const [selectedContaId, setSelectedContaId] = useState<string>('');
  const [erpSearch, setErpSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);

  const [csvContentText, setCsvContentText] = useState('');
  const [selectedImportContaId, setSelectedImportContaId] = useState('');
  const [importMode, setImportMode] = useState<'entrada' | 'saida' | 'ambos'>('ambos');
  const [columnMapping, setColumnMapping] = useState({ data: '', valor: '', descricao: '', documento: '' });
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [diffType, setDiffType] = useState<'juros' | 'multa' | 'desconto' | 'tarifa' | 'pagamento_parcial' | 'ajuste_manual'>('tarifa');
  const [diffJustification, setDiffJustification] = useState('');

  useEffect(() => {
    if (contas.length > 0 && !selectedContaId) {
      setSelectedContaId(contas[0].id);
      setSelectedImportContaId(contas[0].id);
    }
  }, [contas, selectedContaId]);

  const addLog = (msg: string) => setDiagnosticLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runHealthCheck = async () => {
    setIsDiagnosticRunning(true);
    setDiagnosticLogs(["Iniciando testes técnicos..."]);
    const result = await conciliacoesService.runDiagnostic();
    setDiagnosticLogs(result.logs);
    setIsDiagnosticRunning(false);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvContentText(text);
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        const sep = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(sep).map(h => h.trim().replace(/"/g, ''));
        setCsvHeaders(headers);
        const preview = lines.slice(1, 6).map(line => {
          const parts = line.split(sep).map(p => p.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((h, i) => { row[h] = parts[i]; });
          return row;
        });
        setCsvPreviewRows(preview);
        const mapping = { data: '', valor: '', descricao: '', documento: '' };
        headers.forEach(h => {
          const l = h.toLowerCase();
          if (l.includes('dat')) mapping.data = h;
          if (l.includes('val')) mapping.valor = h;
          if (l.includes('desc')) mapping.descricao = h;
          if (l.includes('doc')) mapping.documento = h;
        });
        setColumnMapping(mapping);
      }
    };
    reader.readAsText(file);
  };

  const handleImportCSVSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    addLog("Iniciando processo de importação...");
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
      addLog("✅ Importação concluída!");
      setModalOpen('isImportarCSVOpen', false);
    } catch (err: any) {
      addLog(`❌ ERRO: ${err.message}`);
      alert('Erro na importação. Veja o console de diagnóstico.');
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

  const handleUnlink = async (conId: string) => {
    if (confirm('Desvincular conciliação?')) {
      try { await unlinkConciliacao({ conciliacaoId: conId, usuarioId: currentUserId }); } catch (err: any) { alert('Erro: ' + err.message); }
    }
  };

  const bankStatements = useMemo(() => {
    return transacoes.filter(tx => tx.conta_bancaria_id === selectedContaId && tx.data_transacao.startsWith(selectedMonth))
      .map(tx => ({ ...tx, conciliation: conciliacoes.find(c => c.transacao_banco_id === tx.id) || null }));
  }, [transacoes, selectedContaId, selectedMonth, conciliacoes]);

  const availableLaunches = useMemo(() => {
    return lancamentos.filter(l => l.conta_bancaria_id === selectedContaId && !conciliacoes.some(c => c.lancamento_id === l.id) && l.data_vencimento.startsWith(selectedMonth));
  }, [lancamentos, conciliacoes, selectedContaId, selectedMonth]);

  const selectedTxForWorkspace = useMemo(() => transacoes.find(t => t.id === selectedTransacaoForConciliationId) || null, [selectedTransacaoForConciliationId, transacoes]);
  const selectedLancForWorkspace = useMemo(() => lancamentos.find(l => l.id === selectedLancamentoForConciliationId) || null, [selectedLancamentoForConciliationId, lancamentos]);

  const valueFormatter = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 pb-40">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-neutral-900">Conciliação de Verdade</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">Eliminando a adivinhação com diagnóstico em tempo real</p>
        </div>
        <div className="flex gap-3">
          <button onClick={runHealthCheck} disabled={isDiagnosticRunning} className="px-6 h-12 bg-white border-2 border-neutral-100 text-neutral-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-neutral-50 transition-all flex items-center gap-2">
            {isDiagnosticRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-500" />}
            Testar Conexão
          </button>
          <button onClick={() => setModalOpen('isImportarCSVOpen', true)} className="px-8 h-12 bg-neutral-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-black transition-all flex items-center gap-2 shadow-xl"><FileSpreadsheet className="w-4 h-4" /> Importar CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-neutral-100 rounded-3xl overflow-hidden shadow-sm flex flex-col">
          <header className="px-6 py-4 border-b bg-neutral-50/50 flex justify-between items-center"><span className="text-[10px] font-black uppercase text-neutral-400">Extrato Bancário</span><select value={selectedContaId} onChange={(e) => setSelectedContaId(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase outline-none cursor-pointer">{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></header>
          <div className="p-6 space-y-3 max-h-[500px] overflow-y-auto">
            {bankStatements.length === 0 ? <div className="py-20 text-center opacity-30 uppercase font-black text-xs">Nenhum dado</div> : bankStatements.map(tx => (
              <div key={tx.id} onClick={() => !tx.status_conciliacao && setSelectedTransacaoForConciliationId(tx.id)} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${tx.status_conciliacao ? 'opacity-40 grayscale bg-neutral-50' : selectedTransacaoForConciliationId === tx.id ? 'border-primary bg-primary/5' : 'border-neutral-100 hover:border-neutral-200 cursor-pointer'}`}>
                <div><p className="text-xs font-black uppercase">{tx.descricao_banco}</p><span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{tx.data_transacao.split('-').reverse().join('/')}</span></div>
                <div className="flex items-center gap-4"><div className={`text-sm font-black font-mono ${tx.valor < 0 ? 'text-alert-red' : 'text-bank-truth-green'}`}>{valueFormatter(tx.valor)}</div>{tx.status_conciliacao && <button onClick={(e) => { e.stopPropagation(); handleUnlink(tx.conciliation!.id); }} className="p-2 hover:bg-red-50 text-neutral-400 hover:text-alert-red rounded-lg"><Unlink className="w-4 h-4" /></button>}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border-2 border-neutral-100 rounded-3xl overflow-hidden shadow-sm flex flex-col">
          <header className="px-6 py-4 border-b bg-neutral-50/50 flex justify-between items-center"><span className="text-[10px] font-black uppercase text-neutral-400">Previsões do Sistema</span><input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase outline-none" /></header>
          <div className="p-6 space-y-3 max-h-[500px] overflow-y-auto">
            {availableLaunches.length === 0 ? <div className="py-20 text-center opacity-30 uppercase font-black text-xs">Totalmente Conciliado</div> : availableLaunches.map(l => (
              <div key={l.id} className="p-4 rounded-2xl border-2 border-neutral-100 flex items-center justify-between bg-neutral-50/30">
                <div><p className="text-xs font-black uppercase">{entidades.find(e => e.id === l.entidade_id)?.nome_razao_social || 'N/A'}</p><span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{l.data_vencimento.split('-').reverse().join('/')} • {l.observacoes}</span></div>
                <div className="flex items-center gap-4"><div className="text-sm font-black font-mono">{valueFormatter(l.valor_previsto)}</div><button onClick={() => { setSelectedLancamentoForConciliationId(l.id); setModalOpen('isVincularConciliarOpen', true); }} className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center hover:bg-black transition-all"><Link2 className="w-4 h-4" /></button></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Console */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 lg:pl-24 pointer-events-none">
        <div className="max-w-7xl mx-auto pointer-events-auto">
          <div className="bg-neutral-900 border-2 border-neutral-800 rounded-t-3xl shadow-2xl overflow-hidden">
            <header className="px-6 py-3 border-b border-neutral-800 flex justify-between items-center bg-black/50">
              <div className="flex items-center gap-2"><Terminal className="w-4 h-4 text-emerald-500" /><span className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Senior Diagnostic Console</span></div>
              <button onClick={() => setDiagnosticLogs([])} className="text-[8px] font-black text-neutral-500 uppercase hover:text-white transition-colors">Limpar Logs</button>
            </header>
            <div className="p-4 h-32 overflow-y-auto font-mono text-[10px] space-y-1 scrollbar-thin">
              {diagnosticLogs.length === 0 ? <p className="text-neutral-600 italic">Aguardando atividades...</p> : 
                diagnosticLogs.map((log, i) => (
                  <div key={i} className={`flex gap-3 ${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-emerald-400' : 'text-neutral-400'}`}>
                    <span className="opacity-30">[{i+1}]</span>
                    <span>{log}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* Modais */}
      <AnimatePresence>
        {isImportarCSVOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen('isImportarCSVOpen', false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.form initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onSubmit={handleImportCSVSubmit} className="bg-white w-full max-w-[550px] rounded-[32px] shadow-2xl border-2 border-neutral-100 flex flex-col relative z-20 overflow-hidden">
              <header className="px-8 py-6 border-b bg-neutral-50/50 flex justify-between"><div><h2 className="text-sm font-black uppercase">Importar Extrato</h2><p className="text-[9px] text-primary uppercase font-bold tracking-widest">Sincronização de Verdade Bancária</p></div><button type="button" onClick={() => setModalOpen('isImportarCSVOpen', false)}><X className="w-5 h-5" /></button></header>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
                <div className="space-y-4">
                  <div className="flex bg-neutral-100 p-1 rounded-xl h-12">
                    {['ambos','entrada','saida'].map(m => (
                      <button key={m} type="button" onClick={() => setImportMode(m as any)} className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${importMode === m ? 'bg-white text-primary shadow-sm' : 'text-neutral-400'}`}>{m}</button>
                    ))}
                  </div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-neutral-400 uppercase">Conta Destino</label><select value={selectedImportContaId} onChange={(e) => setSelectedImportContaId(e.target.value)} className="w-full h-12 bg-white border-2 border-neutral-100 rounded-xl px-4 text-xs font-black uppercase">{contas.map(cnt => <option key={cnt.id} value={cnt.id}>{cnt.nome_banco}</option>)}</select></div>
                </div>
                {!csvContentText ? (
                  <div onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed rounded-3xl p-12 text-center cursor-pointer bg-neutral-50 hover:border-primary/30 transition-all"><input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} accept=".csv" className="hidden" /><Upload className="w-8 h-8 mx-auto text-primary mb-3" /><p className="text-[10px] font-black uppercase tracking-widest">Clique para selecionar o CSV</p></div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-3">
                      {[{f:'data',l:'Coluna Data',i:Calendar},{f:'valor',l:'Coluna Valor',i:Coins},{f:'descricao',l:'Coluna Descrição',i:FileSpreadsheet},{f:'documento',l:'Coluna Doc/NSU',i:Hash}].map(it => (
                        <div key={it.f} className="flex items-center gap-4 bg-neutral-50 p-2 rounded-xl border border-neutral-100">
                          <div className="w-32 shrink-0 flex items-center gap-2 text-[9px] font-black text-neutral-500 uppercase"><it.i className="w-3.5 h-3.5" />{it.l}</div>
                          <select value={columnMapping[it.f as keyof typeof columnMapping]} onChange={(e) => setColumnMapping(p => ({...p,[it.f]:e.target.value}))} className="flex-1 h-9 bg-white border border-neutral-200 rounded-lg px-3 text-[10px] font-bold uppercase outline-none focus:border-primary"><option value="">Não mapear</option>{csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}</select>
                        </div>
                      ))}
                    </div>
                    <div className="border border-neutral-100 rounded-2xl overflow-hidden">
                      <table className="w-full text-[9px] text-left">
                        <thead className="bg-neutral-100"><tr>{Object.values(columnMapping).filter(v=>v).map(h=><th key={h} className="p-2 font-black uppercase">{h}</th>)}</tr></thead>
                        <tbody>{csvPreviewRows.map((row, i) => (
                          <tr key={i} className="border-b border-neutral-50">{Object.values(columnMapping).filter(v=>v).map(h=><td key={h} className="p-2 font-bold">{row[h]}</td>)}</tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <footer className="px-10 py-8 border-t bg-neutral-50/50 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen('isImportarCSVOpen', false)} className="px-6 text-[10px] font-black uppercase text-neutral-400">Cancelar</button><Button type="submit" disabled={!csvContentText || !columnMapping.data || !columnMapping.valor}>Confirmar Importação</Button></footer>
            </motion.form>
          </div>
        )}

        {isVincularConciliarOpen && selectedTxForWorkspace && selectedLancForWorkspace && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen('isVincularConciliarOpen', false)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} className="w-full md:w-[500px] h-full bg-white shadow-2xl flex flex-col relative z-20">
              <header className="px-8 py-6 border-b bg-neutral-50 flex justify-between items-center"><h2 className="text-lg font-black uppercase tracking-tighter">Conciliar Itens</h2><button onClick={() => setModalOpen('isVincularConciliarOpen', false)}><X className="w-6 h-6" /></button></header>
              <div className="flex-1 p-8 space-y-6">
                <div className="p-6 rounded-[24px] border-2 border-neutral-100 bg-neutral-50/50 space-y-2"><span className="text-[10px] font-black uppercase text-neutral-400">Origem Banco</span><p className="font-black text-xs uppercase">{selectedTxForWorkspace.descricao_banco}</p><p className="font-black text-xl text-neutral-900">{valueFormatter(selectedTxForWorkspace.valor)}</p></div>
                <div className="p-6 rounded-[24px] border-2 border-primary/20 bg-primary/5 space-y-2"><span className="text-[10px] font-black uppercase text-primary">Previsão ERP</span><p className="font-black text-xs uppercase">{getEntidadeName(selectedLancForWorkspace.entidade_id)}</p><p className="font-black text-xl text-primary">{valueFormatter(selectedLancForWorkspace.valor_previsto)}</p></div>
              </div>
              <footer className="p-8 border-t bg-neutral-50">
                <div className="flex justify-between items-center mb-4"><span className="text-[10px] font-black uppercase text-neutral-400">Diferença</span><span className="text-xs font-black px-4 py-1.5 rounded-full bg-neutral-900 text-white">{valueFormatter(draftDifferenceAmount)}</span></div>
                <Button onClick={executeConciliationLink} className="w-full">Sincronizar Agora</Button>
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
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-neutral-400">Valor Residual</label><div className="font-black text-lg text-alert-red">{valueFormatter(currentConciliationDifferenceValue)}</div></div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-neutral-400">Natureza</label><select value={diffType} onChange={(e) => setDiffType(e.target.value as any)} className="w-full h-12 border-2 rounded-2xl px-4 text-xs font-black uppercase"><option value="tarifa">Tarifa Bancária</option><option value="juros">Juros</option><option value="multa">Multa</option><option value="desconto">Desconto</option><option value="ajuste_manual">Ajuste Manual</option></select></div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-neutral-400">Justificativa</label><textarea required rows={3} value={diffJustification} onChange={(e) => setDiffJustification(e.target.value)} className="w-full p-4 border-2 rounded-2xl text-xs font-bold" /></div>
              </div>
              <footer className="px-8 py-6 border-t bg-neutral-50 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen('isClassificarDiferencaOpen', false)} className="text-[10px] font-black uppercase text-neutral-400">Cancelar</button><Button type="submit">Salvar Ajuste</Button></footer>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}