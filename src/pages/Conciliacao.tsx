import React, { useState, useMemo, useRef } from 'react';
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
  ArrowUpCircle
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
  
  // CSV Import Temp States
  const [csvContentText, setCsvContentText] = useState('');
  const [selectedImportContaId, setSelectedImportContaId] = useState('conta_itau');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Classify Difference Modal Temp states
  const [diffType, setDiffType] = useState<'juros' | 'multa' | 'desconto' | 'tarifa' | 'pagamento_parcial' | 'ajuste_manual'>('tarifa');
  const [diffJustification, setDiffJustification] = useState('');

  // Resolved list of bank statement records for the selected bank account de-duplicated
  const bankStatements = useMemo(() => {
    return transacoes
      .filter(tx => tx.conta_bancaria_id === selectedContaId)
      .map(tx => {
        const con = conciliacoes.find(c => c.transacao_banco_id === tx.id);
        const matchedLaunch = con ? lancamentos.find(l => l.id === con.lancamento_id) : null;
        return {
          ...tx,
          conciliation: con || null,
          matchedLaunch
        };
      });
  }, [transacoes, selectedContaId, conciliacoes, lancamentos]);

  // Selected matching forecasts (unreconciled forecasts compatible with the current transaction context)
  const availableLaunches = useMemo(() => {
    return lancamentos
      .filter(l => {
        // filter out already matched launches
        const isMatched = conciliacoes.some(con => con.lancamento_id === l.id);
        if (isMatched) return false;

        // search query filter
        if (erpSearch.trim() !== '') {
          const entName = entidades.find(e => e.id === l.entidade_id)?.nome_razao_social || '';
          return entName.toLowerCase().includes(erpSearch.toLowerCase()) || 
                 l.observacoes.toLowerCase().includes(erpSearch.toLowerCase());
        }

        return true;
      });
  }, [lancamentos, conciliacoes, erpSearch, entidades]);

  // Map entity names for previsions
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

  // Human Shorthand date parsing (turns YYYY-MM-DD into e.g. "24 Out" or "14 Nov")
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

  // Full Shorthand date representation e.g. "14 Nov 2026"
  const formatFullShorthandDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      const day = parseInt(parts[2], 10);
      const monthNum = parseInt(parts[1], 10);
      const year = parts[0];
      const months = ['Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out'];
      // Just map correctly or keep simplified
      const monthsFull = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${day} ${monthsFull[monthNum - 1] || ''} ${year}`;
    }
    return dateStr;
  };

  // Specific transaction subtitle labeling to match image 100%
  const getTxSubtext = (tx: any) => {
    if (tx.id === 'tx_exact_1') return 'Cpf/Cnpj: 12.345.678/0001-90';
    if (tx.id === 'tx_exact_2') return 'Empresa Alpha LTDA';
    if (tx.id === 'tx_exact_3') return 'Enel Distribuição';
    if (tx.id === 'tx_exact_4') return 'Conciliado automaticamente';
    if (tx.id === 'tx_banco_diferenca') return 'FORNECEDOR TECH SERVICES LTDA • CNPJ 12.345.678/0001-90';
    return tx.valor < 0 ? 'Débito Bancário Residual' : 'Crédito Recebido Residual';
  };

  // Handle Drag & Drop of CSV Files
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

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setCsvContentText(text);
    };
    reader.readAsText(file);
  };

  // Import Statement Handler (CSV Upload)
  const handleImportCSVSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContentText.trim()) return;

    try {
      // Simple parser of semicolon separated lines: date(YYYY-MM-DD);valor;descricao;movimento('debito'|'credito')
      const lines = csvContentText.split('\n');
      const rowsToImport: any[] = [];

      lines.forEach((line, index) => {
        if (!line.trim() || index === 0) return; // Skip headers or empty lines
        const parts = line.split(';');
        if (parts.length >= 4) {
          const date = parts[0].trim();
          const valStr = parts[1].trim().replace(',', '.');
          const val = parseFloat(valStr);
          const desc = parts[2].trim();
          const type = parts[3].trim() as 'debito' | 'credito';
          rowsToImport.push({
            data_transacao: date,
            valor: val,
            descricao_banco: desc,
            tipo_movimento: type,
            hash_transacao: `imported_${Date.now()}_idx${index}_hash`
          });
        }
      });

      if (rowsToImport.length === 0) {
        alert('Formato de CSV inválido! Veja o formato sugerido ou clique em "Carregar Exemplo".');
        return;
      }

      await importCSV({ contaBancariaId: selectedImportContaId, rows: rowsToImport });
      setCsvContentText('');
      setModalOpen('isImportarCSVOpen', false);
    } catch (err: any) {
      alert('Falha ao processar arquivo: ' + err.message);
    }
  };

  // CSV paste recommendation mock
  const fillSampleCSV = () => {
    const sample = `Data;Valor;Descricao;Movimento
2026-10-24;-45,50;TARIFA MANUT CADASTRO SECTOR;debito
2026-10-25;12450,00;TED RECEBIDA IMPORT MULTI;credito
2026-10-26;-12500,00;PGTO FORNECEDOR TECH SERVICES LTDA;debito`;
    setCsvContentText(sample);
  };

  // Link Dialog launch
  const handleOpenLinkWorkspace = (tx: TransacaoBanco) => {
    setSelectedTransacaoForConciliationId(tx.id);
    setSelectedLancamentoForConciliationId(null);
    setModalOpen('isVincularConciliarOpen', true);
  };

  // ERP Item selected from Workspace
  const handleSelectERPItemForLink = (lanc: LancamentoFinanceiro) => {
    setSelectedLancamentoForConciliationId(lanc.id);
  };

  // Confirmation linking
  const executeConciliationLink = async () => {
    if (!selectedTransacaoForConciliationId || !selectedLancamentoForConciliationId) return;

    try {
      const tx = transacoes.find(t => t.id === selectedTransacaoForConciliationId);
      const lanc = lancamentos.find(l => l.id === selectedLancamentoForConciliationId);

      if (!tx || !lanc) return;

      // Create Match Link
      const newCon = await linkConciliacao({
        lancamentoId: lanc.id,
        transacaoBancoId: tx.id,
        usuarioId: currentUserId
      });

      // Calculate translation mismatch
      const txVal = tx.valor;
      const erpVal = lanc.tipo === 'saida' ? -lanc.valor_previsto : lanc.valor_previsto;
      const differenceAmount = txVal - erpVal;

      if (Math.abs(differenceAmount) > 0.01) {
        // Discrepancy detected! Opens classification modal interceptor
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
      alert('Erro ao vincular conciliação: ' + err.message);
    }
  };

  // Difference adjustment classification submit
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
      alert('Erro ao classificar diferença: ' + err.message);
    }
  };

  // Unlinkmatch function
  const handleUnlink = async (conId: string) => {
    if (confirm('Deseja realmente desvincular esta conciliação? Isso reabrirá o lançamento sistêmico e retornará a transação do banco ao estado pendente.')) {
      try {
        await unlinkConciliacao({ conciliacaoId: conId, usuarioId: currentUserId });
      } catch (err: any) {
        alert('Erro ao desvincular: ' + err.message);
      }
    }
  };

  const selectedTxForWorkspace = useMemo(() => {
    return transacoes.find(t => t.id === selectedTransacaoForConciliationId) || null;
  }, [selectedTransacaoForConciliationId, transacoes]);

  const selectedLancForWorkspace = useMemo(() => {
    return lancamentos.find(l => l.id === selectedLancamentoForConciliationId) || null;
  }, [selectedLancamentoForConciliationId, lancamentos]);

  // Math calculated difference display
  const draftDifferenceAmount = useMemo(() => {
    if (!selectedTxForWorkspace || !selectedLancForWorkspace) return 0;
    const txVal = selectedTxForWorkspace.valor;
    const erpVal = selectedLancForWorkspace.tipo === 'saida' ? -selectedLancForWorkspace.valor_previsto : selectedLancForWorkspace.valor_previsto;
    return txVal - erpVal;
  }, [selectedTxForWorkspace, selectedLancForWorkspace]);

  return (
    <div className="space-y-6">
      {/* Header aligned elegantly */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-900">Concíliação Bancária</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1 font-medium">
            Sincronize a Verdade Bancária com suas previsões financeiras.
          </p>
        </div>

        {/* Bank pills switcher in top right of section */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-neutral-100 dark:bg-neutral-100 p-1 rounded-xl border border-neutral-200 dark:border-neutral-200">
            <button 
              type="button" 
              onClick={() => setSelectedContaId('conta_itau')}
              className={`px-4 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer ${
                selectedContaId === 'conta_itau' 
                  ? 'bg-white dark:bg-white text-neutral-900 dark:text-neutral-900 shadow-xs border border-neutral-300/30' 
                  : 'text-neutral-500 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-900'
              }`}
            >
              Itaú (0452)
            </button>
            <button 
              type="button" 
              onClick={() => setSelectedContaId('conta_bradesco')}
              className={`px-4 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer ${
                selectedContaId === 'conta_bradesco' 
                  ? 'bg-white dark:bg-white text-neutral-900 dark:text-neutral-900 shadow-xs border border-neutral-300/30' 
                  : 'text-neutral-500 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-900'
              }`}
            >
              Bradesco (1290)
            </button>
          </div>

          <button 
            type="button"
            onClick={() => setModalOpen('isImportarCSVOpen', true)}
            className="px-4 py-2 bg-[#795900] dark:bg-[#795900] text-white dark:text-white font-extrabold text-xs rounded-lg hover:bg-opacity-90 transition-all shadow-md flex items-center gap-1.5 h-10 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Importar CSV
          </button>
        </div>
      </div>

      {/* Split Workspace Layout Side-by-Side (High-End UI) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        
        {/* Left Half: EXTRATO DO BANCO */}
        <div className="bg-white dark:bg-white border border-neutral-200 dark:border-neutral-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-200 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-[#795900] dark:text-[#795900]" />
              <span className="font-extrabold text-xs text-neutral-800 dark:text-neutral-800 uppercase tracking-widest">🏦 Extrato do Banco</span>
            </div>
            <span className="text-[10px] font-extrabold bg-neutral-100 border border-neutral-200 dark:bg-neutral-100 dark:border-neutral-200 text-neutral-600 dark:text-neutral-600 px-2.5 py-1 rounded-full uppercase tracking-wider select-none">
              Dados Inalteráveis
            </span>
          </div>

          {/* List items representation replacing raw Table - Styled as separated card tiles with fine-tuned contrast */}
          <div className="p-5 space-y-3.5 max-h-[600px] overflow-y-auto bg-neutral-50/40 dark:bg-neutral-50/40">
            {bankStatements.length === 0 ? (
              <div className="py-12 px-6 text-center text-neutral-500 dark:text-neutral-500 text-xs space-y-2">
                <Upload className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-300" />
                <p>Nenhuma transação financeira disponível nesta conta.</p>
                <button 
                  onClick={() => setModalOpen('isImportarCSVOpen', true)}
                  className="text-primary font-bold hover:underline"
                >
                  Importar extrato em formato .CSV agora
                </button>
              </div>
            ) : (
              bankStatements.map(tx => {
                const isReconciled = tx.status_conciliacao;
                const isSelected = selectedTransacaoForConciliationId === tx.id;
                const txSub = getTxSubtext(tx);

                return (
                  <div 
                    key={tx.id}
                    onClick={() => {
                      if (!isReconciled) {
                        handleOpenLinkWorkspace(tx);
                      }
                    }}
                    className={`p-4 rounded-xl border flex items-center justify-between transition-all select-none relative ${
                      isReconciled 
                        ? 'bg-white dark:bg-white border-neutral-200 dark:border-neutral-200 opacity-60' 
                        : isSelected
                          ? 'bg-white dark:bg-white border-2 border-[#795900] dark:border-[#795900] shadow-md'
                          : 'bg-white dark:bg-white border-neutral-200 dark:border-neutral-200 hover:border-neutral-350 dark:hover:border-neutral-300 cursor-pointer shadow-xs'
                    }`}
                  >
                    {/* Plain Date Column (No heavy badge, for premium minimalist styling) */}
                    <div className="w-16 shrink-0 flex items-center pr-2">
                      <span className="font-extrabold text-xs text-neutral-500 dark:text-neutral-500">
                        {formatShorthandDate(tx.data_transacao)}
                      </span>
                    </div>

                    {/* Original description & Sub-text */}
                    <div className="flex-1 min-w-0 pr-4">
                      <p className={`text-sm font-extrabold truncate ${
                        isReconciled 
                          ? 'line-through text-neutral-400 dark:text-neutral-500' 
                          : 'text-neutral-900 dark:text-neutral-900'
                      }`}>
                        {tx.descricao_banco}
                      </p>
                      
                      <div className="flex items-center gap-1.5 mt-1 select-all">
                        {isReconciled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#2e7d32] font-extrabold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2e7d32] animate-pulse" />
                            {txSub}
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-500 truncate tracking-wide font-medium">
                            {txSub}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Value alignment & Actions */}
                    <div className="text-right shrink-0 flex items-center gap-4">
                      <div>
                        <p className={`text-sm font-extrabold leading-none ${
                          isReconciled 
                            ? 'text-neutral-400 dark:text-neutral-500 line-through' 
                            : tx.valor < 0 ? 'text-[#c62828] dark:text-red-400' : 'text-[#2e7d32] dark:text-green-400'
                        }`}>
                          {valueFormatter(tx.valor)}
                        </p>
                        {isReconciled && (
                          <span className="text-[10px] text-[#2e7d32] font-semibold block mt-1">✔ Conciliado</span>
                        )}
                      </div>

                      {/* Micro actions buttons */}
                      <div>
                        {isReconciled && tx.conciliation ? (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlink(tx.conciliation!.id);
                            }}
                            className="text-neutral-500 hover:text-[#c62828] transition-all p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs cursor-pointer"
                            title="Desfazer conciliação"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-primary transition-all">
                            <ChevronRight className="w-4 h-4 text-[#795900] dark:text-[#f8bd2a]" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Half: PREVISÕES DO SISTEMA */}
        <div className="bg-white dark:bg-white border border-neutral-200 dark:border-neutral-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-200 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="font-extrabold text-xs text-neutral-800 dark:text-neutral-800 uppercase tracking-widest">📈 Previsões do Sistema</span>
            </div>
            <span className="text-[10px] font-extrabold bg-[#fff3cd] border border-[#ffeeba] text-[#856404] px-2.5 py-1 rounded-full uppercase tracking-wider select-none">
              Aguardando Vínculo
            </span>
          </div>

          <div className="p-5 space-y-3.5 max-h-[600px] overflow-y-auto bg-neutral-50/40 dark:bg-neutral-50/40">
            {availableLaunches.length === 0 ? (
              <div className="py-12 px-6 text-center text-neutral-500 dark:text-neutral-500 text-xs space-y-1">
                <ShieldCheck className="w-8 h-8 mx-auto text-[#2e7d32]" />
                <p className="font-bold text-neutral-800 dark:text-neutral-800">Totalmente Conciliado!</p>
                <p className="text-neutral-500 dark:text-neutral-500 text-[11px]">Nenhuma previsão sística aberta pendente.</p>
              </div>
            ) : (
              availableLaunches.map((l, index) => {
                const entName = getEntidadeName(l.entidade_id);
                // Active recommendation if we highlighted the first item or selected transaction
                const isMatchedRecommended = index === 0;

                return (
                  <div 
                    key={l.id} 
                    className="bg-white dark:bg-white border border-neutral-200 dark:border-neutral-200 rounded-xl p-4 flex items-center justify-between transition-all select-none shadow-xs hover:border-neutral-350 dark:hover:border-neutral-300"
                  >
                    {/* Plain Date Column (with orange highlight if overdue/special) */}
                    <div className="w-16 shrink-0 flex items-center pr-2">
                      <span className={`font-extrabold text-xs ${
                        l.id === 'lanc_aluguel' || l.observacoes.includes('Aluguel') 
                          ? 'text-amber-500 dark:text-amber-500' 
                          : 'text-neutral-500 dark:text-neutral-500'
                      }`}>
                        {formatShorthandDate(l.data_vencimento)}
                      </span>
                    </div>

                    {/* Description detail */}
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-extrabold text-neutral-900 dark:text-neutral-900 truncate">
                        {entName}
                      </p>
                      <span className="text-xs text-neutral-500 dark:text-neutral-500 block mt-0.5 truncate">
                        {l.observacoes}
                      </span>
                    </div>

                    {/* Value on right and Vincular action */}
                    <div className="text-right shrink-0 flex items-center gap-5">
                      <div className="min-w-[90px]">
                        <p className="text-sm font-extrabold text-neutral-950 dark:text-neutral-950">
                          {valueFormatter(l.valor_previsto, l.tipo)}
                        </p>
                        <span className="text-[10px] bg-neutral-100 dark:bg-neutral-100 text-neutral-600 dark:text-neutral-600 font-bold px-1.5 py-0.5 rounded block mt-0.5 text-center uppercase tracking-wide">
                          {l.tipo === 'entrada' ? 'Receita' : 'Despesa'}
                        </span>
                      </div>

                      {/* = Vincular click triggering slider panel */}
                      <button
                        type="button"
                        onClick={() => {
                          const matchingTx = transacoes.find(t => !t.status_conciliacao && t.conta_bancaria_id === selectedContaId);
                          if (matchingTx) {
                            setSelectedTransacaoForConciliationId(matchingTx.id);
                            setSelectedLancamentoForConciliationId(l.id);
                            setModalOpen('isVincularConciliarOpen', true);
                          } else {
                            // select first pending
                            const firstPending = transacoes.find(t => !t.status_conciliacao);
                            if (firstPending) {
                              setSelectedTransacaoForConciliationId(firstPending.id);
                              setSelectedLancamentoForConciliationId(l.id);
                              setModalOpen('isVincularConciliarOpen', true);
                            } else {
                              alert('Selecione primeiro uma transação correspondente no painel esquerdo!');
                            }
                          }
                        }}
                        className={`px-3.5 py-1.5 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border ${
                          isMatchedRecommended
                            ? 'bg-[#795900] dark:bg-[#f8bd2a] border-[#795900] dark:border-[#f8bd2a] text-white dark:text-neutral-900 hover:bg-opacity-95'
                            : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Vincular
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* SLIDE PANEL: VINCULAR & CONCILIAR (Tela 3.2) */}
      {/* ========================================== */}
      {isVincularConciliarOpen && selectedTxForWorkspace && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full md:w-[520px] h-full bg-white dark:bg-white border-l border-neutral-200 dark:border-neutral-200 shadow-2xl flex flex-col animate-slide-in">
            <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-200 bg-neutral-50/80 dark:bg-neutral-50/80 shrink-0 select-none">
              <h2 className="text-lg text-neutral-900 dark:text-neutral-900 font-extrabold tracking-tight flex items-center gap-1.5">
                <Link2 className="w-5 h-5 text-[#795900] dark:text-[#795900]" />
                Vincular &amp; Conciliar
              </h2>
              <button 
                type="button"
                onClick={() => setModalOpen('isVincularConciliarOpen', false)}
                className="text-neutral-500 hover:text-neutral-800 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Scroll form space */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Target Bank Card as BPI (Immutable) with a left thick blue border */}
              <div className="space-y-2">
                <label className="block text-[11px] font-extrabold text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">Dado do Banco (Imutável)</label>
                <div className="p-5 rounded-xl border-l-4 border-blue-650 border-y border-r border-neutral-200 dark:border-neutral-200 bg-white dark:bg-white relative shadow-sm space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold flex items-center gap-1.5 text-neutral-800 dark:text-neutral-800 select-none">
                      <Building className="w-4 h-4 text-blue-600" /> Extrato Itaú
                    </span>
                    <span className="font-extrabold text-neutral-500 dark:text-neutral-500">
                      {formatFullShorthandDate(selectedTxForWorkspace.data_transacao)}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-400 uppercase tracking-wider">Descrição Original</span>
                    <div className="bg-neutral-50 dark:bg-neutral-50 p-3 rounded-lg border border-neutral-200 dark:border-neutral-200/80 font-mono text-[11px] font-bold text-neutral-900 dark:text-neutral-900 leading-relaxed select-all uppercase break-words">
                      {selectedTxForWorkspace.descricao_banco}
                    </div>
                  </div>

                  <div className="flex justify-between items-end pt-3 border-t border-neutral-200 dark:border-neutral-200">
                    <span className="text-[11px] font-extrabold text-neutral-500 dark:text-neutral-500 uppercase">Valor Total</span>
                    <span className={`font-extrabold text-lg leading-none ${
                      selectedTxForWorkspace.valor < 0 ? 'text-[#c62828] dark:text-[#c62828]' : 'text-[#2e7d32] dark:text-[#2e7d32]'
                    }`}>
                      {valueFormatter(selectedTxForWorkspace.valor)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chain link visual linkage block */}
              <div className="flex justify-center py-2 select-none">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-100 border border-neutral-300 dark:border-neutral-300 flex items-center justify-center shadow-xs">
                  <Link2 className="w-5 h-5 text-neutral-600 dark:text-neutral-500" />
                </div>
              </div>

              {/* SECTION: PREVISÕES DO SISTEMA */}
              <div className="space-y-4">
                <div className="flex justify-between items-center select-none">
                  <label className="block text-[11px] font-extrabold text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">Previsões do Sistema</label>
                  <span className="text-[10px] text-amber-700 dark:text-amber-700 font-extrabold bg-amber-50 dark:bg-amber-50 px-3 py-1 rounded border border-amber-200 uppercase tracking-widest">
                    {availableLaunches.length} em aberto
                  </span>
                </div>

                {/* Search Bar Input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400 dark:text-neutral-400" />
                  <input 
                    type="text"
                    placeholder="Buscar por valor, fornecedor ou data..."
                    value={erpSearch}
                    onChange={(e) => setErpSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white border border-neutral-300 dark:border-neutral-200 text-xs rounded-xl text-neutral-900 dark:text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                {/* Previsions scrollable content list matching mockup design */}
                <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                  {availableLaunches.length === 0 ? (
                    <div className="py-12 text-center text-neutral-500 dark:text-neutral-500 text-xs font-semibold border-2 border-dashed border-neutral-200 dark:border-neutral-200 rounded-xl bg-neutral-50/40 dark:bg-neutral-50/40">
                      Não encontramos previsões para buscar.
                    </div>
                  ) : (
                    availableLaunches.map(l => {
                      const isSelected = selectedLancamentoForConciliationId === l.id;
                      const entName = getEntidadeName(l.entidade_id);

                      return (
                        <div 
                           key={l.id}
                           onClick={() => handleSelectERPItemForLink(l)}
                           className={`p-4 border rounded-xl cursor-pointer relative transition-all shadow-xs ${
                             isSelected 
                               ? 'border-[#795900] dark:border-[#795900] bg-[#fffcf5] dark:bg-[#795900]/5 ring-1 ring-[#795900]' 
                               : 'border-neutral-200 dark:border-neutral-200 bg-white dark:bg-white hover:bg-neutral-50 dark:hover:bg-neutral-50'
                           }`}
                        >
                          {isSelected && (
                            <div className="absolute top-3.5 right-3.5 select-none">
                              <span className="bg-[#fff3cd] dark:bg-yellow-50 border border-[#ffeeba] dark:border-yellow-200 text-[#856404] dark:text-yellow-700 font-extrabold text-[9px] tracking-wider px-2 py-1 rounded uppercase">
                                Selecionado
                              </span>
                            </div>
                          )}

                          <div className="space-y-1">
                            <h4 className="font-extrabold text-sm text-neutral-900 dark:text-neutral-900 select-text">{entName}</h4>
                            <p className="text-xs text-neutral-500 dark:text-neutral-500 font-medium select-text">{l.observacoes}</p>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-200 text-[11px]">
                            <div className="flex items-center gap-2 select-none">
                              <span className="text-neutral-500 dark:text-neutral-500 font-extrabold">Venc: {formatFullShorthandDate(l.data_vencimento)}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-300" />
                              <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-100 rounded font-extrabold text-neutral-750 dark:text-neutral-700 uppercase tracking-wide">
                                {l.tipo === 'saida' ? 'Conta a Pagar' : 'Conta a Receber'}
                              </span>
                            </div>

                            <span className="font-extrabold text-xs text-neutral-900 dark:text-neutral-900">
                              {valueFormatter(l.valor_previsto, l.tipo)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Bottom calculation matching dashboard exactly */}
            <footer className="p-6 border-t border-neutral-200 dark:border-neutral-200 bg-neutral-50 dark:bg-neutral-50/60 shrink-0 space-y-4">
              {selectedLancForWorkspace && (
                <div className="flex justify-between items-center text-xs px-2 select-none">
                  <span className="text-neutral-500 dark:text-neutral-500 font-extrabold uppercase tracking-wide text-[10px]">Diferença</span>
                  <div className="flex items-center gap-1.5">
                    {Math.abs(draftDifferenceAmount) < 0.01 ? (
                      <span className="text-[#2e7d32] dark:text-green-400 font-extrabold text-sm tracking-tight flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-50/40 border border-emerald-200 dark:border-emerald-200/50 px-3 py-1 rounded-full shadow-xs">
                        <Check className="w-4 h-4 text-[#2e7d32]" /> R$ 0,00
                      </span>
                    ) : (
                      <span className="text-[#c62828] dark:text-red-400 font-extrabold text-sm tracking-tight bg-red-50 dark:bg-red-50/40 border border-red-200 dark:border-[#c62828] px-3 py-1 rounded-full shadow-xs">
                        {valueFormatter(draftDifferenceAmount)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 select-none">
                <button 
                  type="button" 
                  onClick={() => setModalOpen('isVincularConciliarOpen', false)}
                  className="px-4 py-2.5 font-bold text-xs text-neutral-750 dark:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-100 border border-neutral-300 dark:border-neutral-300 rounded-lg bg-white dark:bg-white transition-colors shadow-xs active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  disabled={!selectedLancamentoForConciliationId || isLinking}
                  onClick={executeConciliationLink}
                  className={`px-5 py-2.5 font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all ${
                    selectedLancamentoForConciliationId && !isLinking 
                      ? 'bg-[#f3b233] border border-[#df9d1d] hover:bg-[#e2a225] text-[#4a2e00] font-extrabold active:scale-95 cursor-pointer' 
                      : 'bg-neutral-250 dark:bg-neutral-200 text-neutral-400 dark:text-neutral-500 border border-transparent cursor-not-allowed opacity-50'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Confirmar Conciliação
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: CLASSIFICAR DIFERENÇA FINANCEIRA (3.3) */}
      {/* ========================================== */}
      {isClassificarDiferencaOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleClassifyDiffSubmit}
            className="bg-white dark:bg-white w-full max-w-[440px] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-200 flex flex-col overflow-hidden animate-slide-in"
          >
            <header className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-200 flex justify-between items-center bg-neutral-50 dark:bg-neutral-50 select-none">
              <div>
                <h2 className="text-base font-extrabold text-neutral-900 dark:text-neutral-900 tracking-tight">Classificar Diferença</h2>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-500 block mt-0.5 font-medium">Identifique a natureza fiscal da diferença</span>
              </div>
              <button 
                type="button" 
                onClick={() => { setModalOpen('isClassificarDiferencaOpen', false); setCurrentConciliationId(null); }}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-850 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-6 space-y-4 bg-white dark:bg-white">
              
              {/* Alert Warning Box with info yellow/amber sign */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-50 border border-amber-200 dark:border-amber-250 text-[11px] text-amber-800 dark:text-amber-800 leading-relaxed flex gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#ffa000] mt-0.5" />
                <p className="font-semibold">
                  Foi identificada uma divergência entre o valor do extrato bancário e o lançamento financeiro. Classifique a diferença para prosseguir.
                </p>
              </div>

              {/* Difference value display read-only */}
              <div className="flex flex-col gap-1.5 select-none">
                <label className="text-[11px] font-extrabold text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">Valor da Diferença</label>
                <div className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-100 border border-neutral-200 dark:border-neutral-200 rounded-xl select-all">
                  <span className="font-extrabold text-sm text-[#c62828] dark:text-[#c62828]">
                    {valueFormatter(currentConciliationDifferenceValue)}
                  </span>
                </div>
              </div>

              {/* Type dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-neutral-600 dark:text-neutral-600">Tipo da Diferença <span className="text-[#c62828] dark:text-[#c62828]">*</span></label>
                <select 
                  value={diffType}
                  onChange={(e) => setDiffType(e.target.value as any)}
                  className="w-full bg-white dark:bg-white border border-neutral-300 dark:border-neutral-200 text-xs rounded-xl px-3 py-3 text-neutral-900 dark:text-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium scrollbar-thin"
                  required
                >
                  <option value="juros">Juros pagos/recebidos</option>
                  <option value="multa">Multa por atraso</option>
                  <option value="desconto">Desconto concedido/obtido</option>
                  <option value="tarifa">Tarifa bancária</option>
                  <option value="pagamento_parcial">Pagamento Parcial (Amortização)</option>
                  <option value="ajuste_manual">Ajuste técnico manual</option>
                </select>
              </div>

              {/* Text justification with obligation hint */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-extrabold text-neutral-600 dark:text-neutral-600">Justificativa <span className="text-[#c62828] dark:text-[#c62828]">*</span></label>
                  <span className="text-[10px] text-[#795900] dark:text-[#795900] font-bold">(Obrigatório para Ajuste Manual)</span>
                </div>
                <textarea 
                  required
                  rows={3}
                  value={diffJustification}
                  onChange={(e) => setDiffJustification(e.target.value)}
                  placeholder="Descreva o motivo desta diferença..."
                  className="w-full p-3 bg-white dark:bg-white border border-neutral-300 dark:border-neutral-200 text-xs rounded-xl text-neutral-900 dark:text-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-neutral-400 dark:placeholder:text-neutral-400 resize-none font-medium"
                />
              </div>
            </div>

            <footer className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-200 bg-neutral-50 dark:bg-neutral-50 flex justify-end gap-3 select-none">
              <button 
                type="button" 
                onClick={() => { setModalOpen('isClassificarDiferencaOpen', false); setCurrentConciliationId(null); }}
                className="px-4 py-2 font-bold text-xs text-neutral-700 dark:text-neutral-700 bg-white dark:bg-white hover:bg-neutral-100 dark:hover:bg-neutral-100 border border-neutral-300 dark:border-neutral-300 rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-5 py-2 font-extrabold text-xs text-[#4a2e00] bg-[#f3b233] border border-[#df9d1d] hover:bg-[#e2a225] rounded-lg shadow-sm cursor-pointer transition-colors"
              >
                Salvar Ajuste
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: IMPORTAR CSV (Tela 3.1)             */}
      {/* ========================================== */}
      {isImportarCSVOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleImportCSVSubmit}
            className="bg-white dark:bg-white w-full max-w-[480px] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-200 flex flex-col overflow-hidden animate-slide-in"
          >
            <header className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-200 flex justify-between items-center bg-neutral-50 dark:bg-neutral-50 select-none">
              <div>
                <h2 className="text-base font-extrabold text-neutral-900 dark:text-neutral-900 tracking-tight">Importar Extrato CSV</h2>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-500 block mt-0.5 font-medium">Dispare a leitura de arquivos de reconciliação</span>
              </div>
              <button 
                type="button" 
                onClick={() => setModalOpen('isImportarCSVOpen', false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-850 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-6 space-y-4 bg-white dark:bg-white">
              
              {/* Select target Bank */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-neutral-600 dark:text-neutral-600">Conta Bancária Destino <span className="text-[#c62828] dark:text-[#c62828]">*</span></label>
                <select 
                  value={selectedImportContaId}
                  onChange={(e) => setSelectedImportContaId(e.target.value)}
                  className="w-full bg-white dark:bg-white border border-neutral-300 dark:border-neutral-200 text-xs rounded-xl px-3 py-3 text-neutral-900 dark:text-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                  required
                >
                  {contas.map(cnt => (
                    <option key={cnt.id} value={cnt.id}>{cnt.nome_banco}</option>
                  ))}
                </select>
              </div>

              {/* Drag and Drop Zone Container */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-neutral-600 dark:text-neutral-600">Arquivo de Extrato <span className="text-[#c62828] dark:text-[#c62828]">*</span></label>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none flex flex-col items-center justify-center gap-3 relative ${
                    isDragging 
                      ? 'border-[#795900] dark:border-[#795900] bg-[#795900]/5' 
                      : csvContentText.trim() 
                        ? 'border-emerald-500 bg-emerald-50/10' 
                        : 'border-neutral-300 dark:border-neutral-300 hover:border-[#795900] dark:hover:border-[#795900] bg-neutral-50 dark:bg-neutral-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-[#795900] dark:text-[#795900]" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-850">Clique para selecionar ou arraste o arquivo aqui</p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-500">Suporta apenas arquivos .CSV padronizados</p>
                  </div>

                  {csvContentText.trim() && (
                    <div className="py-1 px-3 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold flex items-center gap-1 border border-emerald-300">
                      <Check className="w-3.5 h-3.5 text-emerald-700" /> Arquivo Carregado !
                    </div>
                  )}
                </div>
              </div>

              {/* Simulated upload textarea or instructions collapsed/interactive helper */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-extrabold text-neutral-600 dark:text-neutral-600">Visualização do CSV (Ponto-e-Vírgula) <span className="text-[#c62828] dark:text-[#c62828]">*</span></label>
                  <button 
                    type="button" 
                    onClick={fillSampleCSV}
                    className="text-[10px] text-[#795900] dark:text-[#795900] hover:underline font-extrabold cursor-pointer"
                  >
                    Carregar Exemplo
                  </button>
                </div>
                
                <textarea 
                  rows={4}
                  value={csvContentText}
                  onChange={(e) => setCsvContentText(e.target.value)}
                  placeholder="Data;Valor;Descricao;Movimento&#13;2026-10-24;-45.50;TARIFA MANUT CADASTRO SECTOR;debito"
                  className="w-full p-3 bg-white dark:bg-white border border-neutral-300 dark:border-neutral-200 font-mono text-[11px] rounded-xl text-neutral-900 dark:text-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-neutral-400 dark:placeholder:text-neutral-400 font-medium"
                  required
                />
              </div>

              <div className="p-3.5 bg-neutral-100 dark:bg-neutral-100 rounded-xl text-[10px] text-neutral-500 dark:text-neutral-500 leading-relaxed font-medium">
                <Info className="w-3.5 h-3.5 inline mr-1 text-[#795900] dark:text-[#795900] shrink-0 align-text-top" />
                O formato aceito utiliza ponto-e-vírgula <strong>(;)</strong> de separador. A primeira linha deve ser o cabeçalho. As datas devem seguir o formato ISO <strong>AAAA-MM-DD</strong>.
              </div>
            </div>

            <footer className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-200 bg-neutral-50 dark:bg-neutral-50 flex justify-end gap-3 select-none">
              <button 
                type="button" 
                onClick={() => setModalOpen('isImportarCSVOpen', false)}
                className="px-4 py-2 font-bold text-xs text-neutral-700 dark:text-neutral-700 bg-white dark:bg-white hover:bg-neutral-100 dark:hover:bg-neutral-100 border border-neutral-300 dark:border-neutral-300 rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={!csvContentText.trim()}
                className={`px-5 py-2 font-extrabold text-xs rounded-lg shadow-sm transition-colors ${
                  csvContentText.trim() 
                    ? 'bg-[#f3b233] border border-[#df9d1d] hover:bg-[#e2a225] text-[#4a2e00] cursor-pointer' 
                    : 'bg-neutral-250 dark:bg-neutral-200 text-neutral-400 dark:text-neutral-500 border border-transparent cursor-not-allowed'
                }`}
              >
                Importar
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
